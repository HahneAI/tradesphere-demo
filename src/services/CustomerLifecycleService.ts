/**
 * Customer Lifecycle Service
 *
 * Manages customer lifecycle stages, tags, and event tracking.
 * Provides timeline generation and lifecycle analytics.
 */

import { getSupabase } from './supabase';
import { customerRepository } from './CustomerRepository';
import {
  CustomerProfile,
  CustomerEvent,
  CustomerTimeline,
  ConversationSummary,
  BulkOperationResult,
  RepositoryError,
  NotFoundError,
  ValidationError
} from '../types/customer';

export class CustomerLifecycleService {
  private supabase = getSupabase();

  /**
   * Update customer lifecycle stage
   * Tracks the change in customer_events table
   */
  async updateLifecycleStage(
    customerId: string,
    stage: 'prospect' | 'lead' | 'customer' | 'churned',
    userId?: string,
    reason?: string
  ): Promise<void> {
    try {
      // First get company_id (needed for multi-tenancy)
      const { data: customerData, error: fetchError } = await this.supabase
        .from('crm_customers')
        .select('company_id, lifecycle_stage')
        .eq('id', customerId)
        .single();

      if (fetchError || !customerData) {
        throw new NotFoundError(`Customer ${customerId} not found`);
      }

      const companyId = customerData.company_id;

      // Get full customer details
      const customer = await customerRepository.getCustomerById(customerId, companyId);

      if (customer.lifecycle_stage === stage) {
        console.log('CustomerLifecycleService: Stage unchanged');
        return;
      }

      const previousStage = customer.lifecycle_stage;

      // Update customer
      await customerRepository.updateCustomer(customerId, companyId, {
        lifecycle_stage: stage
      });

      // Create event log
      await this.supabase
        .from('customer_events')
        .insert({
          customer_id: customerId,
          event_type: 'stage_changed',
          event_data: {
            previous_stage: previousStage,
            new_stage: stage,
            reason: reason || 'Manual update',
            changed_by_user_id: userId
          },
          created_by_user_id: userId || null
        });

      console.log(`CustomerLifecycleService: Updated ${customerId} from ${previousStage} to ${stage}`);

    } catch (error) {
      console.error('CustomerLifecycleService: Error updating lifecycle stage:', error);
      throw error;
    }
  }

  /**
   * Add tags to a customer
   * Merges with existing tags
   */
  async addTags(
    customerId: string,
    tags: string[],
    userId?: string
  ): Promise<void> {
    try {
      if (!tags || tags.length === 0) {
        throw new ValidationError('No tags provided');
      }

      // First get company_id (needed for multi-tenancy)
      const { data: customerData, error: fetchError } = await this.supabase
        .from('crm_customers')
        .select('company_id, tags')
        .eq('id', customerId)
        .single();

      if (fetchError || !customerData) {
        throw new NotFoundError(`Customer ${customerId} not found`);
      }

      const companyId = customerData.company_id;

      // Get current customer
      const customer = await customerRepository.getCustomerById(customerId, companyId);

      // Merge tags
      const existingTags = customer.tags || [];
      const newTags = tags.filter(tag => !existingTags.includes(tag));

      if (newTags.length === 0) {
        console.log('CustomerLifecycleService: All tags already exist');
        return;
      }

      const mergedTags = [...existingTags, ...newTags];

      // Update customer
      await customerRepository.updateCustomer(customerId, companyId, {
        tags: mergedTags
      });

      // Create event log
      await this.supabase
        .from('customer_events')
        .insert({
          customer_id: customerId,
          event_type: 'tags_added',
          event_data: {
            tags_added: newTags,
            total_tags: mergedTags.length,
            added_by_user_id: userId
          },
          created_by_user_id: userId || null
        });

      console.log(`CustomerLifecycleService: Added ${newTags.length} tags to customer ${customerId}`);

    } catch (error) {
      console.error('CustomerLifecycleService: Error adding tags:', error);
      throw error;
    }
  }

