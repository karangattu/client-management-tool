import { describe, expect, it } from "vitest";
import {
  dbRowToFormData,
  defaultEmploymentSupportIntake,
  defaultWorkHistoryEntry,
  employmentSupportIntakeSchema,
  hasEmploymentIntakeProgress,
  isEmploymentIntakeFilled,
} from "../schemas/employment-support";

describe("employment-support schema helpers", () => {
  it("provides a valid default intake shape", () => {
    expect(defaultEmploymentSupportIntake.workExperience.workHistory).toEqual([
      defaultWorkHistoryEntry,
    ]);
    expect(defaultEmploymentSupportIntake.education.wantsGedSupport).toBe(false);
    expect(defaultEmploymentSupportIntake.resume.hasCoverLetter).toBe(false);
    expect(() => employmentSupportIntakeSchema.parse(defaultEmploymentSupportIntake)).not.toThrow();
  });

  it("maps database rows back into form sections", () => {
    const formData = dbRowToFormData({
      preferred_contact_method: "text",
      available_documents: ["government_id"],
      wants_ged_support: true,
      work_history: [{ employer: "Acme" }],
      minimum_hourly_pay: 22,
      has_cover_letter: true,
      recent_applications: [{ company: "Widgets Inc" }],
      support_needs: ["resume_help"],
      assigned_staff_id: "staff-1",
    });

    expect(formData.basicInfo.preferredContactMethod).toBe("text");
    expect(formData.basicInfo.availableDocuments).toEqual(["government_id"]);
    expect(formData.education.wantsGedSupport).toBe(true);
    expect(formData.workExperience.workHistory).toEqual([{ employer: "Acme" }]);
    expect(formData.jobPreferences.minimumHourlyPay).toBe(22);
    expect(formData.resume.hasCoverLetter).toBe(true);
    expect(formData.jobSearch.recentApplications).toEqual([{ company: "Widgets Inc" }]);
    expect(formData.barriers.supportNeeds).toEqual(["resume_help"]);
    expect(formData.internalUse.assignedStaffId).toBe("staff-1");
  });

  it("fills missing database values with safe defaults", () => {
    const formData = dbRowToFormData({});

    expect(formData.basicInfo.availableDocuments).toEqual([]);
    expect(formData.education.wantsGedSupport).toBe(false);
    expect(formData.jobPreferences.minimumHourlyPay).toBeNull();
    expect(formData.resume.hasCoverLetter).toBe(false);
    expect(formData.internalUse.assignedStaffId).toBe("");
  });

  it("accurately detects when intake has progress or is filled", () => {
    expect(hasEmploymentIntakeProgress(defaultEmploymentSupportIntake)).toBe(false);
    expect(isEmploymentIntakeFilled(defaultEmploymentSupportIntake)).toBe(false);

    const partialIntake = {
      ...defaultEmploymentSupportIntake,
      basicInfo: {
        ...defaultEmploymentSupportIntake.basicInfo,
        preferredContactMethod: "call",
      },
    };
    expect(hasEmploymentIntakeProgress(partialIntake)).toBe(true);
    expect(isEmploymentIntakeFilled(partialIntake)).toBe(false);

    const filledIntake = {
      ...defaultEmploymentSupportIntake,
      basicInfo: {
        preferredContactMethod: "email",
        bestContactTime: "morning",
        availableDocuments: ["government_id"],
      },
      education: {
        educationLevel: "high_school_or_ged",
        fieldOfStudy: "",
        certifications: "",
        wantsGedSupport: false,
      },
      skills: {
        technicalSkills: "Excel",
        languageSkills: "",
        otherSkills: "",
      },
      workExperience: {
        workHistory: [{ employer: "ABC Inc", jobTitle: "Clerk", dates: "2022-2024", duties: "Filing" }],
        workExperienceType: "mostly_customer_facing",
        hasEmploymentGaps: false,
      },
      jobPreferences: {
        jobInterests: ["customer_service"],
        jobInterestsOther: "",
        minimumHourlyPay: 20,
        employmentTypes: ["full_time"],
        workAvailability: "immediate",
        transportationMethods: ["car"],
      },
      resume: {
        resumeStatus: "ready",
        resumeLastUpdated: "within_6_months",
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
        supportNeeds: ["resume_help"],
      },
      commitment: {
        commitsToMeetings: true,
        checkinFrequency: "weekly",
        additionalNotes: "",
      },
    };

    expect(hasEmploymentIntakeProgress(filledIntake)).toBe(true);
    expect(isEmploymentIntakeFilled(filledIntake)).toBe(true);
  });
});

