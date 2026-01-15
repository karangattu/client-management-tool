-- ============================================
-- SUPABASE STORAGE CONFIGURATION
-- ============================================
-- Run this AFTER creating the storage buckets in Supabase Dashboard
-- 
-- STEP 1: Create buckets in Supabase Dashboard (Storage > New Bucket):
--   1. profile-pictures (Public bucket)
--   2. client-documents (Private bucket)
--   3. signatures (Private bucket)
--
-- STEP 2: Run this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- PROFILE PICTURES BUCKET POLICIES
-- ============================================

-- Allow public read access to profile pictures
DROP POLICY IF EXISTS "Public read access for profile pictures" ON storage.objects;
CREATE POLICY "Public read access for profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Allow authenticated users to upload their own profile picture
DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'profile-pictures'
    AND auth.role() = 'authenticated'
    AND (
        -- user/<user_id>/... or client/<client_id>/...
        (storage.foldername(name))[1] IN ('user', 'client')
        AND (storage.foldername(name))[2] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff')
        )
    )
);

-- Allow users to update their own profile picture
DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'profile-pictures'
    AND auth.role() = 'authenticated'
    AND (
        (storage.foldername(name))[1] IN ('user', 'client')
        AND (storage.foldername(name))[2] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff')
        )
    )
);

-- Allow users to delete their own profile picture
DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;
CREATE POLICY "Users can delete own profile picture"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'profile-pictures'
    AND auth.role() = 'authenticated'
    AND (
        (storage.foldername(name))[1] IN ('user', 'client')
        AND (storage.foldername(name))[2] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff')
        )
    )
);

-- ============================================
-- CLIENT DOCUMENTS BUCKET POLICIES
-- ============================================

-- Staff can view all client documents
CREATE POLICY "Staff can view client documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'client-documents' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff')
    )
);

-- Clients can view their own documents
CREATE POLICY "Clients can view own documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'client-documents' AND
    -- Extract client_id from path (format: client_id/filename)
    EXISTS (
        SELECT 1 FROM clients 
        WHERE portal_user_id = auth.uid() 
        AND id::text = (storage.foldername(name))[1]
    )
);

-- Staff can upload client documents
CREATE POLICY "Staff can upload client documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'client-documents' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff')
    )
);

-- Clients can upload their own documents (self-service)
CREATE POLICY "Clients can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'client-documents' AND
    EXISTS (
        SELECT 1 FROM clients 
        WHERE portal_user_id = auth.uid() 
        AND id::text = (storage.foldername(name))[1]
    )
);

-- Staff can update client documents
CREATE POLICY "Staff can update client documents"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'client-documents' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff')
    )
);

-- Only admins can delete client documents
CREATE POLICY "Admins can delete client documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'client-documents' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- SIGNATURES BUCKET POLICIES
-- ============================================

-- Staff can view signatures
CREATE POLICY "Staff can view signatures"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'signatures' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff')
    )
);

-- Clients can view their own signatures
CREATE POLICY "Clients can view own signatures"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'signatures' AND
    EXISTS (
        SELECT 1 FROM clients 
        WHERE portal_user_id = auth.uid() 
        AND id::text = (storage.foldername(name))[1]
    )
);

-- Staff can upload signatures
CREATE POLICY "Staff can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'signatures' AND
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff')
    )
);

-- Clients can sign documents (upload their signature)
CREATE POLICY "Clients can upload own signature"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'signatures' AND
    EXISTS (
        SELECT 1 FROM clients 
        WHERE portal_user_id = auth.uid() 
        AND id::text = (storage.foldername(name))[1]
    )
);

-- Signatures cannot be updated or deleted (immutable)
-- No UPDATE or DELETE policies for signatures bucket
