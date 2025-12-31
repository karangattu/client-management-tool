"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/forms/FormField";
import {
  CLIENT_STATUSES,
  HOUSING_STATUSES,
  LANGUAGES,
  MONTHS,
  RACE_OPTIONS,
} from "@/lib/constants";

interface CaseManagementSectionProps {
  caseManagers?: { value: string; label: string }[];
}

export function CaseManagementSection({ caseManagers = [] }: CaseManagementSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
            3
          </span>
          Case Management
        </CardTitle>
        <CardDescription>
          Assign case management details and track client status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Case Assignment */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Case Assignment
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="caseManagement.clientManager"
              label="Client Manager"
              type="select"
              options={[
                { value: "", label: "Unassigned" },
                ...caseManagers
              ]}
              placeholder="Select a manager"
              tooltip="The staff member responsible for this client's case"
            />
            <FormField
              name="caseManagement.clientStatus"
              label="Client Status"
              type="select"
              options={CLIENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              placeholder="Select status"
            />
          </div>
        </div>

        {/* Documentation */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Documentation
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="caseManagement.engagementLetterSigned"
              label="Client Engagement Letter Signed"
              type="checkbox"
            />
            <FormField
              name="caseManagement.hmisUniqueId"
              label="HMIS Unique ID"
              placeholder="Enter HMIS ID"
              tooltip="Homeless Management Information System unique identifier"
            />
          </div>
        </div>

        {/* Identification */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Identification
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              name="caseManagement.ssnLastFour"
              label="Last 4 Digits of SSN"
              placeholder="XXXX"
              maxLength={4}
              tooltip="For identification purposes when full SSN is not available"
            />
            <FormField
              name="caseManagement.preferredId"
              label="Preferred ID"
              placeholder="Enter preferred ID"
            />
            <FormField
              name="caseManagement.calFreshMediCalId"
              label="CalFresh/Medi-Cal ID"
              placeholder="Enter ID"
            />
          </div>
          <FormField
            name="caseManagement.calFreshMediCalPartnerMonth"
            label="CalFresh/Medi-Cal Partner Month"
            type="select"
            options={MONTHS}
            placeholder="Select month"
            className="max-w-xs"
          />
        </div>

        {/* Housing & Language */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Housing & Language
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              name="caseManagement.housingStatus"
              label="Housing Status"
              type="select"
              options={HOUSING_STATUSES}
              placeholder="Select status"
            />
            <FormField
              name="caseManagement.primaryLanguage"
              label="Primary Language"
              type="select"
              options={LANGUAGES}
              placeholder="Select language"
            />
            <FormField
              name="caseManagement.secondaryLanguage"
              label="Secondary Language"
              type="select"
              options={LANGUAGES}
              placeholder="Select language"
            />
          </div>
          <FormField
            name="caseManagement.additionalAddressInfo"
            label="Additional Info on Address"
            type="textarea"
            placeholder="Enter any additional address information or housing situation details..."
            maxLength={500}
            tooltip="For complex housing situations"
          />
        </div>

        {/* Assessment Score */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Assessment
          </h4>
          <FormField
            name="caseManagement.viSpdatScore"
            label="VI-SPDAT Score"
            type="number"
            placeholder="0-100"
            min={0}
            max={100}
            tooltip="Vulnerability Index - Service Prioritization Decision Assistance Tool score. Used to assess and prioritize homeless individuals and families for housing assistance."
            className="max-w-xs"
          />
        </div>

        {/* Race & Ethnicity */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Race & Ethnicity (Case Management)
          </h4>
          <FormField
            name="caseManagement.race"
            label="Race (Select all that apply)"
            type="multi-checkbox"
            options={RACE_OPTIONS}
          />
        </div>
      </CardContent>
    </Card>
  );
}
