"use server";

import { createClient } from "@/lib/supabase/server";

export async function logClientView(clientId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Check if we already logged this view recently to avoid spamming logs?
    // For now, simple logging on every page load (which matches "opened").

    try {
        const { error } = await supabase.from("audit_log").insert({
            user_id: user.id,
            action: "VIEW_CLIENT_PROFILE", // Explicit action name
            table_name: "clients",
            record_id: clientId,
            // Metadata could be added if schema supports jsonb column 'new_values' or similar
            // Reusing 'new_values' for metadata is common pattern if no exact 'metadata' column
            new_values: { viewed_at: new Date().toISOString() }
        });

        if (error) {
            console.error("Failed to log client view:", error);
        }
    } catch (err) {
        console.error("Error in logClientView:", err);
    }
}
