
import { ClientIntakeForm } from "./schemas/validation";

export interface EligibilityResult {
    programId: number;
    programName: string;
    isEligible: boolean;
    isMaybe: boolean;
    metConditions: string[];
    missingConditions: string[];
}

export const PROGRAM_NAMES: Record<number, string> = {
    1: "UPLIFT",
    2: "ADSA (Assistance Dog Special Allowance)",
    3: "CalFresh",
    4: "CalWORKs",
    5: "CAPI (Cash Assistance Program for Immigrants)",
    6: "CARE (California Alternate Rates for Energy)",
    7: "FERA (Family Electric Rate Assistance)",
    8: "VA Disability Compensation",
    9: "FSS (Family Self Sufficiency)",
    10: "General Assistance",
    11: "HUD-VASH",
    12: "No-fee ID card",
    13: "Reduced-fee ID card",
    14: "IHSS (In-Home Supportive Services)",
    15: "LifeLine Phone",
    16: "LIHEAP (Low Income Home Energy Assistance Program)",
    17: "VTA Paratransit Pass",
    18: "Section 8 Interest List",
    19: "SSDI (Social Security Disability Insurance)",
    20: "SSI (Supplemental Security Income)",
    21: "VA Pension",
    22: "WIC (Women, Infants & Children)",
};

const getIncome = (incomeStr: string | undefined): number => {
    if (!incomeStr) return 0;
    return parseFloat(incomeStr.replace(/[^0-9.]/g, '')) || 0;
};

const getAge = (dob: string | undefined): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export function evaluateEligibility(formData: Partial<ClientIntakeForm>): EligibilityResult[] {
    const results: EligibilityResult[] = [];
    const income = getIncome(formData.demographics?.monthlyIncome);
    const age = getAge(formData.participantDetails?.dateOfBirth);
    const housingStatus = formData.caseManagement?.housingStatus;
    const isUnhoused = housingStatus === 'unsheltered' || housingStatus === 'emergency_shelter' || housingStatus === 'transitional_housing';
    const isAtRisk = housingStatus === 'at_risk';
    const isHoused = housingStatus === 'housed';
    const isDisabled = formData.demographics?.disabilityStatus === true;
    const isVeteran = formData.demographics?.veteranStatus === true;
    const healthStatus = formData.caseManagement?.healthStatus;
    const benefits = formData.caseManagement?.nonCashBenefits || [];

    // 1. UPLIFT
    results.push(evaluateUPLIFT(formData, isUnhoused, isAtRisk));

    // 2. ADSA
    results.push(evaluateADSA(formData, isDisabled, healthStatus, benefits));

    // 3. CalFresh
    results.push(evaluateCalFresh(formData, income, age, isDisabled));

    // 4. CalWORKs
    results.push(evaluateCalWORKs(formData, income));

    // 5. CAPI
    results.push(evaluateCAPI(formData, income, age, isDisabled));

    // 6. CARE
    results.push(evaluateCARE(formData, income, benefits));

    // 7. FERA
    results.push(evaluateFERA(formData, income));

    // 8. VA Disability
    results.push(evaluateVADisability(formData, isVeteran));

    // 9. FSS
    results.push(evaluateFSS(formData, isHoused));

    // 10. General Assistance
    results.push(evaluateGA(formData, income, age));

    // 11. HUD-VASH
    results.push(evaluateHUDVASH(formData, isVeteran, isUnhoused, income));

    // 12. No-fee ID
    results.push(evaluateNoFeeID(formData, isUnhoused, age));

    // 13. Reduced-fee ID
    results.push(evaluateReducedFeeID(formData, isHoused, age, benefits));

    // 14. IHSS
    results.push(evaluateIHSS(formData, age, isDisabled, isHoused, healthStatus));

    // 15. LifeLine
    results.push(evaluateLifeLine(formData, income, benefits));

    // 16. LIHEAP
    results.push(evaluateLIHEAP(formData, isHoused, income));

    // 17. VTA Paratransit
    results.push(evaluateVTA(formData, isDisabled));

    // 18. Section 8 Interest List
    results.push(evaluateSection8(formData, income, isUnhoused, age));

    // 19. SSDI
    results.push(evaluateSSDI(formData, isDisabled));

    // 20. SSI
    results.push(evaluateSSI(formData, isDisabled, income));

    // 21. VA Pension
    results.push(evaluateVAPension(formData, isVeteran, income, age, isDisabled));

    // 22. WIC
    results.push(evaluateWIC(formData, income, benefits));

    return results;
}

