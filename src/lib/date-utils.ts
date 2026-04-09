import { formatDistanceToNow } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

export const PACIFIC_TIMEZONE = 'America/Los_Angeles';

function toDateInput(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

function getPacificDateKey(date: Date | string): string {
  return formatInTimeZone(toDateInput(date), PACIFIC_TIMEZONE, 'yyyy-MM-dd');
}

function getPacificDayDifference(date: Date | string, relativeTo: Date | string = new Date()): number {
  const pacificDate = new Date(`${getPacificDateKey(date)}T00:00:00Z`);
  const pacificReference = new Date(`${getPacificDateKey(relativeTo)}T00:00:00Z`);
  return Math.round((pacificDate.getTime() - pacificReference.getTime()) / (1000 * 60 * 60 * 24));
}

export function toPacificDate(date: Date | string): Date {
  const dateInput = toDateInput(date);
  return toZonedTime(dateInput, PACIFIC_TIMEZONE);
}

/**
 * Get the current date/time in Pacific timezone
 */
export function getPacificNow(): Date {
  return toZonedTime(new Date(), PACIFIC_TIMEZONE);
}

/**
 * Get the current hour in Pacific timezone (0-23)
 */
export function getPacificHour(): number {
  const pacificNow = getPacificNow();
  return pacificNow.getHours();
}

/**
 * Get the current year in Pacific timezone
 */
export function getPacificYear(): number {
  const pacificNow = getPacificNow();
  return pacificNow.getFullYear();
}

/**
 * Format a date for display using locale string with Pacific timezone
 * Equivalent to toLocaleDateString() but always in Pacific time
 */
export function formatPacificLocaleDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateInput = toDateInput(date);
  return dateInput.toLocaleDateString('en-US', {
    ...options,
    timeZone: PACIFIC_TIMEZONE,
  });
}

/**
 * Format a date for display using locale string with Pacific timezone
 * Equivalent to toLocaleString() but always in Pacific time
 */
export function formatPacificLocaleDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateInput = toDateInput(date);
  return dateInput.toLocaleString('en-US', {
    ...options,
    timeZone: PACIFIC_TIMEZONE,
  });
}

/**
 * Format a date for display using locale string with Pacific timezone
 * Equivalent to toLocaleTimeString() but always in Pacific time
 */
export function formatPacificLocaleTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateInput = toDateInput(date);
  return dateInput.toLocaleTimeString('en-US', {
    ...options,
    timeZone: PACIFIC_TIMEZONE,
  });
}

/**
 * Get formatted day info in Pacific timezone (weekday, month, day, year)
 */
export function getPacificDayInfo(): { weekday: string; month: string; day: string; year: string } {
  const now = new Date();
  return {
    weekday: formatInTimeZone(now, PACIFIC_TIMEZONE, 'EEEE'),
    month: formatInTimeZone(now, PACIFIC_TIMEZONE, 'MMMM'),
    day: formatInTimeZone(now, PACIFIC_TIMEZONE, 'd'),
    year: formatInTimeZone(now, PACIFIC_TIMEZONE, 'yyyy'),
  };
}

/**
 * Format a date like "Tuesday, January 23, 2026" in Pacific timezone
 */
export function formatPacificFullDate(date?: Date | string): string {
  const dateInput = date ? toDateInput(date) : new Date();
  return formatInTimeZone(dateInput, PACIFIC_TIMEZONE, 'EEEE, MMMM d, yyyy');
}

/**
 * Convert a datetime string that represents Pacific time to UTC ISO string
 * Use this when the user enters a date/time that should be interpreted as Pacific time
 * and you need to store it as UTC in the database
 * 
 * @param dateStr - Date string in format "YYYY-MM-DD"
 * @param timeStr - Optional time string in format "HH:mm" (24-hour). Defaults to "00:00"
 * @returns ISO string in UTC
 */
export function pacificToUTCISO(dateStr: string, timeStr: string = '00:00'): string {
  const dateTimeString = `${dateStr}T${timeStr}:00`;
  const localDate = new Date(dateTimeString);
  
  // Get the offset between local interpretation and Pacific interpretation
  const pacificString = localDate.toLocaleString('en-US', { timeZone: PACIFIC_TIMEZONE });
  const pacificDate = new Date(pacificString);
  const localString = localDate.toLocaleString('en-US');
  const localParsed = new Date(localString);
  
  // Calculate the adjustment needed
  const localOffset = localParsed.getTime() - localDate.getTime();
  const pacificOffset = pacificDate.getTime() - localDate.getTime();
  const adjustment = pacificOffset - localOffset;
  
  return new Date(localDate.getTime() - adjustment).toISOString();
}

