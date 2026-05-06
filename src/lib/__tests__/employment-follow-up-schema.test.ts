import { describe, expect, it } from "vitest";
import {
  defaultEmploymentFollowUp,
  employmentFollowUpDbRowToFormData,
  employmentFollowUpSchema,
} from "../schemas/employment-follow-up";

describe("employment follow-up schema helpers", () => {
  it("provides a valid default follow-up shape", () => {
    expect(() =>
      employmentFollowUpSchema.parse(defaultEmploymentFollowUp)
    ).not.toThrow();
    expect(defaultEmploymentFollowUp.jobDetails.employer).toBe("");
    expect(
      defaultEmploymentFollowUp.challenges.hasTransportationChallenges
    ).toBe(false);
  });

  it("maps database rows back into form sections", () => {
    const formData = employmentFollowUpDbRowToFormData({
      employer: "Acme",
      job_title: "Assembler",
      start_date: "2026-05-01",
      salary: "$22/hour",
      schedule: "full_time",
      job_satisfaction: "somewhat_satisfied",
      supervisor_support: "sometimes",
      has_transportation_challenges: true,
      transportation_explanation: "Bus route changed",
      has_coworker_or_employer_conflicts: true,
      conflict_explanation: "Scheduling conflict",
      has_uncovered_employment_costs: true,
      cost_explanation: "Uniforms",
      needed_skills_or_training: "Forklift certification",
      can_cover_basic_expenses: "sometimes",
      wants_housing_and_self_sufficiency_connection: "yes",
      wants_career_advancement_support: "not_at_the_moment",
      additional_feedback: "Needs evening check-ins",
    });

    expect(formData.jobDetails.employer).toBe("Acme");
    expect(formData.jobDetails.jobTitle).toBe("Assembler");
    expect(formData.satisfaction.supervisorSupport).toBe("sometimes");
    expect(formData.challenges.hasTransportationChallenges).toBe(true);
    expect(formData.challenges.costExplanation).toBe("Uniforms");
    expect(formData.financialStability.canCoverBasicExpenses).toBe("sometimes");
    expect(
      formData.nextSteps.wantsHousingAndSelfSufficiencyConnection
    ).toBe("yes");
    expect(formData.feedback.additionalFeedback).toBe("Needs evening check-ins");
  });

  it("fills missing database values with safe defaults", () => {
    const formData = employmentFollowUpDbRowToFormData({});

    expect(formData.jobDetails.employer).toBe("");
    expect(formData.challenges.hasUncoveredEmploymentCosts).toBe(false);
    expect(formData.nextSteps.wantsCareerAdvancementSupport).toBe("");
  });
});
