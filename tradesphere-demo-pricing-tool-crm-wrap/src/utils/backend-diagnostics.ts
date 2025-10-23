// TradeSphere Backend Connectivity Diagnostics
// Run this to identify authentication and webhook issues

export interface DiagnosticResults {
  supabase: {
    configured: boolean;
    accessible: boolean;
    error?: string;
  };
  makeWebhook: {
    configured: boolean;
    accessible: boolean;
    error?: string;
  };
  netlifyFunctions: {
    configured: boolean;
    accessible: boolean;
    error?: string;
  };
  environment: {
    missing: string[];
    present: string[];
  };
}

export const runBackendDiagnostics = async (): Promise<DiagnosticResults> => {
  const results: DiagnosticResults = {
    supabase: { configured: false, accessible: false },
    makeWebhook: { configured: false, accessible: false },
    netlifyFunctions: { configured: false, accessible: false },
    environment: { missing: [], present: [] }
  };

  // Check environment variables
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY', 
    'VITE_MAKE_WEBHOOK_URL'
  ];

  requiredEnvVars.forEach(envVar => {
    const value = import.meta.env[envVar];
    if (value && value !== 'YOUR_SUPABASE_URL' && value !== 'YOUR_SUPABASE_ANON_KEY' && value !== 'YOUR_MAKE_WEBHOOK_URL') {
      results.environment.present.push(envVar);
    } else {
      results.environment.missing.push(envVar);
    }
  });

  // Test Supabase connection
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    results.supabase.configured = true;
    
    try {
      const testResponse = await fetch(`${supabaseUrl}/rest/v1/beta_codes?limit=1`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (testResponse.ok) {
        results.supabase.accessible = true;
      } else {
        results.supabase.error = `HTTP ${testResponse.status}: ${testResponse.statusText}`;
      }
    } catch (error) {
      results.supabase.error = error instanceof Error ? error.message : 'Unknown error';
    }
  } else {
    results.supabase.error = 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY';
  }

  // Test Make.com webhook
  const makeWebhookUrl = import.meta.env.VITE_MAKE_WEBHOOK_URL;
  
  if (makeWebhookUrl && makeWebhookUrl !== 'YOUR_MAKE_WEBHOOK_URL') {
    results.makeWebhook.configured = true;
    
    try {
      // 🔧 FIXED: Test with COMPLETE payload matching real user messages
      const diagnosticPayload = {
        message: 'DIAGNOSTIC_TEST: Backend connectivity verification',
        timestamp: new Date().toISOString(),
        sessionId: 'diagnostic_session_' + Date.now(),
        source: 'TradeSphere_Diagnostics',
        // ✅ CRITICAL: Include all user context fields that Make.com expects
        techId: 'DIAGNOSTIC-TECH-UUID-12345678',
        firstName: 'DiagnosticUser',
        jobTitle: 'System_Administrator', 
        betaCodeId: 999
      };

      console.log('🔗 DIAGNOSTIC: Testing webhook with complete payload -', {
        fieldCount: Object.keys(diagnosticPayload).length,
        expectedFields: ['message', 'timestamp', 'sessionId', 'source', 'techId', 'firstName', 'jobTitle', 'betaCodeId'],
        actualFields: Object.keys(diagnosticPayload)
      });

      const testResponse = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diagnosticPayload)
      });
      
      // Make.com webhooks typically return 200 even for test data
      if (testResponse.ok) {
        results.makeWebhook.accessible = true;
      } else {
        results.makeWebhook.error = `HTTP ${testResponse.status}: ${testResponse.statusText}`;
      }
    } catch (error) {
      results.makeWebhook.error = error instanceof Error ? error.message : 'Unknown error';
    }
  } else {
    results.makeWebhook.error = 'Missing or invalid VITE_MAKE_WEBHOOK_URL';
  }

  // Test Netlify functions (local vs deployed)
  try {
    const sessionId = 'diagnostic_test_session';
    const testUrl = `/.netlify/functions/chat-messages/${sessionId}`;
    
    const testResponse = await fetch(testUrl);
    results.netlifyFunctions.configured = true;
    
    if (testResponse.ok) {
      results.netlifyFunctions.accessible = true;
    } else {
      results.netlifyFunctions.error = `HTTP ${testResponse.status}: ${testResponse.statusText}`;
    }
  } catch (error) {
    results.netlifyFunctions.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return results;
};

export const logDiagnosticResults = (results: DiagnosticResults) => {
  console.group('🔍 TRADESPHERE BACKEND DIAGNOSTICS');
  
  console.group('📊 Environment Variables');
  console.log('✅ Present:', results.environment.present);
  console.log('❌ Missing:', results.environment.missing);
  console.groupEnd();
  
  console.group('🗄️ Supabase Database');
  console.log('Configured:', results.supabase.configured ? '✅' : '❌');
  console.log('Accessible:', results.supabase.accessible ? '✅' : '❌');
  if (results.supabase.error) console.log('Error:', results.supabase.error);
  console.groupEnd();
  
  console.group('🔗 Make.com Webhook');
  console.log('Configured:', results.makeWebhook.configured ? '✅' : '❌');
  console.log('Accessible:', results.makeWebhook.accessible ? '✅' : '❌');
  if (results.makeWebhook.error) console.log('Error:', results.makeWebhook.error);
  console.groupEnd();
  
  console.group('⚡ Netlify Functions');
  console.log('Configured:', results.netlifyFunctions.configured ? '✅' : '❌');
  console.log('Accessible:', results.netlifyFunctions.accessible ? '✅' : '❌');
  if (results.netlifyFunctions.error) console.log('Error:', results.netlifyFunctions.error);
  console.groupEnd();
  
  console.groupEnd();
  
  return results;
};

// Quick diagnostic function for console use
export const quickDiagnostic = async () => {
  const results = await runBackendDiagnostics();
  logDiagnosticResults(results);
  return results;
};