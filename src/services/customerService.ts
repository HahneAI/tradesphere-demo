/**
 * Customer Database Service
 * Handles customer data operations with proper error handling and performance optimization
 */

import { getSupabase, handleSupabaseError } from './supabase';
import { Database } from '../types/supabase';

type VCUsageTable = Database['public']['Tables']['VC USAGE'];
type VCUsageRow = VCUsageTable['Row'];
type VCUsageInsert = VCUsageTable['Insert'];
type VCUsageUpdate = VCUsageTable['Update'];

type CustomerInteractionsTable = Database['public']['Tables']['customer_interactions'];
type CustomerInteractionInsert = CustomerInteractionsTable['Insert'];

type CustomerListView = Database['public']['Views']['customer_list_view']['Row'];

export interface CustomerSummary {
  customer_name: string;
  user_tech_id: string;
  latest_session_id: string;
  customer_address: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_number: string | null;
  interaction_summary: string | null;
  last_interaction_at: string;
  last_viewed_at: string | null;
  interaction_count: number;
  view_count: number;
  sort_priority: number;
}

export interface CustomerConversationHistory {
  id: string;
  user_input: string | null;
  ai_response: string | null;
  interaction_number: number;
  created_at: string;
  session_id: string;
}

export interface CustomerSearchFilters {
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export class CustomerService {
  private supabase = getSupabase();

  /**
   * Get optimized customer list with smart ordering (recently viewed first)
   */
  async getCustomerList(
    techId: string, 
    filters: CustomerSearchFilters = {}
  ): Promise<{ customers: CustomerSummary[]; error?: string }> {
    try {
      let query = this.supabase
        .from('customer_list_view')
        .select('*')
        .eq('user_tech_id', techId)
        .order('sort_priority', { ascending: false })
        .order('last_interaction_at', { ascending: false })
        .order('customer_name', { ascending: true });

      // Apply search filter if provided
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const searchTerm = `%${filters.searchQuery.trim()}%`;
        query = query.or(
          `customer_name.ilike.${searchTerm},` +
          `customer_email.ilike.${searchTerm},` +
          `customer_phone.ilike.${searchTerm},` +
          `customer_number.ilike.${searchTerm},` +
          `customer_address.ilike.${searchTerm}`
        );
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('CustomerService: Error fetching customer list:', error);
        return { 
          customers: [],
          error: `Failed to fetch customer list: ${error.message}` 
        };
      }

      return { customers: data || [] };

    } catch (error) {
      console.error('CustomerService: Unexpected error in getCustomerList:', error);
      return { 
        customers: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get customer conversation history for context loading
   */
  async getCustomerConversationHistory(
    customerName: string,
    techId: string,
    sessionId?: string,
    limit: number = 10
  ): Promise<{ conversations: CustomerConversationHistory[]; error?: string }> {
    try {
      let query = this.supabase
        .from('VC USAGE')
        .select('id, user_input, ai_response, interaction_number, created_at, session_id')
        .eq('user_tech_id', techId)
        .eq('customer_name', customerName)
        .not('user_input', 'is', null)
        .not('ai_response', 'is', null)
        .order('interaction_number', { ascending: false })
        .limit(limit);

      // Filter by specific session if provided
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('CustomerService: Error fetching conversation history:', error);
        return {
          conversations: [],
          error: `Failed to fetch conversation history: ${error.message}`
        };
      }

      // Reverse to get chronological order (oldest first)
      return { conversations: (data || []).reverse() };

    } catch (error) {
      console.error('CustomerService: Unexpected error in getConversationHistory:', error);
      return {
        conversations: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update customer details with audit logging
   */
  async updateCustomerDetails(
    sessionId: string,
    techId: string,
    updates: Partial<Pick<VCUsageRow, 'customer_name' | 'customer_address' | 'customer_email' | 'customer_phone'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Start transaction by updating all records for this customer
      const { error: updateError } = await this.supabase
        .from('VC USAGE')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_tech_id', techId);

      if (updateError) {
        console.error('CustomerService: Error updating customer details:', updateError);
        return {
          success: false,
          error: `Failed to update customer details: ${updateError.message}`
        };
      }

      // Track this as an edit interaction
      if (updates.customer_name) {
        await this.trackCustomerInteraction(
          techId,
          updates.customer_name,
          sessionId,
          'edit'
        );
      }

      return { success: true };

    } catch (error) {
      console.error('CustomerService: Unexpected error in updateCustomerDetails:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Track customer interaction for smart ordering
   */
  async trackCustomerInteraction(
    techId: string,
    customerName: string,
    sessionId: string | null,
    interactionType: 'view' | 'edit' | 'load'
  ): Promise<void> {
    try {
      const interactionData: CustomerInteractionInsert = {
        user_tech_id: techId,
        customer_name: customerName,
        session_id: sessionId,
        interaction_type: interactionType,
        viewed_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('customer_interactions')
        .insert(interactionData);

      if (error) {
        console.error('CustomerService: Error tracking customer interaction:', error);
        // Non-critical error, don't throw
      }

      // Update view count in VC USAGE table for this customer
      const { error: updateError } = await this.supabase
        .from('VC USAGE')
        .update({
          last_viewed_at: new Date().toISOString(),
          view_count: this.supabase.raw('COALESCE(view_count, 0) + 1')
        })
        .eq('user_tech_id', techId)
        .eq('customer_name', customerName);

      if (updateError) {
        console.error('CustomerService: Error updating view count:', updateError);
        // Non-critical error, don't throw
      }

    } catch (error) {
      console.error('CustomerService: Unexpected error in trackCustomerInteraction:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get customer details by session or name
   */
  async getCustomerDetails(
    techId: string,
    customerName?: string,
    sessionId?: string
  ): Promise<{ customer: VCUsageRow | null; error?: string }> {
    try {
      let query = this.supabase
        .from('VC USAGE')
        .select('*')
        .eq('user_tech_id', techId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (customerName) {
        query = query.eq('customer_name', customerName);
      }

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      if (!customerName && !sessionId) {
        return {
          customer: null,
          error: 'Either customerName or sessionId must be provided'
        };
      }

      const { data, error } = await query;

      if (error) {
        console.error('CustomerService: Error fetching customer details:', error);
        return {
          customer: null,
          error: `Failed to fetch customer details: ${error.message}`
        };
      }

      const customer = data && data.length > 0 ? data[0] : null;

      // Track view if customer found
      if (customer && customerName) {
        await this.trackCustomerInteraction(
          techId,
          customerName,
          customer.session_id,
          'view'
        );
      }

      return { customer };

    } catch (error) {
      console.error('CustomerService: Unexpected error in getCustomerDetails:', error);
      return {
        customer: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Search customers with advanced filtering
   */
  async searchCustomers(
    techId: string,
    searchQuery: string,
    limit: number = 50
  ): Promise<{ customers: CustomerSummary[]; error?: string }> {
    return this.getCustomerList(techId, { searchQuery, limit });
  }

  /**
   * Get customer statistics for dashboard
   */
  async getCustomerStats(techId: string): Promise<{
    totalCustomers: number;
    recentlyViewed: number;
    totalInteractions: number;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('customer_list_view')
        .select('customer_name, view_count, interaction_count')
        .eq('user_tech_id', techId);

      if (error) {
        console.error('CustomerService: Error fetching customer stats:', error);
        return {
          totalCustomers: 0,
          recentlyViewed: 0,
          totalInteractions: 0,
          error: `Failed to fetch customer stats: ${error.message}`
        };
      }

      const stats = data?.reduce((acc, customer) => {
        acc.totalCustomers++;
        acc.totalInteractions += customer.interaction_count || 0;
        if ((customer.view_count || 0) > 0) {
          acc.recentlyViewed++;
        }
        return acc;
      }, {
        totalCustomers: 0,
        recentlyViewed: 0,
        totalInteractions: 0
      }) || { totalCustomers: 0, recentlyViewed: 0, totalInteractions: 0 };

      return stats;

    } catch (error) {
      console.error('CustomerService: Unexpected error in getCustomerStats:', error);
      return {
        totalCustomers: 0,
        recentlyViewed: 0,
        totalInteractions: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Enhanced retry mechanism with exponential backoff and error categorization
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    operationName: string = 'operation'
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          console.log(`CustomerService: ${operationName} succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        console.warn(`CustomerService: ${operationName} attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error(`CustomerService: ${operationName} failed after ${maxRetries} attempts`);
          throw error;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          console.error(`CustomerService: ${operationName} failed with non-retryable error:`, error);
          throw error;
        }

        // Exponential backoff with jitter
        const jitter = Math.random() * 0.1 * delay;
        const waitTime = (delay * Math.pow(2, attempt - 1)) + jitter;
        console.log(`CustomerService: Retrying ${operationName} in ${Math.round(waitTime)}ms...`);
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
    
    // Network errors are retryable
    if (error.message?.includes('fetch') || error.message?.includes('network')) return true;
    
    // PostgreSQL connection errors are retryable
    if (error.code === '08001' || error.code === '08006' || error.code === '08003') return true;
    
    // Rate limiting errors are retryable
    if (error.message?.includes('rate limit') || error.status === 429) return true;
    
    // Temporary server errors are retryable
    if (error.status >= 500 && error.status < 600) return true;
    
    // Auth token expiry is retryable (may refresh)
    if (error.message?.includes('JWT expired') || error.status === 401) return true;
    
    // Timeout errors are retryable
    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') return true;
    
    // Connection refused errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') return true;
    
    return false;
  }

  /**
   * Comprehensive audit logging for customer operations
   */
  private async logAuditTrail(
    operation: string,
    techId: string,
    customerName: string,
    sessionId: string | null,
    details: any = {},
    success: boolean = true,
    error?: any
  ): Promise<void> {
    try {
      const auditLog = {
        operation,
        tech_id: techId,
        customer_name: customerName,
        session_id: sessionId,
        details: JSON.stringify({
          ...details,
          timestamp: new Date().toISOString(),
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
          success,
          ...(error && { error: error.message || error.toString() })
        }),
        success,
        timestamp: new Date().toISOString()
      };

      // Enhanced logging for debugging and monitoring
      if (success) {
        console.log('CustomerService Audit - Success:', {
          operation,
          techId: techId.substring(0, 8) + '...',
          customerName,
          sessionId: sessionId?.substring(0, 8) + '...',
          details: Object.keys(details)
        });
      } else {
        console.error('CustomerService Audit - Failure:', {
          operation,
          techId: techId.substring(0, 8) + '...',
          customerName,
          sessionId: sessionId?.substring(0, 8) + '...',
          error: error?.message || error?.toString() || 'Unknown error',
          details: Object.keys(details)
        });
      }
      
      // Track successful operations in customer_interactions table
      if (success && ['view', 'edit', 'load'].includes(operation)) {
        await this.trackCustomerInteraction(techId, customerName, sessionId, operation as any);
      }

      // In a production environment, you might want to:
      // 1. Send to external logging service (e.g., Sentry, LogRocket)
      // 2. Store in dedicated audit_log table
      // 3. Send metrics to monitoring service (e.g., DataDog, New Relic)
      
    } catch (auditError) {
      // Never throw on audit logging failures
      console.warn('CustomerService: Failed to log audit trail:', auditError);
    }
  }

  /**
   * Enhanced error handling with user-friendly messages
   */
  private handleError(error: any, operation: string): { success: false; error: string } {
    // Log the raw error for debugging
    console.error(`CustomerService: ${operation} error:`, error);

    // Categorize and return user-friendly error messages
    if (!error) {
      return { success: false, error: 'An unknown error occurred' };
    }

    // Network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return { 
        success: false, 
        error: 'Network connection failed. Please check your internet connection and try again.' 
      };
    }

    // Auth errors
    if (error.status === 401 || error.message?.includes('unauthorized')) {
      return { 
        success: false, 
        error: 'Authentication failed. Please log in again.' 
      };
    }

    // Permission errors
    if (error.status === 403 || error.message?.includes('forbidden')) {
      return { 
        success: false, 
        error: 'You do not have permission to perform this action.' 
      };
    }

    // Not found errors
    if (error.status === 404) {
      return { 
        success: false, 
        error: 'The requested customer data could not be found.' 
      };
    }

    // Rate limiting
    if (error.status === 429) {
      return { 
        success: false, 
        error: 'Too many requests. Please wait a moment and try again.' 
      };
    }

    // Server errors
    if (error.status >= 500) {
      return { 
        success: false, 
        error: 'Server error. Please try again later.' 
      };
    }

    // Database errors
    if (error.code?.startsWith('08') || error.message?.includes('connection')) {
      return { 
        success: false, 
        error: 'Database connection failed. Please try again.' 
      };
    }

    // Validation errors
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return { 
        success: false, 
        error: 'Invalid data provided. Please check your input and try again.' 
      };
    }

    // Default error
    const userMessage = error.message || 'An unexpected error occurred';
    return { 
      success: false, 
      error: userMessage.length > 100 ? 'An unexpected error occurred. Please try again.' : userMessage
    };
  }
}

// Export singleton instance
export const customerService = new CustomerService();