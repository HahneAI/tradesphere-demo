/**
 * Customer Sync Service
 *
 * Manages synchronization between customers table and VC Usage (chat) table.
 * Note: Most sync is handled automatically by database triggers.
 * This service provides manual sync capabilities and enrichment.
 */

import { getSupabase } from './supabase';
import { customerRepository } from './CustomerRepository';
import {
  CustomerProfile,
  CustomerConversation,
  CustomerSyncResult,
  ConversationSummary,
  RepositoryError,
  NotFoundError
} from '../types/customer';

interface VCUsageRecord {
  id: string;
  session_id: string;
  company_id: string;  // Required for multi-tenancy
  user_id: string | null;  // Made nullable
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  user_input?: string | null;
  ai_response?: string | null;
  interaction_number: number;
  interaction_summary?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export class CustomerSyncService {
  private supabase = getSupabase();

  /**
   * Sync a chat conversation to customer record
   * This is usually handled by triggers, but can be called manually
   */
  async syncFromChat(vcUsageRecord: VCUsageRecord): Promise<CustomerSyncResult> {
    try {
      // Skip if no customer name
      if (!vcUsageRecord.customer_name) {
        return {
          success: false,
          action: 'error',
          error: 'No customer name in chat record'
        };
      }

      // Use company_id from record (passed directly in Phase 3E)
      const companyId = vcUsageRecord.company_id;

      // Check if already linked
      if (vcUsageRecord.customer_id) {
        return {
          success: true,
          action: 'found_existing',
          customer_id: vcUsageRecord.customer_id,
          matched_by: 'email' // Already linked
        };
      }

      // Try to find existing customer by matching keys
      let existingCustomer: CustomerProfile | null = null;
      let matchedBy: 'email' | 'phone' | 'name' | undefined;
      let confidence = 0;

      // Try email first (highest confidence)
      if (vcUsageRecord.customer_email) {
        existingCustomer = await customerRepository.findByEmail(
          companyId,
          vcUsageRecord.customer_email
        );
        if (existingCustomer) {
          matchedBy = 'email';
          confidence = 100;
        }
      }

      // Try phone if no email match
      if (!existingCustomer && vcUsageRecord.customer_phone) {
        existingCustomer = await customerRepository.findByPhone(
          companyId,
          vcUsageRecord.customer_phone
        );
        if (existingCustomer) {
          matchedBy = 'phone';
          confidence = 90;
        }
      }

      // Try fuzzy name match if no exact match
      if (!existingCustomer) {
        const searchResults = await customerRepository.searchCustomers(
          companyId,
          vcUsageRecord.customer_name,
          5
        );

        // Check for exact name match
        const exactMatch = searchResults.find(
          c => c.customer_name.toLowerCase() === vcUsageRecord.customer_name!.toLowerCase()
        );

        if (exactMatch) {
          existingCustomer = exactMatch;
          matchedBy = 'name';
          confidence = 80;
        }
      }

      if (existingCustomer) {
        // Link VC Usage record to existing customer
        await this.linkConversationToCustomer(
          existingCustomer.id,
          vcUsageRecord.session_id
        );

        // Update customer with any new information from chat
        const updates: any = {};
        if (!existingCustomer.customer_email && vcUsageRecord.customer_email) {
          updates.customer_email = vcUsageRecord.customer_email;
        }
        if (!existingCustomer.customer_phone && vcUsageRecord.customer_phone) {
          updates.customer_phone = vcUsageRecord.customer_phone;
        }
        if (!existingCustomer.customer_address && vcUsageRecord.customer_address) {
          updates.customer_address = vcUsageRecord.customer_address;
        }

        if (Object.keys(updates).length > 0) {
          await customerRepository.updateCustomer(existingCustomer.id, existingCustomer.company_id, updates);
        }

        return {
          success: true,
          customer: existingCustomer,
          action: 'updated',
          customer_id: existingCustomer.id,
          matched_by: matchedBy,
          confidence
        };
      } else {
        // Create new customer
        const newCustomer = await customerRepository.createCustomer({
          company_id: companyId,
          customer_name: vcUsageRecord.customer_name,
          customer_email: vcUsageRecord.customer_email || null,
          customer_phone: vcUsageRecord.customer_phone || null,
          customer_address: vcUsageRecord.customer_address || null,
          source: 'chat',
          lifecycle_stage: 'prospect',
          created_by_user_id: vcUsageRecord.user_id,
          created_by_user_name: 'AI Chat Sync'
        });

        // Link VC Usage record to new customer
        await this.linkConversationToCustomer(
          newCustomer.id,
          vcUsageRecord.session_id
        );

        return {
          success: true,
          customer: newCustomer,
          action: 'created',
          customer_id: newCustomer.id,
          confidence: 100
        };
      }

    } catch (error) {
      console.error('CustomerSyncService: Error syncing from chat:', error);
      return {
        success: false,
        action: 'error',
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  /**
   * Link a conversation session to a customer
   * Updates all VC Usage records for the session with customer_id
   */
  async linkConversationToCustomer(
    customerId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('VC Usage')
        .update({
          customer_id: customerId,
          customer_linked_at: new Date().toISOString(),
          customer_link_source: 'manual'
        })
        .eq('session_id', sessionId);

      if (error) {
        throw new RepositoryError('Failed to link conversation to customer', error);
      }

      console.log(`CustomerSyncService: Linked session ${sessionId} to customer ${customerId}`);

    } catch (error) {
      console.error('CustomerSyncService: Error linking conversation:', error);
      throw error;
    }
  }

  /**
   * Enrich customer profile from their conversation history
   * Aggregates data from all conversations for the customer
   */
  async enrichCustomerFromConversations(customerId: string): Promise<void> {
    try {
      // Get all conversations for customer
      const conversations = await this.getCustomerConversations(customerId);

      if (conversations.length === 0) {
        console.log('CustomerSyncService: No conversations to enrich from');
        return;
      }

      // Extract unique topics discussed
      const topics = new Set<string>();
      const summaries: string[] = [];
      let latestEmail: string | null = null;
      let latestPhone: string | null = null;
      let latestAddress: string | null = null;

      conversations.forEach(conv => {
        // Extract topics from interaction summaries
        if (conv.interaction_summary) {
          summaries.push(conv.interaction_summary);

          // Simple topic extraction (could be enhanced with NLP)
          const keywords = ['patio', 'driveway', 'retaining wall', 'excavation',
                           'landscaping', 'pavers', 'concrete', 'drainage'];
          keywords.forEach(keyword => {
            if (conv.interaction_summary!.toLowerCase().includes(keyword)) {
              topics.add(keyword);
            }
          });
        }

        // Get latest contact info
        if (conv.customer_email && !latestEmail) {
          latestEmail = conv.customer_email;
        }
        if (conv.customer_phone && !latestPhone) {
          latestPhone = conv.customer_phone;
        }
        if (conv.customer_address && !latestAddress) {
          latestAddress = conv.customer_address;
        }
      });

      // First get company_id (needed for multi-tenancy)
      const { data: customerData, error: fetchError } = await this.supabase
        .from('crm_customers')
        .select('company_id')
        .eq('id', customerId)
        .single();

      if (fetchError || !customerData) {
        throw new NotFoundError(`Customer ${customerId} not found`);
      }

      const companyId = customerData.company_id;

      // Get current customer
      const customer = await customerRepository.getCustomerById(customerId, companyId);

      // Prepare updates
      const updates: any = {};

      // Update contact info if we found newer data
      if (latestEmail && !customer.customer_email) {
        updates.customer_email = latestEmail;
      }
      if (latestPhone && !customer.customer_phone) {
        updates.customer_phone = latestPhone;
      }
      if (latestAddress && !customer.customer_address) {
        updates.customer_address = latestAddress;
      }

      // Add topics as tags
      if (topics.size > 0) {
        const newTags = Array.from(topics);
        const existingTags = customer.tags || [];
        const mergedTags = [...new Set([...existingTags, ...newTags])];

        if (mergedTags.length > existingTags.length) {
          updates.tags = mergedTags;
        }
      }

      // Append conversation summary to notes
      if (summaries.length > 0) {
        const summaryText = `\n\nConversation Topics (${new Date().toLocaleDateString()}):\n` +
                          summaries.slice(0, 5).join('\n- ');

        updates.customer_notes = (customer.customer_notes || '') + summaryText;
      }

      // Update customer if we have changes
      if (Object.keys(updates).length > 0) {
        await customerRepository.updateCustomer(customerId, companyId, updates);
        console.log('CustomerSyncService: Enriched customer profile with', Object.keys(updates));
      }

      // Create conversation summary record
      await this.createConversationSummary(customerId, conversations);

    } catch (error) {
      console.error('CustomerSyncService: Error enriching customer:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a customer
   */
  async getCustomerConversations(customerId: string): Promise<CustomerConversation[]> {
    try {
      const { data, error } = await this.supabase
        .from('VC Usage')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new RepositoryError('Failed to fetch customer conversations', error);
      }

      return (data || []).map(row => ({
        id: row.id,
        session_id: row.session_id,
        customer_id: row.customer_id,
        user_input: row.user_input,
        ai_response: row.ai_response,
        interaction_number: row.interaction_number,
        interaction_summary: row.interaction_summary,
        created_at: row.created_at,
        updated_at: row.updated_at,
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
        customer_address: row.customer_address
      }));

    } catch (error) {
      console.error('CustomerSyncService: Error fetching conversations:', error);
      throw error;
    }
  }

  /**
   * Find orphaned conversations (not linked to any customer)
   */
  async findOrphanedConversations(companyId: string): Promise<VCUsageRecord[]> {
    try {
      // Get users for company
      const { data: users, error: userError } = await this.supabase
        .from('users')
        .select('id')
        .eq('company_id', companyId);

      if (userError || !users) {
        throw new RepositoryError('Failed to fetch company users', userError);
      }

      const userIds = users.map(u => u.id);

      // Find VC Usage records without customer_id
      const { data, error } = await this.supabase
        .from('VC Usage')
        .select('*')
        .in('user_id', userIds)
        .is('customer_id', null)
        .not('customer_name', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw new RepositoryError('Failed to fetch orphaned conversations', error);
      }

      return data || [];

    } catch (error) {
      console.error('CustomerSyncService: Error finding orphaned conversations:', error);
      throw error;
    }
  }

  /**
   * Sync all orphaned conversations for a company
   * Returns count of successfully synced conversations
   */
  async syncOrphanedConversations(companyId: string): Promise<number> {
    try {
      const orphaned = await this.findOrphanedConversations(companyId);

      console.log(`CustomerSyncService: Found ${orphaned.length} orphaned conversations`);

      let synced = 0;

      // Process in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < orphaned.length; i += batchSize) {
        const batch = orphaned.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(record => this.syncFromChat(record))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            synced++;
          } else {
            console.warn(`Failed to sync conversation ${batch[index].session_id}`);
          }
        });
      }

      console.log(`CustomerSyncService: Successfully synced ${synced}/${orphaned.length} conversations`);
      return synced;

    } catch (error) {
      console.error('CustomerSyncService: Error syncing orphaned conversations:', error);
      throw error;
    }
  }

  /**
   * Create or update conversation summary for a customer
   */
  private async createConversationSummary(
    customerId: string,
    conversations: CustomerConversation[]
  ): Promise<void> {
    try {
      // Group by session
      const sessions = new Map<string, CustomerConversation[]>();
      conversations.forEach(conv => {
        const existing = sessions.get(conv.session_id) || [];
        existing.push(conv);
        sessions.set(conv.session_id, existing);
      });

      // Create summary for each session
      for (const [sessionId, sessionConvs] of sessions) {
        const topics = new Set<string>();
        const summaries: string[] = [];

        sessionConvs.forEach(conv => {
          if (conv.interaction_summary) {
            summaries.push(conv.interaction_summary);
          }
        });

        // Extract topics (simplified - could use NLP)
        const keywords = ['patio', 'driveway', 'retaining wall', 'excavation',
                         'landscaping', 'pavers', 'concrete', 'drainage'];
        summaries.forEach(summary => {
          keywords.forEach(keyword => {
            if (summary.toLowerCase().includes(keyword)) {
              topics.add(keyword);
            }
          });
        });

        // Check if summary exists
        const { data: existing } = await this.supabase
          .from('customer_conversation_summaries')
          .select('id')
          .eq('customer_id', customerId)
          .eq('session_id', sessionId)
          .single();

        const summaryData = {
          customer_id: customerId,
          session_id: sessionId,
          conversation_summary: summaries.join(' | '),
          topics_discussed: Array.from(topics),
          interaction_count: sessionConvs.length,
          first_interaction_at: sessionConvs[sessionConvs.length - 1].created_at,
          last_interaction_at: sessionConvs[0].created_at
        };

        if (existing) {
          // Update existing summary
          await this.supabase
            .from('customer_conversation_summaries')
            .update(summaryData)
            .eq('id', existing.id);
        } else {
          // Create new summary
          await this.supabase
            .from('customer_conversation_summaries')
            .insert(summaryData);
        }
      }

    } catch (error) {
      console.error('CustomerSyncService: Error creating conversation summary:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get conversation history formatted for chat context
   * Used by Netlify functions for context preloading
   */
  async getCustomerConversationHistory(
    customerId: string,
    sessionId?: string,
    limit: number = 2
  ): Promise<Array<{
    user_input: string | null;
    ai_response: string | null;
    interaction_number: number;
    created_at: string;
    session_id: string;
  }>> {
    try {
      let query = this.supabase
        .from('VC Usage')
        .select('user_input, ai_response, interaction_number, created_at, session_id')
        .eq('customer_id', customerId)
        .not('user_input', 'is', null)
        .not('ai_response', 'is', null)
        .order('interaction_number', { ascending: false })
        .limit(limit);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) {
        throw new RepositoryError('Failed to fetch conversation history', error);
      }

      // Reverse to get chronological order
      return (data || []).reverse();

    } catch (error) {
      console.error('CustomerSyncService: Error fetching conversation history:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const customerSyncService = new CustomerSyncService();