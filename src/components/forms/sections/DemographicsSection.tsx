"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import {
  RACE_OPTIONS,
  GENDER_OPTIONS,
  ETHNICITY_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  LANGUAGES,
  EDUCATION_LEVEL_OPTIONS,
} from "@/lib/constants";

export function DemographicsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            4
          </span>
          Participant Demographic Information
        </CardTitle>
        <CardDescription>
          Demographic details for reporting and services. All fields are optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Race Selection */}
        <FormField
          name="demographics.race"
          label="Race (Select all that apply)"
          type="multi-checkbox"
          options={RACE_OPTIONS}
        />

        {/* Gender, Ethnicity, Marital Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            name="demographics.genderIdentity"
            label="Gender Identity"
            type="select"
            options={GENDER_OPTIONS}
            placeholder="Select gender identity"
          />
          <FormField
            name="demographics.ethnicity"
            label="Ethnicity"
            type="select"
            options={ETHNICITY_OPTIONS}
            placeholder="Select ethnicity"
          />
          <FormField
            name="demographics.maritalStatus"
            label="Marital Status"
            type="select"
            options={MARITAL_STATUS_OPTIONS}
            placeholder="Select status"
          />
        </div>

        {/* Education Level */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="demographics.educationLevel"
            label="Education Level"
            type="select"
            options={EDUCATION_LEVEL_OPTIONS}
            placeholder="Select education level"
          />
        </div>

        {/* Status Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          <FormField
            name="demographics.veteranStatus"
            label="Veteran Status"
            type="checkbox"
            tooltip="Is the participant a veteran?"
          />
          <FormField
            name="demographics.disabilityStatus"
            label="Disability Status"
            type="checkbox"
            tooltip="Does the participant have a disability?"
          />
        </div>

        {/* Language */}
        <FormField
          name="demographics.language"
          label="Preferred Language"
          type="select"
          options={LANGUAGES}
          placeholder="Select preferred language"
          className="max-w-xs"
        />
      </CardContent>
    </Card>
  );
}

