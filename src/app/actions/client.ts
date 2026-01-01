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

    const id = clientId; // If no ID provided, database will generate UUID
    const now = new Date().toISOString();

    // Flatten the form data to match the clients table schema
    const clientRecord: Record<string, unknown> = {
      first_name: validatedData.participantDetails.firstName,
      middle_name: validatedData.participantDetails.middleName || null,
      last_name: validatedData.participantDetails.lastName,
      preferred_name: null, // Form doesn't have preferred_name field, set to null
      date_of_birth: validatedData.participantDetails.dateOfBirth || null,
      email: validatedData.participantDetails.email || null,
      phone: validatedData.participantDetails.primaryPhone || null,
      alternate_phone: validatedData.participantDetails.secondaryPhone || null,
      street_address: validatedData.participantDetails.streetAddress || null,
      apartment_unit: null,
      city: validatedData.participantDetails.city || null,
      state: validatedData.participantDetails.state || null,
      zip_code: validatedData.participantDetails.zipCode || null,
      mailing_same_as_physical: true, // Default to true as per schema
      mailing_street_address: null, // Not collected in current form
      mailing_city: null,
      mailing_state: null,
      mailing_zip_code: null,
      ssn_last_four: validatedData.caseManagement.ssnLastFour || null,
      status: (validatedData.caseManagement.clientStatus && ['active', 'inactive', 'pending', 'archived'].includes(validatedData.caseManagement.clientStatus))
        ? validatedData.caseManagement.clientStatus
        : 'pending',
      has_portal_access: false, // Default to false, enable later if needed
      assigned_case_manager: validatedData.caseManagement.clientManager || null,
      updated_at: now,
      created_by: user.id,
    };

    // Add ID if updating existing client
    if (id) {
      clientRecord.id = id;
    }

    // 1. Upsert client record
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .upsert(clientRecord, { onConflict: 'id' })
      .select();

    if (clientError) {
      console.error("Error saving client:", clientError);
      return { success: false, error: clientError.message };
    }

    const savedClientId = clientData[0].id;

    // 2. Upsert Case Management
    const { error: cmError } = await supabase
      .from('case_management')
      .upsert({
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
      }, { onConflict: 'client_id' });

    if (cmError) console.error("Error saving case management:", cmError);

    // 3. Upsert Demographics
    const { error: demoError } = await supabase
      .from('demographics')
      .upsert({
        client_id: savedClientId,
        gender: validatedData.demographics.genderIdentity || null,
        ethnicity: validatedData.demographics.ethnicity || null,
        race: validatedData.demographics.race || [],
        marital_status: validatedData.demographics.maritalStatus || null,
        employment_status: validatedData.demographics.employmentStatus || null,
        monthly_income: validatedData.demographics.monthlyIncome ? parseFloat(validatedData.demographics.monthlyIncome.replace(/[^0-9.]/g, '')) || 0 : 0,
        income_source: validatedData.demographics.incomeSource || null,
        veteran_status: validatedData.demographics.veteranStatus || false,
        disability_status: validatedData.demographics.disabilityStatus || false,
        updated_at: now,
      }, { onConflict: 'client_id' });

    if (demoError) console.error("Error saving demographics:", demoError);

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

      // If it's a client saving their own profile and hasn't finished intake yet
      if (clientData && clientData.portal_user_id === user.id && !clientData.intake_completed_at) {
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
      emergencyContacts: client.emergency_contacts.map((ec: any) => ({
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
        monthlyIncome: client.demographics?.monthly_income?.toString() || "",
        incomeSource: client.demographics?.income_source || "",
        veteranStatus: client.demographics?.veteran_status || false,
        disabilityStatus: client.demographics?.disability_status || false,
      },
      household: {
        members: client.household_members.map((hm: any) => ({
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