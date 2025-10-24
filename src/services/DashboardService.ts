/**
 * Dashboard Service - Business Logic Layer
 *
 * Aggregates metrics from job_metrics materialized view,
 * provides real-time calculations, and manages dashboard KPIs.
 *
 * @module DashboardService
 */

import { getSupabase } from './supabase';
import {
  DashboardMetrics,
  JobMetricsByStatus,
  RevenueMetrics,
  CrewUtilization,
  JobStatus
} from '../types/crm';
import { ServiceResponse } from '../types/customer';

export class DashboardService {
  private supabase = getSupabase();

  /**
   * Get comprehensive dashboard metrics
   * Aggregates data from job_metrics materialized view
   */
  async getDashboardMetrics(
    companyId: string,
    dateRange?: { start: string; end: string }
  ): Promise<ServiceResponse<DashboardMetrics>> {
    try {
      if (!companyId) {
        return this.error('Company ID is required');
      }

      // Get job metrics by status
      const jobMetrics = await this.getJobsByStatus(companyId);

      if (!jobMetrics.success) {
        return this.error('Failed to fetch job metrics');
      }

      // Get revenue metrics
      const revenue = await this.getRevenueMetrics(companyId, dateRange);

      if (!revenue.success) {
        return this.error('Failed to fetch revenue metrics');
      }

      // Get crew utilization
      const utilization = await this.getCrewUtilization(companyId);

      if (!utilization.success) {
        return this.error('Failed to fetch crew utilization');
      }

      // Try to get last refresh time from materialized view
      let lastRefreshed = new Date().toISOString();
      try {
        const { data: refreshData } = await this.supabase
          .from('job_metrics')
          .select('last_refreshed')
          .eq('company_id', companyId)
          .limit(1)
          .maybeSingle();

        if (refreshData?.last_refreshed) {
          lastRefreshed = refreshData.last_refreshed;
        }
      } catch (error) {
        console.warn('[DashboardService] Could not get last refresh time:', error);
      }

      const metrics: DashboardMetrics = {
        company_id: companyId,
        job_metrics_by_status: jobMetrics.data || [],
        revenue: revenue.data!,
        crew_utilization: utilization.data!,
        last_refreshed: lastRefreshed
      };

      return this.success(metrics);

    } catch (error: any) {
      console.error('[DashboardService] Error fetching dashboard metrics:', error);
      return this.error('Failed to fetch dashboard metrics', error);
    }
  }