function evaluateUPLIFT(formData: Partial<ClientIntakeForm>, isUnhoused: boolean, isAtRisk: boolean): EligibilityResult {
    const metConditions: string[] = [];
    const missing: string[] = [];

    // Rule: No car AND (unhoused OR at risk)
    const hasCar = false; // Actually not in form schema yet
    if (isUnhoused || isAtRisk) metConditions.push("Unhoused or At Risk");
    else missing.push("Housing Status (Unhoused or At Risk)");

    return {
        programId: 1,
        programName: PROGRAM_NAMES[1],
        isEligible: (isUnhoused || isAtRisk),
        isMaybe: false,
        metConditions,
        missingConditions: missing
    };
}

function evaluateADSA(formData: Partial<ClientIntakeForm>, isDisabled: boolean, healthStatus: string | undefined, benefits: string[]): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];

    const isBlindOrDeaf = healthStatus === 'blind' || healthStatus === 'deaf';
    if (isDisabled || isBlindOrDeaf) met.push("Disabled, Blind, or Deaf");
    else missing.push("Disability/Vision/Hearing status");

    const hasServiceDog = false; // Missing from schema
    const receivesCoreBenefits = benefits.some(b => ['ssi', 'ssdi', 'ihss', 'capi'].includes(b.toLowerCase()));

    if (receivesCoreBenefits) met.push("Receives SSI/SSDI/IHSS/CAPI");
    else missing.push("Receive core benefits (SSI/SSDI/IHSS/CAPI)");

    return {
        programId: 2,
        programName: PROGRAM_NAMES[2],
        isEligible: (isDisabled || isBlindOrDeaf) && receivesCoreBenefits,
        isMaybe: (isDisabled || isBlindOrDeaf) || receivesCoreBenefits,
        metConditions: met,
        missingConditions: missing
    };
}

function evaluateCalFresh(formData: Partial<ClientIntakeForm>, income: number, age: number, isDisabled: boolean): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];

    // Placeholder income limit
    const incomeLimit = 2500;
    if (income < incomeLimit) met.push("Income within limits");
    else missing.push("Income exceeds placeholder limit");

    if (age >= 60 || isDisabled) met.push("Senior or Disabled");

    return {
        programId: 3,
        programName: PROGRAM_NAMES[3],
        isEligible: income < incomeLimit,
        isMaybe: false,
        metConditions: met,
        missingConditions: missing
    };
}

function evaluateCalWORKs(formData: Partial<ClientIntakeForm>, income: number): EligibilityResult {
    const hasChildren = (formData.household?.members?.length || 0) > 0;
    return {
        programId: 4,
        programName: PROGRAM_NAMES[4],
        isEligible: hasChildren && income < 3000,
        isMaybe: hasChildren,
        metConditions: hasChildren ? ["Has household members"] : [],
        missingConditions: !hasChildren ? ["Household members/children"] : []
    };
}

