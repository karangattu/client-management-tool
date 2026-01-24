import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

export const PACIFIC_TIMEZONE = 'America/Los_Angeles';

export function toPacificDate(date: Date | string): Date {
  const dateInput = typeof date === 'string' ? new Date(date) : date;
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
  const dateInput = typeof date === 'string' ? new Date(date) : date;
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
  const dateInput = typeof date === 'string' ? new Date(date) : date;
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
  const dateInput = typeof date === 'string' ? new Date(date) : date;
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
  const dateInput = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
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
  const pacificDate = toPacificDate(date);
  return format(pacificDate, showSeconds ? 'h:mm:ss a' : 'h:mm a');
}

export function formatPacificDate(date: Date | string): string {
  const pacificDate = toPacificDate(date);
  return format(pacificDate, 'MMM d, yyyy');
}

export function formatPacificDateTime(date: Date | string): string {
  const pacificDate = toPacificDate(date);
  return format(pacificDate, 'MMM d, yyyy h:mm a');
}

export function formatPacificDateTimeFull(date: Date | string): string {
  const pacificDate = toPacificDate(date);
  return format(pacificDate, 'MMMM d, yyyy \'at\' h:mm a');
}

export function formatPacificDayOfWeek(date: Date | string): string {
  const pacificDate = toPacificDate(date);
  return format(pacificDate, 'EEEE');
}

export function formatPacificDayAndMonth(date: Date | string): string {
  const pacificDate = toPacificDate(date);
  return format(pacificDate, 'MMMM d');
}

export function formatPacificTimeRange(start: Date | string, end: Date | string): string {
  const startPacific = toPacificDate(start);
  const endPacific = toPacificDate(end);
  
  const startTime = format(startPacific, 'h:mm a');
  const endTime = format(endPacific, 'h:mm a');
  
  return `${startTime} - ${endTime}`;
}

export function formatPacificRelative(date: Date | string, addSuffix = true): string {
  const pacificDate = toPacificDate(date);
  
  // For very recent events (within minutes), show "just now"
  const now = new Date();
  const diffMs = now.getTime() - pacificDate.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes < 1) {
    return 'just now';
  }
  
  if (diffMinutes < 60) {
    return `about ${Math.floor(diffMinutes)} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
  
  return formatDistanceToNow(pacificDate, { addSuffix });
}

export function formatPacificFriendly(date: Date | string, showTime = true): string {
  const pacificDate = toPacificDate(date);
  
  if (isToday(pacificDate)) {
    return showTime 
      ? `Today at ${format(pacificDate, 'h:mm a')}`
      : 'Today';
  }
  
  if (isTomorrow(pacificDate)) {
    return showTime 
      ? `Tomorrow at ${format(pacificDate, 'h:mm a')}`
      : 'Tomorrow';
  }
  
  if (isYesterday(pacificDate)) {
    return showTime 
      ? `Yesterday at ${format(pacificDate, 'h:mm a')}`
      : 'Yesterday';
  }
  
  // For dates within the next 7 days, show day of week
  const now = new Date();
  const diffDays = Math.abs(Math.floor((pacificDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  if (diffDays <= 7) {
    return showTime
      ? `${format(pacificDate, 'EEEE h:mm a')}`
      : format(pacificDate, 'EEEE');
  }
  
  // Otherwise show full date
  return showTime
    ? format(pacificDate, 'MMM d, yyyy h:mm a')
    : format(pacificDate, 'MMM d, yyyy');
}

export function formatPacificDueDate(date: Date | string): string {
  const pacificDate = toPacificDate(date);
  const now = new Date();
  const isOverdue = pacificDate < now;
  
  if (isToday(pacificDate) && !isOverdue) {
    return `Today at ${format(pacificDate, 'h:mm a')}`;
  }
  
  if (isTomorrow(pacificDate) && !isOverdue) {
    return `Tomorrow at ${format(pacificDate, 'h:mm a')}`;
  }
  
  if (isOverdue) {
    const daysOverdue = Math.floor((now.getTime() - pacificDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue === 0) {
      return `Due today (${format(pacificDate, 'h:mm a')})`;
    }
    return `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue (${format(pacificDate, 'MMM d')})`;
  }
  
  return format(pacificDate, 'MMM d, h:mm a');
}
