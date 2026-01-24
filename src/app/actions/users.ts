"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cacheReadOnly } from "@/app/actions/cache";
import type { UserRole } from "@/lib/auth-context";

interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

interface CreateUserResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function createUser(data: CreateUserData): Promise<CreateUserResult> {
  try {
    // Get the current user to verify they're an admin
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if current user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: "Only admins can create users" };
    }

    // Use service role client for admin operations
    let serviceClient;
    try {
      serviceClient = createServiceClient();
    } catch {
      // If service role key not available, fall back to regular signup
      console.warn('Service role key not available, using regular signup');

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
          },
        },
      });

      if (signUpError) {
        return { success: false, error: signUpError.message };
      }

      if (!authData.user) {
        return { success: false, error: "Failed to create auth user" };
      }

      // Insert/update profile - use upsert in case trigger already created it
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          is_active: true,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { success: false, error: `Profile creation failed: ${profileError.message}` };
      }

      // Log the action
      await supabase.from('audit_log').insert({
        user_id: currentUser.id,
        action: 'user_created',
        table_name: 'profiles',
        record_id: authData.user.id,
        new_values: { email: data.email, role: data.role },
      });

      return { success: true, userId: authData.user.id };
    }

    // Create auth user with service role (bypasses email confirmation)
    const { data: authData, error: createError } = await serviceClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm email since admin is creating the account
      user_metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
      },
    });

    if (createError) {
      return { success: false, error: createError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create auth user" };
    }

    // Create or update profile with service role (bypasses RLS)
    // Note: A trigger may have already created a profile with default 'client' role,
    // so we use upsert to ensure the correct role is set
    const { error: profileError, data: profileData } = await serviceClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        is_active: true,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      console.error('Profile creation error code:', profileError.code);
      console.error('Profile creation error details:', profileError.details);
      // Try to clean up the auth user if profile creation fails
      try {
        await serviceClient.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupErr) {
        console.error('Error cleaning up auth user:', cleanupErr);
      }
      return { success: false, error: `Profile creation failed: ${profileError.message}` };
    }

    console.log('Profile created successfully:', profileData);

    // Log the action using regular client
    await supabase.from('audit_log').insert({
      user_id: currentUser.id,
      action: 'user_created',
      table_name: 'profiles',
      record_id: authData.user.id,
      new_values: { email: data.email, role: data.role },
    });

    return { success: true, userId: authData.user.id };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}

export async function archiveUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if current user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: "Only admins can archive users" };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: currentUser.id,
      action: 'user_archived',
      table_name: 'profiles',
      record_id: userId,
    });

    return { success: true };
  } catch (error) {
    console.error("Error archiving user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive user",
    };
  }
}

const getAllUsersCached = cacheReadOnly(async () => {
  // Use service client to bypass RLS and get all staff members
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, is_active, created_at")
    .neq("role", "client")  // Only get staff, not clients
    .eq("is_active", true)  // Only active users
    .order("first_name");

  if (error) throw error;

  return data;
}, ['profiles', 'all-users'], 60);

export async function getAllUsers() {
  try {
    const data = await getAllUsersCached();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch users" };
  }
}

export async function getCurrentUserProfile() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: profile };
  } catch (error) {
    console.error("Error fetching current user profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch profile",
    };
  }
}
