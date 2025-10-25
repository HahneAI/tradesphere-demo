/**
 * CrewRow Component
 *
 * Single crew row in calendar with 7 day columns
 * Shows crew name, utilization, and positioned job blocks
 * Drop target for job assignment
 *
 * @module CrewRow
 */

import React, { useMemo } from 'react';
import { Crew } from '../../../types/crm';
import { CalendarJobBlock } from '../../../types/jobs-views';
import { useJobPositioning } from '../hooks/useJobPositioning';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { JobBlock } from './JobBlock';
import { addDays } from '../../../utils/date-helpers';
import { useDragDrop } from '../context/DragDropContext';

export interface CrewRowProps {
  crew: Crew;
  weekStart: Date;
  assignments: CalendarJobBlock[];
  visualConfig: any;
  onJobClick?: (jobId: string) => void;
  onJobDoubleClick?: (jobId: string) => void;
  onJobContextMenu?: (e: React.MouseEvent, jobId: string, jobNumber: string) => void;
}

/**
 * Crew row with job blocks positioned by date
 * Drop target for crew assignment
 */
export const CrewRow: React.FC<CrewRowProps> = ({
  crew,
  weekStart,
  assignments,
  visualConfig,
  onJobClick,
  onJobDoubleClick,
  onJobContextMenu
}) => {
  const { getJobPosition } = useJobPositioning();
  const { handleDragOver, handleDragEnter, handleDragLeave, handleDrop } = useDragAndDrop();
  const { dropTarget } = useDragDrop();

  // Calculate utilization (placeholder - will be enhanced)
  const totalHours = assignments.reduce((sum, job) => sum + (job.estimated_hours || 0), 0);
  const utilizationPercent = Math.min(100, Math.round((totalHours / (crew.max_capacity * 40)) * 100));

  // Generate 7 day cells
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  return (
    <div
      className="border-b"
      style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
    >
      {/* Crew Header */}
      <div className="flex items-center gap-3 p-3 bg-opacity-5" style={{ backgroundColor: crew.color_code }}>
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: crew.color_code }}
        />
        <div className="flex-1">
          <div className="font-semibold text-sm" style={{ color: visualConfig.colors.text.primary }}>
            {crew.crew_name}
          </div>
          <div className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
            {utilizationPercent}% utilized • {assignments.length} jobs
          </div>
        </div>
      </div>

      {/* Calendar Grid - 7 day cells with drop zones */}
      <div className="grid grid-cols-7 relative" style={{ minHeight: '120px' }}>
        {/* Day cell borders with drop zones */}
        {weekDates.map((date, index) => {
          const isDropTarget = dropTarget?.crewId === crew.id &&
                               dropTarget?.date.toDateString() === date.toDateString();

          return (
            <div
              key={index}
              className={`border-r last:border-r-0 transition-colors ${
                isDropTarget ? 'bg-green-100 border-green-500 border-2 border-dashed' : ''
              }`}
              style={{
                borderColor: isDropTarget ? '#10B981' : visualConfig.colors.text.secondary + '10',
                minHeight: '120px'
              }}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, crew.id, date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, crew.id, date)}
            />
          );
        })}

        {/* Job blocks (absolutely positioned) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full pointer-events-auto">
            {assignments.map((job) => {
              const position = getJobPosition(job, weekStart, assignments);
              return (
                <JobBlock
                  key={job.job_id}
                  job={job}
                  position={position}
                  visualConfig={visualConfig}
                  sourceCrewId={crew.id}
                  onClick={onJobClick}
                  onDoubleClick={onJobDoubleClick}
                  onContextMenu={onJobContextMenu}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrewRow;
