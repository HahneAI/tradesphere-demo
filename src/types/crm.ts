/**
 * CRM System Type Definitions
 *
 * Comprehensive type system for Jobs, Schedules, and Crews.
 * Integrates with Supabase database schema and existing pricing system.
 *
 * @module crm
 */

import { Database } from './supabase';
import { CustomerProfile } from './customer';
import { ServiceResponse, PaginatedResponse, BulkOperationResult } from './customer';
import { PaverPatioCalculationResult } from '../pricing-system/core/master-formula/formula-types';

// ============================================================================
// Database Table Types (from Supabase)
// ============================================================================

type JobsTable = Database['public']['Tables']['jobs'];
type JobServicesTable = Database['public']['Tables']['job_services'];
type CrewsTable = Database['public']['Tables']['crews'];
type CrewMembersTable = Database['public']['Tables']['crew_members'];
type JobAssignmentsTable = Database['public']['Tables']['job_assignments'];
type JobNotesTable = Database['public']['Tables']['job_notes'];

// ============================================================================
// Enums and Union Types
// ============================================================================

/**
 * Job lifecycle status
 * Represents the current stage of a job from quote to invoiced
 */
export type JobStatus =
  | 'quote'          // Initial quote/estimate stage
  | 'approved'       // Customer approved the quote
  | 'scheduled'      // Job scheduled but not started
  | 'in_progress'    // Work currently being performed
  | 'completed'      // Work finished, awaiting invoice
  | 'invoiced'       // Invoice sent to customer
  | 'cancelled';     // Job cancelled

/**
 * Job priority levels (0-10 scale)
 * Maps to database priority integer field
 */
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Assignment status for crew assignments
 * Tracks the status of a crew's work on a job
 */
export type AssignmentStatus =
  | 'scheduled'      // Crew scheduled for future work
  | 'in_progress'    // Crew actively working
  | 'completed'      // Crew finished their assignment
  | 'cancelled';     // Assignment cancelled

/**
 * Crew member role within a crew
 */
export type CrewRole = 'lead' | 'member';

/**
 * Crew member skill level rating (1-5 scale)
 */
export type SkillLevel = 'junior' | 'intermediate' | 'senior' | 'expert' | 'master';

/**
 * Job note categories for organization
 */
export type NoteCategory =
  | 'general'              // General notes and updates
  | 'ai_insight'           // AI-generated insights
  | 'status_change'        // Job status change notes
  | 'customer_update'      // Customer communications
  | 'internal'             // Internal team notes
  | 'technical';           // Technical specifications

// ============================================================================
// Core Job Types
// ============================================================================

/**
 * Core job record with all CRM fields
 * Maps to jobs table in database
 */
export interface Job {
  // Primary identifiers
  id: string;
  company_id: string;
  customer_id: string;

  // Job details
  job_number: string;
  title: string;
  description?: string | null;

  // Status and lifecycle
  status: JobStatus;

  // Location information
  service_address?: string | null;
  service_city?: string | null;
  service_state?: string | null;
  service_zip?: string | null;
  service_location_notes?: string | null;

  // Scheduling
  requested_start_date?: string | null;      // ISO 8601 date
  scheduled_start_date?: string | null;      // ISO 8601 date
  scheduled_end_date?: string | null;        // ISO 8601 date
  actual_start_date?: string | null;         // ISO 8601 timestamp
  actual_end_date?: string | null;           // ISO 8601 timestamp

  // Financial tracking
  estimated_total?: number | null;           // Decimal(10,2)
  actual_total?: number | null;              // Decimal(10,2)
  labor_cost?: number | null;                // Decimal(10,2)
  material_cost?: number | null;             // Decimal(10,2)

  // Quote details
  quote_valid_until?: string | null;         // ISO 8601 date
  quote_sent_at?: string | null;             // ISO 8601 timestamp
  quote_approved_at?: string | null;         // ISO 8601 timestamp

  // Invoice details
  invoice_number?: string | null;
  invoiced_at?: string | null;               // ISO 8601 timestamp
  invoice_due_date?: string | null;          // ISO 8601 date
  paid_at?: string | null;                   // ISO 8601 timestamp

  // Priority and organization
  priority: number;                          // 0-10 scale (0=lowest, 10=highest)
  tags: string[];

  // Metadata
  metadata?: Record<string, any> | null;

