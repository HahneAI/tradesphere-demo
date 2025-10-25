/**
 * CrewRow Component
 *
 * Single crew row in calendar with 7 day columns
 * Shows crew name, utilization, and positioned job blocks
 *
 * @module CrewRow
 */

import React from 'react';
import { Crew } from '../../../types/crm';
import { CalendarJobBlock } from '../../../types/jobs-views';
import { useJobPositioning } from '../hooks/useJobPositioning';
import { JobBlock } from './JobBlock';

export interface CrewRowProps {
  crew: Crew;
  weekStart: Date;
  assignments: CalendarJobBlock[];
  visualConfig: any;
  onJobClick?: (jobId: string) => void;
}

/**
 * Crew row with job blocks positioned by date
 */
export const CrewRow: React.FC<CrewRowProps> = ({
  crew,
  weekStart,
  assignments,
  visualConfig,
  onJobClick
}) => {
  const { getJobPosition } = useJobPositioning();

  // Calculate utilization (placeholder - will be enhanced)
  const totalHours = assignments.reduce((sum, job) => sum + (job.estimated_hours || 0), 0);
  const utilizationPercent = Math.min(100, Math.round((totalHours / (crew.max_capacity * 40)) * 100));

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

      {/* Calendar Grid - 7 day cells */}
      <div className="grid grid-cols-7 relative" style={{ minHeight: '120px' }}>
        {/* Day cell borders */}
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="border-r last:border-r-0"
            style={{
              borderColor: visualConfig.colors.text.secondary + '10',
              minHeight: '120px'
            }}
          />
        ))}

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
                  onClick={onJobClick}
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
