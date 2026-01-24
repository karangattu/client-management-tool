"use server";

import { createClient } from "@/lib/supabase/server";
import { cacheReadOnly } from "@/app/actions/cache";
import { clientIntakeSchema, ClientIntakeForm } from "@/lib/schemas/validation";
import { diffAuditValues } from "@/lib/audit-log";


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
        .in('role', ['admin', 'case_manager'])
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
      const { data: existingClient } = await supabase
        .from('clients')
        .select('first_name, middle_name, last_name, date_of_birth, email, phone, alternate_phone, street_address, city, state, zip_code, ssn_last_four, referral_source, referral_source_details')
        .eq('id', id)
        .single();

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
        referral_source: validatedData.participantDetails.referralSource || null,
        referral_source_details: validatedData.participantDetails.referralSourceDetails || null,
        updated_at: now,
      };


      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .select();

      if (clientError) {
        console.error("Error updating client:", clientError);
        return { success: false, error: `Failed to update client: ${clientError.message}. Please ensure you have permission to edit this record.` };
      }

      if (!clientData || clientData.length === 0) {
        return { success: false, error: "Client not found or access denied" };
      }

      const { oldValues, newValues } = diffAuditValues(existingClient || null, updateData);
      if (Object.keys(newValues).length > 0) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'client_intake_updated',
          table_name: 'clients',
          record_id: id,
          old_values: oldValues,
          new_values: newValues,
        });
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
        referral_source: validatedData.participantDetails.referralSource || null,
        referral_source_details: validatedData.participantDetails.referralSourceDetails || null,
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
      .select('id, housing_status, primary_language, secondary_language, needs_interpreter, vi_spdat_score, health_insurance, health_insurance_type, non_cash_benefits, health_status')
      .eq('client_id', savedClientId)
      .maybeSingle();

    if (existingCM) {
      const { error: cmError } = await supabase
        .from('case_management')
        .update(caseManagementData)
        .eq('client_id', savedClientId);
      if (cmError) {
        console.error("Error updating case management:", cmError);
      } else {
        const { oldValues, newValues } = diffAuditValues(existingCM, caseManagementData);
        if (Object.keys(newValues).length > 0) {
          await supabase.from('audit_log').insert({
            user_id: user.id,
            action: 'case_management_updated',
            table_name: 'case_management',
            record_id: existingCM.id,
            old_values: oldValues,
            new_values: newValues,
          });
        }
      }
    } else {
      const { data: cmInsert, error: cmError } = await supabase
        .from('case_management')
        .insert(caseManagementData)
        .select('id')
        .single();
      if (cmError) {
        console.error("Error inserting case management:", cmError);
      } else if (cmInsert?.id) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'case_management_created',
          table_name: 'case_management',
          record_id: cmInsert.id,
          new_values: caseManagementData,
        });
      }
    }

    // 3. Save Demographics (check if exists first)
    const demographicsData = {
      client_id: savedClientId,
      gender: validatedData.demographics.genderIdentity || null,
      ethnicity: validatedData.demographics.ethnicity || null,
      race: validatedData.demographics.race || [],
      marital_status: validatedData.demographics.maritalStatus || null,
      education_level: validatedData.demographics.educationLevel || null,
      employment_status: validatedData.demographics.employmentStatus || null,
      monthly_income: validatedData.demographics.monthlyIncome || 0,
      income_source: validatedData.demographics.incomeSource || null,
      updated_at: now,
    };

    const { data: existingDemo } = await supabase
      .from('demographics')
      .select('id, gender, ethnicity, race, marital_status, education_level, employment_status, monthly_income, income_source')
      .eq('client_id', savedClientId)
      .maybeSingle();

    if (existingDemo) {
      const { error: demoError } = await supabase
        .from('demographics')
        .update(demographicsData)
        .eq('client_id', savedClientId);
      if (demoError) {
        console.error("Error updating demographics:", demoError);
      } else {
        const { oldValues, newValues } = diffAuditValues(existingDemo, demographicsData);
        if (Object.keys(newValues).length > 0) {
          await supabase.from('audit_log').insert({
            user_id: user.id,
            action: 'demographics_updated',
            table_name: 'demographics',
            record_id: existingDemo.id,
            old_values: oldValues,
            new_values: newValues,
          });
        }
      }
    } else {
      const { data: demoInsert, error: demoError } = await supabase
        .from('demographics')
        .insert(demographicsData)
        .select('id')
        .single();
      if (demoError) {
        console.error("Error inserting demographics:", demoError);
      } else if (demoInsert?.id) {
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: 'demographics_created',
          table_name: 'demographics',
          record_id: demoInsert.id,
          new_values: demographicsData,
        });
      }
    }

    // 4. Update Emergency Contacts (Sync)
    const { data: existingContacts } = await supabase
      .from('emergency_contacts')
      .select('name, relationship, phone, email')
      .eq('client_id', savedClientId);

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
      if (ecError) {
        console.error("Error saving emergency contacts:", ecError);
      }
    }

    const nextContacts = validatedData.emergencyContacts.map(c => ({
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      email: c.email || null,
    }));

    const { oldValues: contactOldValues, newValues: contactNewValues } = diffAuditValues(
      { contacts: existingContacts || [] },
      { contacts: nextContacts }
    );

    if (Object.keys(contactNewValues).length > 0) {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'emergency_contacts_updated',
        table_name: 'emergency_contacts',
        record_id: savedClientId,
        old_values: contactOldValues,
        new_values: contactNewValues,
      });
    }

    // 5. Update Household Members (Sync)
    const { data: existingMembers } = await supabase
      .from('household_members')
      .select('first_name, last_name, relationship, date_of_birth')
      .eq('client_id', savedClientId);

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

    const nextMembers = (validatedData.household.members || []).map(m => ({
      first_name: m.name.split(' ')[0],
      last_name: m.name.split(' ').slice(1).join(' ') || '',
      relationship: m.relationship,
      date_of_birth: m.dateOfBirth || null,
    }));

    const { oldValues: memberOldValues, newValues: memberNewValues } = diffAuditValues(
      { members: existingMembers || [] },
      { members: nextMembers }
    );

    if (Object.keys(memberNewValues).length > 0) {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'household_members_updated',
        table_name: 'household_members',
        record_id: savedClientId,
        old_values: memberOldValues,
        new_values: memberNewValues,
      });
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

      const isStaff = userProfile?.role && ['admin', 'case_manager'].includes(userProfile.role);
      const isOwnProfile = clientData?.portal_user_id === user.id;

      // Mark intake complete if: (client submitting own OR staff submitting) AND not already completed
      if (clientData && (isOwnProfile || isStaff) && !clientData.intake_completed_at) {
        await supabase
          .from('clients')
          .update({ intake_completed_at: now })
          .eq('id', savedClientId);
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
        referralSource: client.referral_source || "",
        referralSourceDetails: client.referral_source_details || "",
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
        educationLevel: client.demographics?.education_level || "",
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

const getAllClientsCached = cacheReadOnly(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, phone, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
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

  return (data as unknown as ClientQueryResult[])?.map((client) => ({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`,
    email: client.email || "",
    phone: client.phone || "",
    status: client.status || "pending",
    createdAt: client.created_at,
    updatedAt: client.updated_at,
  })) || [];
}, ['clients', 'all'], 60);

export async function getAllClients() {
  try {
    const clients = await getAllClientsCached();
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

/**
 * Fetch clients with cursor-based pagination for better scalability
 * Uses created_at timestamp as cursor for efficient pagination
 */
export async function getClientsWithCursor(options: {
  limit?: number;
  cursor?: string; // ISO timestamp of last item from previous page
  statusFilter?: string;
  programFilter?: string;
}) {
  try {
    const supabase = await createClient();
    const limit = options.limit || 50;
    
    // Build query with cursor-based pagination
    let query = supabase
      .from('clients')
      .select('*, program_enrollments(*), case_management(*)')
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to determine if there are more pages

    // Apply cursor (fetch records older than cursor timestamp)
    if (options.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    // Apply status filter server-side
    if (options.statusFilter && options.statusFilter !== 'all') {
      query = query.eq('status', options.statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: [], hasMore: false };
    }

    // Check if there are more pages
    const hasMore = (data?.length || 0) > limit;
    const clients = data?.slice(0, limit) || [];
    
    // Get next cursor (created_at of last item)
    const nextCursor = clients.length > 0 ? clients[clients.length - 1].created_at : null;

    return {
      success: true,
      data: clients,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    console.error("Error fetching clients with cursor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
      data: [],
      hasMore: false,
    };
  }
}

/**
 * Fetch programs for filter dropdown
 */
export async function getActivePrograms() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching programs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch programs",
      data: [],
    };
  }
}