  // Audit fields
  created_by_user_id: string;
  updated_by_user_id?: string | null;
  created_at: string;                        // ISO 8601 timestamp
  updated_at: string;                        // ISO 8601 timestamp
}

/**
 * Job with enriched customer and service details
 * Used for detailed job views and editing
 */
export interface JobWithDetails extends Job {
  // Customer information
  customer: CustomerProfile;

  // Service line items
  services: JobServiceWithPricing[];

  // Crew assignments
  assignments: JobAssignmentWithCrew[];

  // Recent notes
  notes?: JobNote[];

  // Computed fields
  total_services_count: number;
  total_assigned_crews: number;
  is_overdue: boolean;
  days_until_start?: number | null;
}

/**
 * Job list item optimized for table/list display
 * Minimal fields for performance in list views
 */
export interface JobListItem {
  id: string;
  job_number: string;
  title: string;
  status: JobStatus;
  priority: number;
  customer_id: string;
  customer_name: string;
  service_address?: string | null;
  scheduled_start_date?: string | null;
  estimated_total?: number | null;
  tags: string[];
  created_at: string;
  is_overdue: boolean;
  assigned_crews_count: number;
}

/**
 * Input for creating a new job
 */
export interface CreateJobInput {
  company_id: string;
  customer_id: string;
  title: string;
  description?: string | null;

  // Location
  service_address?: string | null;
  service_city?: string | null;
  service_state?: string | null;
  service_zip?: string | null;
  service_location_notes?: string | null;

  // Scheduling
  requested_start_date?: string | null;
  scheduled_start_date?: string | null;
  scheduled_end_date?: string | null;

  // Financial
  estimated_total?: number | null;
  labor_cost?: number | null;
  material_cost?: number | null;

  // Quote
  quote_valid_until?: string | null;

  // Priority and tags
  priority?: number;
  tags?: string[];

  // Services to add
  services?: CreateJobServiceInput[];

  // Metadata
  metadata?: Record<string, any>;

  // Audit
  created_by_user_id: string;
}

/**
 * Input for updating an existing job
 * All fields are optional
 */
export interface UpdateJobInput {
  title?: string;
  description?: string | null;
  status?: JobStatus;

  // Location
  service_address?: string | null;
  service_city?: string | null;
  service_state?: string | null;
  service_zip?: string | null;
  service_location_notes?: string | null;

  // Scheduling
  requested_start_date?: string | null;
  scheduled_start_date?: string | null;
  scheduled_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;

  // Financial
  estimated_total?: number | null;
  actual_total?: number | null;
  labor_cost?: number | null;
  material_cost?: number | null;

  // Quote
  quote_valid_until?: string | null;
  quote_sent_at?: string | null;
  quote_approved_at?: string | null;

  // Invoice
  invoice_number?: string | null;
  invoiced_at?: string | null;
  invoice_due_date?: string | null;
  paid_at?: string | null;

  // Priority and tags
  priority?: number;
  tags?: string[];

  // Metadata
  metadata?: Record<string, any>;

  // Audit
  updated_by_user_id?: string;
}

// ============================================================================
// Job Service Types
// ============================================================================

/**
 * Service line item within a job
 * Links jobs to services with pricing from pricing engine
 */
export interface JobService {
  id: string;
  job_id: string;
  service_config_id: string;

  // Service details (denormalized for performance)
  service_name: string;
  service_description?: string | null;

  // Quantity and pricing
  quantity: number;                          // Decimal(10,2)
  unit_price: number;                        // Decimal(10,2)
  total_price: number;                       // Decimal(10,2)

  // Pricing engine integration
  calculation_data: ServiceCalculationData;
  pricing_variables: Record<string, any>;

  // Service-specific notes
  notes?: string | null;

  // Execution tracking
  is_completed: boolean;
  completed_at?: string | null;             // ISO 8601 timestamp
  completed_by_user_id?: string | null;

  // Metadata
  metadata?: Record<string, any> | null;

  // Audit fields
  added_by_user_id: string;
  created_at: string;                        // ISO 8601 timestamp
  updated_at: string;                        // ISO 8601 timestamp
}

/**
 * Job service with full pricing calculation details
 * Includes expanded calculation data from pricing engine
 */
export interface JobServiceWithPricing extends JobService {
  // Expanded calculation details
  calculation_breakdown: string;
  labor_hours?: number | null;
  material_breakdown?: Record<string, any>;
  profit_margin?: number | null;
}

