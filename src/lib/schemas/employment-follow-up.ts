import { z } from "zod";

export const employmentFollowUpSchema = z.object({
  jobDetails: z.object({
    employer: z.string().optional(),
    jobTitle: z.string().optional(),
    startDate: z.string().optional(),
    salary: z.string().optional(),
    schedule: z.string().optional(),
  }),
  satisfaction: z.object({
    jobSatisfaction: z.string().optional(),
    supervisorSupport: z.string().optional(),
  }),
  challenges: z.object({
    hasTransportationChallenges: z.boolean().optional(),
    transportationExplanation: z.string().optional(),
    hasCoworkerOrEmployerConflicts: z.boolean().optional(),
    conflictExplanation: z.string().optional(),
    hasUncoveredEmploymentCosts: z.boolean().optional(),
    costExplanation: z.string().optional(),
    neededSkillsOrTraining: z.string().optional(),
  }),
  financialStability: z.object({
    canCoverBasicExpenses: z.string().optional(),
  }),
  nextSteps: z.object({
    wantsHousingAndSelfSufficiencyConnection: z.string().optional(),
    wantsCareerAdvancementSupport: z.string().optional(),
  }),
  feedback: z.object({
    additionalFeedback: z.string().optional(),
  }),
});

export type EmploymentFollowUpForm = z.infer<typeof employmentFollowUpSchema>;

export const defaultEmploymentFollowUp: EmploymentFollowUpForm = {
  jobDetails: {
    employer: "",
    jobTitle: "",
    startDate: "",
    salary: "",
    schedule: "",
  },
  satisfaction: {
    jobSatisfaction: "",
    supervisorSupport: "",
  },
  challenges: {
    hasTransportationChallenges: false,
    transportationExplanation: "",
    hasCoworkerOrEmployerConflicts: false,
    conflictExplanation: "",
    hasUncoveredEmploymentCosts: false,
    costExplanation: "",
    neededSkillsOrTraining: "",
  },
  financialStability: {
    canCoverBasicExpenses: "",
  },
  nextSteps: {
    wantsHousingAndSelfSufficiencyConnection: "",
    wantsCareerAdvancementSupport: "",
  },
  feedback: {
    additionalFeedback: "",
  },
};

export const EMPLOYMENT_SCHEDULE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "flexible", label: "Flexible schedule" },
];

export const JOB_SATISFACTION_OPTIONS = [
  { value: "very_satisfied", label: "Very satisfied" },
  { value: "somewhat_satisfied", label: "Somewhat satisfied" },
  { value: "neutral", label: "Neutral" },
  { value: "somewhat_dissatisfied", label: "Somewhat dissatisfied" },
  { value: "very_dissatisfied", label: "Very dissatisfied" },
];

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const YES_NO_SOMETIMES_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "sometimes", label: "Sometimes" },
];

export const YES_NOT_NOW_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "not_at_the_moment", label: "Not at the moment" },
];

export function employmentFollowUpDbRowToFormData(
  row: Record<string, unknown>
): EmploymentFollowUpForm {
  return {
    jobDetails: {
      employer: (row.employer as string) || "",
      jobTitle: (row.job_title as string) || "",
      startDate: (row.start_date as string) || "",
      salary: (row.salary as string) || "",
      schedule: (row.schedule as string) || "",
    },
    satisfaction: {
      jobSatisfaction: (row.job_satisfaction as string) || "",
      supervisorSupport: (row.supervisor_support as string) || "",
    },
    challenges: {
      hasTransportationChallenges:
        (row.has_transportation_challenges as boolean) || false,
      transportationExplanation:
        (row.transportation_explanation as string) || "",
      hasCoworkerOrEmployerConflicts:
        (row.has_coworker_or_employer_conflicts as boolean) || false,
      conflictExplanation: (row.conflict_explanation as string) || "",
      hasUncoveredEmploymentCosts:
        (row.has_uncovered_employment_costs as boolean) || false,
      costExplanation: (row.cost_explanation as string) || "",
      neededSkillsOrTraining: (row.needed_skills_or_training as string) || "",
    },
    financialStability: {
      canCoverBasicExpenses: (row.can_cover_basic_expenses as string) || "",
    },
    nextSteps: {
      wantsHousingAndSelfSufficiencyConnection:
        (row.wants_housing_and_self_sufficiency_connection as string) || "",
      wantsCareerAdvancementSupport:
        (row.wants_career_advancement_support as string) || "",
    },
    feedback: {
      additionalFeedback: (row.additional_feedback as string) || "",
    },
  };
}
