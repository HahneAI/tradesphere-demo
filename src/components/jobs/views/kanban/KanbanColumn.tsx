/**
 * Kanban Column Component
 *
 * Single status column in Kanban board
 * Acts as drop zone for draggable job cards
 *
 * @module KanbanColumn
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { JobListItem, JobStatus } from '../../../../types/crm';
import { JobCard } from './JobCard';
import { formatCurrency } from '../../../../types/jobs-views';

interface KanbanColumnProps {
  id: JobStatus;
  label: string;
  color: string;
  jobs: JobListItem[];
  onJobClick: (jobId: string) => void;
  visualConfig: any;
  theme: 'light' | 'dark';
}

/**
 * Kanban Column
 * Droppable container for job cards
 */
export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  label,
  color,
  jobs,
  onJobClick,
  visualConfig,
  theme
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Calculate total value of jobs in this column
  const totalValue = jobs.reduce((sum, job) => sum + (job.estimated_total || 0), 0);

  return (
    <div className="flex flex-col w-80 min-w-[320px] h-full">
      {/* Column Header */}
      <div
        className="p-3 rounded-t-lg border-b-2"
        style={{
          backgroundColor: `${color}15`,
          borderColor: color
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3
            className="font-bold text-sm uppercase tracking-wide"
            style={{ color }}
          >
            {label}
          </h3>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${color}30`,
              color
            }}
          >
            {jobs.length}
          </span>
        </div>

        {/* Total value */}
        {totalValue > 0 && (
          <p
            className="text-xs font-medium"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            {formatCurrency(totalValue)} total
          </p>
        )}
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-2 overflow-y-auto rounded-b-lg transition-colors ${
          isOver ? 'ring-2 ring-offset-2' : ''
        }`}
        style={{
          backgroundColor: visualConfig.colors.surface,
          ringColor: isOver ? color : 'transparent'
        }}
      >
        <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.length === 0 ? (
            <div
              className="text-center py-8 px-4 rounded-lg border-2 border-dashed"
              style={{
                borderColor: visualConfig.colors.text.secondary + '20',
                color: visualConfig.colors.text.secondary
              }}
            >
              <p className="text-sm">No jobs</p>
            </div>
          ) : (
            jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                isDragging={false}
                onClick={() => onJobClick(job.id)}
                visualConfig={visualConfig}
                theme={theme}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;
