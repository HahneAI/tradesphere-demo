/**
 * Job Service - Business Logic Layer
 *
 * Handles all job-related operations including CRUD, status management,
 * service line items, and pricing engine integration.
 *
 * @module JobService
 */

import { getSupabase } from './supabase';
import {
  Job,
  JobWithDetails,
  JobListItem,
  JobService as JobServiceType,
  CreateJobInput,
  UpdateJobInput,
  JobSearchFilters,
  CreateJobServiceInput,
  UpdateJobServiceInput,
  JobStatus,
  ServiceCalculationData
} from '../types/crm';
import { ServiceResponse, PaginatedResponse } from '../types/customer';
import { masterPricingEngine } from '../pricing-system/core/calculations/master-pricing-engine';

export class JobService {
  private supabase = getSupabase();

  /**
   * Create a new job with optional services
   * Generates job number, validates customer, optionally calculates pricing
   */
  async createJob(input: CreateJobInput): Promise<ServiceResponse<Job>> {
    try {
      // Validate required fields
      if (!input.title?.trim()) {
        return this.error('Job title is required');
      }

      if (!input.customer_id) {
        return this.error('Customer ID is required');
      }

      if (!input.company_id) {
        return this.error('Company ID is required');
      }

      if (!input.created_by_user_id) {
        return this.error('Created by user ID is required');
      }

      // Validate customer exists and belongs to company
      const { data: customer, error: customerError } = await this.supabase
        .from('crm_customers')
        .select('id, company_id')
        .eq('id', input.customer_id)
        .eq('company_id', input.company_id)
        .single();

      if (customerError || !customer) {
        return this.error('Customer not found or does not belong to company');
      }

      // Generate job number
      const jobNumber = await this.generateJobNumber(input.company_id);

      // Insert job
      const { data: job, error: jobError } = await this.supabase
        .from('jobs')
        .insert({
          company_id: input.company_id,
          customer_id: input.customer_id,
          job_number: jobNumber,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          status: 'quote',
          service_address: input.service_address?.trim() || null,
          service_city: input.service_city?.trim() || null,
          service_state: input.service_state?.trim() || null,
          service_zip: input.service_zip?.trim() || null,
          service_location_notes: input.service_location_notes?.trim() || null,
          requested_start_date: input.requested_start_date || null,
          scheduled_start_date: input.scheduled_start_date || null,
          scheduled_end_date: input.scheduled_end_date || null,
          estimated_total: input.estimated_total || null,
          labor_cost: input.labor_cost || null,
          material_cost: input.material_cost || null,
          quote_valid_until: input.quote_valid_until || null,
          priority: input.priority ?? 3,
          tags: input.tags || [],
          metadata: input.metadata || {},
          created_by_user_id: input.created_by_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (jobError) {
        console.error('[JobService] Error creating job:', jobError);
        return this.error('Failed to create job', jobError);
      }

      // Add services if provided
      if (input.services?.length) {
        for (const serviceInput of input.services) {
          const serviceResult = await this.addServiceToJob(job.id, serviceInput);
          if (!serviceResult.success) {
            console.error('[JobService] Failed to add service:', serviceResult.error);
          }
        }
      }

      console.log('[JobService] Job created successfully:', job.id);
      return this.success(job);

    } catch (error: any) {
      console.error('[JobService] Error creating job:', error);
      return this.error('Failed to create job', error);
    }
  }

  /**
   * Update job details
   * Validates status transitions, updates totals if needed
   */
  async updateJob(
    jobId: string,
    companyId: string,
    updates: UpdateJobInput
  ): Promise<ServiceResponse<Job>> {
    try {
      // Validate company access
      const { data: existingJob, error: fetchError } = await this.supabase
        .from('jobs')
        .select('company_id, status')
        .eq('id', jobId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !existingJob) {
        return this.error('Job not found');
      }

      // Validate status transition if changing status
      if (updates.status && !this.isValidStatusTransition(existingJob.status, updates.status)) {
        return this.error(`Invalid status transition from ${existingJob.status} to ${updates.status}`);
      }

      // Prepare update data
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Update job
      const { data, error } = await this.supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('[JobService] Error updating job:', error);
        return this.error('Failed to update job', error);
      }

      console.log('[JobService] Job updated successfully:', jobId);
      return this.success(data);

    } catch (error: any) {
      console.error('[JobService] Error updating job:', error);
      return this.error('Failed to update job', error);
    }
  }

  /**
   * Get job with full details including customer, services, assignments
   */
  async getJob(jobId: string, companyId: string): Promise<ServiceResponse<JobWithDetails>> {
    try {
      const { data, error } = await this.supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!inner (
            id,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            customer_notes,
            lifecycle_stage,
            tags
          ),
          services:job_services (
            *
          ),
          assignments:job_assignments (
            *,
            crew:crews (
              id,
              crew_name,
              crew_code,
              color_code
            )
          ),
          notes:job_notes (
            *
          )
        `)
        .eq('id', jobId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('[JobService] Error fetching job:', error);
        return this.error('Job not found', error);
      }

      // Calculate computed fields
      const jobWithDetails: JobWithDetails = {
        ...data,
        total_services_count: data.services?.length || 0,
        total_assigned_crews: data.assignments?.length || 0,
        is_overdue: this.isJobOverdue(data),
        days_until_start: this.calculateDaysUntilStart(data)
      };

      return this.success(jobWithDetails);

    } catch (error: any) {
      console.error('[JobService] Error fetching job:', error);
      return this.error('Failed to get job', error);
    }
  }

  /**
   * Get paginated list of jobs with filters
   */
  async getJobs(
    companyId: string,
    filters: JobSearchFilters = {}
  ): Promise<PaginatedResponse<JobListItem>> {
    try {
      // Build query
      let query = this.supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          title,
          status,
          priority,
          customer_id,
          customers!inner (customer_name),
          service_address,
          scheduled_start_date,
          estimated_total,
          tags,
          created_at
        `, { count: 'exact' })
        .eq('company_id', companyId);

      // Apply search query
      if (filters.searchQuery?.trim()) {
        const search = filters.searchQuery.trim().toLowerCase();
        query = query.or(`job_number.ilike.%${search}%,title.ilike.%${search}%`);
      }

      // Apply status filter
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      } else if (filters.exclude_status?.length) {
        query = query.not('status', 'in', `(${filters.exclude_status.join(',')})`);
      }

      // Apply customer filter
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      // Apply tags filter
      if (filters.tags?.length) {
        query = query.contains('tags', filters.tags);
      }

      // Apply priority filters
      if (filters.priority?.length) {
        query = query.in('priority', filters.priority);
      } else {
        if (filters.min_priority !== undefined) {
          query = query.gte('priority', filters.min_priority);
        }
        if (filters.max_priority !== undefined) {
          query = query.lte('priority', filters.max_priority);
        }
      }

      // Apply financial filters
      if (filters.min_estimated_total !== undefined) {
        query = query.gte('estimated_total', filters.min_estimated_total);
      }
      if (filters.max_estimated_total !== undefined) {
        query = query.lte('estimated_total', filters.max_estimated_total);
      }

      // Apply date range filter
      if (filters.date_range) {
        const field = filters.date_range.field || 'created_at';
        if (filters.date_range.start) {
          query = query.gte(field, filters.date_range.start);
        }
        if (filters.date_range.end) {
          query = query.lte(field, filters.date_range.end);
        }
      }

      // Get count
      const { count, error: countError } = await query.select('*', { count: 'exact', head: true });
      if (countError) {
        throw countError;
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Execute query
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Map to list items
      const jobs: JobListItem[] = (data || []).map(row => ({
        ...row,
        customer_name: row.customers?.customer_name || 'Unknown',
        is_overdue: this.isJobOverdue(row),
        assigned_crews_count: 0 // TODO: Add subquery for crew count
      }));

      return {
        items: jobs,
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        hasMore: offset + limit < (count || 0)
      };

    } catch (error: any) {
      console.error('[JobService] Error fetching jobs:', error);
      throw error;
    }
  }

