/**
 * JobBlock Component
 *
 * Individual job block displayed in calendar grid
 * Shows job number, customer, dates, and progress
 * Will be draggable in Phase 4
 *
 * @module JobBlock
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { CalendarJobBlock } from '../../../types/jobs-views';
import { JobPosition } from '../hooks/useJobPositioning';
import { formatShortDate, formatCurrency } from '../../../types/jobs-views';

export interface JobBlockProps {
  job: CalendarJobBlock;
  position: JobPosition;
  visualConfig: any;
  onClick?: (jobId: string) => void;
  isDragging?: boolean;
}

/**
 * Job block for calendar display
 * Positioned absolutely within crew row
 */
export const JobBlock: React.FC<JobBlockProps> = ({
  job,
  position,
  visualConfig,
  onClick,
  isDragging = false
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(job.job_id);
    }
  };

  // Status border colors
  const statusBorders: Record<string, string> = {
    quote: '#94A3B8',
    approved: '#3B82F6',
    scheduled: '#8B5CF6',
    in_progress: '#F59E0B',
    completed: '#10B981',
    invoiced: '#059669',
    cancelled: '#EF4444'
  };

  const borderColor = statusBorders[job.status] || '#94A3B8';

  // Priority badge colors
  const getPriorityColor = (priority: number): string => {
    if (priority >= 10) return '#EF4444'; // Urgent - Red
    if (priority >= 8) return '#F59E0B';  // High - Orange
    if (priority >= 5) return '#3B82F6';  // Normal - Blue
    return '#94A3B8';                      // Low - Gray
  };

  const priorityColor = getPriorityColor(job.priority);

  return (
    <div
      className={`
        absolute rounded-lg border-2 p-2 overflow-hidden
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''}
        ${isDragging ? 'opacity-60' : 'opacity-100'}
      `}
      style={{
        left: position.left,
        width: position.width,
        top: position.top,
        zIndex: position.zIndex,
        backgroundColor: job.color + '20',
        borderColor: borderColor,
        minHeight: '96px'
      }}
      onClick={handleClick}
    >
      {/* Priority Badge */}
      <div
        className="absolute top-1 right-1 w-2 h-2 rounded-full"
        style={{ backgroundColor: priorityColor }}
        title={`Priority: ${job.priority}`}
      />

      {/* Job Number */}
      <div className="font-bold text-sm mb-1" style={{ color: visualConfig.colors.text.primary }}>
        {job.job_number}
      </div>

      {/* Customer Name */}
      <div
        className="text-xs mb-1 truncate"
        style={{ color: visualConfig.colors.text.secondary }}
        title={job.customer_name}
      >
        👤 {job.customer_name}
      </div>

      {/* Job Title (truncated) */}
      <div
        className="text-xs mb-2 truncate"
        style={{ color: visualConfig.colors.text.primary }}
        title={job.job_title}
      >
        {job.job_title}
      </div>

      {/* Date Range */}
      {job.start && job.end && (
        <div className="text-xs mb-1" style={{ color: visualConfig.colors.text.secondary }}>
          📅 {formatShortDate(job.start)} - {formatShortDate(job.end)}
        </div>
      )}

      {/* Estimated Total */}
      {job.estimated_total && (
        <div className="text-xs font-semibold" style={{ color: visualConfig.colors.text.primary }}>
          💰 {formatCurrency(job.estimated_total)}
        </div>
      )}

      {/* Completion Progress Bar */}
      {job.completion_percentage > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${job.completion_percentage}%`,
              backgroundColor: borderColor
            }}
          />
        </div>
      )}
    </div>
  );
};

export default JobBlock;
