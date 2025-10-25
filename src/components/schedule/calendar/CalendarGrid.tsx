/**
 * CalendarGrid Component
 *
 * Main calendar grid layout with crew rows
 * Displays weekly timeline with job blocks
 *
 * @module CalendarGrid
 */

import React from 'react';
import { Crew } from '../../../types/crm';
import { CalendarJobBlock } from '../../../types/jobs-views';
import { CrewRow } from './CrewRow';
import { UnassignedSection } from './UnassignedSection';

export interface CalendarGridProps {
  crews: Crew[];
  weekStart: Date;
  assignedJobs: CalendarJobBlock[];
  unassignedJobs: CalendarJobBlock[];
  visualConfig: any;
  onJobClick?: (jobId: string) => void;
}

/**
 * Calendar grid with crew rows and job blocks
 */
export const CalendarGrid: React.FC<CalendarGridProps> = ({
  crews,
  weekStart,
  assignedJobs,
  unassignedJobs,
  visualConfig,
  onJobClick
}) => {
  // Group assigned jobs by crew
  const jobsByCrew = assignedJobs.reduce((acc, job) => {
    if (job.crew_id) {
      if (!acc[job.crew_id]) {
        acc[job.crew_id] = [];
      }
      acc[job.crew_id].push(job);
    }
    return acc;
  }, {} as Record<string, CalendarJobBlock[]>);

  return (
    <div className="flex flex-col">
      {/* Unassigned Jobs Section */}
      <UnassignedSection
        jobs={unassignedJobs}
        visualConfig={visualConfig}
        onJobClick={onJobClick}
      />

      {/* Crew Rows */}
      <div className="border-t" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
        {crews.map((crew) => (
          <CrewRow
            key={crew.id}
            crew={crew}
            weekStart={weekStart}
            assignments={jobsByCrew[crew.id] || []}
            visualConfig={visualConfig}
            onJobClick={onJobClick}
          />
        ))}
      </div>

      {/* Empty State */}
      {crews.length === 0 && (
        <div className="text-center p-12">
          <p style={{ color: visualConfig.colors.text.secondary }}>
            No crews available. Using mock crews for development.
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarGrid;
