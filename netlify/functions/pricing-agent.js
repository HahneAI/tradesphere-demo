/**
 * TradeSphere Pricing Agent - Production Version with TypeScript Integration
 * 
 * Uses ES6 imports that esbuild can bundle automatically
 * Imports TypeScript files directly - esbuild handles compilation
 */

// ES6 imports for TypeScript services - esbuild will bundle these
import { ParameterCollectorService } from '../../src/pricing-system/ai-engine/parameter-collection/ParameterCollectorService.ts';
import { createPricingCalculator } from '../../src/pricing-system/ai-engine/pricing-calculation/PricingCalculatorService.ts';
import { SalesPersonalityService } from '../../src/services/ai-engine/SalesPersonalityService.ts';
import { ConversationContextService } from '../../src/services/ai-engine/ConversationContextService.ts';
import { GPTServiceSplitter } from '../../src/pricing-system/ai-engine/text-processing/GPTServiceSplitter.ts';
import { MainChatAgentService } from '../../src/services/ai-engine/MainChatAgentService.ts';
import { MessageStorageService } from '../../src/utils/message-storage.ts';

export const handler = async (event, context) => {
  const startTime = Date.now();

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    console.log('🚀 PRICING AGENT START - GPT-First Workflow with MainChatAgent');
    console.log('Headers:', event.headers);
    console.log('Body length:', event.body?.length || 0);

    // Parse and validate payload
    const payload = parseWebhookPayload(event.body);
    console.log(`📥 Request: "${payload.message}" from ${payload.firstName} (${payload.sessionId})`);

    // STEP 1A: GPT Service Splitting
    console.log('🤖 STEP 1A: GPT SERVICE SPLITTING');
    const gptSplitStart = Date.now();
    
    const gptSplitter = new GPTServiceSplitter();
    const splitResult = await gptSplitter.analyzeAndSplit(payload.message);
    
    console.log(`✅ GPT Splitting: ${Date.now() - gptSplitStart}ms`);
    console.log(`📊 Split Results: ${splitResult.service_count} services in ${splitResult.detected_categories.length} categories`);

    // STEP 1B: Enhanced Parameter Collection
    console.log('🎯 STEP 1B: ENHANCED PARAMETER COLLECTION');
    const collectionStart = Date.now();
    
    const collectionResult = await ParameterCollectorService.collectParametersWithSplitServices(
      payload.message, 
      splitResult
    );
    
    const parameterCollectionTime = Date.now() - collectionStart;
    console.log(`✅ Parameter Collection: ${parameterCollectionTime}ms`);
    console.log(`📊 Services: ${collectionResult.services.length} complete + ${collectionResult.incompleteServices.length} incomplete`);

    // STEP 2: Pricing Calculation (only for complete services)
    let pricingResult = undefined;
    let pricingCalculationTime = 0;
    
    if (collectionResult.services.length > 0) {
      console.log('💰 STEP 2: PRICING CALCULATION');
      const calculationStart = Date.now();
      
      const pricingCalculator = createPricingCalculator();
      const hasIrrigation = collectionResult.services.some(s => s.serviceName.includes('Irrigation'));
      
      if (hasIrrigation) {
        console.log(`💧 Using irrigation-specific pricing for Beta Code ${payload.betaCodeId}`);
        pricingResult = await pricingCalculator.calculateIrrigationPricing(collectionResult.services, payload.betaCodeId);
      } else {
        pricingResult = await pricingCalculator.calculatePricing(collectionResult.services, payload.betaCodeId);
      }

      pricingCalculationTime = Date.now() - calculationStart;
      console.log(`✅ Pricing Calculation: ${pricingCalculationTime}ms`);

      if (!pricingResult.success) {
        throw new Error(`Pricing calculation failed: ${pricingResult.error}`);
      }
    } else {
      console.log('⚠️ No complete services found, skipping pricing calculation');
    }

    // STEP 3: Main Chat Agent (Final AI Orchestration)
    console.log('🧠 STEP 3: MAIN CHAT AGENT ORCHESTRATION');
    const chatAgentStart = Date.now();
    
    // 📋 PHASE 2C: Query previous interaction context for customer continuity
    let previousContext = null;
    if (payload.customerName) {
      console.log('📋 Querying previous interaction context for customer:', payload.customerName);
      try {
        previousContext = await queryCustomerContext(payload.customerName, payload.techId);
        if (previousContext) {
          console.log('📋 Previous context found:', {
            summary: previousContext.interaction_summary?.substring(0, 100) + '...',
            lastInteraction: previousContext.created_at
          });
        }
      } catch (error) {
        console.warn('⚠️ Failed to query customer context:', error.message);
      }
    }

    const chatAgentInput = {
      originalMessage: payload.message,
      sessionId: payload.sessionId,
      firstName: payload.firstName,
      collectionResult,
      pricingResult,
      betaCodeId: payload.betaCodeId,
      // 📋 PHASE 2C: Include previous interaction context
      customerName: payload.customerName,
      previousContext: previousContext
    };

    const chatAgentResponse = await MainChatAgentService.generateResponse(chatAgentInput);
    
    const chatAgentTime = Date.now() - chatAgentStart;
    console.log(`✅ Main Chat Agent: ${chatAgentTime}ms`);
    console.log(`📋 Response Type: ${chatAgentResponse.conversationType}`);
    console.log('🤖 AI RESPONSE CONTENT:', chatAgentResponse.message);
    console.log('🤖 RESPONSE LENGTH:', chatAgentResponse.message.length);

    const totalTime = Date.now() - startTime;

    // 📊 PHASE 2A: Enhanced performance metrics logging
    console.log('📊 COMPREHENSIVE PERFORMANCE ANALYTICS:');
    console.log(`  🤖 GPT Splitting: ${Date.now() - gptSplitStart}ms | Services: ${splitResult.service_count}`);
    console.log(`  🎯 Parameter Collection: ${parameterCollectionTime}ms | Complete: ${collectionResult.services.length} | Incomplete: ${collectionResult.incompleteServices.length}`);
    console.log(`  💰 Pricing Calculation: ${pricingCalculationTime}ms | Success: ${!!pricingResult?.success}`);
    console.log(`  🧠 Main Chat Agent: ${chatAgentTime}ms | Response: ${chatAgentResponse.message.length} chars`);
    console.log(`  ⚡ TOTAL PIPELINE: ${totalTime}ms | Grade: ${totalTime < 3000 ? 'A' : totalTime < 5000 ? 'B' : 'C'} | vs Make.com: ${((30000 - totalTime) / 1000).toFixed(1)}s faster`);
    
    // 👤 Customer context analytics
    if (payload.customerName || payload.customerEmail) {
      console.log('👤 CUSTOMER CONTEXT ANALYTICS:', {
        customerName: payload.customerName || 'Not provided',
        hasEmail: !!payload.customerEmail,
        hasPhone: !!payload.customerPhone,
        hasAddress: !!payload.customerAddress,
        sessionId: payload.sessionId
      });
    }

    // Create final response
    const response = {
      success: true,
      response: chatAgentResponse.message,
      sessionId: payload.sessionId,
      processingTime: totalTime,
      stage: chatAgentResponse.requiresClarification ? 'parameter_collection' : 'pricing_calculation',
      debug: {
        servicesFound: collectionResult.services.length + collectionResult.incompleteServices.length,
        confidence: collectionResult.confidence,
        calculationTime: pricingResult?.calculationTime
      }
    };

    // 📊 PHASE 2A: Comprehensive analytics metadata
    const storageMetadata = {
      source: 'native_pricing_agent',
      // Performance metrics collected during execution
      performance_metrics: {
        gpt_splitting_time: Date.now() - gptSplitStart,
        parameter_collection_time: parameterCollectionTime,
        pricing_calculation_time: pricingCalculationTime,
        ai_generation_time: chatAgentTime,
        total_processing_time: totalTime
      },
      // Service analysis metrics
      services_count: collectionResult.services.length + collectionResult.incompleteServices.length,
      confidence: collectionResult.confidence,
      // Response analytics
      response_length: chatAgentResponse.message.length,
      ai_model: 'claude-sonnet-3.5',
      // Token usage from Claude/OpenAI API response
      token_usage: {
        prompt_tokens: chatAgentResponse.tokenUsage?.promptTokens || null,
        completion_tokens: chatAgentResponse.tokenUsage?.completionTokens || null,
        total_tokens: chatAgentResponse.tokenUsage?.totalTokens || null
      },
      // Processing context
      processing_time: totalTime,
      calculation_time: pricingResult?.calculationTime || null
    };

    console.log('💾 ABOUT TO STORE RESPONSE WITH ANALYTICS:', {
      sessionId: payload.sessionId,
      responseLength: chatAgentResponse.message.length,
      source: storageMetadata.source,
      responseType: pricingResult ? 'pricing' : 'clarification',
      // 📊 PHASE 2A: Analytics summary
      analytics: {
        totalProcessingTime: storageMetadata.processing_time,
        servicesFound: storageMetadata.services_count,
        confidence: storageMetadata.confidence,
        hasCustomerData: !!(payload.customerName || payload.customerEmail),
        performanceGrade: totalTime < 3000 ? 'A' : totalTime < 5000 ? 'B' : 'C'
      }
    });

    try {
      // 💾 DUAL STORAGE: Store in both demo_messages (polling) AND VC Usage (permanent)
      
      // 1. Store in demo_messages for polling (existing behavior)
      await MessageStorageService.storeAIResponse(payload, response.response, storageMetadata);
      console.log('✅ DEMO_MESSAGES STORAGE: Polling record stored');
      
      // 2. 🏢 PHASE 2: Store in VC Usage for permanent records with customer data
      console.log(`🔢 [INTERACTION_DEBUG] About to get interaction number for session: ${payload.sessionId}`);
      const interactionNumber = await getNextInteractionNumber(payload.sessionId);
      console.log(`🔢 [INTERACTION_DEBUG] Retrieved interaction number: ${interactionNumber} for session: ${payload.sessionId}`);
      
      console.log(`💾 [STORAGE_DEBUG] About to store VC Usage record:`, {
        sessionId: payload.sessionId,
        interactionNumber: interactionNumber,
        userInput: payload.message.substring(0, 50) + '...',
        aiResponse: response.response.substring(0, 50) + '...'
      });
      
      await MessageStorageService.storeVCUsageRecord(
        payload, 
        payload.message, 
        response.response, 
        interactionNumber, 
        storageMetadata
      );
      console.log('✅ VC_USAGE STORAGE: Permanent record stored with customer data');
      
      // 3. 🧠 PHASE 2B: Trigger dedicated summary function (synchronous, waits for completion)
      console.log('🚀 SUMMARY_TRIGGER: Calling dedicated generate-interaction-summary function');
      try {
        await triggerSummaryFunction(payload.sessionId, interactionNumber, payload.customerName, payload.firstName, payload.message, response.response, previousContext);
        console.log('✅ SUMMARY_TRIGGER: Summary function completed successfully');
      } catch (error) {
        console.error('❌ SUMMARY_TRIGGER: Summary trigger failed:', error.message);
      }
      
    } catch (storageError) {
      console.error('❌ STORAGE FAILED:', storageError.message);
      console.error('🔍 STORAGE ERROR DETAILS:', storageError);
      console.error('🔍 STORAGE ERROR STACK:', storageError.stack);
      
      // Try exact chat-response.js format as fallback
      console.log('🔄 TRYING EXACT CHAT-RESPONSE.JS FORMAT...');
      const fallbackResult = await storeExactChatResponseFormat(payload.sessionId, response.response, payload.techId);
      console.log('🔄 FALLBACK RESULT:', fallbackResult ? 'SUCCESS' : 'FAILED');
    }

    console.log(`💬 Conversation context updated for session ${payload.sessionId}`);
    
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': totalTime.toString(),
        'X-Stage': response.stage,
        'X-Services-Found': response.debug?.servicesFound?.toString() || '0',
        'X-Confidence': (response.debug?.confidence * 100)?.toFixed(1) || '0'
      },
      body: JSON.stringify(response),
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error('❌ PRICING AGENT ERROR:', error);
    console.error('Stack:', error.stack);

    const errorResponse = {
      success: false,
      response: SalesPersonalityService.formatErrorMessage(error.message),
      sessionId: extractSessionId(event.body),
      processingTime: totalTime,
      stage: 'error'
    };

    return {
      statusCode: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': totalTime.toString()
      },
      body: JSON.stringify(errorResponse),
    };
  }
};

