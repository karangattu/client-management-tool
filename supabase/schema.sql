-- ============================================
-- CLIENT MANAGEMENT TOOL - COMPLETE DATABASE SCHEMA
-- ============================================
-- This schema includes:
-- 1. User management with roles (Admin, Case Manager, Staff, Client)
-- 2. Client profiles and intake forms
-- 3. Task management and assignments
-- 4. Calendar events and alerts
-- 5. Document storage references
-- 6. Housing workflow
-- 7. Digital signatures
-- 8. Audit logging
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'case_manager', 'staff', 'volunteer', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE client_status AS ENUM ('active', 'inactive', 'pending', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE housing_status AS ENUM ('housed', 'unhoused', 'at_risk', 'transitional', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('id', 'income', 'housing', 'medical', 'legal', 'consent', 'engagement_letter', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('deadline', 'follow_up', 'document_expiry', 'appointment', 'benefit_renewal', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE signature_type AS ENUM ('consent', 'engagement_letter', 'release_of_information', 'housing_agreement', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE housing_application_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'denied', 'waitlist', 'housed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- USER MANAGEMENT
-- ============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    phone TEXT,
    profile_picture_url TEXT,
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- CLIENTS
-- ============================================

DO $$ BEGIN
    CREATE TYPE client_onboarding_status AS ENUM ('registered', 'profile', 'engagement', 'intake', 'active');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_completion_role AS ENUM ('client', 'staff', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Participant Details
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    preferred_name TEXT,
    date_of_birth DATE,
    ssn_encrypted TEXT,
    ssn_last_four TEXT,
    email TEXT,
    phone TEXT,
    alternate_phone TEXT,
    -- Address
    street_address TEXT,
    apartment_unit TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    mailing_same_as_physical BOOLEAN DEFAULT true,
    mailing_street_address TEXT,
    mailing_city TEXT,
    mailing_state TEXT,
    mailing_zip_code TEXT,
    -- Profile
    profile_picture_url TEXT,
    status client_status DEFAULT 'pending',
    -- Self-service
    has_portal_access BOOLEAN DEFAULT false,
    portal_user_id UUID REFERENCES auth.users(id),
    intake_completed_at TIMESTAMP WITH TIME ZONE,
    onboarding_status client_onboarding_status DEFAULT 'registered',
    onboarding_progress INTEGER DEFAULT 0,
    profile_completed_at TIMESTAMP WITH TIME ZONE,
    -- Engagement Letter Tracking
    signed_engagement_letter_at TIMESTAMP WITH TIME ZONE,
    engagement_letter_version TEXT DEFAULT 'March 2024',
    -- Referral Tracking (How did you hear about us?)
    referral_source TEXT,
    referral_source_details TEXT,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    assigned_case_manager UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_clients_case_manager ON clients(assigned_case_manager);
CREATE INDEX IF NOT EXISTS idx_clients_referral_source ON clients(referral_source);

-- ============================================
-- EMERGENCY CONTACTS
-- ============================================

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    email TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_client ON emergency_contacts(client_id);

-- ============================================
-- CASE MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS case_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_id_number TEXT,
    case_id_number TEXT,
    housing_status housing_status DEFAULT 'unknown',
    primary_language TEXT DEFAULT 'English',
    secondary_language TEXT,
    needs_interpreter BOOLEAN DEFAULT false,
    vi_spdat_score INTEGER CHECK (vi_spdat_score >= 0 AND vi_spdat_score <= 20),
    vi_spdat_date DATE,
    -- Checkboxes
    is_veteran BOOLEAN DEFAULT false,
    is_disabled BOOLEAN DEFAULT false,
    is_domestic_violence_survivor BOOLEAN DEFAULT false,
    is_hiv_aids BOOLEAN DEFAULT false,
    is_chronically_homeless BOOLEAN DEFAULT false,
    is_substance_abuse BOOLEAN DEFAULT false,
    is_mental_health BOOLEAN DEFAULT false,
    -- Benefits tracking
    receives_snap BOOLEAN DEFAULT false,
    snap_renewal_date DATE,
    receives_medicaid BOOLEAN DEFAULT false,
    medicaid_renewal_date DATE,
    receives_ssi_ssdi BOOLEAN DEFAULT false,
    ssi_ssdi_renewal_date DATE,
    receives_tanf BOOLEAN DEFAULT false,
    tanf_renewal_date DATE,
    -- Health & Benefits
    health_insurance BOOLEAN DEFAULT false,
    health_insurance_type TEXT,
    non_cash_benefits TEXT[], -- Array for multiple selections (SNAP, WIC, etc.)
    health_status TEXT,
    -- Notes
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DEMOGRAPHICS
-- ============================================

CREATE TABLE IF NOT EXISTS demographics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    gender TEXT,
    gender_other TEXT,
    ethnicity TEXT,
    race TEXT[], -- Array for multiple selections
    marital_status TEXT,
    education_level TEXT,
    employment_status TEXT,
    monthly_income DECIMAL(10, 2),
    income_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HOUSEHOLD MEMBERS
-- ============================================

CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    date_of_birth DATE,
    ssn_last_four TEXT,
    is_dependent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_household_members_client ON household_members(client_id);

-- ============================================
-- TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id),
    assigned_by UUID REFERENCES profiles(id),
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES profiles(id),
    completed_by_role task_completion_role,
    completion_note TEXT,
    category TEXT,
    tags TEXT[],
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_program_id ON tasks(program_id);

-- ============================================
-- CALENDAR EVENTS & ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    assigned_to UUID[] DEFAULT '{}',
    event_type alert_type DEFAULT 'custom',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT false,
    location TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT, -- iCal RRULE format
    reminder_minutes INTEGER[] DEFAULT '{1440, 60}', -- 24 hours and 1 hour before
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_client ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);

-- Alerts/Notifications
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    alert_type alert_type NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    trigger_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_alerts_trigger ON alerts(trigger_at);
CREATE INDEX IF NOT EXISTS idx_alerts_client ON alerts(client_id);

-- ============================================
-- DOCUMENTS & FILE STORAGE
-- ============================================

-- Document metadata (files stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES profiles(id),
    document_type document_type DEFAULT 'other',
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_size INTEGER,
    mime_type TEXT,
    description TEXT,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending', -- Document review status: pending, verified, rejected
    rejection_reason TEXT, -- Reason if document was rejected
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- ============================================
-- DIGITAL SIGNATURES
-- ============================================

CREATE TABLE IF NOT EXISTS signature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES profiles(id),
    signature_type signature_type NOT NULL,
    document_id UUID REFERENCES documents(id),
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- The actual content being signed (or HTML template)
    is_signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_data TEXT, -- Base64 encoded signature image
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signatures_client ON signature_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_signatures_pending ON signature_requests(is_signed) WHERE NOT is_signed;

-- Engagement Letters (generated for self-service clients)
CREATE TABLE IF NOT EXISTS engagement_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_name TEXT DEFAULT 'standard',
    generated_content TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_via TEXT, -- 'email', 'portal', 'print'
    signature_request_id UUID REFERENCES signature_requests(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HOUSING WORKFLOW
-- ============================================

-- Housing Programs
CREATE TABLE IF NOT EXISTS housing_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    program_type TEXT, -- 'PSH', 'RRH', 'TH', 'Emergency', etc.
    max_capacity INTEGER,
    current_capacity INTEGER DEFAULT 0,
    eligibility_criteria JSONB,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Housing Applications
CREATE TABLE IF NOT EXISTS housing_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    program_id UUID REFERENCES housing_programs(id),
    status housing_application_status DEFAULT 'draft',
    application_date DATE DEFAULT CURRENT_DATE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    decision_notes TEXT,
    waitlist_position INTEGER,
    move_in_date DATE,
    -- Application data
    application_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_housing_apps_client ON housing_applications(client_id);
CREATE INDEX IF NOT EXISTS idx_housing_apps_status ON housing_applications(status);
CREATE INDEX IF NOT EXISTS idx_housing_apps_program ON housing_applications(program_id);

-- Housing History
CREATE TABLE IF NOT EXISTS housing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    housing_type TEXT, -- 'shelter', 'street', 'doubled_up', 'own_rental', 'subsidized', etc.
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    start_date DATE,
    end_date DATE,
    reason_for_leaving TEXT,
    landlord_name TEXT,
    landlord_phone TEXT,
    monthly_rent DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_housing_history_client ON housing_history(client_id);

-- Housing Documents Checklist
CREATE TABLE IF NOT EXISTS housing_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    application_id UUID REFERENCES housing_applications(id),
    item_name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    document_id UUID REFERENCES documents(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FORM DRAFTS (Auto-save support)
-- ============================================

CREATE TABLE IF NOT EXISTS form_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    form_type TEXT NOT NULL, -- 'intake', 'housing_application', etc.
    form_data JSONB NOT NULL,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER,
    is_complete BOOLEAN DEFAULT false,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_drafts_user ON form_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_client ON form_drafts(client_id);

-- ============================================
-- CLIENT INTERACTION HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS client_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    action_type TEXT NOT NULL, -- 'note', 'call', 'meeting', 'email', 'status_change', etc.
    title TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_history_client ON client_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_history_date ON client_history(created_at DESC);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at DESC);

-- ============================================
-- VIEWS
-- ============================================

-- Client Dashboard View
CREATE OR REPLACE VIEW client_dashboard AS
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.preferred_name,
    c.email,
    c.phone,
    c.status,
    c.profile_picture_url,
    c.created_at,
    c.assigned_case_manager,
    cm.housing_status,
    cm.vi_spdat_score,
    cm.is_veteran,
    cm.is_chronically_homeless,
    p.first_name AS case_manager_first_name,
    p.last_name AS case_manager_last_name,
    (SELECT COUNT(*) FROM tasks t WHERE t.client_id = c.id AND t.status IN ('pending', 'in_progress')) AS pending_tasks,
    (SELECT COUNT(*) FROM documents d WHERE d.client_id = c.id) AS document_count,
    (SELECT COUNT(*) FROM alerts a WHERE a.client_id = c.id AND NOT a.is_read) AS unread_alerts,
    (SELECT MAX(ch.created_at) FROM client_history ch WHERE ch.client_id = c.id) AS last_interaction
FROM clients c
LEFT JOIN case_management cm ON c.id = cm.client_id
LEFT JOIN profiles p ON c.assigned_case_manager = p.id;

-- Tasks Overview View
-- Drop first to avoid column structure conflicts on existing databases
DROP VIEW IF EXISTS tasks_overview;
CREATE OR REPLACE VIEW tasks_overview AS
SELECT 
    t.*,
    c.first_name AS client_first_name,
    c.last_name AS client_last_name,
    p.first_name AS assignee_first_name,
    p.last_name AS assignee_last_name
FROM tasks t
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN profiles p ON t.assigned_to = p.id;

-- Upcoming Deadlines View
CREATE OR REPLACE VIEW upcoming_deadlines AS
SELECT 
    'task' AS item_type,
    t.id,
    t.title,
    t.due_date AS deadline,
    t.client_id,
    c.first_name || ' ' || c.last_name AS client_name,
    t.assigned_to AS user_id,
    t.priority::text AS priority
FROM tasks t
JOIN clients c ON t.client_id = c.id
WHERE t.status IN ('pending', 'in_progress')
  AND t.due_date IS NOT NULL
  AND t.due_date <= NOW() + INTERVAL '30 days'
UNION ALL
SELECT 
    'event' AS item_type,
    ce.id,
    ce.title,
    ce.start_time AS deadline,
    ce.client_id,
    COALESCE(c.first_name || ' ' || c.last_name, 'N/A') AS client_name,
    ce.created_by AS user_id,
    ce.event_type::text AS priority
FROM calendar_events ce
LEFT JOIN clients c ON ce.client_id = c.id
WHERE ce.start_time >= NOW()
  AND ce.start_time <= NOW() + INTERVAL '30 days'
UNION ALL
SELECT 
    'benefit_renewal' AS item_type,
    cm.id,
    'SNAP Renewal' AS title,
    cm.snap_renewal_date::timestamp with time zone AS deadline,
    cm.client_id,
    c.first_name || ' ' || c.last_name AS client_name,
    c.assigned_case_manager AS user_id,
    'high' AS priority
FROM case_management cm
JOIN clients c ON cm.client_id = c.id
WHERE cm.receives_snap
  AND cm.snap_renewal_date IS NOT NULL
  AND cm.snap_renewal_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY deadline;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit log entry
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_values)
        VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
        VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create alerts for benefit renewals
CREATE OR REPLACE FUNCTION create_benefit_renewal_alerts()
RETURNS TRIGGER AS $$
DECLARE
    benefit_name TEXT;
    renewal_date DATE;
    assigned_user UUID;
BEGIN
    -- Get assigned case manager
    SELECT assigned_case_manager INTO assigned_user 
    FROM clients WHERE id = NEW.client_id;
    
    IF assigned_user IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check each benefit and create alerts
    IF NEW.receives_snap AND NEW.snap_renewal_date IS NOT NULL AND 
       (OLD.snap_renewal_date IS NULL OR NEW.snap_renewal_date != OLD.snap_renewal_date) THEN
        INSERT INTO alerts (user_id, client_id, title, message, alert_type, trigger_at)
        VALUES (
            assigned_user,
            NEW.client_id,
            'SNAP Renewal Due',
            'SNAP benefits renewal due on ' || NEW.snap_renewal_date,
            'benefit_renewal',
            NEW.snap_renewal_date - INTERVAL '30 days'
        );
    END IF;

    -- Similar for other benefits...
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create new user (called by admin)
CREATE OR REPLACE FUNCTION create_staff_user(
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role user_role,
    p_phone TEXT DEFAULT NULL,
    p_department TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Only admins can create new users';
    END IF;

    -- Create auth user (this would typically be done via Supabase Admin API)
    -- The actual user creation should be done via the Supabase Admin API in your application
    -- This function creates the profile entry
    
    -- For now, return null - actual implementation requires Admin API
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_housing_applications_updated_at ON housing_applications;
CREATE TRIGGER update_housing_applications_updated_at BEFORE UPDATE ON housing_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit triggers (add to sensitive tables)
DROP TRIGGER IF EXISTS audit_clients_changes ON clients;
CREATE TRIGGER audit_clients_changes
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_case_management_changes ON case_management;
CREATE TRIGGER audit_case_management_changes
    AFTER INSERT OR UPDATE OR DELETE ON case_management
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_demographics_changes ON demographics;
CREATE TRIGGER audit_demographics_changes
    AFTER INSERT OR UPDATE OR DELETE ON demographics
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_emergency_contacts_changes ON emergency_contacts;
CREATE TRIGGER audit_emergency_contacts_changes
    AFTER INSERT OR UPDATE OR DELETE ON emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_household_members_changes ON household_members;
CREATE TRIGGER audit_household_members_changes
    AFTER INSERT OR UPDATE OR DELETE ON household_members
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Benefit renewal alert trigger
DROP TRIGGER IF EXISTS trigger_benefit_renewal_alerts ON case_management;
CREATE TRIGGER trigger_benefit_renewal_alerts
    AFTER INSERT OR UPDATE ON case_management
    FOR EACH ROW EXECUTE FUNCTION create_benefit_renewal_alerts();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Trigger to ensure profiles + clients exist for auth users
-- NOTE: Must be created in Supabase SQL editor or migration (cannot be in schema.sql if using schema-based bootstrap)
-- See supabase/migrations_20260118_phase1.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view allowed profiles" ON profiles
    FOR SELECT USING (
        auth.uid() = id
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'case_manager', 'staff', 'volunteer'))
        OR (
            EXISTS (SELECT 1 FROM clients c WHERE c.portal_user_id = auth.uid())
            AND role IN ('admin', 'case_manager', 'staff', 'volunteer')
        )
    );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
CREATE POLICY "Service role can manage all profiles" ON profiles
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Clients policies
DROP POLICY IF EXISTS "Staff can view all clients" ON clients;
CREATE POLICY "Staff can view all clients" ON clients
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Clients can view own record" ON clients;
CREATE POLICY "Clients can view own record" ON clients
    FOR SELECT USING (portal_user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can insert clients" ON clients;
CREATE POLICY "Staff can insert clients" ON clients
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Staff can update clients" ON clients;
CREATE POLICY "Staff can update clients" ON clients
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Admins can delete clients" ON clients;
CREATE POLICY "Admins can delete clients" ON clients
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Tasks policies
-- Users can view tasks they're assigned to, created, or if they're staff/admin
DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
CREATE POLICY "Users can view assigned tasks" ON tasks
    FOR SELECT USING (
        assigned_to = auth.uid() OR
        assigned_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

-- Clients can view tasks related to their case (linked via client_id -> portal_user_id)
DROP POLICY IF EXISTS "Clients can view own tasks" ON tasks;
CREATE POLICY "Clients can view own tasks" ON tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = tasks.client_id 
            AND clients.portal_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can create tasks" ON tasks;
CREATE POLICY "Staff can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Users can update assigned tasks" ON tasks;
CREATE POLICY "Users can update assigned tasks" ON tasks
    FOR UPDATE USING (
        assigned_to = auth.uid() OR
        assigned_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager'))
    );

-- Guard: clients can only update task completion fields
CREATE OR REPLACE FUNCTION public.enforce_client_task_updates()
RETURNS TRIGGER AS $$
DECLARE
    current_role user_role;
BEGIN
    SELECT role INTO current_role FROM profiles WHERE id = auth.uid();

    IF current_role = 'client' THEN
        IF NEW.title IS DISTINCT FROM OLD.title
            OR NEW.description IS DISTINCT FROM OLD.description
            OR NEW.priority IS DISTINCT FROM OLD.priority
            OR NEW.due_date IS DISTINCT FROM OLD.due_date
            OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
            OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
            OR NEW.client_id IS DISTINCT FROM OLD.client_id
            OR NEW.category IS DISTINCT FROM OLD.category
            OR NEW.tags IS DISTINCT FROM OLD.tags
            OR NEW.program_id IS DISTINCT FROM OLD.program_id THEN
            RAISE EXCEPTION 'Clients may only update task status and completion fields';
        END IF;

        IF NEW.completed_by IS NOT NULL AND NEW.completed_by <> auth.uid() THEN
            RAISE EXCEPTION 'Clients may only mark themselves as completer';
        END IF;

        IF NEW.completed_by_role IS NOT NULL AND NEW.completed_by_role <> 'client' THEN
            RAISE EXCEPTION 'Clients must use client completion role';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_client_task_updates ON tasks;
CREATE TRIGGER enforce_client_task_updates
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION public.enforce_client_task_updates();

-- Calendar events policies
-- Staff can view all calendar events
DROP POLICY IF EXISTS "Staff can view calendar events" ON calendar_events;
CREATE POLICY "Staff can view calendar events" ON calendar_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

-- Clients can view calendar events related to their case
DROP POLICY IF EXISTS "Clients can view own calendar events" ON calendar_events;
CREATE POLICY "Clients can view own calendar events" ON calendar_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = calendar_events.client_id 
            AND clients.portal_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can create calendar events" ON calendar_events;
CREATE POLICY "Staff can create calendar events" ON calendar_events
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Staff can update calendar events" ON calendar_events;
CREATE POLICY "Staff can update calendar events" ON calendar_events
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

-- Alerts policies
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
CREATE POLICY "Users can view own alerts" ON alerts
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
CREATE POLICY "Users can update own alerts" ON alerts
    FOR UPDATE USING (user_id = auth.uid());

-- Documents policies
DROP POLICY IF EXISTS "Staff can view all documents" ON documents;
CREATE POLICY "Staff can view all documents" ON documents
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Clients can view own documents" ON documents;
CREATE POLICY "Clients can view own documents" ON documents
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM clients WHERE id = documents.client_id AND portal_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Staff can manage documents" ON documents;
CREATE POLICY "Staff can manage documents" ON documents
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

-- Emergency Contacts policies
DROP POLICY IF EXISTS "Staff can manage all emergency contacts" ON emergency_contacts;
CREATE POLICY "Staff can manage all emergency contacts" ON emergency_contacts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Clients can view own emergency contacts" ON emergency_contacts;
CREATE POLICY "Clients can view own emergency contacts" ON emergency_contacts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM clients WHERE id = emergency_contacts.client_id AND portal_user_id = auth.uid())
    );

-- Case Management policies
DROP POLICY IF EXISTS "Staff can manage all case management" ON case_management;
CREATE POLICY "Staff can manage all case management" ON case_management
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Clients can view own case management" ON case_management;
CREATE POLICY "Clients can view own case management" ON case_management
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM clients WHERE id = case_management.client_id AND portal_user_id = auth.uid())
    );

-- Demographics policies
DROP POLICY IF EXISTS "Staff can manage all demographics" ON demographics;
CREATE POLICY "Staff can manage all demographics" ON demographics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Clients can view own demographics" ON demographics;
CREATE POLICY "Clients can view own demographics" ON demographics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM clients WHERE id = demographics.client_id AND portal_user_id = auth.uid())
    );

