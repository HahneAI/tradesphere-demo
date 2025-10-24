/**
 * Jobs Calendar View
 *
 * Timeline-based schedule view with crew assignments
 * - Week view with date headers
 * - Crew rows showing assignments
 * - Job blocks with duration
 * - Conflict detection (visual indicators)
 *
 * NOTE: This is a read-only preview implementation.
 * Full drag-to-reschedule functionality will be added in future sprint.
 *
 * @module JobsCalendarView
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { getSupabase } from '../../../services/supabase';
import { Crew } from '../../../types/crm';
import { CalendarJobBlock, detectScheduleConflicts, formatShortDate } from '../../../types/jobs-views';
import { StatusBadge } from '../shared/StatusBadge';
import { EmptyState } from '../shared/EmptyState';

interface JobsCalendarViewProps {
  companyId: string;
  onRefresh: () => void;
  visualConfig: any;
  theme: 'light' | 'dark';
}

/**
 * Calendar View Component
 * Shows job assignments in timeline format
 */
export const JobsCalendarView: React.FC<JobsCalendarViewProps> = ({
  companyId,
  onRefresh,
  visualConfig,
  theme
}) => {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [assignments, setAssignments] = useState<CalendarJobBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Week view state
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });

  /**
   * Generate week dates
   */
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  /**
   * Fetch crews and assignments
   */
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabase();

        // Fetch crews
        const { data: crewsData, error: crewsError } = await supabase
          .from('crews')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('crew_name');

        if (crewsError) throw crewsError;

        // Fetch job assignments for this week
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('job_assignments')
          .select(`
            id,
            job_id,
            crew_id,
            scheduled_start,
            scheduled_end,
            status,
            completion_percentage,
            job:jobs!inner (
              id,
              job_number,
              title,
              status,
              priority,
              estimated_total,
              customer:crm_customers!inner (
                customer_name
              )
            )
          `)
          .eq('job.company_id', companyId)
          .gte('scheduled_start', currentWeekStart.toISOString())
          .lte('scheduled_end', weekEnd.toISOString())
          .in('status', ['scheduled', 'in_progress']);

        if (assignmentsError) throw assignmentsError;

        // Transform assignments to calendar blocks
        const blocks: CalendarJobBlock[] = (assignmentsData || []).map((a: any) => {
          const crew = crewsData?.find(c => c.id === a.crew_id);
          return {
            assignment_id: a.id,
            job_id: a.job_id,
            job_number: a.job.job_number,
            job_title: a.job.title,
            customer_name: a.job.customer?.customer_name || 'Unknown',
            start: new Date(a.scheduled_start),
            end: new Date(a.scheduled_end),
            color: crew?.color_code || '#3B82F6',
            status: a.job.status,
            priority: a.job.priority,
            estimated_total: a.job.estimated_total,
            completion_percentage: a.completion_percentage || 0
          };
        });

        setCrews(crewsData || []);
        setAssignments(blocks);

        console.log('[Calendar] Loaded:', {
          crews: crewsData?.length || 0,
          assignments: blocks.length
        });

      } catch (err: any) {
        console.error('[Calendar] Error fetching data:', err);
        setError('Failed to load schedule data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [companyId, currentWeekStart]);

  /**
   * Get assignments for a specific crew
   */
  const getCrewAssignments = (crewId: string): CalendarJobBlock[] => {
    return assignments.filter(a => {
      // Match by crew ID from database
      // NOTE: We need to add crew_id to the query above
      // For now, showing all assignments
      return true; // TODO: Filter by crew_id once query is updated
    });
  };

  /**
   * Navigate weeks
   */
  const handlePreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const handleToday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    setCurrentWeekStart(weekStart);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: visualConfig.colors.primary }}
          />
          <p style={{ color: visualConfig.colors.text.secondary }}>
            Loading schedule...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center max-w-md">
          <Icons.AlertCircle
            className="h-16 w-16 mx-auto mb-4"
            style={{ color: visualConfig.colors.error || '#EF4444' }}
          />
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: visualConfig.colors.text.primary }}
          >
            Failed to Load Schedule
          </h2>
          <p
            className="mb-6"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg font-medium"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: visualConfig.colors.text.onPrimary
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No crews state
  if (crews.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <EmptyState
          variant="no_crews"
          onAction={() => console.log('[Calendar] Navigate to crews page')}
          visualConfig={visualConfig}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Week navigation header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            <Icons.ChevronLeft size={20} />
          </button>

          <h3
            className="font-bold text-lg"
            style={{ color: visualConfig.colors.text.primary }}
          >
            {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>

          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            <Icons.ChevronRight size={20} />
          </button>
        </div>

        <button
          onClick={handleToday}
          className="px-4 py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: visualConfig.colors.primary + '10',
            color: visualConfig.colors.primary
          }}
        >
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {/* TODO: Implement full calendar with crew rows */}
        <div className="p-8 text-center">
          <Icons.Calendar
            size={64}
            className="mx-auto mb-4 opacity-30"
            style={{ color: visualConfig.colors.text.secondary }}
          />
          <h3
            className="text-xl font-bold mb-2"
            style={{ color: visualConfig.colors.text.primary }}
          >
            Calendar View Coming Soon
          </h3>
          <p
            className="text-sm mb-6"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            Full crew scheduling timeline with drag-to-reschedule functionality will be available in the next update.
          </p>

          {/* Show summary */}
          <div
            className="max-w-md mx-auto p-4 rounded-lg border"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: visualConfig.colors.text.secondary + '20'
            }}
          >
            <p
              className="text-sm mb-2"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Current week schedule:
            </p>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p
                  className="text-2xl font-bold"
                  style={{ color: visualConfig.colors.primary }}
                >
                  {crews.length}
                </p>
                <p
                  className="text-xs"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Active Crews
                </p>
              </div>
              <div>
                <p
                  className="text-2xl font-bold"
                  style={{ color: visualConfig.colors.primary }}
                >
                  {assignments.length}
                </p>
                <p
                  className="text-xs"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Scheduled Jobs
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Planned Features
            </p>
            <ul
              className="text-sm space-y-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              <li>• Crew rows with color coding</li>
              <li>• Draggable job blocks with duration</li>
              <li>• Conflict detection and warnings</li>
              <li>• Crew utilization percentage</li>
              <li>• Quick job detail preview</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobsCalendarView;
