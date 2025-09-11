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
  // 🏢 PHASE 2: Customer details fields (optional)
  customerName?: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface StorageMetadata {
  processing_time?: number;
  services_count?: number;
  total_cost?: number;
  confidence?: number;
  source: 'native_pricing_agent' | 'make_com_webhook';
  calculation_time?: number;
  // 📊 PHASE 2A: Analytics tracking fields
  token_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  ai_model?: string;
  response_length?: number;
  performance_metrics?: {
    gpt_splitting_time?: number;
    parameter_collection_time?: number;
    pricing_calculation_time?: number;
    ai_generation_time?: number;
    total_processing_time?: number;
  };
}

export interface StorageCredentials {
  url: string;
  key: string;
}

export class MessageStorageService {
  
  /**
   * Get Supabase credentials with enhanced fallback logic
   * Handles VITE_, non-VITE_, and hardcoded fallbacks for Netlify compatibility
   */
  static getEnvironmentCredentials(): StorageCredentials {
    console.log('🔍 [MessageStorage] Environment credential resolution...');
    
    // Debug available environment variables
    const availableEnvKeys = Object.keys(process.env).filter(key => 
      key.includes('SUPABASE') || key.includes('DATABASE')
    );
    console.log('🔍 [MessageStorage] Available env keys:', availableEnvKeys);
    
    // Priority order: non-VITE (Netlify), VITE (client), hardcoded (fallback)
    // Note: import.meta is not available in Node.js/Netlify Functions
    let url = process.env.SUPABASE_URL || 
              process.env.VITE_SUPABASE_URL;
              
    let key = process.env.SUPABASE_ANON_KEY || 
              process.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔍 [MessageStorage] Credential sources:', {
      url: url ? (url.includes('supabase') ? 'env_var' : 'unknown') : 'missing',
      key: key ? 'env_var' : 'missing',
      urlPreview: url ? url.substring(0, 30) + '...' : 'MISSING',
      keyPreview: key ? key.substring(0, 20) + '...' : 'MISSING'
    });
    
    // Enhanced fallback with production values
    if (!url || !key) {
      console.log('🔄 [MessageStorage] Using production Supabase credentials (verified working)');
      url = 'https://acdudelebwrzewxqmwnc.supabase.co';
      key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c';
    } else {
      console.log('✅ [MessageStorage] Using environment variables for Supabase credentials');
    }
    
    // Final validation
    if (!url.includes('supabase.co') || !key.startsWith('eyJ')) {
      console.error('🚨 [MessageStorage] Invalid credential format detected!');
      throw new Error('Invalid Supabase credentials - check environment configuration');
    }
    
    console.log('✅ [MessageStorage] Credentials validated successfully');
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
      
      // ✅ FIXED: Simplified message data matching existing DB schema
      const messageData = {
        session_id: payload.sessionId,
        message_text: cleanedResponse,
        sender: 'ai',
        tech_id: payload.techId || null,
        created_at: new Date().toISOString(),
        message_source: metadata.source || 'native_pricing_agent'
        // No metadata field - keeping it simple to match DB schema
      };

      // Compare with original working structure
      console.log('🔍 [MessageStorage] STRUCTURE COMPARISON:');
      console.log('  Target structure: { session_id, message_text, sender, tech_id, created_at, message_source }');
      console.log('  Our structure keys:', Object.keys(messageData));
      console.log('  Schema match:', Object.keys(messageData).length === 6 && 
        ['session_id', 'message_text', 'sender', 'tech_id', 'created_at', 'message_source']
        .every(field => messageData.hasOwnProperty(field)));

      console.log('🗄️ DATA TO WRITE:', { 
        sessionId: messageData.session_id, 
        messageLength: messageData.message_text.length,
        sender: messageData.sender,
        techId: messageData.tech_id,
        createdAt: messageData.created_at,
        messageSource: messageData.message_source
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
   * Store permanent record in VC Usage table with customer data
   * This is separate from demo_messages which is just for polling
   */
  static async storeVCUsageRecord(
    payload: WebhookPayload,
    userInput: string,
    aiResponse: string,
    interactionNumber: number,
    metadata: Partial<StorageMetadata> = {}
  ): Promise<void> {
    try {
      console.log('🏢 [VC_USAGE] Storing permanent usage record...');
      console.log(`📝 [VC_USAGE] Session: ${payload.sessionId}, Interaction: ${interactionNumber}`);
      
      const { url, key } = this.getEnvironmentCredentials();
      
      // Clean responses
      let cleanedUserInput = userInput;
      let cleanedAiResponse = aiResponse;
      
      if (cleanedUserInput.length > 2000) {
        cleanedUserInput = cleanedUserInput.substring(0, 1997) + '...';
      }
      if (cleanedAiResponse.length > 2000) {
        cleanedAiResponse = cleanedAiResponse.substring(0, 1997) + '...';
      }
      
      // Clean problematic characters
      cleanedUserInput = cleanedUserInput.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      cleanedAiResponse = cleanedAiResponse.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // 🏢 PHASE 2: VC Usage record with customer fields + analytics
      const vcUsageData = {
        user_name: payload.firstName || null,
        user_tech_id: payload.techId || null,
        session_id: payload.sessionId,
        beta_code_id: payload.betaCodeId || null,
        user_input: cleanedUserInput,
        ai_response: cleanedAiResponse,
        interaction_number: interactionNumber,
        interaction_summary: `User asked about: ${cleanedUserInput.substring(0, 100)}${cleanedUserInput.length > 100 ? '...' : ''}`,
        created_at: new Date().toISOString(),
        // 🏢 CUSTOMER FIELDS: Include when provided
        customer_name: payload.customerName || null,
        customer_address: payload.customerAddress || null,
        customer_email: payload.customerEmail || null,
        customer_phone: payload.customerPhone || null,
        // 📊 PHASE 2A: Analytics fields
        processing_time_ms: metadata.processing_time || null,
        ai_model: metadata.ai_model || 'claude-sonnet-3.5',
        prompt_tokens: metadata.token_usage?.prompt_tokens || null,
        completion_tokens: metadata.token_usage?.completion_tokens || null,
        total_tokens: metadata.token_usage?.total_tokens || null,
        response_length: metadata.response_length || cleanedAiResponse.length,
        services_count: metadata.services_count || null,
        confidence_score: metadata.confidence || null,
        gpt_splitting_time_ms: metadata.performance_metrics?.gpt_splitting_time || null,
        parameter_collection_time_ms: metadata.performance_metrics?.parameter_collection_time || null,
        pricing_calculation_time_ms: metadata.performance_metrics?.pricing_calculation_time || null,
        ai_generation_time_ms: metadata.performance_metrics?.ai_generation_time || null
      };

      console.log('🏢 [VC_USAGE] Record structure:', {
        sessionId: vcUsageData.session_id,
        interactionNumber: vcUsageData.interaction_number,
        hasCustomerData: !!(payload.customerName || payload.customerEmail),
        customerName: vcUsageData.customer_name,
        userInputLength: vcUsageData.user_input.length,
        aiResponseLength: vcUsageData.ai_response.length
      });

      const endpoint = `${url}/rest/v1/VC Usage`;
      console.log('🌐 [VC_USAGE] Request endpoint:', endpoint);

      const supabaseResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'apikey': key,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(vcUsageData)
      });

      console.log('📥 [VC_USAGE] HTTP response:', {
        status: supabaseResponse.status,
        statusText: supabaseResponse.statusText,
        ok: supabaseResponse.ok
      });

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        console.error('❌ [VC_USAGE] Supabase HTTP error:', {
          status: supabaseResponse.status,
          statusText: supabaseResponse.statusText,
          errorBody: errorText,
          endpoint: endpoint,
          requestData: vcUsageData
        });
        throw new Error(`VC Usage storage failed: ${supabaseResponse.status} - ${errorText}`);
      }

      console.log('✅ [VC_USAGE] Permanent record stored successfully');

    } catch (error) {
      console.error('❌ [VC_USAGE] Storage failed:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Don't throw - storage failure shouldn't break the main response
      console.log('⚠️ [VC_USAGE] Continuing without VC Usage storage (non-blocking error)');
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