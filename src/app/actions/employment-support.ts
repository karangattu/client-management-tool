"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  employmentSupportIntakeSchema,
  type EmploymentSupportIntakeForm,
} from "@/lib/schemas/employment-support";
import {
  employmentFollowUpDbRowToFormData,
  employmentFollowUpSchema,
  type EmploymentFollowUpForm,
} from "@/lib/schemas/employment-follow-up";

const STAFF_ROLES = ["admin", "case_manager", "staff", "volunteer"] as const;
const EMPLOYMENT_FOLLOW_UP_TASK_TITLE = "Complete Employment Follow-Up Intake";

interface SaveResult {
  success: boolean;
  intakeId?: string;
  followUpId?: string;
  error?: string;
}

export interface EmploymentSupportQueueItem {
  enrollmentId: string;
  enrollmentStatus: string;
  updatedAt: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    status: string;
  };
  intake: {
    status: string;
    readinessStatus: string | null;
    nextFollowupDate: string | null;
    updatedAt: string | null;
  } | null;
  assignedStaff: {
    firstName: string;
    lastName: string;
  } | null;
}

export interface EmploymentFollowUpItem {
  id: string;
  clientId: string;
  enrollmentId: string | null;
  status: string;
  employer: string | null;
  jobTitle: string | null;
  requestedAt: string | null;
  requestedBy: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
  formData: EmploymentFollowUpForm;
}

function isStaffRole(role?: string | null) {
  return STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}

/**
 * Fetches the Employment Support staff queue: all clients enrolled in an
 * Employment Support program, joined with their intake & assigned-staff info.
 */
export async function getEmploymentSupportQueue(): Promise<{
  success: boolean;
  data?: EmploymentSupportQueueItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Find the Employment Support program id
    const { data: program, error: programError } = await supabase
      .from("programs")
      .select("id")
      .ilike("name", "Employment Support")
      .maybeSingle();

    if (programError) throw programError;
    if (!program) return { success: true, data: [] };

    // Pull enrollments + client + intake
    const { data: enrollments, error: enrollError } = await supabase
      .from("program_enrollments")
      .select(
        `
        id,
        status,
        updated_at,
        clients!inner (
          id,
          first_name,
          last_name,
          email,
          phone,
          status
        ),
        employment_support_intake (
          status,
          readiness_status,
          next_followup_date,
          updated_at,
          assigned_staff:profiles!assigned_staff_id (
            first_name,
            last_name
          )
        )
      `
      )
      .eq("program_id", program.id)
      .in("status", ["interested", "applying", "enrolled", "completed", "denied", "withdrawn"]);

    if (enrollError) throw enrollError;

    const items: EmploymentSupportQueueItem[] = (enrollments || []).map(
      (row: Record<string, unknown>) => {
        const client = row.clients as Record<string, unknown>;
        const intakes = row.employment_support_intake as
          | Record<string, unknown>[]
          | null;
        const intake = intakes && intakes.length > 0 ? intakes[0] : null;
        const assignedStaff = intake?.assigned_staff as Record<
          string,
          string
        > | null;

        return {
          enrollmentId: row.id as string,
          enrollmentStatus: row.status as string,
          updatedAt: (row.updated_at as string) || null,
          client: {
            id: client.id as string,
            firstName: (client.first_name as string) || "",
            lastName: (client.last_name as string) || "",
            email: (client.email as string) || null,
            phone: (client.phone as string) || null,
            status: (client.status as string) || "active",
          },
          intake: intake
            ? {
                status: (intake.status as string) || "draft",
                readinessStatus:
                  (intake.readiness_status as string) || null,
                nextFollowupDate:
                  (intake.next_followup_date as string) || null,
                updatedAt: (intake.updated_at as string) || null,
              }
            : null,
          assignedStaff: assignedStaff
            ? {
                firstName: assignedStaff.first_name || "",
                lastName: assignedStaff.last_name || "",
              }
            : null,
        };
      }
    );

    return { success: true, data: items };
  } catch (error) {
    console.error("Error fetching employment support queue:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load employment support queue",
    };
  }
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

    const isStaff = isStaffRole(profile?.role);

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
 * Saves or updates an Employment Support post-employment follow-up.
 */