/**
 * Parse and validate webhook payload
 */
function parseWebhookPayload(body) {
  if (!body) {
    throw new Error('Request body is empty');
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    throw new Error(`Invalid JSON payload: ${error.message}`);
  }

  // Validate required fields
  const requiredFields = ['message', 'timestamp', 'sessionId', 'source', 'techId', 'firstName', 'jobTitle', 'betaCodeId'];
  
  for (const field of requiredFields) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  const parsedPayload = {
    message: payload.message,
    timestamp: payload.timestamp,
    sessionId: payload.sessionId,
    source: payload.source,
    techId: payload.techId,
    firstName: payload.firstName,
    jobTitle: payload.jobTitle,
    betaCodeId: parseInt(payload.betaCodeId),
    // 🏢 PHASE 2: Optional customer fields (backward compatible)
    customerName: payload.customerName || null,
    customerAddress: payload.customerAddress || null,
    customerEmail: payload.customerEmail || null,
    customerPhone: payload.customerPhone || null
  };

  // 🔍 DEBUG: Log all customer fields
  console.log('🏢 [PAYLOAD_DEBUG] Customer fields in payload:', {
    hasCustomerName: !!parsedPayload.customerName,
    hasCustomerAddress: !!parsedPayload.customerAddress,
    hasCustomerEmail: !!parsedPayload.customerEmail,
    hasCustomerPhone: !!parsedPayload.customerPhone,
    customerName: parsedPayload.customerName,
    customerEmail: parsedPayload.customerEmail?.substring(0, 20) + '...'
  });

  return parsedPayload;
}

