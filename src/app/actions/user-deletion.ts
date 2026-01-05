"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

interface DeletionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Delete a user and all associated data (documents, records, auth account)
 * Only admins can perform this action
 * Handles both staff/volunteer users and clients
 */
export async function deleteUserAndData(
  userIdToDelete: string
): Promise<DeletionResult> {
  try {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!currentProfile || currentProfile.role !== "admin") {
      return { success: false, error: "Only admins can delete users" };
    }

    // Prevent admins from deleting themselves
    if (userIdToDelete === currentUser.id) {
      return { success: false, error: "Cannot delete your own admin account" };
    }

    // Get service role client for admin operations
    let db: ReturnType<typeof createServiceClient>;
    try {
      db = createServiceClient();
    } catch {
      console.error("Service role key not available");
      return {
        success: false,
        error: "Service role credentials not available for deletion",
      };
    }

    // Get user profile to check role and find linked client record
    const { data: userProfile } = await db
      .from("profiles")
      .select("id, role, email, first_name, last_name")
      .eq("id", userIdToDelete)
      .single();

    if (!userProfile) {
      return { success: false, error: "User not found" };
    }

    // Find linked client record if user is a client
    let clientId: string | null = null;
    if (userProfile.role === "client") {
      const { data: clientData } = await db
        .from("clients")
        .select("id")
        .eq("portal_user_id", userIdToDelete)
        .single();

      clientId = clientData?.id || null;

      // If client, delete all documents and storage files
      if (clientId) {
        try {
          // List and delete files from client-documents bucket
          const { data: files } = await db.storage
            .from("client-documents")
            .list(`${clientId}`);

          if (files && files.length > 0) {
            const filePaths = files.map((f: { name: string }) => `${clientId}/${f.name}`);
            await db.storage.from("client-documents").remove(filePaths);
          }

          // List and delete signature files
          const { data: signatures } = await db.storage
            .from("signatures")
            .list(userIdToDelete);

          if (signatures && signatures.length > 0) {
            const sigPaths = signatures.map((s: { name: string }) => `${userIdToDelete}/${s.name}`);
            await db.storage.from("signatures").remove(sigPaths);
          }
        } catch (storageError) {
          console.error("Error deleting storage files:", storageError);
          // Continue with data deletion even if storage cleanup fails
        }

        // Delete database records for client
        await db.from("tasks").delete().eq("client_id", clientId);
        await db.from("calendar_events").delete().eq("client_id", clientId);
        await db.from("documents").delete().eq("client_id", clientId);
        await db.from("case_management").delete().eq("client_id", clientId);
        await db.from("household_members").delete().eq("client_id", clientId);
        await db.from("emergency_contacts").delete().eq("client_id", clientId);
        await db.from("demographics").delete().eq("client_id", clientId);
        await db.from("client_benefits").delete().eq("client_id", clientId);

        // Delete client record
        await db.from("clients").delete().eq("id", clientId);
      }
    } else {
      // For staff/volunteer users, delete associated records
      await db.from("tasks").delete().eq("created_by", userIdToDelete);
      await db.from("tasks").delete().eq("assigned_to", userIdToDelete);
    }

    // Delete audit logs related to this user
    const { error: auditError } = await db
      .from("audit_log")
      .delete()
      .or(`user_id.eq.${userIdToDelete},record_id.eq.${userIdToDelete}`);

    if (auditError && auditError.code !== "PGRST116") {
      console.warn("Error deleting audit logs:", auditError);
    }

    // Delete auth user (cascades to profile)
    const { error: authDeleteError } = await db.auth.admin.deleteUser(
      userIdToDelete
    );

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      return {
        success: false,
        error: `Failed to delete user account: ${authDeleteError.message}`,
      };
    }

    // Log the deletion action
    await db.from("audit_log").insert({
      user_id: currentUser.id,
      action: "user_deleted",
      table_name: "profiles",
      record_id: userIdToDelete,
      new_values: {
        email: userProfile.email,
        role: userProfile.role,
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        deleted_at: new Date().toISOString(),
      },
    });

    console.log(
      `[${new Date().toISOString()}] User ${userProfile.email} (${userProfile.role}) deleted by admin ${currentUser.email}`
    );

    return {
      success: true,
      message: `User ${userProfile.first_name} ${userProfile.last_name} (${userProfile.role}) and all associated data have been permanently deleted.`,
    };
  } catch (error) {
    console.error("Error in deleteUserAndData:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Delete a client record and all associated data (without requiring auth user)
 * This is for deleting client records created by staff that may not have portal accounts
 * Only admins can perform this action
 */
export async function deleteClientRecord(
  clientId: string
): Promise<DeletionResult> {
  try {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!currentProfile || currentProfile.role !== "admin") {
      return { success: false, error: "Only admins can delete clients" };
    }

    // Get service role client for admin operations
    let db: ReturnType<typeof createServiceClient>;
    try {
      db = createServiceClient();
    } catch {
      console.error("Service role key not available");
      return {
        success: false,
        error: "Service role credentials not available for deletion",
      };
    }

    // Get client record
    const { data: clientRecord } = await db
      .from("clients")
      .select("id, first_name, last_name, email, portal_user_id")
      .eq("id", clientId)
      .single();

    if (!clientRecord) {
      return { success: false, error: "Client not found" };
    }

    // Delete storage files
    try {
      // List and delete files from client-documents bucket
      const { data: files } = await db.storage
        .from("client-documents")
        .list(`${clientId}`);

      if (files && files.length > 0) {
        const filePaths = files.map((f: { name: string }) => `${clientId}/${f.name}`);
        await db.storage.from("client-documents").remove(filePaths);
      }

      // List and delete signature files if portal user exists
      if (clientRecord.portal_user_id) {
        const { data: signatures } = await db.storage
          .from("signatures")
          .list(clientRecord.portal_user_id);

        if (signatures && signatures.length > 0) {
          const sigPaths = signatures.map((s: { name: string }) => `${clientRecord.portal_user_id}/${s.name}`);
          await db.storage.from("signatures").remove(sigPaths);
        }
      }
    } catch (storageError) {
      console.error("Error deleting storage files:", storageError);
      // Continue with data deletion even if storage cleanup fails
    }

    // Delete database records in correct order
    await db.from("tasks").delete().eq("client_id", clientId);
    await db.from("calendar_events").delete().eq("client_id", clientId);
    await db.from("documents").delete().eq("client_id", clientId);
    await db.from("case_management").delete().eq("client_id", clientId);
    await db.from("household_members").delete().eq("client_id", clientId);
    await db.from("emergency_contacts").delete().eq("client_id", clientId);
    await db.from("demographics").delete().eq("client_id", clientId);
    await db.from("client_benefits").delete().eq("client_id", clientId);

    // Delete client record
    await db.from("clients").delete().eq("id", clientId);

    // Delete audit logs for this client
    const { error: auditError } = await db
      .from("audit_log")
      .delete()
      .eq("record_id", clientId);

    if (auditError && auditError.code !== "PGRST116") {
      console.warn("Error deleting audit logs:", auditError);
    }

    // Log the deletion action
    await db.from("audit_log").insert({
      user_id: currentUser.id,
      action: "client_deleted",
      table_name: "clients",
      record_id: clientId,
      new_values: {
        email: clientRecord.email,
        first_name: clientRecord.first_name,
        last_name: clientRecord.last_name,
        deleted_at: new Date().toISOString(),
      },
    });

    console.log(
      `[${new Date().toISOString()}] Client ${clientRecord.first_name} ${clientRecord.last_name} (ID: ${clientId}) deleted by admin ${currentUser.email}`
    );

    return {
      success: true,
      message: `Client ${clientRecord.first_name} ${clientRecord.last_name} and all associated data have been permanently deleted.`,
    };
  } catch (error) {
    console.error("Error in deleteClientRecord:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }}
