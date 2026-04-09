"use server";

import { createClient, createServiceClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

type RegistrationMode = 'standard' | 'employment-support';

const EMPLOYMENT_SUPPORT_PROGRAM_NAME = 'Employment Support';

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
  isHomeless?: boolean;
  mailingAddress?: string;
  preferredLanguage?: string;
  signature?: string;
  pdfData?: string;
  registrationMode?: RegistrationMode;
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
    const registrationMode = formData.registrationMode || 'standard';

    if (registrationMode === 'employment-support' && !formData.signature) {
      return {
        success: false,
        error: 'Employment Support registration requires a signed engagement letter.',
      };
    }

    // Attempt to use service role for admin operations
    let db: SupabaseServerClient;
    try {
      db = createServiceClient();
    } catch {
      console.error("SUPABASE_SERVICE_ROLE_KEY missing. Cannot proceed with privileged operations.");
      throw new Error("Configuration error: Service access not available.");
    }
    // Check if email already exists with a restricted role
    const { data: existingProfile } = await db
      .from('profiles')
      .select('id, role')
      .eq('email', formData.email)
      .single();

    if (existingProfile) {
      if (['admin', 'case_manager'].includes(existingProfile.role)) {
        return {
          success: false,
          error: "This email address is associated with a staff account. Please use the staff login.",
        };
      }
      if (existingProfile.role === 'client') {
        // Before rejecting, link any orphaned admin-created client record
        // so the client can log in and access their data
        const { data: unlinkedClient } = await db
          .from('clients')
          .select('id')
          .eq('email', formData.email)
          .is('portal_user_id', null)
          .maybeSingle();

        if (unlinkedClient) {
          // Remove any shell record created by the handle_new_user trigger
          await db
            .from('clients')
            .delete()
            .eq('portal_user_id', existingProfile.id);

          // Link the admin-created record to the existing auth user
          await db
            .from('clients')
            .update({
              portal_user_id: existingProfile.id,
              has_portal_access: true,
            })
            .eq('id', unlinkedClient.id);

          console.log('Linked orphaned admin-created client to existing auth user:', unlinkedClient.id);
        }

        return {
          success: false,
          error: "An account with this email already exists. Please log in.",
        };
      }
    }
    // Create the user account using the standard client to handle auth flow (emails, etc.)
    // We pass role and names in metadata so the trigger can pick them up if needed,
    // though we will also try to create the profile explicitly for robustness.
    console.log("Creating user:", formData.email, "Is signature present?", !!formData.signature);
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: 'client', // Important for the trigger
          registration_mode: registrationMode,
        },
        emailRedirectTo: `${getAppUrl()}/auth/callback?registration_mode=${registrationMode}`,
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
    } else {
      console.log("Profile upserted successfully. Attempted role: client");
    }

    // Create or link client record
    // Check if an admin-created client record already exists for this email
    const { data: existingClient } = await db
      .from("clients")
      .select("id, portal_user_id")
      .eq("email", formData.email)
      .is("portal_user_id", null)
      .maybeSingle();

    let clientData;

    if (existingClient) {
      // Link the existing admin-created record to this new auth user
      console.log('Linking admin-created client to new auth user:', existingClient.id);
      const { data: linkedClient, error: linkError } = await db
        .from("clients")
        .update({
          portal_user_id: authData.user.id,
          has_portal_access: true,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          date_of_birth: formData.dateOfBirth || null,
          street_address: formData.street || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zipCode || null,
          onboarding_status: registrationMode === 'employment-support' ? 'employment_support' : 'registered',
          onboarding_progress: 0,
        })
        .eq("id", existingClient.id)
        .select()
        .single();

      if (linkError) {
        console.error("Error linking existing client:", linkError);
        throw new Error(`Failed to link client record: ${linkError.message}`);
      }
      clientData = linkedClient;
    } else {
      // Check if the handle_new_user trigger already created a record
      const { data: triggerClient } = await db
        .from("clients")
        .select("id")
        .eq("portal_user_id", authData.user.id)
        .maybeSingle();

      if (triggerClient) {
        // Update the trigger-created record with full form data
        const { data: updatedClient, error: updateError } = await db
          .from("clients")
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone || null,
            date_of_birth: formData.dateOfBirth || null,
            street_address: formData.street || null,
            city: formData.city || null,
            state: formData.state || null,
            zip_code: formData.zipCode || null,
            has_portal_access: true,
            status: "pending",
            onboarding_status: registrationMode === 'employment-support' ? 'employment_support' : 'registered',
            onboarding_progress: 0,
          })
          .eq("id", triggerClient.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating trigger-created client:", updateError);
          throw new Error(`Failed to update client record: ${updateError.message}`);
        }
        clientData = updatedClient;
      } else {
        // No existing record — insert new
        const { data: newClient, error: clientError } = await db
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
            onboarding_status: registrationMode === 'employment-support' ? 'employment_support' : 'registered',
            onboarding_progress: 0,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (clientError) {
          console.error("Client creation error:", clientError);
          throw new Error(`Failed to create client record: ${clientError.message}`);
        }
        clientData = newClient;
      }
    }

    // Create case_management record with preferred language
    const { error: caseError } = await db.from("case_management").insert({
      client_id: clientData.id,
      primary_language: formData.preferredLanguage || "English",
      housing_status: formData.isHomeless ? 'homeless' : 'unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (caseError) {
      console.error("Error creating case management:", caseError);
    }

    if (registrationMode === 'employment-support') {
      const { data: employmentProgram, error: employmentProgramError } = await db
        .from('programs')
        .select('id')
        .eq('name', EMPLOYMENT_SUPPORT_PROGRAM_NAME)
        .maybeSingle();

      if (employmentProgramError) {
        console.error('Error loading Employment Support program:', employmentProgramError);
      }

      if (employmentProgram?.id) {
        const { data: enrollmentData, error: enrollmentError } = await db
          .from('program_enrollments')
          .upsert({
            client_id: clientData.id,
            program_id: employmentProgram.id,
            status: 'interested',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'client_id,program_id',
          })
          .select('id')
          .single();

        if (enrollmentError) {
          console.error('Error creating Employment Support enrollment:', enrollmentError);
        } else if (enrollmentData?.id) {
          const { data: existingIntake } = await db
            .from('employment_support_intake')
            .select('id')
            .eq('client_id', clientData.id)
            .eq('program_enrollment_id', enrollmentData.id)
            .maybeSingle();

          if (!existingIntake) {
            // Check for an orphaned intake (created before enrollment was linked)
            const { data: orphanedIntake } = await db
              .from('employment_support_intake')
              .select('id')
              .eq('client_id', clientData.id)
              .is('program_enrollment_id', null)
              .limit(1)
              .maybeSingle();

            if (orphanedIntake) {
              await db
                .from('employment_support_intake')
                .update({ program_enrollment_id: enrollmentData.id })
                .eq('id', orphanedIntake.id);
            } else {
              const { error: intakeError } = await db
                .from('employment_support_intake')
                .insert({
                  client_id: clientData.id,
                  program_enrollment_id: enrollmentData.id,
                  status: 'draft',
                });

              if (intakeError) {
                console.error('Error creating Employment Support draft intake:', intakeError);
              }
            }
          }
        }
      }
    }

    // Create a task for STAFF to perform outreach (unassigned so anyone can claim)
    await db.from("tasks").insert({
      title: "Outreach: New Self-Registration",
      description: registrationMode === 'employment-support'
        ? `New client ${formData.firstName} ${formData.lastName} has self-registered for Employment Support. Please perform initial outreach and verify their information.`
        : `New client ${formData.firstName} ${formData.lastName} has self-registered. Please perform initial outreach and verify their information.`,
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

      console.log("Signature processing complete. Signature provided:", !!formData.signature);
    }

    // 4. Update client status to record signature time and version
    // We do this independently of the PDF upload to ensure the status is recorded
    // as long as the user provided a signature intent.
    if (formData.signature) {
      console.log("Updating client signature status...");
      const { error: updateError } = await db
        .from('clients')
        .update({
          signed_engagement_letter_at: new Date().toISOString(),
          engagement_letter_version: 'March 2024',
          onboarding_status: registrationMode === 'employment-support' ? 'employment_support' : 'engagement',
          onboarding_progress: 50
        })
        .eq('id', clientData.id);

      if (updateError) {
        console.error("Failed to update client signature status:", updateError);
      } else {
        console.log("Client signature status updated successfully.");
      }
    }

    // Create audit log entry
    await db.from("audit_log").insert({
      user_id: authData.user.id,
      action: "client_self_registration",
      table_name: "clients",
      record_id: clientData.id,
      new_values: { email: formData.email, firstName: formData.firstName, lastName: formData.lastName, registration_mode: registrationMode },
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
