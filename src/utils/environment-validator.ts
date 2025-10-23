/**
 * Environment Variable Validation Utility
 * 
 * Validates required environment variables and provides clear error messages
 * for TradeSphere's dual AI API key setup
 */

export interface EnvironmentConfig {
  mainAIKey?: string;
  gptMiniKey?: string;
  googleSheetsKey?: string;
  makeWebhookUrl?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: EnvironmentConfig;
}

export class EnvironmentValidator {
  
  /**
   * Validate all environment variables and return status
   */
  static validateEnvironment(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Get environment variables (supporting both Vite and Node.js)
    const config: EnvironmentConfig = {
      mainAIKey: this.getEnvVar('VITE_AI_API_KEY'),
      gptMiniKey: this.getEnvVar('VITE_OPENAI_API_KEY_MINI'),
      googleSheetsKey: this.getEnvVar('VITE_GOOGLE_SHEETS_API_KEY'),
      makeWebhookUrl: this.getEnvVar('VITE_MAKE_WEBHOOK_URL')
    };

    // Validate main AI API key
    if (!config.mainAIKey || config.mainAIKey.includes('your_')) {
      warnings.push('Main AI API key (VITE_AI_API_KEY) not configured - main chat functionality may be limited');
    }

    // Validate GPT-4o-mini key
    if (!config.gptMiniKey || config.gptMiniKey.includes('your_')) {
      warnings.push('GPT-4o-mini API key (VITE_OPENAI_API_KEY_MINI) not configured - using mock mode for service splitting');
    }

    // Validate Google Sheets key
    if (!config.googleSheetsKey || config.googleSheetsKey.includes('your_')) {
      warnings.push('Google Sheets API key not configured - pricing calculations may be limited');
    }

    // Validate Make.com webhook
    if (!config.makeWebhookUrl || config.makeWebhookUrl.includes('YOUR_')) {
      warnings.push('Make.com webhook URL not configured - AI integration may be limited');
    }

    const isValid = errors.length === 0;
    
    return {
      isValid,
      errors,
      warnings,
      config
    };
  }

  /**
   * Log environment status to console with colored output
   */
  static logEnvironmentStatus(): ValidationResult {
    const result = this.validateEnvironment();
    
    console.log('\n🔍 TRADESPHERE ENVIRONMENT VALIDATION');
    console.log('====================================');
    
    if (result.isValid) {
      console.log('✅ Environment validation passed');
    } else {
      console.log('❌ Environment validation failed');
    }

    // Log configuration status
    console.log('\n📊 API KEY STATUS:');
    console.log(`   Main AI Key (VITE_AI_API_KEY): ${this.getStatusIcon(result.config.mainAIKey)}`);
    console.log(`   GPT-4o-mini Key (VITE_OPENAI_API_KEY_MINI): ${this.getStatusIcon(result.config.gptMiniKey)}`);
    console.log(`   Google Sheets Key (VITE_GOOGLE_SHEETS_API_KEY): ${this.getStatusIcon(result.config.googleSheetsKey)}`);
    console.log(`   Make.com Webhook (VITE_MAKE_WEBHOOK_URL): ${this.getStatusIcon(result.config.makeWebhookUrl)}`);

    // Log errors
    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    // Log warnings
    if (result.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    console.log('');
    
    return result;
  }

  /**
   * Get API key usage documentation
   */
  static getAPIKeyDocumentation(): string {
    return `
🔑 TRADESPHERE API KEY CONFIGURATION

TradeSphere uses dual AI API keys for optimal performance:

1. MAIN AI KEY (VITE_AI_API_KEY):
   • Purpose: Main chat interface and conversation AI
   • Used by: Make.com webhooks, main chat functionality
   • Get from: OpenAI Dashboard or Anthropic Console
   • Example: VITE_AI_API_KEY=sk-1234567890abcdef...

2. GPT-4O-MINI KEY (VITE_OPENAI_API_KEY_MINI):
   • Purpose: Fast service splitting and category detection
   • Used by: GPTServiceSplitter.ts for intelligent categorization
   • Get from: OpenAI Dashboard (https://platform.openai.com/api-keys)
   • Example: VITE_OPENAI_API_KEY_MINI=sk-proj-1234567890...

💡 BENEFITS OF DUAL KEYS:
   • Cost optimization: Use cheaper GPT-4o-mini for parsing tasks
   • Rate limiting: Separate limits for different functionality
   • Monitoring: Track usage by service type
   • Fallback: If one key fails, other services continue

🚀 SETUP INSTRUCTIONS:
   1. Copy .env.example to .env
   2. Add your API keys to the .env file
   3. Restart your development server
   4. Run npm run test:gpt to verify setup
`;
  }

  /**
   * Get environment variable (supporting both Vite and Node.js)
   */
  private static getEnvVar(name: string): string | undefined {
    // Try process.env first (works in both Node.js and bundled environments)
    return process.env[name];
  }

  /**
   * Get status icon for environment variable
   */
  private static getStatusIcon(value: string | undefined): string {
    if (!value) return '❌ Not set';
    if (value.includes('your_') || value.includes('YOUR_')) return '⚠️ Example value';
    return '✅ Configured';
  }

  /**
   * Validate specific API key format
   */
  static validateAPIKeyFormat(key: string, keyType: 'openai' | 'claude' = 'openai'): boolean {
    if (!key) return false;
    
    switch (keyType) {
      case 'openai':
        return key.startsWith('sk-') && key.length > 20;
      case 'claude':
        return key.startsWith('sk-ant-') && key.length > 20;
      default:
        return key.length > 10; // Basic validation
    }
  }

  /**
   * Get environment recommendations based on current setup
   */
  static getRecommendations(): string[] {
    const result = this.validateEnvironment();
    const recommendations: string[] = [];

    if (!result.config.gptMiniKey) {
      recommendations.push('Set VITE_OPENAI_API_KEY_MINI to enable fast GPT-powered service splitting');
    }

    if (!result.config.mainAIKey) {
      recommendations.push('Set VITE_AI_API_KEY for full chat functionality');
    }

    if (result.warnings.length === 0) {
      recommendations.push('🎉 All API keys configured! Ready for optimal performance');
    }

    return recommendations;
  }
}

// Export validation function for easy importing
export const validateEnvironment = () => EnvironmentValidator.validateEnvironment();
export const logEnvironmentStatus = () => EnvironmentValidator.logEnvironmentStatus();