/**
 * Typed JSONB field for pricing calculation data
 * Stores complete result from pricing engine
 */
export interface ServiceCalculationData {
  // From PaverPatioCalculationResult or other service calculations
  tier1Results?: {
    baseHours: number;
    adjustedHours: number;
    totalManHours: number;
    totalDays: number;
    breakdown: string[];
  };
  tier2Results?: {
    laborCost: number;
    materialCostBase: number;
    materialWasteCost: number;
    totalMaterialCost: number;
    equipmentCost: number;
    obstacleCost: number;
    subtotal: number;
    profit: number;
    total: number;
    pricePerSqft: number;
  };
  breakdown?: string;
  sqft?: number;
  inputValues?: Record<string, any>;
  confidence?: number;
  calculationDate?: string;

  // Generic fields for other service types
  [key: string]: any;
}

/**
 * Input for creating a job service
 */
export interface CreateJobServiceInput {
  service_config_id: string;
  service_name: string;
  service_description?: string | null;
  quantity?: number;
  unit_price: number;
  total_price: number;
  calculation_data?: ServiceCalculationData;
  pricing_variables?: Record<string, any>;
  notes?: string | null;
  metadata?: Record<string, any>;
  added_by_user_id: string;
}

/**
 * Input for updating a job service
 */
export interface UpdateJobServiceInput {
  service_name?: string;
  service_description?: string | null;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  calculation_data?: ServiceCalculationData;
  pricing_variables?: Record<string, any>;
  notes?: string | null;
  is_completed?: boolean;
  completed_at?: string | null;
  completed_by_user_id?: string | null;
  metadata?: Record<string, any>;
}

// ============================================================================
// Crew Types
// ============================================================================

/**
 * Team/crew definition
 * Represents a team that can be assigned to jobs
 */
export interface Crew {
  id: string;
  company_id: string;

  // Crew details
  crew_name: string;
  crew_code?: string | null;               // Short identifier (e.g., "CREW-A")
  description?: string | null;

  // Crew lead
  crew_lead_user_id?: string | null;

  // Status
  is_active: boolean;

  // Capabilities
  specializations: string[];               // Service types this crew specializes in
  max_capacity: number;                    // Maximum number of members

  // Display
  color_code?: string | null;              // Hex color for calendar/UI

  // Metadata
  metadata?: Record<string, any> | null;

  // Audit fields
  created_by_user_id: string;
  created_at: string;                      // ISO 8601 timestamp
  updated_at: string;                      // ISO 8601 timestamp
}

/**
 * Crew with member details
 * Includes expanded member information
 */
export interface CrewWithMembers extends Crew {
  // Expanded crew lead information
  crew_lead?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
  } | null;

  // Crew members
  members: CrewMemberWithUser[];

  // Computed fields
  current_member_count: number;
  available_capacity: number;
  average_skill_level: number;
}

/**
 * User assigned to a crew
 */
export interface CrewMember {
  id: string;
  crew_id: string;
  user_id: string;

  // Role
  role: CrewRole;

  // Assignment details
  joined_at: string;                       // ISO 8601 timestamp
  left_at?: string | null;                 // ISO 8601 timestamp
  is_active: boolean;

  // Skills
  certifications: string[];
  skill_level: number;                     // 1-5 rating

  // Availability
  availability_notes?: string | null;

  // Audit fields
  added_by_user_id: string;
  created_at: string;                      // ISO 8601 timestamp
  updated_at: string;                      // ISO 8601 timestamp
}

/**
 * Crew member with expanded user details
 */
export interface CrewMemberWithUser extends CrewMember {
  // Expanded user information
  user: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    role: string;
  };
}

/**
 * Input for creating a crew
 */
export interface CreateCrewInput {
  company_id: string;
  crew_name: string;
  crew_code?: string | null;
  description?: string | null;
  crew_lead_user_id?: string | null;
  specializations?: string[];
  max_capacity?: number;
  color_code?: string | null;
  metadata?: Record<string, any>;
  created_by_user_id: string;
}

/**
 * Input for updating a crew
 */
