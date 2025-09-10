// Make.com Webhook Test Endpoint
// This endpoint helps diagnose webhook connectivity issues

export const handler = async (event, context) => {
  const testStartTime = Date.now();
  const testId = `test_${testStartTime}_${Math.random().toString(36).substr(2, 4)}`;
  
  console.log(`🧪 [${testId}] WEBHOOK TEST ENDPOINT CALLED:`, {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    queryParams: event.queryStringParameters,
    hasBody: !!event.body,
    bodyLength: event.body?.length || 0,
    timestamp: new Date().toISOString(),
    userAgent: event.headers?.['user-agent'] || 'unknown',
    origin: event.headers?.origin || 'unknown',
    referer: event.headers?.referer || 'unknown'
  });

  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400'
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log(`🧪 [${testId}] CORS preflight handled`);
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  try {
    // Parse body if present
    let requestData = {};
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
        console.log(`🧪 [${testId}] JSON body parsed:`, {
          keys: Object.keys(requestData),
          dataPreview: JSON.stringify(requestData).substring(0, 300)
        });
      } catch (parseError) {
        console.log(`🧪 [${testId}] Non-JSON body:`, event.body.substring(0, 300));
        requestData = { rawBody: event.body };
      }
    }

    // Test response data
    const testResponse = {
      success: true,
      testId,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - testStartTime,
      receivedData: {
        method: event.httpMethod,
        path: event.path,
        queryParams: event.queryStringParameters,
        headers: {
          userAgent: event.headers?.['user-agent'],
          contentType: event.headers?.['content-type'],
          origin: event.headers?.origin,
          referer: event.headers?.referer
        },
        body: requestData
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        hasEnvironmentVars: {
          supabaseUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
          supabaseKey: !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
          makeWebhook: !!process.env.VITE_MAKE_WEBHOOK_URL
        }
      },
      endpoints: {
        chatResponse: '/.netlify/functions/chat-response',
        chatMessages: '/.netlify/functions/chat-messages',
        webhookTest: '/.netlify/functions/webhook-test'
      },
      instructions: {
        makeDotCom: {
          webhookUrl: 'Use this endpoint URL in your Make.com scenario',
          expectedMethod: 'POST',
          expectedHeaders: { 'Content-Type': 'application/json' },
          expectedBody: {
            response: 'Your AI response text (URL encoded if needed)',
            sessionId: 'The chat session ID',
            timestamp: 'ISO timestamp (optional)',
            techId: 'Tech ID (optional)'
          }
        },
        testing: {
          curl: `curl -X POST ${event.headers?.host ? 'https://' + event.headers.host : ''}/.netlify/functions/webhook-test -H "Content-Type: application/json" -d '{"test":"data","sessionId":"test123","response":"Test response from Make.com"}'`,
          makeScenario: 'Configure Make.com to POST to this URL with the expected JSON structure'
        }
      }
    };

    console.log(`🧪 [${testId}] Test completed successfully (${testResponse.processingTime}ms)`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
        'X-Test-ID': testId,
        'X-Processing-Time': testResponse.processingTime.toString()
      },
      body: JSON.stringify(testResponse, null, 2)
    };

  } catch (error) {
    const errorTime = Date.now() - testStartTime;
    console.error(`🧪 [${testId}] Test error (${errorTime}ms):`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
        'X-Test-ID': testId,
        'X-Error-Time': errorTime.toString()
      },
      body: JSON.stringify({
        success: false,
        testId,
        error: {
          name: error.name,
          message: error.message
        },
        errorTime,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};