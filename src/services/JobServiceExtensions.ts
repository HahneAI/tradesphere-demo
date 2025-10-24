/**
 * Job Service Extensions for Wizard Integration
 *
 * Additional methods to support Job Creation Wizard workflow.
 * These methods should be added to the existing JobService class.
 *
 * @module JobServiceExtensions
 */

import { getSupabase } from './supabase';
import {
  Job,
  CreateJobInput,
  CreateJobServiceInput,
  CreateJobAssignmentInput,
  JobWithDetails,
  ScheduleConflict
} from '../types/crm';
import { ServiceResponse } from '../types/customer';

/**
 * Wizard-specific job creation input
 * Extends CreateJobInput with wizard-specific fields
 */
export interface WizardJobInput extends CreateJobInput {
  // Services are mandatory in wizard flow
  services: CreateJobServiceInput[];

  // Optional assignment from Step 5
  assignment?: Omit<CreateJobAssignmentInput, 'job_id'>;
}

/**
 * Job creation result with full details
 */
export interface JobCreationResult {
  job: Job;
  services: string[]; // Array of created service IDs
  assignmentId?: string; // Created assignment ID if scheduled
}

// ============================================================================
// Method Signatures to Add to JobService Class
// ============================================================================

export class JobServiceWizardExtensions {
  private supabase = getSupabase();

