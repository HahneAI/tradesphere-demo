/**
 * UnassignedSection Component
 *
 * Displays jobs that haven't been assigned to any crew
 * Horizontal scrollable list of draggable job cards
 *
 * @module UnassignedSection
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { CalendarJobBlock } from '../../../types/jobs-views';
import { formatDate, formatCurrency } from '../../../types/jobs-views';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

export interface UnassignedSectionProps {
  jobs: CalendarJobBlock[];
  visualConfig: any;
  onJobClick?: (jobId: string) => void;
  onJobDoubleClick?: (jobId: string) => void;
  onJobContextMenu?: (e: React.MouseEvent, jobId: string, jobNumber: string) => void;
}

/**
 * Section showing unassigned jobs
 * Jobs are draggable for crew assignment
 */
export const UnassignedSection: React.FC<UnassignedSectionProps> = ({
  jobs,
  visualConfig,
  onJobClick,
  onJobDoubleClick,
  onJobContextMenu
}) => {
  const { handleDragStart, handleDragEnd, draggedJob } = useDragAndDrop();

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div
      className="border-b p-4"
      style={{
        borderColor: visualConfig.colors.text.secondary + '20',
        backgroundColor: visualConfig.colors.surface
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icons.Inbox size={20} style={{ color: visualConfig.colors.text.secondary }} />
          <h3 className="font-bold" style={{ color: visualConfig.colors.text.primary }}>
            Unassigned Jobs
          </h3>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: '#EF4444' + '20',
              color: '#EF4444'
            }}
          >
            {jobs.length}
          </span>
        </div>
      </div>

      {/* Horizontal scrollable job list */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {jobs.map((job) => {
          const isDragging = draggedJob?.job_id === job.job_id;

          return (
            <div
              key={job.job_id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, job, null)}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDragging && onJobClick) onJobClick(job.job_id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (onJobDoubleClick) onJobDoubleClick(job.job_id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onJobContextMenu) onJobContextMenu(e, job.job_id, job.job_number);
              }}
              className={`
                flex-shrink-0 w-64 p-3 rounded-lg border-2 transition-all
                ${isDragging ? 'opacity-60 cursor-grabbing' : 'cursor-grab hover:shadow-md'}
              `}
              style={{
                backgroundColor: visualConfig.colors.background,
                borderColor: '#94A3B8'
              }}
            >
            {/* Job Number */}
            <div className="font-bold text-sm mb-1" style={{ color: visualConfig.colors.text.primary }}>
              {job.job_number}
            </div>

            {/* Customer */}
            <div className="text-xs mb-1" style={{ color: visualConfig.colors.text.secondary }}>
              👤 {job.customer_name}
            </div>

            {/* Job Title */}
            <div
              className="text-xs mb-2 line-clamp-2"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {job.job_title}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs" style={{ color: visualConfig.colors.text.secondary }}>
              <span>⏱️ {job.estimated_hours}h</span>
              <span>🎯 P{job.priority}</span>
              {job.estimated_total && <span>{formatCurrency(job.estimated_total)}</span>}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default UnassignedSection;
