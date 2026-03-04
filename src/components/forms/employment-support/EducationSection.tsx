"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import {
  EDUCATION_LEVEL_OPTIONS,
  type EmploymentSupportIntakeForm,
} from "@/lib/schemas/employment-support";

export function EducationSection() {
  const { watch } = useFormContext<EmploymentSupportIntakeForm>();
  const educationLevel = watch("education.educationLevel");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            B
          </span>
          Education, Training &amp; Credentials
        </CardTitle>
        <CardDescription>
          Educational background and professional certifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          name="education.educationLevel"
          label="Highest level of education completed"
          type="select"
          options={EDUCATION_LEVEL_OPTIONS}
          placeholder="Select education level"
        />

        <FormField
          name="education.fieldOfStudy"
          label="Field of study (if applicable)"
          placeholder="e.g. Business Administration, Nursing"
        />

        <FormField
          name="education.certifications"
          label="Certifications or licenses held (if any)"
          type="textarea"
          placeholder="List any professional certifications or licenses"
        />

        {educationLevel === "less_than_high_school" && (
          <FormField
            name="education.wantsGedSupport"
            label="Would you like support in attaining your GED?"
            type="checkbox"
          />
        )}
      </CardContent>
    </Card>
  );
}
