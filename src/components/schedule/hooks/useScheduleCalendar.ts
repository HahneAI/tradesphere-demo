/**
 * useScheduleCalendar Hook
 *
 * Main data management hook for scheduling calendar
 * Handles fetching jobs, crews, assignments and transforming to calendar format
 *
 * Based on documented patterns from:
 * - docs/CALENDAR-QUERY-IMPLEMENTATIONS.md (Part 2: React Query Hooks)
 * - docs/DATABASE-OPTIMIZATION-SCHEDULE-CALENDAR.md
 *
 * @module useScheduleCalendar
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSupabase } from '../../../services/supabase';
import { CalendarJobBlock } from '../../../types/jobs-views';
import { Crew, Job, JobAssignment, JobService } from '../../../types/crm';
import { getMockCrews, DEFAULT_CREW_COLOR } from '../data/mockCrews';
import { toISODate } from '../../../utils/date-helpers';

export interface UseScheduleCalendarReturn {
  // Data
  crews: Crew[];
  calendarJobs: CalendarJobBlock[];
  unassignedJobs: CalendarJobBlock[];
  assignedJobs: CalendarJobBlock[];

  // Loading states
  isLoading: boolean;
  isLoadingJobs: boolean;
  isLoadingCrews: boolean;
  error: string | null;

  // Operations
  refreshCalendar: () => Promise<void>;
  assignJob: (jobId: string, crewId: string, dropDate: Date) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Extract estimated hours from job services calculation_data
 * Based on Profit Pipeline: calculation_data.tier1Results.totalManHours
 */
function extractEstimatedHours(services: JobService[]): number {
  if (!services || services.length === 0) return 8; // Default fallback

  return services.reduce((sum, service) => {
    const calcData = service.calculation_data as any;
    const manHours = calcData?.tier1Results?.totalManHours || 0;
    return sum + manHours;
  }, 0);
}

/**
 * Extract estimated days from job services calculation_data
 * Based on Profit Pipeline: calculation_data.tier1Results.totalDays
 */
function extractEstimatedDays(services: JobService[]): number {
  if (!services || services.length === 0) return 1; // Default fallback

  // Use the maximum days from all services (longest service determines duration)
  const days = services.map(service => {
    const calcData = service.calculation_data as any;
    return calcData?.tier1Results?.totalDays || 1;
  });

  return Math.max(...days, 1);
}

/**
 * Main scheduling calendar data management hook
 *
 * @param companyId - Company ID for multi-tenant isolation
 * @param weekStart - Start of current week for date range filtering
 * @param weekEnd - End of current week for date range filtering
 *
 * @example
 * ```tsx
 * function ScheduleTab() {
 *   const { weekDates } = useWeekNavigation();
 *   const {
 *     crews,
 *     calendarJobs,
 *     unassignedJobs,
 *     isLoading,
 *     refreshCalendar
 *   } = useScheduleCalendar(companyId, weekDates[0], weekDates[6]);
 *
 *   if (isLoading) return <Loading />;
 *
 *   return <CalendarGrid crews={crews} jobs={calendarJobs} />;
 * }
 * ```
 */
