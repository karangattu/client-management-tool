-- ============================================
-- REFRESH ALL RLS POLICIES
-- ============================================
-- Run this file to ensure all RLS policies are in place
-- This is safe to run multiple times (idempotent)
-- ============================================

-- Ensure is_staff_or_admin function exists and is correct
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
        RETURN false;
    END IF;

    RETURN user_role IN ('admin', 'case_manager', 'staff', 'volunteer');
END;
$$;

-- ============================================
-- PROFILES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view allowed profiles" ON profiles;
CREATE POLICY "Users can view allowed profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR public.is_staff_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
CREATE POLICY "Service role can manage all profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CLIENTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can view all clients" ON clients;
CREATE POLICY "Staff can view all clients" ON clients
  FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert clients" ON clients;
CREATE POLICY "Staff can insert clients" ON clients
  FOR INSERT WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can update clients" ON clients;
CREATE POLICY "Staff can update clients" ON clients
  FOR UPDATE USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete clients" ON clients;
CREATE POLICY "Admins can delete clients" ON clients
  FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Clients can view own record" ON clients;
CREATE POLICY "Clients can view own record" ON clients
  FOR SELECT USING (portal_user_id = auth.uid());

DROP POLICY IF EXISTS "Clients can update own record" ON clients;
CREATE POLICY "Clients can update own record" ON clients
  FOR UPDATE USING (portal_user_id = auth.uid());

-- ============================================
-- CASE MANAGEMENT POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can manage all cases" ON case_management;
CREATE POLICY "Staff can manage all cases" ON case_management
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view own case management" ON case_management;
CREATE POLICY "Clients can view own case management" ON case_management
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = case_management.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- TASKS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can manage all tasks" ON tasks;
CREATE POLICY "Staff can manage all tasks" ON tasks
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
CREATE POLICY "Users can view assigned tasks" ON tasks
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR public.is_staff_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Clients can view own tasks" ON tasks;
CREATE POLICY "Clients can view own tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = tasks.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can update own tasks" ON tasks;
CREATE POLICY "Clients can update own tasks" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = tasks.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can insert own tasks" ON tasks;
CREATE POLICY "Clients can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = tasks.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- CALENDAR EVENTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can view calendar events" ON calendar_events;
CREATE POLICY "Staff can view calendar events" ON calendar_events
  FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage calendar events" ON calendar_events;
CREATE POLICY "Staff can manage calendar events" ON calendar_events
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view own calendar events" ON calendar_events;
CREATE POLICY "Clients can view own calendar events" ON calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = calendar_events.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- ALERTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
CREATE POLICY "Users can view own alerts" ON alerts
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
CREATE POLICY "Users can update own alerts" ON alerts
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage alerts" ON alerts;
CREATE POLICY "Staff can manage alerts" ON alerts
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can view all documents" ON documents;
CREATE POLICY "Staff can view all documents" ON documents
  FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage documents" ON documents;
CREATE POLICY "Staff can manage documents" ON documents
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view own documents" ON documents;
CREATE POLICY "Clients can view own documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can insert own documents" ON documents;
CREATE POLICY "Clients can insert own documents" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- EMERGENCY CONTACTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can manage all emergency contacts" ON emergency_contacts;
CREATE POLICY "Staff can manage all emergency contacts" ON emergency_contacts
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can manage own emergency contacts" ON emergency_contacts;
CREATE POLICY "Clients can manage own emergency contacts" ON emergency_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = emergency_contacts.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- DEMOGRAPHICS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can manage all demographics" ON demographics;
CREATE POLICY "Staff can manage all demographics" ON demographics
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view own demographics" ON demographics;
CREATE POLICY "Clients can view own demographics" ON demographics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = demographics.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- HOUSEHOLD MEMBERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can manage all household members" ON household_members;
CREATE POLICY "Staff can manage all household members" ON household_members
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can manage own household members" ON household_members;
CREATE POLICY "Clients can manage own household members" ON household_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = household_members.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- SIGNATURE REQUESTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can manage all signature requests" ON signature_requests;
CREATE POLICY "Staff can manage all signature requests" ON signature_requests
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view own signature requests" ON signature_requests;
CREATE POLICY "Clients can view own signature requests" ON signature_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = signature_requests.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can update own signature requests" ON signature_requests;
CREATE POLICY "Clients can update own signature requests" ON signature_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = signature_requests.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- HOUSING APPLICATIONS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can manage all housing applications" ON housing_applications;
CREATE POLICY "Staff can manage all housing applications" ON housing_applications
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view own housing applications" ON housing_applications;
CREATE POLICY "Clients can view own housing applications" ON housing_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = housing_applications.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- CLIENT HISTORY POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can manage all client history" ON client_history;
CREATE POLICY "Staff can manage all client history" ON client_history
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view own history" ON client_history;
CREATE POLICY "Clients can view own history" ON client_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_history.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- AUDIT LOG POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff and admins can view audit log" ON audit_log;
CREATE POLICY "Staff and admins can view audit log" ON audit_log
  FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

-- ============================================
-- PROGRAMS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Anyone can view active programs" ON programs;
CREATE POLICY "Anyone can view active programs" ON programs
  FOR SELECT USING (is_active = true OR public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage programs" ON programs;
CREATE POLICY "Staff can manage programs" ON programs
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

-- ============================================
-- PROGRAM ENROLLMENTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can manage enrollments" ON program_enrollments;
CREATE POLICY "Staff can manage enrollments" ON program_enrollments
  FOR ALL USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients can view own enrollments" ON program_enrollments;
CREATE POLICY "Clients can view own enrollments" ON program_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = program_enrollments.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

-- ============================================
-- PROGRAM ENROLLMENT ACTIVITY POLICIES
-- ============================================
DROP POLICY IF EXISTS "Staff can view enrollment activity" ON program_enrollment_activity;
CREATE POLICY "Staff can view enrollment activity" ON program_enrollment_activity
  FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert enrollment activity" ON program_enrollment_activity;
CREATE POLICY "Staff can insert enrollment activity" ON program_enrollment_activity
  FOR INSERT WITH CHECK (public.is_staff_or_admin(auth.uid()));
