"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type InteractionType = 'note' | 'call' | 'meeting' | 'email' | 'status_change' | 'other';

interface LogInteractionParams {
    clientId: string;
    actionType: InteractionType;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Logs a new client interaction in the client_history table.
 */
export async function logClientInteraction(params: LogInteractionParams) {
    try {
        const supabase = await createClient();

        // Get current user (staff member)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: "User not authenticated" };
        }

        const { data, error } = await supabase
            .from('client_history')
            .insert({
                client_id: params.clientId,
                user_id: user.id,
                action_type: params.actionType,
                title: params.title,
                description: params.description,
                metadata: params.metadata || {},
            })
            .select()
            .single();

        if (error) throw error;

        // Revalidate relevant paths
        revalidatePath(`/clients/${params.clientId}`);
        revalidatePath('/dashboard');

        return { success: true, data };
    } catch (error) {
        console.error("Error logging client interaction:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to log interaction" };
    }
}

/**
 * Fetches the interaction history for a specific client.
 */
export async function getClientHistory(clientId: string) {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('client_history')
            .select(`
                *,
                profiles (
                    first_name,
                    last_name
                )
            `)
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error("Error fetching client history:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to fetch interaction history" };
    }
}