export async function saveEmploymentFollowUp(params: {
  data: EmploymentFollowUpForm;
  clientId: string;
  enrollmentId?: string;
  followUpId?: string;
}): Promise<SaveResult> {
  try {
    const validated = employmentFollowUpSchema.parse(params.data);
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const completedByRole = isStaffRole((profile as { role?: string | null } | null)?.role)
      ? "staff"
      : "client";
    const submittedAt = new Date().toISOString();

    const row = {
      client_id: params.clientId,
      program_enrollment_id: params.enrollmentId || null,
      employer: validated.jobDetails.employer || null,
      job_title: validated.jobDetails.jobTitle || null,
      start_date: validated.jobDetails.startDate || null,
      salary: validated.jobDetails.salary || null,
      schedule: validated.jobDetails.schedule || null,
      job_satisfaction: validated.satisfaction.jobSatisfaction || null,
      supervisor_support: validated.satisfaction.supervisorSupport || null,
      has_transportation_challenges:
        validated.challenges.hasTransportationChallenges ?? false,
      transportation_explanation:
        validated.challenges.transportationExplanation || null,
      has_coworker_or_employer_conflicts:
        validated.challenges.hasCoworkerOrEmployerConflicts ?? false,
      conflict_explanation: validated.challenges.conflictExplanation || null,
      has_uncovered_employment_costs:
        validated.challenges.hasUncoveredEmploymentCosts ?? false,
      cost_explanation: validated.challenges.costExplanation || null,
      needed_skills_or_training:
        validated.challenges.neededSkillsOrTraining || null,
      can_cover_basic_expenses:
        validated.financialStability.canCoverBasicExpenses || null,
      wants_housing_and_self_sufficiency_connection:
        validated.nextSteps.wantsHousingAndSelfSufficiencyConnection || null,
      wants_career_advancement_support:
        validated.nextSteps.wantsCareerAdvancementSupport || null,
      additional_feedback: validated.feedback.additionalFeedback || null,
      status: "submitted",
      ...(params.followUpId ? {} : { requested_at: submittedAt }),
      submitted_at: submittedAt,
      submitted_by: user.id,
      updated_at: submittedAt,
    };

    let followUpId = params.followUpId;

    if (followUpId) {
      const { error } = await supabase
        .from("employment_follow_up_intake")
        .update(row)
        .eq("id", followUpId);

      if (error) throw error;

      const { data: followUpTask } = await supabase
        .from("employment_follow_up_intake")
        .select("task_id")
        .eq("id", followUpId)
        .maybeSingle();

      const taskId = (followUpTask as { task_id?: string | null } | null)?.task_id;
      if (taskId) {
        await supabase
          .from("tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            completed_by: user.id,
            completed_by_role: completedByRole,
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .in("status", ["pending", "in_progress"]);
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("employment_follow_up_intake")
        .insert(row)
        .select("id")
        .single();

      if (error) throw error;
      followUpId = inserted.id;
    }

    revalidatePath(`/clients/${params.clientId}`);
    revalidatePath("/employment-support");
    revalidatePath("/my-portal");

    return { success: true, followUpId };
  } catch (error) {
    console.error("Error saving employment follow-up:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save follow-up",
    };
  }
}

/**
 * Staff request for a client to complete a follow-up from their portal.
 */
export async function requestEmploymentFollowUp(params: {
  clientId: string;
  enrollmentId?: string;
  dueDate?: string;
}): Promise<SaveResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!isStaffRole((profile as { role?: string | null } | null)?.role)) {
      return {
        success: false,
        error: "You do not have permission to request follow-ups",
      };
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("portal_user_id, has_portal_access, first_name")
      .eq("id", params.clientId)
      .single();

    if (clientError) throw clientError;

    const clientRecord = client as {
      portal_user_id?: string | null;
      has_portal_access?: boolean | null;
      first_name?: string | null;
    } | null;

    if (!clientRecord?.portal_user_id || !clientRecord.has_portal_access) {
      return {
        success: false,
        error: "This client does not have active portal access",
      };
    }

    const requestedAt = new Date().toISOString();
    const { data: inserted, error: followUpError } = await supabase
      .from("employment_follow_up_intake")
      .insert({
        client_id: params.clientId,
        program_enrollment_id: params.enrollmentId || null,
        status: "requested",
        requested_at: requestedAt,
        requested_by: user.id,
        updated_at: requestedAt,
      })
      .select("id")
      .single();

    if (followUpError) throw followUpError;

    const followUpId = (inserted as { id: string }).id;
    const dueDate = params.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: EMPLOYMENT_FOLLOW_UP_TASK_TITLE,
        description: `Please complete your Employment Follow-Up Intake in the portal. Follow-up ID: ${followUpId}`,
        client_id: params.clientId,
        assigned_to: clientRecord.portal_user_id,
        assigned_by: user.id,
        priority: "high",
        due_date: dueDate,
        category: "employment_support",
        status: "pending",
      })
      .select("id")
      .single();

    if (taskError) throw taskError;

    const taskId = (task as { id: string }).id;

    const { error: taskLinkError } = await supabase
      .from("employment_follow_up_intake")
      .update({ task_id: taskId, updated_at: new Date().toISOString() })
      .eq("id", followUpId);

    if (taskLinkError) throw taskLinkError;

    await supabase.from("alerts").insert({
      user_id: clientRecord.portal_user_id,
      client_id: params.clientId,
      task_id: taskId,
      title: "Employment Follow-Up Requested",
      message: "Please complete your Employment Follow-Up Intake in the portal.",
      alert_type: "custom",
      trigger_at: requestedAt,
    });

    revalidatePath(`/clients/${params.clientId}`);
    revalidatePath("/employment-support");
    revalidatePath("/my-portal");

    return { success: true, followUpId };
  } catch (error) {
    console.error("Error requesting employment follow-up:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to request follow-up",
    };
  }
}

