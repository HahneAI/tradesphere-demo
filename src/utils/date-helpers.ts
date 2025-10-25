/**
 * Date Helper Utilities for Scheduling Calendar
 *
 * Centralized date manipulation functions for calendar operations
 * Handles week calculations, date comparisons, and formatting
 *
 * @module date-helpers
 */

/**
 * Get the start of the week (Sunday) for a given date
 */
export function getWeekStart(date: Date = new Date()): Date {
  const weekStart = new Date(date);
  const dayOfWeek = weekStart.getDay(); // 0 = Sunday, 6 = Saturday
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get the end of the week (Saturday) for a given date
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const weekEnd = new Date(date);
  const dayOfWeek = weekEnd.getDay();
  weekEnd.setDate(weekEnd.getDate() + (6 - dayOfWeek));
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if two date ranges overlap
 * Used for conflict detection
 */
export function doDateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Calculate duration in days between two dates
 */
export function getDurationInDays(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate duration in hours between two dates
 */
export function getDurationInHours(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60));
}

/**
 * Format date as ISO 8601 date string (YYYY-MM-DD)
 */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format date for display (Jan 20, 2025)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
}

/**
 * Format short date (no year if current year)
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  if (d.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(d);
  }

  return formatDate(date);
}

/**
 * Format date as day of week (Mon, Tue, etc.)
 */
export function formatDayOfWeek(date: Date, short: boolean = true): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: short ? 'short' : 'long'
  }).format(date);
}

/**
 * Format date as month and day (Jan 20)
 */
export function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Format week range (Jan 20 - Jan 26, 2025)
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);

  // If same month, show: Jan 20 - 26, 2025
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${formatMonthDay(weekStart)} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  }

  // If different months, show: Jan 27 - Feb 2, 2025
  return `${formatMonthDay(weekStart)} - ${formatMonthDay(weekEnd)}, ${weekEnd.getFullYear()}`;
}

/**
 * Generate array of dates for a week
 */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/**
 * Set time on a date (useful for scheduled_start/end)
 */
export function setTime(date: Date, hours: number, minutes: number = 0, seconds: number = 0): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, seconds, 0);
  return result;
}

/**
 * Get work day start time (8 AM)
 */
export function getWorkDayStart(date: Date): Date {
  return setTime(date, 8, 0, 0);
}

/**
 * Get work day end time (5 PM)
 */
export function getWorkDayEnd(date: Date): Date {
  return setTime(date, 17, 0, 0);
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date): boolean {
  return date > new Date();
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';

  const isPast = diffMs < 0;

  if (diffDays === 1) return isPast ? 'Yesterday' : 'Tomorrow';
  if (diffDays < 7) return isPast ? `${diffDays} days ago` : `in ${diffDays} days`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return isPast ? `${weeks} week${weeks > 1 ? 's' : ''} ago` : `in ${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return isPast ? `${months} month${months > 1 ? 's' : ''} ago` : `in ${months} month${months > 1 ? 's' : ''}`;
  }

  const years = Math.floor(diffDays / 365);
  return isPast ? `${years} year${years > 1 ? 's' : ''} ago` : `in ${years} year${years > 1 ? 's' : ''}`;
}

/**
 * Calculate the offset in days from week start for a given date
 * Returns 0-6 (Sunday=0, Saturday=6)
 */
export function getDayOffsetFromWeekStart(date: Date, weekStart: Date): number {
  const diffMs = date.getTime() - weekStart.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date falls within a week
 */
export function isDateInWeek(date: Date, weekStart: Date): boolean {
  const weekEnd = addDays(weekStart, 6);
  return date >= weekStart && date <= weekEnd;
}

/**
 * Clamp a date to be within a week range
 * If date is before weekStart, return weekStart
 * If date is after weekEnd, return weekEnd
 */
export function clampToWeek(date: Date, weekStart: Date): Date {
  const weekEnd = addDays(weekStart, 6);

  if (date < weekStart) return weekStart;
  if (date > weekEnd) return weekEnd;
  return date;
}
