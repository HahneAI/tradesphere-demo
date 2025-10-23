# CRM Service Layer Architecture

## Document Version
- **Version:** 1.0.0
- **Date:** 2025-01-22
- **Author:** Backend System Architect
- **Purpose:** Comprehensive service layer design for CRM system implementation

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Service Design Patterns](#service-design-patterns)
4. [Core Services](#core-services)
5. [Integration Points](#integration-points)
6. [Data Flow](#data-flow)
7. [Error Handling](#error-handling)
8. [Security & Multi-tenancy](#security--multi-tenancy)
9. [Implementation Guidelines](#implementation-guidelines)

---

## Executive Summary

This document defines the service layer architecture for the CRM system, encompassing Jobs, Crews, Schedule, Dashboard, and JobNotes services. The architecture follows established patterns from existing services (CustomerRepository, CustomerService, StripeService) while integrating with the pricing engine and providing placeholders for future AI capabilities.

### Key Design Principles
- **Repository Pattern:** Data access through class-based repositories
- **Service Pattern:** Business logic in dedicated service classes
- **Multi-tenant Isolation:** Company-based data segregation
- **Type Safety:** Full TypeScript typing with interfaces from `src/types/crm.ts`
- **Error Handling:** Consistent ServiceResponse pattern with descriptive errors
- **Integration Ready:** Clear integration points for pricing and AI engines

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (REST/GraphQL)                 │
├─────────────────────────────────────────────────────────────┤
│                        Service Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Job    │ │   Crew   │ │ Schedule │ │  Dashboard   │  │
│  │ Service  │ │ Service  │ │ Service  │ │   Service    │  │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘ └──────┬───────┘  │
│        │            │            │              │           │
│  ┌─────▼────────────▼────────────▼──────────────▼────────┐ │
│  │               Shared Utilities & Helpers               │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                      Repository Layer                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Job    │ │   Crew   │ │ Schedule │ │  Dashboard   │  │
│  │Repository│ │Repository│ │Repository│ │  Repository  │  │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘ └──────┬───────┘  │
│        └────────────┴────────────┴──────────────┘          │
├─────────────────────────────────────────────────────────────┤
│              External Integrations                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │   Pricing    │ │      AI      │ │     Supabase     │   │
│  │    Engine    │ │   Engine     │ │    PostgreSQL    │   │
│  └──────────────┘ └──────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Service Design Patterns

### Base Service Pattern

All services follow a consistent pattern for maintainability and developer experience:

```typescript
export class BaseService {
  protected supabase = getSupabase();

  // Standard response wrapper
  protected success<T>(data: T): ServiceResponse<T> {
    return { success: true, data };
  }

  protected error(message: string, error?: any): ServiceResponse<never> {
    console.error(`${this.constructor.name}: ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }

  // Multi-tenant validation
  protected validateCompanyAccess(requestCompanyId: string, userCompanyId: string): void {
    if (requestCompanyId !== userCompanyId) {
      throw new Error('Unauthorized: Company access denied');
    }
  }
}
```

### Repository Pattern

```typescript
export class BaseRepository<T> {
  protected supabase = getSupabase();
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected async withRetry<R>(
    operation: () => Promise<R>,
    maxRetries: number = 3
  ): Promise<R> {
    // Retry logic with exponential backoff
  }

  protected isRetryableError(error: any): boolean {
    // Network, timeout, and rate limit errors
  }
}
```

---

## Core Services

### 1. JobService

**File:** `src/services/JobService.ts`

```typescript
import { getSupabase } from './supabase';
import {
  Job,
  JobWithDetails,
  JobListItem,
  CreateJobInput,
  UpdateJobInput,
  JobSearchFilters,
  JobService as JobServiceType,
  CreateJobServiceInput,
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

      // Generate job number (company-specific sequence)
      const jobNumber = await this.generateJobNumber(input.company_id);

      // Start transaction
      const { data: job, error: jobError } = await this.supabase
        .from('jobs')
        .insert({
          ...input,
          job_number: jobNumber,
          status: 'quote',
          priority: input.priority ?? 3,
          tags: input.tags ?? [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (jobError) {
        return this.error('Failed to create job', jobError);
      }

      // Add services if provided
      if (input.services?.length) {
        for (const service of input.services) {
          await this.addServiceToJob(job.id, service);
        }
      }

      return this.success(job);

    } catch (error) {
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
      const { data: existingJob } = await this.supabase
        .from('jobs')
        .select('company_id, status')
        .eq('id', jobId)
        .single();

      if (existingJob?.company_id !== companyId) {
        return this.error('Unauthorized: Job not found');
      }

      // Validate status transition if changing status
      if (updates.status && !this.isValidStatusTransition(existingJob.status, updates.status)) {
        return this.error(`Invalid status transition from ${existingJob.status} to ${updates.status}`);
      }

      // Update job
      const { data, error } = await this.supabase
        .from('jobs')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by_user_id: updates.updated_by_user_id
        })
        .eq('id', jobId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        return this.error('Failed to update job', error);
      }

      return this.success(data);

    } catch (error) {
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

    } catch (error) {
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

      // Apply filters
      if (filters.searchQuery?.trim()) {
        const search = filters.searchQuery.trim().toLowerCase();
        query = query.or(`job_number.ilike.%${search}%,title.ilike.%${search}%`);
      }

      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }

      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      if (filters.tags?.length) {
        query = query.contains('tags', filters.tags);
      }

      // Apply date range
      if (filters.date_range) {
        const field = filters.date_range.field || 'created_at';
        if (filters.date_range.start) {
          query = query.gte(field, filters.date_range.start);
        }
        if (filters.date_range.end) {
          query = query.lte(field, filters.date_range.end);
        }
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
      const { data, error, count } = await query;

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

    } catch (error) {
      console.error('JobService: Error fetching jobs:', error);
      throw error;
    }
  }

  /**
   * PRICING ENGINE INTEGRATION
   * Calculate job estimate from selected services
   */
  async calculateJobEstimate(
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

    } catch (error) {
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
      // Calculate pricing if variables provided
      let calculationData: ServiceCalculationData | undefined;

      if (serviceInput.pricing_variables) {
        // TODO: Call pricing engine
        // const result = await masterPricingEngine.calculateService(
        //   serviceInput.service_config_id,
        //   serviceInput.pricing_variables
        // );
        // calculationData = result.calculation;

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
          service_description: serviceInput.service_description,
          quantity: serviceInput.quantity || 1,
          unit_price: serviceInput.unit_price,
          total_price: serviceInput.total_price,
          calculation_data: calculationData,
          pricing_variables: serviceInput.pricing_variables,
          notes: serviceInput.notes,
          metadata: serviceInput.metadata,
          added_by_user_id: serviceInput.added_by_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return this.error('Failed to add service', error);
      }

      // Update job totals
      await this.updateJobTotals(jobId);

      return this.success(data);

    } catch (error) {
      return this.error('Failed to add service to job', error);
    }
  }

  /**
   * Update job status with validation
   */
  async updateJobStatus(
    jobId: string,
    companyId: string,
    newStatus: JobStatus
  ): Promise<ServiceResponse<Job>> {
    try {
      // Get current job
      const { data: job } = await this.supabase
        .from('jobs')
        .select('status, company_id')
        .eq('id', jobId)
        .single();

      if (!job || job.company_id !== companyId) {
        return this.error('Job not found');
      }

      // Validate transition
      if (!this.isValidStatusTransition(job.status, newStatus)) {
        return this.error(`Cannot transition from ${job.status} to ${newStatus}`);
      }

      // Prepare status-specific updates
      const updates: UpdateJobInput = { status: newStatus };

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

    } catch (error) {
      return this.error('Failed to update job status', error);
    }
  }

  // HELPER METHODS

  private async generateJobNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();

    // Get the highest job number for this year
    const { data } = await this.supabase
      .from('jobs')
      .select('job_number')
      .eq('company_id', companyId)
      .like('job_number', `JOB-${year}-%`)
      .order('job_number', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (data) {
      const match = data.job_number.match(/JOB-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `JOB-${year}-${String(nextNumber).padStart(3, '0')}`;
  }

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

  private async updateJobTotals(jobId: string): Promise<void> {
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
  }

  private isJobOverdue(job: any): boolean {
    if (!job.scheduled_end_date) return false;
    if (['completed', 'invoiced', 'cancelled'].includes(job.status)) {
      return false;
    }
    return new Date(job.scheduled_end_date) < new Date();
  }

  private calculateDaysUntilStart(job: any): number | null {
    if (!job.scheduled_start_date) return null;
    const start = new Date(job.scheduled_start_date);
    const now = new Date();
    const diffTime = start.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private success<T>(data: T): ServiceResponse<T> {
    return { success: true, data };
  }

  private error(message: string, error?: any): ServiceResponse<never> {
    console.error(`JobService: ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const jobService = new JobService();
```

### 2. CrewService

**File:** `src/services/CrewService.ts`

```typescript
import { getSupabase } from './supabase';
import {
  Crew,
  CrewWithMembers,
  CrewMember,
  CrewMemberWithUser,
  CreateCrewInput,
  UpdateCrewInput,
  AddCrewMemberInput,
  UpdateCrewMemberInput,
  CrewAvailability,
  CrewSearchFilters
} from '../types/crm';
import { ServiceResponse, PaginatedResponse } from '../types/customer';

export class CrewService {
  private supabase = getSupabase();

  /**
   * Create a new crew
   */
  async createCrew(input: CreateCrewInput): Promise<ServiceResponse<Crew>> {
    try {
      if (!input.crew_name?.trim()) {
        return this.error('Crew name is required');
      }

      // Generate crew code if not provided
      const crewCode = input.crew_code || await this.generateCrewCode(input.company_id);

      const { data, error } = await this.supabase
        .from('crews')
        .insert({
          ...input,
          crew_code: crewCode,
          specializations: input.specializations || [],
          max_capacity: input.max_capacity || 6,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return this.error('Failed to create crew', error);
      }

      // Add crew lead as a member if specified
      if (input.crew_lead_user_id) {
        await this.addCrewMember(data.id, input.crew_lead_user_id, 'lead');
      }

      return this.success(data);

    } catch (error) {
      return this.error('Failed to create crew', error);
    }
  }

  /**
   * Get crew with expanded member details
   */
  async getCrew(crewId: string, companyId: string): Promise<ServiceResponse<CrewWithMembers>> {
    try {
      const { data, error } = await this.supabase
        .from('crews')
        .select(`
          *,
          crew_lead:users!crews_crew_lead_user_id_fkey (
            id,
            full_name,
            email,
            phone
          ),
          members:crew_members (
            *,
            user:users (
              id,
              full_name,
              email,
              phone,
              role
            )
          )
        `)
        .eq('id', crewId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        return this.error('Crew not found', error);
      }

      // Calculate computed fields
      const activeMembers = data.members?.filter(m => m.is_active) || [];
      const crewWithMembers: CrewWithMembers = {
        ...data,
        current_member_count: activeMembers.length,
        available_capacity: data.max_capacity - activeMembers.length,
        average_skill_level: this.calculateAverageSkillLevel(activeMembers)
      };

      return this.success(crewWithMembers);

    } catch (error) {
      return this.error('Failed to get crew', error);
    }
  }

  /**
   * Get all crews with filters
   */
  async getCrews(
    companyId: string,
    filters: CrewSearchFilters = {}
  ): Promise<PaginatedResponse<Crew>> {
    try {
      let query = this.supabase
        .from('crews')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Apply filters
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.searchQuery?.trim()) {
        const search = filters.searchQuery.trim().toLowerCase();
        query = query.or(
          `crew_name.ilike.%${search}%,crew_code.ilike.%${search}%`
        );
      }

      if (filters.specializations?.length) {
        query = query.contains('specializations', filters.specializations);
      }

      // TODO: Implement availability check
      // This requires complex joins with job_assignments table

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        items: data || [],
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        hasMore: offset + limit < (count || 0)
      };

    } catch (error) {
      console.error('CrewService: Error fetching crews:', error);
      throw error;
    }
  }

  /**
   * Add a member to a crew
   */
  async addCrewMember(
    crewId: string,
    userId: string,
    role: CrewRole = 'member'
  ): Promise<ServiceResponse<CrewMember>> {
    try {
      // Check if user is already in crew
      const { data: existing } = await this.supabase
        .from('crew_members')
        .select('id')
        .eq('crew_id', crewId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (existing) {
        return this.error('User is already a member of this crew');
      }

      // Check crew capacity
      const { data: crew } = await this.supabase
        .from('crews')
        .select('max_capacity')
        .eq('id', crewId)
        .single();

      const { count } = await this.supabase
        .from('crew_members')
        .select('*', { count: 'exact', head: true })
        .eq('crew_id', crewId)
        .eq('is_active', true);

      if (count && crew && count >= crew.max_capacity) {
        return this.error('Crew is at maximum capacity');
      }

      // Add member
      const { data, error } = await this.supabase
        .from('crew_members')
        .insert({
          crew_id: crewId,
          user_id: userId,
          role,
          joined_at: new Date().toISOString(),
          is_active: true,
          certifications: [],
          skill_level: 3, // Default to intermediate
          added_by_user_id: userId, // TODO: Get from context
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return this.error('Failed to add crew member', error);
      }

      return this.success(data);

    } catch (error) {
      return this.error('Failed to add crew member', error);
    }
  }

  /**
   * Check crew availability for a date range
   */
  async getCrewAvailability(
    crewId: string,
    startDate: string,
    endDate: string
  ): Promise<ServiceResponse<CrewAvailability>> {
    try {
      // Get crew details
      const { data: crew } = await this.supabase
        .from('crews')
        .select('id, crew_name')
        .eq('id', crewId)
        .single();

      if (!crew) {
        return this.error('Crew not found');
      }

      // Check for conflicts
      const { data: assignments } = await this.supabase
        .from('job_assignments')
        .select(`
          id,
          job_id,
          scheduled_start,
          scheduled_end,
          estimated_hours,
          jobs!inner (job_number, title)
        `)
        .eq('crew_id', crewId)
        .in('status', ['scheduled', 'in_progress'])
        .or(
          `and(scheduled_start.lte.${endDate},scheduled_end.gte.${startDate})`
        );

      const hasConflicts = assignments && assignments.length > 0;
      const totalHours = assignments?.reduce(
        (sum, a) => sum + (a.estimated_hours || 0),
        0
      ) || 0;

      const availability: CrewAvailability = {
        crew_id: crewId,
        crew_name: crew.crew_name,
        is_available: !hasConflicts,
        requested_start: startDate,
        requested_end: endDate,
        total_scheduled_hours: totalHours
      };

      if (hasConflicts) {
        availability.conflicts = {
          crew_id: crewId,
          crew_name: crew.crew_name,
          requested_start: startDate,
          requested_end: endDate,
          conflicting_assignments: assignments.map(a => ({
            assignment_id: a.id,
            job_id: a.job_id,
            job_number: a.jobs?.job_number || '',
            job_title: a.jobs?.title || '',
            scheduled_start: a.scheduled_start,
            scheduled_end: a.scheduled_end
          }))
        };
      }

      return this.success(availability);

    } catch (error) {
      return this.error('Failed to check crew availability', error);
    }
  }

  /**
   * Get crews by specialization
   */
  async getCrewsBySpecialization(
    companyId: string,
    specialization: string
  ): Promise<ServiceResponse<Crew[]>> {
    try {
      const { data, error } = await this.supabase
        .from('crews')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .contains('specializations', [specialization]);

      if (error) {
        return this.error('Failed to fetch crews', error);
      }

      return this.success(data || []);

    } catch (error) {
      return this.error('Failed to fetch crews by specialization', error);
    }
  }

  // HELPER METHODS

  private async generateCrewCode(companyId: string): Promise<string> {
    const { count } = await this.supabase
      .from('crews')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const nextNumber = (count || 0) + 1;
    return `CREW-${String(nextNumber).padStart(2, '0')}`;
  }

  private calculateAverageSkillLevel(members: any[]): number {
    if (!members.length) return 0;
    const total = members.reduce((sum, m) => sum + (m.skill_level || 0), 0);
    return Math.round((total / members.length) * 10) / 10;
  }

  private success<T>(data: T): ServiceResponse<T> {
    return { success: true, data };
  }

  private error(message: string, error?: any): ServiceResponse<never> {
    console.error(`CrewService: ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const crewService = new CrewService();
```

### 3. ScheduleService

**File:** `src/services/ScheduleService.ts`

```typescript
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
      // Check for conflicts
      const conflicts = await this.checkScheduleConflicts(
        input.crew_id,
        input.scheduled_start,
        input.scheduled_end
      );

      if (!conflicts.success || conflicts.data?.length) {
        return this.error('Crew has scheduling conflicts');
      }

      // Create assignment
      const { data, error } = await this.supabase
        .from('job_assignments')
        .insert({
          ...input,
          status: 'scheduled',
          completion_percentage: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return this.error('Failed to create assignment', error);
      }

      // Update job status if needed
      await this.updateJobStatusFromAssignment(input.job_id);

      return this.success(data);

    } catch (error) {
      return this.error('Failed to create assignment', error);
    }
  }

  /**
   * Get schedule events for calendar display
   */
  async getSchedule(
    companyId: string,
    dateRange: { start: string; end: string },
    filters: ScheduleFilters = {}
  ): Promise<ServiceResponse<ScheduleEvent[]>> {
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
            customer_id,
            customers (customer_name)
          )
        `)
        .eq('crew.company_id', companyId)
        .gte('scheduled_end', dateRange.start)
        .lte('scheduled_start', dateRange.end);

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
        color: assignment.crew?.color_code,
        customer_name: assignment.job?.customers?.customer_name || 'Unknown',
        service_address: assignment.job?.service_address,
        completion_percentage: assignment.completion_percentage || 0
      }));

      return this.success(events);

    } catch (error) {
      return this.error('Failed to fetch schedule', error);
    }
  }

  /**
   * Check for scheduling conflicts
   */
  async checkScheduleConflicts(
    crewId: string,
    startDate: string,
    endDate: string
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
      const { data: conflicts } = await this.supabase
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

    } catch (error) {
      return this.error('Failed to check conflicts', error);
    }
  }

  /**
   * Reschedule an assignment
   */
  async rescheduleAssignment(
    assignmentId: string,
    newStart: string,
    newEnd: string
  ): Promise<ServiceResponse<JobAssignment>> {
    try {
      // Get assignment details
      const { data: assignment } = await this.supabase
        .from('job_assignments')
        .select('crew_id, job_id')
        .eq('id', assignmentId)
        .single();

      if (!assignment) {
        return this.error('Assignment not found');
      }

      // Check for conflicts (excluding current assignment)
      const { data: conflicts } = await this.supabase
        .from('job_assignments')
        .select('id')
        .eq('crew_id', assignment.crew_id)
        .neq('id', assignmentId)
        .in('status', ['scheduled', 'in_progress'])
        .or(
          `and(scheduled_start.lt.${newEnd},scheduled_end.gt.${newStart})`
        );

      if (conflicts && conflicts.length > 0) {
        return this.error('Rescheduling would create conflicts');
      }

      // Update assignment
      const { data, error } = await this.supabase
        .from('job_assignments')
        .update({
          scheduled_start: newStart,
          scheduled_end: newEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) {
        return this.error('Failed to reschedule', error);
      }

      return this.success(data);

    } catch (error) {
      return this.error('Failed to reschedule assignment', error);
    }
  }

  /**
   * AI INTEGRATION PLACEHOLDER
   * Get optimal schedule recommendations
   */
  async getOptimalSchedule(
    jobs: Array<{ id: string; estimated_hours: number; priority: number }>,
    crews: Array<{ id: string; specializations: string[]; capacity: number }>
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

      const recommendations = jobs.map(job => ({
        job_id: job.id,
        crew_id: crews[0]?.id || '',
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 86400000).toISOString(),
        confidence: 0.85,
        reasoning: 'Based on crew availability and job priority'
      }));

      return this.success({ recommendations });

    } catch (error) {
      return this.error('Failed to generate optimal schedule', error);
    }
  }

  // HELPER METHODS

  private async updateJobStatusFromAssignment(jobId: string): Promise<void> {
    // Check if all assignments are scheduled
    const { data: assignments } = await this.supabase
      .from('job_assignments')
      .select('status')
      .eq('job_id', jobId);

    if (assignments?.some(a => a.status === 'in_progress')) {
      await this.supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', jobId);
    } else if (assignments?.length && assignments.every(a => a.status === 'completed')) {
      await this.supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', jobId);
    } else if (assignments?.length) {
      await this.supabase
        .from('jobs')
        .update({ status: 'scheduled' })
        .eq('id', jobId);
    }
  }

  private success<T>(data: T): ServiceResponse<T> {
    return { success: true, data };
  }

  private error(message: string, error?: any): ServiceResponse<never> {
    console.error(`ScheduleService: ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const scheduleService = new ScheduleService();
```

### 4. DashboardService

**File:** `src/services/DashboardService.ts`

```typescript
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
      // Get job metrics by status
      const jobMetrics = await this.getJobsByStatus(companyId);

      // Get revenue metrics
      const revenue = await this.getRevenueMetrics(companyId, dateRange);

      // Get crew utilization
      const utilization = await this.getCrewUtilization(companyId);

      // Get last refresh time
      const { data: refreshData } = await this.supabase
        .rpc('get_job_metrics_last_refresh', { p_company_id: companyId });

      const metrics: DashboardMetrics = {
        company_id: companyId,
        job_metrics_by_status: jobMetrics.data || [],
        revenue: revenue.data!,
        crew_utilization: utilization.data!,
        last_refreshed: refreshData?.[0]?.last_refreshed || new Date().toISOString()
      };

      return this.success(metrics);

    } catch (error) {
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
      // Query job_metrics materialized view
      const { data, error } = await this.supabase
        .from('job_metrics')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
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

      // Aggregate metrics
      (data || []).forEach(job => {
        const metrics = statusGroups.get(job.status)!;
        metrics.job_count++;
        metrics.total_estimated += job.estimated_total || 0;
        metrics.total_actual += job.actual_total || 0;
        if (job.priority >= 7) metrics.high_priority_count++;
        if (job.is_overdue) metrics.overdue_count++;
      });

      // Calculate averages
      statusGroups.forEach(metrics => {
        if (metrics.job_count > 0) {
          metrics.avg_estimated = metrics.total_estimated / metrics.job_count;
          metrics.avg_actual = metrics.total_actual / metrics.job_count;
        }
      });

      return this.success(Array.from(statusGroups.values()));

    } catch (error) {
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

      // Current period (last 30 days)
      const { data: current } = await this.supabase
        .from('jobs')
        .select('estimated_total, actual_total, status')
        .eq('company_id', companyId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .in('status', ['completed', 'invoiced']);

      // Previous period (30-60 days ago)
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
        (sum, job) => sum + (job.actual_total || job.estimated_total || 0), 0
      ) || 0;

      const previousRevenue = previous?.reduce(
        (sum, job) => sum + (job.actual_total || job.estimated_total || 0), 0
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
        average_days_to_close: 7 // TODO: Calculate actual cycle time
      };

      return this.success(metrics);

    } catch (error) {
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
      const { data: crews, count: totalCrews } = await this.supabase
        .from('crews')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      const activeCrews = crews?.filter(c => c.is_active).length || 0;

      // Get assignments in progress
      const { data: assignments } = await this.supabase
        .from('job_assignments')
        .select(`
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
        (sum, a) => sum + (a.actual_hours || 0), 0
      ) || 0;

      // Calculate capacity
      const crewsWithAssignments = new Set(assignments?.map(a => a.crew_id));
      const crewsAtCapacity = 0; // TODO: Define capacity rules

      const utilization: CrewUtilization = {
        total_crews: totalCrews || 0,
        active_crews: activeCrews,
        avg_completion_percentage: Math.round(avgCompletion),
        total_hours_worked: totalHours,
        assignments_in_progress: assignmentsInProgress,
        crews_at_capacity: crewsAtCapacity,
        crews_available: activeCrews - crewsWithAssignments.size
      };

      return this.success(utilization);

    } catch (error) {
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
      // This is a simplified implementation

      const { data: recentJobs } = await this.supabase
        .from('jobs')
        .select('id, job_number, title, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const activities = (recentJobs || []).map(job => ({
        id: job.id,
        type: 'job_created' as const,
        title: `New Job: ${job.job_number}`,
        description: job.title,
        timestamp: job.created_at,
        metadata: { job_id: job.id }
      }));

      return this.success(activities);

    } catch (error) {
      return this.error('Failed to fetch recent activity', error);
    }
  }

  /**
   * Refresh materialized views
   */
  async refreshMetrics(companyId: string): Promise<ServiceResponse<void>> {
    try {
      // Call database function to refresh materialized view
      const { error } = await this.supabase
        .rpc('refresh_job_metrics', { p_company_id: companyId });

      if (error) {
        return this.error('Failed to refresh metrics', error);
      }

      return this.success(undefined);

    } catch (error) {
      return this.error('Failed to refresh metrics', error);
    }
  }

  // HELPER METHODS

  private success<T>(data: T): ServiceResponse<T> {
    return { success: true, data };
  }

  private error(message: string, error?: any): ServiceResponse<never> {
    console.error(`DashboardService: ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
```

### 5. JobNotesService

**File:** `src/services/JobNotesService.ts`

```typescript
import { getSupabase } from './supabase';
import {
  JobNote,
  CreateJobNoteInput,
  UpdateJobNoteInput,
  NoteCategory,
  AIInsightData
} from '../types/crm';
import { ServiceResponse } from '../types/customer';

export class JobNotesService {
  private supabase = getSupabase();

  /**
   * Create a new job note
   */
  async createNote(
    jobId: string,
    input: CreateJobNoteInput
  ): Promise<ServiceResponse<JobNote>> {
    try {
      if (!input.content?.trim()) {
        return this.error('Note content is required');
      }

      const { data, error } = await this.supabase
        .from('job_notes')
        .insert({
          job_id: jobId,
          note_type: input.note_type || 'general',
          subject: input.subject,
          content: input.content,
          is_ai_generated: input.is_ai_generated || false,
          ai_confidence_score: input.ai_confidence_score,
          ai_model_version: input.ai_model_version,
          ai_metadata: input.ai_metadata || {},
          is_internal: input.is_internal || false,
          is_pinned: input.is_pinned || false,
          attachments: input.attachments || [],
          related_service_ids: input.related_service_ids || [],
          metadata: input.metadata,
          created_by_user_id: input.created_by_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return this.error('Failed to create note', error);
      }

      return this.success(data);

    } catch (error) {
      return this.error('Failed to create note', error);
    }
  }

  /**
   * Get all notes for a job
   */
  async getNotes(
    jobId: string,
    companyId: string
  ): Promise<ServiceResponse<JobNote[]>> {
    try {
      // Verify job belongs to company
      const { data: job } = await this.supabase
        .from('jobs')
        .select('company_id')
        .eq('id', jobId)
        .single();

      if (!job || job.company_id !== companyId) {
        return this.error('Job not found');
      }

      // Get notes
      const { data, error } = await this.supabase
        .from('job_notes')
        .select('*')
        .eq('job_id', jobId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        return this.error('Failed to fetch notes', error);
      }

      return this.success(data || []);

    } catch (error) {
      return this.error('Failed to fetch notes', error);
    }
  }

  /**
   * AI INTEGRATION POINT
   * Create an AI-generated insight note
   */
  async createAIInsight(
    jobId: string,
    insight: {
      content: string;
      insight_type: 'recommendation' | 'warning' | 'optimization' | 'prediction';
      confidence: number;
      recommendations?: string[];
      data_sources?: string[];
    }
  ): Promise<ServiceResponse<JobNote>> {
    try {
      const aiMetadata: AIInsightData = {
        model: 'gpt-4', // TODO: Get from AI engine
        version: '1.0.0',
        confidence: insight.confidence,
        insight_type: insight.insight_type,
        recommendations: insight.recommendations,
        data_sources: insight.data_sources,
        analyzed_at: new Date().toISOString(),
        analysis_duration_ms: 0 // TODO: Track actual duration
      };

      const noteInput: CreateJobNoteInput = {
        job_id: jobId,
        note_type: 'ai_insight',
        subject: `AI ${insight.insight_type}: Job Analysis`,
        content: insight.content,
        is_ai_generated: true,
        ai_confidence_score: insight.confidence,
        ai_model_version: '1.0.0',
        ai_metadata: aiMetadata,
        is_internal: false,
        is_pinned: insight.confidence > 0.8, // Pin high-confidence insights
        created_by_user_id: 'system' // TODO: Use AI service user
      };

      return this.createNote(jobId, noteInput);

    } catch (error) {
      return this.error('Failed to create AI insight', error);
    }
  }

  /**
   * Pin or unpin a note
   */
  async pinNote(
    noteId: string,
    isPinned: boolean
  ): Promise<ServiceResponse<JobNote>> {
    try {
      const { data, error } = await this.supabase
        .from('job_notes')
        .update({
          is_pinned: isPinned,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        return this.error('Failed to update note', error);
      }

      return this.success(data);

    } catch (error) {
      return this.error('Failed to pin note', error);
    }
  }

  // HELPER METHODS

  private success<T>(data: T): ServiceResponse<T> {
    return { success: true, data };
  }

  private error(message: string, error?: any): ServiceResponse<never> {
    console.error(`JobNotesService: ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const jobNotesService = new JobNotesService();
```

---

## Integration Points

### Pricing Engine Integration

```typescript
// In JobService.calculateJobEstimate() and addServiceToJob()

import { masterPricingEngine } from '../pricing-system/core/calculations/master-pricing-engine';

// Calculate service pricing
const calculation = await masterPricingEngine.calculateService(
  serviceConfigId,
  {
    sqft: 500,
    complexity: 'medium',
    obstacles: ['trees', 'slopes'],
    // ... other pricing variables
  }
);

// Store calculation result
const calculationData: ServiceCalculationData = {
  tier1Results: calculation.tier1Results,
  tier2Results: calculation.tier2Results,
  sqft: calculation.sqft,
  inputValues: calculation.inputValues,
  confidence: calculation.confidence,
  calculationDate: calculation.calculationDate
};
```

### AI Engine Integration (Placeholder)

```typescript
// In ScheduleService.getOptimalSchedule()

// TODO: Replace with actual AI engine call
const aiSchedule = await aiEngine.optimizeSchedule({
  jobs: jobsToSchedule,
  crews: availableCrews,
  constraints: {
    workingHours: { start: '08:00', end: '17:00' },
    maxDailyHours: 8,
    travelTime: true
  },
  optimization: {
    minimizeTravelTime: true,
    balanceCrewLoad: true,
    prioritizeHighValueJobs: true
  }
});

// In JobNotesService.createAIInsight()

// TODO: Replace with actual AI engine call
const insight = await aiEngine.analyzeJob({
  jobData: job,
  historicalData: similarJobs,
  analysisType: 'risk_assessment'
});
```

---

## Data Flow

### Job Creation Flow
```
User Input → JobService.createJob()
  ├→ Generate job number
  ├→ Validate customer
  ├→ Create job record
  ├→ For each service:
  │   ├→ Call pricing engine
  │   ├→ Store calculation
  │   └→ Create job_service record
  └→ Return job with services
```

### Schedule Assignment Flow
```
Assignment Request → ScheduleService.createAssignment()
  ├→ Check crew availability
  ├→ Check for conflicts
  ├→ Create assignment
  ├→ Update job status
  └→ Return assignment
```

### Dashboard Metrics Flow
```
Dashboard Request → DashboardService.getDashboardMetrics()
  ├→ Query job_metrics view
  ├→ Calculate revenue metrics
  ├→ Calculate crew utilization
  ├→ Get recent activity
  └→ Return aggregated metrics
```

---

## Error Handling

### Standard Error Response Pattern

```typescript
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

// Success response
return { success: true, data: result };

// Error response
return {
  success: false,
  error: 'User-friendly error message',
  details: technicalError
};
```

### Error Categories

1. **Validation Errors** - Missing or invalid input
2. **Authorization Errors** - Company access violations
3. **Conflict Errors** - Scheduling conflicts, duplicate entries
4. **Not Found Errors** - Resource doesn't exist
5. **Database Errors** - Query failures, constraint violations
6. **Integration Errors** - External service failures

---

## Security & Multi-tenancy

### Multi-tenant Isolation

```typescript
// Every query MUST include company_id filter
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('company_id', companyId);  // Required

// Validate company access
if (job.company_id !== user.company_id) {
  throw new Error('Unauthorized');
}
```

### Row-Level Security (RLS)

```sql
-- All tables have RLS policies
CREATE POLICY "Users can only see their company's data"
  ON jobs FOR ALL
  USING (company_id = auth.jwt() ->> 'company_id');
```

---

## Implementation Guidelines

### 1. Service Implementation Order

1. **JobService** - Core functionality, pricing integration
2. **CrewService** - Team management
3. **ScheduleService** - Assignment and calendar
4. **DashboardService** - Metrics and reporting
5. **JobNotesService** - Notes and AI insights

### 2. Testing Strategy

```typescript
// Unit test example
describe('JobService', () => {
  it('should create job with valid input', async () => {
    const input = { /* ... */ };
    const result = await jobService.createJob(input);
    expect(result.success).toBe(true);
    expect(result.data?.job_number).toMatch(/JOB-\d{4}-\d{3}/);
  });

  it('should reject invalid status transitions', async () => {
    const result = await jobService.updateJobStatus(
      jobId,
      companyId,
      'invoiced' // From 'quote' - invalid
    );
    expect(result.success).toBe(false);
  });
});
```

### 3. Performance Considerations

- Use materialized views for dashboard metrics
- Implement pagination for all list endpoints
- Cache pricing calculations in job_services.calculation_data
- Use database indexes on foreign keys and filter columns
- Batch operations where possible

### 4. Monitoring & Logging

```typescript
// Consistent logging pattern
console.error(`${ServiceName}: ${operation} failed:`, error);
console.log(`${ServiceName}: ${operation} completed:`, result.id);

// Performance tracking
const startTime = Date.now();
// ... operation ...
console.log(`Operation took ${Date.now() - startTime}ms`);
```

---

## Next Steps

1. Implement services in the specified order
2. Create unit tests for each service
3. Integrate pricing engine calculations
4. Add AI engine placeholders with TODO comments
5. Create API endpoints for each service
6. Implement real-time subscriptions for updates
7. Add performance monitoring and metrics
8. Document API endpoints for frontend team

---

## Appendix: Example Usage

### Creating a Job with Services

```typescript
// Create job with pricing calculation
const jobResult = await jobService.createJob({
  company_id: user.company_id,
  customer_id: 'customer-123',
  title: 'Paver Patio Installation',
  description: 'Install 500 sqft paver patio with retaining wall',
  service_address: '123 Main St',
  service_city: 'Springfield',
  service_state: 'IL',
  service_zip: '62701',
  requested_start_date: '2025-02-01',
  priority: 5,
  tags: ['patio', 'outdoor'],
  created_by_user_id: user.id
});

if (jobResult.success) {
  // Add services with pricing
  const serviceResult = await jobService.addServiceToJob(
    jobResult.data.id,
    {
      service_config_id: 'paver-patio-config',
      service_name: 'Paver Patio Installation',
      quantity: 1,
      pricing_variables: {
        sqft: 500,
        complexity: 'medium',
        sealerUpgrade: true
      },
      unit_price: 25.50,
      total_price: 12750,
      added_by_user_id: user.id
    }
  );
}
```

### Scheduling a Crew

```typescript
// Check availability
const availability = await crewService.getCrewAvailability(
  'crew-123',
  '2025-02-01T08:00:00Z',
  '2025-02-03T17:00:00Z'
);

if (availability.data?.is_available) {
  // Create assignment
  const assignment = await scheduleService.createAssignment({
    job_id: 'job-123',
    crew_id: 'crew-123',
    scheduled_start: '2025-02-01T08:00:00Z',
    scheduled_end: '2025-02-03T17:00:00Z',
    work_description: 'Patio installation - Day 1-3',
    estimated_hours: 24,
    assigned_by_user_id: user.id
  });
}
```

### Getting Dashboard Metrics

```typescript
// Fetch dashboard data
const metrics = await dashboardService.getDashboardMetrics(
  user.company_id,
  {
    start: '2025-01-01',
    end: '2025-01-31'
  }
);

if (metrics.success) {
  console.log('Revenue this period:', metrics.data.revenue.current_period_revenue);
  console.log('Jobs by status:', metrics.data.job_metrics_by_status);
  console.log('Crew utilization:', metrics.data.crew_utilization);
}
```

---

**End of Architecture Document**

This comprehensive architecture provides a solid foundation for implementing the CRM service layer with clear patterns, integration points, and guidelines for the typescript-pro agent to follow.