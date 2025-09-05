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

    // Store in Supabase for frontend retrieval if we have pricing data
    if (pricingResult) {
      await storeResponseInSupabase(payload, response, pricingResult);
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
 * Store response in Supabase for frontend retrieval
 */
async function storeResponseInSupabase(payload, response, pricingResult) {
  try {
    console.log('💾 Storing response in Supabase');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials missing, skipping database storage');
      return;
    }

    // Store AI response in demo_messages table
    const messageData = {
      session_id: payload.sessionId,
      message_text: response.response,
      sender: 'ai',
      created_at: new Date().toISOString(),
      metadata: {
        processing_time: response.processingTime,
        services_count: response.debug?.servicesFound || 0,
        total_cost: pricingResult.totals.totalCost,
        confidence: response.debug?.confidence || 0,
        source: 'native_pricing_agent'
      }
    };

    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/demo_messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(messageData)
    });

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('❌ Supabase storage failed:', supabaseResponse.status, error);
    } else {
      console.log('✅ Response stored in Supabase');
    }

  } catch (error) {
    console.error('❌ Error storing in Supabase:', error);
    // Don't throw - storage failure shouldn't break the response
  }
}