/**
 * TradeSphere Pricing Agent - Native TypeScript replacement for Make.com
 * 
 * Single comprehensive Netlify Function that replicates 22 Make.com modules:
 * - Parameter Collector (7 modules)
 * - Pricing Calculator (10 modules) 
 * - Response Formatter (5 modules)
 * 
 * Target: 3-8s response time vs 30-50s Make.com
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { ParameterCollectorService, CollectionResult } from '../../src/services/ai-engine/ParameterCollectorService';
import { PricingCalculatorService, createPricingCalculator, PricingResult } from '../../src/services/ai-engine/PricingCalculatorService';
import { SalesPersonalityService, CustomerContext } from '../../src/services/ai-engine/SalesPersonalityService';
import { ConversationContextService } from '../../src/services/ai-engine/ConversationContextService';
import { GPTServiceSplitter } from '../../src/services/ai-engine/GPTServiceSplitter';
import { MainChatAgentService } from '../../src/services/ai-engine/MainChatAgentService';

// Types for webhook payload (same as Make.com)
interface WebhookPayload {
  message: string;
  timestamp: string;
  sessionId: string;
  source: string;
  techId: string;
  firstName: string;
  jobTitle: string;
  betaCodeId: number;
}

interface PricingResponse {
  success: boolean;
  response: string;
  sessionId: string;
  processingTime: number;
  stage: 'parameter_collection' | 'pricing_calculation' | 'error';
  debug?: {
    servicesFound: number;
    confidence: number;
    calculationTime?: number;
  };
}

// Performance tracking
interface PerformanceMetrics {
  startTime: number;
  parameterCollectionTime?: number;
  pricingCalculationTime?: number;
  responseFormattingTime?: number;
  totalTime: number;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const metrics: PerformanceMetrics = {
    startTime: Date.now(),
    totalTime: 0
  };

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
    
    metrics.parameterCollectionTime = Date.now() - collectionStart;
    console.log(`✅ Parameter Collection: ${metrics.parameterCollectionTime}ms`);
    console.log(`📊 Services: ${collectionResult.services.length} complete + ${collectionResult.incompleteServices.length} incomplete`);

    // STEP 2: Pricing Calculation (only for complete services)
    let pricingResult: PricingResult | undefined;
    
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

      metrics.pricingCalculationTime = Date.now() - calculationStart;
      console.log(`✅ Pricing Calculation: ${metrics.pricingCalculationTime}ms`);

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

    metrics.totalTime = Date.now() - metrics.startTime;

    console.log('📊 PERFORMANCE METRICS:');
    console.log(`  GPT Splitting: ${Date.now() - gptSplitStart}ms`);
    console.log(`  Parameter Collection: ${metrics.parameterCollectionTime}ms`);
    console.log(`  Pricing Calculation: ${metrics.pricingCalculationTime || 0}ms`);
    console.log(`  Main Chat Agent: ${chatAgentTime}ms`);
    console.log(`  TOTAL: ${metrics.totalTime}ms (vs Make.com 30-50s)`);

    // Create final response
    const response: PricingResponse = {
      success: true,
      response: chatAgentResponse.message,
      sessionId: payload.sessionId,
      processingTime: metrics.totalTime,
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
    return createSuccessResponse(response, corsHeaders);

  } catch (error) {
    metrics.totalTime = Date.now() - metrics.startTime;
    
    console.error('❌ PRICING AGENT ERROR:', error);
    console.error('Stack:', error.stack);

    const errorResponse: PricingResponse = {
      success: false,
      response: SalesPersonalityService.formatErrorMessage(error.message),
      sessionId: extractSessionId(event.body),
      processingTime: metrics.totalTime,
      stage: 'error'
    };

    return {
      statusCode: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': metrics.totalTime.toString()
      },
      body: JSON.stringify(errorResponse),
    };
  }
};

/**
 * Parse and validate webhook payload
 */
function parseWebhookPayload(body: string | null): WebhookPayload {
  if (!body) {
    throw new Error('Request body is empty');
  }

  let payload: any;
  
  try {
    payload = JSON.parse(body);
  } catch (error) {
    throw new Error(`Invalid JSON payload: ${error.message}`);
  }

  // Validate required fields (same as Make.com webhook)
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
function extractSessionId(body: string | null): string {
  try {
    const payload = JSON.parse(body || '{}');
    return payload.sessionId || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Store response in Supabase for frontend retrieval
 * Maintains compatibility with existing chat-messages.js function
 */
async function storeResponseInSupabase(
  payload: WebhookPayload, 
  response: PricingResponse, 
  pricingResult: PricingResult
): Promise<void> {
  
  try {
    console.log('💾 Storing response in Supabase');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase credentials missing, skipping database storage');
      return;
    }

    // Store AI response in demo_messages table (same format as Make.com)
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
        source: 'native_pricing_agent' // vs 'make_com'
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

/**
 * Create success response with proper headers
 */
function createSuccessResponse(response: PricingResponse, corsHeaders: Record<string, string>) {
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Processing-Time': response.processingTime.toString(),
      'X-Stage': response.stage,
      'X-Services-Found': response.debug?.servicesFound?.toString() || '0',
      'X-Confidence': (response.debug?.confidence * 100)?.toFixed(1) || '0'
    },
    body: JSON.stringify(response),
  };
}

/**
 * Health check endpoint for testing
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    console.log('🔍 Health check starting');
    
    // Test Google Sheets connection
    const pricingCalculator = createPricingCalculator();
    const testResult = await pricingCalculator.runTestCalculation();
    
    if (!testResult) {
      console.error('❌ Health check failed: Pricing calculation test failed');
      return false;
    }
    
    console.log('✅ Health check passed');
    return true;
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
};

// Export for testing
export { parseWebhookPayload, extractSessionId };