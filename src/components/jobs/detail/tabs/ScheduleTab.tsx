/**
 * Job Schedule Tab
 *
 * Displays crew assignments and scheduling information
 * Shows dates, crew details, and progress tracking
 *
 * @module ScheduleTab
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { JobWithDetails } from '../../../../types/crm';
import { formatDate } from '../../../../utils/formatting';

interface ScheduleTabProps {
  job: JobWithDetails;
  companyId: string;
  userId: string;
  onUpdate: () => void;
  visualConfig: any;
  theme: any;
}

/**
 * Schedule Tab Component
 * Displays scheduling and crew assignment information
 */
export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  job,
  companyId,
  userId,
  onUpdate,
  visualConfig,
  theme
}) => {
  const assignments = job.assignments || [];
  const hasAssignments = assignments.length > 0;

  return (
    <div className="space-y-6">
      {/* Schedule Status */}
      <div>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Schedule Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scheduled Start */}
          {job.scheduled_start_date && (
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: visualConfig.colors.surface }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icons.Calendar size={18} style={{ color: visualConfig.colors.primary }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Scheduled Start
                </span>
              </div>
              <p
                className="text-lg font-semibold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatDate(job.scheduled_start_date)}
              </p>
            </div>
          )}

          {/* Scheduled End */}
          {job.scheduled_end_date && (
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: visualConfig.colors.surface }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icons.CalendarCheck size={18} style={{ color: visualConfig.colors.primary }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Scheduled End
                </span>
              </div>
              <p
                className="text-lg font-semibold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatDate(job.scheduled_end_date)}
              </p>
            </div>
          )}

          {/* Actual Start */}
          {job.actual_start_date && (
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: visualConfig.colors.surface }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icons.Play size={18} style={{ color: '#10B981' }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Actual Start
                </span>
              </div>
              <p
                className="text-lg font-semibold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatDate(job.actual_start_date)}
              </p>
            </div>
          )}

          {/* Actual End */}
          {job.actual_end_date && (
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: visualConfig.colors.surface }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icons.Check size={18} style={{ color: '#10B981' }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Actual End
                </span>
              </div>
              <p
                className="text-lg font-semibold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatDate(job.actual_end_date)}
              </p>
            </div>
          )}
        </div>

        {/* Not Scheduled Message */}
        {!job.scheduled_start_date && !job.scheduled_end_date && (
          <div
            className="p-4 rounded-lg text-center"
            style={{ backgroundColor: visualConfig.colors.surface }}
          >
            <Icons.CalendarOff
              className="h-10 w-10 mx-auto mb-2"
              style={{ color: visualConfig.colors.text.secondary }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              This job has not been scheduled yet
            </p>
          </div>
        )}
      </div>

      {/* Crew Assignments */}
      <div>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Crew Assignments
        </h3>

        {/* Empty State */}
        {!hasAssignments && (
          <div
            className="p-8 rounded-lg text-center"
            style={{ backgroundColor: visualConfig.colors.surface }}
          >
            <Icons.Users
              className="h-12 w-12 mx-auto mb-4"
              style={{ color: visualConfig.colors.text.secondary }}
            />
            <p
              className="text-lg font-medium mb-2"
              style={{ color: visualConfig.colors.text.primary }}
            >
              No Crew Assigned
            </p>
            <p
              className="text-sm"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              This job doesn't have any crew assignments yet
            </p>
          </div>
        )}

        {/* Assignments List */}
        {hasAssignments && (
          <div className="space-y-4">
            {assignments.map((assignment, index) => (
              <div
                key={assignment.id || index}
                className="p-4 rounded-lg"
                style={{ backgroundColor: visualConfig.colors.surface }}
              >
                {/* Crew Name */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: assignment.crew?.color_code
                        ? assignment.crew.color_code + '20'
                        : visualConfig.colors.primary + '20'
                    }}
                  >
                    <Icons.Users
                      size={20}
                      style={{
                        color: assignment.crew?.color_code || visualConfig.colors.primary
                      }}
                    />
                  </div>
                  <div>
                    <h4
                      className="font-semibold"
                      style={{ color: visualConfig.colors.text.primary }}
                    >
                      {assignment.crew?.crew_name || 'Unknown Crew'}
                    </h4>
                    <p
                      className="text-sm"
                      style={{ color: visualConfig.colors.text.secondary }}
                    >
                      {assignment.status || 'scheduled'}
                    </p>
                  </div>
                </div>

                {/* Assignment Details */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {assignment.scheduled_start && (
                    <div>
                      <p
                        className="text-xs font-medium mb-1"
                        style={{ color: visualConfig.colors.text.secondary }}
                      >
                        Start Date
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: visualConfig.colors.text.primary }}
                      >
                        {formatDate(assignment.scheduled_start)}
                      </p>
                    </div>
                  )}

                  {assignment.scheduled_end && (
                    <div>
                      <p
                        className="text-xs font-medium mb-1"
                        style={{ color: visualConfig.colors.text.secondary }}
                      >
                        End Date
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: visualConfig.colors.text.primary }}
                      >
                        {formatDate(assignment.scheduled_end)}
                      </p>
                    </div>
                  )}

                  {assignment.estimated_hours && (
                    <div>
                      <p
                        className="text-xs font-medium mb-1"
                        style={{ color: visualConfig.colors.text.secondary }}
                      >
                        Estimated Hours
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: visualConfig.colors.text.primary }}
                      >
                        {assignment.estimated_hours} hours
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleTab;
