"use server";

import type { ClientIntakeForm } from "@/lib/schemas/validation";
import { clientIntakeSchema } from "@/lib/schemas/validation";
import { createClient } from "@/lib/supabase/server";
import { completeTaskByTitle } from "@/app/actions/tasks";

interface SaveResult {
  success: boolean;
  clientId?: string;
  error?: string;
}

export async function saveClientIntake(
  data: ClientIntakeForm,
  clientId?: string
): Promise<SaveResult> {
  try {
    // Validate the data
    const validatedData = clientIntakeSchema.parse(data);

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Check if client email belongs to a staff member
    const clientEmail = validatedData.participantDetails.email;
    if (clientEmail) {
      const { data: staffProfile } = await supabase
        .from('profiles')
        .select('id, role, first_name, last_name')
        .ilike('email', clientEmail)
        .in('role', ['admin', 'staff', 'case_manager'])
        .maybeSingle();

      if (staffProfile) {
        return {
          success: false,
          error: `This email address (${clientEmail}) belongs to staff member "${staffProfile.first_name} ${staffProfile.last_name}". Clients cannot use staff email addresses. Please enter a different email for the client.`,
        };
      }
    }

    const id = clientId; // If no ID provided, database will generate UUID
    const now = new Date().toISOString();

    // 1. Save client record (UPDATE if clientId provided, INSERT if new)
    let savedClientId: string;

    if (id) {
      // Update existing client - only update fields that clients are allowed to modify
      const updateData = {
        first_name: validatedData.participantDetails.firstName,
        middle_name: validatedData.participantDetails.middleName || null,
        last_name: validatedData.participantDetails.lastName,
        date_of_birth: validatedData.participantDetails.dateOfBirth || null,
        email: validatedData.participantDetails.email || null,
        phone: validatedData.participantDetails.primaryPhone || null,
        alternate_phone: validatedData.participantDetails.secondaryPhone || null,
        street_address: validatedData.participantDetails.streetAddress || null,
        city: validatedData.participantDetails.city || null,
        state: validatedData.participantDetails.state || null,
        zip_code: validatedData.participantDetails.zipCode || null,
        ssn_last_four: validatedData.caseManagement.ssnLastFour || null,
        updated_at: now,
      };

      console.log(`[saveClientIntake] Updating existing client ${id} for user ${user.id}`);

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .select();

      if (clientError) {
        console.error("[saveClientIntake] Error updating client:", clientError);
        console.error("[saveClientIntake] Error code:", clientError.code, "| Details:", clientError.details);
        return { success: false, error: `Failed to update client: ${clientError.message}. Please ensure you have permission to edit this record.` };
      }

      if (!clientData || clientData.length === 0) {
        return { success: false, error: "Client not found or access denied" };
      }

      savedClientId = clientData[0].id;
    } else {
      // Insert new client (staff only - RLS enforced)
      const insertData = {
        first_name: validatedData.participantDetails.firstName,
        middle_name: validatedData.participantDetails.middleName || null,
        last_name: validatedData.participantDetails.lastName,
        preferred_name: null,
        date_of_birth: validatedData.participantDetails.dateOfBirth || null,
        email: validatedData.participantDetails.email || null,
        phone: validatedData.participantDetails.primaryPhone || null,
        alternate_phone: validatedData.participantDetails.secondaryPhone || null,
        street_address: validatedData.participantDetails.streetAddress || null,
        apartment_unit: null,
        city: validatedData.participantDetails.city || null,
        state: validatedData.participantDetails.state || null,
        zip_code: validatedData.participantDetails.zipCode || null,
        mailing_same_as_physical: true,
        mailing_street_address: null,
        mailing_city: null,
        mailing_state: null,
        mailing_zip_code: null,
        ssn_last_four: validatedData.caseManagement.ssnLastFour || null,
        status: (validatedData.caseManagement.clientStatus && ['active', 'inactive', 'pending', 'archived'].includes(validatedData.caseManagement.clientStatus))
          ? validatedData.caseManagement.clientStatus
          : 'pending',
        has_portal_access: false,
        assigned_case_manager: validatedData.caseManagement.clientManager || null,
        updated_at: now,
        created_by: user.id,
      };

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert(insertData)
        .select();

      if (clientError) {
        console.error("Error saving client:", clientError);
        return { success: false, error: clientError.message };
      }

      if (!clientData || clientData.length === 0) {
        return { success: false, error: "Failed to create client" };
      }

      savedClientId = clientData[0].id;
    }

    // 2. Save Case Management (check if exists first)
    const caseManagementData = {
      client_id: savedClientId,
      housing_status: (validatedData.caseManagement.housingStatus && ['housed', 'unhoused', 'at_risk', 'transitional', 'unknown'].includes(validatedData.caseManagement.housingStatus))
        ? validatedData.caseManagement.housingStatus
        : 'unknown',
      primary_language: validatedData.caseManagement.primaryLanguage || 'English',
      secondary_language: validatedData.caseManagement.secondaryLanguage || null,
      needs_interpreter: false,
      vi_spdat_score: validatedData.caseManagement.viSpdatScore || null,
      health_insurance: validatedData.caseManagement.healthInsurance === "yes",
      health_insurance_type: validatedData.caseManagement.healthInsuranceType || null,
      non_cash_benefits: validatedData.caseManagement.nonCashBenefits || [],
      health_status: validatedData.caseManagement.healthStatus || null,
      updated_at: now,
    };

    const { data: existingCM } = await supabase
      .from('case_management')
      .select('id')
      .eq('client_id', savedClientId)
      .maybeSingle();

    if (existingCM) {
      const { error: cmError } = await supabase
        .from('case_management')
        .update(caseManagementData)
        .eq('client_id', savedClientId);
      if (cmError) console.error("Error updating case management:", cmError);
    } else {
      const { error: cmError } = await supabase
        .from('case_management')
        .insert(caseManagementData);
      if (cmError) console.error("Error inserting case management:", cmError);
    }

    // 3. Save Demographics (check if exists first)
    const demographicsData = {
      client_id: savedClientId,
      gender: validatedData.demographics.genderIdentity || null,
      ethnicity: validatedData.demographics.ethnicity || null,
      race: validatedData.demographics.race || [],
      marital_status: validatedData.demographics.maritalStatus || null,
      employment_status: validatedData.demographics.employmentStatus || null,
      monthly_income: validatedData.demographics.monthlyIncome || 0,
      income_source: validatedData.demographics.incomeSource || null,
      veteran_status: validatedData.demographics.veteranStatus || false,
      disability_status: validatedData.demographics.disabilityStatus || false,
      updated_at: now,
    };

    const { data: existingDemo } = await supabase
      .from('demographics')
      .select('id')
      .eq('client_id', savedClientId)
      .maybeSingle();

    if (existingDemo) {
      const { error: demoError } = await supabase
        .from('demographics')
        .update(demographicsData)
        .eq('client_id', savedClientId);
      if (demoError) console.error("Error updating demographics:", demoError);
    } else {
      const { error: demoError } = await supabase
        .from('demographics')
        .insert(demographicsData);
      if (demoError) console.error("Error inserting demographics:", demoError);
    }

    // 4. Update Emergency Contacts (Sync)
    // Delete existing and re-insert
    await supabase.from('emergency_contacts').delete().eq('client_id', savedClientId);
    if (validatedData.emergencyContacts.length > 0) {
      const contacts = validatedData.emergencyContacts.map(c => ({
        client_id: savedClientId,
        name: c.name,
        relationship: c.relationship,
        phone: c.phone,
        email: c.email || null,
      }));
      const { error: ecError } = await supabase.from('emergency_contacts').insert(contacts);
      if (ecError) console.error("Error saving emergency contacts:", ecError);
    }

    // 5. Update Household Members (Sync)
    await supabase.from('household_members').delete().eq('client_id', savedClientId);
    if (validatedData.household.members && validatedData.household.members.length > 0) {
      const members = validatedData.household.members.map(m => ({
        client_id: savedClientId,
        first_name: m.name.split(' ')[0],
        last_name: m.name.split(' ').slice(1).join(' ') || '',
        relationship: m.relationship,
        date_of_birth: m.dateOfBirth || null,
      }));
      const { error: hmError } = await supabase.from('household_members').insert(members);
      if (hmError) console.error("Error saving household members:", hmError);
    }

    // 6. Handle Intake Completion Tracking
    if (savedClientId) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', savedClientId)
        .single();

      // Check if the current user is staff
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isStaff = userProfile?.role && ['admin', 'case_manager', 'staff'].includes(userProfile.role);
      const isOwnProfile = clientData?.portal_user_id === user.id;

      // Mark intake complete if: (client submitting own OR staff submitting) AND not already completed
      if (clientData && (isOwnProfile || isStaff) && !clientData.intake_completed_at) {
        await supabase
          .from('clients')
          .update({ intake_completed_at: now })
          .eq('id', savedClientId);

        // Also complete the task
        await completeTaskByTitle(savedClientId, "Complete Full Intake Form");
      }
    }

    return { success: true, clientId: savedClientId };
  } catch (error) {
    console.error("Error saving client:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save client",
    };
  }
}


