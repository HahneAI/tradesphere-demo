/**
 * Schedule Service - Business Logic Layer
 *
 * Handles job assignments, crew scheduling, conflict detection,
 * and calendar event formatting.
 *
 * @module ScheduleService
 */

import { getSupabase } from './supabase';
import {
  JobAssignment,
  JobAssignmentWithCrew,
  CreateJobAssignmentInput,
  UpdateJobAssignmentInput,
  ScheduleEvent,
  ScheduleConflict,
  ScheduleFilters,
  AssignmentStatus
} from '../types/crm';
import { ServiceResponse } from '../types/customer';

export class ScheduleService {
  private supabase = getSupabase();

  /**
   * Create a new job assignment
   * Validates crew availability before assignment
   */
  async createAssignment(
    input: CreateJobAssignmentInput
  ): Promise<ServiceResponse<JobAssignment>> {
    try {
      if (!input.job_id) {
        return this.error('Job ID is required');
      }

      if (!input.crew_id) {
        return this.error('Crew ID is required');
      }

      if (!input.scheduled_start) {
        return this.error('Scheduled start date is required');
      }

      if (!input.scheduled_end) {
        return this.error('Scheduled end date is required');
      }

      if (!input.assigned_by_user_id) {
        return this.error('Assigned by user ID is required');
      }

      // Validate dates
      if (new Date(input.scheduled_start) >= new Date(input.scheduled_end)) {
        return this.error('Scheduled start must be before scheduled end');
      }

      // Check for conflicts
      const conflicts = await this.checkScheduleConflicts(
        input.crew_id,
        input.scheduled_start,
        input.scheduled_end
      );

      if (!conflicts.success) {
        return this.error('Failed to check schedule conflicts');
      }

      if (conflicts.data && conflicts.data.length > 0) {
        return this.error('Crew has scheduling conflicts for this time period');
      }

      // Create assignment
      const { data, error } = await this.supabase
        .from('job_assignments')
        .insert({
          job_id: input.job_id,
          crew_id: input.crew_id,
          scheduled_start: input.scheduled_start,
          scheduled_end: input.scheduled_end,
          status: 'scheduled',
          assignment_notes: input.assignment_notes || null,
          work_description: input.work_description || null,
          estimated_hours: input.estimated_hours || null,
          completion_percentage: 0,
          metadata: input.metadata || {},
          assigned_by_user_id: input.assigned_by_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[ScheduleService] Error creating assignment:', error);
        return this.error('Failed to create assignment', error);
      }

      // Update job status if needed
      await this.updateJobStatusFromAssignment(input.job_id);

      console.log('[ScheduleService] Assignment created successfully:', data.id);
      return this.success(data);

    } catch (error: any) {
      console.error('[ScheduleService] Error creating assignment:', error);
      return this.error('Failed to create assignment', error);
    }
  }

  /**
   * Update an existing assignment
   */
  async updateAssignment(
    assignmentId: string,
    companyId: string,
    updates: UpdateJobAssignmentInput
  ): Promise<ServiceResponse<JobAssignment>> {
    try {
      // Verify assignment belongs to company
      const { data: assignment } = await this.supabase
        .from('job_assignments')
        .select(`
          id,
          job_id,
          crew_id,
          jobs!inner (company_id)
        `)
        .eq('id', assignmentId)
        .single();

      if (!assignment || assignment.jobs?.company_id !== companyId) {
        return this.error('Assignment not found');
      }

      // If rescheduling, check for conflicts
      if (updates.scheduled_start || updates.scheduled_end) {
        const { data: current } = await this.supabase
          .from('job_assignments')
          .select('scheduled_start, scheduled_end, crew_id')
          .eq('id', assignmentId)
          .single();

        if (current) {
          const newStart = updates.scheduled_start || current.scheduled_start;
          const newEnd = updates.scheduled_end || current.scheduled_end;

          // Check for conflicts excluding current assignment
          const { data: conflicts } = await this.supabase
            .from('job_assignments')
            .select('id')
            .eq('crew_id', current.crew_id)
            .neq('id', assignmentId)
            .in('status', ['scheduled', 'in_progress'])
            .or(
              `and(scheduled_start.lt.${newEnd},scheduled_end.gt.${newStart})`
            );

          if (conflicts && conflicts.length > 0) {
            return this.error('Rescheduling would create conflicts');
          }
        }
      }

      // Update assignment
      const { data, error } = await this.supabase
        .from('job_assignments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) {
        console.error('[ScheduleService] Error updating assignment:', error);
        return this.error('Failed to update assignment', error);
      }

      // Update job status if assignment status changed
      if (updates.status) {
        await this.updateJobStatusFromAssignment(assignment.job_id);
      }

      return this.success(data);

    } catch (error: any) {
      console.error('[ScheduleService] Error updating assignment:', error);
      return this.error('Failed to update assignment', error);
    }
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(
    assignmentId: string,
    companyId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Verify assignment belongs to company
      const { data: assignment } = await this.supabase
        .from('job_assignments')
        .select(`
          id,
          job_id,
          jobs!inner (company_id)
        `)
        .eq('id', assignmentId)
        .single();

      if (!assignment || assignment.jobs?.company_id !== companyId) {
        return this.error('Assignment not found');
      }

      const jobId = assignment.job_id;

      // Delete assignment
      const { error } = await this.supabase
        .from('job_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('[ScheduleService] Error deleting assignment:', error);
        return this.error('Failed to delete assignment', error);
      }

      // Update job status
      await this.updateJobStatusFromAssignment(jobId);

      return this.success(undefined);

    } catch (error: any) {
      console.error('[ScheduleService] Error deleting assignment:', error);
      return this.error('Failed to delete assignment', error);
    }
  }

  /**
   * Get schedule events for calendar display
   */
  async getSchedule(
    companyId: string,
    filters: ScheduleFilters
  ): Promise<ServiceResponse<ScheduleEvent[]>> {
    try {
      if (!filters.date_range) {
        return this.error('Date range is required');
      }

      let query = this.supabase
        .from('job_assignments')
        .select(`
          *,
          crew:crews!inner (
            id,
            crew_name,
            crew_code,
            color_code,
            company_id
          ),
          job:jobs!inner (
            id,
            job_number,
            title,
            service_address,
            customer_id,
            customers (customer_name)
          )
        `)
        .eq('crew.company_id', companyId)
        .gte('scheduled_end', filters.date_range.start)
        .lte('scheduled_start', filters.date_range.end);

      // Apply filters
      if (filters.crew_id) {
        query = query.eq('crew_id', filters.crew_id);
      }

      if (filters.crew_ids?.length) {
        query = query.in('crew_id', filters.crew_ids);
      }

      if (filters.job_id) {
        query = query.eq('job_id', filters.job_id);
      }

      if (filters.status?.length) {
        query = query.in('status', filters.status);
      } else if (!filters.include_completed) {
        query = query.neq('status', 'completed');
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ScheduleService] Error fetching schedule:', error);
        return this.error('Failed to fetch schedule', error);
      }

      // Map to calendar events
      const events: ScheduleEvent[] = (data || []).map(assignment => ({
        id: assignment.id,
        job_id: assignment.job_id,
        crew_id: assignment.crew_id,
        title: assignment.job?.title || 'Untitled Job',
        start: new Date(assignment.scheduled_start),
        end: new Date(assignment.scheduled_end),
        status: assignment.status,
        color: assignment.crew?.color_code || undefined,
        customer_name: assignment.job?.customers?.customer_name || 'Unknown',
        service_address: assignment.job?.service_address || undefined,
        completion_percentage: assignment.completion_percentage || 0
      }));

      return this.success(events);

    } catch (error: any) {
      console.error('[ScheduleService] Error fetching schedule:', error);
      return this.error('Failed to fetch schedule', error);
    }
  }

