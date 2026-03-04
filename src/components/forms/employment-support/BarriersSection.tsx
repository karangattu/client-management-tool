"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import {
  BARRIER_OPTIONS,
  SUPPORT_NEED_OPTIONS,
  type EmploymentSupportIntakeForm,
} from "@/lib/schemas/employment-support";

export function BarriersSection() {
  const { watch } = useFormContext<EmploymentSupportIntakeForm>();
  const barriers = watch("barriers.barriers") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            H
          </span>
          Barriers &amp; Support Needs
        </CardTitle>
        <CardDescription>
          Challenges that may affect your job search and the support you need
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          name="barriers.barriers"
          label="Are there any barriers that might affect your job search or employment? (check all that apply)"
          type="multi-checkbox"
          options={BARRIER_OPTIONS}
        />

        {barriers.includes("other") && (
          <FormField
            name="barriers.barriersOther"
            label="Other barriers"
            type="textarea"
            placeholder="Please describe"
          />
        )}

        <FormField
          name="barriers.supportNeeds"
          label="What type of employment support would you like from UEO? (check all that apply)"
          type="multi-checkbox"
          options={SUPPORT_NEED_OPTIONS}
        />
      </CardContent>
    </Card>
  );
}
