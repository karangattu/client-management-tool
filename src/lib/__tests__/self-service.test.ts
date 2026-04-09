import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup – must use vi.hoisted so mocks are available before imports
// ---------------------------------------------------------------------------

const { createClient, createServiceClient } = vi.hoisted(() => {
  const createClient = vi.fn();
  const createServiceClient = vi.fn();
  return { createClient, createServiceClient };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient,
  createServiceClient,
}));

vi.mock("@/lib/utils", () => ({
  getAppUrl: () => "http://localhost:3000",
}));

// Import after mocks are wired
import { submitSelfServiceApplication } from "@/app/actions/self-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid form data for a standard registration. */
function baseForm(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "555-1234",
    dateOfBirth: "1990-01-15",
    password: "SecureP@ss1",
    ...overrides,
  };
}

/**
 * Build a fluent Supabase-like query mock where each chained method
 * returns the same object so `.from('x').select('y').eq('a','b').single()`
 * works naturally.
 *
 * `terminalValue` is the resolved value for the terminal calls
 * (`.single()`, `.maybeSingle()`).
 */
function chainMock(terminalValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const obj: Record<string, ReturnType<typeof vi.fn>> = {};
  obj.select = vi.fn().mockReturnValue(obj);
  obj.insert = vi.fn().mockReturnValue(obj);
  obj.update = vi.fn().mockReturnValue(obj);
  obj.upsert = vi.fn().mockReturnValue(obj);
  obj.delete = vi.fn().mockReturnValue(obj);
  obj.eq = vi.fn().mockReturnValue(obj);
  obj.is = vi.fn().mockReturnValue(obj);
  obj.in = vi.fn().mockReturnValue(obj);
  obj.ilike = vi.fn().mockReturnValue(obj);
  obj.limit = vi.fn().mockReturnValue(obj);
  obj.single = vi.fn().mockResolvedValue(terminalValue);
  obj.maybeSingle = vi.fn().mockResolvedValue(terminalValue);
  return obj;
}

