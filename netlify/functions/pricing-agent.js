/**
 * TradeSphere Pricing Agent - Production Version with TypeScript Integration
 * 
 * Uses ES6 imports that esbuild can bundle automatically
 * Imports TypeScript files directly - esbuild handles compilation
 */

// ES6 imports for TypeScript services - esbuild will bundle these
import { ParameterCollectorService } from '../../src/services/ai-engine/ParameterCollectorService.ts';
import { createPricingCalculator } from '../../src/services/ai-engine/PricingCalculatorService.ts';
import { SalesPersonalityService } from '../../src/services/ai-engine/SalesPersonalityService.ts';
import { ConversationContextService } from '../../src/services/ai-engine/ConversationContextService.ts';
import { GPTServiceSplitter } from '../../src/services/ai-engine/GPTServiceSplitter.ts';
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
    
    const chatAgentInput = {
      originalMessage: payload.message,
      sessionId: payload.sessionId,
      firstName: payload.firstName,
      collectionResult,
      pricingResult,
      betaCodeId: payload.betaCodeId
    };

    const chatAgentResponse = await MainChatAgentService.generateResponse(chatAgentInput);
    
    const chatAgentTime = Date.now() - chatAgentStart;
    console.log(`✅ Main Chat Agent: ${chatAgentTime}ms`);
    console.log(`📋 Response Type: ${chatAgentResponse.conversationType}`);
    console.log('🤖 AI RESPONSE CONTENT:', chatAgentResponse.message);
    console.log('🤖 RESPONSE LENGTH:', chatAgentResponse.message.length);

    const totalTime = Date.now() - startTime;

    console.log('📊 PERFORMANCE METRICS:');
    console.log(`  GPT Splitting: ${Date.now() - gptSplitStart}ms`);
    console.log(`  Parameter Collection: ${parameterCollectionTime}ms`);
    console.log(`  Pricing Calculation: ${pricingCalculationTime}ms`);
    console.log(`  Main Chat Agent: ${chatAgentTime}ms`);
    console.log(`  TOTAL: ${totalTime}ms (vs Make.com 30-50s)`);

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

    // Store ALL responses in Supabase (clarifications AND pricing)
    const storageMetadata = {
      processing_time: response.processingTime,
      services_count: response.debug?.servicesFound || 0,
      total_cost: pricingResult?.totals?.totalCost || null,
      confidence: response.debug?.confidence || 0,
      source: 'native_pricing_agent'
    };

    console.log('💾 ABOUT TO STORE RESPONSE (ALL RESPONSES):', {
      sessionId: payload.sessionId,
      responseLength: response.response.length,
      hasMetadata: !!storageMetadata,
      metadataKeys: Object.keys(storageMetadata),
      pricingResultExists: !!pricingResult,
      responseType: pricingResult ? 'pricing' : 'clarification'
    });

    try {
      await MessageStorageService.storeAIResponse(payload, response.response, storageMetadata);
      console.log('✅ STORAGE CONFIRMED: Record written to database');
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

  return {
    message: payload.message,
    timestamp: payload.timestamp,
    sessionId: payload.sessionId,
    source: payload.source,
    techId: payload.techId,
    firstName: payload.firstName,
    jobTitle: payload.jobTitle,
    betaCodeId: parseInt(payload.betaCodeId)
  };
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
          created_at: new Date().toISOString()
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