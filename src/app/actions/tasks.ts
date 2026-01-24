"use server";

import { createClient } from "@/lib/supabase/server";
import { cacheReadOnly } from "@/app/actions/cache";
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

        // If task is for a client, create an alert and send email notification
        if (params.clientId) {
            try {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('portal_user_id, has_portal_access, first_name, email')
                    .eq('id', params.clientId)
                    .single();

                if (clientData?.portal_user_id && clientData.has_portal_access) {
                    // Create in-app alert
                    await supabase.from('alerts').insert({
                        user_id: clientData.portal_user_id,
                        client_id: params.clientId,
                        task_id: data.id,
                        title: 'New Task Assigned',
                        message: `You have a new task: ${params.title}`,
                        alert_type: 'custom',
                        trigger_at: new Date().toISOString(),
                    });

                    // Send Email Notification via Resend
                    if (process.env.RESEND_API_KEY && clientData.email) {
                        try {
                            const { resend } = await import('@/lib/resend');
                            await resend.emails.send({
                                from: 'Client Portal <onboarding@resend.dev>', // Users should configure this later
                                to: clientData.email,
                                subject: `New Task Assigned: ${params.title}`,
                                html: `
                                    <p>Hi ${clientData.first_name},</p>
                                    <p>A new task has been assigned to you in your client portal:</p>
                                    <p><strong>${params.title}</strong></p>
                                    <p>${params.description || ''}</p>
                                    <p>Please log in to complete this task.</p>
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login">Log in to Portal</a>
                                `
                            });
                            console.log(`Email sent to ${clientData.email}`);
                        } catch (emailError) {
                            console.error("Failed to send email notification:", emailError);
                            // Don't throw, just log. We don't want to break task creation.
                        }
                    }
                }
            } catch (alertError) {
                console.error("Error creating client alert/notification:", alertError);
                // Continue even if alert creation fails
            }
        }

        revalidatePath('/dashboard');
        revalidatePath('/tasks');
        revalidatePath('/my-portal');
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

export async function updateTaskStatus(taskId: string, status: TaskStatus, clientId?: string, completionNote?: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const updateData: { 
            status: TaskStatus; 
            completed_at: string | null; 
            completed_by?: string | null; 
            completed_by_role?: 'client' | 'case_manager' | 'admin' | 'system' | null;
            completion_note?: string | null;
        } = { status, completed_at: null };
        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
            updateData.completed_by = user?.id || null;
            updateData.completed_by_role = user?.id ? 'case_manager' : null;
            updateData.completion_note = completionNote || null;
        } else {
            updateData.completed_at = null;
            updateData.completed_by = null;
            updateData.completed_by_role = null;
            updateData.completion_note = null;
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

export async function completeTask(taskId: string, completionNote?: string) {
    return updateTaskStatus(taskId, 'completed', undefined, completionNote);
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

/**
 * Create initial onboarding tasks for a newly verified client.
 * Called from auth callback after email verification.
 */
export async function createClientOnboardingTasks(clientId: string, userId: string) {
    try {
        const supabase = await createClient();

        // Check if tasks already exist for this client
        const { data: existingTasks } = await supabase
            .from('tasks')
            .select('id, title')
            .eq('client_id', clientId)
            .in('title', ['Complete Intake Form', 'Sign Engagement Letter']);

        if (existingTasks && existingTasks.length >= 2) {
            // Tasks already exist, skip creation
            return { success: true, message: 'Tasks already exist' };
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const tasksToCreate = [];

        // Only create tasks that don't already exist
        const existingTitles = existingTasks?.map(t => t.title) || [];

        if (!existingTitles.includes('Complete Intake Form')) {
            tasksToCreate.push({
                title: 'Complete Intake Form',
                description: 'Please complete all sections of the intake form to help us process your case. This is an essential step for receiving support.',
                client_id: clientId,
                assigned_to: userId,
                status: 'pending',
                priority: 'urgent',
                due_date: dueDate.toISOString(),
                created_by: userId,
                category: 'onboarding',
            });
        }

        if (!existingTitles.includes('Sign Engagement Letter')) {
            tasksToCreate.push({
                title: 'Sign Engagement Letter',
                description: 'Please review and sign the engagement letter to formalize our working relationship.',
                client_id: clientId,
                assigned_to: userId,
                status: 'pending',
                priority: 'urgent',
                due_date: dueDate.toISOString(),
                created_by: userId,
                category: 'onboarding',
            });
        }

        if (tasksToCreate.length > 0) {
            const { error } = await supabase
                .from('tasks')
                .insert(tasksToCreate);

            if (error) throw error;
        }

        revalidatePath('/my-portal');

        return { success: true };
    } catch (error) {
        console.error("Error creating onboarding tasks:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to create onboarding tasks" };
    }
}

/**
 * Get tasks assigned to the current client user
 */
const getClientTasksCached = cacheReadOnly(async (userId: string) => {
    const supabase = await createClient();
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_date, category, created_at')
        .eq('assigned_to', userId)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });

    if (error) throw error;

    return tasks || [];
}, ['tasks', 'client'], 45);

export async function getClientTasks() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated', data: [] };
        }

        const data = await getClientTasksCached(user.id);
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching client tasks:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch tasks", data: [] };
    }
}

