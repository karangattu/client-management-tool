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
      status: validatedData.caseManagement.clientStatus || 'pending',
      updated_at: now,
      created_by: user.id,
    };

    // Add ID if updating existing client
    if (id) {
      clientRecord.id = id;
    }

    // Upsert client record
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .upsert(clientRecord, { onConflict: 'id' })
      .select();

    if (clientError) {
      console.error("Error saving client:", clientError);
      return {
        success: false,
        error: clientError.message || "Failed to save client",
      };
    }

    if (!clientData || clientData.length === 0) {
      return {
        success: false,
        error: "Failed to save client data",
      };
    }

    return { success: true, clientId: clientData[0].id };
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

    const clients = data?.map((client: any) => ({
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      email: client.email,
      phone: client.phone,
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
