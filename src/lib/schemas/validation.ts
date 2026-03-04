import { z } from "zod";

// Participant Details Schema
export const participantDetailsSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  middleName: z.string().max(50).optional(),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  ssn: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  primaryPhone: z.string().min(10, "Please enter a valid phone number").optional().or(z.literal("")),
  secondaryPhone: z.string().optional(),
  noFixedAddress: z.boolean().optional(),
  streetAddress: z.string().optional().or(z.literal("")),
  city: z.string().max(50).optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  county: z.string().optional(),
  zipCode: z.string().optional().or(z.literal("")),
  mailingAddress: z.string().max(200).optional(),  // shelter / care-of address when homeless
  // How did you hear about us?
  referralSource: z.string().optional(),
  referralSourceDetails: z.string().max(500).optional(),
});

// Emergency Contact Schema
export const emergencyContactSchema = z.object({
  name: z.string().min(1, "Emergency contact name is required").max(100),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

// Case Management Schema
export const caseManagementSchema = z.object({
  clientManager: z.string().optional(),
  clientStatus: z.string().optional(),
  engagementLetterSigned: z.boolean().optional(),
  hmisUniqueId: z.string().optional(),
  ssnLastFour: z.string().regex(/^\d{4}$/, "Must be exactly 4 digits").optional().or(z.literal("")),
  housingStatus: z.string().optional(),
  primaryLanguage: z.string().optional(),
  secondaryLanguage: z.string().optional(),
  additionalAddressInfo: z.string().max(500).optional(),
  viSpdatScore: z.number().min(0).max(100).optional().nullable(),
  preferredId: z.string().optional(),
  calFreshMediCalId: z.string().optional(),
  calFreshMediCalPartnerMonth: z.string().optional(),
  race: z.array(z.string()).optional(),
  // New fields
  healthInsurance: z.string().optional(),
  healthInsuranceType: z.string().optional(),
  nonCashBenefits: z.array(z.string()).optional(),
  healthStatus: z.string().optional(),
});

// Demographics Schema
export const demographicsSchema = z.object({
  race: z.array(z.string()).optional(),
  genderIdentity: z.string().optional(),
  ethnicity: z.string().optional(),
  maritalStatus: z.string().optional(),
  language: z.string().optional(),
  educationLevel: z.string().optional(),
  // Financials
  employmentStatus: z.string().optional(),
  monthlyIncome: z.number().nullable().optional(),
  incomeSource: z.string().optional(),
  veteranStatus: z.boolean().optional(),
  disabilityStatus: z.boolean().optional(),
});

// Household Member Schema
export const householdMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  race: z.array(z.string()).optional(),
});

// Household Schema
export const householdSchema = z.object({
  members: z.array(householdMemberSchema).optional(),
});

// Housing statuses that indicate no fixed address
const NO_FIXED_ADDRESS_STATUSES = ['homeless', 'shelter', 'couch_surfing'];

// Complete Client Intake Form Schema
export const clientIntakeSchema = z.object({
  participantDetails: participantDetailsSchema,
  emergencyContacts: z.array(emergencyContactSchema).min(1, "At least one emergency contact is required"),
  caseManagement: caseManagementSchema,
  demographics: demographicsSchema,
  household: householdSchema,
}).superRefine((data, ctx) => {
  const noFixed =
    data.participantDetails.noFixedAddress === true ||
    NO_FIXED_ADDRESS_STATUSES.includes(data.caseManagement.housingStatus ?? '');
  if (!noFixed) {
    if (!data.participantDetails.streetAddress) {
      ctx.addIssue({ code: 'custom', message: 'Street address is required', path: ['participantDetails', 'streetAddress'] });
    }
    if (!data.participantDetails.city) {
      ctx.addIssue({ code: 'custom', message: 'City is required', path: ['participantDetails', 'city'] });
    }
    if (!data.participantDetails.state) {
      ctx.addIssue({ code: 'custom', message: 'State is required', path: ['participantDetails', 'state'] });
    }
    if (data.participantDetails.zipCode && !/^\d{5}(-\d{4})?$/.test(data.participantDetails.zipCode)) {
      ctx.addIssue({ code: 'custom', message: 'Please enter a valid ZIP code', path: ['participantDetails', 'zipCode'] });
    } else if (!data.participantDetails.zipCode) {
      ctx.addIssue({ code: 'custom', message: 'ZIP code is required', path: ['participantDetails', 'zipCode'] });
    }
  }
});

// Types derived from schemas
export type ParticipantDetails = z.infer<typeof participantDetailsSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type CaseManagement = z.infer<typeof caseManagementSchema>;
export type Demographics = z.infer<typeof demographicsSchema>;
export type HouseholdMember = z.infer<typeof householdMemberSchema>;
export type Household = z.infer<typeof householdSchema>;
export type ClientIntakeForm = z.infer<typeof clientIntakeSchema>;

// Default values for the form
export const defaultParticipantDetails: ParticipantDetails = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  ssn: "",
  email: "",
  primaryPhone: "",
  secondaryPhone: "",
  noFixedAddress: false,
  streetAddress: "",
  city: "",
  state: "CA",
  county: "",
  zipCode: "",
  mailingAddress: "",
  referralSource: "",
  referralSourceDetails: "",
};

export const defaultEmergencyContact: EmergencyContact = {
  name: "",
  relationship: "",
  phone: "",
  email: "",
};

export const defaultCaseManagement: CaseManagement = {
  clientManager: "",
  clientStatus: "",
  engagementLetterSigned: false,
  hmisUniqueId: "",
  ssnLastFour: "",
  housingStatus: "",
  primaryLanguage: "",
  secondaryLanguage: "",
  additionalAddressInfo: "",
  viSpdatScore: null,
  preferredId: "",
  calFreshMediCalId: "",
  calFreshMediCalPartnerMonth: "",
  race: [],
  healthInsurance: "",
  healthInsuranceType: "",
  nonCashBenefits: [],
  healthStatus: "",
};

export const defaultDemographics: Demographics = {
  race: [],
  genderIdentity: "",
  ethnicity: "",
  maritalStatus: "",
  language: "",
  educationLevel: "",
  employmentStatus: "",
  monthlyIncome: null,
  incomeSource: "",
  veteranStatus: false,
  disabilityStatus: false,
};

export const defaultHousehold: Household = {
  members: [],
};

export const defaultClientIntakeForm: ClientIntakeForm = {
  participantDetails: defaultParticipantDetails,
  emergencyContacts: [defaultEmergencyContact],
  caseManagement: defaultCaseManagement,
  demographics: defaultDemographics,
  household: defaultHousehold,
};
