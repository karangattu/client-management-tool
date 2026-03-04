"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { Plus, Trash2 } from "lucide-react";
import {
  APPLICATION_SOURCE_OPTIONS,
  defaultRecentApplication,
  type EmploymentSupportIntakeForm,
} from "@/lib/schemas/employment-support";

export function JobSearchSection() {
  const { control, watch } = useFormContext<EmploymentSupportIntakeForm>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "jobSearch.recentApplications",
  });

  const applicationSources = watch("jobSearch.applicationSources") || [];
  const hasInterviewRequests = watch("jobSearch.hasInterviewRequests");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            G
          </span>
          Job Search Activity
        </CardTitle>
        <CardDescription>
          Where you&apos;ve applied and current interview status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          name="jobSearch.applicationSources"
          label="Where have you applied? (check all that apply)"
          type="multi-checkbox"
          options={APPLICATION_SOURCE_OPTIONS}
        />

        {applicationSources.includes("other") && (
          <FormField
            name="jobSearch.applicationSourcesOther"
            label="Other application sources"
            placeholder="Please specify"
          />
        )}

        {/* Recent Applications */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Recent Applications</h4>
          {fields.map((field, index) => (
            <Card key={field.id} className="border bg-muted/30">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium">Application {index + 1}</h5>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name={`jobSearch.recentApplications.${index}.company`}
                    label="Company"
                    placeholder="Company name"
                  />
                  <FormField
                    name={`jobSearch.recentApplications.${index}.position`}
                    label="Position"
                    placeholder="Job title"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name={`jobSearch.recentApplications.${index}.dateApplied`}
                    label="Date Applied"
                    placeholder="e.g. Feb 2026"
                  />
                  <FormField
                    name={`jobSearch.recentApplications.${index}.outcome`}
                    label="Outcome"
                    placeholder="e.g. Pending, Interview, Rejected"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append(defaultRecentApplication)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Application
          </Button>
        </div>

        <FormField
          name="jobSearch.hasInterviewRequests"
          label="Have you received any interview requests?"
          type="checkbox"
        />

        {hasInterviewRequests && (
          <FormField
            name="jobSearch.interviewDetails"
            label="Interview details (company and position)"
            type="textarea"
            placeholder="List the company and position for each interview request"
          />
        )}
      </CardContent>
    </Card>
  );
}
