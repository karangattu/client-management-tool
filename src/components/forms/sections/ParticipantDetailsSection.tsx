"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import { Checkbox } from "@/components/ui/checkbox";
import { US_STATES, REFERRAL_SOURCE_OPTIONS } from "@/lib/constants";
import { formatPhoneNumber, formatSSN, formatZipCode, calculateAge } from "@/lib/utils";
import { useCallback, useEffect } from "react";
import { Home } from "lucide-react";
import type { ClientIntakeForm } from "@/lib/schemas/validation";

export function ParticipantDetailsSection() {
  const { watch, setValue } = useFormContext<ClientIntakeForm>();
  const dateOfBirth = watch("participantDetails.dateOfBirth");
  const referralSource = watch("participantDetails.referralSource");
  const noFixedAddress = watch("participantDetails.noFixedAddress");
  const housingStatus = watch("caseManagement.housingStatus");
  const age = dateOfBirth ? calculateAge(new Date(dateOfBirth)) : null;

  const NO_FIXED_ADDRESS_STATUSES = ['homeless', 'shelter', 'couch_surfing'];
  const isHomeless = noFixedAddress === true || NO_FIXED_ADDRESS_STATUSES.includes(housingStatus ?? '');

  // If housing status changes to a no-fixed-address status, auto-tick the checkbox
  useEffect(() => {
    if (NO_FIXED_ADDRESS_STATUSES.includes(housingStatus ?? '') && !noFixedAddress) {
      setValue("participantDetails.noFixedAddress", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [housingStatus]);

  // When address is cleared due to homeless toggle, wipe fields
  useEffect(() => {
    if (noFixedAddress) {
      setValue("participantDetails.streetAddress", "");
      setValue("participantDetails.city", "");
      setValue("participantDetails.state", "");
      setValue("participantDetails.zipCode", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noFixedAddress]);

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
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Address Information
            </h4>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                id="noFixedAddress"
                checked={noFixedAddress ?? false}
                onCheckedChange={(checked) =>
                  setValue("participantDetails.noFixedAddress", checked as boolean, { shouldValidate: true })
                }
              />
              <span className="text-sm font-medium text-orange-700 flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                No fixed address / Experiencing homelessness
              </span>
            </label>
          </div>

          {isHomeless ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 flex items-start gap-2">
              <Home className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">No permanent address on file</p>
                <p className="text-orange-700 mt-0.5">
                  You can optionally provide a shelter address, case manager address, or mail drop
                  where the client can receive correspondence.
                </p>
              </div>
            </div>
          ) : null}

          {!isHomeless && (
            <>
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
            </>
          )}

          {isHomeless && (
            <FormField
              name="participantDetails.mailingAddress"
              label="Mailing / Shelter Address (optional)"
              placeholder="e.g. 100 Main Shelter, San Jose CA 95101"
            />
          )}
        </div>

        {/* How did you hear about us? */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            How did you hear about The United Effort Org?
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="participantDetails.referralSource"
              label="Referral Source"
              type="select"
              options={REFERRAL_SOURCE_OPTIONS}
              placeholder="Select how you heard about us"
            />
          </div>
          {referralSource && referralSource !== "" && (
            <FormField
              name="participantDetails.referralSourceDetails"
              label="Please provide additional details"
              type="textarea"
              placeholder="E.g., name of the person who referred you, specific event attended, etc."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

