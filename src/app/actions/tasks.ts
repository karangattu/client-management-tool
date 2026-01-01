"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface CreateTaskParams {
    title: string;
    description?: string;
    clientId?: string;
    assignedTo?: string;
    priority?: TaskPriority;
    dueDate?: string;
    category?: string;
}

export async function createTask(params: CreateTaskParams) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                title: params.title,
                description: params.description,
                client_id: params.clientId,
                assigned_to: params.assignedTo,
                assigned_by: user?.id,
                priority: params.priority || 'medium',
                due_date: params.dueDate,
                category: params.category,
                status: 'pending',
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/dashboard');
        revalidatePath('/tasks');
        if (params.clientId) revalidatePath(`/clients/${params.clientId}`);

        return { success: true, data };
    } catch (error) {
        console.error("Error creating task:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create task" };
    }
}

export async function completeTaskByTitle(clientId: string, title: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('client_id', clientId)
            .eq('title', title)
            .eq('status', 'pending');

        if (error) throw error;

        revalidatePath('/dashboard');
        revalidatePath(`/clients/${clientId}`);

        return { success: true };
    } catch (error) {
        console.error("Error completing task:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to complete task" };
    }
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, clientId?: string) {
    try {
        const supabase = await createClient();

        const updateData: any = { status };
        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
        } else {
            updateData.completed_at = null;
        }

        const { error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', taskId);

        if (error) throw error;

        revalidatePath('/dashboard');
        revalidatePath('/tasks');
        if (clientId) revalidatePath(`/clients/${clientId}`);

        return { success: true };
    } catch (error) {
        console.error("Error updating task status:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to update task status" };
    }
}

export async function completeTask(taskId: string) {
    return updateTaskStatus(taskId, 'completed');
}

export async function claimTask(taskId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("User not authenticated");

        const { error } = await supabase
            .from('tasks')
            .update({
                assigned_to: user.id,
                status: 'in_progress',
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) throw error;

        revalidatePath('/dashboard');
        revalidatePath('/tasks');

        return { success: true };
    } catch (error) {
        console.error("Error claiming task:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to claim task" };
    }
}

export async function assignTask(taskId: string, userId: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('tasks')
            .update({
                assigned_to: userId,
                status: 'in_progress',
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) throw error;

        revalidatePath('/dashboard');
        revalidatePath('/tasks');

        return { success: true };
    } catch (error) {
        console.error("Error assigning task:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to assign task" };
    }
}
