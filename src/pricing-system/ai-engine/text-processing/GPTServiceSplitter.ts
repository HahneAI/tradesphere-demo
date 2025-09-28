#!/usr/bin/env node
/**
 * GPT Service Splitter - Combined Category Detection & Service Splitting
 * 
 * Single GPT-4o-mini API service combining both Make.com modules:
 * 1. Category detection with generous matching
 * 2. Service splitting using separation clues
 * 
 * Features:
 * - OpenAI GPT-4o-mini integration
 * - Mock fallback mode for testing
 * - JSON response validation
 * - Error handling with graceful degradation
 */

export interface CategorySplitResult {
  detected_categories: string[];
  separated_services: string[];
  service_count: number;
  confidence: 'high' | 'medium' | 'low';
  masterFormulaMode: boolean; // Flag to trigger master formula for paver patios
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class GPTServiceSplitter {
  private static readonly API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  private static readonly MODEL = 'gpt-4o-mini';
  
  /**
   * FOCUSED PROMPT - Paver Patio Master Formula Primary
   * Google Sheets integration disabled - Services tab expansion coming
   */
  private static readonly COMBINED_PROMPT = `You are a paver patio specialist focusing on hardscaping detection. The system is currently optimized for paver patio projects using advanced master formula calculations.

🎯 MASTER FORMULA FOCUS: This system prioritizes paver patio projects for sophisticated pricing.

STEP 1 - PRIMARY DETECTION (paver patio focus):
- hardscaping: patio, pavers, stone patio, brick patio, flagstone patio, hardscape, outdoor living, backyard patio, bluestone, travertine

STEP 2 - SERVICE IDENTIFICATION:
Focus on paver patio variations and measurements. Look for square footage, dimensions, or descriptive size terms.

TASK: Identify paver patio projects and extract key details for master formula routing.

OUTPUT COMBINED JSON:
{
  "detected_categories": ["hardscaping"],
  "separated_services": [
    "paver patio service details, hardscaping"
  ],
  "service_count": 1,
  "confidence": "high"
}

EXAMPLES:
Input: "200 sqft paver patio removing concrete"
Output: {
  "detected_categories": ["hardscaping"],
  "separated_services": [
    "200 sqft paver patio removing concrete, hardscaping"
  ],
  "service_count": 1,
  "confidence": "high"
}

Input: "15x20 stone patio with premium materials"
Output: {
  "detected_categories": ["hardscaping"],
  "separated_services": [
    "15x20 stone patio with premium materials, hardscaping"
  ],
  "service_count": 1,
  "confidence": "high"
}

NOTE: Non-paver requests will be handled through Services database tab expansion. For now, focus on detecting and routing paver patio projects to the master formula system.`;

  /**
   * Main analysis method - combines category detection and service splitting
   */
  async analyzeAndSplit(input: string): Promise<CategorySplitResult> {
    // Safe environment variable access helper
    const getEnvVar = (key: string): string | undefined => {
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
      }
      try {
        if (typeof import.meta !== 'undefined' && import.meta?.env?.[key]) {
          return import.meta.env[key];
        }
      } catch (e) {
        // import.meta not available in this environment
      }
      return undefined;
    };

    const apiKey = getEnvVar('VITE_OPENAI_API_KEY_MINI') || getEnvVar('VITE_AI_API_KEY');
    
    if (!apiKey) {
      console.log('🔄 No OpenAI API key found, using mock mode');
      console.log('💡 Environment check:', {
        processEnv: !!getEnvVar('VITE_OPENAI_API_KEY_MINI'),
        hasProcessEnv: typeof process !== 'undefined'
      });
      console.log('💡 To use GPT-4o-mini API: Set VITE_OPENAI_API_KEY_MINI in your .env file');
      return this.mockAnalyzeAndSplit(input);
    }
    
    // Add masked key debug
    console.log('✅ Using GPT-4o-mini API Key:', 
      `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
    
    console.log('🔍 Environment Variables Status:');
    console.log('   - VITE_OPENAI_API_KEY_MINI:', apiKey ? 'SET' : 'NOT SET');
    console.log('   - DEBUG_MODE:', getEnvVar('DEBUG_MODE') || 'undefined');

    try {
      // 🤖 ENHANCED DEBUG: GPT REQUEST PAYLOAD
      console.log('🤖 GPT REQUEST PAYLOAD:', {
        input: input,
        model: GPTServiceSplitter.MODEL,
        prompt: GPTServiceSplitter.COMBINED_PROMPT.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
      const response = await this.callOpenAI(input, apiKey);
      
      // 🤖 ENHANCED DEBUG: GPT RAW RESPONSE
      console.log('🤖 GPT RAW RESPONSE:', {
        choices: response.choices?.length || 0,
        content: response.choices?.[0]?.message?.content?.substring(0, 200) + '...',
        usage: response.usage
      });
      
      const result = this.parseGPTResponse(response.choices[0].message.content);

      // Add master formula mode detection
      result.masterFormulaMode = this.isPaverPatioRequest(input, result.detected_categories, result.confidence);

      // 🤖 ENHANCED DEBUG: GPT PARSED RESULT
      console.log('🤖 GPT PARSED RESULT:', {
        serviceCount: result.service_count,
        categories: result.detected_categories,
        separatedServices: result.separated_services,
        confidence: result.confidence,
        masterFormulaMode: result.masterFormulaMode
      });

      console.log(`✅ GPT Analysis: ${result.service_count} services in ${result.detected_categories.length} categories${result.masterFormulaMode ? ' [MASTER FORMULA MODE]' : ''}`);

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ GPT API failed, falling back to mock mode');
      console.warn(`   Error: ${errorMessage}`);
      
      // Provide specific guidance based on error type
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.warn('   💡 Check your VITE_OPENAI_API_KEY_MINI - it may be invalid or expired');
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        console.warn('   💡 Rate limit exceeded - consider using mock mode during development');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        console.warn('   💡 Network error - check your internet connection');
      }
      
      return this.mockAnalyzeAndSplit(input);
    }
  }

  /**
   * Call OpenAI GPT-4o-mini API
   */
  private async callOpenAI(input: string, apiKey: string): Promise<OpenAIResponse> {
    const requestBody = {
      model: GPTServiceSplitter.MODEL,
      messages: [
        {
          role: 'system',
          content: GPTServiceSplitter.COMBINED_PROMPT
        },
        {
          role: 'user',
          content: `USER INPUT: ${input}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    };

    // 🤖 ENHANCED DEBUG: API REQUEST DETAILS
    console.log('🤖 API REQUEST DETAILS:', {
      endpoint: GPTServiceSplitter.API_ENDPOINT,
      model: requestBody.model,
      temperature: requestBody.temperature,
      maxTokens: requestBody.max_tokens,
      messageCount: requestBody.messages.length,
      userInputLength: input.length,
      apiKeyMasked: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
    });

    const response = await fetch(GPTServiceSplitter.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // 🤖 ENHANCED DEBUG: HTTP RESPONSE STATUS
    console.log('🤖 HTTP RESPONSE STATUS:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    return data;
  }

  /**
   * Parse and validate GPT response JSON
   */
  private parseGPTResponse(response: string): CategorySplitResult {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in GPT response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.detected_categories || !Array.isArray(parsed.detected_categories)) {
        throw new Error('Invalid detected_categories in GPT response');
      }
      
      if (!parsed.separated_services || !Array.isArray(parsed.separated_services)) {
        throw new Error('Invalid separated_services in GPT response');
      }

      return {
        detected_categories: parsed.detected_categories,
        separated_services: parsed.separated_services,
        service_count: parsed.service_count || parsed.separated_services.length,
        confidence: parsed.confidence || 'medium',
        masterFormulaMode: false // Will be set by calling method
      };

    } catch (error) {
      throw new Error(`Failed to parse GPT response: ${error}`);
    }
  }

