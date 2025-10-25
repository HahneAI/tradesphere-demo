/**
 * Simplified Customer Repository - Alternative Implementation
 *
 * This version avoids joining with customer_metrics view to bypass
 * any RLS or permission issues. Use this if the main repository
 * continues to have issues.
 */

import { getSupabase } from './supabase';
import {
  CustomerProfile,
  CustomerWithMetrics,
  UpdateCustomerInput,
  RepositoryError,
  NotFoundError
} from '../types/customer';

export class SimplifiedCustomerRepository {
  private supabase = getSupabase();

  /**
   * Get a single customer by ID WITHOUT metrics join
   * This avoids the customer_metrics view entirely
   */
  async getCustomerById(customerId: string, companyId: string): Promise<CustomerWithMetrics> {
    try {
      // Simple query without any joins
      const { data, error } = await this.supabase
        .from('crm_customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(`Customer ${customerId} not found`);
        }
        console.error('SimplifiedCustomerRepository: Database error:', error);
        throw new RepositoryError('Failed to fetch customer', error);
      }

      if (!data) {
        throw new NotFoundError(`Customer ${customerId} not found`);
      }

      // Return with default metrics (avoiding the metrics view entirely)
      return {
        ...data,
        total_conversations: 0,
        total_interactions: 0,
        total_views: 0,
        first_interaction_at: data.created_at,
        last_interaction_at: data.updated_at,
        average_interaction_length: 0,
        last_viewed_at: data.updated_at,
        view_count: 0
      };

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (error instanceof RepositoryError) throw error;

      console.error('SimplifiedCustomerRepository: Unexpected error:', error);
      throw new RepositoryError('Failed to fetch customer', error);
    }
  }

  /**
   * Update an existing customer - SIMPLIFIED VERSION
   */
  async updateCustomer(
    customerId: string,
    companyId: string,
    updates: UpdateCustomerInput
  ): Promise<CustomerProfile> {
    try {
      // First verify the customer exists (without metrics join)
      const { data: existingCustomer, error: fetchError } = await this.supabase
        .from('crm_customers')
        .select('id')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (fetchError || !existingCustomer) {
        console.error('SimplifiedCustomerRepository: Customer not found for update', fetchError);
        throw new NotFoundError(`Customer ${customerId} not found`);
      }

      // Prepare update data
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

      // Perform the update
      const { data, error } = await this.supabase
        .from('crm_customers')
        .update(updateData)
        .eq('id', customerId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('SimplifiedCustomerRepository: Update error:', error);
        throw new RepositoryError('Failed to update customer', error);
      }

      console.log('SimplifiedCustomerRepository: Customer updated successfully:', customerId);
      return data;

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (error instanceof RepositoryError) throw error;

      console.error('SimplifiedCustomerRepository: Unexpected error in updateCustomer:', error);
      throw new RepositoryError('Failed to update customer', error);
    }
  }
}

// Export singleton instance
export const simplifiedCustomerRepository = new SimplifiedCustomerRepository();