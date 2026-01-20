/**
 * Unified status configuration for consistent labels and colors across the app.
 * 
 * This module provides a single source of truth for status-related UI elements
 * to ensure visual consistency throughout the application.
 */

import { type ClientStatus, type TaskStatus, type HousingStatus } from '@/lib/types';

export interface StatusConfig {
  label: string;
  /** Tailwind classes for background, text, and border */
  classes: string;
  /** Icon color class for badges */
  iconColor?: string;
  /** Description for tooltips */
  description?: string;
}

/**
 * Client status configuration
 */
export const CLIENT_STATUS_CONFIG: Record<ClientStatus, StatusConfig> = {
  active: {
    label: 'Active',
    classes: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
    description: 'Client is actively receiving services',
  },
  pending: {
    label: 'Pending',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
    description: 'Client registration is pending completion',
  },
  inactive: {
    label: 'Inactive',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
    iconColor: 'text-gray-600',
    description: 'Client is not currently receiving services',
  },
  archived: {
    label: 'Archived',
    classes: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
    description: 'Client record has been archived',
  },
};

/**
 * Task status configuration
 */
export const TASK_STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
    description: 'Task is awaiting action',
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
    description: 'Task is currently being worked on',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
    description: 'Task has been completed',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
    iconColor: 'text-gray-600',
    description: 'Task was cancelled',
  },
  overdue: {
    label: 'Overdue',
    classes: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
    description: 'Task is past its due date',
  },
};

/**
 * Task priority configuration
 */
export type TaskPriorityKey = 'urgent' | 'high' | 'medium' | 'low';

export const TASK_PRIORITY_CONFIG: Record<TaskPriorityKey, StatusConfig> = {
  urgent: {
    label: 'Urgent',
    classes: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
    description: 'Requires immediate attention',
  },
  high: {
    label: 'High',
    classes: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600',
    description: 'Should be addressed soon',
  },
  medium: {
    label: 'Medium',
    classes: 'bg-amber-100 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600',
    description: 'Normal priority',
  },
  low: {
    label: 'Low',
    classes: 'bg-slate-100 text-slate-800 border-slate-200',
    iconColor: 'text-slate-600',
    description: 'Can be addressed when time permits',
  },
};

/**
 * Housing status configuration
 */
export const HOUSING_STATUS_CONFIG: Record<HousingStatus, StatusConfig> = {
  housed: {
    label: 'Housed',
    classes: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
    description: 'Client has stable housing',
  },
  unhoused: {
    label: 'Unhoused',
    classes: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
    description: 'Client is currently without housing',
  },
  at_risk: {
    label: 'At Risk',
    classes: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600',
    description: 'Client is at risk of losing housing',
  },
  transitional: {
    label: 'Transitional',
    classes: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
    description: 'Client is in transitional housing',
  },
  unknown: {
    label: 'Unknown',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
    iconColor: 'text-gray-600',
    description: 'Housing status not yet determined',
  },
};

/**
 * Document status configuration
 */
export type DocumentStatusKey = 'pending' | 'verified' | 'rejected';

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatusKey, StatusConfig> = {
  pending: {
    label: 'Pending Review',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
    description: 'Document is awaiting review',
  },
  verified: {
    label: 'Verified',
    classes: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
    description: 'Document has been verified',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
    description: 'Document was rejected',
  },
};

/**
 * Helper function to get status config with fallback
 */
export function getStatusConfig<T extends string>(
  config: Record<T, StatusConfig>,
  status: T | string,
  fallbackLabel?: string
): StatusConfig {
  if (status in config) {
    return config[status as T];
  }
  return {
    label: fallbackLabel || status.toString().replace(/_/g, ' '),
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
    iconColor: 'text-gray-600',
  };
}

/**
 * Get client status config with fallback
 */
export function getClientStatusConfig(status: string): StatusConfig {
  return getStatusConfig(CLIENT_STATUS_CONFIG, status as ClientStatus);
}

/**
 * Get task status config with fallback
 */
export function getTaskStatusConfig(status: string): StatusConfig {
  return getStatusConfig(TASK_STATUS_CONFIG, status as TaskStatus);
}

/**
 * Get task priority config with fallback
 */
export function getTaskPriorityConfig(priority: string): StatusConfig {
  return getStatusConfig(TASK_PRIORITY_CONFIG, priority as TaskPriorityKey);
}

/**
 * Get housing status config with fallback
 */
export function getHousingStatusConfig(status: string): StatusConfig {
  return getStatusConfig(HOUSING_STATUS_CONFIG, status as HousingStatus);
}
