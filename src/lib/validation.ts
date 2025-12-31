// Foreign Key Validation and Data Integrity Utilities
// Provides functions for validating referential integrity and data consistency

import { createClient } from './supabase/client';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate foreign key references for client data
 */
export async function validateClientReferences(clientId: string): Promise<ValidationResult> {
  const supabase = createClient();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, assigned_case_manager')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      errors.push(`Client with ID ${clientId} does not exist`);
      return { isValid: false, errors, warnings };
    }

    // Check related emergency contacts
    const { error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('id, name')
      .eq('client_id', clientId);

    if (contactsError) {
      warnings.push('Could not verify emergency contacts');
    }

    // Check case management record
    const { error: caseMgmtError } = await supabase
      .from('case_management')
      .select('id')
      .eq('client_id', clientId)
      .single();

    if (caseMgmtError && caseMgmtError.code !== 'PGRST116') {
      warnings.push('Could not verify case management record');
    }

    // Check assigned case manager if exists
    if (client.assigned_case_manager) {
      const { data: manager, error: managerError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', client.assigned_case_manager)
        .single();

      if (managerError || !manager) {
        errors.push('Assigned case manager does not exist');
      } else if (!['staff', 'case_manager', 'admin'].includes(manager.role)) {
        errors.push('Assigned case manager does not have appropriate role');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings
    };
  }
}

/**
 * Validate foreign key references for task data
 */
export async function validateTaskReferences(taskId: string): Promise<ValidationResult> {
  const supabase = createClient();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if task exists
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, client_id, assigned_to, assigned_by')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      errors.push(`Task with ID ${taskId} does not exist`);
      return { isValid: false, errors, warnings };
    }

    // Check client reference if exists
    if (task.client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('id', task.client_id)
        .single();

      if (clientError || !client) {
        errors.push('Referenced client does not exist');
      }
    }

    // Check assigned user if exists
    if (task.assigned_to) {
      const { data: assignee, error: assigneeError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', task.assigned_to)
        .single();

      if (assigneeError || !assignee) {
        errors.push('Assigned user does not exist');
      }
    }

    // Check assigned_by user if exists
    if (task.assigned_by) {
      const { data: assigner, error: assignerError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', task.assigned_by)
        .single();

      if (assignerError || !assigner) {
        errors.push('Task creator does not exist');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings
    };
  }
}

/**
 * Validate document references
 */
export async function validateDocumentReferences(documentId: string): Promise<ValidationResult> {
  const supabase = createClient();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if document exists
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, client_id, uploaded_by')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      errors.push(`Document with ID ${documentId} does not exist`);
      return { isValid: false, errors, warnings };
    }

    // Check client reference
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('id', document.client_id)
      .single();

    if (clientError || !client) {
      errors.push('Document owner client does not exist');
    }

    // Check uploader if exists
    if (document.uploaded_by) {
      const { data: uploader, error: uploaderError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', document.uploaded_by)
        .single();

      if (uploaderError || !uploader) {
        warnings.push('Document uploader does not exist');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings
    };
  }
}

/**
 * Batch validate multiple entities
 */
export async function batchValidateReferences(
  validations: Array<{ type: 'client' | 'task' | 'document'; id: string }>
): Promise<Record<string, ValidationResult>> {
  const results: Record<string, ValidationResult> = {};

  for (const validation of validations) {
    const key = `${validation.type}:${validation.id}`;
    
    switch (validation.type) {
      case 'client':
        results[key] = await validateClientReferences(validation.id);
        break;
      case 'task':
        results[key] = await validateTaskReferences(validation.id);
        break;
      case 'document':
        results[key] = await validateDocumentReferences(validation.id);
        break;
      default:
        results[key] = {
          isValid: false,
          errors: [`Unknown validation type: ${validation.type}`],
          warnings: []
        };
    }
  }

  return results;
}

/**
 * Check for orphaned records in a table
 */
export async function findOrphanedRecords(
  tableName: string,
  foreignKeyColumn: string,
  referenceTable: string,
  referenceColumn: string = 'id'
): Promise<string[]> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .rpc('find_orphaned_records', {
        table_name: tableName,
        fk_column: foreignKeyColumn,
        ref_table: referenceTable,
        ref_column: referenceColumn
      });

    if (error) {
      console.warn('Could not check for orphaned records:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('Error checking orphaned records:', error);
    return [];
  }
}

/**
 * Validate enum values against database constraints
 */
export function validateEnumValue<T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
  fieldName: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!value) {
    return { isValid: true, errors, warnings };
  }

  if (!allowedValues.includes(value as T)) {
    errors.push(`${fieldName} must be one of: ${allowedValues.join(', ')}. Received: ${value}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive data validation for client operations
 */
export interface ClientValidationData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  assignedCaseManager?: string;
  portalUserId?: string;
}

export function validateClientData(data: ClientValidationData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.firstName?.trim()) {
    errors.push('First name is required');
  }

  if (!data.lastName?.trim()) {
    errors.push('Last name is required');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email format is invalid');
  }

  if (data.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
    errors.push('Phone number format is invalid');
  }

  // Status validation
  if (data.status) {
    const statusValidation = validateEnumValue(
      data.status,
      ['active', 'inactive', 'pending', 'archived'] as const,
      'Status'
    );
    errors.push(...statusValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}