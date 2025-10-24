/**
 * Customer Management Service
 *
 * Handles CRUD operations for manually-created customer records.
 * Separate from AI chat conversation data ("VC Usage" table).
 */

import { getSupabase } from './supabase';

export interface CustomerProfile {
  id?: string;
  company_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_notes?: string;
  created_by_user_id: string;
  created_by_user_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerCreateResult {
  success: boolean;
  customer?: CustomerProfile;
  error?: string;
}

export class CustomerManagementService {
  private supabase = getSupabase();

  /**
   * Create a new customer record
   */
  async createCustomer(profile: CustomerProfile): Promise<CustomerCreateResult> {
    console.log('📝 [CUSTOMER SERVICE] Creating customer:', profile.customer_name);

    try {
      // Validate required fields
      if (!profile.customer_name || profile.customer_name.trim() === '') {
        return { success: false, error: 'Customer name is required' };
      }

      if (!profile.company_id || profile.company_id.trim() === '') {
        return { success: false, error: 'Company ID is required' };
      }

      if (!profile.created_by_user_id || profile.created_by_user_id.trim() === '') {
        return { success: false, error: 'Creator user ID is required' };
      }

      // Insert customer record
      const { data, error } = await this.supabase
        .from('crm_customers')
        .insert({
          company_id: profile.company_id,
          customer_name: profile.customer_name.trim(),
          customer_email: profile.customer_email?.trim() || null,
          customer_phone: profile.customer_phone?.trim() || null,
          customer_address: profile.customer_address?.trim() || null,
          customer_notes: profile.customer_notes?.trim() || null,
          created_by_user_id: profile.created_by_user_id,
          created_by_user_name: profile.created_by_user_name || null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [CUSTOMER SERVICE] Failed to create customer:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [CUSTOMER SERVICE] Customer created successfully:', data.id);
      return { success: true, customer: data };

    } catch (error: any) {
      console.error('💥 [CUSTOMER SERVICE] Create customer error:', error);
      return { success: false, error: error.message || 'Failed to create customer' };
    }
  }

  /**
   * List all customers for a company
   */
  async listCustomers(companyId: string): Promise<CustomerProfile[]> {
    console.log('📋 [CUSTOMER SERVICE] Listing customers for company:', companyId);

    try {
      const { data, error } = await this.supabase
        .from('crm_customers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [CUSTOMER SERVICE] Failed to list customers:', error);
        return [];
      }

      console.log(`✅ [CUSTOMER SERVICE] Found ${data?.length || 0} customers`);
      return data || [];

    } catch (error) {
      console.error('💥 [CUSTOMER SERVICE] List customers error:', error);
      return [];
    }
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(customerId: string): Promise<CustomerProfile | null> {
    console.log('🔍 [CUSTOMER SERVICE] Getting customer:', customerId);

    try {
      const { data, error } = await this.supabase
        .from('crm_customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('❌ [CUSTOMER SERVICE] Failed to get customer:', error);
        return null;
      }

      console.log('✅ [CUSTOMER SERVICE] Customer found:', data.customer_name);
      return data;

    } catch (error) {
      console.error('💥 [CUSTOMER SERVICE] Get customer error:', error);
      return null;
    }
  }

  /**
   * Update a customer record
   */
  async updateCustomer(
    customerId: string,
    updates: Partial<Omit<CustomerProfile, 'id' | 'company_id' | 'created_by_user_id' | 'created_at'>>
  ): Promise<{ success: boolean; error?: string }> {
    console.log('✏️ [CUSTOMER SERVICE] Updating customer:', customerId);

    try {
      const { error } = await this.supabase
        .from('crm_customers')
        .update({
          customer_name: updates.customer_name?.trim(),
          customer_email: updates.customer_email?.trim() || null,
          customer_phone: updates.customer_phone?.trim() || null,
          customer_address: updates.customer_address?.trim() || null,
          customer_notes: updates.customer_notes?.trim() || null
        })
        .eq('id', customerId);

      if (error) {
        console.error('❌ [CUSTOMER SERVICE] Failed to update customer:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [CUSTOMER SERVICE] Customer updated successfully');
      return { success: true };

    } catch (error: any) {
      console.error('💥 [CUSTOMER SERVICE] Update customer error:', error);
      return { success: false, error: error.message || 'Failed to update customer' };
    }
  }

  /**
   * Delete a customer record
   */
  async deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
    console.log('🗑️ [CUSTOMER SERVICE] Deleting customer:', customerId);

    try {
      const { error } = await this.supabase
        .from('crm_customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        console.error('❌ [CUSTOMER SERVICE] Failed to delete customer:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [CUSTOMER SERVICE] Customer deleted successfully');
      return { success: true };

    } catch (error: any) {
      console.error('💥 [CUSTOMER SERVICE] Delete customer error:', error);
      return { success: false, error: error.message || 'Failed to delete customer' };
    }
  }

  /**
   * Check if a customer already exists by name and company
   */
  async customerExists(customerName: string, companyId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('crm_customers')
        .select('id')
        .eq('company_id', companyId)
        .eq('customer_name', customerName.trim())
        .limit(1);

      if (error) {
        console.error('❌ [CUSTOMER SERVICE] Failed to check customer existence:', error);
        return false;
      }

      return (data && data.length > 0);

    } catch (error) {
      console.error('💥 [CUSTOMER SERVICE] Customer exists check error:', error);
      return false;
    }
  }

  /**
   * Search customers by name, email, or phone
   */
  async searchCustomers(companyId: string, query: string): Promise<CustomerProfile[]> {
    console.log('🔍 [CUSTOMER SERVICE] Searching customers:', query);

    try {
      const searchTerm = query.trim().toLowerCase();

      const { data, error } = await this.supabase
        .from('crm_customers')
        .select('*')
        .eq('company_id', companyId)
        .or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [CUSTOMER SERVICE] Failed to search customers:', error);
        return [];
      }

      console.log(`✅ [CUSTOMER SERVICE] Found ${data?.length || 0} matching customers`);
      return data || [];

    } catch (error) {
      console.error('💥 [CUSTOMER SERVICE] Search customers error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const customerManagementService = new CustomerManagementService();
