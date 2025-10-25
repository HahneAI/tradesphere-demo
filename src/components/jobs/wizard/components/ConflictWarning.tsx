/**
 * Conflict Warning Component
 *
 * Displays warning banner when crew schedule conflicts are detected.
 * Shows conflicting jobs with details and actions.
 *
 * @component ConflictWarning
 */

import React from 'react';
import { ScheduleConflict } from '../../../../types/crm';

interface ConflictWarningProps {
  conflicts: ScheduleConflict[];
  onViewSchedule?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ConflictWarning: React.FC<ConflictWarningProps> = ({
  conflicts,
  onViewSchedule,
  onDismiss,
  className = '',
}) => {
  if (conflicts.length === 0) return null;

  const totalConflicts = conflicts.reduce(
    (sum, conflict) => sum + conflict.conflicting_assignments.length,
    0
  );

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className={`rounded-lg border-2 border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20 p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-orange-600 dark:text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
            Schedule Conflict Detected
          </h3>

          {/* Description */}
          <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
            {totalConflicts} conflicting {totalConflicts === 1 ? 'assignment' : 'assignments'}{' '}
            found for the selected crew during this time period.
          </p>

          {/* Conflicting Jobs List */}
          <div className="space-y-2 mb-3">
            {conflicts.map((conflict) =>
              conflict.conflicting_assignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="bg-white dark:bg-gray-800 rounded-md p-3 border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {assignment.job_title}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {assignment.job_number}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                      <div>{formatDate(assignment.scheduled_start)}</div>
                      <div className="text-gray-500 dark:text-gray-500">to</div>
                      <div>{formatDate(assignment.scheduled_end)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {onViewSchedule && (
              <button
                type="button"
                onClick={onViewSchedule}
                className="text-sm font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 underline"
              >
                View Full Schedule
              </button>
            )}
            <span className="text-sm text-orange-700 dark:text-orange-300">
              You can still proceed with scheduling.
            </span>
          </div>
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-100"
            aria-label="Dismiss warning"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