export async function cancelEmploymentFollowUp(params: {
  followUpId: string;
  clientId: string;
}): Promise<SaveResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!isStaffRole((profile as { role?: string | null } | null)?.role)) {
      return {
        success: false,
        error: "You do not have permission to cancel follow-ups",
      };
    }

    const { data: followUp, error: fetchError } = await supabase
      .from("employment_follow_up_intake")
      .select("task_id")
      .eq("id", params.followUpId)
      .eq("client_id", params.clientId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const taskId = (followUp as { task_id?: string | null } | null)?.task_id;
    const cancelledAt = new Date().toISOString();

    const { error } = await supabase
      .from("employment_follow_up_intake")
      .update({
        status: "cancelled",
        cancelled_at: cancelledAt,
        cancelled_by: user.id,
        updated_at: cancelledAt,
      })
      .eq("id", params.followUpId)
      .eq("client_id", params.clientId);

    if (error) throw error;

    if (taskId) {
      await supabase
        .from("tasks")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .in("status", ["pending", "in_progress"]);
    }

    revalidatePath(`/clients/${params.clientId}`);
    revalidatePath("/employment-support");
    revalidatePath("/my-portal");

    return { success: true, followUpId: params.followUpId };
  } catch (error) {
    console.error("Error cancelling employment follow-up:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to cancel follow-up",
    };
  }
}

/**
 * Fetches post-employment follow-ups for a client, most recent first.
 */
export async function getEmploymentFollowUps(clientId: string): Promise<{
  success: boolean;
  data?: EmploymentFollowUpItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("employment_follow_up_intake")
      .select(
        `
        *,
        requested_by_profile:profiles!requested_by (first_name, last_name),
        submitted_by_profile:profiles!submitted_by (first_name, last_name)
      `
      )
      .eq("client_id", clientId)
      .neq("status", "cancelled")
      .order("requested_at", { ascending: false })
      .order("submitted_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const followUps: EmploymentFollowUpItem[] = (data || []).map(
      (row: Record<string, unknown>) => {
        const submittedByProfile = row.submitted_by_profile as {
          first_name: string;
          last_name: string;
        } | null;
        const requestedByProfile = row.requested_by_profile as {
          first_name: string;
          last_name: string;
        } | null;

        return {
          id: row.id as string,
          clientId: row.client_id as string,
          enrollmentId: (row.program_enrollment_id as string) || null,
          status: (row.status as string) || "submitted",
          employer: (row.employer as string) || null,
          jobTitle: (row.job_title as string) || null,
          requestedAt: (row.requested_at as string) || null,
          requestedBy: requestedByProfile
            ? `${requestedByProfile.first_name} ${requestedByProfile.last_name}`
            : null,
          submittedAt: (row.submitted_at as string) || null,
          submittedBy: submittedByProfile
            ? `${submittedByProfile.first_name} ${submittedByProfile.last_name}`
            : null,
          formData: employmentFollowUpDbRowToFormData(row),
        };
      }
    );

    return { success: true, data: followUps };
  } catch (error) {
    console.error("Error fetching employment follow-ups:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch employment follow-ups",
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