-- Household Members policies
DROP POLICY IF EXISTS "Staff can manage all household members" ON household_members;
CREATE POLICY "Staff can manage all household members" ON household_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Clients can view own household members" ON household_members;
CREATE POLICY "Clients can view own household members" ON household_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM clients WHERE id = household_members.client_id AND portal_user_id = auth.uid())
    );

-- Signature Requests policies
DROP POLICY IF EXISTS "Staff can manage all signature requests" ON signature_requests;
CREATE POLICY "Staff can manage all signature requests" ON signature_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Clients can view/update own signature requests" ON signature_requests;
CREATE POLICY "Clients can view/update own signature requests" ON signature_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM clients WHERE id = signature_requests.client_id AND portal_user_id = auth.uid())
    );

-- Housing Applications policies
DROP POLICY IF EXISTS "Staff can manage all housing applications" ON housing_applications;
CREATE POLICY "Staff can manage all housing applications" ON housing_applications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

DROP POLICY IF EXISTS "Clients can view own housing applications" ON housing_applications;
CREATE POLICY "Clients can view own housing applications" ON housing_applications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM clients WHERE id = housing_applications.client_id AND portal_user_id = auth.uid())
    );

-- Client History policies
DROP POLICY IF EXISTS "Staff can manage all client history" ON client_history;
CREATE POLICY "Staff can manage all client history" ON client_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff', 'volunteer'))
    );

