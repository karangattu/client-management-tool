"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import {
  CONTACT_METHOD_OPTIONS,
  AVAILABLE_DOCUMENT_OPTIONS,
} from "@/lib/schemas/employment-support";

export function BasicInfoSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            A
          </span>
          Basic Information
        </CardTitle>
        <CardDescription>
          Contact preferences and available documentation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="basicInfo.preferredContactMethod"
            label="Preferred Method of Contact"
            type="select"
            options={CONTACT_METHOD_OPTIONS}
            placeholder="Select contact method"
          />
          <FormField
            name="basicInfo.bestContactTime"
            label="Best Time to Contact"
            placeholder="e.g. Mornings, After 5pm"
          />
        </div>

        <FormField
          name="basicInfo.availableDocuments"
          label="Do you have access to the following documents?"
          type="multi-checkbox"
          options={AVAILABLE_DOCUMENT_OPTIONS}
        />
      </CardContent>
    </Card>
  );
}
