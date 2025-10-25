/**
 * WeekHeader Component
 *
 * Displays week navigation controls and day column headers
 * - Previous/Next week buttons
 * - "Today" quick navigation button
 * - Week range display
 * - 7-day column headers with date labels
 * - Today highlighting
 *
 * @module WeekHeader
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { formatDayOfWeek, formatMonthDay, isToday } from '../../../utils/date-helpers';

export interface WeekHeaderProps {
  /** Array of 7 dates for the current week (Sunday - Saturday) */
  weekDates: Date[];

  /** Formatted week range string (e.g., "Jan 20 - 26, 2025") */
  weekRange: string;

  /** Navigate to previous week */
  onPreviousWeek: () => void;

  /** Navigate to next week */
  onNextWeek: () => void;

  /** Navigate to week containing today */
  onToday: () => void;

  /** Is current week the week containing today */
  isCurrentWeek: boolean;

  /** Visual configuration from theme */
  visualConfig: any;
}

/**
 * Week header with navigation and day columns
 *
 * Desktop Layout:
 * ┌─────────────────────────────────────────────────┐
 * │  <   Jan 20 - 26, 2025   >        [Today]      │
 * ├─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┤
 * │ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │      │
 * │ 1/20│ 1/21│ 1/22│ 1/23│ 1/24│ 1/25│ 1/26│      │
 * └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
 *
 * Mobile Layout (<768px):
 * - Abbreviated day names (S, M, T, W, T, F, S)
 * - Smaller navigation buttons
 * - Horizontal scroll for week dates
 */
export const WeekHeader: React.FC<WeekHeaderProps> = ({
  weekDates,
  weekRange,
  onPreviousWeek,
  onNextWeek,
  onToday,
  isCurrentWeek,
  visualConfig
}) => {
  return (
    <div className="flex flex-col border-b" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
      {/* Navigation Row */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Previous Week Button */}
          <button
            onClick={onPreviousWeek}
            className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
            style={{
              color: visualConfig.colors.text.secondary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = visualConfig.colors.text.secondary + '10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Previous week"
          >
            <Icons.ChevronLeft size={20} />
          </button>

          {/* Week Range Display */}
          <h3
            className="font-bold text-lg min-w-[200px] text-center"
            style={{ color: visualConfig.colors.text.primary }}
          >
            {weekRange}
          </h3>

          {/* Next Week Button */}
          <button
            onClick={onNextWeek}
            className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
            style={{
              color: visualConfig.colors.text.secondary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = visualConfig.colors.text.secondary + '10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Next week"
          >
            <Icons.ChevronRight size={20} />
          </button>
        </div>

        {/* Today Button */}
        <button
          onClick={onToday}
          disabled={isCurrentWeek}
          className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isCurrentWeek
              ? visualConfig.colors.text.secondary + '10'
              : visualConfig.colors.primary + '10',
            color: isCurrentWeek
              ? visualConfig.colors.text.secondary
              : visualConfig.colors.primary
          }}
          aria-label="Go to today"
        >
          Today
        </button>
      </div>

      {/* Day Column Headers */}
      <div className="grid grid-cols-7 border-t" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
        {weekDates.map((date, index) => {
          const today = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={`
                px-2 py-3 text-center border-r last:border-r-0
                ${today ? 'font-bold' : 'font-medium'}
              `}
              style={{
                borderColor: visualConfig.colors.text.secondary + '20',
                backgroundColor: today
                  ? visualConfig.colors.primary + '05'
                  : 'transparent',
                color: today
                  ? visualConfig.colors.primary
                  : visualConfig.colors.text.secondary
              }}
            >
              {/* Day of Week */}
              <div className="text-xs uppercase tracking-wide hidden sm:block">
                {formatDayOfWeek(date, true)}
              </div>
              <div className="text-xs uppercase tracking-wide sm:hidden">
                {formatDayOfWeek(date, true).charAt(0)}
              </div>

              {/* Date */}
              <div
                className={`text-sm mt-1 ${today ? 'font-bold' : ''}`}
                style={{
                  color: today
                    ? visualConfig.colors.primary
                    : visualConfig.colors.text.primary
                }}
              >
                {formatMonthDay(date)}
              </div>

              {/* Today Indicator Dot */}
              {today && (
                <div
                  className="w-1.5 h-1.5 rounded-full mx-auto mt-1"
                  style={{ backgroundColor: visualConfig.colors.primary }}
                  aria-label="Today"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekHeader;
