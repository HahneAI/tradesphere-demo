/**
 * Customer Context Service
 * Handles customer loading and chat integration
 */

import { Message } from '../types/message';

export interface CustomerDetails {
  name: string;
  address: string;
  email: string;
  phone: string;
  sessionId?: string;
}

export interface ConversationMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  sessionId: string;
  source: 'previous_session' | 'current_session';
  interactionNumber?: number;
}

export interface CustomerContextResponse {
  success: boolean;
  customerName: string;
  customerDetails: CustomerDetails | null;
  conversationHistory: ConversationMessage[];
  contextMetadata: {
    recordsFound: number;
    sessionId: string;
    techId: string;
    processingTime: number;
  };
  error?: string;
  details?: string;
}

export class CustomerContextService {
  private baseUrl = '/.netlify/functions/customer-context';
  
  /**
   * Load customer context and conversation history
   */
  async loadCustomerContext(
    customerName: string,
    techId: string,
    sessionId?: string
  ): Promise<CustomerContextResponse> {
    const encodedCustomerName = encodeURIComponent(customerName);
    const queryParams = new URLSearchParams({ tech_id: techId });
    
    if (sessionId) {
      queryParams.append('session_id', sessionId);
    }

    const url = `${this.baseUrl}/${encodedCustomerName}?${queryParams.toString()}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CustomerContextResponse = await response.json();
      return data;

    } catch (error) {
      console.error('CustomerContextService: Error loading context:', error);
      
      return {
        success: false,
        customerName,
        customerDetails: null,
        conversationHistory: [],
        contextMetadata: {
          recordsFound: 0,
          sessionId: sessionId || 'unknown',
          techId,
          processingTime: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to load customer context'
      };
    }
  }

  /**
   * Convert conversation history to chat messages
   */
  convertToMessages(conversationHistory: ConversationMessage[]): Message[] {
    return conversationHistory.map(msg => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender,
      timestamp: new Date(msg.timestamp),
      isHistorical: true,
      sessionId: msg.sessionId,
      metadata: {
        source: msg.source,
        interactionNumber: msg.interactionNumber
      }
    }));
  }

  /**
   * Create a customer info message for chat context
   */
  createCustomerInfoMessage(customerDetails: CustomerDetails, messageId: string): Message {
    const customerInfo = [
      `Customer: ${customerDetails.name}`,
      customerDetails.address && `Address: ${customerDetails.address}`,
      customerDetails.email && `Email: ${customerDetails.email}`,
      customerDetails.phone && `Phone: ${customerDetails.phone}`,
    ].filter(Boolean).join('\n');

    return {
      id: messageId,
      text: `Customer context loaded:\n\n${customerInfo}`,
      sender: 'ai',
      timestamp: new Date(),
      isHistorical: false,
      isSystemMessage: true,
      metadata: {
        type: 'customer_context',
        customerDetails
      }
    };
  }

  /**
   * Create a conversation history summary message
   */
  createHistorySummaryMessage(
    conversationHistory: ConversationMessage[],
    messageId: string
  ): Message {
    if (conversationHistory.length === 0) {
      return {
        id: messageId,
        text: 'No previous conversations found for this customer.',
        sender: 'ai',
        timestamp: new Date(),
        isHistorical: false,
        isSystemMessage: true,
        metadata: {
          type: 'history_summary'
        }
      };
    }

    const userMessages = conversationHistory.filter(m => m.sender === 'user').length;
    const aiMessages = conversationHistory.filter(m => m.sender === 'ai').length;
    const lastInteraction = conversationHistory[conversationHistory.length - 1];
    
    const summary = [
      `Previous conversation history loaded:`,
      `• ${userMessages} customer questions`,
      `• ${aiMessages} AI responses`,
      `• Last interaction: ${new Date(lastInteraction.timestamp).toLocaleDateString()}`
    ].join('\n');

    return {
      id: messageId,
      text: summary,
      sender: 'ai',
      timestamp: new Date(),
      isHistorical: false,
      isSystemMessage: true,
      metadata: {
        type: 'history_summary',
        conversationStats: {
          userMessages,
          aiMessages,
          lastInteraction: lastInteraction.timestamp
        }
      }
    };
  }

  /**
   * Prepare complete message array for chat loading
   */
  prepareMessagesForChat(
    customerDetails: CustomerDetails | null,
    conversationHistory: ConversationMessage[],
    customerInfoId: string,
    historySummaryId: string
  ): Message[] {
    const messages: Message[] = [];

    // Add customer info message if available
    if (customerDetails) {
      messages.push(this.createCustomerInfoMessage(customerDetails, customerInfoId));
    }

    // Add history summary
    messages.push(this.createHistorySummaryMessage(conversationHistory, historySummaryId));

    // Add historical conversation messages
    const historicalMessages = this.convertToMessages(conversationHistory);
    messages.push(...historicalMessages);

    return messages;
  }
}

// Export singleton instance
export const customerContextService = new CustomerContextService();