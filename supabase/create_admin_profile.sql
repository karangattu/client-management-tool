-- Script to create admin profile if it doesn't exist
-- Run this in Supabase SQL Editor

-- First, let's find the admin user's ID from auth.users
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get the user ID for admin@example.com
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@example.com';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user not found in auth.users. Please create the user first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found admin user ID: %', admin_user_id;
    
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM profiles WHERE id = admin_user_id) THEN
        RAISE NOTICE 'Profile already exists for admin user, updating role to admin...';
        UPDATE profiles SET role = 'admin', is_active = true WHERE id = admin_user_id;
    ELSE
        RAISE NOTICE 'Creating profile for admin user...';
        INSERT INTO profiles (id, email, first_name, last_name, role, is_active, created_at)
        VALUES (
            admin_user_id,
            'admin@example.com',
            'Admin',
            'User',
            'admin',
            true,
            NOW()
        );
    END IF;
    
    RAISE NOTICE 'Admin profile setup complete!';
END $$;

-- Verify the profile was created
SELECT id, email, first_name, last_name, role, is_active 
FROM profiles 
WHERE email = 'admin@example.com';
