/**
 * Customer Context Hook
 * Manages customer loading, context switching, and chat integration
 */

import { useState, useCallback, useRef } from 'react';
import { Message } from '../types/message';
import { useAuth } from '../context/AuthContext';
import { customerService } from '../services/customerService';

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

export interface CustomerContextState {
  isLoading: boolean;
  error: string | null;
  customerDetails: CustomerDetails | null;
  conversationHistory: ConversationMessage[];
  isContextLoaded: boolean;
}

const INITIAL_STATE: CustomerContextState = {
  isLoading: false,
  error: null,
  customerDetails: null,
  conversationHistory: [],
  isContextLoaded: false
};

export const useCustomerContext = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CustomerContextState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load customer context and conversation history
   */
  const loadCustomerContext = useCallback(async (
    customerName: string,
    sessionId?: string
  ): Promise<void> => {
    if (!user?.tech_uuid) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      isContextLoaded: false
    }));

    try {
      // Get customer details using the service
      const { customer, error: customerError } = await customerService.getCustomerDetails(
        user.tech_uuid,
        customerName,
        sessionId
      );

      if (customerError || !customer) {
        throw new Error(customerError || 'Customer not found');
      }

      // Get conversation history
      const { conversations, error: historyError } = await customerService.getCustomerConversationHistory(
        customerName,
        user.tech_uuid,
        sessionId,
        2
      );

      if (historyError) {
        throw new Error(historyError);
      }

      // Format customer details
      const customerDetails: CustomerDetails = {
        name: customer.customer_name || '',
        address: customer.customer_address || '',
        email: customer.customer_email || '',
        phone: customer.customer_phone || customer.customer_number || '',
        sessionId: customer.session_id
      };

      // Format conversation history
      const formattedHistory: ConversationMessage[] = conversations.map(conv => ({
        id: conv.id,
        text: conv.user_input || conv.ai_response || '',
        sender: conv.user_input ? 'user' : 'ai',
        timestamp: conv.created_at,
        sessionId: conv.session_id,
        source: 'previous_session',
        interactionNumber: conv.interaction_number
      }));

      setState(prev => ({
        ...prev,
        isLoading: false,
        customerDetails,
        conversationHistory: formattedHistory,
        isContextLoaded: true,
        error: null
      }));

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }

      console.error('Error loading customer context:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load customer context',
        isContextLoaded: false
      }));
    }
  }, [user?.tech_uuid]);

  /**
   * Convert conversation history to chat messages
   */
  const getMessagesForChat = useCallback((): Message[] => {
    return state.conversationHistory.map(msg => ({
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
  }, [state.conversationHistory]);

  /**
   * Clear current customer context
   */
  const clearContext = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(INITIAL_STATE);
  }, []);

  /**
   * Retry loading customer context
   */
  const retry = useCallback((customerName: string, sessionId?: string) => {
    loadCustomerContext(customerName, sessionId);
  }, [loadCustomerContext]);

  /**
   * Check if customer context is available
   */
  const hasContext = useCallback(() => {
    return state.isContextLoaded && state.customerDetails !== null;
  }, [state.isContextLoaded, state.customerDetails]);

  /**
   * Get customer display name
   */
  const getCustomerDisplayName = useCallback(() => {
    return state.customerDetails?.name || 'Unknown Customer';
  }, [state.customerDetails?.name]);

  /**
   * Get conversation summary for display
   */
  const getConversationSummary = useCallback(() => {
    const messageCount = state.conversationHistory.length;
    if (messageCount === 0) return 'No previous conversations';
    
    const userMessages = state.conversationHistory.filter(m => m.sender === 'user').length;
    const aiMessages = state.conversationHistory.filter(m => m.sender === 'ai').length;
    
    return `${userMessages} questions, ${aiMessages} responses`;
  }, [state.conversationHistory]);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    customerDetails: state.customerDetails,
    conversationHistory: state.conversationHistory,
    isContextLoaded: state.isContextLoaded,

    // Actions
    loadCustomerContext,
    clearContext,
    retry,

    // Utilities
    getMessagesForChat,
    hasContext,
    getCustomerDisplayName,
    getConversationSummary
  };
};