export interface UpdateCrewInput {
  crew_name?: string;
  crew_code?: string | null;
  description?: string | null;
  crew_lead_user_id?: string | null;
  is_active?: boolean;
  specializations?: string[];
  max_capacity?: number;
  color_code?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Input for adding a member to a crew
 */
export interface AddCrewMemberInput {
  crew_id: string;
  user_id: string;
  role?: CrewRole;
  certifications?: string[];
  skill_level?: number;
  availability_notes?: string | null;
  added_by_user_id: string;
}

/**
 * Input for updating a crew member
 */
export interface UpdateCrewMemberInput {
  role?: CrewRole;
  certifications?: string[];
  skill_level?: number;
  is_active?: boolean;
  left_at?: string | null;
  availability_notes?: string | null;
}

// ============================================================================
// Schedule/Assignment Types
// ============================================================================

/**
 * Crew assignment to a job
 * Links crews to jobs with scheduling information
 */
export interface JobAssignment {
  id: string;
  job_id: string;
  crew_id: string;

  // Scheduling
  scheduled_start: string;                 // ISO 8601 timestamp
  scheduled_end: string;                   // ISO 8601 timestamp
  actual_start?: string | null;            // ISO 8601 timestamp
  actual_end?: string | null;              // ISO 8601 timestamp

  // Status
  status: AssignmentStatus;

  // Assignment details
  assignment_notes?: string | null;
  work_description?: string | null;

  // Progress tracking
  completion_percentage: number;           // 0-100
  completion_notes?: string | null;

  // Resource planning
  estimated_hours?: number | null;         // Decimal(5,2)
  actual_hours?: number | null;            // Decimal(5,2)

  // Metadata
  metadata?: Record<string, any> | null;

  // Audit fields
  assigned_by_user_id: string;
  completed_by_user_id?: string | null;
  created_at: string;                      // ISO 8601 timestamp
  updated_at: string;                      // ISO 8601 timestamp
}

/**
 * Job assignment with expanded crew and job details
 */
export interface JobAssignmentWithCrew extends JobAssignment {
  // Expanded crew information
  crew: {
    id: string;
    crew_name: string;
    crew_code?: string | null;
    color_code?: string | null;
    member_count: number;
  };

  // Expanded job information (for crew schedule views)
  job?: {
    id: string;
    job_number: string;
    title: string;
    customer_name: string;
    service_address?: string | null;
  };
}

/**
 * Calendar event representation for scheduling UI
 */
export interface ScheduleEvent {
  id: string;                              // Assignment ID
  job_id: string;
  crew_id: string;
  title: string;                           // Job title
  start: Date;
  end: Date;
  status: AssignmentStatus;
  color?: string | null;                   // From crew color_code
  customer_name: string;
  service_address?: string | null;
  completion_percentage: number;
}

/**
 * Schedule conflict detection result
 */
export interface ScheduleConflict {
  crew_id: string;
  crew_name: string;
  requested_start: string;
  requested_end: string;
  conflicting_assignments: Array<{
    assignment_id: string;
    job_id: string;
    job_number: string;
    job_title: string;
    scheduled_start: string;
    scheduled_end: string;
  }>;
}

/**
 * Crew availability check result
 */
export interface CrewAvailability {
  crew_id: string;
  crew_name: string;
  is_available: boolean;
  requested_start: string;
  requested_end: string;
  conflicts?: ScheduleConflict | null;
  total_scheduled_hours: number;           // During requested period
}

/**
 * Input for creating a job assignment
 */
export interface CreateJobAssignmentInput {
  job_id: string;
  crew_id: string;
  scheduled_start: string;
  scheduled_end: string;
  assignment_notes?: string | null;
  work_description?: string | null;
  estimated_hours?: number | null;
  metadata?: Record<string, any>;
  assigned_by_user_id: string;
}

/**
 * Input for updating a job assignment
 */
export interface UpdateJobAssignmentInput {
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string | null;
  actual_end?: string | null;
  status?: AssignmentStatus;
  assignment_notes?: string | null;
  work_description?: string | null;
  completion_percentage?: number;
  completion_notes?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  completed_by_user_id?: string | null;
  metadata?: Record<string, any>;
}

// ============================================================================
// Job Notes Types
// ============================================================================

/**
 * Note or update on a job
 * Chronological record of job updates and AI insights
 */
export interface JobNote {
  id: string;
  job_id: string;

  // Note content
  note_type: NoteCategory;
  subject?: string | null;
  content: string;

  // AI integration
  is_ai_generated: boolean;
  ai_confidence_score?: number | null;     // 0.00 to 1.00
  ai_model_version?: string | null;
  ai_metadata: AIInsightData;

