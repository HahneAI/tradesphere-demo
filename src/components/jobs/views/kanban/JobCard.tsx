/**
 * Job Card Component
 *
 * Draggable card for Kanban view
 * Displays key job information with quick actions
 *
 * @module JobCard
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as Icons from 'lucide-react';
import { JobListItem } from '../../../../types/crm';
import { PriorityIndicator } from '../../shared/PriorityIndicator';
import { formatCurrency, formatShortDate } from '../../../../types/jobs-views';

interface JobCardProps {
  job: JobListItem;
  isDragging: boolean;
  onClick: () => void;
  visualConfig: any;
  theme: 'light' | 'dark';
}

/**
 * Job Card
 * Draggable card component for Kanban view
 */
export const JobCard: React.FC<JobCardProps> = ({
  job,
  isDragging,
  onClick,
  visualConfig,
  theme
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1
  };

  const cardStyle = {
    backgroundColor: visualConfig.colors.background,
    borderColor: visualConfig.colors.text.secondary + '30',
    ...style
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="p-3 rounded-lg border cursor-move hover:shadow-md transition-all"
    >
      {/* Header: Job number and priority */}
      <div className="flex items-start justify-between mb-2">
        <span
          className="text-xs font-mono font-semibold"
          style={{ color: visualConfig.colors.primary }}
        >
          {job.job_number}
        </span>
        <PriorityIndicator
          priority={job.priority}
          variant="dot"
          size="sm"
        />
      </div>

      {/* Customer name */}
      <h4
        className="font-semibold text-sm mb-1 line-clamp-1"
        style={{ color: visualConfig.colors.text.primary }}
      >
        {job.customer_name}
      </h4>

      {/* Job title */}
      <p
        className="text-xs mb-2 line-clamp-2"
        style={{ color: visualConfig.colors.text.secondary }}
      >
        {job.title}
      </p>

      {/* Address (if available) */}
      {job.service_address && (
        <div className="flex items-start gap-1 mb-2">
          <Icons.MapPin
            size={12}
            className="mt-0.5 flex-shrink-0"
            style={{ color: visualConfig.colors.text.secondary }}
          />
          <p
            className="text-xs line-clamp-1"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            {job.service_address}
          </p>
        </div>
      )}

      {/* Footer: Value and date */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
        {/* Estimated value */}
        <span
          className="text-sm font-bold"
          style={{ color: visualConfig.colors.primary }}
        >
          {formatCurrency(job.estimated_total)}
        </span>

        {/* Scheduled date */}
        {job.scheduled_start_date && (
          <div className="flex items-center gap-1">
            <Icons.Calendar
              size={12}
              style={{ color: visualConfig.colors.text.secondary }}
            />
            <span
              className="text-xs"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              {formatShortDate(job.scheduled_start_date)}
            </span>
          </div>
        )}
      </div>

      {/* Overdue indicator */}
      {job.is_overdue && (
        <div
          className="mt-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
          style={{
            backgroundColor: '#FEE2E2',
            color: '#991B1B'
          }}
        >
          <Icons.AlertCircle size={12} />
          <span>Overdue</span>
        </div>
      )}

      {/* Tags */}
      {job.tags && job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {job.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: visualConfig.colors.text.secondary + '20',
                color: visualConfig.colors.text.secondary
              }}
            >
              {tag}
            </span>
          ))}
          {job.tags.length > 2 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: visualConfig.colors.text.secondary + '20',
                color: visualConfig.colors.text.secondary
              }}
            >
              +{job.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Crew indicator (if assigned) */}
      {job.assigned_crews_count > 0 && (
        <div
          className="mt-2 flex items-center gap-1 text-xs"
          style={{ color: visualConfig.colors.text.secondary }}
        >
          <Icons.Users size={12} />
          <span>{job.assigned_crews_count} crew{job.assigned_crews_count > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
};

export default JobCard;
