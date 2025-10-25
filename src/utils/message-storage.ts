/**
 * TradeSphere Shared Message Storage Service
 *
 * Provides unified Supabase storage functionality for native pricing functions
 * Handles environment variables, error logging, and data structure consistency
 *
 * MIGRATED: Now uses Supabase client for consistent database access and 406 error prevention
 * PHASE 3E: Integrated with CustomerSyncService for automatic customer record creation
 */

import { createClient } from '@supabase/supabase-js';
import { customerSyncService } from '../services/CustomerSyncService';

export interface WebhookPayload {
  sessionId: string;
  userName?: string;      // Renamed from firstName
  userId?: string;        // Renamed from techId (now uses auth.uid())
  companyId?: string;     // User's company_id for multi-tenant analytics
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
  source: 'native_pricing_agent';
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
        userName: payload.userName,
        userId: payload.userId
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
      cleanedResponse = cleanedResponse.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
      
      // ✅ FIXED: Simplified message data matching existing DB schema
      const messageData = {
        session_id: payload.sessionId,
        message_text: cleanedResponse,
        sender: 'ai',
        tech_id: payload.userId || null,  // Now uses auth.uid()
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
        .every(field => Object.prototype.hasOwnProperty.call(messageData, field)));

      console.log('🗄️ DATA TO WRITE:', { 
        sessionId: messageData.session_id, 
        messageLength: messageData.message_text.length,
        sender: messageData.sender,
        techId: messageData.tech_id,
        createdAt: messageData.created_at,
        messageSource: messageData.message_source
      });
      console.log('🔍 [MessageStorage] Complete data structure:', messageData);

      // 🔄 MIGRATION: Use Supabase client instead of direct fetch for 406 error prevention
      console.log('🌐 [MessageStorage] Using Supabase client for demo_messages...');
      console.log('📤 [MessageStorage] Starting database insert...');

      const supabase = createClient(url, key);
      const { data, error } = await supabase
        .from('demo_messages')
        .insert(messageData)
        .select();

      console.log('📥 [MessageStorage] Supabase client response:', {
        success: !error,
        dataLength: data?.length || 0,
        error: error?.message || null
      });

      if (error) {
        console.error('❌ [MessageStorage] Supabase client error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          requestData: messageData
        });
        throw new Error(`Supabase client error: ${error.message}`);
      }

      // Handle successful response
      console.log('📋 [MessageStorage] Processing successful response...');
      if (data && data.length > 0) {
        console.log('✅ [MessageStorage] Stored with ID:', data[0]?.id || 'success');
        console.log('✅ [MessageStorage] Database write confirmed');
      } else {
        console.log('✅ [MessageStorage] Stored successfully');
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
      cleanedUserInput = cleanedUserInput.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
      cleanedAiResponse = cleanedAiResponse.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
      
      // 🏢 PHASE 2: VC Usage record with customer fields + analytics
      const vcUsageData = {
        user_name: payload.userName || null,       // Updated from firstName
        user_tech_id: payload.userId || null,      // Updated from techId (now auth.uid())
        session_id: payload.sessionId,
        beta_code_id: null,                        // Deprecated - no longer used
        company_id: payload.companyId || null,     // Company UUID for multi-tenant analytics
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

      // 🔄 MIGRATION: Use Supabase client for VC Usage table (consistent with other functions)
      console.log('🌐 [VC_USAGE] Using Supabase client for VC Usage...');

      const supabase = createClient(url, key);
      const { data, error } = await supabase
        .from('VC Usage')
        .insert(vcUsageData)
        .select();

      console.log('📥 [VC_USAGE] Supabase client response:', {
        success: !error,
        dataLength: data?.length || 0,
        error: error?.message || null
      });

      if (error) {
        console.error('❌ [VC_USAGE] Supabase client error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          requestData: vcUsageData
        });
        throw new Error(`VC Usage storage failed: ${error.message}`);
      }

      console.log('✅ [VC_USAGE] Permanent record stored successfully');

      // 🔄 PHASE 3E: Auto-sync to customer record after successful VC Usage insert
      if (data && data.length > 0) {
        const vcRecord = data[0];

        // Only attempt sync if we have customer identifying information
        const hasCustomerInfo = payload.customerName || payload.customerEmail || payload.customerPhone;

        if (hasCustomerInfo && payload.companyId) {
          try {
            console.log('🔄 [CUSTOMER_SYNC] Starting auto-sync from chat...');
            console.log('📋 [CUSTOMER_SYNC] Customer info:', {
              name: payload.customerName,
              email: payload.customerEmail,
              phone: payload.customerPhone,
              companyId: payload.companyId
            });

            const syncResult = await customerSyncService.syncFromChat({
              id: vcRecord.id,
              session_id: vcRecord.session_id,
              company_id: payload.companyId,
              user_id: vcRecord.user_tech_id || null,
              customer_name: vcRecord.customer_name || null,
              customer_email: vcRecord.customer_email || null,
              customer_phone: vcRecord.customer_phone || null,
              customer_address: vcRecord.customer_address || null,
              user_input: vcRecord.user_input,
              ai_response: vcRecord.ai_response,
              interaction_number: vcRecord.interaction_number,
              interaction_summary: vcRecord.interaction_summary,
              created_at: vcRecord.created_at
            });

            if (syncResult.success) {
              console.log('✅ [CUSTOMER_SYNC] Auto-synced to customer:', {
                customerId: syncResult.customer_id,
                isNew: syncResult.created,
                matchedBy: syncResult.matched_by
              });
            } else {
              console.warn('⚠️ [CUSTOMER_SYNC] Sync completed but returned failure:', syncResult.error);
            }
          } catch (syncError: any) {
            // Don't break chat if sync fails - this is a non-critical enhancement
            console.warn('⚠️ [CUSTOMER_SYNC] Sync failed (non-blocking):', {
              name: syncError?.name,
              message: syncError?.message,
              stack: syncError?.stack
            });
            console.log('💡 [CUSTOMER_SYNC] Chat will continue normally. Customer can be synced later via Sync Panel.');
          }
        } else {
          console.log('ℹ️ [CUSTOMER_SYNC] Skipping auto-sync - no customer info or company_id in payload');
        }
      }

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