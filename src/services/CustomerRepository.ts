/**
 * Customer Repository - Data Access Layer
 *
 * Single source of truth for all customer database operations.
 * Implements repository pattern with multi-tenancy, soft deletes,
 * and performance optimization using materialized views.
 */

import { getSupabase } from './supabase';
import {
  CustomerProfile,
  CustomerWithMetrics,
  CustomerSearchFilters,
  CustomerListItem,
  CreateCustomerInput,
  UpdateCustomerInput,
  PaginatedResponse,
  RepositoryError,
  NotFoundError,
  ValidationError,
  DuplicateError
} from '../types/customer';

export class CustomerRepository {
  private supabase = getSupabase();

  /**
   * Get paginated list of customers with metrics
   * Uses customer_metrics materialized view for 10x performance
   */
  async getCustomers(
    companyId: string,
    filters: CustomerSearchFilters = {}
  ): Promise<PaginatedResponse<CustomerListItem>> {
    try {
      // Start with base query using customer_metrics view
      // Use LEFT JOIN (no !inner) so customers without metrics still appear
      let query = this.supabase
        .from('customers')
        .select(`
          *,
          customer_metrics (
            total_conversations,
            total_interactions,
            total_views,
            first_interaction_at,
            last_interaction_at,
            view_count
          )
        `)
        .eq('company_id', companyId);

      // Apply soft delete filter (unless admin wants to see deleted)
      if (!filters.include_deleted) {
        query = query.is('deleted_at', null);
      }

      // Apply merged filter
      if (!filters.include_merged) {
        query = query.is('merged_into_customer_id', null);
      }

      // Apply search query
      if (filters.searchQuery?.trim()) {
        const search = filters.searchQuery.trim().toLowerCase();
        query = query.or(
          `customer_name.ilike.%${search}%,` +
          `customer_email.ilike.%${search}%,` +
          `customer_phone.ilike.%${search}%,` +
          `customer_address.ilike.%${search}%`
        );
      }

      // Apply lifecycle stage filter
      if (filters.lifecycle_stage?.length) {
        query = query.in('lifecycle_stage', filters.lifecycle_stage);
      }

      // Apply source filter
      if (filters.source?.length) {
        query = query.in('source', filters.source);
      }

      // Apply tags filter (contains any of the specified tags)
      if (filters.tags?.length) {
        query = query.contains('tags', filters.tags);
      }

      // Apply contact info filters
      if (filters.has_email === true) {
        query = query.not('customer_email', 'is', null);
      }
      if (filters.has_phone === true) {
        query = query.not('customer_phone', 'is', null);
      }
      if (filters.has_address === true) {
        query = query.not('customer_address', 'is', null);
      }

      // Apply date range filter
      if (filters.date_range) {
        if (filters.date_range.start) {
          query = query.gte('created_at', filters.date_range.start);
        }
        if (filters.date_range.end) {
          query = query.lte('created_at', filters.date_range.end);
        }
      }

      // Get total count for pagination
      const countQuery = query;
      const { count, error: countError } = await countQuery.select('*', { count: 'exact', head: true });

      if (countError) {
        throw new RepositoryError('Failed to count customers', countError);
      }

      // Apply sorting (only on customers table columns, not joined metrics)
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
        console.error('CustomerRepository: Error fetching customers:', error);
        throw new RepositoryError('Failed to fetch customers', error);
      }

      // Map to CustomerListItem
      const customers: CustomerListItem[] = (data || []).map(row => {
        const metrics = row.customer_metrics || {};
        const lastViewedAt = metrics.last_interaction_at;
        const daysSinceViewed = lastViewedAt
          ? Math.floor((Date.now() - new Date(lastViewedAt).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          id: row.id,
          customer_name: row.customer_name,
          customer_email: row.customer_email,
          customer_phone: row.customer_phone,
          customer_address: row.customer_address,
          lifecycle_stage: row.lifecycle_stage,
          tags: row.tags,
          source: row.source,
          last_interaction_at: metrics.last_interaction_at,
          total_conversations: metrics.total_conversations || 0,
          view_count: metrics.view_count || 0,
          created_at: row.created_at,
          is_recently_viewed: daysSinceViewed !== null && daysSinceViewed <= 7,
          has_active_quote: false // TODO: Implement quote check
        };
      });

      return {
        items: customers,
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        hasMore: offset + limit < (count || 0)
      };

    } catch (error) {
      if (error instanceof RepositoryError) throw error;

      console.error('CustomerRepository: Unexpected error in getCustomers:', error);
      throw new RepositoryError('Failed to fetch customers', error);
    }
  }

