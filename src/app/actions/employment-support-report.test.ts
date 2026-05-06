import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createServiceClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
  createServiceClient,
}));

import {
  buildEmploymentSupportEngagementRows,
  toEmploymentSupportEngagementCsv,
  type EmploymentSupportEngagementReportRow,
} from "@/app/actions/employment-support-report-utils";
import {
  getEmploymentSupportEngagementReport,
} from "@/app/actions/employment-support-report";

function queryChain(
  terminalValue: { data: unknown; error: unknown } = { data: null, error: null }
) {
  const chain: Record<string, ReturnType<typeof vi.fn> | unknown> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.ilike = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalValue);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.then = (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(terminalValue).then(resolve);

  return chain as {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    ilike: ReturnType<typeof vi.fn>;
    lt: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
  };
}

describe("employment-support-report", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createClient.mockReset();
    createServiceClient.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds engagement rows with interaction totals and type breakdowns", () => {
    const rows = buildEmploymentSupportEngagementRows(
      [
        {
          id: "enrollment-1",
          status: "enrolled",
          start_date: "2026-03-01",
          updated_at: "2026-04-13T16:00:00.000Z",
          clients: {
            id: "client-1",
            first_name: "Ana",
            last_name: "Lopez",
            email: "ana@example.com",
            phone: "555-0001",
          },
          employment_support_intake: [
            {
              status: "submitted",
              readiness_status: "ready",
              assigned_staff: {
                first_name: "Jordan",
                last_name: "Case",
              },
            },
          ],
        },
        {
          id: "enrollment-2",
          status: "applying",
          start_date: null,
          updated_at: "2026-04-12T09:30:00.000Z",
          clients: {
            id: "client-2",
            first_name: "Brian",
            last_name: "O'Neil",
            email: "brian@example.com",
            phone: null,
          },
          employment_support_intake: [
            {
              status: "draft",
              readiness_status: null,
              assigned_staff: null,
            },
          ],
        },
      ],
      [
        {
          client_id: "client-1",
          action_type: "meeting",
          created_at: "2026-04-10T17:00:00.000Z",
        },
        {
          client_id: "client-1",
          action_type: "call",
          created_at: "2026-04-02T17:00:00.000Z",
        },
        {
          client_id: "client-1",
          action_type: "email",
          created_at: "2026-03-29T17:00:00.000Z",
        },
        {
          client_id: "client-2",
          action_type: "note",
          created_at: "2026-04-12T10:00:00.000Z",
        },
        {
          client_id: "client-2",
          action_type: "other",
          created_at: "2026-04-07T15:00:00.000Z",
        },
      ]
    );

    expect(rows).toEqual([
      {
        enrollmentId: "enrollment-1",
        clientId: "client-1",
        clientName: "Ana Lopez",
        firstName: "Ana",
        lastName: "Lopez",
        email: "ana@example.com",
        phone: "555-0001",
        enrollmentStatus: "enrolled",
        startDate: "2026-03-01",
        updatedAt: "2026-04-13T16:00:00.000Z",
        intakeStatus: "submitted",
        readinessStatus: "ready",
        assignedStaff: "Jordan Case",
        totalInteractions: 3,
        callCount: 1,
        emailCount: 1,
        meetingCount: 1,
        noteCount: 0,
        statusChangeCount: 0,
        otherCount: 0,
        interactionTypesSummary: "1 call; 1 email; 1 meeting",
        lastInteractionAt: "2026-04-10T17:00:00.000Z",
      },
      {
        enrollmentId: "enrollment-2",
        clientId: "client-2",
        clientName: "Brian O'Neil",
        firstName: "Brian",
        lastName: "O'Neil",
        email: "brian@example.com",
        phone: null,
        enrollmentStatus: "applying",
        startDate: null,
        updatedAt: "2026-04-12T09:30:00.000Z",
        intakeStatus: "draft",
        readinessStatus: null,
        assignedStaff: "Employment Support",
        totalInteractions: 2,
        callCount: 0,
        emailCount: 0,
        meetingCount: 0,
        noteCount: 1,
        statusChangeCount: 0,
        otherCount: 1,
        interactionTypesSummary: "1 note; 1 other",
        lastInteractionAt: "2026-04-12T10:00:00.000Z",
      },
    ]);
  });

  it("escapes CSV cells that contain commas and quotes", () => {
    const csv = toEmploymentSupportEngagementCsv([
      {
        enrollmentId: "enrollment-9",
        clientId: "client-9",
        clientName: "Smith, \"AJ\"",
        firstName: "Smith, \"AJ\"",
        lastName: "Taylor",
        email: "aj@example.com",
        phone: null,
        enrollmentStatus: "enrolled",
        startDate: null,
        updatedAt: null,
        intakeStatus: "submitted",
        readinessStatus: "ready",
        assignedStaff: "Jordan Case",
        totalInteractions: 4,
        callCount: 1,
        emailCount: 1,
        meetingCount: 0,
        noteCount: 2,
        statusChangeCount: 0,
        otherCount: 0,
        interactionTypesSummary: "1 call; 1 email; 2 notes",
        lastInteractionAt: "2026-04-13T13:00:00.000Z",
      } satisfies EmploymentSupportEngagementReportRow,
    ]);

    expect(csv).toContain('"Smith, ""AJ"""');
    expect(csv.split("\n")[0]).toContain("Client Name");
  });

  it("returns a staff-only report payload with employment-tagged interactions inside the selected date range", async () => {
    const profileQuery = queryChain({ data: { role: "case_manager" }, error: null });
    const programQuery = queryChain({
      data: { id: "program-1", name: "Employment Support" },
      error: null,
    });
    const enrollmentQuery = queryChain({
      data: [
        {
          id: "enrollment-1",
          status: "enrolled",
          start_date: "2026-03-01",
          updated_at: "2026-04-13T16:00:00.000Z",
          clients: {
            id: "client-1",
            first_name: "Ana",
            last_name: "Lopez",
            email: "ana@example.com",
            phone: "555-0001",
          },
          employment_support_intake: [
            {
              status: "submitted",
              readiness_status: "ready",
              assigned_staff: {
                first_name: "Jordan",
                last_name: "Case",
              },
            },
          ],
        },
      ],
      error: null,
    });
    const historyQuery = queryChain({
      data: [
        {
          client_id: "client-1",
          action_type: "call",
          created_at: "2026-04-10T17:00:00.000Z",
          metadata: {
            program_id: "program-1",
            program_name: "Employment Support",
          },
        },
        {
          client_id: "client-1",
          action_type: "meeting",
          created_at: "2026-04-22T16:00:00.000Z",
          metadata: {
            program_id: "program-1",
            program_name: "Employment Support",
          },
        },
        {
          client_id: "client-1",
          action_type: "note",
          created_at: "2026-04-04T17:00:00.000Z",
          metadata: {
            program_id: "program-2",
            program_name: "Housing",
          },
        },
        {
          client_id: "client-1",
          action_type: "email",
          created_at: "2026-05-04T17:00:00.000Z",
          metadata: {
            program_id: "program-1",
            program_name: "Employment Support",
          },
        },
        {
          client_id: "client-1",
          action_type: "other",
          created_at: "2026-04-15T17:00:00.000Z",
          metadata: {},
        },
      ],
      error: null,
    });

    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "staff-1" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return profileQuery;
        }

        return queryChain();
      }),
    });

    createServiceClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "programs") {
          return programQuery;
        }
        if (table === "program_enrollments") {
          return enrollmentQuery;
        }
        if (table === "client_history") {
          return historyQuery;
        }

        return queryChain();
      }),
    });

    const result = await getEmploymentSupportEngagementReport({
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }

    expect(result.data.rows).toHaveLength(1);
    expect(result.data.rows[0]).toMatchObject({
      clientName: "Ana Lopez",
      totalInteractions: 2,
      callCount: 1,
      meetingCount: 1,
      noteCount: 0,
      emailCount: 0,
      interactionTypesSummary: "1 call; 1 meeting",
    });
    expect(result.data.csv).toContain("Ana Lopez");
    expect(result.data.fileName).toMatch(
      /^employment-support-engagement-report-\d{4}-\d{2}-\d{2}\.csv$/
    );
    expect(enrollmentQuery.in).toHaveBeenCalledWith("status", [
      "interested",
      "applying",
      "enrolled",
    ]);
    expect(historyQuery.in).toHaveBeenCalledWith("client_id", ["client-1"]);
    expect(historyQuery.gte).toHaveBeenCalledWith("created_at", "2026-04-01T07:00:00.000Z");
    expect(historyQuery.lt).toHaveBeenCalledWith("created_at", "2026-05-01T07:00:00.000Z");
  });

  it("rejects export requests when the start date is after the end date", async () => {
    const profileQuery = queryChain({ data: { role: "case_manager" }, error: null });

    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "staff-1" } },
          error: null,
        }),
      },
      from: vi.fn(() => profileQuery),
    });

    const result = await getEmploymentSupportEngagementReport({
      startDate: "2026-05-01",
      endDate: "2026-04-30",
    });

    expect(result).toEqual({
      success: false,
      error: "Start date must be on or before end date",
    });
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("rejects report access for client users", async () => {
    const profileQuery = queryChain({ data: { role: "client" }, error: null });

    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "client-user-1" } },
          error: null,
        }),
      },
      from: vi.fn(() => profileQuery),
    });

    const result = await getEmploymentSupportEngagementReport();

    expect(result).toEqual({
      success: false,
      error: "You do not have permission to access this report",
    });
    expect(createServiceClient).not.toHaveBeenCalled();
  });
});