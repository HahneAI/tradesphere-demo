/**
 * Integration Test - End-to-end pricing agent workflow
 * 
 * Tests the complete pricing agent function in isolation
 * Simulates webhook payload and validates response format
 */

import { handler } from '../../netlify/functions/pricing-agent';

interface TestWebhookPayload {
  message: string;
  timestamp: string;
  sessionId: string;
  source: string;
  techId: string;
  firstName: string;
  jobTitle: string;
  betaCodeId: number;
}

interface MockContext {
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  awsRequestId: string;
}

export class IntegrationTester {
  /**
   * Test complete webhook processing pipeline
   */
  async testWebhookProcessing(testMessage: string): Promise<{
    success: boolean;
    responseTime: number;
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  }> {
    console.log(`🔗 INTEGRATION TEST: "${testMessage}"`);
    
    const startTime = Date.now();
    
    // Create test payload (matches Make.com format)
    const payload: TestWebhookPayload = {
      message: testMessage,
      timestamp: new Date().toISOString(),
      sessionId: `test-session-${Date.now()}`,
      source: 'integration-test',
      techId: 'tech-001',
      firstName: 'TestUser',
      jobTitle: 'Property Manager',
      betaCodeId: 1
    };
    
    // Create mock Netlify event
    const mockEvent = {
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://test.tradesphere.app'
      },
      body: JSON.stringify(payload),
      path: '/.netlify/functions/pricing-agent',
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {
        requestId: 'test-request',
        stage: 'test',
        resourceId: 'test-resource',
        httpMethod: 'POST',
        requestTime: new Date().toISOString(),
        protocol: 'HTTP/1.1',
        resourcePath: '/.netlify/functions/pricing-agent'
      },
      resource: '/.netlify/functions/pricing-agent',
      isBase64Encoded: false
    };
    
    // Create mock context
    const mockContext: MockContext = {
      functionName: 'pricing-agent',
      functionVersion: '1.0',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:pricing-agent',
      memoryLimitInMB: '1024',
      awsRequestId: 'test-aws-request-id'
    };
    
    try {
      // Execute the handler
      const response = await handler(mockEvent as any, mockContext as any);
      
      const responseTime = Date.now() - startTime;
      
      let parsedBody;
      try {
        parsedBody = JSON.parse(response.body);
      } catch {
        parsedBody = response.body;
      }
      
      console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`📊 Status: ${response.statusCode}`);
      console.log(`💬 Response: ${parsedBody.response?.substring(0, 100)}...`);
      
      return {
        success: response.statusCode === 200 && parsedBody.success,
        responseTime,
        statusCode: response.statusCode,
        body: parsedBody,
        headers: response.headers || {}
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      console.error(`❌ Integration test failed: ${error.message}`);
      
      return {
        success: false,
        responseTime,
        statusCode: 500,
        body: { error: error.message },
        headers: {}
      };
    }
  }

  /**
   * Run integration test suite with production test cases
   */
  async runIntegrationTestSuite(): Promise<void> {
    console.log('🔗 INTEGRATION TEST SUITE - PRICING AGENT FUNCTION');
    console.log('=' .repeat(70));
    
    const testCases = [
      "45 sq ft triple ground mulch and 3 feet metal edging",
      "irrigation setup with 2 turf zones", 
      "100 square feet of mulch"
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      const result = await this.testWebhookProcessing(testCase);
      results.push({ testCase, ...result });
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const averageTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    console.log('\n📊 INTEGRATION TEST RESULTS:');
    console.log(`✅ Successful: ${successful}/${results.length}`);
    console.log(`⏱️  Average Response Time: ${averageTime.toFixed(0)}ms`);
    console.log(`🎯 Performance Target: ${averageTime < 8000 ? '✅ MET' : '❌ MISSED'}`);
    
    // Detailed results
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`\n${status} Test ${index + 1}: ${result.testCase.substring(0, 40)}...`);
      console.log(`   Status: ${result.statusCode} | Time: ${result.responseTime}ms`);
      
      if (result.success && result.body) {
        console.log(`   Stage: ${result.body.stage} | Services: ${result.body.debug?.servicesFound || 0}`);
        console.log(`   Processing Time: ${result.body.processingTime}ms`);
      } else if (result.body?.error) {
        console.log(`   Error: ${result.body.error}`);
      }
    });
    
    if (successful === testCases.length && averageTime < 8000) {
      console.log('\n🎉 ALL INTEGRATION TESTS PASSED - Ready for deployment!');
    } else {
      console.log('\n⚠️  Some integration tests failed - Review before deployment');
    }
  }

  /**
   * Test CORS handling
   */
  async testCorsHandling(): Promise<boolean> {
    console.log('🌐 Testing CORS handling...');
    
    const mockOptionsEvent = {
      httpMethod: 'OPTIONS',
      headers: {
        'Origin': 'https://tradesphere.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      },
      body: null,
      path: '/.netlify/functions/pricing-agent'
    };
    
    const mockContext = {
      functionName: 'pricing-agent',
      functionVersion: '1.0'
    };
    
    try {
      const response = await handler(mockOptionsEvent as any, mockContext as any);
      
      const hasCorrectCors = 
        response.statusCode === 200 &&
        response.headers?.['Access-Control-Allow-Origin'] === '*' &&
        response.headers?.['Access-Control-Allow-Methods']?.includes('POST');
      
      console.log(`${hasCorrectCors ? '✅' : '❌'} CORS test ${hasCorrectCors ? 'passed' : 'failed'}`);
      
      return hasCorrectCors;
      
    } catch (error) {
      console.log(`❌ CORS test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling(): Promise<boolean> {
    console.log('🔥 Testing error handling...');
    
    const tests = [
      {
        name: 'Invalid JSON',
        event: {
          httpMethod: 'POST',
          body: 'invalid-json',
          headers: { 'Content-Type': 'application/json' }
        }
      },
      {
        name: 'Missing required fields',
        event: {
          httpMethod: 'POST',
          body: JSON.stringify({ message: 'test' }), // Missing required fields
          headers: { 'Content-Type': 'application/json' }
        }
      },
      {
        name: 'Wrong HTTP method',
        event: {
          httpMethod: 'GET',
          body: null,
          headers: {}
        }
      }
    ];
    
    let passed = 0;
    
    for (const test of tests) {
      try {
        const response = await handler(test.event as any, {} as any);
        
        const isErrorResponse = response.statusCode >= 400;
        
        if (isErrorResponse) {
          passed++;
          console.log(`✅ ${test.name}: Correctly returned error (${response.statusCode})`);
        } else {
          console.log(`❌ ${test.name}: Should have returned error but got ${response.statusCode}`);
        }
        
      } catch (error) {
        console.log(`❌ ${test.name}: Unexpected exception: ${error.message}`);
      }
    }
    
    const allPassed = passed === tests.length;
    console.log(`${allPassed ? '✅' : '❌'} Error handling: ${passed}/${tests.length} tests passed`);
    
    return allPassed;
  }
}

// Export for use
export const integrationTester = new IntegrationTester();

// Run if called directly
if (require.main === module) {
  (async () => {
    const tester = new IntegrationTester();
    
    console.log('🧪 Running integration tests...\n');
    
    await tester.runIntegrationTestSuite();
    await tester.testCorsHandling();
    await tester.testErrorHandling();
    
    console.log('\n✅ Integration testing complete');
  })();
}