DROP POLICY IF EXISTS "Clients can view own history" ON client_history;
CREATE POLICY "Clients can view own history" ON client_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM clients WHERE id = client_history.client_id AND portal_user_id = auth.uid())
    );

-- Audit log - staff and admins can view
DROP POLICY IF EXISTS "Staff and admins can view audit log" ON audit_log;
CREATE POLICY "Staff and admins can view audit log" ON audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff'))
    );

-- ============================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================

-- Insert sample housing programs
INSERT INTO housing_programs (name, description, program_type, max_capacity) VALUES
    ('Permanent Supportive Housing', 'Long-term housing with wraparound services', 'PSH', 50),
    ('Rapid Re-Housing', 'Short-term rental assistance and services', 'RRH', 100),
    ('Transitional Housing', '2-year transitional housing program', 'TH', 25),
    ('Emergency Shelter', 'Emergency overnight shelter', 'Emergency', 200);

-- ============================================
-- MIGRATION: PROGRAMS & ENROLLMENTS
-- ============================================

-- 1. Create Programs table
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- e.g., 'Financial', 'Housing', 'Food', 'Health'
    description TEXT,
    requirements TEXT, -- Summary of eligibility
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Program Enrollments table
CREATE TABLE IF NOT EXISTS program_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'interested', -- 'interested', 'applying', 'enrolled', 'completed', 'denied', 'withdrawn'
    start_date DATE,
    end_date DATE,
    assigned_volunteer_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, program_id) -- Avoid duplicate enrollments in the same program
);

