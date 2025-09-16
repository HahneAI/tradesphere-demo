/**
 * Customer Context Preloading Function
 *
 * Loads conversation history and customer details for seamless conversation continuation
 * Returns last 2 interactions for a specific customer + session
 *
 * Phase 2D: Customer Context Preloading - Migrated to Supabase Client
 */

import { createClient } from '@supabase/supabase-js';

export const handler = async (event, context) => {
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

    // 🔄 MIGRATION: Initialize Supabase client for consistent database access
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query VC Usage table for conversation history using Supabase client
    let query = supabase
      .from('VC Usage')
      .select('user_input,ai_response,interaction_number,created_at,session_id,customer_name,customer_address,customer_email,customer_phone')
      .eq('customer_name', decodeURIComponent(customerName))
      .eq('user_tech_id', techId)
      .order('interaction_number', { ascending: false })
      .limit(2); // Last 2 interactions for context

    // If session_id provided, get interactions from that specific session
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    console.log('🔄 SUPABASE CLIENT QUERY:', {
      customerName: decodeURIComponent(customerName),
      techId,
      sessionId: sessionId || 'cross_session',
      limit: 2
    });

    const { data: conversationHistory, error } = await query;

    if (error) {
      console.error('❌ Context preload query failed:', error);
      throw new Error(`Context preload failed: ${error.message}`);
    }
    console.log('🔄 CONVERSATION HISTORY:', {
      recordsFound: conversationHistory.length,
      customerName: decodeURIComponent(customerName)
    });

    // Format conversation history - reverse to chronological order (oldest first)
    const formattedHistory = [];
    const reversedHistory = [...conversationHistory].reverse(); // Reverse to get chronological order
    
    reversedHistory.forEach((record, index) => {
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