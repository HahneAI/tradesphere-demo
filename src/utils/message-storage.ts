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
      console.log('🗄️ STORAGE SERVICE: Starting database write...');
      console.log('💾 [MessageStorage] Storing AI response');
      console.log(`📝 [MessageStorage] Session: ${payload.sessionId}, Length: ${response.length}`);
      console.log('🔍 [MessageStorage] Payload details:', {
        sessionId: payload.sessionId,
        firstName: payload.firstName,
        techId: payload.techId,
        betaCodeId: payload.betaCodeId
      });
      
      const { url, key } = this.getEnvironmentCredentials();
      console.log('🗄️ CREDENTIALS:', { 
        hasUrl: !!url, 
        hasKey: !!key,
        urlLength: url?.length,
        keyLength: key?.length,
        urlStart: url?.substring(0, 30) + '...'
      });
      
      // Ensure response is properly truncated if too long
      let cleanedResponse = response;
      if (cleanedResponse.length > 2000) {
        cleanedResponse = cleanedResponse.substring(0, 1997) + '...';
        console.log('⚠️ [MessageStorage] Response truncated due to length');
      }
      
      // Clean problematic characters
      cleanedResponse = cleanedResponse.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Prepare message data with consistent structure
      // ORIGINAL chat-response.js structure:
      // { session_id, message_text, sender: 'ai', tech_id, created_at }
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

      // Compare with original working structure
      console.log('🔍 [MessageStorage] STRUCTURE COMPARISON:');
      console.log('  Original working (chat-response.js): { session_id, message_text, sender, tech_id, created_at }');
      console.log('  Our structure keys:', Object.keys(messageData));
      console.log('  Extra field (metadata):', !!messageData.metadata);
      console.log('  Core fields match:', ['session_id', 'message_text', 'sender', 'tech_id', 'created_at']
        .every(field => messageData.hasOwnProperty(field)));

      console.log('🗄️ DATA TO WRITE:', { 
        sessionId: messageData.session_id, 
        messageLength: messageData.message_text.length,
        sender: messageData.sender,
        techId: messageData.tech_id,
        hasMetadata: !!messageData.metadata,
        metadataKeys: Object.keys(messageData.metadata)
      });
      console.log('🔍 [MessageStorage] Complete data structure:', messageData);

      const endpoint = `${url}/rest/v1/demo_messages`;
      console.log('🌐 [MessageStorage] Request endpoint:', endpoint);
      console.log('📤 [MessageStorage] Starting HTTP request...');

      const supabaseResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'apikey': key,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(messageData)
      });

      console.log('📥 [MessageStorage] HTTP response received:', {
        status: supabaseResponse.status,
        statusText: supabaseResponse.statusText,
        ok: supabaseResponse.ok,
        headers: Object.fromEntries(supabaseResponse.headers.entries())
      });

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        console.error('❌ [MessageStorage] Supabase HTTP error:', {
          status: supabaseResponse.status,
          statusText: supabaseResponse.statusText,
          errorBody: errorText,
          endpoint: endpoint,
          requestData: messageData
        });
        throw new Error(`Supabase HTTP error: ${supabaseResponse.status} - ${errorText}`);
      }

      // Handle response properly to avoid JSON parsing errors
      console.log('📋 [MessageStorage] Processing response...');
      const responseText = await supabaseResponse.text();
      console.log('📋 [MessageStorage] Response text:', responseText || '(empty)');
      
      if (responseText && responseText.trim()) {
        try {
          const savedMessage = JSON.parse(responseText);
          console.log('✅ [MessageStorage] Stored with ID:', savedMessage[0]?.id || 'success');
          console.log('✅ [MessageStorage] Database write confirmed');
        } catch (jsonError) {
          console.log('✅ [MessageStorage] Stored successfully (non-JSON response)');
          console.log('✅ [MessageStorage] Database write confirmed');
        }
      } else {
        console.log('✅ [MessageStorage] Stored successfully (minimal response)');
        console.log('✅ [MessageStorage] Database write confirmed');
      }

    } catch (error) {
      console.error('❌ [MessageStorage] Storage failed with error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      
      // Don't throw - storage failure shouldn't break the main response
      // Could implement fallback storage here if needed
      console.log('⚠️ [MessageStorage] Continuing without storage (non-blocking error)');
      
      // Re-throw the error so the calling function can handle it
      throw error;
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