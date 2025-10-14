/**
 * Customer Management Type Definitions
 *
 * Unified type system for customer data across all services.
 * These types align with the Phase 3A enhanced database schema.
 */

import { Database } from './supabase';

// Database table types
type CustomersTable = Database['public']['Tables']['customers'];
type VCUsageTable = Database['public']['Tables']['VC Usage'];

/**
 * Core customer profile with all Phase 3A enhancements
 */
export interface CustomerProfile {
  // Core fields (from customers table)
  id: string;
  company_id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_notes?: string | null;

  // Phase 3A new fields
  deleted_at?: string | null;
  merged_into_customer_id?: string | null;
  status: 'active' | 'inactive' | 'merged' | 'deleted';
  lifecycle_stage: 'prospect' | 'lead' | 'customer' | 'churned';
  lifecycle_updated_at?: string | null;
  tags?: string[] | null;
  source: 'chat' | 'manual' | 'import';
  source_campaign?: string | null;
  metadata?: Record<string, any> | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  created_by_user_name?: string | null;
}

/**
 * Customer with enriched metrics from materialized view
 */
export interface CustomerWithMetrics extends CustomerProfile {
  // Metrics from customer_metrics view
  total_conversations: number;
  total_interactions: number;
  total_views: number;
  first_interaction_at?: string | null;
  last_interaction_at?: string | null;
  average_interaction_length?: number | null;
  last_viewed_at?: string | null;
  view_count: number;
}

/**
 * Search filters for customer queries
 */
export interface CustomerSearchFilters {
  searchQuery?: string;
  lifecycle_stage?: Array<'prospect' | 'lead' | 'customer' | 'churned'>;
  tags?: string[];
  source?: Array<'chat' | 'manual' | 'import'>;
  has_email?: boolean;
  has_phone?: boolean;
  has_address?: boolean;
  date_range?: { start: string; end: string };
  include_deleted?: boolean; // Admin only
  include_merged?: boolean; // Show merged customers
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'last_interaction_at' | 'total_conversations';
  sort_order?: 'asc' | 'desc';
}

/**
 * Customer conversation from VC Usage table
 */