  /**
   * Remove tags from a customer
   */
  async removeTags(
    customerId: string,
    tags: string[],
    userId?: string
  ): Promise<void> {
    try {
      if (!tags || tags.length === 0) {
        throw new ValidationError('No tags provided');
      }

      // First get company_id (needed for multi-tenancy)
      const { data: customerData, error: fetchError } = await this.supabase
        .from('crm_customers')
        .select('company_id, tags')
        .eq('id', customerId)
        .single();

      if (fetchError || !customerData) {
        throw new NotFoundError(`Customer ${customerId} not found`);
      }

      const companyId = customerData.company_id;

      // Get current customer
      const customer = await customerRepository.getCustomerById(customerId, companyId);

      // Remove tags
      const existingTags = customer.tags || [];
      const remainingTags = existingTags.filter(tag => !tags.includes(tag));
      const removedTags = tags.filter(tag => existingTags.includes(tag));

      if (removedTags.length === 0) {
        console.log('CustomerLifecycleService: No tags to remove');
        return;
      }

      // Update customer
      await customerRepository.updateCustomer(customerId, companyId, {
        tags: remainingTags
      });

      // Create event log
      await this.supabase
        .from('customer_events')
        .insert({
          customer_id: customerId,
          event_type: 'tags_removed',
          event_data: {
            tags_removed: removedTags,
            remaining_tags: remainingTags.length,
            removed_by_user_id: userId
          },
          created_by_user_id: userId || null
        });

      console.log(`CustomerLifecycleService: Removed ${removedTags.length} tags from customer ${customerId}`);

    } catch (error) {
      console.error('CustomerLifecycleService: Error removing tags:', error);
      throw error;
    }
  }