/**
 * Extract session ID from payload for error cases
 */
function extractSessionId(body) {
  try {
    const payload = JSON.parse(body || '{}');
    return payload.sessionId || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Debug environment variables for troubleshooting
 * (Replaced old storeResponseInSupabase with shared service)
 */
function debugEnvironmentVariables() {
  MessageStorageService.debugEnvironment();
}

/**
 * Get next interaction number for session (auto-incrementing)
 * Queries VC Usage table to find highest interaction_number for session and increments by 1
 */
async function getNextInteractionNumber(sessionId) {
  console.log(`🔢 [INTERACTION_DEBUG] Getting next interaction number for session: ${sessionId}`);
  console.log(`🔢 [INTERACTION_DEBUG] SessionId type: ${typeof sessionId}, length: ${sessionId?.length}`);
  
  try {
    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL || 'https://acdudelebwrzewxqmwnc.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c';
    
    // Query for max interaction number in this session
    const queryParams = new URLSearchParams({
      'session_id': `eq.${sessionId}`,
      'select': 'interaction_number,session_id,created_at',
      'order': 'interaction_number.desc',
      'limit': '10'
    });
    
    const queryUrl = `${supabaseUrl}/rest/v1/VC Usage?${queryParams}`;
    console.log(`🔢 [INTERACTION_DEBUG] Query URL: ${queryUrl}`);
    
    const response = await fetch(queryUrl, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Accept': 'application/json'
      }
    });
    
    console.log(`🔢 [INTERACTION_DEBUG] Response status: ${response.status}, ok: ${response.ok}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🔢 [INTERACTION_DEBUG] Query failed: ${response.status} - ${errorText}`);
      console.warn(`⚠️ Failed to query interaction number, defaulting to 1: ${response.status}`);
      return 1;
    }
    
    const records = await response.json();
    console.log(`🔢 [INTERACTION_DEBUG] Found ${records.length} existing records for session ${sessionId}`);
    
    if (records.length > 0) {
      console.log(`🔢 [INTERACTION_DEBUG] Existing interactions:`, records.map(r => ({ 
        interaction_number: r.interaction_number, 
        session_id: r.session_id,
        created_at: r.created_at 
      })));
    }
    
    const nextNumber = records.length > 0 ? (records[0].interaction_number + 1) : 1;
    
    console.log(`🔢 [INTERACTION_DEBUG] Calculated next interaction number: ${nextNumber}`);
    console.log(`🔢 [INTERACTION_DEBUG] Previous max: ${records.length > 0 ? records[0].interaction_number : 'none'}`);
    
    return nextNumber;
    
  } catch (error) {
    console.error('🔢 [INTERACTION_DEBUG] Error getting interaction number:', {
      error: error.message,
      stack: error.stack,
      sessionId: sessionId
    });
    console.error('❌ Error getting interaction number, defaulting to 1:', error);
    return 1;
  }
}

