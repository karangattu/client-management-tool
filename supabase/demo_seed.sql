-- ============================================
-- DEMO DATA SEED SCRIPT
-- ============================================
-- This script creates 10 sample clients in various stages
-- with different tasks, documents, and case management data.
-- Run this in Supabase SQL Editor to populate demo data.
-- ============================================

-- Note: This script uses hardcoded UUIDs for reproducibility.
-- If you need to run it multiple times, delete existing demo data first.

-- ============================================
-- CLEANUP (Optional - Uncomment to clear previous demo data)
-- ============================================
-- DELETE FROM tasks WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%@demo.clienthub.test');
-- DELETE FROM emergency_contacts WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%@demo.clienthub.test');
-- DELETE FROM case_management WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%@demo.clienthub.test');
-- DELETE FROM demographics WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%@demo.clienthub.test');
-- DELETE FROM household_members WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%@demo.clienthub.test');
-- DELETE FROM documents WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%@demo.clienthub.test');
-- DELETE FROM client_history WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%@demo.clienthub.test');
-- DELETE FROM clients WHERE email LIKE '%@demo.clienthub.test';

-- ============================================
-- INSERT DEMO CLIENTS
-- ============================================

INSERT INTO clients (
    id, first_name, middle_name, last_name, date_of_birth, email, phone,
    street_address, city, state, zip_code, status, has_portal_access,
    signed_engagement_letter_at, created_at
) VALUES
-- 1. Active client with complete profile (fully onboarded)
(
    'a1111111-1111-1111-1111-111111111111',
    'Maria', 'Elena', 'Rodriguez',
    '1985-03-15',
    'maria.rodriguez@demo.clienthub.test',
    '(555) 123-0001',
    '123 Oak Street', 'San Francisco', 'CA', '94102',
    'active', false,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '45 days'
),
-- 2. Active client with housing application in progress
(
    'a2222222-2222-2222-2222-222222222222',
    'James', 'Michael', 'Thompson',
    '1978-07-22',
    'james.thompson@demo.clienthub.test',
    '(555) 123-0002',
    '456 Pine Avenue', 'Oakland', 'CA', '94612',
    'active', false,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '60 days'
),
-- 3. Pending client (new intake, needs documents)
(
    'a3333333-3333-3333-3333-333333333333',
    'Sarah', NULL, 'Johnson',
    '1992-11-08',
    'sarah.johnson@demo.clienthub.test',
    '(555) 123-0003',
    '789 Maple Drive', 'Berkeley', 'CA', '94704',
    'pending', false,
    NULL,
    NOW() - INTERVAL '5 days'
),
-- 4. Pending client (waiting for engagement letter signature)
(
    'a4444444-4444-4444-4444-444444444444',
    'David', 'Lee', 'Chen',
    '1988-04-30',
    'david.chen@demo.clienthub.test',
    '(555) 123-0004',
    '321 Cedar Lane', 'San Jose', 'CA', '95112',
    'pending', false,
    NULL,
    NOW() - INTERVAL '3 days'
),
-- 5. Active veteran client with benefits tracking
(
    'a5555555-5555-5555-5555-555555555555',
    'Robert', 'William', 'Martinez',
    '1970-01-18',
    'robert.martinez@demo.clienthub.test',
    '(555) 123-0005',
    '654 Birch Way', 'Fremont', 'CA', '94538',
    'active', false,
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '120 days'
),
-- 6. Active client at risk of homelessness
(
    'a6666666-6666-6666-6666-666666666666',
    'Lisa', 'Ann', 'Williams',
    '1995-09-12',
    'lisa.williams@demo.clienthub.test',
    '(555) 123-0006',
    '987 Elm Court', 'Richmond', 'CA', '94801',
    'active', false,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '30 days'
),
-- 7. Inactive client (case closed successfully)
(
    'a7777777-7777-7777-7777-777777777777',
    'Michael', 'Joseph', 'Brown',
    '1982-06-25',
    'michael.brown@demo.clienthub.test',
    '(555) 123-0007',
    '147 Willow Street', 'Daly City', 'CA', '94015',
    'inactive', false,
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '365 days'
),
-- 8. Active client with high VI-SPDAT score (priority)
(
    'a8888888-8888-8888-8888-888888888888',
    'Jennifer', NULL, 'Davis',
    '1975-12-03',
    'jennifer.davis@demo.clienthub.test',
    '(555) 123-0008',
    NULL, NULL, NULL, NULL,
    'active', false,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '14 days'
),
-- 9. Pending client (self-service registration incomplete)
(
    'a9999999-9999-9999-9999-999999999999',
    'Kevin', 'James', 'Wilson',
    '1990-02-14',
    'kevin.wilson@demo.clienthub.test',
    '(555) 123-0009',
    '258 Spruce Blvd', 'Hayward', 'CA', '94541',
    'pending', false,
    NULL,
    NOW() - INTERVAL '1 day'
),
-- 10. Archived client (for historical records)
(
    'a0000000-0000-0000-0000-000000000000',
    'Patricia', 'Marie', 'Garcia',
    '1968-08-20',
    'patricia.garcia@demo.clienthub.test',
    '(555) 123-0010',
    '369 Redwood Ave', 'Concord', 'CA', '94520',
    'archived', false,
    NOW() - INTERVAL '400 days',
    NOW() - INTERVAL '500 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT CASE MANAGEMENT DATA
-- ============================================

INSERT INTO case_management (
    client_id, housing_status, primary_language, vi_spdat_score,
    is_veteran, is_disabled, is_chronically_homeless,
    receives_snap, snap_renewal_date, receives_medicaid, medicaid_renewal_date
) VALUES
-- Maria - Housed, stable
('a1111111-1111-1111-1111-111111111111', 'housed', 'Spanish', 8, false, false, false, true, CURRENT_DATE + INTERVAL '60 days', true, CURRENT_DATE + INTERVAL '90 days'),
-- James - Transitional housing
('a2222222-2222-2222-2222-222222222222', 'transitional', 'English', 12, false, true, false, true, CURRENT_DATE + INTERVAL '30 days', true, CURRENT_DATE + INTERVAL '45 days'),
-- Sarah - At risk
('a3333333-3333-3333-3333-333333333333', 'at_risk', 'English', 10, false, false, false, false, NULL, false, NULL),
-- David - Unknown (new intake)
('a4444444-4444-4444-4444-444444444444', 'unknown', 'Chinese', NULL, false, false, false, false, NULL, false, NULL),
-- Robert - Housed veteran
('a5555555-5555-5555-5555-555555555555', 'housed', 'English', 6, true, true, false, true, CURRENT_DATE + INTERVAL '120 days', true, CURRENT_DATE + INTERVAL '180 days'),
-- Lisa - At risk with high needs
('a6666666-6666-6666-6666-666666666666', 'at_risk', 'English', 15, false, false, true, true, CURRENT_DATE + INTERVAL '15 days', true, CURRENT_DATE + INTERVAL '30 days'),
-- Michael - Previously housed (closed case)
('a7777777-7777-7777-7777-777777777777', 'housed', 'English', 4, false, false, false, false, NULL, false, NULL),
-- Jennifer - Unhoused, high priority
('a8888888-8888-8888-8888-888888888888', 'unhoused', 'English', 18, false, true, true, true, CURRENT_DATE + INTERVAL '7 days', true, CURRENT_DATE + INTERVAL '14 days'),
-- Kevin - Unknown (new)
('a9999999-9999-9999-9999-999999999999', 'unknown', 'English', NULL, false, false, false, false, NULL, false, NULL),
-- Patricia - Was housed (archived)
('a0000000-0000-0000-0000-000000000000', 'housed', 'Spanish', 5, false, false, false, false, NULL, false, NULL)
ON CONFLICT (client_id) DO NOTHING;

-- ============================================
-- INSERT DEMOGRAPHICS
-- ============================================

INSERT INTO demographics (
    client_id, gender, ethnicity, race, marital_status,
    employment_status, monthly_income, income_source
) VALUES
('a1111111-1111-1111-1111-111111111111', 'Female', 'Hispanic/Latino', ARRAY['White'], 'Married', 'employed_full_time', 2800.00, 'Employment'),
('a2222222-2222-2222-2222-222222222222', 'Male', 'Non-Hispanic', ARRAY['Black/African American'], 'Single', 'employed_part_time', 1200.00, 'Employment'),
('a3333333-3333-3333-3333-333333333333', 'Female', 'Non-Hispanic', ARRAY['White'], 'Single', 'unemployed', 0.00, 'None'),
('a4444444-4444-4444-4444-444444444444', 'Male', 'Non-Hispanic', ARRAY['Asian'], 'Married', 'employed_full_time', 4500.00, 'Employment'),
('a5555555-5555-5555-5555-555555555555', 'Male', 'Hispanic/Latino', ARRAY['White', 'American Indian'], 'Divorced', 'retired', 1800.00, 'VA Disability'),
('a6666666-6666-6666-6666-666666666666', 'Female', 'Non-Hispanic', ARRAY['Black/African American'], 'Single', 'unemployed', 400.00, 'TANF'),
('a7777777-7777-7777-7777-777777777777', 'Male', 'Non-Hispanic', ARRAY['White'], 'Married', 'employed_full_time', 5200.00, 'Employment'),
('a8888888-8888-8888-8888-888888888888', 'Female', 'Non-Hispanic', ARRAY['White'], 'Divorced', 'unable_to_work', 1100.00, 'SSI/SSDI'),
('a9999999-9999-9999-9999-999999999999', 'Male', 'Non-Hispanic', ARRAY['White', 'Asian'], 'Single', 'employed_part_time', 900.00, 'Employment'),
('a0000000-0000-0000-0000-000000000000', 'Female', 'Hispanic/Latino', ARRAY['White'], 'Widowed', 'retired', 2100.00, 'Social Security')
ON CONFLICT (client_id) DO NOTHING;

-- ============================================
-- INSERT EMERGENCY CONTACTS
-- ============================================

INSERT INTO emergency_contacts (client_id, name, relationship, phone, is_primary) VALUES
('a1111111-1111-1111-1111-111111111111', 'Carlos Rodriguez', 'Spouse', '(555) 999-0001', true),
('a2222222-2222-2222-2222-222222222222', 'Angela Thompson', 'Sister', '(555) 999-0002', true),
('a5555555-5555-5555-5555-555555555555', 'Maria Martinez', 'Ex-Wife', '(555) 999-0005', true),
('a6666666-6666-6666-6666-666666666666', 'Dorothy Williams', 'Mother', '(555) 999-0006', true),
('a7777777-7777-7777-7777-777777777777', 'Susan Brown', 'Spouse', '(555) 999-0007', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERT HOUSEHOLD MEMBERS
-- ============================================

INSERT INTO household_members (client_id, first_name, last_name, relationship, date_of_birth, is_dependent) VALUES
('a1111111-1111-1111-1111-111111111111', 'Carlos', 'Rodriguez', 'Spouse', '1983-05-20', false),
('a1111111-1111-1111-1111-111111111111', 'Sofia', 'Rodriguez', 'Daughter', '2015-08-10', true),
('a1111111-1111-1111-1111-111111111111', 'Diego', 'Rodriguez', 'Son', '2018-02-28', true),
('a4444444-4444-4444-4444-444444444444', 'Li', 'Chen', 'Spouse', '1990-09-15', false),
('a6666666-6666-6666-6666-666666666666', 'Jaylen', 'Williams', 'Son', '2019-04-12', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERT TASKS (Various statuses and priorities)
-- ============================================

INSERT INTO tasks (
    title, description, client_id, status, priority, due_date, category, created_at
) VALUES
-- Maria (Active, stable) - routine follow-up
('Monthly Check-in Call', 'Conduct monthly follow-up to ensure housing stability.', 'a1111111-1111-1111-1111-111111111111', 'pending', 'medium', NOW() + INTERVAL '7 days', 'follow_up', NOW() - INTERVAL '2 days'),
('SNAP Renewal Reminder', 'Help client prepare SNAP renewal documents before deadline.', 'a1111111-1111-1111-1111-111111111111', 'pending', 'high', NOW() + INTERVAL '45 days', 'benefits', NOW()),

-- James (Transitional housing) - active case work
('Housing Application Follow-up', 'Check status of permanent housing application with property manager.', 'a2222222-2222-2222-2222-222222222222', 'in_progress', 'urgent', NOW() + INTERVAL '3 days', 'housing', NOW() - INTERVAL '5 days'),
('Collect Income Verification', 'Client needs to provide latest pay stubs for housing application.', 'a2222222-2222-2222-2222-222222222222', 'pending', 'high', NOW() + INTERVAL '5 days', 'documents', NOW() - INTERVAL '1 day'),
('Schedule Move-in Inspection', 'Coordinate with landlord for unit inspection once approved.', 'a2222222-2222-2222-2222-222222222222', 'pending', 'medium', NOW() + INTERVAL '14 days', 'housing', NOW()),

-- Sarah (New intake) - onboarding tasks
('Complete Intake Form', 'Please complete all sections of the intake form.', 'a3333333-3333-3333-3333-333333333333', 'pending', 'urgent', NOW() + INTERVAL '3 days', 'onboarding', NOW() - INTERVAL '5 days'),
('Sign Engagement Letter', 'Review and sign the engagement letter.', 'a3333333-3333-3333-3333-333333333333', 'pending', 'urgent', NOW() + INTERVAL '3 days', 'onboarding', NOW() - INTERVAL '5 days'),
('Collect Photo ID', 'Obtain copy of valid government-issued photo ID.', 'a3333333-3333-3333-3333-333333333333', 'pending', 'high', NOW() + INTERVAL '7 days', 'documents', NOW() - INTERVAL '3 days'),

-- David (Waiting for signature)
('Complete Intake Form', 'Please complete all sections of the intake form.', 'a4444444-4444-4444-4444-444444444444', 'pending', 'urgent', NOW() + INTERVAL '5 days', 'onboarding', NOW() - INTERVAL '3 days'),
('Sign Engagement Letter', 'Review and sign the engagement letter.', 'a4444444-4444-4444-4444-444444444444', 'pending', 'urgent', NOW() + INTERVAL '5 days', 'onboarding', NOW() - INTERVAL '3 days'),

-- Robert (Veteran, stable)
('VA Benefits Review', 'Annual review of VA benefits and entitlements.', 'a5555555-5555-5555-5555-555555555555', 'pending', 'medium', NOW() + INTERVAL '30 days', 'benefits', NOW() - INTERVAL '7 days'),
('Disability Accommodation Request', 'Help client submit accommodation request to property management.', 'a5555555-5555-5555-5555-555555555555', 'completed', 'high', NOW() - INTERVAL '14 days', 'housing', NOW() - INTERVAL '30 days'),

-- Lisa (At risk, high priority)
('Emergency Rent Assistance Application', 'Submit ERA application before eviction hearing.', 'a6666666-6666-6666-6666-666666666666', 'in_progress', 'urgent', NOW() + INTERVAL '2 days', 'financial', NOW() - INTERVAL '10 days'),
('Gather Eviction Prevention Documents', 'Collect lease, income docs, and hardship letter for ERA.', 'a6666666-6666-6666-6666-666666666666', 'pending', 'urgent', NOW() + INTERVAL '1 day', 'documents', NOW() - INTERVAL '8 days'),
('Court Hearing Prep', 'Prepare client for eviction court hearing on Friday.', 'a6666666-6666-6666-6666-666666666666', 'pending', 'urgent', NOW() + INTERVAL '4 days', 'legal', NOW() - INTERVAL '3 days'),
('Childcare Assistance Referral', 'Connect client with childcare subsidy program.', 'a6666666-6666-6666-6666-666666666666', 'pending', 'medium', NOW() + INTERVAL '14 days', 'referral', NOW()),

-- Jennifer (Unhoused, high VI-SPDAT)
('VI-SPDAT Assessment', 'Complete full VI-SPDAT assessment.', 'a8888888-8888-8888-8888-888888888888', 'completed', 'urgent', NOW() - INTERVAL '5 days', 'assessment', NOW() - INTERVAL '14 days'),
('Coordinated Entry Submission', 'Submit client to coordinated entry system for housing match.', 'a8888888-8888-8888-8888-888888888888', 'in_progress', 'urgent', NOW() + INTERVAL '1 day', 'housing', NOW() - INTERVAL '3 days'),
('SSI Application Follow-up', 'Check status of pending SSI application.', 'a8888888-8888-8888-8888-888888888888', 'pending', 'high', NOW() + INTERVAL '7 days', 'benefits', NOW() - INTERVAL '2 days'),
('Medical Appointment Reminder', 'Remind client of upcoming doctor appointment.', 'a8888888-8888-8888-8888-888888888888', 'pending', 'medium', NOW() + INTERVAL '3 days', 'health', NOW()),

-- Kevin (New self-service)
('Complete Intake Form', 'Please complete all sections of the intake form.', 'a9999999-9999-9999-9999-999999999999', 'pending', 'urgent', NOW() + INTERVAL '7 days', 'onboarding', NOW() - INTERVAL '1 day'),
('Sign Engagement Letter', 'Review and sign the engagement letter.', 'a9999999-9999-9999-9999-999999999999', 'pending', 'urgent', NOW() + INTERVAL '7 days', 'onboarding', NOW() - INTERVAL '1 day'),
('Initial Outreach Call', 'Call new client to introduce services and schedule appointment.', 'a9999999-9999-9999-9999-999999999999', 'pending', 'high', NOW() + INTERVAL '2 days', 'outreach', NOW())

ON CONFLICT DO NOTHING;

-- ============================================
-- INSERT CLIENT HISTORY (Sample notes)
-- ============================================

INSERT INTO client_history (client_id, action_type, title, description, created_at) VALUES
('a1111111-1111-1111-1111-111111111111', 'note', 'Housing Stabilization Complete', 'Client has maintained stable housing for 6 months. Case to be reviewed for graduation.', NOW() - INTERVAL '7 days'),
('a1111111-1111-1111-1111-111111111111', 'meeting', 'Quarterly Review Meeting', 'Met with Maria and Carlos to review case progress and goals.', NOW() - INTERVAL '30 days'),
('a2222222-2222-2222-2222-222222222222', 'note', 'Housing Application Submitted', 'Submitted application to Sunrise Apartments. Expected response in 2 weeks.', NOW() - INTERVAL '5 days'),
('a6666666-6666-6666-6666-666666666666', 'call', 'Eviction Prevention Hotline', 'Connected client with legal aid for upcoming eviction hearing.', NOW() - INTERVAL '3 days'),
('a6666666-6666-6666-6666-666666666666', 'note', 'Emergency Situation', 'Client received 3-day notice. Prioritizing ERA application.', NOW() - INTERVAL '10 days'),
('a8888888-8888-8888-8888-888888888888', 'note', 'Street Outreach Contact', 'Located client at usual location. Discussed shelter options.', NOW() - INTERVAL '7 days'),
('a8888888-8888-8888-8888-888888888888', 'meeting', 'Case Conference', 'Multi-agency meeting to coordinate services for high-priority client.', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================
-- After running this script, you will have:
-- - 10 clients in various statuses (active, pending, inactive, archived)
-- - Case management data with different housing statuses and VI-SPDAT scores
-- - Demographics and household information
-- - Emergency contacts for some clients
-- - 20+ tasks in various states (pending, in_progress, completed)
-- - Client history notes for context
--
-- Client scenarios:
-- 1. Maria Rodriguez - Active, stable, housed, routine follow-ups
-- 2. James Thompson - Active, transitional housing, pending move
-- 3. Sarah Johnson - New pending intake, needs onboarding
-- 4. David Chen - Pending, waiting for signature
-- 5. Robert Martinez - Veteran, stable, benefits tracking
-- 6. Lisa Williams - At risk, eviction crisis, urgent tasks
-- 7. Michael Brown - Inactive, closed case (success story)
-- 8. Jennifer Davis - Unhoused, high priority (VI-SPDAT 18)
-- 9. Kevin Wilson - Brand new self-service registration
-- 10. Patricia Garcia - Archived historical record
-- ============================================