export async function getClientFullData(clientId: string) {
  try {
    const supabase = await createClient();

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        *,
        case_management (*),
        demographics (*),
        emergency_contacts (*),
        household_members (*)
      `)
      .eq('id', clientId)
      .single();

    if (clientError) {
      return { success: false, error: clientError.message };
    }

    // Map database structure to ClientIntakeForm schema
    const formData: ClientIntakeForm = {
      participantDetails: {
        firstName: client.first_name,
        middleName: client.middle_name || "",
        lastName: client.last_name,
        dateOfBirth: client.date_of_birth || "",
        ssn: "", // SSN is not retrieved for security
        email: client.email || "",
        primaryPhone: client.phone || "",
        secondaryPhone: client.alternate_phone || "",
        streetAddress: client.street_address || "",
        city: client.city || "",
        state: client.state || "",
        county: "", // County not in clients table directly
        zipCode: client.zip_code || "",
      },
      emergencyContacts: client.emergency_contacts.map((ec: { name: string; relationship?: string; phone: string; email?: string }) => ({
        name: ec.name,
        relationship: ec.relationship || "",
        phone: ec.phone,
        email: ec.email || "",
      })),
      caseManagement: {
        clientManager: client.assigned_case_manager || "",
        clientStatus: client.status || "",
        engagementLetterSigned: false, // Placeholder
        hmisUniqueId: client.case_management?.client_id_number || "",
        ssnLastFour: client.ssn_last_four || "",
        housingStatus: client.case_management?.housing_status || "",
        primaryLanguage: client.case_management?.primary_language || "",
        secondaryLanguage: client.case_management?.secondary_language || "",
        additionalAddressInfo: client.case_management?.notes || "",
        viSpdatScore: client.case_management?.vi_spdat_score || null,
        preferredId: "",
        calFreshMediCalId: "",
        calFreshMediCalPartnerMonth: "",
        race: client.case_management?.race || [],
        healthInsurance: client.case_management?.health_insurance || false,
        healthInsuranceType: client.case_management?.health_insurance_type || "",
        nonCashBenefits: client.case_management?.non_cash_benefits || [],
        healthStatus: client.case_management?.health_status || "",
      },
      demographics: {
        race: client.demographics?.race || [],
        genderIdentity: client.demographics?.gender || "",
        ethnicity: client.demographics?.ethnicity || "",
        maritalStatus: client.demographics?.marital_status || "",
        language: client.case_management?.primary_language || "",
        employmentStatus: client.demographics?.employment_status || "",
        monthlyIncome: client.demographics?.monthly_income ?? null,
        incomeSource: client.demographics?.income_source || "",
        veteranStatus: client.demographics?.veteran_status || false,
        disabilityStatus: client.demographics?.disability_status || false,
      },
      household: {
        members: client.household_members.map((hm: { id: string; first_name: string; last_name: string; relationship?: string; date_of_birth?: string }) => ({
          id: hm.id,
          name: `${hm.first_name} ${hm.last_name}`,
          relationship: hm.relationship,
          dateOfBirth: hm.date_of_birth || "",
          gender: "",
          race: [],
        })),
      },
    };

    return { success: true, data: formData };
  } catch (error) {
    console.error("Error fetching full client data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch client data",
    };
  }
}

export async function getClient(clientId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching client:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch client",
    };
  }
}

export async function getAllClients() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    interface ClientQueryResult {
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      status: string | null;
      created_at: string;
      updated_at: string;
    }

    const clients = (data as unknown as ClientQueryResult[])?.map((client) => ({
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      email: client.email || "",
      phone: client.phone || "",
      status: client.status || "pending",
      createdAt: client.created_at,
      updatedAt: client.updated_at,
    })) || [];

    return { success: true, data: clients };
  } catch (error) {
    console.error("Error fetching clients:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
    };
  }
}

export async function deleteClient(clientId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting client:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete client",
    };
  }
}

export async function getClientByUserId(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .eq('portal_user_id', userId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching client by user ID:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch client",
    };
  }
}