/**
 * Dedicated Interaction Summary Generator
 *
 * Generates intelligent business-focused summaries for customer interactions using OpenAI GPT-4o-mini
 * Called by pricing agent after each interaction is stored in VC Usage table
 * Uses session_id priority for database updates and comprehensive debug logging
 *
 * MIGRATED: Now uses Supabase client for consistent database access and 406 error prevention
 *
 * Endpoint: POST /.netlify/functions/generate-interaction-summary
 * Payload: { sessionId, interactionNumber, customerName, userInput, aiResponse, previousContext? }
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Generate intelligent interaction summary using OpenAI GPT-4o-mini
 */
async function generateInteractionSummary(customerName, userName, sessionId, userInput, aiResponse, previousContext = null) {
  console.log('🔍 [DEBUG] generateInteractionSummary FUNCTION ENTERED');
  console.log('🔍 [DEBUG] Function params:', {
    customerName: customerName,
    userName: userName,  // NEW: logged-in user's name
    sessionId: sessionId,
    userInputType: typeof userInput,
    userInputLength: userInput?.length,
    aiResponseType: typeof aiResponse,
    aiResponseLength: aiResponse?.length,
    previousContextType: typeof previousContext,
    hasPreviousContext: !!previousContext
  });
  console.log('🧠 Generating intelligent interaction summary with cascading context...');
  
  try {
    console.log('🔍 [DEBUG] Entered try block in generateInteractionSummary');
    
    // Null safety check for parameters (customerName can be null, but sessionId, userInput, aiResponse are required)
    if (!sessionId || !userInput || !aiResponse) {
      console.warn('⚠️ Missing required parameters for summary generation');
      console.warn(`⚠️ Params: sessionId=${!!sessionId}, userInput=${!!userInput}, aiResponse=${!!aiResponse}`);
      return `Incomplete interaction data for session ${sessionId || 'unknown'}`;
    }
    
    // Get OpenAI API key EXCLUSIVELY for GPT-4o-mini summarization (same pattern as GPTServiceSplitter)
    console.log('🔍 [DEBUG] About to check environment variables...');
    console.log('🔍 [DEBUG] All process.env API keys:', Object.keys(process.env).filter(k => k.includes('API')));
    
    const openaiKey = process.env.VITE_OPENAI_API_KEY_MINI;
    console.log('🔍 [DEBUG] VITE_OPENAI_API_KEY_MINI exists:', !!openaiKey);
    console.log('🔍 [DEBUG] VITE_OPENAI_API_KEY_MINI length:', openaiKey?.length);
    console.log('🔍 [DEBUG] VITE_OPENAI_API_KEY_MINI prefix:', openaiKey?.substring(0, 7));
    
    if (!openaiKey) {
      console.error('❌ CRITICAL: VITE_OPENAI_API_KEY_MINI not found in environment variables!');
      console.warn('⚠️ Available env vars:', {
        VITE_OPENAI_API_KEY_MINI: !!process.env.VITE_OPENAI_API_KEY_MINI,
        OPENAI_API_KEY_MINI: !!process.env.OPENAI_API_KEY_MINI,
        VITE_AI_API_KEY: !!process.env.VITE_AI_API_KEY,
        'Note': 'GPT summary uses VITE_OPENAI_API_KEY_MINI (same as GPTServiceSplitter)'
      });
      return `User asked about: ${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}`;
    }
    
    if (openaiKey.startsWith('sk-ant-')) {
      console.error('❌ CRITICAL: VITE_OPENAI_API_KEY_MINI contains Claude API key! Must be OpenAI key starting with sk-');
      console.error('❌ Key prefix found:', openaiKey.substring(0, 7));
      return `User asked about: ${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}`;
    }
    
    if (!openaiKey.startsWith('sk-')) {
      console.error('❌ CRITICAL: VITE_OPENAI_API_KEY_MINI must start with "sk-" (OpenAI format)');
      console.error('❌ Key prefix found:', openaiKey.substring(0, 7));
      return `User asked about: ${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}`;
    }
    
    console.log(`🔑 Using OpenAI API key for summary generation (key starts with: ${openaiKey.substring(0, 7)}...)`);
    
    // 🚀 NEW DUAL-PATH LOGIC SYSTEM with Example Training
    console.log('🧠 [DUAL_PATH] Building improved summarizer with customer vs exploratory logic...');
    console.log('🔍 [DUAL_PATH] Customer Name Analysis:', {
      customerName: customerName,
      isPresent: !!customerName,
      path: customerName ? 'CUSTOMER_QUOTE_EVOLUTION' : 'EXPLORATORY_CALCULATIONS'
    });
    
    // 📤 DETAILED REQUEST LOGGING - New 6-message structure with examples
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system', 
          content: 'You are a no-nonsense landscaping interaction summarizer. Cut through the chatter and get to what matters: services, quantities, and totals. Two rules: 1) No customer name = exploratory pricing, summarize as "User explored: [services and totals]". 2) Customer name present = real quote evolution, summarize as "[Name] REVISED/CONFIRMED: [cumulative totals and changes]". Accept loose language like "add more", "make it bigger", "what about less". Be decisive and direct. Focus on numbers, services, and quote progression. Maximum 2-3 sentences.'
        },
        {
          role: 'user',
          content: `Summarize this interaction:
Customer Name: NULL
User's Name: Mike
Session ID: session-123
Current User Input: "How much for 150 sqft mulch and small patio?"
Current AI Response: "150 sqft mulch: $375 + 200 sqft patio: $3000 = $3375 total. 8 labor hours."`
        },
        {
          role: 'assistant',
          content: 'Mike explored pricing: 150 sqft mulch ($375) + 200 sqft patio ($3000) = $3375 total, 8 hours. Exploratory calculation session.'
        },
        {
          role: 'user',
          content: `Summarize this interaction:
Customer Name: Jennifer
User's Name: Sarah
Session ID: session-456
Current User Input: "Actually make that patio 15x15 instead"
Current AI Response: "REVISED QUOTE for Jennifer: 150 sqft mulch ($375) + 225 sqft patio ($3375) = $3750 total, 9.5 hours."
Previous Context: Jennifer initially inquired about 150 sqft mulch and 200 sqft patio totaling $3375.`
        },
        {
          role: 'assistant',
          content: 'Jennifer REVISED patio from 200 to 225 sqft. New total: $3750 (up $375), 9.5 hours. Quote evolution continues.'
        },
        {
          role: 'user',
          content: `Summarize this interaction:
Customer Name: ${customerName || 'NULL'}
User's Name: ${userName || 'NULL'}
Session ID: ${sessionId}
Current User Input: "${userInput}"
Current AI Response: "${aiResponse.substring(0, 500)}..."${previousContext && previousContext.interaction_summary ? `
Previous Context: ${previousContext.interaction_summary}` : ''}`
        }
      ],
      max_tokens: 150,
      temperature: 0.1
    };

    console.log('📤 [SUMMARY_API] REQUEST DETAILS:');
    console.log('🔑 [SUMMARY_API] API Key:', openaiKey.substring(0, 12) + '...' + openaiKey.slice(-4));
    console.log('📝 [SUMMARY_API] New 6-Message Structure with Examples:');
    console.log('='.repeat(80));
    console.log('🤖 [DUAL_PATH] System Prompt: Tough guy summarizer with customer vs exploratory logic');
    console.log('📚 [DUAL_PATH] Example 1: Exploratory calculations (no customer name)');
    console.log('📚 [DUAL_PATH] Example 2: Customer quote evolution (customer name present)');
    console.log('🎯 [DUAL_PATH] Actual Query:', {
      customerPresent: !!customerName,
      path: customerName ? 'QUOTE_EVOLUTION' : 'EXPLORATORY',
      sessionId: sessionId,
      inputLength: userInput?.length,
      responseLength: aiResponse?.length,
      hasPreviousContext: !!(previousContext && previousContext.interaction_summary)
    });
    console.log('='.repeat(80));
    console.log('⚙️ [SUMMARY_API] Request Body:', JSON.stringify(requestBody, null, 2));

    console.log('🔍 [DEBUG] About to make fetch call to OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // 📥 DETAILED RESPONSE LOGGING
    console.log('📥 [SUMMARY_API] Response Status:', response.status, response.statusText);
    console.log('🔍 [DEBUG] Response received from OpenAI API');

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error('❌ [SUMMARY_API] ❌ FAILED ❌ ERROR RESPONSE:', errorText);
      console.error('❌ [SUMMARY_API] ❌ FAILED ❌ Status:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    console.log('✅ [SUMMARY_API] ✅ SUCCESS ✅ OpenAI API call completed successfully');
    
    const data = await response.json();
    console.log('📋 [SUMMARY_API] COMPLETE RESPONSE:', JSON.stringify(data, null, 2));

    const summary = data.choices[0]?.message?.content?.trim() || `User asked about: ${userInput.substring(0, 100)}...`;
    console.log('✅ [SUMMARY_API] ✅ SUCCESS ✅ FINAL SUMMARY:', summary);
    console.log('✅ [SUMMARY_API] ✅ SUCCESS ✅ Dual-path summary generation completed successfully');
    
    // 🎯 Log which path was taken
    const pathTaken = customerName ? 'CUSTOMER_QUOTE_EVOLUTION' : 'EXPLORATORY_CALCULATIONS';
    console.log(`✅ [DUAL_PATH] Generated ${pathTaken} summary: ${summary.substring(0, 80)}...`);
    console.log('🔍 [DEBUG] About to return dual-path summary from generateInteractionSummary');
    return summary;
    
  } catch (error) {
    console.error('🔍 [DEBUG] CAUGHT ERROR in generateInteractionSummary:', error);
    console.error('🔍 [DEBUG] Error type:', typeof error);
    console.error('🔍 [DEBUG] Error message:', error.message);
    console.error('🔍 [DEBUG] Error stack:', error.stack);
    console.error('❌ Summary generation failed, using fallback:', error);
    
    // Enhanced fallback with context awareness
    const fallback = `User asked about: ${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}`;
    if (previousContext && previousContext.interaction_summary) {
      console.log('🔍 [DEBUG] Returning cascading fallback');
      return `${previousContext.interaction_summary} | Latest: ${fallback}`;
    }
    console.log('🔍 [DEBUG] Returning simple fallback');
    return fallback;
  }
}

