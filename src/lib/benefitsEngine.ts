
import { ClientIntakeForm } from "./schemas/validation";
import { evaluateEligibility, EligibilityResult } from "./eligibility";

/**
 * Calculates possible benefits based on client intake form data.
 * Now uses the new TypeScript eligibility engine.
 */
export function calculateBenefits(formData: Partial<ClientIntakeForm>): EligibilityResult[] {
    // Filter to only show eligible or potential matches as requested
    // The user mentioned: "Just show the benefits they are eligible for instead of crowding with all eligibility"
    // We will show isEligible = true, and maybe isMaybe = true but collapsed in UI
    return evaluateEligibility(formData).filter(r => r.isEligible || r.isMaybe);
}

export type { EligibilityResult };
