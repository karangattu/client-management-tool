import { createClient } from './client';
import type { Document } from '@/lib/types';

const supabase = createClient();

// Storage bucket names
export const BUCKETS = {
  PROFILE_PICTURES: 'profile-pictures',
  CLIENT_DOCUMENTS: 'client-documents',
  SIGNATURES: 'signatures',
} as const;

// Allowed file types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Max file sizes (in bytes)
export const MAX_FILE_SIZES = {
  PROFILE_PICTURE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 25 * 1024 * 1024, // 25MB
  SIGNATURE: 1 * 1024 * 1024, // 1MB
};

/**
 * Upload a profile picture for a user or client
 */
export async function uploadProfilePicture(
  file: File,
  userId: string,
  type: 'user' | 'client' = 'user'
): Promise<{ url: string | null; error: string | null }> {
  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { url: null, error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.' };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZES.PROFILE_PICTURE) {
    return { url: null, error: 'File too large. Maximum size is 5MB.' };
  }

  // Generate unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${type}/${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(BUCKETS.PROFILE_PICTURES)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading profile picture:', error);
    return { url: null, error: error.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKETS.PROFILE_PICTURES)
    .getPublicUrl(data.path);

  return { url: urlData.publicUrl, error: null };
}

/**
 * Upload a client document
 */
export async function uploadClientDocument(
  file: File,
  clientId: string,
  documentType: Document['document_type'],
  description?: string
): Promise<{ document: Partial<Document> | null; error: string | null }> {
  // Validate file type
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type) && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { document: null, error: 'Invalid file type. Please upload a PDF, Word document, Excel file, or image.' };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZES.DOCUMENT) {
    return { document: null, error: 'File too large. Maximum size is 25MB.' };
  }

  // Generate unique file path
  const fileName = `${clientId}/${documentType}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from(BUCKETS.CLIENT_DOCUMENTS)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading document:', error);
    return { document: null, error: error.message };
  }

  // Create document record
  const documentRecord: Partial<Document> = {
    client_id: clientId,
    document_type: documentType,
    file_name: file.name,
    file_path: data.path,
    file_size: file.size,
    mime_type: file.type,
    description,
  };

  return { document: documentRecord, error: null };
}

/**
 * Upload a signature image
 */
export async function uploadSignature(
  signatureDataUrl: string,
  clientId: string,
  signatureRequestId: string
): Promise<{ path: string | null; error: string | null }> {
  // Convert data URL to blob
  const response = await fetch(signatureDataUrl);
  const blob = await response.blob();

  // Validate file size
  if (blob.size > MAX_FILE_SIZES.SIGNATURE) {
    return { path: null, error: 'Signature image too large.' };
  }

  // Generate file path
  const fileName = `${clientId}/${signatureRequestId}.png`;

  const { data, error } = await supabase.storage
    .from(BUCKETS.SIGNATURES)
    .upload(fileName, blob, {
      cacheControl: '31536000', // 1 year - signatures shouldn't change
      upsert: false,
      contentType: 'image/png',
    });

  if (error) {
    console.error('Error uploading signature:', error);
    return { path: null, error: error.message };
  }

  return { path: data.path, error: null };
}

/**
 * Get a signed URL for a private document
 */
export async function getDocumentSignedUrl(
  filePath: string,
  bucket: string = BUCKETS.CLIENT_DOCUMENTS,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  filePath: string,
  bucket: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * List files in a folder
 */
export async function listFiles(
  bucket: string,
  folder: string
): Promise<{ files: Array<{ name: string; id: string; created_at: string }> | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder);

  if (error) {
    console.error('Error listing files:', error);
    return { files: null, error: error.message };
  }

  return {
    files: data.map((file: any) => ({
      name: file.name,
      id: file.id,
      created_at: file.created_at,
    })),
    error: null,
  };
}
