import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createServiceClient, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
  createServiceClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

import { saveEmploymentSupportIntake } from "@/app/actions/employment-support";

function queryChain(terminalValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn> | unknown> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.ilike = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalValue);
  chain.then = (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(terminalValue).then(resolve);

  return chain as {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    ilike: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
  };
}

describe("saveEmploymentSupportIntake", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createClient.mockReset();
    createServiceClient.mockReset();
    revalidatePath.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-enrolls client into Employment Support when no enrollment exists", async () => {
    const clientId = "client-999";
    const programId = "prog-emp-123";
    const newEnrollmentId = "enrollment-new-456";
    const intakeId = "intake-created-789";

    const profileQuery = queryChain({ data: { role: "case_manager" }, error: null });
    const programQuery = queryChain({ data: { id: programId }, error: null });
    const enrollmentQuery = queryChain({ data: null, error: null });
    const intakeInsertQuery = queryChain({ data: { id: intakeId }, error: null });

    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "staff-user-1" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") return profileQuery;
        if (table === "programs") return programQuery;
        if (table === "program_enrollments") return enrollmentQuery;
        if (table === "employment_support_intake") return intakeInsertQuery;
        return queryChain();
      }),
    });

    const serviceEnrollmentInsertQuery = queryChain({ data: { id: newEnrollmentId }, error: null });
    createServiceClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "program_enrollments") return serviceEnrollmentInsertQuery;
        return queryChain();
      }),
    });

    const result = await saveEmploymentSupportIntake({
      clientId,
      data: {
        basicInfo: {
          preferredContactMethod: "phone",
          bestContactTime: "morning",
          availableDocuments: ["Resume"],
        },
        education: {
          educationLevel: "high_school",
          fieldOfStudy: "",
          certifications: "",
          wantsGedSupport: false,
        },
        skills: {
          technicalSkills: "Excel",
          languageSkills: "English",
          otherSkills: "",
        },
        workExperience: {
          workHistory: [],
          workExperienceType: "customer_service",
          hasEmploymentGaps: false,
        },
        jobPreferences: {
          jobInterests: ["Retail"],
          jobInterestsOther: "",
          minimumHourlyPay: 20,
          employmentTypes: ["full_time"],
          workAvailability: "immediate",
          transportationMethods: ["car"],
        },
        resume: {
          resumeStatus: "ready",
          resumeLastUpdated: "",
          hasCoverLetter: false,
          coverLetterLastUpdated: "",
        },
        jobSearch: {
          applicationSources: ["indeed"],
          applicationSourcesOther: "",
          recentApplications: [],
          hasInterviewRequests: false,
          interviewDetails: "",
        },
        barriers: {
          barriers: [],
          barriersOther: "",
          supportNeeds: [],
        },
        commitment: {
          commitsToMeetings: true,
          checkinFrequency: "weekly",
          additionalNotes: "",
        },
        internalUse: {
          readinessStatus: "job_ready",
          assignedStaffId: "staff-user-1",
          nextFollowupDate: "",
        },
      },
      asDraft: false,
    });

    expect(result).toEqual({ success: true, intakeId });
    expect(serviceEnrollmentInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: clientId,
        program_id: programId,
        status: "enrolled",
      })
    );
    expect(intakeInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: clientId,
        program_enrollment_id: newEnrollmentId,
        status: "submitted",
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${clientId}`);
    expect(revalidatePath).toHaveBeenCalledWith("/employment-support");
  });
});