  /**
   * Mock fallback mode for testing without API costs
   */
  private mockAnalyzeAndSplit(input: string): CategorySplitResult {
    console.log('🧪 MOCK MODE: Rule-based category detection and service splitting');

    const categories = this.detectCategoriesMock(input);
    const services = this.splitServicesMock(input, categories);

    const result: CategorySplitResult = {
      detected_categories: categories,
      separated_services: services,
      service_count: services.length,
      confidence: 'medium',
      masterFormulaMode: false // Will be updated below
    };

    // Add master formula mode detection for mock mode
    result.masterFormulaMode = this.isPaverPatioRequest(input, result.detected_categories, result.confidence);

    console.log(`🔍 Mock Analysis: ${result.service_count} services in ${result.detected_categories.length} categories${result.masterFormulaMode ? ' [MASTER FORMULA MODE]' : ''}`);

    return result;
  }

  /**
   * Mock category detection using rule-based matching
   */
  private detectCategoriesMock(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const categories = new Set<string>();

    // FOCUSED DETECTION - Paver Patio Primary (Master Formula Focus)
    // Other service detection commented out for master formula transition
    const categoryPatterns = {
      hardscaping: /\b(patio|pavers?|stone\s+patio|brick\s+patio|hardscape|flagstone|outdoor\s+living|bluestone|travertine)\b/,

      // COMMENTED OUT - Other services disabled for master formula focus
      // Will be re-enabled through Services database tab expansion
      /*
      planting: /\b(tree|shrub|flower|plant|lawn|seed|straw|pot|sod|grass)\b/,
      drainage: /\b(drain|downspout|spout|gutter|french|creek|flow|water|system)\b/,
      materials: /\b(mulch|topsoil|dirt|soil|rock|ground|chips|rainbow|straw)\b/,
      removal: /\b(removal|excavation)\b/,
      edging: /\b(edging|border|metal|steel|aluminum|spade|cut|trim)\b/,
      structures: /\b(kitchen|pergola|gathering|social|spot|cedar|intellishade|structure)\b/
      */
    };

    console.log('🎯 PAVER PATIO FOCUSED DETECTION ACTIVE (Google Sheets disabled)');

    for (const [category, pattern] of Object.entries(categoryPatterns)) {
      if (pattern.test(lowerInput)) {
        categories.add(category);
      }
    }

    return Array.from(categories);
  }

