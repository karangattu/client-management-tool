"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import {
    HEALTH_INSURANCE_TYPES,
    BENEFITS_OPTIONS,
    HEALTH_STATUS_OPTIONS,
} from "@/lib/constants";

export function BenefitsHealthSection() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                        4
                    </span>
                    Benefits & Health
                </CardTitle>
                <CardDescription>
                    Current benefits and health status information.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <FormField
                        name="caseManagement.healthInsurance"
                        label="Do you currently have health insurance?"
                        type="select"
                        options={[
                            { value: "yes", label: "Yes" },
                            { value: "no", label: "No" },
                        ]}
                        placeholder="Select answer"
                    />

                    <FormField
                        name="caseManagement.healthInsuranceType"
                        label="Type of Health Insurance"
                        type="select"
                        options={HEALTH_INSURANCE_TYPES}
                        placeholder="Select type"
                        className="max-w-md"
                    />
                </div>

                <FormField
                    name="caseManagement.nonCashBenefits"
                    label="Non-Cash Benefits (Select all that apply)"
                    type="multi-checkbox"
                    options={BENEFITS_OPTIONS}
                />

                <FormField
                    name="caseManagement.healthStatus"
                    label="How would you describe your general health?"
                    type="select"
                    options={HEALTH_STATUS_OPTIONS}
                    placeholder="Select status"
                    className="max-w-md"
                />
            </CardContent>
        </Card>
    );
}
