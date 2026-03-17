import { describe, expect, it } from "vitest";
import {
  dbRowToFormData,
  defaultEmploymentSupportIntake,
  defaultWorkHistoryEntry,
  employmentSupportIntakeSchema,
} from "../schemas/employment-support";

describe("employment-support schema helpers", () => {
  it("provides a valid default intake shape", () => {
    expect(defaultEmploymentSupportIntake.workExperience.workHistory).toEqual([
      defaultWorkHistoryEntry,
    ]);
    expect(defaultEmploymentSupportIntake.education.wantsGedSupport).toBe(false);
    expect(defaultEmploymentSupportIntake.resume.hasCoverLetter).toBe(false);
    expect(() => employmentSupportIntakeSchema.parse(defaultEmploymentSupportIntake)).not.toThrow();
  });

  it("maps database rows back into form sections", () => {
    const formData = dbRowToFormData({
      preferred_contact_method: "text",
      available_documents: ["government_id"],
      wants_ged_support: true,
      work_history: [{ employer: "Acme" }],
      minimum_hourly_pay: 22,
      has_cover_letter: true,
      recent_applications: [{ company: "Widgets Inc" }],
      support_needs: ["resume_help"],
      assigned_staff_id: "staff-1",
    });

    expect(formData.basicInfo.preferredContactMethod).toBe("text");
    expect(formData.basicInfo.availableDocuments).toEqual(["government_id"]);
    expect(formData.education.wantsGedSupport).toBe(true);
    expect(formData.workExperience.workHistory).toEqual([{ employer: "Acme" }]);
    expect(formData.jobPreferences.minimumHourlyPay).toBe(22);
    expect(formData.resume.hasCoverLetter).toBe(true);
    expect(formData.jobSearch.recentApplications).toEqual([{ company: "Widgets Inc" }]);
    expect(formData.barriers.supportNeeds).toEqual(["resume_help"]);
    expect(formData.internalUse.assignedStaffId).toBe("staff-1");
  });

  it("fills missing database values with safe defaults", () => {
    const formData = dbRowToFormData({});

    expect(formData.basicInfo.availableDocuments).toEqual([]);
    expect(formData.education.wantsGedSupport).toBe(false);
    expect(formData.jobPreferences.minimumHourlyPay).toBeNull();
    expect(formData.resume.hasCoverLetter).toBe(false);
    expect(formData.internalUse.assignedStaffId).toBe("");
  });
});