/**
 * Trigger dedicated interaction summary function
 */
async function triggerSummaryFunction(sessionId, interactionNumber, customerName, userName, userInput, aiResponse, previousContext) {
  console.log('🔍 [DEBUG] triggerSummaryFunction ENTERED');
  console.log('🔍 [DEBUG] Function parameters:', {
    sessionId: sessionId,
    interactionNumber: interactionNumber,
    customerName: customerName || null,
    userName: userName || null,  // NEW: logged-in user's name
    userInputLength: userInput?.length,
    aiResponseLength: aiResponse?.length,
    hasPreviousContext: !!previousContext
  });
  
  try {
    console.log('🔍 [DEBUG] Building summary function URL...');
    console.log('🔍 [DEBUG] process.env.URL:', process.env.URL);
    
    const summaryUrl = process.env.URL ? 
      `${process.env.URL}/.netlify/functions/generate-interaction-summary` :
      'https://tradesphere-demo.netlify.app/.netlify/functions/generate-interaction-summary';
    
    console.log('📤 SUMMARY_CALL: Triggering summary at:', summaryUrl);
    
    const payload = {
      sessionId,
      interactionNumber,
      customerName: customerName || null,  // Fix: null instead of undefined
      userName: userName || null,  // NEW: logged-in user's name
      userInput,    // Fix: actual content, not just length
      aiResponse,   // Fix: actual content, not just length
      previousContext
    };
    
    console.log('🔍 [DEBUG] Payload being sent:', {
      sessionId: payload.sessionId,
      interactionNumber: payload.interactionNumber,
      customerName: payload.customerName || null,
      userName: payload.userName || null,  // NEW: logged-in user's name
      userInputLength: payload.userInput?.length,
      aiResponseLength: payload.aiResponse?.length,
      hasPreviousContext: !!payload.previousContext,
      actualUserInput: payload.userInput?.substring(0, 50) + '...',
      actualAiResponse: payload.aiResponse?.substring(0, 50) + '...'
    });
    
    console.log('🔍 [DEBUG] About to make fetch call with 8-second timeout...');
    
    // Add 8-second timeout protection so it doesn't block pricing agent indefinitely
    const response = await Promise.race([
      fetch(summaryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Summary function call timeout after 8 seconds')), 8000)
      )
    ]);
    
    console.log('🔍 [DEBUG] Fetch call completed');
    console.log('📥 SUMMARY_RESPONSE: Status:', response.status, response.statusText);
    console.log('📥 SUMMARY_RESPONSE: Headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUMMARY_CALL: Summary generated successfully');
      console.log('✅ SUMMARY_RESULT:', result);
    } else {
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error('❌ SUMMARY_CALL: Failed with status:', response.status);
      console.error('❌ SUMMARY_ERROR_BODY:', errorText);
      console.error('❌ SUMMARY_ERROR_HEADERS:', Object.fromEntries(response.headers));
    }
    
  } catch (error) {
    console.error('❌ SUMMARY_CALL: Caught exception in triggerSummaryFunction:', error);
    console.error('❌ SUMMARY_ERROR_TYPE:', typeof error);
    console.error('❌ SUMMARY_ERROR_MESSAGE:', error.message);
    console.error('❌ SUMMARY_ERROR_STACK:', error.stack);
  }
  
  console.log('🔍 [DEBUG] triggerSummaryFunction EXITING');
}

