// Audit Log Utility Functions

import { createClient } from './supabase/client';

export interface AuditLogEntry {
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  new_values?: Record<string, unknown>;
  old_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface LegacyAuditLogEntry {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, unknown>;
}

export function diffAuditValues(previous: Record<string, unknown> | null, next: Record<string, unknown> | null) {
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  if (!next) {
    return { oldValues, newValues };
  }

  Object.entries(next).forEach(([key, value]) => {
    const previousValue = previous?.[key];

    if (previousValue !== value) {
      oldValues[key] = previousValue ?? null;
      newValues[key] = value ?? null;
    }
  });

  return { oldValues, newValues };
}

export function convertLegacyAuditLog(legacyEntry: LegacyAuditLogEntry): AuditLogEntry {
  // Map entity_type to table_name
  const entityTypeToTableName: Record<string, string> = {
    'client': 'clients',
    'task': 'tasks',
    'document': 'documents',
    'user': 'profiles',
    'case_management': 'case_management',
    'emergency_contact': 'emergency_contacts',
    'demographics': 'demographics',
    'household_member': 'household_members',
    'calendar_event': 'calendar_events',
    'alert': 'alerts',
    'housing_application': 'housing_applications',
    'signature_request': 'signature_requests'
  };

  const tableName = entityTypeToTableName[legacyEntry.entity_type] || legacyEntry.entity_type;

  return {
    user_id: legacyEntry.user_id,
    action: legacyEntry.action,
    table_name: tableName,
    record_id: legacyEntry.entity_id,
    new_values: legacyEntry.details,
  };
}

/**
 * Log an audit event to the database
 * @param entry - The audit log entry to insert
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('audit_log')
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        table_name: entry.table_name,
        record_id: entry.record_id,
        new_values: entry.new_values || null,
        old_values: entry.old_values || null,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

/**
 * Log a client-related audit event
 */
export async function logClientEvent(
  userId: string,
  action: string,
  clientId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action,
    table_name: 'clients',
    record_id: clientId,
    new_values: details,
  });
}

/**
 * Log a task-related audit event
 */
export async function logTaskEvent(
  userId: string,
  action: string,
  taskId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action,
    table_name: 'tasks',
    record_id: taskId,
    new_values: details,
  });
}

/**
 * Log a document-related audit event
 */
export async function logDocumentEvent(
  userId: string,
  action: string,
  documentId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action,
    table_name: 'documents',
    record_id: documentId,
    new_values: details,
  });
}

/**
 * Log a profile-related audit event
 */
export async function logProfileEvent(
  userId: string,
  action: string,
  profileId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action,
    table_name: 'profiles',
    record_id: profileId,
    new_values: details,
  });
}

/**
 * Log a case management audit event
 */
export async function logCaseManagementEvent(
  userId: string,
  action: string,
  caseId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    user_id: userId,
    action,
    table_name: 'case_management',
    record_id: caseId,
    new_values: details,
  });
}

/**
 * Log with client IP and user agent if available
 */
export async function logAuditEventWithContext(
  entry: Omit<AuditLogEntry, 'ip_address' | 'user_agent'>,
  request?: { headers: Headers }
): Promise<void> {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;

  if (request?.headers) {
    // Extract IP from various headers that might contain it
    ipAddress = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                undefined;
    
    userAgent = request.headers.get('user-agent') || undefined;
  }

  await logAuditEvent({
    ...entry,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

/**
 * Log a legacy format audit event (for backward compatibility during migration)
 * This function converts the legacy format to the new schema
 */
export async function logLegacyAuditEvent(legacyEntry: LegacyAuditLogEntry): Promise<void> {
  const convertedEntry = convertLegacyAuditLog(legacyEntry);
  await logAuditEvent(convertedEntry);
}
