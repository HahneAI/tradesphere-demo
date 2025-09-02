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
    console.log('🚀 PRICING AGENT START');
    console.log('Headers:', event.headers);
    console.log('Body length:', event.body?.length || 0);

    // Parse and validate payload
    const payload = parseWebhookPayload(event.body);
    console.log(`📥 Request: "${payload.message}" from ${payload.firstName} (${payload.sessionId})`);

    // Create customer context
    const customerContext: CustomerContext = {
      firstName: payload.firstName,
      jobTitle: payload.jobTitle,
      isReturnCustomer: false, // Could enhance with database lookup
      urgencyLevel: 'routine' // Default, could be enhanced with AI detection
    };

    // STEP 0.5: CONVERSATION CONTEXT INTEGRATION
    console.log('💬 CONVERSATION: Integrating AI-powered conversation context');
    const conversationStart = Date.now();
    
    // Process message with conversation context using AI provider threads
    const aiResponse = await ConversationContextService.processMessageWithContext(
      payload.sessionId,
      payload.message,
      customerContext
    );
    
    console.log(`✅ Conversation processing: ${Date.now() - conversationStart}ms`);

    // Check if AI thinks this needs clarification before proceeding to parameter collection
    if (aiResponse.requiresClarification) {
      console.log('❓ AI detected clarification needed, returning conversational response');
      
      const response: PricingResponse = {
        success: true,
        response: aiResponse.content,
        sessionId: payload.sessionId,
        processingTime: Date.now() - metrics.startTime,
        stage: 'parameter_collection',
        debug: {
          servicesFound: 0,
          confidence: 0
        }
      };

      // Update conversation context with the AI response
      await ConversationContextService.updateContext(payload.sessionId, payload.message, aiResponse.content);

      return createSuccessResponse(response, corsHeaders);
    }

    // STEP 1: PARAMETER COLLECTION (Enhanced with conversation context)
    console.log('🎯 STEP 1: Parameter Collection with Conversation Context');
    const collectionStart = Date.now();
    
    // Get conversation context to enhance parameter collection
    const conversationContext = await ConversationContextService.retrieveContext(payload.sessionId);
    
    // Collect parameters with conversation history for better context
    const collectionResult = await ParameterCollectorService.collectParameters(payload.message);
    
    metrics.parameterCollectionTime = Date.now() - collectionStart;
    console.log(`✅ Parameter collection: ${metrics.parameterCollectionTime}ms`);

    // Check if we need clarification (enhanced with AI conversation)
    if (collectionResult.status === 'incomplete') {
      console.log('❓ Parameter collection incomplete, using AI for intelligent clarification');
      
      // Use AI conversation context to generate more natural clarification
      const clarificationAI = await ConversationContextService.processMessageWithContext(
        payload.sessionId,
        `User said: "${payload.message}". I need clarification for: ${collectionResult.suggestedResponse}`,
        customerContext
      );

      // Update conversation context with both the original message and clarification request
      await ConversationContextService.updateContext(payload.sessionId, payload.message, clarificationAI.content);

      const response: PricingResponse = {
        success: true,
        response: clarificationAI.content,
        sessionId: payload.sessionId,
        processingTime: Date.now() - metrics.startTime,
        stage: 'parameter_collection',
        debug: {
          servicesFound: collectionResult.services.length,
          confidence: collectionResult.confidence
        }
      };

      return createSuccessResponse(response, corsHeaders);
    }

    // STEP 2: PRICING CALCULATION (Replaces Make.com 10-module chain)
    console.log('💰 STEP 2: Pricing Calculation');
    const calculationStart = Date.now();
    
    const pricingCalculator = createPricingCalculator();
    let pricingResult: PricingResult;

    // Handle special irrigation pricing if needed
    const hasIrrigation = collectionResult.services.some(s => s.serviceName.includes('Irrigation'));
    
    if (hasIrrigation) {
      console.log('💧 Using irrigation-specific pricing calculation');
      pricingResult = await pricingCalculator.calculateIrrigationPricing(collectionResult.services);
    } else {
      pricingResult = await pricingCalculator.calculatePricing(collectionResult.services);
    }

    metrics.pricingCalculationTime = Date.now() - calculationStart;
    console.log(`✅ Pricing calculation: ${metrics.pricingCalculationTime}ms`);

    if (!pricingResult.success) {
      throw new Error(`Pricing calculation failed: ${pricingResult.error}`);
    }

    // STEP 3: RESPONSE FORMATTING (Replaces Make.com 5-module chain)
    console.log('📝 STEP 3: Sales Response Formatting');
    const formattingStart = Date.now();
    
    const salesResponse = SalesPersonalityService.formatSalesResponse(
      pricingResult,
      customerContext,
      'pricing'
    );

    metrics.responseFormattingTime = Date.now() - formattingStart;
    metrics.totalTime = Date.now() - metrics.startTime;

    console.log(`✅ Response formatting: ${metrics.responseFormattingTime}ms`);
    console.log(`🏁 TOTAL PROCESSING TIME: ${metrics.totalTime}ms`);
    console.log(`💰 Final price: $${pricingResult.totals.totalCost}`);

    // Log performance comparison
    console.log('📊 PERFORMANCE METRICS:');
    console.log(`  Parameter Collection: ${metrics.parameterCollectionTime}ms`);
    console.log(`  Pricing Calculation: ${metrics.pricingCalculationTime}ms`);
    console.log(`  Response Formatting: ${metrics.responseFormattingTime}ms`);
    console.log(`  TOTAL: ${metrics.totalTime}ms (vs Make.com 30-50s)`);

    // Update conversation context with the final pricing response
    await ConversationContextService.updateContext(
      payload.sessionId, 
      payload.message, 
      salesResponse.message
    );

    // Create final response
    const response: PricingResponse = {
      success: true,
      response: salesResponse.message,
      sessionId: payload.sessionId,
      processingTime: metrics.totalTime,
      stage: 'pricing_calculation',
      debug: {
        servicesFound: pricingResult.services.length,
        confidence: collectionResult.confidence,
        calculationTime: pricingResult.calculationTime
      }
    };

    // Store in Supabase for frontend retrieval
    await storeResponseInSupabase(payload, response, pricingResult);

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