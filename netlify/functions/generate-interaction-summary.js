/**
 * Dedicated Interaction Summary Generator
 * 
 * Generates intelligent business-focused summaries for customer interactions using OpenAI GPT-4o-mini
 * Called by pricing agent after each interaction is stored in VC Usage table
 * Uses session_id priority for database updates and comprehensive debug logging
 * 
 * Endpoint: POST /.netlify/functions/generate-interaction-summary
 * Payload: { sessionId, interactionNumber, customerName, userInput, aiResponse, previousContext? }
 */

/**
 * Generate intelligent interaction summary using OpenAI GPT-4o-mini
 */
async function generateInteractionSummary(customerName, sessionId, userInput, aiResponse, previousContext = null) {
  console.log('🔍 [DEBUG] generateInteractionSummary FUNCTION ENTERED');
  console.log('🔍 [DEBUG] Function params:', {
    customerName: customerName,
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
    
    // Build cascading summary prompt with proper customer name and session ID fields
    let summaryPrompt = `Create a professional 3-4 sentence maximum summary of this customer interaction for business records.

Customer Name: ${customerName || 'NULL'}
Session ID: ${sessionId}
Current User Input: "${userInput}"
Current AI Response: "${aiResponse.substring(0, 400)}..."`;

    // Add previous context for cascading effect (with null safety)
    if (previousContext && previousContext.interaction_summary) {
      console.log('🔄 Including previous summary for cascading context');
      summaryPrompt += `

PREVIOUS INTERACTION SUMMARY: "${previousContext.interaction_summary}"

Instructions: Build upon the previous summary to create an evolved summary that captures both the previous context and this new interaction. Focus on the progression of the customer's project and requirements.`;
    } else {
      console.log('🆕 First interaction - no previous summary available');
      summaryPrompt += `

Instructions: This appears to be the first interaction with this customer. Create a comprehensive initial summary.`;
    }

    summaryPrompt += `

Focus on:
- What the customer specifically requested or asked about
- Key project details mentioned (size, type, materials, etc.)
- The type of response provided (quote, clarification request, etc.)
- How this interaction builds on or relates to previous discussions (if applicable)

Keep it concise and business-appropriate for customer service records. MAXIMUM 3-4 sentences only.`;

    // 📤 DETAILED REQUEST LOGGING
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system', 
          content: 'You are a professional customer service assistant creating concise interaction summaries for business records. Focus ONLY on business facts: what the user requested (services, quantities, materials) and what was provided (pricing, labor hours, quotes). Use format: "User asked about [specific request] and was [successfully/unsuccessfully] presented with [specific results including numbers, prices, hours]". When provided with previous summaries, build upon them to show customer relationship progression. IMPORTANT: Keep summaries to no more than 3-4 sentences maximum - be concise but comprehensive.'
        },
        {
          role: 'user',
          content: summaryPrompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    };

    console.log('📤 [SUMMARY_API] REQUEST DETAILS:');
    console.log('🔑 [SUMMARY_API] API Key:', openaiKey.substring(0, 12) + '...' + openaiKey.slice(-4));
    console.log('📝 [SUMMARY_API] Full Prompt:');
    console.log('='.repeat(80));
    console.log(summaryPrompt);
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
    console.log('✅ [SUMMARY_API] ✅ SUCCESS ✅ Summary generation completed successfully');
    
    console.log(`✅ Generated ${previousContext ? 'cascading' : 'initial'} summary: ${summary.substring(0, 80)}...`);
    console.log('🔍 [DEBUG] About to return summary from generateInteractionSummary');
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
    
    // Update using session_id priority (matches pricing agent pattern)
    const updateUrl = `${supabaseUrl}/rest/v1/VC Usage?session_id=eq.${sessionId}&interaction_number=eq.${interactionNumber}`;
    console.log('📝 [DB_UPDATE] Update URL:', updateUrl);
    
    const updatePayload = {
      interaction_summary: summary
    };
    console.log('📝 [DB_UPDATE] Update Payload:', JSON.stringify(updatePayload, null, 2));
    
    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updatePayload)
    });
    
    console.log(`📝 [DB_UPDATE] Response Status: ${response.status} ${response.statusText}`);
    console.log(`🔍 [DEBUG] Database response received`);
    
    if (response.ok) {
      console.log(`✅ [DB_UPDATE] ✅ SUCCESS ✅ Updated interaction ${interactionNumber} with intelligent summary`);
      console.log(`✅ [DB_UPDATE] ✅ SUCCESS ✅ Database update completed for session ${sessionId}`);
      console.log(`✅ [DB_UPDATE] Summary Length: ${summary.length} characters`);
    } else {
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error(`❌ [DB_UPDATE] ❌ FAILED ❌ Failed to update summary: ${response.status}`);
      console.error(`❌ [DB_UPDATE] ❌ FAILED ❌ Error details:`, errorText);
      console.error(`❌ [DB_UPDATE] ❌ FAILED ❌ Session: ${sessionId}, Interaction: ${interactionNumber}`);
      throw new Error(`Database update failed: ${response.status} - ${errorText}`);
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
exports.handler = async (event, context) => {
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
    const { sessionId, interactionNumber, customerName, userInput, aiResponse, previousContext } = payload;
    
    console.log('🔍 [DEBUG] Validating parameters...');
    console.log('🔍 [DEBUG] Parameter validation:', {
      sessionId: !!sessionId,
      interactionNumber: !!interactionNumber,
      customerName: !!customerName,
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
    console.log('🚀 [SUMMARY_PROCESS] Session:', sessionId, '| Interaction:', interactionNumber, '| Customer:', customerName || 'anonymous');

    // 1. Generate intelligent summary using OpenAI GPT-4o-mini
    console.log('🧠 [SUMMARY_PROCESS] STEP 1: Generating intelligent summary...');
    const summary = await generateInteractionSummary(customerName, sessionId, userInput, aiResponse, previousContext);
    
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