  /**
   * Get a single customer by ID with full metrics
   */
  async getCustomerById(customerId: string): Promise<CustomerWithMetrics> {
    try {
      const { data, error } = await this.supabase
        .from('customers')
        .select(`
          *,
          customer_metrics (
            total_conversations,
            total_interactions,
            total_views,
            first_interaction_at,
            last_interaction_at,
            average_interaction_length,
            view_count
          )
        `)
        .eq('id', customerId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(`Customer ${customerId} not found`);
        }
        throw new RepositoryError('Failed to fetch customer', error);
      }

      if (!data) {
        throw new NotFoundError(`Customer ${customerId} not found`);
      }

      // Map to CustomerWithMetrics
      const metrics = data.customer_metrics?.[0] || {};
      return {
        ...data,
        total_conversations: metrics.total_conversations || 0,
        total_interactions: metrics.total_interactions || 0,
        total_views: metrics.total_views || 0,
        first_interaction_at: metrics.first_interaction_at,
        last_interaction_at: metrics.last_interaction_at,
        average_interaction_length: metrics.average_interaction_length,
        last_viewed_at: metrics.last_interaction_at,
        view_count: metrics.view_count || 0
      };

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (error instanceof RepositoryError) throw error;

      console.error('CustomerRepository: Error fetching customer by ID:', error);
      throw new RepositoryError('Failed to fetch customer', error);
    }
  }

  /**
   * Create a new customer
   * Triggers will handle matching key creation and audit logging
   */
  async createCustomer(input: CreateCustomerInput): Promise<CustomerProfile> {
    try {
      // Validate required fields
      if (!input.customer_name?.trim()) {
        throw new ValidationError('Customer name is required');
      }

      if (!input.company_id) {
        throw new ValidationError('Company ID is required');
      }

      if (!input.created_by_user_id) {
        throw new ValidationError('Created by user ID is required');
      }

      // Check for duplicates by email if provided
      if (input.customer_email) {
        const existing = await this.findByEmail(input.company_id, input.customer_email);
        if (existing) {
          throw new DuplicateError(
            `Customer with email ${input.customer_email} already exists`,
            [existing]
          );
        }
      }

      // Check for duplicates by phone if provided
      if (input.customer_phone) {
        const existing = await this.findByPhone(input.company_id, input.customer_phone);
        if (existing) {
          throw new DuplicateError(
            `Customer with phone ${input.customer_phone} already exists`,
            [existing]
          );
        }
      }

      // Insert customer
      const { data, error } = await this.supabase
        .from('customers')
        .insert({
          company_id: input.company_id,
          customer_name: input.customer_name.trim(),
          customer_email: input.customer_email?.trim() || null,
          customer_phone: input.customer_phone?.trim() || null,
          customer_address: input.customer_address?.trim() || null,
          customer_notes: input.customer_notes?.trim() || null,
          lifecycle_stage: input.lifecycle_stage || 'prospect',
          tags: input.tags || [],
          source: input.source || 'manual',
          source_campaign: input.source_campaign || null,
          metadata: input.metadata || {},
          status: 'active',
          created_by_user_id: input.created_by_user_id,
          created_by_user_name: input.created_by_user_name || null
        })
        .select()
        .single();

      if (error) {
        console.error('CustomerRepository: Error creating customer:', error);
        throw new RepositoryError('Failed to create customer', error);
      }

      console.log('CustomerRepository: Customer created successfully:', data.id);
      return data;

    } catch (error) {
      if (error instanceof ValidationError) throw error;
      if (error instanceof DuplicateError) throw error;
      if (error instanceof RepositoryError) throw error;

      console.error('CustomerRepository: Unexpected error in createCustomer:', error);
      throw new RepositoryError('Failed to create customer', error);
    }
  }

  /**
   * Update an existing customer
   * Triggers will handle matching key updates and audit logging
   */
  async updateCustomer(
    customerId: string,
    updates: UpdateCustomerInput
  ): Promise<CustomerProfile> {
    try {
      // Ensure customer exists and is not deleted
      await this.getCustomerById(customerId);

      // Prepare update data (filter out undefined values)
      const updateData: any = {};

      if (updates.customer_name !== undefined) {
        updateData.customer_name = updates.customer_name?.trim() || null;
      }
      if (updates.customer_email !== undefined) {
        updateData.customer_email = updates.customer_email?.trim() || null;
      }
      if (updates.customer_phone !== undefined) {
        updateData.customer_phone = updates.customer_phone?.trim() || null;
      }
      if (updates.customer_address !== undefined) {
        updateData.customer_address = updates.customer_address?.trim() || null;
      }
      if (updates.customer_notes !== undefined) {
        updateData.customer_notes = updates.customer_notes?.trim() || null;
      }
      if (updates.lifecycle_stage !== undefined) {
        updateData.lifecycle_stage = updates.lifecycle_stage;
        updateData.lifecycle_updated_at = new Date().toISOString();
      }
      if (updates.tags !== undefined) {
        updateData.tags = updates.tags;
      }
      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }
      if (updates.metadata !== undefined) {
        updateData.metadata = updates.metadata;
      }

      updateData.updated_at = new Date().toISOString();

      // Update customer
      const { data, error } = await this.supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error('CustomerRepository: Error updating customer:', error);
        throw new RepositoryError('Failed to update customer', error);
      }

      console.log('CustomerRepository: Customer updated successfully:', customerId);
      return data;

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (error instanceof RepositoryError) throw error;

      console.error('CustomerRepository: Unexpected error in updateCustomer:', error);
      throw new RepositoryError('Failed to update customer', error);
    }
  }

  /**
   * Soft delete a customer
   * Sets deleted_at timestamp and status to 'deleted'
   * Customer will be filtered out of normal queries
   */
  async softDeleteCustomer(customerId: string): Promise<void> {
    try {
      // Ensure customer exists and is not already deleted
      await this.getCustomerById(customerId);

      const { error } = await this.supabase
        .from('customers')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) {
        console.error('CustomerRepository: Error deleting customer:', error);
        throw new RepositoryError('Failed to delete customer', error);
      }

      console.log('CustomerRepository: Customer soft deleted:', customerId);

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (error instanceof RepositoryError) throw error;

      console.error('CustomerRepository: Unexpected error in softDeleteCustomer:', error);
      throw new RepositoryError('Failed to delete customer', error);
    }
  }

  /**
   * Restore a soft-deleted customer
   * Admin only - removes deleted_at timestamp
   */
  async restoreCustomer(customerId: string): Promise<CustomerProfile> {
    try {
      const { data, error } = await this.supabase
        .from('customers')
        .update({
          deleted_at: null,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(`Customer ${customerId} not found or not deleted`);
        }
        throw new RepositoryError('Failed to restore customer', error);
      }

      console.log('CustomerRepository: Customer restored:', customerId);
      return data;

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (error instanceof RepositoryError) throw error;

      console.error('CustomerRepository: Unexpected error in restoreCustomer:', error);
      throw new RepositoryError('Failed to restore customer', error);
    }
  }

  /**
   * Search customers with fuzzy matching
   * Uses customer_matching_keys for better duplicate detection
   */
  async searchCustomers(
    companyId: string,
    searchQuery: string,
    limit: number = 50
  ): Promise<CustomerProfile[]> {
    try {
      const search = searchQuery.trim().toLowerCase();

      // First, try to find by matching keys (exact match)
      const { data: matchingKeys } = await this.supabase
        .from('customer_matching_keys')
        .select('customer_id')
        .eq('company_id', companyId)
        .or(
          `normalized_value.eq.${this.normalizeEmail(search)},` +
          `normalized_value.eq.${this.normalizePhone(search)},` +
          `normalized_value.ilike.%${this.normalizeName(search)}%`
        )
        .limit(limit);

      const customerIds = matchingKeys?.map(mk => mk.customer_id) || [];

      // Then, search customers directly
      let query = this.supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .is('merged_into_customer_id', null);

      if (customerIds.length > 0) {
        // Prioritize exact matches
        query = query.or(
          `id.in.(${customerIds.join(',')}),` +
          `customer_name.ilike.%${search}%,` +
          `customer_email.ilike.%${search}%,` +
          `customer_phone.ilike.%${search}%`
        );
      } else {
        // Fallback to fuzzy search
        query = query.or(
          `customer_name.ilike.%${search}%,` +
          `customer_email.ilike.%${search}%,` +
          `customer_phone.ilike.%${search}%,` +
          `customer_address.ilike.%${search}%`
        );
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error('CustomerRepository: Error searching customers:', error);
        throw new RepositoryError('Failed to search customers', error);
      }

      return data || [];

    } catch (error) {
      if (error instanceof RepositoryError) throw error;

      console.error('CustomerRepository: Unexpected error in searchCustomers:', error);
      throw new RepositoryError('Failed to search customers', error);
    }
  }

  /**
   * Find customer by email
   */
  async findByEmail(companyId: string, email: string): Promise<CustomerProfile | null> {
    try {
      const normalizedEmail = this.normalizeEmail(email);

      const { data, error } = await this.supabase
        .from('customer_matching_keys')
        .select('customer_id')
        .eq('company_id', companyId)
        .eq('key_type', 'email')
        .eq('normalized_value', normalizedEmail)
        .single();

      if (error || !data) {
        return null;
      }

      return await this.getCustomerById(data.customer_id);

    } catch (error) {
      if (error instanceof NotFoundError) return null;
      console.error('CustomerRepository: Error finding customer by email:', error);
      return null;
    }
  }

  /**
   * Find customer by phone
   */
  async findByPhone(companyId: string, phone: string): Promise<CustomerProfile | null> {
    try {
      const normalizedPhone = this.normalizePhone(phone);

      const { data, error } = await this.supabase
        .from('customer_matching_keys')
        .select('customer_id')
        .eq('company_id', companyId)
        .eq('key_type', 'phone')
        .eq('normalized_value', normalizedPhone)
        .single();

      if (error || !data) {
        return null;
      }

      return await this.getCustomerById(data.customer_id);

    } catch (error) {
      if (error instanceof NotFoundError) return null;
      console.error('CustomerRepository: Error finding customer by phone:', error);
      return null;
    }
  }

  /**
   * Get customers by lifecycle stage
   */
  async getCustomersByLifecycleStage(
    companyId: string,
    stage: 'prospect' | 'lead' | 'customer' | 'churned'
  ): Promise<CustomerProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .eq('lifecycle_stage', stage)
        .is('deleted_at', null)
        .is('merged_into_customer_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw new RepositoryError('Failed to fetch customers by lifecycle stage', error);
      }

      return data || [];

    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      console.error('CustomerRepository: Error fetching customers by stage:', error);
      throw new RepositoryError('Failed to fetch customers by lifecycle stage', error);
    }
  }

  /**
   * Get customers with specific tags
   */
  async getCustomersByTags(
    companyId: string,
    tags: string[]
  ): Promise<CustomerProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .contains('tags', tags)
        .is('deleted_at', null)
        .is('merged_into_customer_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw new RepositoryError('Failed to fetch customers by tags', error);
      }

      return data || [];

    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      console.error('CustomerRepository: Error fetching customers by tags:', error);
      throw new RepositoryError('Failed to fetch customers by tags', error);
    }
  }

  /**
   * Bulk update lifecycle stage
   */
  async bulkUpdateLifecycleStage(
    customerIds: string[],
    stage: 'prospect' | 'lead' | 'customer' | 'churned'
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('customers')
        .update({
          lifecycle_stage: stage,
          lifecycle_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', customerIds)
        .is('deleted_at', null)
        .select('id');

      if (error) {
        throw new RepositoryError('Failed to bulk update lifecycle stage', error);
      }

      const updatedCount = data?.length || 0;
      console.log(`CustomerRepository: Updated lifecycle stage for ${updatedCount} customers`);
      return updatedCount;

    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      console.error('CustomerRepository: Error in bulk update lifecycle stage:', error);
      throw new RepositoryError('Failed to bulk update lifecycle stage', error);
    }
  }

  // Helper methods for normalization (match database functions)
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Enhanced retry mechanism with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    operationName: string = 'operation'
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        console.warn(`CustomerRepository: ${operationName} attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          throw error;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Exponential backoff with jitter
        const baseDelay = 1000;
        const jitter = Math.random() * 0.1 * baseDelay;
        const waitTime = (baseDelay * Math.pow(2, attempt - 1)) + jitter;

        console.log(`CustomerRepository: Retrying ${operationName} in ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw new Error(`${operationName} failed after ${maxRetries} retries`);
  }

  /**
   * Determine if an error is worth retrying
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // Network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) return true;

    // Database connection errors
    if (error.code === '08001' || error.code === '08006' || error.code === '08003') return true;

    // Rate limiting
    if (error.status === 429) return true;

    // Server errors
    if (error.status >= 500) return true;

    // Timeout errors
    if (error.message?.includes('timeout')) return true;

    return false;
  }
}

// Export singleton instance
export const customerRepository = new CustomerRepository();