/**
 * Customer Context Preloading Function
 * 
 * Loads conversation history and customer details for seamless conversation continuation
 * Returns last 2 interactions for a specific customer + session
 * Also generates missing interaction summaries using OpenAI GPT-4o-mini
 * 
 * Phase 2D: Customer Context Preloading + GPT Summarization
 */

/**
 * Generate missing interaction summaries using OpenAI GPT-4o-mini
 */
async function generateMissingSummaries(conversationHistory, supabaseUrl, supabaseKey) {
  const apiKey = process.env.VITE_OPENAI_API_KEY_MINI;
  
  if (!apiKey) {
    console.log('🔄 No OpenAI API key found, skipping summary generation');
    return;
  }

  const recordsNeedingSummary = conversationHistory.filter(record => 
    !record.interaction_summary || 
    record.interaction_summary.trim() === '' ||
    record.interaction_summary.includes('User asked about:') // Old fallback summaries
  );

  if (recordsNeedingSummary.length === 0) {
    console.log('✅ All conversation records already have summaries');
    return;
  }

  console.log(`🤖 SUMMARY GENERATION: Found ${recordsNeedingSummary.length} records needing summaries`);

  for (const record of recordsNeedingSummary) {
    try {
      console.log(`🤖 [SUMMARY] Processing interaction ${record.interaction_number}`);
      
      const summary = await callOpenAIForSummary(record.user_input, record.ai_response, apiKey);
      
      if (summary) {
        await updateInteractionSummary(record, summary, supabaseUrl, supabaseKey);
        console.log(`✅ [SUMMARY] Updated interaction ${record.interaction_number}: ${summary.substring(0, 80)}...`);
      }
      
    } catch (error) {
      console.error(`❌ [SUMMARY] Failed for interaction ${record.interaction_number}:`, error.message);
    }
  }
}

/**
 * Call OpenAI GPT-4o-mini for interaction summary generation
 */
