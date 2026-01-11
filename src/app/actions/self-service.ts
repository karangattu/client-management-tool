"use server";

import { createClient, createServiceClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

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
  pdfData?: string;
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

    // Attempt to use service role for admin operations
    let db: SupabaseServerClient;
    try {
      db = createServiceClient();
    } catch (_e) {
      console.error("SUPABASE_SERVICE_ROLE_KEY missing. Cannot proceed with privileged operations.");
      throw new Error("Configuration error: Service access not available.");
    }

    // Create the user account using the standard client to handle auth flow (emails, etc.)
    // We pass role and names in metadata so the trigger can pick them up if needed,
    // though we will also try to create the profile explicitly for robustness.
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: 'client', // Important for the trigger
        },
        emailRedirectTo: `${getAppUrl()}/auth/callback`,
      },
    });

    if (signUpError) throw signUpError;

    if (!authData.user) {
      throw new Error("User creation failed");
    }

    // Wait a brief moment for the trigger to fire (if it exists)
    // but proceed to explicit creation just in case, using ON CONFLICT DO NOTHING

    // Create profile entry (Idempotent)
    // Create profile entry (Idempotent)
    const { error: profileError } = await db.from("profiles").upsert({
      id: authData.user.id,
      email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      role: "client",
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select().single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw new Error(`Failed to create user profile: ${profileError.message} (Code: ${profileError.code})`);
    }

    // Create client record
    const { data: clientData, error: clientError } = await db
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

    if (clientError) {
      console.error("Client creation error:", clientError);
      throw new Error(`Failed to create client record: ${clientError.message}`);
    }

    // Create case_management record with preferred language
    const { error: caseError } = await db.from("case_management").insert({
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

    const { error: taskError } = await db.from("tasks").insert({
      title: "Complete Full Intake Form",
      description: "Please complete all 7 sections of the intake form to help us process your case. This is an essential step for receiving support.",
      client_id: clientData.id,
      assigned_to: authData.user.id, // Assign to the client themselves
      status: "pending",
      priority: "urgent",
      due_date: dueDate.toISOString(),
      created_by: authData.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (taskError) {
      console.error("Error creating profile completion task:", taskError);
    }

    // Create a task for STAFF to perform outreach (unassigned so anyone can claim)
    await db.from("tasks").insert({
      title: "Outreach: New Self-Registration",
      description: `New client ${formData.firstName} ${formData.lastName} has self-registered. Please perform initial outreach and verify their information.`,
      client_id: clientData.id,
      assigned_to: null, // Unassigned
      status: "pending",
      priority: "high",
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due in 24 hours
      created_by: authData.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Store signature and PDF document if available
    if (formData.pdfData) {
      try {
        const timestamp = Date.now();
        const signatureFileName = `${authData.user.id}/engagement-letter-${timestamp}-sig.png`;

        // Sanitize names for filename
        const sanitizedFirst = formData.firstName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const sanitizedLast = formData.lastName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const documentFileName = `UEO_client_engagement_letter_${sanitizedFirst}_${sanitizedLast}.pdf`;

        const documentFilePath = `${clientData.id}/consent/${documentFileName}`;

        // 1. Upload signature image (if provided)
        if (formData.signature) {
          const base64Signature = formData.signature.split(',')[1];
          const signatureBuffer = Buffer.from(base64Signature, 'base64');
          await db.storage
            .from('signatures')
            .upload(signatureFileName, signatureBuffer, {
              contentType: 'image/png',
              upsert: true
            });
        }

        // 2. Upload PDF document
        const pdfBuffer = Buffer.from(formData.pdfData, 'base64');
        const { error: docUploadError } = await db.storage
          .from('client-documents')
          .upload(documentFilePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (docUploadError) throw docUploadError;

        // 3. Record in documents table
        const { error: dbError } = await db.from('documents').insert({
          client_id: clientData.id,
          file_name: documentFileName,
          document_type: 'engagement_letter',
          file_path: documentFilePath,
          file_size: pdfBuffer.length,
          mime_type: 'application/pdf',
          description: 'Signed Engagement Letter (Self-registration)',
          is_verified: true,
          uploaded_by: authData.user.id
        });

        if (dbError) console.error("Error creating document record:", dbError);

      } catch (sigError) {
        console.error("Error processing signature and document:", sigError);
        // Even if PDF generation/upload fails, we should still try to mark the client as having signed
        // if we received a signature string.
      }

      // 4. Update client status to record signature time and version
      // We do this outside the inner try/catch so it runs even if PDF upload had issues,
      // as long as we have the signature data intent.
      if (formData.signature) {
        const { error: updateError } = await db
          .from('clients')
          .update({
            signed_engagement_letter_at: new Date().toISOString(),
            engagement_letter_version: 'March 2024'
          })
          .eq('id', clientData.id);

        if (updateError) {
          console.error("Failed to update client signature status:", updateError);
        }
      }
    }

    // Create audit log entry
    await db.from("audit_log").insert({
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