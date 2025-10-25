export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  sessionId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  source?: 'native_pricing_agent' | 'user' | 'previous_session';
  metadata?: {
    processing_time?: number;
    services_count?: number;
    total_cost?: number;
    confidence?: number;
    source?: string;
    type?: 'customer_context' | 'history_summary';
    customerDetails?: any;
    conversationStats?: any;
    interactionNumber?: number;
  };
  // 🔄 PHASE 2D: Previous session support
  isPreviousSession?: boolean;
  interactionNumber?: number;
  // 📋 Customer Context: System and historical message support
  isHistorical?: boolean;
  isSystemMessage?: boolean;
}