async function callOpenAIForSummary(userInput, aiResponse, apiKey) {
  const prompt = `Create a concise business-focused summary of this landscaping conversation interaction:

USER: ${userInput}
AI: ${aiResponse}

Create a 1-2 sentence summary focusing on:
- What services/products the customer inquired about
- Key project details (size, location, materials)
- Any decisions made or next steps

Format: "Customer inquired about [services] for [project details]. [Key outcome/decision]."

Example: "Customer inquired about patio installation and mulch for backyard renovation (20x15 patio, 100 sqft mulch). Provided $6,737 quote with 30 labor hours."`;

  try {
    console.log(`🤖 [API] Calling OpenAI for summary generation`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a business conversation summarizer. Create concise, professional summaries of customer service interactions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content?.trim();
    
    console.log(`✅ [API] Generated summary: ${summary?.substring(0, 60)}...`);
    return summary;

  } catch (error) {
    console.error('❌ [API] OpenAI summary generation failed:', error.message);
    return null;
  }
}

/**
 * Update interaction summary in VC Usage table
 */
async function updateInteractionSummary(record, summary, supabaseUrl, supabaseKey) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/VC Usage?customer_name=eq.${encodeURIComponent(record.customer_name)}&interaction_number=eq.${record.interaction_number}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          interaction_summary: summary
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database update failed: ${response.status} - ${errorText}`);
    }

    console.log(`✅ [DB] Updated summary for ${record.customer_name} interaction ${record.interaction_number}`);
    
  } catch (error) {
    console.error(`❌ [DB] Failed to update summary:`, error.message);
    throw error;
  }
}

exports.handler = async (event, context) => {
  const startTime = Date.now();

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only handle GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed. Use GET.' }),
    };
  }

  try {
    console.log('🔄 CUSTOMER CONTEXT PRELOADING: Starting conversation history retrieval');

    // Extract customer name from path
    const pathSegments = event.path.split('/');
    const customerName = pathSegments[pathSegments.length - 1];
    
    if (!customerName || customerName === 'customer-context') {
      throw new Error('Customer name is required in path');
    }

    // Extract query parameters
    const url = new URL(`https://example.com${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`);
    const techId = url.searchParams.get('tech_id');
    const sessionId = url.searchParams.get('session_id');

    if (!techId) {
      throw new Error('tech_id query parameter is required');
    }

    console.log('🔄 CONTEXT PRELOAD:', {
      customerName: decodeURIComponent(customerName),
      techId,
      sessionId,
      queryType: sessionId ? 'session_specific' : 'customer_recent'
    });

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL || 'https://acdudelebwrzewxqmwnc.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c';

    // Build query parameters based on context type
    const queryParams = new URLSearchParams({
      'customer_name': `eq.${decodeURIComponent(customerName)}`,
      'user_tech_id': `eq.${techId}`,
      'order': 'interaction_number.asc',
      'limit': '2', // Last 2 interactions for context
      'select': 'user_input,ai_response,interaction_number,created_at,session_id,interaction_summary,customer_name,customer_address,customer_email,customer_phone'
    });

    // If session_id provided, get interactions from that specific session
    if (sessionId) {
      queryParams.set('session_id', `eq.${sessionId}`);
    }

    console.log('🔄 QUERY PARAMS:', queryParams.toString());

    // Query VC Usage table for conversation history
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
      const errorText = await response.text();
      console.error('❌ Context preload query failed:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`Context preload failed: ${response.status} - ${errorText}`);
    }

    const conversationHistory = await response.json();
    console.log('🔄 CONVERSATION HISTORY:', {
      recordsFound: conversationHistory.length,
      customerName: decodeURIComponent(customerName)
    });

    // Format conversation history - simple pairs without complex sorting
    const formattedHistory = [];
    conversationHistory.forEach((record, index) => {
      // Add user message
      if (record.user_input && record.user_input.trim()) {
        formattedHistory.push({
          id: `history_user_${record.interaction_number}_${index}`,
          text: record.user_input,
          sender: 'user',
          timestamp: record.created_at,
          sessionId: record.session_id,
          source: 'previous_session',
          interactionNumber: record.interaction_number
        });
      }
      
      // Add AI response
      if (record.ai_response && record.ai_response.trim()) {
        formattedHistory.push({
          id: `history_ai_${record.interaction_number}_${index}`,
          text: record.ai_response,
          sender: 'ai',
          timestamp: record.created_at,
          sessionId: record.session_id,
          source: 'previous_session',
          interactionNumber: record.interaction_number
        });
      }
    });

    // Extract customer details from the first record
    const customerDetails = conversationHistory.length > 0 ? {
      name: conversationHistory[0].customer_name,
      address: conversationHistory[0].customer_address || '',
      email: conversationHistory[0].customer_email || '',
      phone: conversationHistory[0].customer_phone || ''
    } : null;

    // 🤖 GPT SUMMARIZATION: Generate missing interaction summaries
    await generateMissingSummaries(conversationHistory, supabaseUrl, supabaseKey);

    // Get latest interaction summary
    const latestSummary = conversationHistory.length > 0 
      ? conversationHistory[conversationHistory.length - 1].interaction_summary
      : null;

    const totalTime = Date.now() - startTime;
    console.log(`✅ Context preload completed in ${totalTime}ms`);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': totalTime.toString(),
        'X-Records-Found': conversationHistory.length.toString()
      },
      body: JSON.stringify({
        success: true,
        customerName: decodeURIComponent(customerName),
        customerDetails,
        conversationHistory: formattedHistory,
        latestSummary,
        contextMetadata: {
          recordsFound: conversationHistory.length,
          sessionId: sessionId || 'cross_session',
          techId,
          processingTime: totalTime
        }
      }),
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error('❌ CUSTOMER CONTEXT PRELOAD ERROR:', error);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': totalTime.toString()
      },
      body: JSON.stringify({
        success: false,
        error: 'Context preload failed',
        details: error.message,
        processingTime: totalTime
      }),
    };
  }
};