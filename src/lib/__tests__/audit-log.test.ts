import { afterEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("../supabase/client", () => ({
  createClient,
}));

import {
  convertLegacyAuditLog,
  diffAuditValues,
  logAuditEvent,
  logAuditEventWithContext,
  logCaseManagementEvent,
  logClientEvent,
  logDocumentEvent,
  logLegacyAuditEvent,
  logProfileEvent,
  logTaskEvent,
} from "../audit-log";

function makeSupabaseMock(
  insertResult: { error: unknown } | Promise<never> = { error: null }
) {
  const insert = vi.fn();
  if (insertResult instanceof Promise) {
    insert.mockReturnValue(insertResult);
  } else {
    insert.mockResolvedValue(insertResult);
  }

  const from = vi.fn(() => ({ insert }));
  createClient.mockReturnValue({ from });

  return { from, insert };
}

describe("audit-log utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createClient.mockReset();
  });

  it("diffAuditValues returns only changed keys with null defaults", () => {
    const diff = diffAuditValues(
      { name: "A", age: 20, keep: true },
      { name: "B", age: 20, added: "x" }
    );

    expect(diff).toEqual({
      oldValues: { name: "A", added: null },
      newValues: { name: "B", added: "x" },
    });
  });

  it("convertLegacyAuditLog maps known legacy entity types and falls back for unknown", () => {
    expect(
      convertLegacyAuditLog({
        user_id: "u1",
        action: "create",
        entity_type: "client",
        entity_id: "c1",
        details: { foo: "bar" },
      })
    ).toEqual({
      user_id: "u1",
      action: "create",
      table_name: "clients",
      record_id: "c1",
      new_values: { foo: "bar" },
    });

    expect(
      convertLegacyAuditLog({
        user_id: "u1",
        action: "create",
        entity_type: "custom_table",
        entity_id: "r1",
      }).table_name
    ).toBe("custom_table");
  });

  it("logAuditEvent inserts normalized payload and swallows insert errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { insert } = makeSupabaseMock({ error: { message: "db failed" } });

    await expect(
      logAuditEvent({
        user_id: "u1",
        action: "update",
        table_name: "clients",
        record_id: "c1",
      })
    ).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledWith({
      user_id: "u1",
      action: "update",
      table_name: "clients",
      record_id: "c1",
      new_values: null,
      old_values: null,
      ip_address: undefined,
      user_agent: undefined,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to log audit event:",
      expect.any(Object)
    );
  });

  it("logAuditEvent catches thrown exceptions from Supabase insert", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { insert } = makeSupabaseMock(Promise.reject(new Error("boom")));

    await expect(
      logAuditEvent({
        user_id: "u1",
        action: "delete",
        table_name: "tasks",
        record_id: "t1",
      })
    ).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "Error logging audit event:",
      expect.any(Error)
    );
  });

  it("wrapper helpers map to expected tables and payload shapes", async () => {
    const { insert } = makeSupabaseMock({ error: null });

    await logClientEvent("u1", "update", "c1", { a: 1 });
    await logTaskEvent("u1", "update", "t1");
    await logDocumentEvent("u1", "upload", "d1");
    await logProfileEvent("u1", "update", "p1");
    await logCaseManagementEvent("u1", "update", "cm1");

    const payloads = insert.mock.calls.map(([arg]) => arg as { table_name: string; record_id: string });
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table_name: "clients", record_id: "c1" }),
        expect.objectContaining({ table_name: "tasks", record_id: "t1" }),
        expect.objectContaining({ table_name: "documents", record_id: "d1" }),
        expect.objectContaining({ table_name: "profiles", record_id: "p1" }),
        expect.objectContaining({ table_name: "case_management", record_id: "cm1" }),
      ])
    );
  });

  it("logAuditEventWithContext extracts IP and user-agent headers", async () => {
    const { insert } = makeSupabaseMock({ error: null });
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.5",
      "user-agent": "vitest-agent",
    });

    await logAuditEventWithContext(
      {
        user_id: "u1",
        action: "view",
        table_name: "clients",
        record_id: "c1",
      },
      { headers }
    );

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: "203.0.113.5",
        user_agent: "vitest-agent",
      })
    );
  });

  it("logLegacyAuditEvent converts then inserts legacy format", async () => {
    const { insert } = makeSupabaseMock({ error: null });

    await logLegacyAuditEvent({
      user_id: "u1",
      action: "create",
      entity_type: "task",
      entity_id: "t1",
      details: { status: "pending" },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        table_name: "tasks",
        record_id: "t1",
        new_values: { status: "pending" },
      })
    );
  });
});
