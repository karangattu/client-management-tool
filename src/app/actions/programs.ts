"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cacheReadOnly } from "@/app/actions/cache";

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
const getProgramsCached = cacheReadOnly(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');

    if (error) throw error;

    return data as Program[];
}, ['programs', 'active'], 120);

export async function getPrograms() {
    try {
        const data = await getProgramsCached();
        return { success: true, data };
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

        // Check if client intake is complete and status is active
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('status, intake_completed_at')
            .eq('id', params.clientId)
            .single();

        if (clientError) {
            throw new Error("Failed to verify client eligibility");
        }

        if (!client.intake_completed_at) {
            return {
                success: false,
                error: "Cannot add program: Client intake form must be completed first"
            };
        }

        if (client.status !== 'active') {
            return {
                success: false,
                error: `Cannot add program: Client status must be "active" (current status: ${client.status})`
            };
        }

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

        // AUTO-CREATE TASKS FROM PROGRAM TEMPLATES
        const { data: templates, error: templateError } = await supabase
            .from('program_tasks')
            .select('*')
            .eq('program_id', params.programId);

        if (templateError) {
            console.error("Error fetching program task templates:", templateError);
        }

        let tasksCreated = 0;
        if (templates && templates.length > 0) {
            console.log(`[upsertEnrollment] Creating ${templates.length} tasks from templates for program ${params.programId}`);
            
            const tasksToCreate = templates.map(t => {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (t.days_due_offset || 7));

                return {
                    title: t.title,
                    description: t.description,
                    client_id: params.clientId,
                    program_id: params.programId,
                    priority: t.priority || 'medium',
                    status: 'pending',
                    assigned_to: params.volunteerId || user?.id,
                    assigned_by: user?.id,
                    due_date: dueDate.toISOString(),
                    category: 'program',
                    created_at: new Date().toISOString()
                };
            });

            const { data: createdTasks, error: taskError } = await supabase
                .from('tasks')
                .insert(tasksToCreate)
                .select('id');
            
            if (taskError) {
                console.error("Failed to auto-create program tasks:", taskError);
                console.error("Task creation error details:", taskError.code, taskError.message, taskError.details);
            } else {
                tasksCreated = createdTasks?.length || 0;
                console.log(`[upsertEnrollment] Successfully created ${tasksCreated} tasks`);
            }
        } else {
            console.log(`[upsertEnrollment] No task templates found for program ${params.programId}`);
        }

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

/**
 * Program Task Management
 */

export interface ProgramTask {
    id: string;
    program_id: string;
    title: string;
    description: string | null;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    days_due_offset: number;
    is_required: boolean;
}

export async function getProgramTasks(programId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('program_tasks')
            .select('*')
            .eq('program_id', programId)
            .order('days_due_offset', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as ProgramTask[] };
    } catch (error) {
        console.error("Error fetching program tasks:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch tasks" };
    }
}

export async function addProgramTask(params: {
    programId: string;
    title: string;
    description?: string;
    priority: string;
    daysDueOffset: number;
    isRequired: boolean;
}) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('program_tasks')
            .insert({
                program_id: params.programId,
                title: params.title,
                description: params.description || null,
                priority: params.priority,
                days_due_offset: params.daysDueOffset,
                is_required: params.isRequired
            })
            .select()
            .single();

        if (error) throw error;
        revalidatePath('/admin/programs');
        return { success: true, data };
    } catch (error) {
        console.error("Error adding program task:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to add task" };
    }
}

export async function deleteProgramTask(taskId: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('program_tasks')
            .delete()
            .eq('id', taskId);

        if (error) throw error;
        revalidatePath('/admin/programs');
        return { success: true };
    } catch (error) {
        console.error("Error deleting program task:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete task" };
    }
}

export async function updateProgramTask(params: {
    taskId: string;
    title?: string;
    description?: string;
    priority?: string;
    daysDueOffset?: number;
    isRequired?: boolean;
}) {
    try {
        const supabase = await createClient();

        const updates: Record<string, string | number | boolean | null> = {};
        if (params.title !== undefined) updates.title = params.title;
        if (params.description !== undefined) updates.description = params.description || null;
        if (params.priority !== undefined) updates.priority = params.priority;
        if (params.daysDueOffset !== undefined) updates.days_due_offset = params.daysDueOffset;
        if (params.isRequired !== undefined) updates.is_required = params.isRequired;

        const { data, error } = await supabase
            .from('program_tasks')
            .update(updates)
            .eq('id', params.taskId)
            .select()
            .single();

        if (error) throw error;
        revalidatePath('/admin/programs');
        return { success: true, data };
    } catch (error) {
        console.error("Error updating program task:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to update task" };
    }
}