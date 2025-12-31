"use server";

import type { ClientIntakeForm } from "@/lib/schemas/validation";
import { clientIntakeSchema } from "@/lib/schemas/validation";
import { createClient } from "@/lib/supabase/server";

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
      preferred_name: validatedData.participantDetails.firstName || null,
      date_of_birth: validatedData.participantDetails.dateOfBirth || null,
      email: validatedData.participantDetails.email || null,
      phone: validatedData.participantDetails.primaryPhone || null,
      alternate_phone: validatedData.participantDetails.secondaryPhone || null,
      street_address: validatedData.participantDetails.streetAddress || null,
      apartment_unit: null,
      city: validatedData.participantDetails.city || null,
      state: validatedData.participantDetails.state || null,
      zip_code: validatedData.participantDetails.zipCode || null,
      ssn_last_four: validatedData.caseManagement.ssnLastFour || null,
      status: validatedData.caseManagement.clientStatus || 'pending',
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
        housing_status: validatedData.caseManagement.housingStatus || 'unknown',
        primary_language: validatedData.caseManagement.primaryLanguage || 'English',
        secondary_language: validatedData.caseManagement.secondaryLanguage || null,
        vi_spdat_score: validatedData.caseManagement.viSpdatScore || null,
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

    return { success: true, clientId: savedClientId };
  } catch (error) {
    console.error("Error saving client:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save client",
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
