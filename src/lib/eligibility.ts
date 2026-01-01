import { ClientIntakeForm } from "./schemas/validation";

export interface EligibilityResult {
    programId: number;
    programName: string;
    isEligible: boolean;
    isMaybe: boolean;
    metConditions: string[];
    missingConditions: string[];
    eligibilityReason: string;
    nextSteps?: string[];
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

function evaluateFSS(formData: Partial<ClientIntakeForm>, isHoused: boolean): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isHoused) {
        met.push("Currently housed");
        reason = "You may be eligible for FSS if you're participating in a housing assistance program. FSS helps families build savings and increase self-sufficiency.";
        nextSteps.push("Contact your housing authority or case manager about FSS enrollment");
        nextSteps.push("Provide proof of participation in housing assistance");
    } else {
        reason = "FSS typically requires participation in a housing assistance program and commitment to self-sufficiency goals.";
        missing.push("Participation in housing assistance");
        nextSteps.push("Check eligibility with your housing authority");
    }

    return {
        programId: 9,
        programName: PROGRAM_NAMES[9],
        isEligible: isHoused,
        isMaybe: isHoused,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateUPLIFT(formData: Partial<ClientIntakeForm>, isUnhoused: boolean, isAtRisk: boolean): EligibilityResult {
    const metConditions: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isUnhoused) {
        metConditions.push("Experiencing homelessness");
        reason = "You may be eligible for UPLIFT because you're experiencing homelessness. This program provides transportation assistance to help you access essential services.";
        nextSteps.push("Contact your local UPLIFT coordinator");
        nextSteps.push("Bring proof of homelessness status");
    } else if (isAtRisk) {
        metConditions.push("At risk of homelessness");
        reason = "You may be eligible for UPLIFT because you're at risk of homelessness. This program provides transportation assistance to help you maintain housing stability.";
        nextSteps.push("Contact your local UPLIFT coordinator");
        nextSteps.push("Provide documentation of housing situation");
    } else {
        reason = "UPLIFT requires that you are experiencing homelessness or at risk of homelessness to qualify for transportation assistance.";
        missing.push("Housing status (unhoused or at risk)");
        nextSteps.push("Update your housing status in the case management section");
    }

    return {
        programId: 1,
        programName: PROGRAM_NAMES[1],
        isEligible: (isUnhoused || isAtRisk),
        isMaybe: false,
        metConditions,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateADSA(formData: Partial<ClientIntakeForm>, isDisabled: boolean, healthStatus: string | undefined, benefits: string[]): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    const isBlindOrDeaf = healthStatus === 'blind' || healthStatus === 'deaf';
    const hasDisability = isDisabled || isBlindOrDeaf;
    const receivesCoreBenefits = benefits.some(b => ['ssi', 'ssdi', 'ihss', 'capi'].includes(b.toLowerCase()));

    if (hasDisability) {
        met.push("Has qualifying disability");
        reason = "You may be eligible for ADSA because you have a qualifying disability. This program provides $1,000 annually to help cover the costs of your service dog.";
        
        if (receivesCoreBenefits) {
            met.push("Receives qualifying benefits");
            reason += " Additionally, you already receive benefits like SSI, SSDA, IHSS, or CAPI, which confirms your eligibility.";
            nextSteps.push("Contact ADSA program coordinator");
            nextSteps.push("Provide disability verification");
            nextSteps.push("Show proof of service dog or application");
        } else {
            missing.push("Receiving SSI, SSDA, IHSS, or CAPI");
            nextSteps.push("Apply for core disability benefits if not already receiving them");
        }
    } else {
        reason = "ADSA requires a qualifying disability (blindness, deafness, or other disability) and receipt of core benefits like SSI, SSDI, IHSS, or CAPI.";
        missing.push("Qualifying disability status");
        missing.push("Receiving core benefits");
        nextSteps.push("Complete disability assessment with your doctor");
        nextSteps.push("Apply for SSI, SSDI, or other core benefits if eligible");
    }

    return {
        programId: 2,
        programName: PROGRAM_NAMES[2],
        isEligible: hasDisability && receivesCoreBenefits,
        isMaybe: hasDisability || receivesCoreBenefits,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateCalFresh(formData: Partial<ClientIntakeForm>, income: number, age: number, isDisabled: boolean): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    const incomeLimit = 2500;
    
    if (income < incomeLimit) {
        met.push(`Income below $${incomeLimit}/month`);
        reason = `You may be eligible for CalFresh because your monthly income of $${income} is below the program limit. CalFresh provides monthly benefits for groceries.`;
        
        if (age >= 60) {
            met.push("Age 60 or older");
            reason += " As a senior, you may qualify for additional benefits and simplified application process.";
            nextSteps.push("Apply online at GetCalFresh.org");
            nextSteps.push("Bring income verification and ID");
        } else if (isDisabled) {
            met.push("Has qualifying disability");
            reason += " As a person with a disability, you may qualify for expedited processing and additional support.";
            nextSteps.push("Apply online at GetCalFresh.org");
            nextSteps.push("Provide disability documentation if requested");
        } else {
            nextSteps.push("Apply online at GetCalFresh.org");
            nextSteps.push("Bring income verification and ID");
        }
    } else {
        reason = `CalFresh income limit is $${incomeLimit}/month for most households. Your current income may exceed this limit.`;
        missing.push(`Income below $${incomeLimit}/month`);
        nextSteps.push("Report any recent changes in income");
        nextSteps.push("Consider applying if income changes or household size increases");
    }

    return {
        programId: 3,
        programName: PROGRAM_NAMES[3],
        isEligible: income < incomeLimit,
        isMaybe: false,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateCalWORKs(formData: Partial<ClientIntakeForm>, income: number): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    const hasChildren = (formData.household?.members?.length || 0) > 0;
    
    if (hasChildren) {
        met.push("Has children in household");
        reason = "You may be eligible for CalWORKs because you have children in your household. CalWORKs provides cash assistance and job training.";
        
        if (income < 3000) {
            met.push("Income within program limits");
            reason += " Your household income appears to be within CalWORKs limits.";
            nextSteps.push("Apply at your county welfare office");
            nextSteps.push("Bring proof of income and children's birth certificates");
        } else {
            missing.push("Income below $3,000/month");
            nextSteps.push("Report any changes in household income");
        }
    } else {
        reason = "CalWORKs is a family assistance program that requires children in the household.";
        missing.push("Children in household");
        nextSteps.push("Add household members if you have children");
    }

    return {
        programId: 4,
        programName: PROGRAM_NAMES[4],
        isEligible: hasChildren && income < 3000,
        isMaybe: hasChildren,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateCAPI(formData: Partial<ClientIntakeForm>, income: number, age: number, isDisabled: boolean): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    const isSenior = age >= 65;
    
    if (isSenior || isDisabled) {
        met.push(isSenior ? "Age 65 or older" : "Has qualifying disability");
        reason = `You may be eligible for CAPI because you are ${isSenior ? '65 or older' : 'disabled'} and a California resident. CAPI provides cash assistance for immigrants who are not eligible for federal SSI.`;
        
        if (income < 2000) {
            met.push("Income within limits");
            reason += " Your income appears to be within CAPI limits.";
            nextSteps.push("Apply at your county welfare office");
            nextSteps.push("Bring immigration documents and income verification");
        } else {
            missing.push("Income below $2,000/month");
            nextSteps.push("Report any changes in income");
        }
    } else {
        reason = "CAPI is designed for immigrants who are 65 or older, blind, or disabled.";
        missing.push("Age 65+ or qualifying disability");
        nextSteps.push("Complete age or disability verification");
    }

    return {
        programId: 5,
        programName: PROGRAM_NAMES[5],
        isEligible: (isSenior || isDisabled) && income < 2000,
        isMaybe: isSenior || isDisabled,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateCARE(formData: Partial<ClientIntakeForm>, income: number, benefits: string[]): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    const receivesValidBenefits = benefits.some(b => ['liheap', 'wic', 'calfresh'].includes(b.toLowerCase()));
    
    if (income < 3000 || receivesValidBenefits) {
        if (income < 3000) met.push("Income within limits");
        if (receivesValidBenefits) met.push("Receives qualifying benefits");
        
        reason = "You may be eligible for CARE because it provides discounted electric rates for qualifying low-income households. This can significantly reduce your monthly utility bills.";
        nextSteps.push("Contact your electric utility company");
        nextSteps.push("Provide income verification or benefit documentation");
    } else {
        reason = "CARE requires income below $3,000/month or participation in programs like LIHEAP, WIC, or CalFresh.";
        missing.push("Income below $3,000/month or qualifying benefits");
        nextSteps.push("Apply for qualifying benefits if eligible");
    }

    return {
        programId: 6,
        programName: PROGRAM_NAMES[6],
        isEligible: income < 3000 || receivesValidBenefits,
        isMaybe: false,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateFERA(formData: Partial<ClientIntakeForm>, income: number): EligibilityResult {
    const householdSize = (formData.household?.members?.length || 0) + 1;
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (householdSize >= 3) {
        met.push("Household of 3 or more");
        reason = `You may be eligible for FERA because your household has ${householdSize} members. FERA provides reduced electric rates for families with 3 or more members who don't qualify for CARE.`;
        
        if (income > 3000 && income < 4000) {
            met.push("Income in FERA range");
            nextSteps.push("Contact your electric utility company");
            nextSteps.push("Provide household size and income verification");
        } else {
            missing.push("Income between $3,000-$4,000/month");
            nextSteps.push("Verify current household income");
        }
    } else {
        reason = "FERA is specifically for households with 3 or more members who don't qualify for CARE.";
        missing.push("Household of 3 or more members");
        nextSteps.push("Add all household members to your profile");
    }

    return {
        programId: 7,
        programName: PROGRAM_NAMES[7],
        isEligible: householdSize >= 3 && income > 3000 && income < 4000,
        isMaybe: householdSize >= 3,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateVADisability(formData: Partial<ClientIntakeForm>, isVeteran: boolean): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isVeteran) {
        met.push("Veteran status");
        reason = "You may be eligible for VA Disability Compensation because of your military service. This benefit provides tax-free payments for service-connected disabilities.";
        nextSteps.push("File a disability claim with the VA");
        nextSteps.push("Gather military medical records");
        nextSteps.push("Schedule a VA medical exam if required");
    } else {
        reason = "VA Disability Compensation requires military service and a service-connected disability.";
        missing.push("Veteran status");
        nextSteps.push("Confirm veteran status and any service-connected disability");
        nextSteps.push("Gather DD-214 or military separation documents");
        nextSteps.push("Contact a Veterans Service Organization (VSO) for help filing a claim");
    }

    return {
        programId: 8,
        programName: PROGRAM_NAMES[8],
        isEligible: isVeteran,
        isMaybe: isVeteran,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateGA(formData: Partial<ClientIntakeForm>, income: number, age: number): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (age >= 18 && income < 1000) {
        met.push("Low income adult");
        reason = "You may be eligible for General Assistance if you are a low-income adult without other resources. GA provides temporary cash assistance.";
        nextSteps.push("Contact your county general assistance office");
        nextSteps.push("Provide income verification and ID");
    } else {
        reason = "General Assistance is typically for low-income adults who do not have access to other cash benefits.";
        missing.push("Low income or adult status");
        nextSteps.push("Check eligibility with your county welfare office");
    }

    return {
        programId: 10,
        programName: PROGRAM_NAMES[10],
        isEligible: age >= 18 && income < 1000,
        isMaybe: income < 1500 && age >= 18,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateHUDVASH(formData: Partial<ClientIntakeForm>, isVeteran: boolean, isUnhoused: boolean, income: number): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isVeteran && isUnhoused) {
        met.push("Veteran and currently unhoused");
        reason = "HUD-VASH provides housing vouchers for veterans experiencing homelessness. You may be eligible if you are a veteran and currently unhoused.";
        nextSteps.push("Contact the VA or local housing authority about HUD-VASH referrals");
    } else {
        reason = "HUD-VASH is targeted to veterans who are experiencing homelessness.";
        if (!isVeteran) missing.push("Veteran status");
        if (!isUnhoused) missing.push("Currently unhoused");
        nextSteps.push("Check with the VA or local housing authority for eligibility and referrals");
    }

    return {
        programId: 11,
        programName: PROGRAM_NAMES[11],
        isEligible: isVeteran && isUnhoused,
        isMaybe: isVeteran || isUnhoused,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateNoFeeID(formData: Partial<ClientIntakeForm>, isUnhoused: boolean, age: number): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isUnhoused || age >= 65) {
        if (isUnhoused) met.push("Unhoused");
        if (age >= 65) met.push("Senior (65+)");
        reason = "You may qualify for a no-fee ID card if you are experiencing homelessness or a senior. This can help with accessing services.";
        nextSteps.push("Contact your local DMV or shelter case manager about no-fee ID options");
    } else {
        reason = "No-fee ID cards are often available for unhoused individuals and older adults.";
        missing.push("Unhoused or senior status");
        nextSteps.push("Check with local DMV or case management for ID support");
    }

    return {
        programId: 12,
        programName: PROGRAM_NAMES[12],
        isEligible: isUnhoused || age >= 65,
        isMaybe: isUnhoused || age >= 60,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateReducedFeeID(formData: Partial<ClientIntakeForm>, isHoused: boolean, age: number, benefits: string[]): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    const receivesBenefits = benefits.length > 0;

    if (isHoused && (age >= 60 || receivesBenefits)) {
        if (age >= 60) met.push("Senior (60+)");
        if (receivesBenefits) met.push("Receives qualifying benefits");
        reason = "You may qualify for a reduced-fee ID card if you are a senior or receive qualifying benefits.";
        nextSteps.push("Apply for reduced-fee ID at the local DMV or community partner");
    } else {
        reason = "Reduced-fee ID eligibility is typically based on age or participation in qualifying benefit programs.";
        missing.push("Senior or qualifying benefits");
        nextSteps.push("Check with DMV or local case manager for reduced-fee ID eligibility");
    }

    return {
        programId: 13,
        programName: PROGRAM_NAMES[13],
        isEligible: isHoused && (age >= 60 || receivesBenefits),
        isMaybe: isHoused && (age >= 55 || receivesBenefits),
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateIHSS(formData: Partial<ClientIntakeForm>, age: number, isDisabled: boolean, isHoused: boolean, healthStatus: string | undefined): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (age >= 65 || isDisabled) {
        if (age >= 65) met.push("Age 65 or older");
        if (isDisabled) met.push("Has qualifying disability");
        reason = "IHSS provides in-home supportive services for those who are elderly or disabled and need help with daily activities.";
        nextSteps.push("Contact the county IHSS office to request an assessment");
    } else {
        reason = "IHSS is available to people who are aged, blind, or disabled and need in-home support.";
        missing.push("Age 65+ or qualifying disability");
        nextSteps.push("Discuss needs with your case manager or county IHSS office");
    }

    return {
        programId: 14,
        programName: PROGRAM_NAMES[14],
        isEligible: age >= 65 || isDisabled,
        isMaybe: age >= 60 || isDisabled,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateLifeLine(formData: Partial<ClientIntakeForm>, income: number, benefits: string[]): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    const receivesQualifyingBenefits = benefits.length > 0;

    if (income < 2500 || receivesQualifyingBenefits) {
        if (income < 2500) met.push("Income within limits");
        if (receivesQualifyingBenefits) met.push("Receives qualifying benefits");
        reason = "LifeLine phone service provides discounted phone service for low-income households or those receiving qualifying benefits.";
        nextSteps.push("Apply for LifeLine through the official LifeLine website or your phone provider");
    } else {
        reason = "LifeLine eligibility is based on income or participation in qualifying benefit programs.";
        missing.push("Income below program limits or qualifying benefits");
        nextSteps.push("Check the LifeLine eligibility page for details");
    }

    return {
        programId: 15,
        programName: PROGRAM_NAMES[15],
        isEligible: income < 2500 || receivesQualifyingBenefits,
        isMaybe: income < 3000 || receivesQualifyingBenefits,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateLIHEAP(formData: Partial<ClientIntakeForm>, isHoused: boolean, income: number): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (income < 4000) {
        met.push("Income within LIHEAP limits");
        reason = "LIHEAP helps with home energy costs for low-income households.";
        nextSteps.push("Contact your local energy assistance provider to apply for LIHEAP");
    } else {
        reason = "LIHEAP is for low-income households needing energy assistance.";
        missing.push("Income within program limits");
        nextSteps.push("Review local LIHEAP eligibility and apply if income changes");
    }

    return {
        programId: 16,
        programName: PROGRAM_NAMES[16],
        isEligible: income < 4000,
        isMaybe: income < 4500,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateVTA(formData: Partial<ClientIntakeForm>, isDisabled: boolean): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isDisabled) {
        met.push("Has qualifying disability");
        reason = "You may be eligible for VTA Paratransit services if you have a qualifying disability that limits your ability to use regular transit.";
        nextSteps.push("Contact VTA to apply for paratransit eligibility");
    } else {
        reason = "VTA Paratransit is for individuals with disabilities that prevent them from using fixed-route transit.";
        missing.push("Qualifying disability");
        nextSteps.push("Request an eligibility assessment from VTA");
    }

    return {
        programId: 17,
        programName: PROGRAM_NAMES[17],
        isEligible: isDisabled,
        isMaybe: isDisabled,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateSection8(formData: Partial<ClientIntakeForm>, income: number, isUnhoused: boolean, age: number): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isUnhoused || income < 2000) {
        if (isUnhoused) met.push("Currently unhoused");
        if (income < 2000) met.push("Income within preference range");
        reason = "You may be eligible for Section 8 housing assistance if you are experiencing homelessness or have low income.";
        nextSteps.push("Add your name to the local Section 8 interest list or contact housing authority");
    } else {
        reason = "Section 8 priority is often given to households with low income or those who are homeless.";
        missing.push("Low income or currently unhoused");
        nextSteps.push("Check your local housing authority's waitlist and eligibility rules");
    }

    return {
        programId: 18,
        programName: PROGRAM_NAMES[18],
        isEligible: isUnhoused || income < 2000,
        isMaybe: income < 2500 || isUnhoused,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateSSDI(formData: Partial<ClientIntakeForm>, isDisabled: boolean): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isDisabled) {
        met.push("Has qualifying disability");
        reason = "You may be eligible for SSDI if you have a qualifying disability and sufficient work history.";
        nextSteps.push("Consult SSA guidance and gather medical/work records for SSDI application");
    } else {
        reason = "SSDI requires a qualifying disability and minimum work credits.";
        missing.push("Qualifying disability");
        nextSteps.push("Discuss disability assessment with your doctor");
    }

    return {
        programId: 19,
        programName: PROGRAM_NAMES[19],
        isEligible: isDisabled,
        isMaybe: isDisabled,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateSSI(formData: Partial<ClientIntakeForm>, isDisabled: boolean, income: number): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isDisabled && income < 900) {
        met.push("Has qualifying disability");
        reason = "SSI provides financial assistance to disabled individuals with limited income and resources.";
        nextSteps.push("Apply for SSI and provide disability and income documentation");
    } else {
        reason = "SSI requires qualifying disability and low income/resources.";
        missing.push("Qualifying disability or low income");
        nextSteps.push("Check SSI eligibility criteria and appeal if eligible");
    }

    return {
        programId: 20,
        programName: PROGRAM_NAMES[20],
        isEligible: isDisabled && income < 900,
        isMaybe: isDisabled || income < 1200,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateVAPension(formData: Partial<ClientIntakeForm>, isVeteran: boolean, income: number, age: number, isDisabled: boolean): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (isVeteran && age >= 65 && income < 2000) {
        met.push("Veteran and senior with low income");
        reason = "VA Pension provides needs-based benefits to low-income wartime veterans who are age 65+ or disabled.";
        nextSteps.push("Contact VA or a VSO for VA Pension eligibility and application assistance");
    } else {
        reason = "VA Pension requires wartime veteran status, age or disability, and limited income.";
        if (!isVeteran) missing.push("Veteran status");
        if (age < 65 && !isDisabled) missing.push("Age 65+ or qualifying disability");
        nextSteps.push("Review VA Pension criteria and contact VA for assistance");
    }

    return {
        programId: 21,
        programName: PROGRAM_NAMES[21],
        isEligible: isVeteran && (age >= 65 || isDisabled) && income < 2000,
        isMaybe: isVeteran && (age >= 60 || isDisabled),
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}

function evaluateWIC(formData: Partial<ClientIntakeForm>, income: number, benefits: string[]): EligibilityResult {
    const met: string[] = [];
    const missing: string[] = [];
    let reason = "";
    const nextSteps: string[] = [];

    if (income < 2500 || benefits.some(b => ['pregnant', 'breastfeeding', 'postpartum', 'children'].includes(b.toLowerCase()))) {
        if (income < 2500) met.push("Income within WIC limits");
        reason = "WIC supports pregnant women, new mothers, and young children with supplemental nutritious foods and nutrition education.";
        nextSteps.push("Contact your local WIC office to apply and confirm eligibility");
    } else {
        reason = "WIC eligibility is based on income and nutritional risk for women, infants, and children.";
        missing.push("Income within program limits or qualifying status");
        nextSteps.push("Check local WIC eligibility and application process");
    }

    return {
        programId: 22,
        programName: PROGRAM_NAMES[22],
        isEligible: income < 2500,
        isMaybe: income < 3000,
        metConditions: met,
        missingConditions: missing,
        eligibilityReason: reason,
        nextSteps
    };
}