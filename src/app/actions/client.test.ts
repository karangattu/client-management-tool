import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

vi.mock("@/app/actions/cache", () => ({
  cacheReadOnly: <T>(fn: T) => fn,
}));

import { createMinimalClient } from "@/app/actions/client";

function queryChain(terminalValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn> | unknown> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.ilike = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalValue);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.then = (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(terminalValue).then(resolve);

  return chain as {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    ilike: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
  };
}

describe("createMinimalClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createClient.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a minimal client when email and phone are both omitted", async () => {
    const profilesQuery = queryChain({ data: null, error: null });
    const clientsInsertQuery = queryChain({ data: { id: "client-123" }, error: null });

    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "staff-1" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return profilesQuery;
        }
        if (table === "clients") {
          return clientsInsertQuery;
        }

        return queryChain();
      }),
    });

    const result = await createMinimalClient({
      firstName: "Jamie",
      lastName: "Rivera",
      email: "",
      phone: "",
    });

    expect(result).toEqual({ success: true, clientId: "client-123" });
    expect(clientsInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Jamie",
        last_name: "Rivera",
        email: null,
        phone: null,
      })
    );
    expect(profilesQuery.ilike).not.toHaveBeenCalled();
  });
});