/**
 * Get alerts for the current user
 */
const getClientAlertsCached = cacheReadOnly(async (userId: string) => {
    const supabase = await createClient();
    const { data: alerts, error } = await supabase
        .from('alerts')
        .select('id, title, message, alert_type, is_read, trigger_at, created_at')
        .eq('user_id', userId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) throw error;

    return alerts || [];
}, ['alerts', 'client'], 45);

export async function getClientAlerts() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated', data: [] };
        }

        const data = await getClientAlertsCached(user.id);
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching client alerts:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch alerts", data: [] };
    }
}

/**
 * Mark an alert as read
 */
export async function markAlertRead(alertId: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('alerts')
            .update({ is_read: true })
            .eq('id', alertId);

        if (error) throw error;

        revalidatePath('/my-portal');
        return { success: true };
    } catch (error) {
        console.error("Error marking alert read:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to mark alert read" };
    }
}

/**
 * Dismiss an alert
 */
export async function dismissAlert(alertId: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('alerts')
            .update({ is_dismissed: true })
            .eq('id', alertId);

        if (error) throw error;

        revalidatePath('/my-portal');
        return { success: true };
    } catch (error) {
        console.error("Error dismissing alert:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to dismiss alert" };
    }
}

/**
 * Fetch tasks with cursor-based pagination
 */
export async function getTasksWithCursor(options: {
  limit?: number;
  cursor?: string; // ISO timestamp
  statusFilter?: string;
  assignedToFilter?: string;
}) {
  try {
    const supabase = await createClient();
    const limit = options.limit || 50;
    
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        client_id,
        assigned_to,
        assigned_by,
        status,
        priority,
        due_date,
        completed_at,
        completed_by,
        completed_by_role,
        category,
        tags,
        created_at,
        updated_at,
        client:clients(first_name, last_name),
        assignee:profiles!tasks_assigned_to_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (options.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    if (options.statusFilter && options.statusFilter !== 'all') {
      query = query.eq('status', options.statusFilter);
    }

    if (options.assignedToFilter && options.assignedToFilter !== 'all') {
      query = query.eq('assigned_to', options.assignedToFilter);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: [], hasMore: false };
    }

    const hasMore = (data?.length || 0) > limit;
    const tasks = data?.slice(0, limit) || [];
    const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

    return {
      success: true,
      data: tasks,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    console.error("Error fetching tasks with cursor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tasks",
      data: [],
      hasMore: false,
    };
  }
}

/**
 * Get all staff members for assignment dropdown
 */
export async function getAllStaff() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .in('role', ['admin', 'case_manager'])
      .order('first_name', { ascending: true });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching staff:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch staff",
      data: [],
    };
  }
}

/**
 * Get all clients for task assignment
 */
export async function getAllClientsForTasks() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name, status')
      .in('status', ['active', 'pending'])
      .order('first_name', { ascending: true });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching clients:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
      data: [],
    };
  }
}