-- 3. Seed Programs from programs.pdf
INSERT INTO programs (name, category, description, requirements) VALUES
('General Assistance (GA)', 'Financial', 'Monthly cash aid for adults without dependent children.', 'Adult 18+, US citizen/qualified immigrant, asset limit <$500, income <$150/mo.'),
('CalWORKs', 'Financial', 'Cash aid and services for families with children or pregnant women.', 'Low income, citizen/qualified immigrant, responsible for child <19.'),
('Money Management', 'Financial', 'Support for bank accounts, budgeting, and credit repair.', 'Open to all seeking financial stability.'),
('Homelessness Prevention', 'Housing', 'Rental assistance for those at risk of eviction.', 'Housed, low income, at risk of eviction.'),
('CARE / FERA', 'Housing', 'Discounted utility rates for electricity and gas.', 'Income limits or receiving benefits (Medi-Cal, SSI, CalFresh).'),
('AirBnB Temporary Housing', 'Housing', 'Temporary housing solutions for unhoused individuals.', 'Unhoused, stable income preferred.'),
('Housing Solutions & Recertification', 'Housing', 'Assistance with finding housing or maintaining current status.', 'Open to unhoused or those requiring recertification.'),
('CalFresh (Food Stamps)', 'Food', 'Monthly food assistance (EBT).', 'US citizen/qualified immigrant, meeting gross income limits.'),
('CHIP', 'Health', 'Children''s Health Insurance Program for those under 19.', 'Under 19, household income limits. No citizenship requirement.'),
('Dental Concerns', 'Health', 'Information and referral for dental care.', 'Open to those needing dental support.'),
('ADSA', 'Disability', 'Assistance Dog Special Allowance for service dog care.', 'Disability, uses service dog, receiving SSI/SSDI/IHSS.'),
('DP Parking Placard', 'Disability', 'Assistance applying for Disabled Person DMV placards.', 'Documented disability, valid ID.'),
('Adult Education', 'Education', 'Support for attending or planning for school.', 'Open to adults seeking education.'),
('Vital Documents', 'Legal', 'Assistance with Birth Certificates and Green Card replacements.', 'Open to those needing identification or residency docs.'),
('Community Involvement', 'Community', 'Connecting clients with local resources and activities.', 'Open to all seeking community connection.')
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    requirements = EXCLUDED.requirements;