  // Visibility
  is_internal: boolean;                    // Internal notes not shown to customers
  is_pinned: boolean;                      // Important notes pinned to top

  // Attachments and references
  attachments: AttachmentMetadata[];
  related_service_ids: string[];           // UUIDs of related job_services

  // Metadata
  metadata?: Record<string, any> | null;

  // Audit fields
  created_by_user_id: string;
  created_at: string;                      // ISO 8601 timestamp
  updated_at: string;                      // ISO 8601 timestamp
}

/**
 * AI-generated insight metadata
 * Typed structure for AI note metadata
 */
export interface AIInsightData {
  // AI model information
  model?: string;
  version?: string;
  confidence?: number;

  // Insight details
  insight_type?: 'recommendation' | 'warning' | 'optimization' | 'prediction';
  data_sources?: string[];                 // What data was analyzed
  recommendations?: string[];

  // Context
  analyzed_at?: string;
  analysis_duration_ms?: number;

  // Generic metadata
  [key: string]: any;
}

/**
 * Attachment metadata structure
 */
export interface AttachmentMetadata {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;                       // Bytes
  url: string;
  uploaded_at: string;
  uploaded_by_user_id: string;
}

/**
 * Input for creating a job note
 */
export interface CreateJobNoteInput {
  job_id: string;
  note_type?: NoteCategory;
  subject?: string | null;
  content: string;
  is_ai_generated?: boolean;
  ai_confidence_score?: number | null;
  ai_model_version?: string | null;
  ai_metadata?: AIInsightData;
  is_internal?: boolean;
  is_pinned?: boolean;
  attachments?: AttachmentMetadata[];
  related_service_ids?: string[];
  metadata?: Record<string, any>;
  created_by_user_id: string;
}

/**
 * Input for updating a job note
 */
export interface UpdateJobNoteInput {
  subject?: string | null;
  content?: string;
  note_type?: NoteCategory;
  is_internal?: boolean;
  is_pinned?: boolean;
  attachments?: AttachmentMetadata[];
  related_service_ids?: string[];
  metadata?: Record<string, any>;
}

// ============================================================================
// Dashboard & Metrics Types
// ============================================================================

/**
 * Dashboard KPI metrics
 * From job_metrics materialized view
 */
export interface DashboardMetrics {
  company_id: string;

  // Job statistics by status
  job_metrics_by_status: JobMetricsByStatus[];

  // Revenue metrics
  revenue: RevenueMetrics;

  // Crew utilization
  crew_utilization: CrewUtilization;

  // Refresh timestamp
  last_refreshed: string;                  // ISO 8601 timestamp
}

/**
 * Job metrics grouped by status
 */
export interface JobMetricsByStatus {
  status: JobStatus;
  job_count: number;
  total_estimated: number;
  total_actual: number;
  avg_estimated: number;
  avg_actual: number;
  unique_customers: number;
  high_priority_count: number;
  overdue_count: number;
}

/**
 * Revenue tracking metrics
 */
export interface RevenueMetrics {
  // Current period (30 days)
  current_period_revenue: number;
  current_period_jobs: number;

  // Previous period comparison
  previous_period_revenue: number;
  previous_period_jobs: number;
  revenue_growth_percentage: number;

  // Pipeline
  quoted_value: number;                    // Value of jobs in 'quote' status
  approved_value: number;                  // Value of jobs in 'approved' status
  outstanding_invoices: number;            // Value of unpaid invoices

  // Averages
  average_job_value: number;
  average_days_to_close: number;
}

/**
 * Crew utilization metrics
 */
export interface CrewUtilization {
  total_crews: number;
  active_crews: number;
  avg_completion_percentage: number;
  total_hours_worked: number;              // Last 30 days
  assignments_in_progress: number;
  crews_at_capacity: number;
  crews_available: number;
}

// ============================================================================
// Search & Filter Types
// ============================================================================

/**
 * Job search and filter parameters
 */
export interface JobSearchFilters {
  // Text search
  searchQuery?: string;                    // Search job_number, title, description

  // Status filters
  status?: JobStatus[];
  exclude_status?: JobStatus[];

  // Customer filter
  customer_id?: string;

  // Date range filters
  date_range?: {
    start: string;                         // ISO 8601 date
    end: string;                           // ISO 8601 date
    field: 'created_at' | 'scheduled_start_date' | 'scheduled_end_date' | 'actual_start_date';
  };