  /**
   * Mock service splitting using regex-based separation
   */
  private splitServicesMock(input: string, categories: string[]): string[] {
    const services: string[] = [];
    
    // Split on common separators
    const separators = /\b(?:and|plus|also|with)\b|,|;/gi;
    const parts = input.split(separators).map(part => part.trim()).filter(part => part.length > 0);

    if (parts.length === 1) {
      // Single service - assign primary category
      const primaryCategory = categories.length > 0 ? categories[0] : 'general';
      services.push(`${parts[0]}, ${primaryCategory}`);
    } else {
      // Multiple services - try to match each with appropriate category
      for (const part of parts) {
        const matchedCategory = this.matchServiceToCategory(part, categories);
        services.push(`${part}, ${matchedCategory}`);
      }
    }

    return services;
  }

  /**
   * Match individual service part to most appropriate category
   */
  private matchServiceToCategory(servicePart: string, availableCategories: string[]): string {
    const lowerPart = servicePart.toLowerCase();

    // FOCUSED SERVICE MATCHING - Paver Patio Primary
    const serviceMatches = {
      hardscaping: /\b(patio|pavers?|stone\s+patio|brick\s+patio|hardscape|flagstone|outdoor\s+patio|backyard\s+patio)\b/,

      // COMMENTED OUT - Other services disabled for master formula focus
      /*
      planting: /\b(tree|shrub|flower|plant|lawn|seed|sod|grass)\b/,
      drainage: /\b(drain|downspout|spout|gutter|french|creek|flow)\b/,
      materials: /\b(mulch|topsoil|dirt|soil|rock|ground|chips)\b/,
      removal: /\b(removal|excavation)\b/,
      edging: /\b(edging|border|metal|steel|aluminum)\b/,
      structures: /\b(kitchen|pergola|gathering|cedar|structure)\b/
      */
    };

    // Find best match
    for (const [category, pattern] of Object.entries(serviceMatches)) {
      if (availableCategories.includes(category) && pattern.test(lowerPart)) {
        return category;
      }
    }

    // Fallback to first available category
    return availableCategories.length > 0 ? availableCategories[0] : 'general';
  }

