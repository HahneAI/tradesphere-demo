/**
 * Customer Enrichment Service
 *
 * Enriches customer profiles by aggregating data from conversations,
 * extracting contact information, and generating insights.
 */

import { getSupabase } from './supabase';
import { customerRepository } from './CustomerRepository';
import { customerSyncService } from './CustomerSyncService';
import {
  CustomerProfile,
  CustomerEnrichmentResult,
  CustomerConversation,
  RepositoryError
} from '../types/customer';

interface ContactInfo {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface TopicAnalysis {
  topics: string[];
  keywords: Record<string, number>;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export class CustomerEnrichmentService {
  private supabase = getSupabase();

  // Common service keywords for topic extraction
  private readonly SERVICE_KEYWORDS = [
    'paver', 'patio', 'driveway', 'retaining wall', 'excavation',
    'landscaping', 'concrete', 'drainage', 'outdoor kitchen',
    'fire pit', 'walkway', 'pool deck', 'stairs', 'hardscape',
    'softscape', 'irrigation', 'lighting', 'fence', 'deck',
    'pergola', 'gazebo', 'water feature', 'grading', 'sod',
    'mulch', 'plants', 'trees', 'design', 'installation'
  ];

  /**
   * Enrich a customer profile from all their conversations
   */
  async enrichFromConversations(customerId: string): Promise<CustomerEnrichmentResult> {
    try {
      // Get all conversations for the customer
      const conversations = await customerSyncService.getCustomerConversations(customerId);

      if (conversations.length === 0) {
        return {
          customer_id: customerId,
          fields_updated: [],
          conversations_processed: 0,
          new_tags_added: [],
          notes_appended: false,
          contact_info_extracted: {},
          topics_identified: [],
          enrichment_date: new Date().toISOString()
        };
      }

      // Extract contact information
      const contactInfo = this.extractContactInfo(conversations);

      // Analyze topics
      const topicAnalysis = this.analyzeTopics(conversations);

      // Generate conversation summary
      const summary = await this.generateConversationSummary(customerId, conversations);

      // Get current customer
      const customer = await customerRepository.getCustomerById(customerId);

      // Prepare updates
      const updates: any = {};
      const fieldsUpdated: string[] = [];

      // Update contact info
      if (contactInfo.email && !customer.customer_email) {
        updates.customer_email = contactInfo.email;
        fieldsUpdated.push('email');
      }
      if (contactInfo.phone && !customer.customer_phone) {
        updates.customer_phone = contactInfo.phone;
        fieldsUpdated.push('phone');
      }
      if (contactInfo.address && !customer.customer_address) {
        updates.customer_address = contactInfo.address;
        fieldsUpdated.push('address');
      }

      // Add topics as tags
      const newTags = topicAnalysis.topics.filter(
        topic => !(customer.tags || []).includes(topic)
      );

      if (newTags.length > 0) {
        updates.tags = [...(customer.tags || []), ...newTags];
        fieldsUpdated.push('tags');
      }

      // Append summary to notes
      let notesAppended = false;
      if (summary && summary.length > 0) {
        const enrichmentNote = `\n\n--- Enrichment Summary (${new Date().toLocaleDateString()}) ---\n${summary}`;
        updates.customer_notes = (customer.customer_notes || '') + enrichmentNote;
        fieldsUpdated.push('notes');
        notesAppended = true;
      }

      // Update customer if we have changes
      if (Object.keys(updates).length > 0) {
        await customerRepository.updateCustomer(customerId, updates);
      }

      // Log enrichment event
      await this.logEnrichmentEvent(customerId, {
        fields_updated: fieldsUpdated,
        conversations_processed: conversations.length,
        topics_identified: topicAnalysis.topics,
        contact_info_extracted: contactInfo
      });

      return {
        customer_id: customerId,
        fields_updated: fieldsUpdated,
        conversations_processed: conversations.length,
        new_tags_added: newTags,
        notes_appended: notesAppended,
        contact_info_extracted: contactInfo,
        topics_identified: topicAnalysis.topics,
        enrichment_date: new Date().toISOString()
      };

    } catch (error) {
      console.error('CustomerEnrichmentService: Error enriching customer:', error);
      throw error;
    }
  }

  /**
   * Extract contact information from conversations
   */
  extractContactInfo(conversations: CustomerConversation[]): ContactInfo {
    const info: ContactInfo = {};

    // Email regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

    // Phone regex (handles various formats)
    const phoneRegex = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

    // Process conversations in reverse order (oldest first) to get earliest mentions
    const reversedConversations = [...conversations].reverse();

    for (const conv of reversedConversations) {
      // Check both user input and AI response for contact info
      const textToSearch = `${conv.user_input || ''} ${conv.ai_response || ''}`;

      // Extract email
      if (!info.email) {
        const emailMatches = textToSearch.match(emailRegex);
        if (emailMatches && emailMatches.length > 0) {
          info.email = emailMatches[0].toLowerCase();
        }
      }

      // Extract phone
      if (!info.phone) {
        const phoneMatches = textToSearch.match(phoneRegex);
        if (phoneMatches && phoneMatches.length > 0) {
          // Clean up phone number
          info.phone = phoneMatches[0].replace(/\D/g, '');
          if (info.phone.length === 10) {
            info.phone = `${info.phone.slice(0, 3)}-${info.phone.slice(3, 6)}-${info.phone.slice(6)}`;
          }
        }
      }

      // Extract address (more complex, look for patterns)
      if (!info.address && conv.user_input) {
        // Look for street address patterns
        const addressRegex = /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|boulevard|blvd)/gi;
        const addressMatches = conv.user_input.match(addressRegex);
        if (addressMatches && addressMatches.length > 0) {
          info.address = addressMatches[0];
        }
      }
    }

    // Also check the embedded customer fields in conversations
    for (const conv of conversations) {
      if (!info.email && conv.customer_email) {
        info.email = conv.customer_email;
      }
      if (!info.phone && conv.customer_phone) {
        info.phone = conv.customer_phone;
      }
      if (!info.address && conv.customer_address) {
        info.address = conv.customer_address;
      }
    }

    return info;
  }

