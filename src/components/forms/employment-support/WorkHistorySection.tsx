"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { Plus, Trash2 } from "lucide-react";
import {
  WORK_EXPERIENCE_TYPE_OPTIONS,
  defaultWorkHistoryEntry,
  type EmploymentSupportIntakeForm,
} from "@/lib/schemas/employment-support";

export function WorkHistorySection() {
  const { control } = useFormContext<EmploymentSupportIntakeForm>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "workExperience.workHistory",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            D
          </span>
          Past Work Experience
        </CardTitle>
        <CardDescription>
          Your most recent jobs (up to 3) and overall work history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dynamic Work History Entries */}
        {fields.map((field, index) => (
          <Card key={field.id} className="border bg-muted/30">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Job {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name={`workExperience.workHistory.${index}.employer`}
                  label="Employer"
                  placeholder="Company name"
                />
                <FormField
                  name={`workExperience.workHistory.${index}.jobTitle`}
                  label="Job Title"
                  placeholder="Your role"
                />
              </div>
              <FormField
                name={`workExperience.workHistory.${index}.dates`}
                label="Approximate Dates"
                placeholder="e.g. Jan 2023 - Dec 2024"
              />
              <FormField
                name={`workExperience.workHistory.${index}.duties`}
                label="Main Duties"
                type="textarea"
                placeholder="Describe your main responsibilities"
              />
            </CardContent>
          </Card>
        ))}

        {fields.length < 3 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => append(defaultWorkHistoryEntry)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Another Job
          </Button>
        )}

        <FormField
          name="workExperience.workExperienceType"
          label="How would you describe your overall work experience?"
          type="select"
          options={WORK_EXPERIENCE_TYPE_OPTIONS}
          placeholder="Select experience type"
        />

        <FormField
          name="workExperience.hasEmploymentGaps"
          label="Are there gaps in your employment history you would like help explaining?"
          type="checkbox"
        />
      </CardContent>
    </Card>
  );
}
