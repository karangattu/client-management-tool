"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import {
    EMPLOYMENT_STATUS_OPTIONS,
    INCOME_SOURCES,
} from "@/lib/constants";

export function FinancialSection() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                        4
                    </span>
                    Financial Information
                </CardTitle>
                <CardDescription>
                    Information about employment and income to help determine eligibility for services.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        name="demographics.employmentStatus"
                        label="Employment Status"
                        type="select"
                        options={EMPLOYMENT_STATUS_OPTIONS}
                        placeholder="Select status"
                    />

                    <FormField
                        name="demographics.monthlyIncome"
                        label="Total Monthly Household Income"
                        type="text"
                        placeholder="$0.00"
                        tooltip="Total gross income from all sources before taxes"
                    />
                </div>

                <FormField
                    name="demographics.incomeSource"
                    label="Primary Source of Income"
                    type="select"
                    options={INCOME_SOURCES}
                    placeholder="Select source"
                />
            </CardContent>
        </Card>
    );
}
