/**
 * TradeSphere Shared Message Storage Service
 * 
 * Provides unified Supabase storage functionality for both Make.com and native functions
 * Handles environment variables, error logging, and data structure consistency
 */

export interface WebhookPayload {
  sessionId: string;
  firstName?: string;
  techId?: string;
  betaCodeId?: number;
}

export interface StorageMetadata {
  processing_time?: number;
  services_count?: number;
  total_cost?: number;
  confidence?: number;
  source: 'native_pricing_agent' | 'make_com_webhook';
  calculation_time?: number;
}

export interface StorageCredentials {
  url: string;
  key: string;
}

export class MessageStorageService {
  
  /**
   * Get Supabase credentials with fallback logic
   * Handles both environment variables and hardcoded fallbacks
   */
  static getEnvironmentCredentials(): StorageCredentials {
    // Try environment variables first (for proper production setup)
    let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    let key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    // Fallback to hardcoded values (temporary solution)
    if (!url || !key) {
      console.log('🔄 Using hardcoded Supabase credentials (fallback mode)');
      url = 'https://acdudelebwrzewxqmwnc.supabase.co';
      key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c';
    } else {
      console.log('✅ Using environment variables for Supabase credentials');
    }
    
    return { url, key };
  }

  /**
   * Store AI response in demo_messages table
   * Unified function for both Make.com and native workflows
   */
  static async storeAIResponse(
    payload: WebhookPayload, 
    response: string, 
    metadata: Partial<StorageMetadata> = {}
  ): Promise<void> {
    try {
      console.log('💾 [MessageStorage] Storing AI response');
      console.log(`📝 [MessageStorage] Session: ${payload.sessionId}, Length: ${response.length}`);
      
      const { url, key } = this.getEnvironmentCredentials();
      
      // Ensure response is properly truncated if too long
      let cleanedResponse = response;
      if (cleanedResponse.length > 2000) {
        cleanedResponse = cleanedResponse.substring(0, 1997) + '...';
        console.log('⚠️ [MessageStorage] Response truncated due to length');
      }
      
      // Clean problematic characters
      cleanedResponse = cleanedResponse.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Prepare message data with consistent structure
      const messageData = {
        session_id: payload.sessionId,
        message_text: cleanedResponse,
        sender: 'ai',
        tech_id: payload.techId,
        created_at: new Date().toISOString(),
        metadata: {
          processing_time: metadata.processing_time,
          services_count: metadata.services_count || 0,
          total_cost: metadata.total_cost,
          confidence: metadata.confidence || 0,
          source: metadata.source || 'shared_storage_service'
        }
      };

      console.log('🔍 [MessageStorage] Data structure:', {
        session_id: messageData.session_id,
        sender: messageData.sender,
        text_length: messageData.message_text.length,
        metadata_keys: Object.keys(messageData.metadata)
      });

      const supabaseResponse = await fetch(`${url}/rest/v1/demo_messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'apikey': key,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(messageData)
      });

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        console.error('❌ [MessageStorage] Supabase error:', supabaseResponse.status, errorText);
        throw new Error(`Supabase error: ${supabaseResponse.status} - ${errorText}`);
      }

      // Handle response properly to avoid JSON parsing errors
      const responseText = await supabaseResponse.text();
      if (responseText && responseText.trim()) {
        try {
          const savedMessage = JSON.parse(responseText);
          console.log('✅ [MessageStorage] Stored with ID:', savedMessage[0]?.id || 'success');
        } catch (jsonError) {
          console.log('✅ [MessageStorage] Stored successfully (non-JSON response)');
        }
      } else {
        console.log('✅ [MessageStorage] Stored successfully (minimal response)');
      }

    } catch (error) {
      console.error('❌ [MessageStorage] Storage failed:', error.message);
      console.error('❌ [MessageStorage] Stack:', error.stack);
      
      // Don't throw - storage failure shouldn't break the main response
      // Could implement fallback storage here if needed
      console.log('⚠️ [MessageStorage] Continuing without storage (non-blocking error)');
    }
  }

  /**
   * Debug environment variables for troubleshooting
   */
  static debugEnvironment(): void {
    console.log('🔍 [MessageStorage] ENVIRONMENT DEBUG:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SET' : 'UNDEFINED');
    console.log('  VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'UNDEFINED');
    console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'UNDEFINED');
    console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'UNDEFINED');
    console.log('  Available env vars containing "SUPA":', 
      Object.keys(process.env).filter(k => k.includes('SUPA')));
  }
}