"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import { READINESS_STATUS_OPTIONS } from "@/lib/schemas/employment-support";

interface InternalUseSectionProps {
  staffOptions: { value: string; label: string }[];
}

export function InternalUseSection({ staffOptions }: InternalUseSectionProps) {
  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-white text-sm">
            ★
          </span>
          Internal Use Only
        </CardTitle>
        <CardDescription className="text-orange-700">
          This section is only visible to staff and case managers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          name="internalUse.readinessStatus"
          label="Employment Readiness Status"
          type="select"
          options={READINESS_STATUS_OPTIONS}
          placeholder="Select readiness status"
        />

        <FormField
          name="internalUse.assignedStaffId"
          label="Assigned Staff / Volunteer"
          type="select"
          options={staffOptions}
          placeholder="Select staff member"
        />

        <FormField
          name="internalUse.nextFollowupDate"
          label="Next Follow-up Date"
          type="date"
        />
      </CardContent>
    </Card>
  );
}