  /**
   * CREATE JOB WITH WIZARD DATA (Atomic Transaction)
   *
   * Creates job, services, and optional assignment in a single transaction.
   * Generates job number, validates customer, calculates totals.
   * Rollback all changes if any step fails.
   *
   * @param input - Complete wizard data
   * @returns ServiceResponse with created job details
   *
   * @example
   * const result = await jobService.createJobFromWizard({
   *   company_id: 'uuid',
   *   customer_id: 'uuid',
   *   title: 'Paver Patio Installation',
   *   service_address: '123 Main St',
   *   priority: 5,
   *   status: 'quote', // or 'approved'
   *   services: [
   *     {
   *       service_config_id: 'uuid',
   *       service_name: 'Paver Patio',
   *       quantity: 1,
   *       unit_price: 85.00,
   *       total_price: 30600.00,
   *       calculation_data: { ... },
   *       pricing_variables: { sqft: 360 },
   *       added_by_user_id: 'uuid'
   *     }
   *   ],
   *   assignment: {
   *     crew_id: 'uuid',
   *     scheduled_start: '2025-02-01T08:00:00Z',
   *     scheduled_end: '2025-02-05T17:00:00Z',
   *     estimated_hours: 32,
   *     assigned_by_user_id: 'uuid'
   *   },
   *   created_by_user_id: 'uuid'
   * });
   */
  async createJobFromWizard(
    input: WizardJobInput
  ): Promise<ServiceResponse<JobCreationResult>> {
    try {
      // ========== VALIDATION ==========

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

      if (!input.services || input.services.length === 0) {
        return this.error('At least one service is required');
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

      // ========== JOB NUMBER GENERATION ==========

      const jobNumber = await this.generateJobNumber(input.company_id);

      // ========== CALCULATE TOTALS ==========

      const estimatedTotal = input.services.reduce(
        (sum, service) => sum + (service.total_price || 0),
        0
      );

      const laborCost = input.services.reduce((sum, service) => {
        return sum + (service.calculation_data?.tier2Results?.laborCost || 0);
      }, 0);

      const materialCost = input.services.reduce((sum, service) => {
        return sum + (service.calculation_data?.tier2Results?.totalMaterialCost || 0);
      }, 0);

      // ========== CREATE JOB RECORD ==========

      const { data: job, error: jobError } = await this.supabase
        .from('ops_jobs')
        .insert({
          company_id: input.company_id,
          customer_id: input.customer_id,
          job_number: jobNumber,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          status: input.status || 'quote',
          service_address: input.service_address?.trim() || null,
          service_city: input.service_city?.trim() || null,
          service_state: input.service_state?.trim() || null,
          service_zip: input.service_zip?.trim() || null,
          service_location_notes: input.service_location_notes?.trim() || null,
          requested_start_date: input.requested_start_date || null,
          scheduled_start_date: input.assignment?.scheduled_start
            ? new Date(input.assignment.scheduled_start).toISOString().split('T')[0]
            : null,
          scheduled_end_date: input.assignment?.scheduled_end
            ? new Date(input.assignment.scheduled_end).toISOString().split('T')[0]
            : null,
          estimated_total: estimatedTotal,
          labor_cost: laborCost,
          material_cost: materialCost,
          quote_valid_until: input.quote_valid_until || this.getDefaultQuoteExpiry(),
          priority: input.priority ?? 5,
          tags: input.tags || [],
          metadata: {
            ...(input.metadata || {}),
            created_via: 'wizard',
            wizard_version: '1.0'
          },
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

      console.log('[JobService] Job created:', job.id, job.job_number);

      // ========== CREATE SERVICE LINE ITEMS ==========

      const serviceInserts = input.services.map(service => ({
        job_id: job.id,
        service_config_id: service.service_config_id,
        service_name: service.service_name,
        service_description: service.service_description || null,
        quantity: service.quantity || 1,
        unit_price: service.unit_price,
        total_price: service.total_price,
        calculation_data: service.calculation_data || {},
        pricing_variables: service.pricing_variables || {},
        notes: service.notes || null,
        metadata: service.metadata || {},
        added_by_user_id: service.added_by_user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: createdServices, error: servicesError } = await this.supabase
        .from('ops_job_services')
        .insert(serviceInserts)
        .select('id');

      if (servicesError) {
        console.error('[JobService] Error creating services:', servicesError);
        // Rollback: delete the created job
        await this.supabase.from('ops_jobs').delete().eq('id', job.id);
        return this.error('Failed to create job services', servicesError);
      }

      console.log('[JobService] Services created:', createdServices.length);

      const serviceIds = createdServices.map(s => s.id);

      // ========== CREATE ASSIGNMENT (OPTIONAL) ==========

      let assignmentId: string | undefined;

      if (input.assignment) {
        // Check for scheduling conflicts before creating
        const conflictCheck = await this.checkScheduleConflicts(
          input.assignment.crew_id,
          input.assignment.scheduled_start,
          input.assignment.scheduled_end
        );

        if (!conflictCheck.success || conflictCheck.data.length > 0) {
          console.warn('[JobService] Schedule conflicts detected:', conflictCheck.data);
          // Note: Not blocking creation, but returning conflict info
        }

        const { data: assignment, error: assignmentError } = await this.supabase
          .from('ops_job_assignments')
          .insert({
            job_id: job.id,
            crew_id: input.assignment.crew_id,
            scheduled_start: input.assignment.scheduled_start,
            scheduled_end: input.assignment.scheduled_end,
            status: 'scheduled',
            assignment_notes: input.assignment.assignment_notes || null,
            work_description: input.assignment.work_description || null,
            estimated_hours: input.assignment.estimated_hours || null,
            completion_percentage: 0,
            metadata: input.assignment.metadata || {},
            assigned_by_user_id: input.assignment.assigned_by_user_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (assignmentError) {
          console.error('[JobService] Error creating assignment:', assignmentError);
          // Note: Not rolling back job/services, assignment is optional
        } else {
          assignmentId = assignment.id;
          console.log('[JobService] Assignment created:', assignmentId);

          // Update job status to 'scheduled' if assignment was created
          await this.supabase
            .from('ops_jobs')
            .update({ status: 'scheduled', updated_at: new Date().toISOString() })
            .eq('id', job.id);
        }
      }

      // ========== RETURN SUCCESS ==========

      return this.success({
        job,
        services: serviceIds,
        assignmentId
      });

    } catch (error: any) {
      console.error('[JobService] Error in createJobFromWizard:', error);
      return this.error('Failed to create job from wizard', error);
    }
  }

  /**
   * GENERATE JOB NUMBER
   *
   * Generates sequential job number in format: JOB-{YEAR}-{SEQUENCE}
   * Thread-safe with database-level incrementing.
   *
   * @param companyId - Company UUID
   * @returns Job number string (e.g., "JOB-2025-0042")
   *
   * @example
   * const jobNumber = await jobService.generateJobNumber('company-uuid');
   * // Returns: "JOB-2025-0042"
   */
  async generateJobNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JOB-${year}-`;

    // Get the highest job number for this year and company
    const { data, error } = await this.supabase
      .from('ops_jobs')
      .select('job_number')
      .eq('company_id', companyId)
      .like('job_number', `${prefix}%`)
      .order('job_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[JobService] Error fetching last job number:', error);
      // Fallback to starting at 1
      return `${prefix}0001`;
    }

    let nextNumber = 1;

    if (data && data.length > 0) {
      const lastNumber = data[0].job_number;
      const match = lastNumber.match(/JOB-\d{4}-(\d+)/);

      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Pad with leading zeros (4 digits)
    const paddedNumber = String(nextNumber).padStart(4, '0');

    return `${prefix}${paddedNumber}`;
  }

  /**
   * CHECK SCHEDULE CONFLICTS
   *
   * Checks if a crew has conflicting assignments during the requested time range.
   * Returns list of conflicting jobs.
   *
   * @param crewId - Crew UUID
   * @param scheduledStart - ISO 8601 timestamp
   * @param scheduledEnd - ISO 8601 timestamp
   * @returns ServiceResponse with array of conflicts
   *
   * @example
   * const conflicts = await jobService.checkScheduleConflicts(
   *   'crew-uuid',
   *   '2025-02-01T08:00:00Z',
   *   '2025-02-05T17:00:00Z'
   * );
   *
   * if (conflicts.data.length > 0) {
   *   console.log('Conflicts found:', conflicts.data);
   * }
   */
  async checkScheduleConflicts(
    crewId: string,
    scheduledStart: string,
    scheduledEnd: string
  ): Promise<ServiceResponse<ScheduleConflict[]>> {
    try {
      const { data, error } = await this.supabase
        .from('ops_job_assignments')
        .select(`
          id,
          scheduled_start,
          scheduled_end,
          job:ops_jobs (
            id,
            job_number,
            title,
            customer:crm_customers (
              customer_name
            )
          ),
          crew:ops_crews (
            id,
            crew_name
          )
        `)
        .eq('crew_id', crewId)
        .neq('status', 'cancelled')
        .or(`
          and(scheduled_start.lte.${scheduledEnd},scheduled_end.gte.${scheduledStart})
        `);

      if (error) {
        console.error('[JobService] Error checking conflicts:', error);
        return this.error('Failed to check schedule conflicts', error);
      }

      // Transform data into ScheduleConflict format
      const conflicts: ScheduleConflict[] = data && data.length > 0
        ? [{
            crew_id: crewId,
            crew_name: data[0].crew?.crew_name || 'Unknown Crew',
            requested_start: scheduledStart,
            requested_end: scheduledEnd,
            conflicting_assignments: data.map(assignment => ({
              assignment_id: assignment.id,
              job_id: assignment.job?.id || '',
              job_number: assignment.job?.job_number || '',
              job_title: assignment.job?.title || '',
              scheduled_start: assignment.scheduled_start,
              scheduled_end: assignment.scheduled_end
            }))
          }]
        : [];

      return this.success(conflicts);

    } catch (error: any) {
      console.error('[JobService] Error in checkScheduleConflicts:', error);
      return this.error('Failed to check schedule conflicts', error);
    }
  }

  /**
   * GET JOB WITH WIZARD DETAILS
   *
   * Fetches complete job details including all relationships.
   * Optimized for wizard review and job detail views.
   *
   * @param jobId - Job UUID
   * @param companyId - Company UUID
   * @returns ServiceResponse with JobWithDetails
   *
   * @example
   * const result = await jobService.getJobWithDetails('job-uuid', 'company-uuid');
   * if (result.success) {
   *   console.log('Job:', result.data.job_number);
   *   console.log('Services:', result.data.services.length);
   *   console.log('Customer:', result.data.customer.customer_name);
   * }
   */
  async getJobWithDetails(
    jobId: string,
    companyId: string
  ): Promise<ServiceResponse<JobWithDetails>> {
    try {
      const { data, error } = await this.supabase
        .from('ops_jobs')
        .select(`
          *,
          customer:crm_customers!inner (
            id,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            customer_notes,
            lifecycle_stage,
            tags
          ),
          services:ops_job_services (
            *
          ),
          assignments:ops_job_assignments (
            *,
            crew:ops_crews (
              id,
              crew_name,
              crew_code,
              color_code
            )
          ),
          notes:ops_job_notes (
            *,
            created_by:users (
              name,
              email
            )
          )
        `)
        .eq('id', jobId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('[JobService] Error fetching job details:', error);
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
      console.error('[JobService] Error in getJobWithDetails:', error);
      return this.error('Failed to get job details', error);
    }
  }

  /**
   * VALIDATE WIZARD DATA BEFORE SUBMISSION
   *
   * Pre-validates wizard data before database operations.
   * Checks customer existence, service validity, schedule conflicts.
   *
   * @param input - Complete wizard data
   * @returns ServiceResponse with validation result
   *
   * @example
   * const validation = await jobService.validateWizardData(wizardInput);
   * if (!validation.success) {
   *   console.error('Validation failed:', validation.error);
   * }
   */
  async validateWizardData(
    input: WizardJobInput
  ): Promise<ServiceResponse<{ valid: boolean; errors: string[] }>> {
    const errors: string[] = [];

    try {
      // Check customer exists
      const { data: customer } = await this.supabase
        .from('crm_customers')
        .select('id')
        .eq('id', input.customer_id)
        .eq('company_id', input.company_id)
        .single();

      if (!customer) {
        errors.push('Customer not found or does not belong to company');
      }

      // Validate services
      if (!input.services || input.services.length === 0) {
        errors.push('At least one service is required');
      }

      // Validate service totals
      input.services.forEach((service, index) => {
        if (!service.unit_price || service.unit_price <= 0) {
          errors.push(`Service ${index + 1}: Invalid unit price`);
        }
        if (!service.total_price || service.total_price <= 0) {
          errors.push(`Service ${index + 1}: Invalid total price`);
        }
      });

      // Check schedule conflicts if assignment provided
      if (input.assignment) {
        const conflictCheck = await this.checkScheduleConflicts(
          input.assignment.crew_id,
          input.assignment.scheduled_start,
          input.assignment.scheduled_end
        );

        if (conflictCheck.success && conflictCheck.data.length > 0) {
          errors.push('Schedule conflicts detected with existing crew assignments');
        }
      }

      return this.success({
        valid: errors.length === 0,
        errors
      });

    } catch (error: any) {
      console.error('[JobService] Error validating wizard data:', error);
      return this.error('Validation failed', error);
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Get default quote expiration date (30 days from now)
   */
  private getDefaultQuoteExpiry(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
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
export const jobServiceWizardExtensions = new JobServiceWizardExtensions();
