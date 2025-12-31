"use server";

import { createClient } from "@/lib/supabase/server";

interface SelfServiceFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  password: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  preferredLanguage?: string;
  signature?: string;
}

interface SaveResult {
  success: boolean;
  clientId?: string;
  userId?: string;
  error?: string;
}

export async function submitSelfServiceApplication(
  formData: SelfServiceFormData
): Promise<SaveResult> {
  try {
    const supabase = await createClient();

    // Create the user account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
      },
    });

    if (signUpError) throw signUpError;

    if (!authData.user) {
      throw new Error("User creation failed");
    }

    // Create profile entry (required for auth context)
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      role: "client",
      is_active: true,
      created_at: new Date().toISOString(),
    });

    if (profileError) throw profileError;

    // Create client record
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert({
        portal_user_id: authData.user.id,
        has_portal_access: true,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        date_of_birth: formData.dateOfBirth || null,
        street_address: formData.street || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zipCode || null,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (clientError) throw clientError;

    // Create case_management record with preferred language
    const { error: caseError } = await supabase.from("case_management").insert({
      client_id: clientData.id,
      primary_language: formData.preferredLanguage || "English",
      housing_status: "unknown",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (caseError) {
      console.error("Error creating case management:", caseError);
    }

    // Create a task due in 7 days for profile completion
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const { error: taskError } = await supabase.from("tasks").insert({
      title: "Complete Profile Information",
      description: `New client ${formData.firstName} ${formData.lastName} registered via self-service. Please review their profile and ensure all required information is collected.`,
      client_id: clientData.id,
      status: "pending",
      priority: "medium",
      due_date: dueDate.toISOString(),
      created_by: authData.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (taskError) {
      console.error("Error creating profile completion task:", taskError);
    }

    // Store signature if available
    if (formData.signature) {
      try {
        const base64Data = formData.signature.split(",")[1];
        const blob = Buffer.from(base64Data, "base64");

        const { error: uploadError } = await supabase.storage
          .from("signatures")
          .upload(
            `${authData.user.id}/engagement-letter-${Date.now()}.png`,
            blob,
            { contentType: "image/png" }
          );

        if (uploadError) {
          console.error("Signature upload error:", uploadError);
        }
      } catch (sigError) {
        console.error("Error processing signature:", sigError);
      }
    }

    // Create audit log entry
    await supabase.from("audit_log").insert({
      user_id: authData.user.id,
      action: "client_self_registration",
      table_name: "clients",
      record_id: clientData.id,
      new_values: { email: formData.email, firstName: formData.firstName, lastName: formData.lastName },
    });

    return {
      success: true,
      clientId: clientData.id,
      userId: authData.user.id,
    };
  } catch (error) {
    console.error("Error submitting self-service application:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit application",
    };
  }
}