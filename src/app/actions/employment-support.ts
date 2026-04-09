"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  employmentSupportIntakeSchema,
  type EmploymentSupportIntakeForm,
} from "@/lib/schemas/employment-support";

interface SaveResult {
  success: boolean;
  intakeId?: string;
  error?: string;
}

/**
 * Saves or updates an Employment Support Intake questionnaire.
 */
export async function saveEmploymentSupportIntake(params: {
  data: EmploymentSupportIntakeForm;
  clientId: string;
  enrollmentId?: string;
  intakeId?: string;
  asDraft?: boolean;
}): Promise<SaveResult> {
  try {
    // Validate the data
    const validated = employmentSupportIntakeSchema.parse(params.data);

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check user role — strip internal-use fields for clients
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isStaff =
      profile?.role &&
      ["admin", "case_manager", "staff", "volunteer"].includes(profile.role);

    // Build the database row from the validated form data
    const row: Record<string, unknown> = {
      client_id: params.clientId,
      program_enrollment_id: params.enrollmentId || null,

      // Section A
      preferred_contact_method: validated.basicInfo.preferredContactMethod || null,
      best_contact_time: validated.basicInfo.bestContactTime || null,
      available_documents: validated.basicInfo.availableDocuments || [],

      // Section B
      education_level: validated.education.educationLevel || null,
      field_of_study: validated.education.fieldOfStudy || null,
      certifications: validated.education.certifications || null,
      wants_ged_support: validated.education.wantsGedSupport ?? null,

      // Section C
      technical_skills: validated.skills.technicalSkills || null,
      language_skills: validated.skills.languageSkills || null,
      other_skills: validated.skills.otherSkills || null,

      // Section D
      work_history: validated.workExperience.workHistory || [],
      work_experience_type: validated.workExperience.workExperienceType || null,
      has_employment_gaps: validated.workExperience.hasEmploymentGaps ?? null,

      // Section E
      job_interests: validated.jobPreferences.jobInterests || [],
      job_interests_other: validated.jobPreferences.jobInterestsOther || null,
      minimum_hourly_pay: validated.jobPreferences.minimumHourlyPay ?? null,
      employment_types: validated.jobPreferences.employmentTypes || [],
      work_availability: validated.jobPreferences.workAvailability || null,
      transportation_methods: validated.jobPreferences.transportationMethods || [],

      // Section F
      resume_status: validated.resume.resumeStatus || null,
      resume_last_updated: validated.resume.resumeLastUpdated || null,
      has_cover_letter: validated.resume.hasCoverLetter ?? null,
      cover_letter_last_updated: validated.resume.coverLetterLastUpdated || null,

      // Section G
      application_sources: validated.jobSearch.applicationSources || [],
      application_sources_other: validated.jobSearch.applicationSourcesOther || null,
      recent_applications: validated.jobSearch.recentApplications || [],
      has_interview_requests: validated.jobSearch.hasInterviewRequests ?? null,
      interview_details: validated.jobSearch.interviewDetails || null,

      // Section H
      barriers: validated.barriers.barriers || [],
      barriers_other: validated.barriers.barriersOther || null,
      support_needs: validated.barriers.supportNeeds || [],

      // Section I
      commits_to_meetings: validated.commitment.commitsToMeetings ?? null,
      checkin_frequency: validated.commitment.checkinFrequency || null,
      additional_notes: validated.commitment.additionalNotes || null,

      // Metadata
      status: params.asDraft ? "draft" : "submitted",
      ...(params.asDraft ? {} : {
        submitted_at: new Date().toISOString(),
        submitted_by: user.id,
      }),
      updated_at: new Date().toISOString(),
    };

    // Only staff can set internal-use fields
    if (isStaff) {
      row.readiness_status = validated.internalUse.readinessStatus || null;
      row.assigned_staff_id = validated.internalUse.assignedStaffId || null;
      row.next_followup_date = validated.internalUse.nextFollowupDate || null;
    }

    let intakeId = params.intakeId;

    if (intakeId) {
      // Update existing
      const { error } = await supabase
        .from("employment_support_intake")
        .update(row)
        .eq("id", intakeId);

      if (error) throw error;
    } else {
      // Insert new
      const { data: inserted, error } = await supabase
        .from("employment_support_intake")
        .insert(row)
        .select("id")
        .single();

      if (error) throw error;
      intakeId = inserted.id;
    }

    revalidatePath(`/clients/${params.clientId}`);
    revalidatePath("/my-portal");

    return { success: true, intakeId };
  } catch (error) {
    console.error("Error saving employment support intake:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save intake",
    };
  }
}

/**
 * Fetches the employment support intake for a client.
 * Returns the most recent intake, optionally filtered by enrollment.
 */
export async function getEmploymentSupportIntake(
  clientId: string,
  enrollmentId?: string
) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("employment_support_intake")
      .select(
        `
        *,
        submitted_by_profile:profiles!submitted_by (first_name, last_name),
        reviewed_by_profile:profiles!reviewed_by (first_name, last_name),
        assigned_staff:profiles!assigned_staff_id (first_name, last_name)
      `
      )
      .eq("client_id", clientId);

    if (enrollmentId) {
      query = query.eq("program_enrollment_id", enrollmentId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching employment support intake:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch intake",
    };
  }
}

/**
 * Creates a draft employment support intake when a client enrolls in an employment program.
 * (dbRowToFormData has been moved to @/lib/schemas/employment-support.)
 */
export async function createDraftEmploymentSupportIntake(
  clientId: string,
  enrollmentId: string
) {
  try {
    const serviceClient = createServiceClient();

    // Check if an intake already exists for this enrollment
    const { data: existing } = await serviceClient
      .from("employment_support_intake")
      .select("id")
      .eq("client_id", clientId)
      .eq("program_enrollment_id", enrollmentId)
      .maybeSingle();

    if (existing) {
      return { success: true, intakeId: existing.id, alreadyExists: true };
    }

    const { data, error } = await serviceClient
      .from("employment_support_intake")
      .insert({
        client_id: clientId,
        program_enrollment_id: enrollmentId,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) throw error;

    return { success: true, intakeId: data.id, alreadyExists: false };
  } catch (error) {
    console.error("Error creating draft employment support intake:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create draft intake",
    };
  }
}

/**
 * Updates internal-use fields (staff only).
 */
export async function updateEmploymentSupportReadiness(params: {
  intakeId: string;
  clientId: string;
  readinessStatus: string;
  assignedStaffId?: string;
  nextFollowupDate?: string;
}) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("employment_support_intake")
      .update({
        readiness_status: params.readinessStatus || null,
        assigned_staff_id: params.assignedStaffId || null,
        next_followup_date: params.nextFollowupDate || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
        status: "reviewed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.intakeId);

    if (error) throw error;

    revalidatePath(`/clients/${params.clientId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating readiness:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update readiness",
    };
  }
}
