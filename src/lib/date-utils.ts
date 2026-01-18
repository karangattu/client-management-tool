import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const PACIFIC_TIMEZONE = 'America/Los_Angeles';

export function toPacificDate(date: Date | string): Date {
  const dateInput = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateInput, PACIFIC_TIMEZONE);
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
