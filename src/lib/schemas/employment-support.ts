import { z } from "zod";

// ─── Work History Entry ────────────────────────────────────
export const workHistoryEntrySchema = z.object({
  employer: z.string().optional(),
  jobTitle: z.string().optional(),
  dates: z.string().optional(),
  duties: z.string().optional(),
});

// ─── Recent Application Entry ──────────────────────────────
export const recentApplicationSchema = z.object({
  company: z.string().optional(),
  position: z.string().optional(),
  dateApplied: z.string().optional(),
  outcome: z.string().optional(),
});

// ─── Section A: Basic Information ──────────────────────────
export const basicInfoSchema = z.object({
  preferredContactMethod: z.string().optional(),
  bestContactTime: z.string().optional(),
  availableDocuments: z.array(z.string()).optional(),
});

// ─── Section B: Education, Training & Credentials ──────────
export const educationSchema = z.object({
  educationLevel: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  certifications: z.string().optional(),
  wantsGedSupport: z.boolean().optional(),
});

// ─── Section C: Skills Assessment ──────────────────────────
export const skillsSchema = z.object({
  technicalSkills: z.string().optional(),
  languageSkills: z.string().optional(),
  otherSkills: z.string().optional(),
});

// ─── Section D: Past Work Experience ───────────────────────
export const workExperienceSchema = z.object({
  workHistory: z.array(workHistoryEntrySchema).optional(),
  workExperienceType: z.string().optional(),
  hasEmploymentGaps: z.boolean().optional(),
});

// ─── Section E: Job Preferences & Compensation ─────────────
export const jobPreferencesSchema = z.object({
  jobInterests: z.array(z.string()).optional(),
  jobInterestsOther: z.string().optional(),
  minimumHourlyPay: z.number().nullable().optional(),
  employmentTypes: z.array(z.string()).optional(),
  workAvailability: z.string().optional(),
  transportationMethods: z.array(z.string()).optional(),
});

// ─── Section F: Resume and Cover Letter ────────────────────
export const resumeSchema = z.object({
  resumeStatus: z.string().optional(),
  resumeLastUpdated: z.string().optional(),
  hasCoverLetter: z.boolean().optional(),
});

// ─── Section G: Job Search Activity ────────────────────────
export const jobSearchSchema = z.object({
  applicationSources: z.array(z.string()).optional(),
  applicationSourcesOther: z.string().optional(),
  recentApplications: z.array(recentApplicationSchema).optional(),
  hasInterviewRequests: z.boolean().optional(),
  interviewDetails: z.string().optional(),
});

// ─── Section H: Barriers & Support Needs ───────────────────
export const barriersSchema = z.object({
  barriers: z.array(z.string()).optional(),
  barriersOther: z.string().optional(),
  supportNeeds: z.array(z.string()).optional(),
});

// ─── Section I: Commitment & Follow-Up ─────────────────────
export const commitmentSchema = z.object({
  commitsToMeetings: z.boolean().optional(),
  checkinFrequency: z.string().optional(),
  additionalNotes: z.string().optional(),
});

// ─── Internal Use (Staff Only) ─────────────────────────────
export const internalUseSchema = z.object({
  readinessStatus: z.string().optional(),
  assignedStaffId: z.string().optional(),
  nextFollowupDate: z.string().optional(),
});

// ─── Combined Schema ──────────────────────────────────────
export const employmentSupportIntakeSchema = z.object({
  basicInfo: basicInfoSchema,
  education: educationSchema,
  skills: skillsSchema,
  workExperience: workExperienceSchema,
  jobPreferences: jobPreferencesSchema,
  resume: resumeSchema,
  jobSearch: jobSearchSchema,
  barriers: barriersSchema,
  commitment: commitmentSchema,
  internalUse: internalUseSchema,
});

// ─── Types ─────────────────────────────────────────────────
export type WorkHistoryEntry = z.infer<typeof workHistoryEntrySchema>;
export type RecentApplication = z.infer<typeof recentApplicationSchema>;
export type BasicInfo = z.infer<typeof basicInfoSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type WorkExperience = z.infer<typeof workExperienceSchema>;
export type JobPreferences = z.infer<typeof jobPreferencesSchema>;
export type Resume = z.infer<typeof resumeSchema>;
export type JobSearch = z.infer<typeof jobSearchSchema>;
export type Barriers = z.infer<typeof barriersSchema>;
export type Commitment = z.infer<typeof commitmentSchema>;
export type InternalUse = z.infer<typeof internalUseSchema>;
export type EmploymentSupportIntakeForm = z.infer<typeof employmentSupportIntakeSchema>;