-- 4. Enable RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies
DROP POLICY IF EXISTS "Anyone can view active programs" ON programs;
CREATE POLICY "Anyone can view active programs" ON programs
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage program enrollments" ON program_enrollments;
CREATE POLICY "Staff can manage program enrollments" ON program_enrollments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff', 'volunteer'))
    );

DROP POLICY IF EXISTS "Clients can view own enrollments" ON program_enrollments;
CREATE POLICY "Clients can view own enrollments" ON program_enrollments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM clients WHERE portal_user_id = auth.uid() AND id = program_enrollments.client_id)
    );

-- 6. Add trigger for updated_at
DROP TRIGGER IF EXISTS update_programs_updated_at ON programs;
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_enrollments_updated_at ON program_enrollments;
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON program_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- MIGRATION: FIX DOCUMENT UPLOAD POLICIES
-- ============================================

-- Fix storage policies for client-documents bucket
DO $$
BEGIN
    -- Drop existing policies first
    DROP POLICY IF EXISTS "Staff can view client documents" ON storage.objects;
    DROP POLICY IF EXISTS "Staff can upload client documents" ON storage.objects;
    DROP POLICY IF EXISTS "Staff can update client documents" ON storage.objects;
    
    -- Re-create with 'volunteer' role included
    CREATE POLICY "Staff can view client documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'client-documents' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff', 'volunteer')
        )
    );

    CREATE POLICY "Staff can upload client documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'client-documents' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff', 'volunteer')
        )
    );

    CREATE POLICY "Staff can update client documents"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'client-documents' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff', 'volunteer')
        )
    );
