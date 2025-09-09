/**
 * DebugHelper - Centralized debugging utilities for TradeSphere
 * 
 * Provides comprehensive logging helpers for environment status,
 * service mapping, and performance timing analysis
 */

export class DebugHelper {
  
  /**
   * Log current environment configuration status
   * Safe logging that masks sensitive information
   */
  static logEnvironmentStatus() {
    console.log('🔧 ENVIRONMENT STATUS:', {
      hasMainAI: !!process.env.VITE_AI_API_KEY,
      hasGPTMini: !!process.env.VITE_OPENAI_API_KEY_MINI,
      hasGoogleSheets: !!process.env.VITE_GOOGLE_SHEETS_SHEET_ID,
      hasSupabase: !!process.env.VITE_SUPABASE_URL,
      hasMakeWebhook: !!process.env.VITE_MAKE_WEBHOOK_URL,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
    
    // Additional detailed environment info for debugging
    console.log('🔧 ENVIRONMENT DETAILS:', {
      googleSheetId: process.env.VITE_GOOGLE_SHEETS_SHEET_ID?.substring(0, 10) + '...',
      supabaseUrl: process.env.VITE_SUPABASE_URL?.substring(0, 30) + '...',
      makeWebhookUrl: process.env.VITE_MAKE_WEBHOOK_URL?.substring(0, 30) + '...',
      mainAIKey: process.env.VITE_AI_API_KEY?.substring(0, 8) + '...',
      gptMiniKey: process.env.VITE_OPENAI_API_KEY_MINI?.substring(0, 8) + '...'
    });
  }

  /**
   * Log service mapping analysis results
   * Provides detailed breakdown of service recognition
   */
  static logServiceMappingDebug(input: string, result: any) {
    console.log('🗺️ SERVICE MAPPING DEBUG:', {
      input,
      servicesFound: result.services?.length || 0,
      confidence: result.confidence,
      categories: result.services?.map((s: any) => s.category) || [],
      serviceNames: result.services?.map((s: any) => s.serviceName) || [],
      quantities: result.services?.map((s: any) => `${s.quantity} ${s.unit}`) || [],
      rows: result.services?.map((s: any) => s.row) || [],
      specialServices: result.services?.filter((s: any) => s.isSpecial).length || 0,
      unmappedTextCount: result.unmappedText?.length || 0
    });
  }

  /**
   * Log comprehensive timing breakdown
   * Compares performance against Make.com baseline
   */
  static logTimingBreakdown(metrics: any) {
    const totalMs = metrics.totalTime || 0;
    const totalSeconds = (totalMs / 1000).toFixed(1);
    
    console.log('⏱️ TIMING BREAKDOWN:', {
      parameterCollection: (metrics.parameterCollectionTime || 0) + 'ms',
      pricingCalculation: (metrics.pricingCalculationTime || 0) + 'ms',
      responseFormatting: (metrics.responseFormattingTime || 0) + 'ms',
      conversationProcessing: (metrics.conversationProcessingTime || 0) + 'ms',
      total: totalMs + 'ms',
      totalSeconds: totalSeconds + 's',
      makeComComparison: '30-50s baseline',
      performanceImprovement: `${Math.max(0, ((30 - parseFloat(totalSeconds)) / 30 * 100)).toFixed(0)}% faster than Make.com`
    });
    
    // Performance analysis
    if (totalMs > 10000) {
      console.warn('⚠️ PERFORMANCE WARNING: Processing time exceeds 10 seconds');
    } else if (totalMs < 2000) {
      console.log('🚀 PERFORMANCE EXCELLENT: Sub-2-second response time');
    }
  }

  /**
   * Log Google Sheets API interaction details
   * Tracks sheet operations and performance
   */
  static logGoogleSheetsDebug(operation: string, details: any) {
    console.log(`📊 GOOGLE SHEETS ${operation.toUpperCase()}:`, {
      operation,
      sheetId: details.sheetId?.substring(0, 10) + '...',
      betaCodeId: details.betaCodeId,
      servicesProcessed: details.servicesCount || 0,
      success: details.success !== false,
      responseTime: details.responseTime + 'ms' || 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log AI API interactions (GPT, Claude, etc.)
   * Tracks API usage and response quality
   */
  static logAIInteractionDebug(provider: string, operation: string, details: any) {
    console.log(`🤖 ${provider.toUpperCase()} ${operation.toUpperCase()}:`, {
      provider,
      operation,
      model: details.model || 'unknown',
      inputLength: details.inputLength || 0,
      outputLength: details.outputLength || 0,
      responseTime: details.responseTime + 'ms' || 'unknown',
      success: details.success !== false,
      tokensUsed: details.tokensUsed || 'unknown',
      apiKeyMasked: details.apiKey?.substring(0, 8) + '...' || 'none',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log memory and resource usage
   * Helps identify potential memory leaks or performance issues
   */
  static logResourceUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      console.log('💾 RESOURCE USAGE:', {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024 * 100) / 100} MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024 * 100) / 100} MB`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log error details with context
   * Provides comprehensive error tracking
   */
  static logErrorWithContext(error: Error, context: any) {
    console.error('❌ ERROR WITH CONTEXT:', {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack?.split('\n')[0], // First line of stack trace
      context: {
        operation: context.operation || 'unknown',
        input: context.input?.substring(0, 100) + '...' || 'none',
        timestamp: new Date().toISOString(),
        sessionId: context.sessionId || 'unknown',
        userId: context.userId || 'unknown'
      }
    });
  }

  /**
   * Log session tracking information
   * Helps track user interactions and session flow
   */
  static logSessionDebug(sessionId: string, event: string, details: any) {
    console.log(`👤 SESSION ${event.toUpperCase()}:`, {
      sessionId: sessionId.substring(0, 12) + '...',
      event,
      userFirstName: details.firstName || 'unknown',
      betaCodeId: details.betaCodeId || 'none',
      messageCount: details.messageCount || 0,
      timestamp: new Date().toISOString(),
      additionalInfo: details.additionalInfo || {}
    });
  }
}