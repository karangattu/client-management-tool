"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import { US_STATES } from "@/lib/constants";
import { formatPhoneNumber, formatSSN, formatZipCode, calculateAge } from "@/lib/utils";
import { useCallback } from "react";
import type { ClientIntakeForm } from "@/lib/schemas/validation";

export function ParticipantDetailsSection() {
  const { watch, setValue } = useFormContext<ClientIntakeForm>();
  const dateOfBirth = watch("participantDetails.dateOfBirth");
  const age = dateOfBirth ? calculateAge(new Date(dateOfBirth)) : null;

  const handlePhoneChange = useCallback(
    (field: "participantDetails.primaryPhone" | "participantDetails.secondaryPhone") => {
      return (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setValue(field, formatted);
      };
    },
    [setValue]
  );

  const handleSSNChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatSSN(e.target.value);
      setValue("participantDetails.ssn", formatted);
    },
    [setValue]
  );

  const handleZipChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatZipCode(e.target.value);
      setValue("participantDetails.zipCode", formatted);
    },
    [setValue]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            1
          </span>
          Participant Details
        </CardTitle>
        <CardDescription>
          Basic identifying information about the client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            name="participantDetails.firstName"
            label="First Name"
            placeholder="Enter first name"
            required
          />
          <FormField
            name="participantDetails.middleName"
            label="Middle Name"
            placeholder="Enter middle name"
          />
          <FormField
            name="participantDetails.lastName"
            label="Last Name"
            placeholder="Enter last name"
            required
          />
        </div>

        {/* DOB and SSN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <FormField
              name="participantDetails.dateOfBirth"
              label="Date of Birth"
              type="date"
              required
            />
            {age !== null && age >= 0 && (
              <p className="text-sm text-muted-foreground">Age: {age} years</p>
            )}
          </div>
          <div className="md:col-span-2">
            <FormField
              name="participantDetails.ssn"
              label="Social Security Number"
              placeholder="XXX-XX-XXXX"
              tooltip="SSN is encrypted and stored securely. Only the last 4 digits will be visible after saving."
            />
            <input
              type="hidden"
              {...{ onChange: handleSSNChange }}
              className="hidden"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Contact Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              name="participantDetails.email"
              label="Email Address"
              type="email"
              placeholder="email@example.com"
              required
            />
            <div className="space-y-2">
              <FormField
                name="participantDetails.primaryPhone"
                label="Primary Phone"
                type="tel"
                placeholder="(555) 123-4567"
                required
              />
              <input
                type="hidden"
                {...{ onChange: handlePhoneChange("participantDetails.primaryPhone") }}
                className="hidden"
              />
            </div>
            <div className="space-y-2">
              <FormField
                name="participantDetails.secondaryPhone"
                label="Secondary Phone"
                type="tel"
                placeholder="(555) 123-4567"
              />
              <input
                type="hidden"
                {...{ onChange: handlePhoneChange("participantDetails.secondaryPhone") }}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Address Information
          </h4>


          <FormField
            name="participantDetails.streetAddress"
            label="Street Address"
            placeholder="123 Main Street, Apt 4B"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              name="participantDetails.city"
              label="City"
              placeholder="City"
              required
            />
            <FormField
              name="participantDetails.state"
              label="State"
              type="select"
              options={US_STATES}
              placeholder="Select state"
              required
            />
            <FormField
              name="participantDetails.county"
              label="County"
              placeholder="County"
            />
            <div className="space-y-2">
              <FormField
                name="participantDetails.zipCode"
                label="ZIP Code"
                placeholder="12345"
                required
              />
              <input
                type="hidden"
                {...{ onChange: handleZipChange }}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
