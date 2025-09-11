/**
 * Customer Update Function - Session-wide customer detail updates
 * 
 * Handles mid-chat customer detail confirmations and updates
 * Updates all VC Usage records for the current session
 * 
 * Phase 2A: Session-wide customer detail updates for mid-chat confirmations
 */

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
    console.log('👤 CUSTOMER UPDATE: Starting session-wide customer update');
    console.log('Headers:', event.headers);
    console.log('Body length:', event.body?.length || 0);

    // Parse and validate payload
    const payload = parseUpdatePayload(event.body);
    console.log(`👤 Customer Update: ${payload.customerName} for session ${payload.sessionId}`);

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL || 'https://acdudelebwrzewxqmwnc.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c';

    // Update all VC Usage records for this session
    const updateData = {
      customer_name: payload.customerName,
      customer_address: payload.customerAddress || null,
      customer_email: payload.customerEmail || null,
      customer_phone: payload.customerPhone || null,
      updated_at: new Date().toISOString()
    };

    console.log('👤 UPDATE DATA:', {
      sessionId: payload.sessionId,
      customerName: updateData.customer_name,
      hasEmail: !!updateData.customer_email,
      hasPhone: !!updateData.customer_phone,
      hasAddress: !!updateData.customer_address
    });

    // Update all records for this session
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/VC Usage?session_id=eq.${payload.sessionId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      }
    );

    console.log('👤 UPDATE RESPONSE:', {
      status: updateResponse.status,
      statusText: updateResponse.statusText,
      ok: updateResponse.ok
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Customer update failed:', {
        status: updateResponse.status,
        statusText: updateResponse.statusText,
        errorBody: errorText
      });
      throw new Error(`Customer update failed: ${updateResponse.status} - ${errorText}`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Customer update completed in ${totalTime}ms`);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Processing-Time': totalTime.toString()
      },
      body: JSON.stringify({
        success: true,
        message: 'Customer details updated for entire session',
        sessionId: payload.sessionId,
        customerName: payload.customerName,
        processingTime: totalTime
      }),
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error('❌ CUSTOMER UPDATE ERROR:', error);
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
        error: 'Customer update failed',
        details: error.message,
        processingTime: totalTime
      }),
    };
  }
};

/**
 * Parse and validate customer update payload
 */
function parseUpdatePayload(body) {
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
  const requiredFields = ['sessionId', 'customerName'];
  
  for (const field of requiredFields) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return {
    sessionId: payload.sessionId,
    customerName: payload.customerName,
    customerAddress: payload.customerAddress || null,
    customerEmail: payload.customerEmail || null,
    customerPhone: payload.customerPhone || null
  };
}