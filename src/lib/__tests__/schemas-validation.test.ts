import { describe, expect, it } from "vitest";
import {
  clientIntakeSchema,
  defaultCaseManagement,
  defaultClientIntakeForm,
  defaultDemographics,
  defaultEmergencyContact,
  defaultHousehold,
  defaultParticipantDetails,
} from "../schemas/validation";

const buildValidIntake = () => ({
  participantDetails: {
    ...defaultParticipantDetails,
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-01-01",
    email: "jane@example.com",
    primaryPhone: "4085551212",
    streetAddress: "1 Main St",
    city: "San Jose",
    state: "CA",
    zipCode: "95112",
  },
  emergencyContacts: [
    {
      ...defaultEmergencyContact,
      name: "John Doe",
      relationship: "Friend",
      phone: "4085552121",
      email: "john@example.com",
    },
  ],
  caseManagement: {
    ...defaultCaseManagement,
    housingStatus: "housed",
  },
  demographics: {
    ...defaultDemographics,
  },
  household: {
    ...defaultHousehold,
    members: [],
  },
});

describe("schemas/validation defaults and refinements", () => {
  it("provides expected default helper values", () => {
    expect(defaultParticipantDetails.state).toBe("CA");
    expect(defaultCaseManagement.viSpdatScore).toBeNull();
    expect(defaultDemographics.monthlyIncome).toBeNull();
    expect(defaultHousehold.members).toEqual([]);
    expect(defaultClientIntakeForm.emergencyContacts).toHaveLength(1);
  });

  it("accepts a fully valid intake payload", () => {
    const parsed = clientIntakeSchema.safeParse(buildValidIntake());
    expect(parsed.success).toBe(true);
  });

  it("requires address fields when client does not have no-fixed-address indicators", () => {
    const payload = buildValidIntake();
    payload.participantDetails.streetAddress = "";
    payload.participantDetails.city = "";
    payload.participantDetails.state = "";
    payload.participantDetails.zipCode = "";
    payload.participantDetails.noFixedAddress = false;
    payload.caseManagement.housingStatus = "housed";

    const result = clientIntakeSchema.safeParse(payload);
    expect(result.success).toBe(false);

    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Street address is required");
    expect(messages).toContain("City is required");
    expect(messages).toContain("State is required");
    expect(messages).toContain("ZIP code is required");
  });

  it("allows missing address fields when noFixedAddress is true", () => {
    const payload = buildValidIntake();
    payload.participantDetails.noFixedAddress = true;
    payload.participantDetails.streetAddress = "";
    payload.participantDetails.city = "";
    payload.participantDetails.state = "";
    payload.participantDetails.zipCode = "";

    const result = clientIntakeSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("allows missing address fields when housing status implies no fixed address", () => {
    const payload = buildValidIntake();
    payload.participantDetails.noFixedAddress = false;
    payload.caseManagement.housingStatus = "homeless";
    payload.participantDetails.streetAddress = "";
    payload.participantDetails.city = "";
    payload.participantDetails.state = "";
    payload.participantDetails.zipCode = "";

    const result = clientIntakeSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects invalid zip code format", () => {
    const payload = buildValidIntake();
    payload.participantDetails.zipCode = "95AB2";

    const result = clientIntakeSchema.safeParse(payload);
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Please enter a valid ZIP code");
  });

  it("requires at least one emergency contact", () => {
    const payload = buildValidIntake();
    payload.emergencyContacts = [];

    const result = clientIntakeSchema.safeParse(payload);
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("At least one emergency contact is required");
  });
});
