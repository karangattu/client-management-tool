"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Program {
    id: string;
    name: string;
    category: string;
    description: string;
    requirements: string;
    is_active: boolean;
}

export interface Enrollment {
    id: string;
    client_id: string;
    program_id: string;
    status: 'interested' | 'applying' | 'enrolled' | 'completed' | 'denied' | 'withdrawn';
    start_date: string | null;
    end_date: string | null;
    assigned_volunteer_id: string | null;
    notes: string | null;
    programs: Program;
    volunteer?: {
        first_name: string;
        last_name: string;
    } | null;
}

/**
 * Fetches all active programs.
 */
export async function getPrograms() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('programs')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as Program[] };
    } catch (error) {
        console.error("Error fetching programs:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch programs" };
    }
}

/**
 * Fetches enrollments for a specific client.
 */
export async function getClientEnrollments(clientId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('program_enrollments')
            .select(`
                *,
                programs (*),
                volunteer:profiles!assigned_volunteer_id (first_name, last_name)
            `)
            .eq('client_id', clientId);

        if (error) throw error;
        return { success: true, data: data as Enrollment[] };
    } catch (error) {
        console.error("Error fetching enrollments:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch enrollments" };
    }
}

/**
 * Enrolls a client in a program or updates an existing enrollment.
 */
export async function upsertEnrollment(params: {
    clientId: string;
    programId: string;
    status: string;
    startDate?: string;
    endDate?: string;
    volunteerId?: string | null;
    notes?: string;
}) {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('program_enrollments')
            .upsert({
                client_id: params.clientId,
                program_id: params.programId,
                status: params.status,
                start_date: params.startDate || null,
                end_date: params.endDate || null,
                assigned_volunteer_id: params.volunteerId || null,
                notes: params.notes || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'client_id,program_id'
            })
            .select()
            .single();

        if (error) throw error;

        // Log initial enrollment as activity
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('program_enrollment_activity').insert({
            enrollment_id: data.id,
            old_status: null,
            new_status: params.status,
            changed_by: user?.id,
            notes: 'Initial enrollment'
        });

        revalidatePath(`/clients/${params.clientId}`);

        return { success: true, data };
    } catch (error) {
        console.error("Error upserting enrollment:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to save enrollment" };
    }
}

/**
 * Updates the status of an existing enrollment and logs the change.
 */
export async function updateEnrollmentStatus(params: {
    enrollmentId: string;
    clientId: string;
    oldStatus: string;
    newStatus: string;
    notes?: string;
}) {
    try {
        const supabase = await createClient();

        // Update the enrollment status
        const { error: updateError } = await supabase
            .from('program_enrollments')
            .update({
                status: params.newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', params.enrollmentId);

        if (updateError) throw updateError;

        // Log the status change
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('program_enrollment_activity').insert({
            enrollment_id: params.enrollmentId,
            old_status: params.oldStatus,
            new_status: params.newStatus,
            changed_by: user?.id,
            notes: params.notes || null
        });

        revalidatePath(`/clients/${params.clientId}`);
        return { success: true };
    } catch (error) {
        console.error("Error updating enrollment status:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to update status" };
    }
}

/**
 * Fetches activity log for a specific enrollment.
 */
export async function getEnrollmentActivity(enrollmentId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('program_enrollment_activity')
            .select(`
                *,
                changed_by_profile:profiles!changed_by (first_name, last_name)
            `)
            .eq('enrollment_id', enrollmentId)
            .order('changed_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching enrollment activity:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch activity" };
    }
}

/**
 * Removes an enrollment.
 */
export async function removeEnrollment(enrollmentId: string, clientId: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('program_enrollments')
            .delete()
            .eq('id', enrollmentId);

        if (error) throw error;

        revalidatePath(`/clients/${clientId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting enrollment:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to remove enrollment" };
    }
}