EXCEPTION WHEN undefined_table THEN
    NULL; -- Resume execution if storage.objects doesn't exist yet (unlikely in Supabase context)
END $$;

-- Fix documents table policies
DROP POLICY IF EXISTS "Staff can view all documents" ON documents;
CREATE POLICY "Staff can view all documents" ON documents
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff', 'volunteer'))
    );

DROP POLICY IF EXISTS "Staff can manage documents" ON documents;
CREATE POLICY "Staff can manage documents" ON documents
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff', 'volunteer'))
    );

-- Clients can insert their own documents
DROP POLICY IF EXISTS "Clients can upload own documents" ON documents;
CREATE POLICY "Clients can upload own documents" ON documents
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM clients WHERE id = documents.client_id AND portal_user_id = auth.uid())
    );

-- ============================================
-- MIGRATION: ENROLLMENT ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS program_enrollment_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_enrollment_activity_enrollment ON program_enrollment_activity(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_activity_changed_at ON program_enrollment_activity(changed_at);

-- RLS Policies
ALTER TABLE program_enrollment_activity ENABLE ROW LEVEL SECURITY;

-- Staff can view all enrollment activity
DROP POLICY IF EXISTS "Staff can view enrollment activity" ON program_enrollment_activity;
CREATE POLICY "Staff can view enrollment activity" ON program_enrollment_activity
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff', 'volunteer'))
    );

