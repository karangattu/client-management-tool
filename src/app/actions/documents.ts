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

/**
 * Fetch documents with cursor-based pagination
 */
export async function getDocumentsWithCursor(options: {
  limit?: number;
  cursor?: string;
  statusFilter?: string;
  typeFilter?: string;
  clientFilter?: string;
}) {
  try {
    const supabase = await createClient();
    const limit = options.limit || 50;
    
    let query = supabase
      .from('documents')
      .select(`
        id,
        file_name,
        document_type,
        status,
        client_id,
        created_at,
        verified_by,
        verified_at,
        file_path,
        rejection_reason,
        clients (first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (options.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    if (options.statusFilter && options.statusFilter !== 'all') {
      query = query.eq('status', options.statusFilter);
    }

    if (options.typeFilter && options.typeFilter !== 'all') {
      query = query.eq('document_type', options.typeFilter);
    }

    if (options.clientFilter && options.clientFilter !== 'all') {
      query = query.eq('client_id', options.clientFilter);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: [], hasMore: false };
    }

    const hasMore = (data?.length || 0) > limit;
    const documents = data?.slice(0, limit) || [];
    const nextCursor = documents.length > 0 ? documents[documents.length - 1].created_at : null;

    return {
      success: true,
      data: documents,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    console.error("Error fetching documents with cursor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch documents",
      data: [],
      hasMore: false,
    };
  }
}

/**
 * Get all clients for document filter dropdown
 */
export async function getAllClientsForDocuments() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .order('first_name', { ascending: true });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching clients for documents:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
      data: [],
    };
  }
}