export function useScheduleCalendar(
  companyId: string,
  weekStart: Date,
  weekEnd: Date
): UseScheduleCalendarReturn {
  // State
  const [crews, setCrews] = useState<Crew[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [services, setServices] = useState<JobService[]>([]);

  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingCrews, setIsLoadingCrews] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch crews (mock data for now, will query database when crews exist)
   */
  const fetchCrews = useCallback(async () => {
    setIsLoadingCrews(true);
    setError(null);

    try {
      const supabase = getSupabase();

      // Try to fetch real crews first
      const { data: realCrews, error: crewsError } = await supabase
        .from('ops_crews')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('crew_name');

      if (crewsError) {
        console.warn('[useScheduleCalendar] Crews query error:', crewsError);
      }

      // If no real crews, use mock data
      if (!realCrews || realCrews.length === 0) {
        console.log('[useScheduleCalendar] No crews in database, using mock data');
        setCrews(getMockCrews(companyId));
      } else {
        console.log('[useScheduleCalendar] Loaded real crews:', realCrews.length);
        setCrews(realCrews);
      }
    } catch (err: any) {
      console.error('[useScheduleCalendar] Error fetching crews:', err);
      // Fallback to mock crews on error
      setCrews(getMockCrews(companyId));
    } finally {
      setIsLoadingCrews(false);
    }
  }, [companyId]);

  /**
   * Fetch jobs with assignments and services
   * Based on documented query pattern from CALENDAR-QUERY-IMPLEMENTATIONS.md
   */
  const fetchJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setError(null);

    try {
      const supabase = getSupabase();

      // Fetch jobs with customer relationship
      const { data: jobsData, error: jobsError } = await supabase
        .from('ops_jobs')
        .select(`
          *,
          customer:crm_customers!inner(
            id,
            customer_name
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['quote', 'approved', 'scheduled', 'in_progress'])
        .order('priority', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch job services (for calculation_data)
      const jobIds = (jobsData || []).map(j => j.id);
      const { data: servicesData, error: servicesError } = await supabase
        .from('ops_job_services')
        .select('*')
        .in('job_id', jobIds);

      if (servicesError) throw servicesError;

      // Fetch assignments in current week range
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('ops_job_assignments')
        .select('*')
        .in('job_id', jobIds)
        .in('status', ['scheduled', 'in_progress', 'completed'])
        .gte('scheduled_end', toISODate(weekStart))
        .lte('scheduled_start', toISODate(weekEnd));

      if (assignmentsError) throw assignmentsError;

      setJobs(jobsData || []);
      setServices(servicesData || []);
      setAssignments(assignmentsData || []);

      console.log('[useScheduleCalendar] Loaded data:', {
        jobs: jobsData?.length || 0,
        services: servicesData?.length || 0,
        assignments: assignmentsData?.length || 0
      });
    } catch (err: any) {
      console.error('[useScheduleCalendar] Error fetching jobs:', err);
      setError('Failed to load calendar data');
    } finally {
      setIsLoadingJobs(false);
    }
  }, [companyId, weekStart, weekEnd]);

  /**
   * Transform jobs + assignments + services into CalendarJobBlock format
   */
  const calendarJobs = useMemo((): CalendarJobBlock[] => {
    return jobs.map(job => {
      // Find assignment for this job
      const assignment = assignments.find(a => a.job_id === job.id);

      // Find services for this job
      const jobServices = services.filter(s => s.job_id === job.id);

      // Extract pricing calculation data
      const estimated_hours = extractEstimatedHours(jobServices);
      const estimated_days = extractEstimatedDays(jobServices);

      // Find crew for color coding
      const crew = assignment ? crews.find(c => c.id === assignment.crew_id) : null;

      return {
        // Assignment info
        assignment_id: assignment?.id || null,
        crew_id: assignment?.crew_id || null,

        // Job info
        job_id: job.id,
        job_number: job.job_number,
        job_title: job.title,
        customer_id: job.customer_id,
        customer_name: (job as any).customer?.customer_name || 'Unknown',

        // Scheduling
        start: assignment?.scheduled_start ? new Date(assignment.scheduled_start) : null,
        end: assignment?.scheduled_end ? new Date(assignment.scheduled_end) : null,

        // From calculation_data
        estimated_hours,
        estimated_days,

        // Display properties
        color: crew?.color_code || DEFAULT_CREW_COLOR,
        status: job.status,
        priority: job.priority,
        estimated_total: job.estimated_total,

        // Progress
        completion_percentage: assignment?.completion_percentage || 0,
        actual_hours: assignment?.actual_hours || null
      };
    });
  }, [jobs, assignments, services, crews]);

  /**
   * Split jobs into assigned vs unassigned
   */
  const unassignedJobs = useMemo(() => {
    return calendarJobs.filter(job => !job.assignment_id);
  }, [calendarJobs]);

  const assignedJobs = useMemo(() => {
    return calendarJobs.filter(job => job.assignment_id !== null);
  }, [calendarJobs]);

  /**
   * Refresh all calendar data
   */
  const refreshCalendar = useCallback(async () => {
    await Promise.all([fetchCrews(), fetchJobs()]);
  }, [fetchCrews, fetchJobs]);

  /**
   * Assign a job to a crew (placeholder - will be implemented in Phase 4)
   */
  const assignJob = useCallback(async (
    jobId: string,
    crewId: string,
    dropDate: Date
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('[useScheduleCalendar] assignJob called:', { jobId, crewId, dropDate });
    // TODO: Implement in Phase 4 with drag-drop
    return { success: false, error: 'Not implemented yet' };
  }, []);

  // Initial load
  useEffect(() => {
    if (companyId) {
      refreshCalendar();
    }
  }, [companyId, refreshCalendar]);

  // Reload when week changes
  useEffect(() => {
    if (companyId) {
      fetchJobs();
    }
  }, [weekStart, weekEnd, fetchJobs]);

  return {
    crews,
    calendarJobs,
    unassignedJobs,
    assignedJobs,
    isLoading: isLoadingJobs || isLoadingCrews,
    isLoadingJobs,
    isLoadingCrews,
    error,
    refreshCalendar,
    assignJob
  };
}

export default useScheduleCalendar;
