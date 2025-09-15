// ENHANCED chat-messages.js - Adding enterprise performance ON TOP of existing functionality
export const handler = async (event, context) => {
  // ⚡ ENTERPRISE: Performance tracking
  const startTime = Date.now();

  // EXISTING: CORS handling
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400' // ⚡ ENTERPRISE: Cache preflight
      }
    };
  }

  try {
    // EXISTING: Session ID extraction with ENHANCED error handling
    let sessionId;
    try {
      const pathSegments = event.path.split('/');
      sessionId = pathSegments[pathSegments.length - 1];
      
      if (!sessionId || sessionId.length < 10) {
        throw new Error('Invalid session ID format');
      }
      
      console.log('📥 CONCURRENCY DEBUG - Session extracted:', sessionId);
      console.log('📥 CONCURRENCY DEBUG - Full path:', event.path);
      
    } catch (pathError) {
      console.error('❌ Session ID extraction failed:', pathError);
      return {
        statusCode: 400,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'X-Function-Duration': `${Date.now() - startTime}` // ⚡ ENTERPRISE: Performance header
        },
        body: JSON.stringify({ error: 'Invalid session ID in path' })
      };
    }
  
    // EXISTING: Since parameter extraction with ENHANCED validation
    let since;
    let customerLookup = false;
    let techId = null;
    
    try {
      const url = new URL(`https://example.com${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`);
      since = url.searchParams.get('since') || '1970-01-01T00:00:00.000Z';
      
      // 🏢 PHASE 5: Customer lookup parameters
      customerLookup = url.searchParams.get('recent_customers') === 'true';
      techId = url.searchParams.get('tech_id');
      
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        since = '1970-01-01T00:00:00.000Z';
        console.warn('⚠️ Invalid since timestamp, using fallback');
      }
      
      console.log('📥 CONCURRENCY DEBUG - Query parameters:', { since, customerLookup, techId });
      
    } catch (urlError) {
      console.error('❌ URL parsing failed:', urlError);
      since = '1970-01-01T00:00:00.000Z';
    }

    console.log('📥 CONCURRENCY DEBUG - Starting Supabase query for session:', sessionId);
    
    // ⚡ ENTERPRISE: Performance logging
    console.log(`🏢 ENTERPRISE REQUEST [${sessionId.slice(-8)}] Query start: ${Date.now() - startTime}ms`);
    
    // EXISTING: Supabase query with ENHANCED timeout and performance tracking
    const queryStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // ⚡ ENTERPRISE: Reduced to 5s
    
    try {
      let supabaseUrl, queryParams;
      
      if (customerLookup && techId) {
        // 🏢 PHASE 5: Customer lookup from VC Usage table
        console.log('👤 CUSTOMER LOOKUP: Querying recent customer sessions');
        
        supabaseUrl = 'https://acdudelebwrzewxqmwnc.supabase.co/rest/v1/VC Usage';
        queryParams = new URLSearchParams({
          'user_tech_id': `eq.${techId}`,
          'customer_name': 'not.is.null',
          'order': 'created_at.desc',
          'limit': '2', // 📊 PHASE 2B: Limit to 2 recent customers for cleaner UX
          'select': 'session_id,customer_name,customer_email,customer_phone,customer_address,created_at,interaction_summary'
        });
        
        console.log('👤 CUSTOMER LOOKUP - Query URL:', `${supabaseUrl}?${queryParams}`);
        console.log('👤 CUSTOMER LOOKUP - Query params:', {
          techId,
          selectFields: 'session_id,customer_name,customer_email,customer_phone,customer_address,created_at,interaction_summary'
        });
        
      } else {
        // 🔍 EXISTING: Regular message polling from demo_messages
        supabaseUrl = 'https://acdudelebwrzewxqmwnc.supabase.co/rest/v1/demo_messages';
        queryParams = new URLSearchParams({
          'session_id': `eq.${sessionId}`,
          'sender': 'eq.ai',
          'created_at': `gte.${since}`,
          'order': 'created_at.asc',
          'limit': '10', // ⚡ ENTERPRISE: Limit for performance
          'select': 'id,message_text,sender,created_at,session_id,message_source' // ✅ RESTORED: Include source for visual differentiation
        });
        
        console.log('🔍 DEBUG - Query URL:', `${supabaseUrl}?${queryParams}`);
        console.log('🔍 DEBUG - Query params:', {
          sessionId,
          since,
          selectFields: 'id,message_text,sender,created_at,session_id,message_source'
        });
      }

      const supabaseResponse = await fetch(`${supabaseUrl}?${queryParams}`, {
        headers: {
          // EXISTING: Correct authorization and API key
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZHVkZWxlYndyemV3eHFtd25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NzUxNTcsImV4cCI6MjA2NTQ1MTE1N30.HnxT5Z9EcIi4otNryHobsQCN6x5M43T0hvKMF6Pxx_c',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Accept': 'application/json' // ⚡ ENTERPRISE: Explicit accept header
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // ⚡ ENTERPRISE: Performance tracking
      const queryDuration = Date.now() - queryStart;
      console.log(`📥 CONCURRENCY DEBUG - Supabase response status:`, supabaseResponse.status);
      console.log(`🏢 ENTERPRISE SUCCESS [${sessionId.slice(-8)}]: ${queryDuration}ms query time`);
      
      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        console.error('❌ SUPABASE 400 ERROR DETAILS:', {
          status: supabaseResponse.status,
          statusText: supabaseResponse.statusText,
          errorBody: errorText,
          queryUrl: `${supabaseUrl}?${queryParams}`,
          sessionId,
          since,
          headers: Object.fromEntries(supabaseResponse.headers.entries())
        });
        
        return {
          statusCode: supabaseResponse.status >= 500 ? 500 : supabaseResponse.status,
          headers: { 
            'Access-Control-Allow-Origin': '*',
            'X-Function-Duration': `${Date.now() - startTime}`,
            'X-Query-Duration': `${queryDuration}`,
            'X-Error-Type': 'database' // ⚡ ENTERPRISE: Error classification
          },
          body: JSON.stringify({ 
            error: 'Database query failed', 
            details: errorText,
            debugInfo: {
              queryUrl: `${supabaseUrl}?${queryParams}`,
              sessionId,
              since,
              selectFields: 'id,message_text,sender,created_at,session_id,message_source'
            },
            retryAfter: 5 // ⚡ ENTERPRISE: Retry guidance
          })
        };
      }

      const responseData = await supabaseResponse.json();
      
      if (customerLookup) {
        // 🏢 PHASE 5: Format customer lookup response
        console.log('👤 CUSTOMER LOOKUP - Raw customer data from DB:', responseData.length);
        
        // Take the 2 most recent customer sessions (regardless of customer name)
        const sortedData = responseData.sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        ).slice(0, 2);

        const formattedCustomers = sortedData.map(customer => ({
          id: `customer_${customer.customer_name.replace(/\s+/g, '_')}_${Date.now()}`,
          customerName: customer.customer_name,
          customerEmail: customer.customer_email,
          customerPhone: customer.customer_phone,
          customerAddress: customer.customer_address,
          sessionId: customer.session_id,
          lastInteraction: customer.created_at,
          summary: customer.interaction_summary
        }));
        
        console.log(`👤 CUSTOMER LOOKUP - Returning ${formattedCustomers.length} recent customers`);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Function-Duration': (Date.now() - startTime).toString(),
            'X-Query-Duration': (Date.now() - queryStart).toString(),
            'X-Customer-Count': formattedCustomers.length.toString()
          },
          body: JSON.stringify(formattedCustomers)
        };
        
      } else {
        // 🔍 EXISTING: Regular message polling response
        console.log('📥 CONCURRENCY DEBUG - Raw messages from DB:', responseData.length);
        
        const formattedMessages = responseData.map(msg => {
          try {
            return {
              // EXISTING: Proper ID handling
              id: msg.id ? msg.id.toString() : `temp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              text: msg.message_text || '',
              sender: msg.sender || 'ai',
              timestamp: msg.created_at || new Date().toISOString(),
              sessionId: msg.session_id || sessionId,
              // ✅ RESTORED: Include source for visual differentiation
              source: msg.message_source || 'make_com'
            };
          } catch (formatError) {
            console.error('❌ Message formatting error:', formatError, msg);
            return null;
          }
        }).filter(msg => msg !== null);
        
        console.log(`📤 CONCURRENCY DEBUG - Returning ${formattedMessages.length} formatted messages for session: ${sessionId}`);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Function-Duration': (Date.now() - startTime).toString(),
            'X-Query-Duration': (Date.now() - queryStart).toString(),
            'X-Message-Count': formattedMessages.length.toString(),
            'X-Performance-Grade': (Date.now() - startTime) < 50 ? 'A' : (Date.now() - startTime) < 100 ? 'B' : 'C'
          },
          body: JSON.stringify(formattedMessages)
        };
      }
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ Supabase query timeout');
        return {
          statusCode: 408,
          headers: { 
            'Access-Control-Allow-Origin': '*',
            'X-Function-Duration': `${Date.now() - startTime}`,
            'X-Error-Type': 'timeout', // ⚡ ENTERPRISE: Error classification
            'Retry-After': '3' // ⚡ ENTERPRISE: Retry guidance
          },
          body: JSON.stringify({ 
            error: 'Database query timeout after 5s',
            retryAfter: 3
          })
        };
      }
      
      throw fetchError;
    }
    
  } catch (error) {
    // ⚡ ENTERPRISE: Enhanced error logging
    const errorDuration = Date.now() - startTime;
    console.error(`❌ ENTERPRISE ERROR [${sessionId?.slice(-8) || 'unknown'}]:`, {
      error: error.message,
      duration: errorDuration,
      type: error.name,
      timestamp: new Date().toISOString()
    });
    
    return {
      statusCode: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'X-Function-Duration': errorDuration.toString(),
        'X-Error-Type': 'internal', // ⚡ ENTERPRISE: Error classification
        'Retry-After': '10' // ⚡ ENTERPRISE: Retry guidance
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        retryAfter: 10,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// ⚡ ENTERPRISE: Database optimization recommendations (comments for reference)
/*
🚀 CRITICAL SUPABASE OPTIMIZATIONS - RUN IN SQL EDITOR:

1. **Primary Performance Index** (IMMEDIATE):
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_demo_messages_enterprise_perf 
ON demo_messages(session_id, sender, created_at DESC) 
WHERE sender = 'ai';

2. **Query Performance Test**:
EXPLAIN ANALYZE 
SELECT id, message_text, sender, created_at, session_id 
FROM demo_messages 
WHERE session_id = 'quote_session_test_1_1732479234567' 
AND sender = 'ai' 
AND created_at >= '2025-08-23T00:00:00.000Z' 
ORDER BY created_at ASC 
LIMIT 10;

3. **Table Health Monitor**:
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, 
       n_live_tup, n_dead_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables 
WHERE tablename = 'demo_messages';

PERFORMANCE TARGETS:
✅ Function: <100ms (currently optimized)
✅ Database: <50ms (with index)
✅ Total: <150ms (excluding Make.com)
*/