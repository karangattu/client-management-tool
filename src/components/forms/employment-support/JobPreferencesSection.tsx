"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import {
  JOB_INTEREST_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  TRANSPORTATION_OPTIONS,
  type EmploymentSupportIntakeForm,
} from "@/lib/schemas/employment-support";

export function JobPreferencesSection() {
  const { watch } = useFormContext<EmploymentSupportIntakeForm>();
  const jobInterests = watch("jobPreferences.jobInterests") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            E
          </span>
          Job Preferences &amp; Compensation
        </CardTitle>
        <CardDescription>
          Types of work you&apos;re interested in and availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          name="jobPreferences.jobInterests"
          label="What type of jobs are you interested in? (check all that apply)"
          type="multi-checkbox"
          options={JOB_INTEREST_OPTIONS}
        />

        {jobInterests.includes("other") && (
          <FormField
            name="jobPreferences.jobInterestsOther"
            label="Other job interests"
            placeholder="Please specify"
          />
        )}

        <FormField
          name="jobPreferences.minimumHourlyPay"
          label="What is the minimum hourly pay you would accept?"
          type="number"
          placeholder="e.g. 18.00"
          min={0}
        />

        <FormField
          name="jobPreferences.employmentTypes"
          label="What type of employment are you open to? (check all that apply)"
          type="multi-checkbox"
          options={EMPLOYMENT_TYPE_OPTIONS}
        />

        <FormField
          name="jobPreferences.workAvailability"
          label="What days and hours are you available to work?"
          type="textarea"
          placeholder="e.g. Monday-Friday 8am-5pm, weekends available"
        />

        <FormField
          name="jobPreferences.transportationMethods"
          label="What type of transportation will you use to commute to work?"
          type="multi-checkbox"
          options={TRANSPORTATION_OPTIONS}
        />
      </CardContent>
    </Card>
  );
}
