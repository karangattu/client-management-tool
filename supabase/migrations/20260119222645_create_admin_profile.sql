-- Migration: Create admin profile if missing
-- This ensures the admin@example.com user has a profile entry

DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get the user ID for admin@example.com from auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@example.com';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user not found in auth.users - skipping profile creation';
        RETURN;
    END IF;
    
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM profiles WHERE id = admin_user_id) THEN
        -- Update existing profile to ensure it's an admin
        UPDATE profiles 
        SET role = 'admin', is_active = true 
        WHERE id = admin_user_id;
        RAISE NOTICE 'Updated existing profile to admin role';
    ELSE
        -- Create new profile for admin user
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
        RAISE NOTICE 'Created new admin profile';
    END IF;
END $$;
