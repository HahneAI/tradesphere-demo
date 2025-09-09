// Import shared storage service for consistent data handling
import { MessageStorageService } from '../../src/utils/message-storage.ts';

export const handler = async (event, context) => {
  // Handle CORS for demo
  if (event.httpMethod === 'OPTIONS') {
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
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('Raw body:', event.body);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid JSON in request' })
      };
    }

    const { response, sessionId, timestamp, techId } = requestBody;
    
    // Decode and clean the response
    let decodedResponse = response ? decodeURIComponent(response) : response;
    
    // Limit response size to prevent errors
    if (decodedResponse && decodedResponse.length > 2000) {
      decodedResponse = decodedResponse.substring(0, 1997) + '...';
      console.log('⚠️ Response truncated due to length:', decodedResponse.length);
    }
    
    // Clean any problematic characters
    if (decodedResponse) {
      decodedResponse = decodedResponse.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }
    
    console.log('📨 Received from Make.com:', { 
      responsePreview: decodedResponse ? decodedResponse.substring(0, 200) + '...' : 'No response',
      sessionId, 
      techId 
    });
    
    // Store message using shared storage service
    try {
      await MessageStorageService.storeAIResponse(
        { 
          sessionId, 
          techId 
        },
        decodedResponse,
        {
          source: 'make_com_webhook'
        }
      );
      
    } catch (storageError) {
      console.error('[chat-response] Storage failed:', storageError.message);
      
      // Fallback to in-memory storage if shared service fails
      global.demoMessages = global.demoMessages || [];
      global.demoMessages.push({
        id: Date.now().toString(),
        text: decodedResponse,
        sender: 'ai',
        timestamp: timestamp || new Date().toISOString(),
        sessionId: sessionId
      });
      console.log('✅ Stored demo message in memory (fallback)');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'AI response received',
        messageId: Date.now().toString()
      })
    };
    
  } catch (error) {
    console.error('Handler Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};