  /**
   * Get job counts and values by status
   */
  async getJobsByStatus(
    companyId: string
  ): Promise<ServiceResponse<JobMetricsByStatus[]>> {
    try {
      // Query jobs directly for real-time data
      // Materialized view may be stale
      const { data: jobs, error } = await this.supabase
        .from('jobs')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        // Handle missing table gracefully (code 42P01 = undefined_table)
        if (error.code === '42P01') {
          console.warn('[DashboardService] Jobs table does not exist yet - returning empty data');
          return this.getEmptyJobMetrics();
        }
        console.error('[DashboardService] Error fetching jobs:', error);
        throw error;
      }

      // Group by status
      const statusGroups = new Map<JobStatus, JobMetricsByStatus>();
      const allStatuses: JobStatus[] = [
        'quote', 'approved', 'scheduled', 'in_progress',
        'completed', 'invoiced', 'cancelled'
      ];

      // Initialize all statuses
      allStatuses.forEach(status => {
        statusGroups.set(status, {
          status,
          job_count: 0,
          total_estimated: 0,
          total_actual: 0,
          avg_estimated: 0,
          avg_actual: 0,
          unique_customers: 0,
          high_priority_count: 0,
          overdue_count: 0
        });
      });

      // Track unique customers per status
      const customersByStatus = new Map<JobStatus, Set<string>>();
      allStatuses.forEach(status => {
        customersByStatus.set(status, new Set());
      });

      // Aggregate metrics
      (jobs || []).forEach(job => {
        const metrics = statusGroups.get(job.status)!;
        metrics.job_count++;
        metrics.total_estimated += job.estimated_total || 0;
        metrics.total_actual += job.actual_total || 0;

        if (job.priority >= 7) {
          metrics.high_priority_count++;
        }

        if (this.isJobOverdue(job)) {
          metrics.overdue_count++;
        }

        // Track unique customers
        if (job.customer_id) {
          customersByStatus.get(job.status)!.add(job.customer_id);
        }
      });

      // Calculate averages and unique customers
      statusGroups.forEach((metrics, status) => {
        if (metrics.job_count > 0) {
          metrics.avg_estimated = metrics.total_estimated / metrics.job_count;
          metrics.avg_actual = metrics.total_actual / metrics.job_count;
        }
        metrics.unique_customers = customersByStatus.get(status)!.size;
      });

      return this.success(Array.from(statusGroups.values()));

    } catch (error: any) {
      console.error('[DashboardService] Error fetching job metrics:', error);
      return this.error('Failed to fetch job metrics', error);
    }
  }

  /**
   * Get revenue metrics and trends
   */
  async getRevenueMetrics(
    companyId: string,
    dateRange?: { start: string; end: string }
  ): Promise<ServiceResponse<RevenueMetrics>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Current period (last 30 days or custom range)
      const currentStart = dateRange?.start || thirtyDaysAgo.toISOString();
      const currentEnd = dateRange?.end || now.toISOString();

      const { data: current, error: currentError } = await this.supabase
        .from('jobs')
        .select('estimated_total, actual_total, status')
        .eq('company_id', companyId)
        .gte('created_at', currentStart)
        .lte('created_at', currentEnd)
        .in('status', ['completed', 'invoiced']);

      // Handle missing table gracefully
      if (currentError?.code === '42P01') {
        console.warn('[DashboardService] Jobs table does not exist yet - returning empty revenue metrics');
        return this.success(this.getEmptyRevenueMetrics());
      }

      // Previous period (for comparison)
      const { data: previous } = await this.supabase
        .from('jobs')
        .select('estimated_total, actual_total')
        .eq('company_id', companyId)
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString())
        .in('status', ['completed', 'invoiced']);

      // Pipeline values
      const { data: pipeline } = await this.supabase
        .from('jobs')
        .select('status, estimated_total')
        .eq('company_id', companyId)
        .in('status', ['quote', 'approved', 'invoiced']);

      // Calculate metrics
      const currentRevenue = current?.reduce(
        (sum, job) => sum + (job.actual_total || job.estimated_total || 0),
        0
      ) || 0;

      const previousRevenue = previous?.reduce(
        (sum, job) => sum + (job.actual_total || job.estimated_total || 0),
        0
      ) || 0;

      const quotedValue = pipeline?.filter(j => j.status === 'quote')
        .reduce((sum, j) => sum + (j.estimated_total || 0), 0) || 0;

      const approvedValue = pipeline?.filter(j => j.status === 'approved')
        .reduce((sum, j) => sum + (j.estimated_total || 0), 0) || 0;

      const outstandingInvoices = pipeline?.filter(j => j.status === 'invoiced')
        .reduce((sum, j) => sum + (j.estimated_total || 0), 0) || 0;

      const metrics: RevenueMetrics = {
        current_period_revenue: currentRevenue,
        current_period_jobs: current?.length || 0,
        previous_period_revenue: previousRevenue,
        previous_period_jobs: previous?.length || 0,
        revenue_growth_percentage: previousRevenue > 0
          ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
          : 0,
        quoted_value: quotedValue,
        approved_value: approvedValue,
        outstanding_invoices: outstandingInvoices,
        average_job_value: current?.length
          ? currentRevenue / current.length
          : 0,
        average_days_to_close: 7 // TODO: Calculate actual cycle time from job dates
      };

      return this.success(metrics);

    } catch (error: any) {
      console.error('[DashboardService] Error fetching revenue metrics:', error);
      return this.error('Failed to fetch revenue metrics', error);
    }
  }

  /**
   * Get crew utilization metrics
   */
  async getCrewUtilization(
    companyId: string
  ): Promise<ServiceResponse<CrewUtilization>> {
    try {
      // Get all crews
      const { data: crews, count: totalCrews, error: crewsError } = await this.supabase
        .from('crews')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Handle missing table gracefully
      if (crewsError?.code === '42P01') {
        console.warn('[DashboardService] Crews table does not exist yet - returning empty utilization metrics');
        return this.success(this.getEmptyCrewUtilization());
      }

      const activeCrews = crews?.filter(c => c.is_active).length || 0;

      // Get assignments in progress or scheduled
      const { data: assignments } = await this.supabase
        .from('job_assignments')
        .select(`
          id,
          status,
          completion_percentage,
          actual_hours,
          crew_id,
          crews!inner (company_id)
        `)
        .eq('crews.company_id', companyId)
        .in('status', ['in_progress', 'scheduled']);

      const assignmentsInProgress = assignments?.filter(
        a => a.status === 'in_progress'
      ).length || 0;

      const avgCompletion = assignments?.length
        ? assignments.reduce((sum, a) => sum + (a.completion_percentage || 0), 0) / assignments.length
        : 0;

      const totalHours = assignments?.reduce(
        (sum, a) => sum + (a.actual_hours || 0),
        0
      ) || 0;

      // Calculate capacity
      const crewsWithAssignments = new Set(
        assignments?.filter(a => a.status === 'in_progress').map(a => a.crew_id) || []
      );

      const utilization: CrewUtilization = {
        total_crews: totalCrews || 0,
        active_crews: activeCrews,
        avg_completion_percentage: Math.round(avgCompletion),
        total_hours_worked: totalHours,
        assignments_in_progress: assignmentsInProgress,
        crews_at_capacity: crewsWithAssignments.size,
        crews_available: Math.max(0, activeCrews - crewsWithAssignments.size)
      };

      return this.success(utilization);

    } catch (error: any) {
      console.error('[DashboardService] Error fetching crew utilization:', error);
      return this.error('Failed to fetch crew utilization', error);
    }
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(
    companyId: string,
    limit: number = 20
  ): Promise<ServiceResponse<Array<{
    id: string;
    type: 'job_created' | 'status_change' | 'assignment_created' | 'note_added';
    title: string;
    description: string;
    timestamp: string;
    metadata: any;
  }>>> {
    try {
      // Combine multiple activity sources
      const activities: Array<{
        id: string;
        type: 'job_created' | 'status_change' | 'assignment_created' | 'note_added';
        title: string;
        description: string;
        timestamp: string;
        metadata: any;
      }> = [];

      // Get recent jobs
      const { data: recentJobs } = await this.supabase
        .from('jobs')
        .select('id, job_number, title, created_at, status')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (recentJobs) {
        recentJobs.forEach(job => {
          activities.push({
            id: job.id,
            type: 'job_created',
            title: `New Job: ${job.job_number}`,
            description: job.title,
            timestamp: job.created_at,
            metadata: { job_id: job.id, status: job.status }
          });
        });
      }

      // Sort by timestamp
      activities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return this.success(activities.slice(0, limit));

    } catch (error: any) {
      console.error('[DashboardService] Error fetching recent activity:', error);
      return this.error('Failed to fetch recent activity', error);
    }
  }

  /**
   * Get upcoming jobs (scheduled in next 7 days)
   */
  async getUpcomingJobs(
    companyId: string,
    days: number = 7
  ): Promise<ServiceResponse<Array<{
    id: string;
    job_number: string;
    title: string;
    customer_name: string;
    scheduled_start_date: string;
    scheduled_end_date: string;
    status: JobStatus;
    assigned_crews_count: number;
  }>>> {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const { data: jobs } = await this.supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          title,
          status,
          scheduled_start_date,
          scheduled_end_date,
          customers!inner (customer_name)
        `)
        .eq('company_id', companyId)
        .in('status', ['scheduled', 'approved'])
        .gte('scheduled_start_date', now.toISOString().split('T')[0])
        .lte('scheduled_start_date', futureDate.toISOString().split('T')[0])
        .order('scheduled_start_date', { ascending: true });

      const upcomingJobs = (jobs || []).map(job => ({
        id: job.id,
        job_number: job.job_number,
        title: job.title,
        customer_name: job.customers?.customer_name || 'Unknown',
        scheduled_start_date: job.scheduled_start_date || '',
        scheduled_end_date: job.scheduled_end_date || '',
        status: job.status,
        assigned_crews_count: 0 // TODO: Add crew count subquery
      }));

      return this.success(upcomingJobs);

    } catch (error: any) {
      console.error('[DashboardService] Error fetching upcoming jobs:', error);
      return this.error('Failed to fetch upcoming jobs', error);
    }
  }

  /**
   * Refresh materialized views
   */
  async refreshMetrics(companyId: string): Promise<ServiceResponse<void>> {
    try {
      // Call database function to refresh materialized view
      const { error } = await this.supabase
        .rpc('refresh_job_metrics');

      if (error) {
        console.error('[DashboardService] Error refreshing metrics:', error);
        return this.error('Failed to refresh metrics', error);
      }

      console.log('[DashboardService] Metrics refreshed successfully');
      return this.success(undefined);

    } catch (error: any) {
      console.error('[DashboardService] Error refreshing metrics:', error);
      return this.error('Failed to refresh metrics', error);
    }
  }

  // HELPER METHODS

  /**
   * Check if job is overdue
   */
  private isJobOverdue(job: any): boolean {
    if (!job.scheduled_end_date) return false;
    if (['completed', 'invoiced', 'cancelled'].includes(job.status)) {
      return false;
    }
    return new Date(job.scheduled_end_date) < new Date();
  }

  /**
   * Return empty job metrics for dev mode / missing tables
   */
  private getEmptyJobMetrics(): ServiceResponse<JobMetricsByStatus[]> {
    const allStatuses: JobStatus[] = [
      'quote', 'approved', 'scheduled', 'in_progress',
      'completed', 'invoiced', 'cancelled'
    ];

    const emptyMetrics = allStatuses.map(status => ({
      status,
      job_count: 0,
      total_estimated: 0,
      total_actual: 0,
      avg_estimated: 0,
      avg_actual: 0,
      unique_customers: 0,
      high_priority_count: 0,
      overdue_count: 0
    }));

    return this.success(emptyMetrics);
  }

  /**
   * Return empty revenue metrics for dev mode / missing tables
   */
  private getEmptyRevenueMetrics(): RevenueMetrics {
    return {
      current_period_revenue: 0,
      current_period_jobs: 0,
      previous_period_revenue: 0,
      previous_period_jobs: 0,
      revenue_growth_percentage: 0,
      quoted_value: 0,
      approved_value: 0,
      outstanding_invoices: 0,
      average_job_value: 0,
      average_days_to_close: 0
    };
  }

  /**
   * Return empty crew utilization for dev mode / missing tables
   */
  private getEmptyCrewUtilization(): CrewUtilization {
    return {
      total_crews: 0,
      active_crews: 0,
      avg_completion_percentage: 0,
      total_hours_worked: 0,
      assignments_in_progress: 0,
      crews_at_capacity: 0,
      crews_available: 0
    };
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
    console.error(`[DashboardService] ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