  // Crew filter
  crew_id?: string;                        // Show jobs assigned to specific crew

  // Priority filters
  priority?: number[];                     // Array of priority values (0-10)
  min_priority?: number;
  max_priority?: number;

  // Tags
  tags?: string[];                         // Jobs must have ALL these tags
  tags_any?: string[];                     // Jobs must have ANY of these tags

  // Financial filters
  min_estimated_total?: number;
  max_estimated_total?: number;

  // Overdue filter
  overdue_only?: boolean;
  due_within_days?: number;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'created_at' | 'scheduled_start_date' | 'priority' | 'estimated_total' | 'job_number';
  sort_order?: 'asc' | 'desc';
}

/**
 * Crew search and filter parameters
 */
export interface CrewSearchFilters {
  // Text search
  searchQuery?: string;                    // Search crew_name, crew_code, description

  // Status filter
  is_active?: boolean;

  // Specialization filter
  specializations?: string[];              // Crews with ANY of these specializations

  // Availability filter
  available_during?: {
    start: string;                         // ISO 8601 timestamp
    end: string;                           // ISO 8601 timestamp
  };

  // Capacity filter
  min_capacity?: number;
  max_capacity?: number;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'crew_name' | 'created_at' | 'max_capacity';
  sort_order?: 'asc' | 'desc';
}

/**
 * Schedule filtering parameters
 */
export interface ScheduleFilters {
  // Date range (required)
  date_range: {
    start: string;                         // ISO 8601 date
    end: string;                           // ISO 8601 date
  };

  // Crew filter
  crew_id?: string;
  crew_ids?: string[];                     // Multiple crews

  // Job filter
  job_id?: string;

  // Status filter
  status?: AssignmentStatus[];

  // Include completed assignments
  include_completed?: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard: Check if object is a Job
 */
export const isJob = (obj: any): obj is Job => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.job_number === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'string'
  );
};

/**
 * Type guard: Check if object is a JobWithDetails
 */
export const isJobWithDetails = (obj: any): obj is JobWithDetails => {
  return (
    isJob(obj) &&
    obj.customer &&
    typeof obj.customer === 'object' &&
    Array.isArray(obj.services)
  );
};

/**
 * Type guard: Check if object is a Crew
 */
export const isCrew = (obj: any): obj is Crew => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.crew_name === 'string' &&
    typeof obj.company_id === 'string'
  );
};

/**
 * Type guard: Check if object is a JobAssignment
 */
export const isJobAssignment = (obj: any): obj is JobAssignment => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.job_id === 'string' &&
    typeof obj.crew_id === 'string' &&
    typeof obj.status === 'string'
  );
};

/**
 * Type guard: Check if job status is active (not completed/cancelled)
 */
export const isActiveJobStatus = (status: JobStatus): boolean => {
  return !['completed', 'invoiced', 'cancelled'].includes(status);
};

/**
 * Type guard: Check if assignment status is active
 */
