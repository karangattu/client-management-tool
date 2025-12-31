"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'case_manager' | 'staff' | 'volunteer' | 'client';
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

      // Insert profile - this will work now with the new RLS policy
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          is_active: true,
        });

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

    // Create profile with service role (bypasses RLS)
    const { error: profileError, data: profileData } = await serviceClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        is_active: true,
      });

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

export async function getAllUsers() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch users",
    };
  }
}