// ─── Default Values ────────────────────────────────────────
export const defaultWorkHistoryEntry: WorkHistoryEntry = {
  employer: "",
  jobTitle: "",
  dates: "",
  duties: "",
};

export const defaultRecentApplication: RecentApplication = {
  company: "",
  position: "",
  dateApplied: "",
  outcome: "",
};

export const defaultBasicInfo: BasicInfo = {
  preferredContactMethod: "",
  bestContactTime: "",
  availableDocuments: [],
};

export const defaultEducation: Education = {
  educationLevel: "",
  fieldOfStudy: "",
  certifications: "",
  wantsGedSupport: false,
};

export const defaultSkills: Skills = {
  technicalSkills: "",
  languageSkills: "",
  otherSkills: "",
};

export const defaultWorkExperience: WorkExperience = {
  workHistory: [{ ...defaultWorkHistoryEntry }],
  workExperienceType: "",
  hasEmploymentGaps: false,
};

export const defaultJobPreferences: JobPreferences = {
  jobInterests: [],
  jobInterestsOther: "",
  minimumHourlyPay: null,
  employmentTypes: [],
  workAvailability: "",
  transportationMethods: [],
};

export const defaultResume: Resume = {
  resumeStatus: "",
  resumeLastUpdated: "",
  hasCoverLetter: false,
};

export const defaultJobSearch: JobSearch = {
  applicationSources: [],
  applicationSourcesOther: "",
  recentApplications: [],
  hasInterviewRequests: false,
  interviewDetails: "",
};

export const defaultBarriers: Barriers = {
  barriers: [],
  barriersOther: "",
  supportNeeds: [],
};

export const defaultCommitment: Commitment = {
  commitsToMeetings: false,
  checkinFrequency: "",
  additionalNotes: "",
};

export const defaultInternalUse: InternalUse = {
  readinessStatus: "",
  assignedStaffId: "",
  nextFollowupDate: "",
};

export const defaultEmploymentSupportIntake: EmploymentSupportIntakeForm = {
  basicInfo: defaultBasicInfo,
  education: defaultEducation,
  skills: defaultSkills,
  workExperience: defaultWorkExperience,
  jobPreferences: defaultJobPreferences,
  resume: defaultResume,
  jobSearch: defaultJobSearch,
  barriers: defaultBarriers,
  commitment: defaultCommitment,
  internalUse: defaultInternalUse,
};

// ─── Option Constants ──────────────────────────────────────
export const CONTACT_METHOD_OPTIONS = [
  { value: "call", label: "Call" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
];

export const AVAILABLE_DOCUMENT_OPTIONS = [
  { value: "government_id", label: "Government-issued ID" },
  { value: "ssn", label: "Social Security card/number" },
  { value: "itin", label: "ITIN" },
  { value: "needs_help", label: "No, I need help obtaining these documents" },
];

export const EDUCATION_LEVEL_OPTIONS = [
  { value: "less_than_high_school", label: "Less than high school" },
  { value: "high_school_or_ged", label: "High school or GED" },
  { value: "some_college", label: "Some college" },
  { value: "associate", label: "Associate degree" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "graduate", label: "Graduate degree" },
];

export const WORK_EXPERIENCE_TYPE_OPTIONS = [
  { value: "mostly_customer_facing", label: "Mostly customer-facing" },
  { value: "mostly_non_customer_facing", label: "Mostly non-customer-facing" },
  { value: "mixed", label: "Mixed" },
  { value: "limited", label: "Limited or no formal work history" },
];

export const JOB_INTEREST_OPTIONS = [
  { value: "customer_service", label: "Customer service/retail" },
  { value: "warehouse", label: "Warehouse/logistics/labor" },
  { value: "admin", label: "Administrative/office support" },
  { value: "driving", label: "Driving/delivery" },
  { value: "food_service", label: "Food service" },
  { value: "healthcare", label: "Healthcare" },
  { value: "other", label: "Other" },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "temporary", label: "Temporary" },
  { value: "contract", label: "Contract" },
];

export const TRANSPORTATION_OPTIONS = [
  { value: "bus", label: "Bus" },
  { value: "car", label: "Car" },
  { value: "rides", label: "Rides from others" },
  { value: "walking", label: "Walking" },
  { value: "none", label: "I have no reliable transportation" },
];

export const RESUME_STATUS_OPTIONS = [
  { value: "ready", label: "Yes, ready to use" },
  { value: "needs_updating", label: "Yes, but needs updating" },
  { value: "none", label: "No" },
];

export const RESUME_UPDATED_OPTIONS = [
  { value: "within_6_months", label: "Within the last 6 months" },
  { value: "more_than_6_months", label: "More than 6 months ago" },
  { value: "not_sure", label: "Not sure" },
];

