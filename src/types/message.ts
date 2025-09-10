export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  sessionId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  source?: 'make_com' | 'native_pricing_agent' | 'user';
  metadata?: {
    processing_time?: number;
    services_count?: number;
    total_cost?: number;
    confidence?: number;
    source?: string;
  };
}