  /**
   * Get assignments for a specific crew
   */
  async getCrewSchedule(
    crewId: string,
    companyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ServiceResponse<JobAssignmentWithCrew[]>> {
    try {
      let query = this.supabase
        .from('job_assignments')
        .select(`
          *,
          crew:crews!inner (
            id,
            crew_name,
            crew_code,
            color_code,
            company_id
          ),
          job:jobs!inner (
            id,
            job_number,
            title,
            service_address,
            customers (customer_name)
          )
        `)
        .eq('crew_id', crewId)
        .eq('crew.company_id', companyId);

      if (startDate) {
        query = query.gte('scheduled_start', startDate);
      }
      if (endDate) {
        query = query.lte('scheduled_end', endDate);
      }

      query = query.order('scheduled_start', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('[ScheduleService] Error fetching crew schedule:', error);
        return this.error('Failed to fetch crew schedule', error);
      }

      return this.success(data || []);

    } catch (error: any) {
      console.error('[ScheduleService] Error fetching crew schedule:', error);
      return this.error('Failed to fetch crew schedule', error);
    }
  }

  /**
   * Check for scheduling conflicts
   */
  async checkScheduleConflicts(
    crewId: string,
    startDate: string,
    endDate: string,
    excludeAssignmentId?: string
  ): Promise<ServiceResponse<ScheduleConflict[]>> {
    try {
      // Get crew info
      const { data: crew } = await this.supabase
        .from('crews')
        .select('id, crew_name')
        .eq('id', crewId)
        .single();

      if (!crew) {
        return this.error('Crew not found');
      }

      // Find overlapping assignments
      let query = this.supabase
        .from('job_assignments')
        .select(`
          id,
          job_id,
          scheduled_start,
          scheduled_end,
          jobs (job_number, title)
        `)
        .eq('crew_id', crewId)
        .in('status', ['scheduled', 'in_progress'])
        .or(
          `and(scheduled_start.lt.${endDate},scheduled_end.gt.${startDate})`
        );

      if (excludeAssignmentId) {
        query = query.neq('id', excludeAssignmentId);
      }

      const { data: conflicts } = await query;

      if (!conflicts || conflicts.length === 0) {
        return this.success([]);
      }

      const conflict: ScheduleConflict = {
        crew_id: crewId,
        crew_name: crew.crew_name,
        requested_start: startDate,
        requested_end: endDate,
        conflicting_assignments: conflicts.map(c => ({
          assignment_id: c.id,
          job_id: c.job_id,
          job_number: c.jobs?.job_number || '',
          job_title: c.jobs?.title || '',
          scheduled_start: c.scheduled_start,
          scheduled_end: c.scheduled_end
        }))
      };

      return this.success([conflict]);

    } catch (error: any) {
      console.error('[ScheduleService] Error checking conflicts:', error);
      return this.error('Failed to check conflicts', error);
    }
  }

  /**
   * Reschedule an assignment
   */
  async rescheduleAssignment(
    assignmentId: string,
    companyId: string,
    newStart: string,
    newEnd: string
  ): Promise<ServiceResponse<JobAssignment>> {
    try {
      // Validate dates
      if (new Date(newStart) >= new Date(newEnd)) {
        return this.error('Start date must be before end date');
      }

      // Get assignment details
      const { data: assignment } = await this.supabase
        .from('job_assignments')
        .select(`
          id,
          crew_id,
          job_id,
          jobs!inner (company_id)
        `)
        .eq('id', assignmentId)
        .single();

      if (!assignment || assignment.jobs?.company_id !== companyId) {
        return this.error('Assignment not found');
      }

      // Check for conflicts (excluding current assignment)
      const conflicts = await this.checkScheduleConflicts(
        assignment.crew_id,
        newStart,
        newEnd,
        assignmentId
      );

      if (!conflicts.success) {
        return this.error('Failed to check conflicts');
      }

      if (conflicts.data && conflicts.data.length > 0) {
        return this.error('Rescheduling would create conflicts');
      }

      // Update assignment
      return this.updateAssignment(assignmentId, companyId, {
        scheduled_start: newStart,
        scheduled_end: newEnd
      });

    } catch (error: any) {
      console.error('[ScheduleService] Error rescheduling assignment:', error);
      return this.error('Failed to reschedule assignment', error);
    }
  }

  /**
   * AI ENGINE PLACEHOLDER
   * Get optimal schedule recommendations
   */
  async getOptimalSchedule(
    companyId: string,
    jobs: Array<{ id: string; estimated_hours: number; priority: number }>,
    crews: Array<{ id: string; specializations: string[]; capacity: number }>,
    startDate: string,
    endDate: string
  ): Promise<ServiceResponse<{
    recommendations: Array<{
      job_id: string;
      crew_id: string;
      scheduled_start: string;
      scheduled_end: string;
      confidence: number;
      reasoning: string;
    }>;
  }>> {
    try {
      // TODO: Integrate with AI scheduling engine
      // This is a placeholder implementation
      //
      // INTEGRATION STEPS:
      // 1. Call AI engine with job requirements, crew capabilities, and constraints
      // 2. AI analyzes:
      //    - Job priority and estimated hours
      //    - Crew specializations and availability
      //    - Travel time optimization
      //    - Workload balancing
      // 3. Returns optimized schedule with confidence scores
      //
      // Example AI engine call:
      // const aiResult = await aiSchedulingEngine.optimizeSchedule({
      //   jobs,
      //   crews,
      //   dateRange: { start: startDate, end: endDate },
      //   constraints: {
      //     workingHours: { start: '08:00', end: '17:00' },
      //     maxDailyHours: 8,
      //     minimizeTravelTime: true,
      //     balanceCrewLoad: true
      //   }
      // });

      // PLACEHOLDER: Simple round-robin assignment
      const recommendations = jobs.map((job, index) => {
        const crew = crews[index % crews.length];
        const estimatedDays = Math.ceil(job.estimated_hours / 8);
        const start = new Date(startDate);
        start.setDate(start.getDate() + index * estimatedDays);
        const end = new Date(start);
        end.setDate(end.getDate() + estimatedDays);

        return {
          job_id: job.id,
          crew_id: crew?.id || '',
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          confidence: 0.75,
          reasoning: 'Placeholder: Based on crew availability and job priority'
        };
      });

      return this.success({ recommendations });

    } catch (error: any) {
      console.error('[ScheduleService] Error generating optimal schedule:', error);
      return this.error('Failed to generate optimal schedule', error);
    }
  }

  // HELPER METHODS

  /**
   * Update job status based on assignments
   */
  private async updateJobStatusFromAssignment(jobId: string): Promise<void> {
    try {
      // Get all assignments for this job
      const { data: assignments } = await this.supabase
        .from('job_assignments')
        .select('status')
        .eq('job_id', jobId);

      if (!assignments || assignments.length === 0) {
        return;
      }

      // Determine job status from assignments
      let newStatus: string | null = null;

      if (assignments.some(a => a.status === 'in_progress')) {
        newStatus = 'in_progress';
      } else if (assignments.every(a => a.status === 'completed')) {
        newStatus = 'completed';
      } else if (assignments.some(a => a.status === 'scheduled')) {
        newStatus = 'scheduled';
      }

      // Update job if status should change
      if (newStatus) {
        await this.supabase
          .from('jobs')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }

    } catch (error) {
      console.error('[ScheduleService] Error updating job status:', error);
    }
  }

  /**
   * Success response helper
   */
  private success<T>(data: T): ServiceResponse<T> {
    return { success: true, data };
  }

  /**
   * Error response helper
   */
  private error(message: string, error?: any): ServiceResponse<never> {
    console.error(`[ScheduleService] ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const scheduleService = new ScheduleService();