  /**
   * Enhanced paver patio detection for master formula routing
   */
  private isPaverPatioRequest(input: string, categories: string[], confidence: 'high' | 'medium' | 'low'): boolean {
    const lowerInput = input.toLowerCase();

    // High confidence paver patio patterns (explicit mentions with measurements)
    const highConfidencePatterns = [
      /\b\d+\s*(?:sq\.?\s*ft\.?|sqft|square\s+feet)\s+(?:paver\s+)?patio\b/,
      /\b(?:paver\s+)?patio\s+\d+\s*(?:sq\.?\s*ft\.?|sqft|square\s+feet)\b/,
      /\b\d+\s*x\s*\d+\s+(?:paver\s+|stone\s+)?patio\b/,
      /\b\d+\s*ft\s*x\s*\d+\s*ft\s+(?:paver\s+|stone\s+)?patio\b/,
      /\b\d+\s*by\s*\d+\s+(?:paver\s+|stone\s+)?patio\b/
    ];

    // Medium confidence patterns (clear patio intentions)
    const mediumConfidencePatterns = [
      /\bpaver\s+patio\b/,
      /\bstone\s+patio\b/,
      /\bconcrete\s+paver\b/,
      /\bpatio\s+(?:with\s+)?pavers?\b/,
      /\bpatio\s+(?:using\s+)?(?:paver|stone|brick)s?\b/,
      /\b(?:install|build|create)\s+(?:a\s+)?(?:paver\s+)?patio\b/
    ];

    // Enhanced patterns for dimensional calculations
    const dimensionalPatterns = [
      /\b\d+\s*(?:sq\.?\s*ft\.?|sqft)\s+patio\b/,
      /\bpatio\s+\d+\s*(?:sq\.?\s*ft\.?|sqft)\b/,
      /\b\d+\s*x\s*\d+\s+(?:foot|ft)\s+patio\b/
    ];

    // Semantic similarity patterns (catch variations)
    const semanticPatterns = [
      /\b(?:flagstone|bluestone|travertine|natural\s+stone)\s+patio\b/,
      /\bpatio\s+(?:installation|construction|project)\b/,
      /\bbackyard\s+patio\b/,
      /\boutdoor\s+patio\b/,
      /\bpatio\s+(?:area|space)\b/
    ];

    // Check for hardscaping category first
    if (!categories.includes('hardscaping')) {
      return false;
    }

    // High confidence detection (explicit with measurements)
    if (highConfidencePatterns.some(pattern => pattern.test(lowerInput))) {
      console.log('🎯 HIGH CONFIDENCE paver patio detected - enabling master formula mode');
      return true;
    }

    // Medium confidence detection (clear patio intentions)
    if ((confidence === 'high' || confidence === 'medium') &&
        mediumConfidencePatterns.some(pattern => pattern.test(lowerInput))) {
      console.log('🎯 MEDIUM CONFIDENCE paver patio detected - enabling master formula mode');
      return true;
    }

    // Dimensional pattern detection (measurements imply patio project)
    if (dimensionalPatterns.some(pattern => pattern.test(lowerInput))) {
      const hasPatioKeyword = /\bpatio\b/.test(lowerInput);
      if (hasPatioKeyword) {
        console.log('🎯 DIMENSIONAL CONFIDENCE paver patio detected - enabling master formula mode');
        return true;
      }
    }

    // Semantic similarity detection (catch stone patio variations)
    if ((confidence === 'high' || confidence === 'medium') &&
        semanticPatterns.some(pattern => pattern.test(lowerInput))) {
      console.log('🎯 SEMANTIC CONFIDENCE paver patio detected - enabling master formula mode');
      return true;
    }

    // Enhanced fallback for missed obvious cases
    const patioKeyword = /\bpatio\b/.test(lowerInput);
    const hardscapingTerms = /\b(?:paver|stone|brick|flagstone|concrete|hardscape)\b/.test(lowerInput);
    const measurements = /\b\d+\s*(?:sq\.?\s*ft\.?|sqft|square\s+feet|x\s*\d+|by\s*\d+)\b/.test(lowerInput);

    if (patioKeyword && hardscapingTerms && measurements && confidence !== 'low') {
      console.log('🎯 FALLBACK CONFIDENCE paver patio detected - enabling master formula mode');
      return true;
    }

    console.log('🔍 No master formula trigger detected - using standard Google Sheets routing');
    return false;
  }

  /**
   * Quick test method for debugging
   */
  static async quickTest(input: string): Promise<CategorySplitResult> {
    const splitter = new GPTServiceSplitter();
    console.log(`🧪 Testing GPTServiceSplitter with: "${input}"`);
    
    const result = await splitter.analyzeAndSplit(input);
    
    console.log('📊 RESULTS:');
    console.log(`Categories: [${result.detected_categories.join(', ')}]`);
    console.log(`Services: ${result.service_count}`);
    result.separated_services.forEach((service, i) => {
      console.log(`  ${i + 1}. ${service}`);
    });
    console.log(`Confidence: ${result.confidence}`);
    
    return result;
  }
}

// Export for testing
export { GPTServiceSplitter as default };

// CLI interface for quick testing
if (process.argv[1] && process.argv[1].endsWith('GPTServiceSplitter.ts')) {
  // Safe environment variable access helper
  const getEnvVar = (key: string): string | undefined => {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    return undefined;
  };
  
  const testInput = getEnvVar('TEST_INPUT') || '15x10 patio with wood chips and steel edging';
  GPTServiceSplitter.quickTest(testInput)
    .then(() => console.log('\n✅ GPTServiceSplitter test completed'))
    .catch(error => console.error('❌ GPTServiceSplitter test failed:', error));
}