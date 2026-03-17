import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateBenefits } from "../benefitsEngine";
import { evaluateEligibility } from "../eligibility";

function findProgram(results: ReturnType<typeof evaluateEligibility>, programName: string) {
  const match = results.find((result) => result.programName === programName);
  expect(match).toBeDefined();
  return match!;
}

describe("eligibility engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00-07:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("evaluates every supported program", () => {
    const results = evaluateEligibility({});

    expect(results).toHaveLength(22);
    expect(results.map((result) => result.programId)).toEqual(
      Array.from({ length: 22 }, (_, index) => index + 1)
    );
  });

  it("marks key homeless, veteran, and disability programs as eligible when requirements are met", () => {
    const results = evaluateEligibility({
      participantDetails: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        dateOfBirth: "1960-03-01",
      },
      demographics: {
        monthlyIncome: 1200,
        disabilityStatus: true,
        veteranStatus: true,
      },
      caseManagement: {
        housingStatus: "unsheltered",
        healthStatus: "blind",
        nonCashBenefits: ["SSI"],
      },
    });

    expect(findProgram(results, "UPLIFT").isEligible).toBe(true);
    expect(findProgram(results, "ADSA (Assistance Dog Special Allowance)").isEligible).toBe(true);
    expect(findProgram(results, "CalFresh").isEligible).toBe(true);
    expect(findProgram(results, "HUD-VASH").isEligible).toBe(true);
  });

  it("marks housed clients as FSS matches", () => {
    const results = evaluateEligibility({
      caseManagement: { housingStatus: "housed" },
    });

    const fss = findProgram(results, "FSS (Family Self Sufficiency)");
    expect(fss.isEligible).toBe(true);
    expect(fss.isMaybe).toBe(true);
  });

  it("filters benefit results down to eligible or maybe matches", () => {
    const results = calculateBenefits({
      caseManagement: { housingStatus: "housed" },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.isEligible || result.isMaybe)).toBe(true);
    expect(results.some((result) => result.programName === "FSS (Family Self Sufficiency)")).toBe(true);
  });
});