export const isActiveAssignmentStatus = (status: AssignmentStatus): boolean => {
  return ['scheduled', 'in_progress'].includes(status);
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display-friendly job status label
 */
export const getJobStatusLabel = (status: JobStatus): string => {
  const labels: Record<JobStatus, string> = {
    quote: 'Quote',
    approved: 'Approved',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    invoiced: 'Invoiced',
    cancelled: 'Cancelled',
  };
  return labels[status];
};

/**
 * Get color code for job status badge
 */
export const getJobStatusColor = (status: JobStatus): string => {
  const colors: Record<JobStatus, string> = {
    quote: 'yellow',
    approved: 'blue',
    scheduled: 'purple',
    in_progress: 'orange',
    completed: 'green',
    invoiced: 'teal',
    cancelled: 'gray',
  };
  return colors[status];
};

/**
 * Convert priority number (0-10) to label
 */
export const getPriorityLabel = (priority: number): JobPriority => {
  if (priority >= 8) return 'urgent';
  if (priority >= 5) return 'high';
  if (priority >= 2) return 'normal';
  return 'low';
};

/**
 * Convert priority label to number
 */
export const getPriorityNumber = (priority: JobPriority): number => {
  const map: Record<JobPriority, number> = {
    low: 1,
    normal: 3,
    high: 6,
    urgent: 9,
  };
  return map[priority];
};

/**
 * Get color code for priority badge
 */
export const getPriorityColor = (priority: number): string => {
  if (priority >= 8) return 'red';
  if (priority >= 5) return 'orange';
  if (priority >= 2) return 'blue';
  return 'gray';
};

/**
 * Format job number for display
 */
export const formatJobNumber = (jobNumber: string): string => {
  return jobNumber.toUpperCase();
};

/**
 * Get assignment status label
 */
export const getAssignmentStatusLabel = (status: AssignmentStatus): string => {
  const labels: Record<AssignmentStatus, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
};

/**
 * Get assignment status color
 */
export const getAssignmentStatusColor = (status: AssignmentStatus): string => {
  const colors: Record<AssignmentStatus, string> = {
    scheduled: 'blue',
    in_progress: 'orange',
    completed: 'green',
    cancelled: 'gray',
  };
  return colors[status];
};

/**
 * Convert skill level number (1-5) to label
 */
export const getSkillLevelLabel = (skillLevel: number): SkillLevel => {
  if (skillLevel >= 5) return 'master';
  if (skillLevel >= 4) return 'expert';
  if (skillLevel >= 3) return 'senior';
  if (skillLevel >= 2) return 'intermediate';
  return 'junior';
};

/**
 * Convert skill level label to number
 */
export const getSkillLevelNumber = (skillLevel: SkillLevel): number => {
  const map: Record<SkillLevel, number> = {
    junior: 1,
    intermediate: 2,
    senior: 3,
    expert: 4,
    master: 5,
  };
  return map[skillLevel];
};

/**
 * Check if job is overdue
 */
export const isJobOverdue = (job: Job | JobListItem): boolean => {
  if (!job.scheduled_end_date) return false;
  if (job.status === 'completed' || job.status === 'invoiced' || job.status === 'cancelled') {
    return false;
  }
  return new Date(job.scheduled_end_date) < new Date();
};

/**
 * Calculate days until job starts
 */
export const getDaysUntilStart = (job: Job | JobListItem): number | null => {
  if (!job.scheduled_start_date) return null;
  const start = new Date(job.scheduled_start_date);
  const now = new Date();
  const diffTime = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Format job service address for display
 */
export const formatServiceAddress = (job: Job | JobListItem): string => {
  const parts: string[] = [];
  if (job.service_address) parts.push(job.service_address);
  if (job.service_city) parts.push(job.service_city);
  if (job.service_state && job.service_zip) {
    parts.push(`${job.service_state} ${job.service_zip}`);
  } else if (job.service_state) {
    parts.push(job.service_state);
  }
  return parts.join(', ') || 'No address provided';
};

/**
 * Calculate completion percentage from assignment
 */
export const calculateAssignmentProgress = (assignment: JobAssignment): number => {
  if (assignment.status === 'completed') return 100;
  if (assignment.status === 'cancelled') return 0;
  return assignment.completion_percentage || 0;
};

/**
 * Calculate total job value from services
 */
export const calculateTotalFromServices = (services: JobService[]): number => {
  return services.reduce((total, service) => total + service.total_price, 0);
};

/**
 * Get note category icon
 */
export const getNoteCategoryIcon = (category: NoteCategory): string => {
  const icons: Record<NoteCategory, string> = {
    general: '📝',
    ai_insight: '🤖',
    status_change: '🔄',
    customer_update: '👤',
    internal: '🔒',
    technical: '⚙️',
  };
  return icons[category];
};

/**
 * Get note category label
 */
export const getNoteCategoryLabel = (category: NoteCategory): string => {
  const labels: Record<NoteCategory, string> = {
    general: 'General',
    ai_insight: 'AI Insight',
    status_change: 'Status Change',
    customer_update: 'Customer Update',
    internal: 'Internal',
    technical: 'Technical',
  };
  return labels[category];
};

/**
 * Format crew role label
 */
export const getCrewRoleLabel = (role: CrewRole): string => {
  return role === 'lead' ? 'Crew Lead' : 'Member';
};

/**
 * Check if schedule events overlap
 */
export const doEventsOverlap = (
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean => {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);
  return s1 < e2 && s2 < e1;
};

/**
 * Calculate business days between dates
 */
export const calculateBusinessDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

// ============================================================================
// Export all types and utilities
// ============================================================================

export type {
  // Re-export generic types from customer.ts
  ServiceResponse,
  PaginatedResponse,
  BulkOperationResult,
};