-- Staff can insert enrollment activity
DROP POLICY IF EXISTS "Staff can insert enrollment activity" ON program_enrollment_activity;
CREATE POLICY "Staff can insert enrollment activity" ON program_enrollment_activity
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'case_manager', 'staff', 'volunteer'))
    );
-- Allow clients to insert their own tasks (needed for self-service intake task creation if service role fails)
DROP POLICY IF EXISTS "Clients can insert own tasks" ON tasks;
CREATE POLICY "Clients can insert own tasks" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = tasks.client_id 
            AND clients.portal_user_id = auth.uid()
        )
    );
-- Allow clients to upload their own documents to storage
-- (Policy allows insert if the path starts with their client ID)
-- Note: We can't easily check client ID ownership in storage RLS without a complex join or a helper function.
-- A simpler approach for the bucket policy: Allow authenticated users to upload to folders matching their claimed client ID?
-- But 'auth.uid()' is the user ID, not client ID.
-- The file path is `${clientData.id}/consent/${documentFileName}`.
-- We need to check if the folder name is the client ID owned by the user.

-- Let's enable a broader upload policy for authenticated users to the 'client-documents' bucket, 
-- but we might want to restrict it.
-- However, for now, to unblock the feature:

DROP POLICY IF EXISTS "Clients can upload own documents" ON storage.objects;
create policy "Clients can upload own documents"
on storage.objects for insert
with check (
  bucket_id = 'client-documents' and
  auth.role() = 'authenticated' and
  (
    -- Ensure the user is the one associated with the folder (client_id)
    -- This requires a subquery to clients table using the folder name as client ID
    exists (
      select 1 from clients 
      where 
        clients.portal_user_id = auth.uid() and
        -- This is a bit tricky in exact SQL for storage paths, attempting simplified check:
        -- storage.objects.name like (clients.id || '/%')
        (storage.foldername(name))[1] = clients.id::text
    )
  )
);

-- Also allow them to read their own documents
DROP POLICY IF EXISTS "Clients can view own documents" ON storage.objects;
create policy "Clients can view own documents"
on storage.objects for select
using (
  bucket_id = 'client-documents' and
  auth.role() = 'authenticated' and
  exists (
    select 1 from clients 
    where 
      clients.portal_user_id = auth.uid() and
      (storage.foldername(name))[1] = clients.id::text
  )
);