  /**
   * PRICING ENGINE INTEGRATION POINT
   * Calculate job estimate from selected services using pricing engine
   */
  async calculateJobEstimate(
    companyId: string,
    services: Array<{
      service_config_id: string;
      pricing_variables: Record<string, any>;
      quantity?: number;
    }>
  ): Promise<ServiceResponse<{
    services: Array<{
      service_config_id: string;
      calculation: any;
      total: number;
    }>;
    total: number;
  }>> {
    try {
      const calculations = [];
      let grandTotal = 0;

      for (const service of services) {
        // TODO: Integrate with masterPricingEngine.calculateService()
        // This is a placeholder - actual implementation will call pricing engine
        //
        // INTEGRATION STEPS:
        // 1. Call masterPricingEngine.calculatePricing(service.pricing_variables, sqft, serviceName, companyId)
        // 2. Extract calculation result
        // 3. Store in calculation_data JSONB field
        // 4. Sum totals

        const mockCalculation = {
          service_config_id: service.service_config_id,
          calculation: {
            tier1Results: {
              baseHours: 10,
              adjustedHours: 12,
              totalManHours: 24,
              totalDays: 3
            },
            tier2Results: {
              laborCost: 1200,
              materialCostBase: 800,
              materialWasteCost: 80,
              totalMaterialCost: 880,
              equipmentCost: 150,
              obstacleCost: 0,
              subtotal: 2230,
              profit: 446,
              total: 2676,
              pricePerSqft: 26.76
            },
            sqft: 100,
            inputValues: service.pricing_variables,
            confidence: 0.95,
            calculationDate: new Date().toISOString()
          },
          total: 2676 * (service.quantity || 1)
        };

        calculations.push(mockCalculation);
        grandTotal += mockCalculation.total;
      }

      return this.success({
        services: calculations,
        total: grandTotal
      });

    } catch (error: any) {
      console.error('[JobService] Error calculating estimate:', error);
      return this.error('Failed to calculate estimate', error);
    }
  }

