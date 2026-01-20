"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Get a signed URL for a document using service role (bypasses RLS)
 * This is needed because storage RLS policies may be restrictive
 */
export async function getDocumentSignedUrlAction(
  filePath: string,
  bucket: string = 'client-documents',
  expiresIn: number = 3600
): Promise<{ url: string | null; error: string | null }> {
  try {
    // First verify user is authenticated and has staff role
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { url: null, error: 'Not authenticated' };
    }
    
    // Check if user has staff role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || !['admin', 'case_manager', 'staff'].includes(profile.role)) {
      // For clients, verify they own the document
      const clientIdFromPath = filePath.split('/')[0];
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('portal_user_id', user.id)
        .eq('id', clientIdFromPath)
        .single();
      
      if (!client) {
        return { url: null, error: 'Access denied' };
      }
    }
    
    // Use service client to get signed URL (bypasses storage RLS)
    let serviceClient;
    try {
      serviceClient = createServiceClient();
    } catch {
      // Fall back to regular client if service key not available
      console.warn('Service key not available, using regular client');
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return { url: null, error: error.message };
      }
      return { url: data?.signedUrl || null, error: null };
    }
    
    const { data, error } = await serviceClient.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL with service client:', error);
      return { url: null, error: error.message };
    }
    
    return { url: data?.signedUrl || null, error: null };
  } catch (err) {
    console.error('Error in getDocumentSignedUrlAction:', err);
    return { url: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