/** Standard auth mock returning a new user id. */
function authSignUpMock(userId = "new-auth-uid") {
  return vi.fn().mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("submitSelfServiceApplication – client linking", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Admin pre-created client → first-time registration links the record
  // -----------------------------------------------------------------------
  it("links an admin-created client record instead of inserting a duplicate", async () => {
    const userId = "new-auth-uid";
    const existingClientId = "admin-created-client-id";

    // -- service client (db) --
    const profilesChain = chainMock({ data: null, error: null }); // no existing profile

    // First clients query: check for admin-created record → found
    const clientsSelectChain = chainMock({
      data: { id: existingClientId, portal_user_id: null },
      error: null,
    });

    // Second clients query: the update that links
    const clientsUpdateChain = chainMock({
      data: { id: existingClientId, portal_user_id: userId, has_portal_access: true },
      error: null,
    });

    let clientsCallCount = 0;
    const dbFrom = vi.fn((table: string) => {
      if (table === "profiles") return profilesChain;
      if (table === "clients") {
        clientsCallCount++;
        // 1st call: check for admin-created record by email with portal_user_id IS NULL
        if (clientsCallCount === 1) return clientsSelectChain;
        // 2nd call: update to link
        if (clientsCallCount === 2) return clientsUpdateChain;
        return chainMock();
      }
      // case_management, tasks, audit_log, etc.
      return chainMock();
    });

    const db = {
      from: dbFrom,
      storage: { from: vi.fn().mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) }) },
    };

    createServiceClient.mockReturnValue(db);

    // -- anon client (supabase) --
    const supabase = {
      auth: { signUp: authSignUpMock(userId) },
    };
    createClient.mockResolvedValue(supabase);

    const result = await submitSelfServiceApplication(baseForm());

    expect(result.success).toBe(true);
    expect(result.clientId).toBe(existingClientId);

    // Verify we called update (link) on the existing record, not insert
    expect(clientsUpdateChain.update).toHaveBeenCalled();
    const updateArg = clientsUpdateChain.update.mock.calls[0][0];
    expect(updateArg).toMatchObject({
      portal_user_id: userId,
      has_portal_access: true,
      first_name: "John",
      last_name: "Doe",
    });
  });

  // -----------------------------------------------------------------------
  // 2. No pre-existing record → fresh insert (existing behavior preserved)
  // -----------------------------------------------------------------------
  it("inserts a new client record when no admin-created record exists", async () => {
    const userId = "new-auth-uid";
    const newClientId = "brand-new-client-id";

    const profilesChain = chainMock({ data: null, error: null });

    // clients: no admin-created record, no trigger-created record
    const clientsSelectChain = chainMock({ data: null, error: null }); // no admin-created
    const clientsTriggerChain = chainMock({ data: null, error: null }); // no trigger-created
    const clientsInsertChain = chainMock({
      data: { id: newClientId, portal_user_id: userId },
      error: null,
    });

    let clientsCallCount = 0;
    const dbFrom = vi.fn((table: string) => {
      if (table === "profiles") return profilesChain;
      if (table === "clients") {
        clientsCallCount++;
        if (clientsCallCount === 1) return clientsSelectChain;   // admin-created check
        if (clientsCallCount === 2) return clientsTriggerChain;   // trigger check
        if (clientsCallCount === 3) return clientsInsertChain;    // insert
        return chainMock();
      }
      return chainMock();
    });

    createServiceClient.mockReturnValue({
      from: dbFrom,
      storage: { from: vi.fn().mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) }) },
    });

    createClient.mockResolvedValue({
      auth: { signUp: authSignUpMock(userId) },
    });

    const result = await submitSelfServiceApplication(baseForm());

    expect(result.success).toBe(true);
    expect(result.clientId).toBe(newClientId);
    expect(clientsInsertChain.insert).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3. Trigger-created record → update instead of duplicate insert
  // -----------------------------------------------------------------------
  it("updates a trigger-created client record instead of inserting", async () => {
    const userId = "new-auth-uid";
    const triggerClientId = "trigger-created-id";

    const profilesChain = chainMock({ data: null, error: null });

    const clientsSelectChain = chainMock({ data: null, error: null }); // no admin-created
    const clientsTriggerChain = chainMock({
      data: { id: triggerClientId },
      error: null,
    });
    const clientsUpdateChain = chainMock({
      data: { id: triggerClientId, portal_user_id: userId },
      error: null,
    });

    let clientsCallCount = 0;
    const dbFrom = vi.fn((table: string) => {
      if (table === "profiles") return profilesChain;
      if (table === "clients") {
        clientsCallCount++;
        if (clientsCallCount === 1) return clientsSelectChain;
        if (clientsCallCount === 2) return clientsTriggerChain;
        if (clientsCallCount === 3) return clientsUpdateChain;
        return chainMock();
      }
      return chainMock();
    });

    createServiceClient.mockReturnValue({
      from: dbFrom,
      storage: { from: vi.fn().mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) }) },
    });

    createClient.mockResolvedValue({
      auth: { signUp: authSignUpMock(userId) },
    });

    const result = await submitSelfServiceApplication(baseForm());

    expect(result.success).toBe(true);
    expect(result.clientId).toBe(triggerClientId);
    expect(clientsUpdateChain.update).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 4. "Account already exists" path links orphaned admin-created record
  // -----------------------------------------------------------------------
  it("links orphaned admin-created client when profile already exists as client", async () => {
    const existingAuthId = "existing-auth-uid";
    const orphanedClientId = "orphaned-admin-client";

    // profiles query returns existing client profile
    const profilesChain = chainMock({
      data: { id: existingAuthId, role: "client" },
      error: null,
    });

    // clients: find orphaned admin-created record
    const clientsSelectChain = chainMock({
      data: { id: orphanedClientId },
      error: null,
    });
    // clients: delete shell trigger record
    const clientsDeleteChain = chainMock({ data: null, error: null });
    // clients: update to link
    const clientsUpdateChain = chainMock({ data: null, error: null });

    let clientsCallCount = 0;
    const dbFrom = vi.fn((table: string) => {
      if (table === "profiles") return profilesChain;
      if (table === "clients") {
        clientsCallCount++;
        if (clientsCallCount === 1) return clientsSelectChain;  // find orphaned
        if (clientsCallCount === 2) return clientsDeleteChain;  // delete shell
        if (clientsCallCount === 3) return clientsUpdateChain;  // link
        return chainMock();
      }
      return chainMock();
    });

    createServiceClient.mockReturnValue({ from: dbFrom });
    createClient.mockResolvedValue({
      auth: { signUp: vi.fn() }, // should never be called
    });

    const result = await submitSelfServiceApplication(baseForm());

    // Should return the "already exists" message but have linked the record
    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
    expect(result.error).toContain("Please log in");

    // Verify the orphaned record was linked
    expect(clientsDeleteChain.delete).toHaveBeenCalled();
    expect(clientsUpdateChain.update).toHaveBeenCalledWith({
      portal_user_id: existingAuthId,
      has_portal_access: true,
    });
    expect(clientsUpdateChain.eq).toHaveBeenCalledWith("id", orphanedClientId);
  });

  // -----------------------------------------------------------------------
  // 5. "Account already exists" without orphan → no linking attempted
  // -----------------------------------------------------------------------
  it("returns 'already exists' error without linking when no orphaned record", async () => {
    const profilesChain = chainMock({
      data: { id: "existing-uid", role: "client" },
      error: null,
    });

    // No orphaned admin-created record
    const clientsChain = chainMock({ data: null, error: null });

    const dbFrom = vi.fn((table: string) => {
      if (table === "profiles") return profilesChain;
      if (table === "clients") return clientsChain;
      return chainMock();
    });

    createServiceClient.mockReturnValue({ from: dbFrom });
    createClient.mockResolvedValue({
      auth: { signUp: vi.fn() },
    });

    const result = await submitSelfServiceApplication(baseForm());

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
    // No update/delete should have been called
    expect(clientsChain.update).not.toHaveBeenCalled();
    expect(clientsChain.delete).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 6. Staff email is still rejected
  // -----------------------------------------------------------------------
  it("rejects registration with a staff email address", async () => {
    const profilesChain = chainMock({
      data: { id: "staff-uid", role: "admin" },
      error: null,
    });

    const dbFrom = vi.fn((table: string) => {
      if (table === "profiles") return profilesChain;
      return chainMock();
    });

    createServiceClient.mockReturnValue({ from: dbFrom });
    createClient.mockResolvedValue({
      auth: { signUp: vi.fn() },
    });

    const result = await submitSelfServiceApplication(baseForm());

    expect(result.success).toBe(false);
    expect(result.error).toContain("staff account");
  });

  // -----------------------------------------------------------------------
  // 7. Employment-support registration links admin-created record correctly
  // -----------------------------------------------------------------------
  it("links admin-created client with employment_support onboarding status", async () => {
    const userId = "new-auth-uid";
    const existingClientId = "admin-es-client";

    const profilesChain = chainMock({ data: null, error: null });

    const clientsSelectChain = chainMock({
      data: { id: existingClientId, portal_user_id: null },
      error: null,
    });

    const clientsUpdateChain = chainMock({
      data: { id: existingClientId, portal_user_id: userId },
      error: null,
    });

    let clientsCallCount = 0;
    const dbFrom = vi.fn((table: string) => {
      if (table === "profiles") return profilesChain;
      if (table === "clients") {
        clientsCallCount++;
        if (clientsCallCount === 1) return clientsSelectChain;
        if (clientsCallCount === 2) return clientsUpdateChain;
        return chainMock();
      }
      return chainMock();
    });

    createServiceClient.mockReturnValue({
      from: dbFrom,
      storage: { from: vi.fn().mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) }) },
    });

    createClient.mockResolvedValue({
      auth: { signUp: authSignUpMock(userId) },
    });

    const result = await submitSelfServiceApplication(
      baseForm({ registrationMode: "employment-support", signature: "data:image/png;base64,abc" })
    );

    expect(result.success).toBe(true);
    expect(result.clientId).toBe(existingClientId);

    const updateArg = clientsUpdateChain.update.mock.calls[0][0];
    expect(updateArg.onboarding_status).toBe("employment_support");
  });
});