  /**
   * Add a service to a job with pricing calculation
   */
  async addServiceToJob(
    jobId: string,
    serviceInput: CreateJobServiceInput
  ): Promise<ServiceResponse<JobServiceType>> {
    try {
      // Validate job exists
      const { data: job } = await this.supabase
        .from('jobs')
        .select('id, company_id')
        .eq('id', jobId)
        .single();

      if (!job) {
        return this.error('Job not found');
      }

      // Calculate pricing if variables provided
      let calculationData: ServiceCalculationData | undefined;

      if (serviceInput.pricing_variables) {
        // TODO: Call pricing engine
        // const result = await masterPricingEngine.calculatePricing(
        //   serviceInput.pricing_variables,
        //   sqft,
        //   serviceName,
        //   job.company_id,
        //   serviceInput.service_config_id
        // );
        // calculationData = {
        //   tier1Results: result.tier1Results,
        //   tier2Results: result.tier2Results,
        //   sqft: result.sqft,
        //   inputValues: result.inputValues,
        //   confidence: result.confidence,
        //   calculationDate: result.calculationDate
        // };

        // Placeholder calculation data
        calculationData = {
          tier1Results: {
            baseHours: 10,
            adjustedHours: 12,
            totalManHours: 24,
            totalDays: 3,
            breakdown: ['Base calculation', 'Complexity adjustment']
          },
          tier2Results: {
            laborCost: 1200,
            materialCostBase: 800,
            materialWasteCost: 80,
            totalMaterialCost: 880,
            equipmentCost: 150,
            obstacleCost: 0,
            subtotal: 2230,
            profit: 446,
            total: serviceInput.total_price,
            pricePerSqft: 26.76
          },
          calculationDate: new Date().toISOString()
        };
      }

      // Insert job service
      const { data, error } = await this.supabase
        .from('job_services')
        .insert({
          job_id: jobId,
          service_config_id: serviceInput.service_config_id,
          service_name: serviceInput.service_name,
          service_description: serviceInput.service_description || null,
          quantity: serviceInput.quantity || 1,
          unit_price: serviceInput.unit_price,
          total_price: serviceInput.total_price,
          calculation_data: calculationData || {},
          pricing_variables: serviceInput.pricing_variables || {},
          notes: serviceInput.notes || null,
          metadata: serviceInput.metadata || {},
          added_by_user_id: serviceInput.added_by_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[JobService] Error adding service:', error);
        return this.error('Failed to add service', error);
      }

      // Update job totals
      await this.updateJobTotals(jobId);

      console.log('[JobService] Service added successfully:', data.id);
      return this.success(data);

    } catch (error: any) {
      console.error('[JobService] Error adding service to job:', error);
      return this.error('Failed to add service to job', error);
    }
  }

  /**
   * Update a job service
   */
  async updateJobService(
    serviceId: string,
    companyId: string,
    updates: UpdateJobServiceInput
  ): Promise<ServiceResponse<JobServiceType>> {
    try {
      // Verify service belongs to company
      const { data: service } = await this.supabase
        .from('job_services')
        .select(`
          id,
          job_id,
          jobs!inner (company_id)
        `)
        .eq('id', serviceId)
        .single();

      if (!service || service.jobs?.company_id !== companyId) {
        return this.error('Service not found');
      }

      // Update service
      const { data, error } = await this.supabase
        .from('job_services')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single();

      if (error) {
        console.error('[JobService] Error updating service:', error);
        return this.error('Failed to update service', error);
      }

      // Update job totals if price changed
      if (updates.total_price !== undefined) {
        await this.updateJobTotals(service.job_id);
      }

      return this.success(data);

    } catch (error: any) {
      console.error('[JobService] Error updating service:', error);
      return this.error('Failed to update service', error);
    }
  }

  /**
   * Remove a service from a job
   */
  async removeServiceFromJob(
    serviceId: string,
    companyId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Get service to check permissions and get job_id
      const { data: service } = await this.supabase
        .from('job_services')
        .select(`
          id,
          job_id,
          jobs!inner (company_id)
        `)
        .eq('id', serviceId)
        .single();

      if (!service || service.jobs?.company_id !== companyId) {
        return this.error('Service not found');
      }

      const jobId = service.job_id;

      // Delete service
      const { error } = await this.supabase
        .from('job_services')
        .delete()
        .eq('id', serviceId);

      if (error) {
        console.error('[JobService] Error removing service:', error);
        return this.error('Failed to remove service', error);
      }

      // Update job totals
      await this.updateJobTotals(jobId);

      return this.success(undefined);

    } catch (error: any) {
      console.error('[JobService] Error removing service:', error);
      return this.error('Failed to remove service', error);
    }
  }

