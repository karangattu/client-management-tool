import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient, createServiceClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/actions/cache", () => ({ cacheReadOnly: (fn: unknown) => fn }));
vi.mock("@/app/actions/employment-support", () => ({
  createDraftEmploymentSupportIntake: vi.fn().mockResolvedValue({ success: true }),
}));

import { updateEnrollmentStatus, upsertEnrollment } from "./programs";

function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = {
    select: vi.fn(), eq: vi.fn(), update: vi.fn(), upsert: vi.fn(), insert: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of [chain.select, chain.eq, chain.update, chain.upsert, chain.insert]) {
    method.mockReturnValue(chain);
  }
  return chain;
}

function setup(existingStartDate: string | null = null) {
  const enrollmentQuery = query({ id: "enrollment-1", start_date: existingStartDate });
  const tables = {
    programs: query({ id: "program-1", name: "Employment Support" }),
    clients: query({ status: "active", intake_completed_at: "2026-01-01" }),
    program_enrollments: enrollmentQuery,
    program_enrollment_activity: query(null),
    program_tasks: query([]),
  };
  createClient.mockResolvedValue({
    from: (table: string) => tables[table as keyof typeof tables],
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "staff-1" } } }) },
  });
  return enrollmentQuery;
}

describe("program enrollment start dates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // UTC is already October 23, but the enrollment date in Pacific time is October 22.
    vi.setSystemTime(new Date("2026-10-23T01:30:00.000Z"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("records the Pacific date when an interested client becomes enrolled", async () => {
    const enrollment = setup();
    const result = await updateEnrollmentStatus({
      enrollmentId: "enrollment-1", clientId: "client-1", oldStatus: "interested", newStatus: "enrolled",
    });

    expect(result.success).toBe(true);
    expect(enrollment.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "enrolled", start_date: "2026-10-22",
    }));
  });

  it("preserves the original start date when a client enrolls again", async () => {
    const enrollment = setup("2025-06-10");
    await updateEnrollmentStatus({
      enrollmentId: "enrollment-1", clientId: "client-1", oldStatus: "withdrawn", newStatus: "enrolled",
    });

    expect(enrollment.update).toHaveBeenCalledOnce();
    expect(enrollment.update.mock.calls[0][0]).not.toHaveProperty("start_date");
  });

  it("does not assign a start date when a client is only applying", async () => {
    const enrollment = setup();
    await updateEnrollmentStatus({
      enrollmentId: "enrollment-1", clientId: "client-1", oldStatus: "interested", newStatus: "applying",
    });

    expect(enrollment.update).toHaveBeenCalledOnce();
    expect(enrollment.update.mock.calls[0][0]).not.toHaveProperty("start_date");
  });

  it("does not change status when the existing start date cannot be read", async () => {
    const enrollment = setup();
    enrollment.maybeSingle.mockResolvedValue({ data: null, error: { message: "Read failed" } });
    const result = await updateEnrollmentStatus({
      enrollmentId: "enrollment-1", clientId: "client-1", oldStatus: "interested", newStatus: "enrolled",
    });

    expect(result.success).toBe(false);
    expect(enrollment.update).not.toHaveBeenCalled();
  });

  it.each([
    { status: "interested", existing: null, supplied: undefined, expected: null },
    { status: "enrolled", existing: null, supplied: undefined, expected: "2026-10-22" },
    { status: "enrolled", existing: "2025-06-10", supplied: undefined, expected: "2025-06-10" },
    { status: "interested", existing: "2025-06-10", supplied: "", expected: "2025-06-10" },
    { status: "enrolled", existing: "2025-06-10", supplied: "2025-06-05", expected: "2025-06-05" },
  ])("saves start_date=$expected for $status (existing=$existing, supplied=$supplied)", async ({
    status, existing, supplied, expected,
  }) => {
    const enrollment = setup(existing);
    const result = await upsertEnrollment({
      clientId: "client-1", programId: "program-1", status, startDate: supplied,
    });

    expect(result.success).toBe(true);
    expect(enrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status, start_date: expected }),
      expect.anything(),
    );
  });

  it("does not overwrite an enrollment when its existing date cannot be read", async () => {
    const enrollment = setup("2025-06-10");
    enrollment.maybeSingle.mockResolvedValue({ data: null, error: { message: "Read failed" } });
    const result = await upsertEnrollment({
      clientId: "client-1", programId: "program-1", status: "enrolled",
    });

    expect(result.success).toBe(false);
    expect(enrollment.upsert).not.toHaveBeenCalled();
  });
});
