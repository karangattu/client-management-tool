"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import { CHECKIN_FREQUENCY_OPTIONS } from "@/lib/schemas/employment-support";

export function CommitmentSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            I
          </span>
          Commitment &amp; Follow-Up
        </CardTitle>
        <CardDescription>
          Your commitment to the employment support program
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          name="commitment.commitsToMeetings"
          label="Do you commit to meeting regularly with a UEO volunteer or staff member?"
          type="checkbox"
        />

        <FormField
          name="commitment.checkinFrequency"
          label="Preferred check-in frequency"
          type="select"
          options={CHECKIN_FREQUENCY_OPTIONS}
          placeholder="Select frequency"
        />

        <FormField
          name="commitment.additionalNotes"
          label="Is there anything else you would like us to know to better support your employment goals?"
          type="textarea"
          placeholder="Any additional information..."
        />
      </CardContent>
    </Card>
  );
}
