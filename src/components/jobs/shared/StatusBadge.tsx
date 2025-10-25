/**
 * Status Badge Component
 *
 * Color-coded badge for job status display
 * Used across all job views (Kanban, Table, Calendar)
 *
 * @module StatusBadge
 */

import React from 'react';
import { JobStatus, getJobStatusLabel } from '../../../types/crm';
import { STATUS_COLORS } from '../../../types/jobs-views';

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Status Badge Component
 * Displays job status with appropriate color coding
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = false,
  className = ''
}) => {
  const colors = STATUS_COLORS[status];
  const label = getJobStatusLabel(status);

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  // Status icons
  const statusIcons: Record<JobStatus, string> = {
    quote: '📝',
    approved: '✅',
    scheduled: '📅',
    in_progress: '⚡',
    completed: '✓',
    invoiced: '💵',
    cancelled: '❌'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border
      }}
    >
      {showIcon && (
        <span className="text-xs leading-none">{statusIcons[status]}</span>
      )}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