/**
 * Store using EXACT chat-response.js format and code
 * Copied directly from working chat-response.js implementation
 */
async function storeExactChatResponseFormat(sessionId, responseText, techId) {
  console.log('🔄 EXACT CHAT-RESPONSE FORMAT: Starting...');
  
  try {
    // Clean the response exactly like chat-response.js does
    let decodedResponse = responseText;
    
    // Limit response size to prevent errors
    if (decodedResponse && decodedResponse.length > 2000) {
      decodedResponse = decodedResponse.substring(0, 1997) + '...';
      console.log('⚠️ Response truncated due to length:', decodedResponse.length);
    }
    
    // Clean any problematic characters
    if (decodedResponse) {
      decodedResponse = decodedResponse.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    const supabaseResponse = await fetch(
      'https://acdudelebwrzewxqmwnc.supabase.co/rest/v1/demo_messages',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c',
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          session_id: sessionId,
          message_text: decodedResponse,
          sender: 'ai',
          tech_id: techId,
          created_at: new Date().toISOString(),
          message_source: 'native_pricing_agent'
        })
      }
    );

    console.log('🔄 EXACT FORMAT RESPONSE:', {
      status: supabaseResponse.status,
      statusText: supabaseResponse.statusText,
      ok: supabaseResponse.ok
    });

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      console.error('🔄 EXACT FORMAT FAILED:', supabaseResponse.status, errorText);
      return false;
    }

    // Handle Supabase response properly to avoid JSON parsing errors
    const responseText = await supabaseResponse.text();
    if (responseText && responseText.trim()) {
      try {
        const savedMessage = JSON.parse(responseText);
        console.log('✅ EXACT FORMAT SUCCESS: Stored with ID:', savedMessage[0]?.id || 'success');
      } catch (jsonError) {
        console.log('✅ EXACT FORMAT SUCCESS: Stored (non-JSON response)');
      }
    } else {
      console.log('✅ EXACT FORMAT SUCCESS: Stored (minimal response)');
    }

    return true;

  } catch (error) {
    console.error('🔄 EXACT FORMAT ERROR:', error.message);
    console.error('🔄 EXACT FORMAT STACK:', error.stack);
    return false;
  }
}

