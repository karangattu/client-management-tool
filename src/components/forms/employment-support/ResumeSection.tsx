"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import {
  RESUME_STATUS_OPTIONS,
  RESUME_UPDATED_OPTIONS,
  type EmploymentSupportIntakeForm,
} from "@/lib/schemas/employment-support";

export function ResumeSection() {
  const { watch } = useFormContext<EmploymentSupportIntakeForm>();
  const resumeStatus = watch("resume.resumeStatus");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            F
          </span>
          Resume and Cover Letter
        </CardTitle>
        <CardDescription>
          Current status of your resume and cover letter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          name="resume.resumeStatus"
          label="Do you currently have a resume?"
          type="select"
          options={RESUME_STATUS_OPTIONS}
          placeholder="Select status"
        />

        {(resumeStatus === "ready" || resumeStatus === "needs_updating") && (
          <FormField
            name="resume.resumeLastUpdated"
            label="When was your resume last updated?"
            type="select"
            options={RESUME_UPDATED_OPTIONS}
            placeholder="Select timeframe"
          />
        )}

        <FormField
          name="resume.hasCoverLetter"
          label="Do you have a cover letter template?"
          type="checkbox"
        />
      </CardContent>
    </Card>
  );
}
