import { z } from "zod";

// Participant Details Schema
export const participantDetailsSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  middleName: z.string().max(50).optional(),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  ssn: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  primaryPhone: z.string().min(10, "Please enter a valid phone number"),
  secondaryPhone: z.string().optional(),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required").max(50),
  state: z.string().min(1, "State is required"),
  county: z.string().optional(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
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
  // Financials
  employmentStatus: z.string().optional(),
  monthlyIncome: z.string().optional(), // Text input for currency
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

// Complete Client Intake Form Schema
export const clientIntakeSchema = z.object({
  participantDetails: participantDetailsSchema,
  emergencyContacts: z.array(emergencyContactSchema).min(1, "At least one emergency contact is required"),
  caseManagement: caseManagementSchema,
  demographics: demographicsSchema,
  household: householdSchema,
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
  streetAddress: "",
  city: "",
  state: "",
  county: "",
  zipCode: "",
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
  employmentStatus: "",
  monthlyIncome: "",
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
