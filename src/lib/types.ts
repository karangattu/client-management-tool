// Database types for the client management tool

export type UserRole = 'admin' | 'case_manager' | 'staff' | 'client';
export type ClientStatus = 'active' | 'inactive' | 'pending' | 'archived';
export type HousingStatus = 'housed' | 'unhoused' | 'at_risk' | 'transitional' | 'unknown';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DocumentType = 'id' | 'income' | 'housing' | 'medical' | 'legal' | 'consent' | 'engagement_letter' | 'other';
export type AlertType = 'deadline' | 'follow_up' | 'document_expiry' | 'appointment' | 'benefit_renewal' | 'custom';
export type SignatureType = 'consent' | 'engagement_letter' | 'release_of_information' | 'housing_agreement' | 'other';
export type HousingApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'waitlist' | 'housed';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  profile_picture_url?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  last_login_at?: string;
}

export interface Client {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  date_of_birth?: string;
  ssn_encrypted?: string;
  ssn_last_four?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  street_address?: string;
  apartment_unit?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  mailing_same_as_physical: boolean;
  mailing_street_address?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip_code?: string;
  profile_picture_url?: string;
  status: ClientStatus;
  has_portal_access: boolean;
  portal_user_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  assigned_case_manager?: string;
}

export interface EmergencyContact {
  id: string;
  client_id: string;
  name: string;
  relationship?: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseManagement {
  id: string;
  client_id: string;
  client_id_number?: string;
  case_id_number?: string;
  housing_status: HousingStatus;
  primary_language: string;
  secondary_language?: string;
  needs_interpreter: boolean;
  vi_spdat_score?: number;
  vi_spdat_date?: string;
  is_veteran: boolean;
  is_disabled: boolean;
  is_domestic_violence_survivor: boolean;
  is_hiv_aids: boolean;
  is_chronically_homeless: boolean;
  is_substance_abuse: boolean;
  is_mental_health: boolean;
  receives_snap: boolean;
  snap_renewal_date?: string;
  receives_medicaid: boolean;
  medicaid_renewal_date?: string;
  receives_ssi_ssdi: boolean;
  ssi_ssdi_renewal_date?: string;
  receives_tanf: boolean;
  tanf_renewal_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Demographics {
  id: string;
  client_id: string;
  gender?: string;
  gender_other?: string;
  ethnicity?: string;
  race?: string[];
  marital_status?: string;
  education_level?: string;
  employment_status?: string;
  monthly_income?: number;
  income_source?: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  date_of_birth?: string;
  ssn_last_four?: string;
  is_dependent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  client_id?: string;
  assigned_to?: string;
  assigned_by?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  client_id?: string;
  created_by?: string;
  assigned_to?: string[];
  event_type: AlertType;
  start_time: string;
  end_time?: string;
  all_day: boolean;
  location?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  reminder_minutes?: number[];
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  client_id?: string;
  calendar_event_id?: string;
  task_id?: string;
  title: string;
  message?: string;
  alert_type: AlertType;
  is_read: boolean;
  is_dismissed: boolean;
  trigger_at: string;
  created_at: string;
}

export interface Document {
  id: string;
  client_id: string;
  uploaded_by?: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  expiry_date?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface SignatureRequest {
  id: string;
  client_id: string;
  requested_by?: string;
  signature_type: SignatureType;
  document_id?: string;
  title: string;
  description?: string;
  content?: string;
  is_signed: boolean;
  signed_at?: string;
  signature_data?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at?: string;
  created_at: string;
}

export interface EngagementLetter {
  id: string;
  client_id: string;
  template_name: string;
  generated_content: string;
  is_sent: boolean;
  sent_at?: string;
  sent_via?: string;
  signature_request_id?: string;
  created_at: string;
}

export interface HousingProgram {
  id: string;
  name: string;
  description?: string;
  program_type?: string;
  max_capacity?: number;
  current_capacity: number;
  eligibility_criteria?: Record<string, unknown>;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HousingApplication {
  id: string;
  client_id: string;
  program_id?: string;
  status: HousingApplicationStatus;
  application_date: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  decision_notes?: string;
  waitlist_position?: number;
  move_in_date?: string;
  application_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HousingHistory {
  id: string;
  client_id: string;
  housing_type?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  start_date?: string;
  end_date?: string;
  reason_for_leaving?: string;
  landlord_name?: string;
  landlord_phone?: string;
  monthly_rent?: number;
  notes?: string;
  created_at: string;
}

export interface HousingChecklist {
  id: string;
  client_id: string;
  application_id?: string;
  item_name: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string;
  document_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FormDraft {
  id: string;
  client_id?: string;
  user_id?: string;
  form_type: string;
  form_data: Record<string, unknown>;
  current_step: number;
  total_steps?: number;
  is_complete: boolean;
  last_saved_at: string;
  created_at: string;
}

export interface ClientHistory {
  id: string;
  client_id: string;
  user_id?: string;
  action_type: string;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Dashboard view type
export interface ClientDashboard {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  profile_picture_url?: string;
  created_at: string;
  assigned_case_manager?: string;
  housing_status?: HousingStatus;
  vi_spdat_score?: number;
  is_veteran?: boolean;
  is_chronically_homeless?: boolean;
  case_manager_first_name?: string;
  case_manager_last_name?: string;
  pending_tasks: number;
  document_count: number;
  unread_alerts: number;
  last_interaction?: string;
}

// Task overview view type
export interface TaskOverview extends Task {
  client_first_name?: string;
  client_last_name?: string;
  assignee_first_name?: string;
  assignee_last_name?: string;
}

// Upcoming deadline type
export interface UpcomingDeadline {
  item_type: 'task' | 'event' | 'benefit_renewal';
  id: string;
  title: string;
  deadline: string;
  client_id?: string;
  client_name: string;
  user_id?: string;
  priority: string;
}

// Navigation tile type for the UI
export interface NavigationTile {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  badge?: number;
}