export const APPLICATION_SOURCE_OPTIONS = [
  { value: "indeed", label: "Indeed" },
  { value: "company_websites", label: "Company websites" },
  { value: "in_person", label: "In-person applications" },
  { value: "referrals", label: "Referrals" },
  { value: "other", label: "Other" },
  { value: "none", label: "I haven't applied anywhere" },
];

export const BARRIER_OPTIONS = [
  { value: "transportation", label: "Transportation" },
  { value: "health", label: "Health or disability" },
  { value: "housing", label: "Housing instability" },
  { value: "childcare", label: "Childcare or caregiving responsibilities" },
  { value: "technology", label: "Technology/computer access and/or limited skills" },
  { value: "criminal_record", label: "Criminal record" },
  { value: "probation", label: "Currently on probation/parole" },
  { value: "limited_experience", label: "Limited work experience/gaps in employment" },
  { value: "language", label: "Language barriers" },
  { value: "substance_use", label: "Substance use disorder" },
  { value: "other", label: "Other" },
];

export const SUPPORT_NEED_OPTIONS = [
  { value: "resume_help", label: "Resume help" },
  { value: "cover_letter", label: "Cover letter help" },
  { value: "job_search", label: "Job search assistance (email, online applications)" },
  { value: "interview_prep", label: "Interview preparation" },
  { value: "training", label: "Training or workshops" },
  { value: "post_employment", label: "Support after starting work" },
];

export const CHECKIN_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "as_needed", label: "As needed" },
];

export const READINESS_STATUS_OPTIONS = [
  { value: "ready", label: "Ready to proceed" },
  { value: "needs_preparation", label: "Needs preparation" },
  { value: "refer_back_later", label: "Refer back later" },
];

/**
 * Converts a database row back into the form schema shape.
 * Lives here (not in a server-action file) so it can be imported by client components.
 */
export function dbRowToFormData(
  row: Record<string, unknown>
): EmploymentSupportIntakeForm {
  return {
    basicInfo: {
      preferredContactMethod: (row.preferred_contact_method as string) || "",
      bestContactTime: (row.best_contact_time as string) || "",
      availableDocuments: (row.available_documents as string[]) || [],
    },
    education: {
      educationLevel: (row.education_level as string) || "",
      fieldOfStudy: (row.field_of_study as string) || "",
      certifications: (row.certifications as string) || "",
      wantsGedSupport: (row.wants_ged_support as boolean) || false,
    },
    skills: {
      technicalSkills: (row.technical_skills as string) || "",
      languageSkills: (row.language_skills as string) || "",
      otherSkills: (row.other_skills as string) || "",
    },
    workExperience: {
      workHistory: (row.work_history as { employer?: string; jobTitle?: string; dates?: string; duties?: string }[]) || [],
      workExperienceType: (row.work_experience_type as string) || "",
      hasEmploymentGaps: (row.has_employment_gaps as boolean) || false,
    },
    jobPreferences: {
      jobInterests: (row.job_interests as string[]) || [],
      jobInterestsOther: (row.job_interests_other as string) || "",
      minimumHourlyPay: (row.minimum_hourly_pay as number) ?? null,
      employmentTypes: (row.employment_types as string[]) || [],
      workAvailability: (row.work_availability as string) || "",
      transportationMethods: (row.transportation_methods as string[]) || [],
    },
    resume: {
      resumeStatus: (row.resume_status as string) || "",
      resumeLastUpdated: (row.resume_last_updated as string) || "",
      hasCoverLetter: (row.has_cover_letter as boolean) || false,
    },
    jobSearch: {
      applicationSources: (row.application_sources as string[]) || [],
      applicationSourcesOther: (row.application_sources_other as string) || "",
      recentApplications: (row.recent_applications as { company?: string; position?: string; dateApplied?: string; outcome?: string }[]) || [],
      hasInterviewRequests: (row.has_interview_requests as boolean) || false,
      interviewDetails: (row.interview_details as string) || "",
    },
    barriers: {
      barriers: (row.barriers as string[]) || [],
      barriersOther: (row.barriers_other as string) || "",
      supportNeeds: (row.support_needs as string[]) || [],
    },
    commitment: {
      commitsToMeetings: (row.commits_to_meetings as boolean) || false,
      checkinFrequency: (row.checkin_frequency as string) || "",
      additionalNotes: (row.additional_notes as string) || "",
    },
    internalUse: {
      readinessStatus: (row.readiness_status as string) || "",
      assignedStaffId: (row.assigned_staff_id as string) || "",
      nextFollowupDate: (row.next_followup_date as string) || "",
    },
  };
}