/**
 * Update VC Usage record with generated summary using session_id priority
 */
async function updateInteractionSummary(sessionId, interactionNumber, summary) {
  console.log(`📝 [DB_UPDATE] Updating interaction ${interactionNumber} with intelligent summary...`);
  console.log(`🔍 [DEBUG] updateInteractionSummary PARAMS:`, {
    sessionId: sessionId,
    interactionNumber: interactionNumber,
    summaryLength: summary?.length,
    summaryPreview: summary?.substring(0, 50) + '...'
  });
  
  try {
    // Get Supabase credentials  
    const supabaseUrl = process.env.SUPABASE_URL || 'https://acdudelebwrzewxqmwnc.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c';
    
    console.log('🔍 [DEBUG] Using Supabase credentials:', {
      url: supabaseUrl,
      keyExists: !!supabaseKey,
      keyLength: supabaseKey?.length
    });
    
    // 🔄 MIGRATION: Use Supabase client to prevent 406 errors
    console.log('📝 [DB_UPDATE] Using Supabase client for VC Usage update...');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const updatePayload = {
      interaction_summary: summary
    };
    console.log('📝 [DB_UPDATE] Update Payload:', JSON.stringify(updatePayload, null, 2));

    const { error } = await supabase
      .from('VC Usage')
      .update(updatePayload)
      .eq('session_id', sessionId)
      .eq('interaction_number', interactionNumber);

    console.log('📝 [DB_UPDATE] Supabase client response:', {
      success: !error,
      error: error?.message || null
    });

    if (!error) {
      console.log(`✅ [DB_UPDATE] ✅ SUCCESS ✅ Updated interaction ${interactionNumber} with intelligent summary`);
      console.log(`✅ [DB_UPDATE] ✅ SUCCESS ✅ Database update completed for session ${sessionId}`);
      console.log(`✅ [DB_UPDATE] Summary Length: ${summary.length} characters`);
    } else {
      console.error('❌ [DB_UPDATE] Supabase client error:', error);
      throw new Error(`Database update failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ [DB_UPDATE] ❌ FAILED ❌ Summary update failed with exception:', error.message);
    console.error('❌ [DB_UPDATE] ❌ FAILED ❌ Error stack:', error.stack);
    console.error('❌ [DB_UPDATE] ❌ FAILED ❌ Session:', sessionId, 'Interaction:', interactionNumber);
    throw error;
  }
}

/**
 * Main handler function for the Netlify endpoint
 */
export const handler = async (event, context) => {
  const startTime = Date.now();
  
  console.log('🚀🚀🚀 GENERATE_INTERACTION_SUMMARY FUNCTION HIT! 🚀🚀🚀');
  console.log('🔍 [DEBUG] GENERATE_INTERACTION_SUMMARY FUNCTION STARTED');
  console.log('🔍 [DEBUG] Timestamp:', new Date().toISOString());
  console.log('🔍 [DEBUG] HTTP Method:', event.httpMethod);
  console.log('🔍 [DEBUG] Request headers:', event.headers);
  console.log('🔍 [DEBUG] Request path:', event.path);
  console.log('🔍 [DEBUG] Raw request body:', event.body);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('🔍 [DEBUG] Handling OPTIONS preflight request');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    console.error('❌ [ERROR] Invalid HTTP method:', event.httpMethod);
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed. Use POST.',
        method: event.httpMethod
      }),
    };
  }

  try {
    console.log('🔍 [DEBUG] Parsing request body...');
    console.log('🔍 [DEBUG] Raw body:', event.body);
    
    // Parse request payload
    let payload;
    try {
      payload = JSON.parse(event.body);
      console.log('🔍 [DEBUG] Parsed payload:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error('❌ [ERROR] JSON parsing failed:', parseError.message);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        }),
      };
    }

    // Validate required parameters
    const { sessionId, interactionNumber, customerName, userName, userInput, aiResponse, previousContext } = payload;
    
    console.log('🔍 [DEBUG] Validating parameters...');
    console.log('🔍 [DEBUG] Parameter validation:', {
      sessionId: !!sessionId,
      interactionNumber: !!interactionNumber,
      customerName: !!customerName,
      userName: !!userName,  // NEW: logged-in user's name
      userInput: !!userInput,
      aiResponse: !!aiResponse,
      previousContext: !!previousContext
    });
    
    if (!sessionId || !interactionNumber || !userInput || !aiResponse) {
      console.error('❌ [ERROR] Missing required parameters');
      console.error('❌ [ERROR] Required: sessionId, interactionNumber, userInput, aiResponse');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Missing required parameters',
          required: ['sessionId', 'interactionNumber', 'userInput', 'aiResponse'],
          received: { sessionId: !!sessionId, interactionNumber: !!interactionNumber, userInput: !!userInput, aiResponse: !!aiResponse }
        }),
      };
    }

    console.log('🚀 [SUMMARY_PROCESS] Starting interaction summary generation pipeline...');
    console.log('🚀 [SUMMARY_PROCESS] Session:', sessionId, '| Interaction:', interactionNumber, '| Customer:', customerName || 'anonymous', '| User:', userName || 'anonymous');

    // 1. Generate intelligent summary using OpenAI GPT-4o-mini
    console.log('🧠 [SUMMARY_PROCESS] STEP 1: Generating intelligent summary...');
    const summary = await generateInteractionSummary(customerName, userName, sessionId, userInput, aiResponse, previousContext);
    
    if (!summary) {
      throw new Error('Summary generation returned null/undefined');
    }
    
    console.log('✅ [SUMMARY_PROCESS] STEP 1 COMPLETE: Summary generated successfully');
    console.log('🔍 [DEBUG] Generated summary preview:', summary.substring(0, 100) + '...');

    // 2. Update VC Usage database record
    console.log('💾 [SUMMARY_PROCESS] STEP 2: Updating database record...');
    await updateInteractionSummary(sessionId, interactionNumber, summary);
    console.log('✅ [SUMMARY_PROCESS] STEP 2 COMPLETE: Database updated successfully');

    const totalTime = Date.now() - startTime;
    console.log(`🎉 [SUMMARY_PROCESS] ✅ PIPELINE COMPLETE ✅ Total processing time: ${totalTime}ms`);
    console.log(`🎉 [SUMMARY_PROCESS] ✅ SUCCESS ✅ Interaction ${interactionNumber} summarized and stored`);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': totalTime.toString(),
        'X-Summary-Length': summary.length.toString()
      },
      body: JSON.stringify({
        success: true,
        summary: summary,
        metadata: {
          sessionId,
          interactionNumber,
          customerName: customerName || null,
          processingTime: totalTime,
          summaryLength: summary.length
        }
      }),
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error('❌ [SUMMARY_PROCESS] ❌ PIPELINE FAILED ❌ Summary generation pipeline failed:', error);
    console.error('❌ [SUMMARY_PROCESS] Error message:', error.message);
    console.error('❌ [SUMMARY_PROCESS] Error stack:', error.stack);
    console.error('❌ [SUMMARY_PROCESS] Processing time before failure:', totalTime, 'ms');

    return {
      statusCode: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': totalTime.toString()
      },
      body: JSON.stringify({
        success: false,
        error: 'Summary generation failed',
        details: error.message,
        processingTime: totalTime
      }),
    };
  }
};