function evaluateCAPI(formData: Partial<ClientIntakeForm>, income: number, age: number, isDisabled: boolean): EligibilityResult {
    const isSenior = age >= 65;
    return {
        programId: 5,
        programName: PROGRAM_NAMES[5],
        isEligible: (isSenior || isDisabled) && income < 2000,
        isMaybe: isSenior || isDisabled,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateCARE(formData: Partial<ClientIntakeForm>, income: number, benefits: string[]): EligibilityResult {
    const receivesValidBenefits = benefits.some(b => ['liheap', 'wic', 'calfresh'].includes(b.toLowerCase()));
    return {
        programId: 6,
        programName: PROGRAM_NAMES[6],
        isEligible: income < 3000 || receivesValidBenefits,
        isMaybe: false,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateFERA(formData: Partial<ClientIntakeForm>, income: number): EligibilityResult {
    const householdSize = (formData.household?.members?.length || 0) + 1;
    return {
        programId: 7,
        programName: PROGRAM_NAMES[7],
        isEligible: householdSize >= 3 && income > 3000 && income < 4000,
        isMaybe: householdSize >= 3,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateVADisability(formData: Partial<ClientIntakeForm>, isVeteran: boolean): EligibilityResult {
    return {
        programId: 8,
        programName: PROGRAM_NAMES[8],
        isEligible: isVeteran,
        isMaybe: false,
        metConditions: isVeteran ? ["Veteran status"] : [],
        missingConditions: !isVeteran ? ["Veteran status"] : []
    };
}

function evaluateFSS(formData: Partial<ClientIntakeForm>, isHoused: boolean): EligibilityResult {
    return {
        programId: 9,
        programName: PROGRAM_NAMES[9],
        isEligible: isHoused,
        isMaybe: false,
        metConditions: isHoused ? ["Housed"] : [],
        missingConditions: !isHoused ? ["Housed"] : []
    };
}

function evaluateGA(formData: Partial<ClientIntakeForm>, income: number, age: number): EligibilityResult {
    const ageMatch = age >= 18 && age <= 64;
    const noDependents = (formData.household?.members?.length || 0) === 0;
    return {
        programId: 10,
        programName: PROGRAM_NAMES[10],
        isEligible: ageMatch && noDependents && income <= 150,
        isMaybe: ageMatch && noDependents,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateHUDVASH(formData: Partial<ClientIntakeForm>, isVeteran: boolean, isUnhoused: boolean, income: number): EligibilityResult {
    return {
        programId: 11,
        programName: PROGRAM_NAMES[11],
        isEligible: isVeteran && isUnhoused && income < 2500,
        isMaybe: isVeteran && isUnhoused,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateNoFeeID(formData: Partial<ClientIntakeForm>, isUnhoused: boolean, age: number): EligibilityResult {
    return {
        programId: 12,
        programName: PROGRAM_NAMES[12],
        isEligible: isUnhoused || age >= 62,
        isMaybe: false,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateReducedFeeID(formData: Partial<ClientIntakeForm>, isHoused: boolean, age: number, benefits: string[]): EligibilityResult {
    const receivesBenefits = benefits.length > 0;
    return {
        programId: 13,
        programName: PROGRAM_NAMES[13],
        isEligible: isHoused && age < 62 && receivesBenefits,
        isMaybe: isHoused && age < 62,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateIHSS(formData: Partial<ClientIntakeForm>, age: number, isDisabled: boolean, isHoused: boolean, healthStatus: string | undefined): EligibilityResult {
    const isBlind = healthStatus === 'blind';
    const ageMatch = age >= 65;
    return {
        programId: 14,
        programName: PROGRAM_NAMES[14],
        isEligible: (isDisabled || isBlind || ageMatch) && isHoused,
        isMaybe: false,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateLifeLine(formData: Partial<ClientIntakeForm>, income: number, benefits: string[]): EligibilityResult {
    const receivesBenefits = benefits.length > 0;
    return {
        programId: 15,
        programName: PROGRAM_NAMES[15],
        isEligible: income < 2500 || receivesBenefits,
        isMaybe: false,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateLIHEAP(formData: Partial<ClientIntakeForm>, isHoused: boolean, income: number): EligibilityResult {
    return {
        programId: 16,
        programName: PROGRAM_NAMES[16],
        isEligible: isHoused && income < 2800,
        isMaybe: isHoused,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateVTA(formData: Partial<ClientIntakeForm>, isDisabled: boolean): EligibilityResult {
    return {
        programId: 17,
        programName: PROGRAM_NAMES[17],
        isEligible: isDisabled,
        isMaybe: false,
        metConditions: isDisabled ? ["Disabled"] : [],
        missingConditions: !isDisabled ? ["Disabled"] : []
    };
}

function evaluateSection8(formData: Partial<ClientIntakeForm>, income: number, isUnhoused: boolean, age: number): EligibilityResult {
    return {
        programId: 18,
        programName: PROGRAM_NAMES[18],
        isEligible: income < 3500 && isUnhoused && age >= 18,
        isMaybe: isUnhoused && age >= 18,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateSSDI(formData: Partial<ClientIntakeForm>, isDisabled: boolean): EligibilityResult {
    return {
        programId: 19,
        programName: PROGRAM_NAMES[19],
        isEligible: isDisabled,
        isMaybe: false,
        metConditions: isDisabled ? ["Disabled"] : [],
        missingConditions: !isDisabled ? ["Disabled"] : []
    };
}

function evaluateSSI(formData: Partial<ClientIntakeForm>, isDisabled: boolean, income: number): EligibilityResult {
    return {
        programId: 20,
        programName: PROGRAM_NAMES[20],
        isEligible: isDisabled && income < 1000,
        isMaybe: isDisabled,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateVAPension(formData: Partial<ClientIntakeForm>, isVeteran: boolean, income: number, age: number, isDisabled: boolean): EligibilityResult {
    const ageOrDisabled = age >= 65 || isDisabled;
    return {
        programId: 21,
        programName: PROGRAM_NAMES[21],
        isEligible: isVeteran && income < 2000 && ageOrDisabled,
        isMaybe: isVeteran,
        metConditions: [],
        missingConditions: []
    };
}

function evaluateWIC(formData: Partial<ClientIntakeForm>, income: number, benefits: string[]): EligibilityResult {
    const receivesBenefits = benefits.some(b => ['medical', 'calfresh'].includes(b.toLowerCase()));
    const hasYoungChildren = formData.household?.members?.some(m => getAge(m.dateOfBirth) < 5);
    return {
        programId: 22,
        programName: PROGRAM_NAMES[22],
        isEligible: (income < 3000 || receivesBenefits) && hasYoungChildren,
        isMaybe: income < 3000 || receivesBenefits,
        metConditions: [],
        missingConditions: []
    };
}