  /**
   * Analyze topics discussed in conversations
   */
  analyzeTopics(conversations: CustomerConversation[]): TopicAnalysis {
    const keywords: Record<string, number> = {};
    const topics = new Set<string>();

    // Process all conversation text
    conversations.forEach(conv => {
      const text = `${conv.user_input || ''} ${conv.ai_response || ''} ${conv.interaction_summary || ''}`.toLowerCase();

      // Count keyword occurrences
      this.SERVICE_KEYWORDS.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}s?\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          keywords[keyword] = (keywords[keyword] || 0) + matches.length;

          // Add as topic if mentioned enough times
          if (keywords[keyword] >= 2) {
            topics.add(keyword);
          }
        }
      });

      // Look for specific project types
      if (text.includes('quote') || text.includes('estimate') || text.includes('price')) {
        topics.add('quote-requested');
      }
      if (text.includes('asap') || text.includes('urgent') || text.includes('emergency')) {
        topics.add('urgent');
      }
      if (text.includes('spring') || text.includes('summer') || text.includes('fall') || text.includes('winter')) {
        topics.add('seasonal');
      }
      if (text.includes('commercial') || text.includes('business')) {
        topics.add('commercial');
      }
      if (text.includes('residential') || text.includes('home')) {
        topics.add('residential');
      }
    });

    // Determine sentiment (simplified)
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    const allText = conversations.map(c => c.user_input || '').join(' ').toLowerCase();

    const positiveWords = ['excellent', 'great', 'perfect', 'love', 'amazing', 'wonderful'];
    const negativeWords = ['problem', 'issue', 'complaint', 'unhappy', 'disappointed', 'poor'];

    const positiveCount = positiveWords.filter(word => allText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => allText.includes(word)).length;

    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    return {
      topics: Array.from(topics),
      keywords,
      sentiment
    };
  }

  /**
   * Generate a summary of all conversations
   */
  async generateConversationSummary(
    customerId: string,
    conversations: CustomerConversation[]
  ): Promise<string> {
    try {
      // Group conversations by session
      const sessions = new Map<string, CustomerConversation[]>();
      conversations.forEach(conv => {
        const existing = sessions.get(conv.session_id) || [];
        existing.push(conv);
        sessions.set(conv.session_id, existing);
      });

      const summaryParts: string[] = [];

      // Summarize each session
      for (const [sessionId, sessionConvs] of sessions) {
        const firstConv = sessionConvs[sessionConvs.length - 1]; // Oldest first
        const lastConv = sessionConvs[0]; // Newest first

        // Get interaction summaries
        const summaries = sessionConvs
          .filter(c => c.interaction_summary)
          .map(c => c.interaction_summary)
          .slice(0, 3); // Top 3 summaries

        if (summaries.length > 0) {
          const sessionDate = new Date(firstConv.created_at).toLocaleDateString();
          summaryParts.push(
            `Session (${sessionDate}, ${sessionConvs.length} interactions):\n` +
            summaries.map(s => `  - ${s}`).join('\n')
          );
        }
      }

      // Get topics
      const topicAnalysis = this.analyzeTopics(conversations);
      if (topicAnalysis.topics.length > 0) {
        summaryParts.push(`\nServices discussed: ${topicAnalysis.topics.join(', ')}`);
      }

      // Add sentiment
      if (topicAnalysis.sentiment) {
        summaryParts.push(`Customer sentiment: ${topicAnalysis.sentiment}`);
      }

      return summaryParts.join('\n');

    } catch (error) {
      console.error('CustomerEnrichmentService: Error generating summary:', error);
      return '';
    }
  }

  /**
   * Update customer notes with additional information
   */
  async updateCustomerNotes(
    customerId: string,
    notes: string,
    append: boolean = true
  ): Promise<void> {
    try {
      if (!notes || notes.trim().length === 0) {
        return;
      }

      const customer = await customerRepository.getCustomerById(customerId);

      const updatedNotes = append
        ? (customer.customer_notes || '') + '\n\n' + notes
        : notes;

      await customerRepository.updateCustomer(customerId, {
        customer_notes: updatedNotes
      });

      console.log('CustomerEnrichmentService: Updated customer notes');

    } catch (error) {
      console.error('CustomerEnrichmentService: Error updating notes:', error);
      throw error;
    }
  }

  /**
   * Bulk enrich multiple customers
   */
  async bulkEnrichCustomers(
    customerIds: string[]
  ): Promise<{ enriched: number; failed: number }> {
    let enriched = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < customerIds.length; i += batchSize) {
      const batch = customerIds.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(id => this.enrichFromConversations(id))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          enriched++;
        } else {
          failed++;
          console.warn(`Failed to enrich customer ${batch[index]}:`, result.reason);
        }
      });
    }

    console.log(`CustomerEnrichmentService: Enriched ${enriched}/${customerIds.length} customers`);
    return { enriched, failed };
  }

  /**
   * Auto-enrich all customers for a company
   * Finds customers with conversations but incomplete profiles
   */
  async autoEnrichCompanyCustomers(companyId: string): Promise<number> {
    try {
      // Get customers with incomplete profiles
      const { items: customers } = await customerRepository.getCustomers(
        companyId,
        { limit: 1000 }
      );

      const incompleteCustomers = customers.filter(c => {
        // Check if profile is incomplete
        return !c.customer_email || !c.customer_phone || !c.tags || c.tags.length === 0;
      });

      console.log(`CustomerEnrichmentService: Found ${incompleteCustomers.length} customers to enrich`);

      const { enriched } = await this.bulkEnrichCustomers(
        incompleteCustomers.map(c => c.id)
      );

      return enriched;

    } catch (error) {
      console.error('CustomerEnrichmentService: Error auto-enriching customers:', error);
      throw error;
    }
  }

  /**
   * Extract project requirements from conversations
   */
  async extractProjectRequirements(customerId: string): Promise<{
    services: string[];
    budget?: string;
    timeline?: string;
    sqft?: number;
    materials?: string[];
  }> {
    try {
      const conversations = await customerSyncService.getCustomerConversations(customerId);

      const requirements: any = {
        services: [],
        materials: []
      };

      conversations.forEach(conv => {
        const text = `${conv.user_input || ''} ${conv.ai_response || ''}`.toLowerCase();

        // Extract square footage
        const sqftMatch = text.match(/(\d+)\s*(?:sq|square)\s*(?:ft|feet|foot)/i);
        if (sqftMatch && !requirements.sqft) {
          requirements.sqft = parseInt(sqftMatch[1]);
        }

        // Extract budget mentions
        const budgetMatch = text.match(/\$[\d,]+|[\d,]+\s*dollars/i);
        if (budgetMatch && !requirements.budget) {
          requirements.budget = budgetMatch[0];
        }

        // Extract timeline
        const timelinePatterns = [
          /next\s+(week|month|year)/i,
          /within\s+(\d+)\s*(weeks?|months?|days?)/i,
          /(spring|summer|fall|winter)\s*\d{4}/i,
          /(january|february|march|april|may|june|july|august|september|october|november|december)/i
        ];

        for (const pattern of timelinePatterns) {
          const match = text.match(pattern);
          if (match && !requirements.timeline) {
            requirements.timeline = match[0];
            break;
          }
        }

        // Extract materials
        const materials = ['concrete', 'pavers', 'stone', 'brick', 'gravel', 'sand', 'mulch', 'wood'];
        materials.forEach(material => {
          if (text.includes(material) && !requirements.materials.includes(material)) {
            requirements.materials.push(material);
          }
        });
      });

      // Get services from topic analysis
      const topicAnalysis = this.analyzeTopics(conversations);
      requirements.services = topicAnalysis.topics.filter(topic =>
        this.SERVICE_KEYWORDS.includes(topic)
      );

      return requirements;

    } catch (error) {
      console.error('CustomerEnrichmentService: Error extracting requirements:', error);
      return { services: [], materials: [] };
    }
  }

  /**
   * Log enrichment event
   */
  private async logEnrichmentEvent(
    customerId: string,
    enrichmentData: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('customer_events')
        .insert({
          customer_id: customerId,
          event_type: 'enriched',
          event_data: enrichmentData
        });

    } catch (error) {
      console.warn('Failed to log enrichment event:', error);
      // Non-critical, don't throw
    }
  }
}

// Export singleton instance
export const customerEnrichmentService = new CustomerEnrichmentService();