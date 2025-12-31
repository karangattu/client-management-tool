-- Add document status field
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add rejection reason field for rejected documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Create a migration function to update existing documents
CREATE OR REPLACE FUNCTION update_existing_document_status()
RETURNS void AS $$
BEGIN
  -- Update documents that have is_verified = true to status = 'verified'
  UPDATE documents 
  SET status = 'verified' 
  WHERE is_verified = true AND (status IS NULL OR status = 'pending');
  
  -- Update documents that have is_verified = false to status = 'pending'
  UPDATE documents 
  SET status = 'pending' 
  WHERE is_verified = false AND status IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT update_existing_document_status();

-- Drop the migration function since we don't need it anymore
DROP FUNCTION update_existing_document_status();