  /**
   * Update job status with validation
   */
  async updateJobStatus(
    jobId: string,
    companyId: string,
    newStatus: JobStatus,
    userId?: string
  ): Promise<ServiceResponse<Job>> {
    try {
      // Get current job
      const { data: job } = await this.supabase
        .from('jobs')
        .select('status, company_id')
        .eq('id', jobId)
        .eq('company_id', companyId)
        .single();

      if (!job) {
        return this.error('Job not found');
      }

      // Validate transition
      if (!this.isValidStatusTransition(job.status, newStatus)) {
        return this.error(`Cannot transition from ${job.status} to ${newStatus}`);
      }

      // Prepare status-specific updates
      const updates: UpdateJobInput = {
        status: newStatus,
        updated_by_user_id: userId
      };

      // Set timestamps based on status
      switch (newStatus) {
        case 'approved':
          updates.quote_approved_at = new Date().toISOString();
          break;
        case 'in_progress':
          updates.actual_start_date = new Date().toISOString();
          break;
        case 'completed':
          updates.actual_end_date = new Date().toISOString();
          break;
        case 'invoiced':
          updates.invoiced_at = new Date().toISOString();
          break;
      }

      return this.updateJob(jobId, companyId, updates);

    } catch (error: any) {
      console.error('[JobService] Error updating job status:', error);
      return this.error('Failed to update job status', error);
    }
  }

  // HELPER METHODS

  /**
   * Generate unique job number for company
   */
  private async generateJobNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();

    // Get the highest job number for this year
    const { data } = await this.supabase
      .from('jobs')
      .select('job_number')
      .eq('company_id', companyId)
      .like('job_number', `JOB-${year}-%`)
      .order('job_number', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (data && data.length > 0) {
      const match = data[0].job_number.match(/JOB-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `JOB-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Validate job status transitions
   */
  private isValidStatusTransition(from: JobStatus, to: JobStatus): boolean {
    const transitions: Record<JobStatus, JobStatus[]> = {
      'quote': ['approved', 'cancelled'],
      'approved': ['scheduled', 'cancelled'],
      'scheduled': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': ['invoiced'],
      'invoiced': [],
      'cancelled': ['quote'] // Allow reopening
    };

    return transitions[from]?.includes(to) || false;
  }

  /**
   * Update job totals from services
   */
  private async updateJobTotals(jobId: string): Promise<void> {
    try {
      // Calculate totals from job_services
      const { data } = await this.supabase
        .from('job_services')
        .select('total_price')
        .eq('job_id', jobId);

      const total = data?.reduce((sum, s) => sum + (s.total_price || 0), 0) || 0;

      await this.supabase
        .from('jobs')
        .update({
          estimated_total: total,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

    } catch (error) {
      console.error('[JobService] Error updating job totals:', error);
    }
  }

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
   * Calculate days until job starts
   */
  private calculateDaysUntilStart(job: any): number | null {
    if (!job.scheduled_start_date) return null;
    const start = new Date(job.scheduled_start_date);
    const now = new Date();
    const diffTime = start.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    console.error(`[JobService] ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const jobService = new JobService();