  /**
   * Get customer timeline with all events
   */
  async getCustomerTimeline(
    customerId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CustomerTimeline> {
    try {
      // Get customer events
      let eventsQuery = this.supabase
        .from('customer_events')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (startDate) {
        eventsQuery = eventsQuery.gte('created_at', startDate);
      }
      if (endDate) {
        eventsQuery = eventsQuery.lte('created_at', endDate);
      }

      const { data: events, error: eventsError } = await eventsQuery;

      if (eventsError) {
        throw new RepositoryError('Failed to fetch customer events', eventsError);
      }

      // Get conversation summaries
      let summariesQuery = this.supabase
        .from('customer_conversation_summaries')
        .select('*')
        .eq('customer_id', customerId)
        .order('last_interaction_at', { ascending: false });

      if (startDate) {
        summariesQuery = summariesQuery.gte('last_interaction_at', startDate);
      }
      if (endDate) {
        summariesQuery = summariesQuery.lte('last_interaction_at', endDate);
      }

      const { data: summaries, error: summariesError } = await summariesQuery;

      if (summariesError) {
        console.warn('Failed to fetch conversation summaries:', summariesError);
        // Non-critical, continue
      }

      // Calculate date range
      const allDates = [
        ...(events || []).map(e => e.created_at),
        ...(summaries || []).map(s => s.last_interaction_at)
      ];

      const dateRange = {
        start: startDate || (allDates.length > 0 ? Math.min(...allDates.map(d => new Date(d).getTime())) : new Date().toISOString()),
        end: endDate || (allDates.length > 0 ? Math.max(...allDates.map(d => new Date(d).getTime())) : new Date().toISOString())
      };

      return {
        customer_id: customerId,
        events: events || [],
        conversation_summaries: summaries || [],
        total_events: (events || []).length + (summaries || []).length,
        date_range: {
          start: new Date(dateRange.start).toISOString(),
          end: new Date(dateRange.end).toISOString()
        }
      };

    } catch (error) {
      console.error('CustomerLifecycleService: Error fetching timeline:', error);
      throw error;
    }
  }

  /**
   * Bulk update lifecycle stage for multiple customers
   */
  async bulkUpdateLifecycleStage(
    customerIds: string[],
    stage: 'prospect' | 'lead' | 'customer' | 'churned',
    userId?: string,
    reason?: string
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      success: true,
      total: customerIds.length,
      succeeded: 0,
      failed: 0,
      results: []
    };

    for (const customerId of customerIds) {
      try {
        await this.updateLifecycleStage(customerId, stage, userId, reason);
        results.succeeded++;
        results.results.push({
          id: customerId,
          success: true
        });
      } catch (error) {
        results.failed++;
        results.results.push({
          id: customerId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    results.success = results.failed === 0;
    return results;
  }

  /**
   * Bulk add tags to multiple customers
   */
  async bulkAddTags(
    customerIds: string[],
    tags: string[],
    userId?: string
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      success: true,
      total: customerIds.length,
      succeeded: 0,
      failed: 0,
      results: []
    };

    for (const customerId of customerIds) {
      try {
        await this.addTags(customerId, tags, userId);
        results.succeeded++;
        results.results.push({
          id: customerId,
          success: true
        });
      } catch (error) {
        results.failed++;
        results.results.push({
          id: customerId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    results.success = results.failed === 0;
    return results;
  }

  /**
   * Get lifecycle stage analytics for a company
   */
  async getLifecycleAnalytics(companyId: string): Promise<{
    stages: Record<string, number>;
    conversions: Array<{ from: string; to: string; count: number }>;
    averageTimeInStage: Record<string, number>;
  }> {
    try {
      // Get customer counts by stage
      const { data: customers } = await this.supabase
        .from('crm_customers')
        .select('lifecycle_stage')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .is('merged_into_customer_id', null);

      const stages: Record<string, number> = {
        prospect: 0,
        lead: 0,
        customer: 0,
        churned: 0
      };

      customers?.forEach(c => {
        stages[c.lifecycle_stage]++;
      });

      // Get stage conversion events
      const { data: events } = await this.supabase
        .from('customer_events')
        .select('event_data')
        .eq('event_type', 'stage_changed')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

      const conversions: Record<string, number> = {};

      events?.forEach(e => {
        const data = e.event_data as any;
        const key = `${data.previous_stage}_to_${data.new_stage}`;
        conversions[key] = (conversions[key] || 0) + 1;
      });

      // Calculate average time in stage
      const stageTimings: Record<string, number[]> = {
        prospect: [],
        lead: [],
        customer: [],
        churned: []
      };

      // This would require more complex analysis of event history
      // For now, return placeholder data
      const averageTimeInStage: Record<string, number> = {
        prospect: 7,  // days
        lead: 14,
        customer: 365,
        churned: 0
      };

      // Format conversions
      const conversionArray = Object.entries(conversions).map(([key, count]) => {
        const [from, , to] = key.split('_');
        return { from, to, count };
      });

      return {
        stages,
        conversions: conversionArray,
        averageTimeInStage
      };

    } catch (error) {
      console.error('CustomerLifecycleService: Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Get customers at risk of churning
   * Based on last interaction date and lifecycle stage
   */
  async getChurnRiskCustomers(
    companyId: string,
    daysSinceLastInteraction: number = 30
  ): Promise<CustomerProfile[]> {
    try {
      const cutoffDate = new Date(Date.now() - daysSinceLastInteraction * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('crm_customers')
        .select(`
          *,
          customer_metrics!inner (
            last_interaction_at
          )
        `)
        .eq('company_id', companyId)
        .in('lifecycle_stage', ['customer', 'lead'])
        .is('deleted_at', null)
        .is('merged_into_customer_id', null)
        .lte('customer_metrics.last_interaction_at', cutoffDate);

      if (error) {
        throw new RepositoryError('Failed to fetch churn risk customers', error);
      }

      return data || [];

    } catch (error) {
      console.error('CustomerLifecycleService: Error fetching churn risk customers:', error);
      throw error;
    }
  }

  /**
   * Automatically tag customers based on behavior
   */
  async autoTagCustomers(companyId: string): Promise<number> {
    try {
      let tagged = 0;

      // Get customers with metrics
      const { items: customers } = await customerRepository.getCustomers(
        companyId,
        { limit: 1000 }
      );

      for (const customer of customers) {
        const tagsToAdd: string[] = [];

        // High value customer (10+ conversations)
        if (customer.total_conversations >= 10) {
          tagsToAdd.push('high-value');
        }

        // Recently active (within 7 days)
        if (customer.is_recently_viewed) {
          tagsToAdd.push('active');
        }

        // Inactive (no interaction in 30+ days)
        if (customer.last_interaction_at) {
          const daysSince = Math.floor(
            (Date.now() - new Date(customer.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSince > 30) {
            tagsToAdd.push('inactive');
          }
        }

        // New customer (created within 7 days)
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCreated <= 7) {
          tagsToAdd.push('new');
        }

        if (tagsToAdd.length > 0) {
          try {
            await this.addTags(customer.id, tagsToAdd);
            tagged++;
          } catch (error) {
            console.warn(`Failed to auto-tag customer ${customer.id}:`, error);
          }
        }
      }

      console.log(`CustomerLifecycleService: Auto-tagged ${tagged} customers`);
      return tagged;

    } catch (error) {
      console.error('CustomerLifecycleService: Error auto-tagging customers:', error);
      throw error;
    }
  }

  /**
   * Create a custom event for a customer
   */
  async createCustomerEvent(
    customerId: string,
    eventType: string,
    eventData: Record<string, any>,
    userId?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('customer_events')
        .insert({
          customer_id: customerId,
          event_type: eventType,
          event_data: eventData,
          created_by_user_id: userId || null
        });

      console.log(`CustomerLifecycleService: Created ${eventType} event for customer ${customerId}`);

    } catch (error) {
      console.error('CustomerLifecycleService: Error creating customer event:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const customerLifecycleService = new CustomerLifecycleService();