export function formatPacificTime(date: Date | string, showSeconds = false): string {
  return formatInTimeZone(toDateInput(date), PACIFIC_TIMEZONE, showSeconds ? 'h:mm:ss a' : 'h:mm a');
}

export function formatPacificDate(date: Date | string): string {
  return formatInTimeZone(toDateInput(date), PACIFIC_TIMEZONE, 'MMM d, yyyy');
}

export function formatPacificDateTime(date: Date | string): string {
  return formatInTimeZone(toDateInput(date), PACIFIC_TIMEZONE, 'MMM d, yyyy h:mm a');
}

export function formatPacificDateTimeFull(date: Date | string): string {
  return formatInTimeZone(toDateInput(date), PACIFIC_TIMEZONE, 'MMMM d, yyyy \'at\' h:mm a');
}

export function formatPacificDayOfWeek(date: Date | string): string {
  return formatInTimeZone(toDateInput(date), PACIFIC_TIMEZONE, 'EEEE');
}

export function formatPacificDayAndMonth(date: Date | string): string {
  return formatInTimeZone(toDateInput(date), PACIFIC_TIMEZONE, 'MMMM d');
}

export function formatPacificTimeRange(start: Date | string, end: Date | string): string {
  const startTime = formatInTimeZone(toDateInput(start), PACIFIC_TIMEZONE, 'h:mm a');
  const endTime = formatInTimeZone(toDateInput(end), PACIFIC_TIMEZONE, 'h:mm a');
  
  return `${startTime} - ${endTime}`;
}

export function formatPacificRelative(date: Date | string, addSuffix = true): string {
  const dateInput = toDateInput(date);
  
  // For very recent events (within minutes), show "just now"
  const now = new Date();
  const diffMs = now.getTime() - dateInput.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes < 1) {
    return 'just now';
  }
  
  if (diffMinutes < 60) {
    return `about ${Math.floor(diffMinutes)} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
  
  return formatDistanceToNow(dateInput, { addSuffix });
}

export function formatPacificFriendly(date: Date | string, showTime = true): string {
  const dateInput = toDateInput(date);
  const dayDifference = getPacificDayDifference(dateInput);
  const timeLabel = formatInTimeZone(dateInput, PACIFIC_TIMEZONE, 'h:mm a');
  
  if (dayDifference === 0) {
    return showTime 
      ? `Today at ${timeLabel}`
      : 'Today';
  }
  
  if (dayDifference === 1) {
    return showTime 
      ? `Tomorrow at ${timeLabel}`
      : 'Tomorrow';
  }
  
  if (dayDifference === -1) {
    return showTime 
      ? `Yesterday at ${timeLabel}`
      : 'Yesterday';
  }
  
  // For dates within the next 7 days, show day of week
  const diffDays = Math.abs(dayDifference);
  
  if (diffDays <= 7) {
    return showTime
      ? formatInTimeZone(dateInput, PACIFIC_TIMEZONE, 'EEEE h:mm a')
      : formatInTimeZone(dateInput, PACIFIC_TIMEZONE, 'EEEE');
  }
  
  // Otherwise show full date
  return showTime
    ? formatInTimeZone(dateInput, PACIFIC_TIMEZONE, 'MMM d, yyyy h:mm a')
    : formatInTimeZone(dateInput, PACIFIC_TIMEZONE, 'MMM d, yyyy');
}

export function formatPacificDueDate(date: Date | string): string {
  const dateInput = toDateInput(date);
  const now = new Date();
  const isOverdue = dateInput.getTime() < now.getTime();
  const dayDifference = getPacificDayDifference(dateInput, now);
  const timeLabel = formatInTimeZone(dateInput, PACIFIC_TIMEZONE, 'h:mm a');
  
  if (dayDifference === 0 && !isOverdue) {
    return `Today at ${timeLabel}`;
  }
  
  if (dayDifference === 1 && !isOverdue) {
    return `Tomorrow at ${timeLabel}`;
  }
  
  if (isOverdue) {
    const daysOverdue = Math.abs(dayDifference);
    if (daysOverdue === 0) {
      return `Due today (${timeLabel})`;
    }
    return `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue (${formatInTimeZone(dateInput, PACIFIC_TIMEZONE, 'MMM d')})`;
  }
  
  return formatInTimeZone(dateInput, PACIFIC_TIMEZONE, 'MMM d, h:mm a');
}
