// Import shared storage service for consistent data handling
import { MessageStorageService } from '../../src/utils/message-storage.ts';

export const handler = async (event, context) => {
  // 🚨 WEBHOOK DEBUG: Log all incoming requests
  const webhookStartTime = Date.now();
  const requestId = `webhook_${webhookStartTime}_${Math.random().toString(36).substr(2, 4)}`;
  
  console.log(`🚨 [${requestId}] WEBHOOK RECEIVED:`, {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    hasBody: !!event.body,
    bodyLength: event.body?.length || 0,
    timestamp: new Date().toISOString(),
    userAgent: event.headers?.['user-agent'] || 'unknown'
  });

  // Handle CORS for demo
  if (event.httpMethod === 'OPTIONS') {
    console.log(`🚨 [${requestId}] CORS preflight request handled`);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    console.log(`🚨 [${requestId}] Method not allowed: ${event.httpMethod}`);
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    console.log(`🚨 [${requestId}] Processing POST request...`);
    
    let requestBody;
    try {
      console.log(`🚨 [${requestId}] Raw body preview:`, event.body?.substring(0, 500) + '...');
      requestBody = JSON.parse(event.body);
      console.log(`🚨 [${requestId}] JSON parsed successfully. Keys:`, Object.keys(requestBody));
    } catch (parseError) {
      console.error(`🚨 [${requestId}] JSON Parse Error:`, parseError);
      console.log(`🚨 [${requestId}] Raw body:`, event.body);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Invalid JSON in request',
          requestId,
          debug: {
            bodyPreview: event.body?.substring(0, 200),
            parseError: parseError.message
          }
        })
      };
    }

    const { response, sessionId, timestamp, techId } = requestBody;
    
    console.log(`🚨 [${requestId}] Extracted data:`, {
      hasResponse: !!response,
      responseLength: response?.length || 0,
      sessionId: sessionId || 'MISSING',
      techId: techId || 'MISSING',
      timestamp: timestamp || 'MISSING'
    });
    
    // Validate required fields
    if (!sessionId) {
      console.error(`🚨 [${requestId}] VALIDATION ERROR: Missing sessionId`);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Missing required field: sessionId',
          requestId,
          received: requestBody
        })
      };
    }

    if (!response) {
      console.error(`🚨 [${requestId}] VALIDATION ERROR: Missing response`);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Missing required field: response',
          requestId,
          received: requestBody
        })
      };
    }
    
    console.log(`🚨 [${requestId}] Starting response processing...`);
    
    // Decode and clean the response
    let decodedResponse;
    try {
      decodedResponse = response ? decodeURIComponent(response) : response;
      console.log(`🚨 [${requestId}] Response decoded successfully. Length: ${decodedResponse?.length}`);
    } catch (decodeError) {
      console.log(`🚨 [${requestId}] Decode error (using raw response):`, decodeError.message);
      decodedResponse = response;
    }
    
    // Limit response size to prevent errors
    if (decodedResponse && decodedResponse.length > 2000) {
      decodedResponse = decodedResponse.substring(0, 1997) + '...';
      console.log(`🚨 [${requestId}] Response truncated due to length: ${decodedResponse.length}`);
    }
    
    // Clean any problematic characters
    if (decodedResponse) {
      const originalLength = decodedResponse.length;
      decodedResponse = decodedResponse.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      if (decodedResponse.length !== originalLength) {
        console.log(`🚨 [${requestId}] Cleaned ${originalLength - decodedResponse.length} problematic characters`);
      }
    }
    
    console.log(`🚨 [${requestId}] Final response preview:`, { 
      responsePreview: decodedResponse ? decodedResponse.substring(0, 200) + '...' : 'No response',
      finalLength: decodedResponse?.length,
      sessionId, 
      techId 
    });
    
    // Store message using shared storage service
    console.log(`🚨 [${requestId}] Starting database storage...`);
    try {
      await MessageStorageService.storeAIResponse(
        { 
          sessionId, 
          techId 
        },
        decodedResponse,
        {
          source: 'make_com' // 🔄 DUAL TESTING: Consistent source naming
        }
      );
      console.log(`🚨 [${requestId}] Database storage completed successfully`);
      
    } catch (storageError) {
      console.error(`🚨 [${requestId}] Storage failed:`, {
        error: storageError.message,
        stack: storageError.stack,
        name: storageError.name
      });
      
      // Fallback to in-memory storage if shared service fails
      global.demoMessages = global.demoMessages || [];
      global.demoMessages.push({
        id: Date.now().toString(),
        text: decodedResponse,
        sender: 'ai',
        timestamp: timestamp || new Date().toISOString(),
        sessionId: sessionId
      });
      console.log(`🚨 [${requestId}] Fallback to memory storage completed`);
    }
    
    const totalProcessingTime = Date.now() - webhookStartTime;
    console.log(`🚨 [${requestId}] WEBHOOK SUCCESS - Total time: ${totalProcessingTime}ms`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': requestId,
        'X-Processing-Time': totalProcessingTime.toString()
      },
      body: JSON.stringify({ 
        message: 'AI response received and stored',
        messageId: Date.now().toString(),
        requestId,
        processingTime: totalProcessingTime,
        success: true
      })
    };
    
  } catch (error) {
    const errorTime = Date.now() - webhookStartTime;
    console.error(`🚨 [${requestId}] WEBHOOK ERROR (${errorTime}ms):`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return {
      statusCode: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'X-Request-ID': requestId,
        'X-Error-Time': errorTime.toString()
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        requestId,
        errorTime,
        success: false
      })
    };
  }
};