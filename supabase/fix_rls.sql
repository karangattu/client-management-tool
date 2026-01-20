-- Refresh is_staff_or_admin to be more robust and return a strict boolean
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role user_role;
BEGIN
    IF user_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT role INTO user_role FROM profiles WHERE id = user_id;
    
    IF user_role IS NULL THEN
        -- Check if we can find it by email if ID lookup fails (optional, but good for troubleshooting)
        -- Actually, ID should be sufficient for RLS.
        RETURN false;
    END IF;

    RETURN user_role IN ('admin', 'case_manager', 'staff', 'volunteer');
END;
$$;
