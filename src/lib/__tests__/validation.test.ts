import { afterEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("../supabase/client", () => ({
  createClient,
}));

import {
  batchValidateReferences,
  findOrphanedRecords,
  validateClientData,
  validateClientReferences,
  validateDocumentReferences,
  validateEnumValue,
  validateTaskReferences,
} from "../validation";

type QueryResponse = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

function createQuery(response: QueryResponse) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    then(resolve: (value: QueryResponse) => unknown) {
      return Promise.resolve(response).then(resolve);
    },
  };
}

function createSupabaseMock(
  tableResponses: Record<string, QueryResponse[]>,
  rpcResponse?: QueryResponse
) {
  return {
    from: vi.fn((table: string) => {
      const response = tableResponses[table]?.shift();
      if (!response) {
        throw new Error(`No mock response configured for table ${table}`);
      }

      return createQuery(response);
    }),
    rpc: vi.fn().mockResolvedValue(rpcResponse ?? { data: [], error: null }),
  };
}

describe("validation helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createClient.mockReset();
  });

  it("validates enum values with a helpful error", () => {
    expect(validateEnumValue("active", ["active", "inactive"] as const, "Status")).toEqual({
      isValid: true,
      errors: [],
      warnings: [],
    });

    expect(validateEnumValue("paused", ["active", "inactive"] as const, "Status")).toEqual({
      isValid: false,
      errors: ["Status must be one of: active, inactive. Received: paused"],
      warnings: [],
    });
  });

  it("validates client data fields and formats", () => {
    const result = validateClientData({
      firstName: " ",
      lastName: "",
      email: "bad-email",
      phone: "abc",
      status: "paused",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("First name is required");
    expect(result.errors).toContain("Last name is required");
    expect(result.errors).toContain("Email format is invalid");
    expect(result.errors).toContain("Phone number format is invalid");
    expect(result.errors).toContain(
      "Status must be one of: active, inactive, pending, archived. Received: paused"
    );
  });

  it("allows client data without email and phone when names are present", () => {
    const result = validateClientData({
      firstName: "Jamie",
      lastName: "Rivera",
      email: "",
      phone: "",
      status: "active",
    });

    expect(result).toEqual({
      isValid: true,
      errors: [],
      warnings: [],
    });
  });

  it("validates client references and reports errors and warnings", async () => {
    createClient.mockReturnValue(
      createSupabaseMock({
        clients: [
          {
            data: { id: "client-1", assigned_case_manager: "manager-1" },
            error: null,
          },
        ],
        emergency_contacts: [{ data: null, error: { message: "unavailable" } }],
        case_management: [{ data: null, error: { code: "500", message: "server error" } }],
        profiles: [{ data: { id: "manager-1", role: "staff" }, error: null }],
      })
    );

    const result = await validateClientReferences("client-1");

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Assigned case manager does not have appropriate role");
    expect(result.warnings).toContain("Could not verify emergency contacts");
    expect(result.warnings).toContain("Could not verify case management record");
  });

  it("validates task and document references", async () => {
    createClient
      .mockReturnValueOnce(
        createSupabaseMock({
          tasks: [
            {
              data: {
                id: "task-1",
                client_id: "client-1",
                assigned_to: "user-1",
                assigned_by: "user-2",
              },
              error: null,
            },
          ],
          clients: [{ data: { id: "client-1" }, error: null }],
          profiles: [
            { data: { id: "user-1" }, error: null },
            { data: { id: "user-2" }, error: null },
          ],
        })
      )
      .mockReturnValueOnce(
        createSupabaseMock({
          documents: [
            {
              data: {
                id: "doc-1",
                client_id: "client-1",
                uploaded_by: "user-9",
              },
              error: null,
            },
          ],
          clients: [{ data: { id: "client-1" }, error: null }],
          profiles: [{ data: null, error: { message: "missing" } }],
        })
      );

    const taskResult = await validateTaskReferences("task-1");
    const documentResult = await validateDocumentReferences("doc-1");

    expect(taskResult.isValid).toBe(true);
    expect(documentResult.isValid).toBe(true);
    expect(documentResult.warnings).toContain("Document uploader does not exist");
  });

  it("batch validates supported entity types and flags unknown ones", async () => {
    createClient
      .mockReturnValueOnce(
        createSupabaseMock({
          clients: [{ data: null, error: { message: "missing" } }],
        })
      )
      .mockReturnValueOnce(
        createSupabaseMock({
          tasks: [{ data: null, error: { message: "missing" } }],
        })
      )
      .mockReturnValueOnce(
        createSupabaseMock({
          documents: [{ data: null, error: { message: "missing" } }],
        })
      );

    const results = await batchValidateReferences([
      { type: "client", id: "c-1" },
      { type: "task", id: "t-1" },
      { type: "document", id: "d-1" },
      { type: "other" as "client", id: "x-1" },
    ]);

    expect(results["client:c-1"].errors).toContain("Client with ID c-1 does not exist");
    expect(results["task:t-1"].errors).toContain("Task with ID t-1 does not exist");
    expect(results["document:d-1"].errors).toContain("Document with ID d-1 does not exist");
    expect(results["other:x-1"].errors).toContain("Unknown validation type: other");
  });

  it("returns orphaned record IDs and swallows RPC failures", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    createClient
      .mockReturnValueOnce(
        createSupabaseMock({}, { data: ["one", "two"], error: null })
      )
      .mockReturnValueOnce(
        createSupabaseMock({}, { data: null, error: { message: "rpc failed" } })
      );

    await expect(findOrphanedRecords("tasks", "client_id", "clients")).resolves.toEqual([
      "one",
      "two",
    ]);
    await expect(findOrphanedRecords("tasks", "client_id", "clients")).resolves.toEqual([]);
  });
});
