import { describe, expect, it } from "vitest";
import {
  defaultEmploymentSupportIntake,
  hasEmploymentIntakeProgress,
  isEmploymentIntakeFilled,
  type EmploymentSupportIntakeForm,
} from "../schemas/employment-support";

describe("employment support draft & completion validation", () => {
  it("handles null or undefined safely", () => {
    expect(isEmploymentIntakeFilled(null)).toBe(false);
    expect(isEmploymentIntakeFilled(undefined)).toBe(false);
    expect(hasEmploymentIntakeProgress(null)).toBe(false);
    expect(hasEmploymentIntakeProgress(undefined)).toBe(false);
  });

  it("returns false for fresh blank default intake", () => {
    expect(hasEmploymentIntakeProgress(defaultEmploymentSupportIntake)).toBe(false);
    expect(isEmploymentIntakeFilled(defaultEmploymentSupportIntake)).toBe(false);
  });

  it("detects progress when user enters contact or education information", () => {
    const intakeWithContact: EmploymentSupportIntakeForm = {
      ...defaultEmploymentSupportIntake,
      basicInfo: {
        ...defaultEmploymentSupportIntake.basicInfo,
        preferredContactMethod: "call",
      },
    };
    expect(hasEmploymentIntakeProgress(intakeWithContact)).toBe(true);
    expect(isEmploymentIntakeFilled(intakeWithContact)).toBe(false);

    const intakeWithEdu: EmploymentSupportIntakeForm = {
      ...defaultEmploymentSupportIntake,
      education: {
        ...defaultEmploymentSupportIntake.education,
        educationLevel: "high_school_or_ged",
      },
    };
    expect(hasEmploymentIntakeProgress(intakeWithEdu)).toBe(true);
    expect(isEmploymentIntakeFilled(intakeWithEdu)).toBe(false);
  });

  it("requires key fields across core sections for isEmploymentIntakeFilled", () => {
    const candidate: EmploymentSupportIntakeForm = {
      ...defaultEmploymentSupportIntake,
      basicInfo: {
        preferredContactMethod: "email",
        bestContactTime: "anytime",
        availableDocuments: ["government_id", "ssn"],
      },
      education: {
        educationLevel: "bachelor",
        fieldOfStudy: "Business",
        certifications: "",
        wantsGedSupport: false,
      },
      skills: {
        technicalSkills: "Office Suite",
        languageSkills: "Spanish",
        otherSkills: "",
      },
      workExperience: {
        workHistory: [{ employer: "Target", jobTitle: "Associate", dates: "2021-2023", duties: "Retail" }],
        workExperienceType: "mostly_customer_facing",
        hasEmploymentGaps: false,
      },
      jobPreferences: {
        jobInterests: ["admin"],
        jobInterestsOther: "",
        minimumHourlyPay: 24,
        employmentTypes: ["full_time"],
        workAvailability: "within_two_weeks",
        transportationMethods: ["car"],
      },
      resume: {
        resumeStatus: "ready",
        resumeLastUpdated: "within_6_months",
        hasCoverLetter: true,
        coverLetterLastUpdated: "within_6_months",
      },
      jobSearch: {
        applicationSources: ["indeed", "referrals"],
        applicationSourcesOther: "",
        recentApplications: [],
        hasInterviewRequests: true,
        interviewDetails: "Interview scheduled next Tuesday",
      },
      barriers: {
        barriers: [],
        barriersOther: "",
        supportNeeds: ["interview_prep"],
      },
      commitment: {
        commitsToMeetings: true,
        checkinFrequency: "biweekly",
        additionalNotes: "Eager to start",
      },
    };

    expect(hasEmploymentIntakeProgress(candidate)).toBe(true);
    expect(isEmploymentIntakeFilled(candidate)).toBe(true);

    const missingResume = {
      ...candidate,
      resume: {
        ...candidate.resume,
        resumeStatus: "",
      },
    };
    expect(isEmploymentIntakeFilled(missingResume)).toBe(false);

    const missingWork = {
      ...candidate,
      workExperience: {
        workHistory: [],
        workExperienceType: "",
        hasEmploymentGaps: false,
      },
    };
    expect(isEmploymentIntakeFilled(missingWork)).toBe(false);
  });
});