export interface CustomerConversation {
  id: string;
  session_id: string;
  customer_id?: string | null; // FK to customers table
  user_input?: string | null;
  ai_response?: string | null;
  interaction_number: number;
  interaction_summary?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/**
 * Customer conversation summary
 */
export interface ConversationSummary {
  customer_id: string;
  session_id: string;
  conversation_summary: string;
  topics_discussed: string[];
  interaction_count: number;
  first_interaction_at: string;
  last_interaction_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Customer merge preview showing what will happen
 */
export interface CustomerMergePreview {
  source_customer: CustomerProfile;
  target_customer: CustomerProfile;
  merged_result: CustomerProfile;
  field_conflicts: Array<{
    field: string;
    source_value: any;
    target_value: any;
    resolution: 'keep_source' | 'keep_target' | 'combine';
  }>;
  conversations_to_transfer: number;
  events_to_transfer: number;
  tags_to_merge: string[];
}

/**
 * Result of a customer merge operation
 */
export interface CustomerMergeResult {
  success: boolean;
  merged_customer: CustomerProfile;
  merge_log_id: string;
  conversations_transferred: number;
  events_transferred: number;
  error?: string;
}

/**
 * Customer event for timeline/activity tracking
 */
export interface CustomerEvent {
  id: string;
  customer_id: string;
  event_type: 'created' | 'updated' | 'stage_changed' | 'tags_added' | 'tags_removed' | 'merged' | 'deleted' | 'restored';
  event_data: Record<string, any>;
  created_at: string;
  created_by_user_id?: string | null;
  created_by_user_name?: string | null;
}

/**
 * Customer timeline with all events
 */
export interface CustomerTimeline {
  customer_id: string;
  events: CustomerEvent[];
  conversation_summaries: ConversationSummary[];
  total_events: number;
  date_range: {
    start: string;
    end: string;
  };
}

/**
 * Customer sync result from chat
 */
export interface CustomerSyncResult {
  success: boolean;
  customer?: CustomerProfile;
  action: 'created' | 'updated' | 'found_existing' | 'error';
  customer_id?: string;
  matched_by?: 'email' | 'phone' | 'name';
  confidence?: number; // 0-100 matching confidence
  error?: string;
}

/**
 * Customer enrichment result
 */
export interface CustomerEnrichmentResult {
  customer_id: string;
  fields_updated: string[];
  conversations_processed: number;
  new_tags_added: string[];
  notes_appended: boolean;
  contact_info_extracted: {
    email?: string;
    phone?: string;
    address?: string;
  };
  topics_identified: string[];
  enrichment_date: string;
}

/**
 * Duplicate customer detection result
 */
export interface DuplicateCustomer {
  customer: CustomerProfile;
  match_confidence: number; // 0-100
  matched_fields: Array<'email' | 'phone' | 'name'>;
  similarity_score: number; // For fuzzy name matching
}

/**
 * Group of duplicate customers
 */
export interface DuplicateGroup {
  master_customer: CustomerProfile;
  duplicates: DuplicateCustomer[];
  recommended_action: 'merge' | 'review' | 'keep_separate';
  total_conversations: number;
  total_interactions: number;
}

/**
 * Customer matching key for duplicate detection
 */
export interface CustomerMatchingKey {
  id: string;
  customer_id: string;
  key_type: 'email' | 'phone' | 'name';
  key_value: string; // Original value
  normalized_value: string; // Normalized for matching
  created_at: string;
  updated_at: string;
}

/**
 * Customer audit log entry
 */
export interface CustomerAuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  changed_fields?: string[];
  changed_by_user_id?: string | null;
  changed_by_user_name?: string | null;
  changed_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
}

/**
 * Customer list item (optimized for display)
 */
export interface CustomerListItem {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  lifecycle_stage: 'prospect' | 'lead' | 'customer' | 'churned';
  tags?: string[] | null;
  source: 'chat' | 'manual' | 'import';
  last_interaction_at?: string | null;
  total_conversations: number;
  view_count: number;
  created_at: string;
  is_recently_viewed: boolean;
  has_active_quote?: boolean;
}

/**
 * Create customer input
 */
export interface CreateCustomerInput {
  company_id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_notes?: string | null;
  lifecycle_stage?: 'prospect' | 'lead' | 'customer' | 'churned';
  tags?: string[];
  source?: 'chat' | 'manual' | 'import';
  source_campaign?: string | null;
  metadata?: Record<string, any>;
  created_by_user_id: string;
  created_by_user_name?: string | null;
}

/**
 * Update customer input
 */
export interface UpdateCustomerInput {
  customer_name?: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_notes?: string | null;
  lifecycle_stage?: 'prospect' | 'lead' | 'customer' | 'churned';
  tags?: string[];
  status?: 'active' | 'inactive';
  metadata?: Record<string, any>;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult<T = any> {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
}

/**
 * Customer import from CSV
 */
export interface CustomerImportRow {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_notes?: string;
  tags?: string; // Comma-separated
  lifecycle_stage?: string;
}

/**
 * Customer export format
 */
export interface CustomerExportRow extends CustomerImportRow {
  id: string;
  created_at: string;
  updated_at: string;
  source: string;
  total_conversations: number;
  last_interaction_at?: string;
}

/**
 * Repository error types
 */
export class RepositoryError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DuplicateError extends Error {
  constructor(message: string, public duplicates?: CustomerProfile[]) {
    super(message);
    this.name = 'DuplicateError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Service response types
 */
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Field mapping for conflict resolution
 */
export type FieldResolution = 'keep_source' | 'keep_target' | 'combine' | 'manual';

/**
 * Customer field names for type safety
 */
export type CustomerFieldName = keyof CustomerProfile;

/**
 * Updatable customer fields
 */
export type UpdatableCustomerFields = keyof UpdateCustomerInput;

// Export type guards
export const isCustomerProfile = (obj: any): obj is CustomerProfile => {
  return obj && typeof obj.id === 'string' && typeof obj.customer_name === 'string';
};

export const isCustomerWithMetrics = (obj: any): obj is CustomerWithMetrics => {
  return isCustomerProfile(obj) && typeof obj.total_conversations === 'number';
};

// Export utility functions
export const getCustomerDisplayName = (customer: CustomerProfile): string => {
  return customer.customer_name || 'Unknown Customer';
};

export const getCustomerInitials = (customer: CustomerProfile): string => {
  const name = customer.customer_name || '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const formatLifecycleStage = (stage: string): string => {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
};