/**
 * 📋 PHASE 2C: Query customer's last interaction for context continuity
 */
async function queryCustomerContext(customerName, techId) {
  try {
    console.log('📋 CUSTOMER CONTEXT: Querying last interaction for:', customerName);
    
    const supabaseUrl = 'https://acdudelebwrzewxqmwnc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c';
    
    const queryParams = new URLSearchParams({
      'customer_name': `eq.${customerName}`,
      'user_tech_id': `eq.${techId}`,
      'order': 'interaction_number.desc',
      'limit': '1',
      'select': 'interaction_summary,user_input,ai_response,created_at,interaction_number'
    });
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/VC Usage?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Query failed: ${response.status}`);
    }
    
    const results = await response.json();
    console.log('📋 CUSTOMER CONTEXT: Query results:', results.length, 'records found');
    
    return results.length > 0 ? results[0] : null;
    
  } catch (error) {
    console.error('📋 CUSTOMER CONTEXT ERROR:', error.message);
    return null;
  }
}

/**
 * Manual database test to verify Supabase connection
 * Tests the exact same format that chat-response.js uses
 */
async function testManualDatabaseWrite(sessionId) {
  console.log('🧪 MANUAL DATABASE TEST: Starting...');
  
  try {
    const testData = {
      session_id: sessionId,
      message_text: 'MANUAL TEST: Database connection verification from native function',
      sender: 'ai',
      tech_id: 'test_tech_123',
      created_at: new Date().toISOString()
    };

    console.log('🧪 TEST DATA:', testData);

    const response = await fetch('https://acdudelebwrzewxqmwnc.supabase.co/rest/v1/demo_messages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(testData)
    });

    console.log('🧪 MANUAL TEST RESPONSE:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🧪 MANUAL TEST FAILED:', errorText);
      return false;
    }

    console.log('✅ MANUAL TEST PASSED: Direct database write successful');
    return true;

  } catch (error) {
    console.error('🧪 MANUAL TEST ERROR:', error.message);
    console.error('🧪 MANUAL TEST STACK:', error.stack);
    return false;
  }
}