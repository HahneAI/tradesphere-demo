/**
 * useWeekNavigation Hook
 *
 * Manages week-based calendar navigation state and operations
 * Provides current week dates, navigation controls, and date utilities
 *
 * @module useWeekNavigation
 */

import { useState, useMemo, useCallback } from 'react';
import {
  getWeekStart,
  getWeekEnd,
  addWeeks,
  getWeekDates,
  formatWeekRange,
  isToday as checkIsToday,
  isSameDay
} from '../../../utils/date-helpers';

export interface UseWeekNavigationReturn {
  // Current week state
  currentWeekStart: Date;
  currentWeekEnd: Date;
  weekDates: Date[];
  weekRange: string; // Formatted string "Jan 20 - 26, 2025"

  // Navigation functions
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToToday: () => void;
  goToWeek: (date: Date) => void;

  // Utility functions
  isToday: (date: Date) => boolean;
  isCurrentWeek: (date: Date) => boolean;
  isInCurrentWeek: (date: Date) => boolean;
}

/**
 * Custom hook for week-based calendar navigation
 *
 * @param initialDate - Starting date (defaults to today)
 * @returns Navigation state and controls
 *
 * @example
 * ```tsx
 * function Calendar() {
 *   const {
 *     weekDates,
 *     weekRange,
 *     goToNextWeek,
 *     goToPreviousWeek,
 *     goToToday,
 *     isToday
 *   } = useWeekNavigation();
 *
 *   return (
 *     <div>
 *       <h2>{weekRange}</h2>
 *       <button onClick={goToPreviousWeek}>Previous</button>
 *       <button onClick={goToToday}>Today</button>
 *       <button onClick={goToNextWeek}>Next</button>
 *       {weekDates.map(date => (
 *         <div key={date.toISOString()} className={isToday(date) ? 'today' : ''}>
 *           {date.getDate()}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWeekNavigation(initialDate?: Date): UseWeekNavigationReturn {
  // Initialize to start of current week (or provided date)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getWeekStart(initialDate || new Date())
  );

  // Calculate week end (memoized)
  const currentWeekEnd = useMemo(() => {
    return getWeekEnd(currentWeekStart);
  }, [currentWeekStart]);

  // Generate array of 7 dates for the current week (memoized)
  const weekDates = useMemo(() => {
    return getWeekDates(currentWeekStart);
  }, [currentWeekStart]);

  // Format week range string (memoized)
  const weekRange = useMemo(() => {
    return formatWeekRange(currentWeekStart);
  }, [currentWeekStart]);

  /**
   * Navigate to next week
   */
  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  }, []);

  /**
   * Navigate to previous week
   */
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart(prev => addWeeks(prev, -1));
  }, []);

  /**
   * Navigate to week containing today
   */
  const goToToday = useCallback(() => {
    setCurrentWeekStart(getWeekStart(new Date()));
  }, []);

  /**
   * Navigate to week containing a specific date
   */
  const goToWeek = useCallback((date: Date) => {
    setCurrentWeekStart(getWeekStart(date));
  }, []);

  /**
   * Check if a date is today
   */
  const isToday = useCallback((date: Date): boolean => {
    return checkIsToday(date);
  }, []);

  /**
   * Check if current week is the week containing today
   */
  const isCurrentWeek = useCallback((weekStart: Date): boolean => {
    const todayWeekStart = getWeekStart(new Date());
    return isSameDay(weekStart, todayWeekStart);
  }, []);

  /**
   * Check if a date falls within the current displayed week
   */
  const isInCurrentWeek = useCallback((date: Date): boolean => {
    return date >= currentWeekStart && date <= currentWeekEnd;
  }, [currentWeekStart, currentWeekEnd]);

  return {
    currentWeekStart,
    currentWeekEnd,
    weekDates,
    weekRange,
    goToNextWeek,
    goToPreviousWeek,
    goToToday,
    goToWeek,
    isToday,
    isCurrentWeek: () => isCurrentWeek(currentWeekStart),
    isInCurrentWeek
  };
}

export default useWeekNavigation;
