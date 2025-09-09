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
   * Combined prompt for category detection and service splitting
   */
  private static readonly COMBINED_PROMPT = `You are a landscaping category identifier and service splitter. Analyze the input for ALL services and split them cleanly.

STEP 1 - CATEGORY DETECTION (generous matching):
- hardscaping: patio, pavers, wall, retaining walls, pergola, flagstone, walkway, steps
- planting: tree, shrub, flower, plant, lawn, seed, straw, pot
- drainage: drain, downspout, spout, gutter, french, creek, flow, water management, system
- materials: mulch, topsoil, dirt, soil, rock, ground, chips, rainbow, straw
- removal: sod removal, grass excavation, removal
- edging: edging, border, metal, stone, spade, cut
- structures: kitchen, pergola, gathering, social spot, cedar, intellishade

STEP 2 - SERVICE SPLITTING:
Split using separation clues: 'and', 'plus', 'also', ',', 'with', numbers followed by different service types, different units/measurements

TASK: Find ALL categories AND split into individual services, tagging each with its category.

OUTPUT COMBINED JSON:
{
  "detected_categories": ["category1", "category2"],
  "separated_services": [
    "individual service text 1, category1",
    "individual service text 2, category2"
  ],
  "service_count": 2,
  "confidence": "high"
}

EXAMPLES:
Input: "20x15 patio with 100 sqft mulch and 40 feet metal edging"
Output: {
  "detected_categories": ["hardscaping", "materials", "edging"],
  "separated_services": [
    "20x15 patio, hardscaping",
    "100 sqft mulch, materials", 
    "40 feet metal edging, edging"
  ],
  "service_count": 3,
  "confidence": "high"
}`;

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
      
      // 🤖 ENHANCED DEBUG: GPT PARSED RESULT
      console.log('🤖 GPT PARSED RESULT:', {
        serviceCount: result.service_count,
        categories: result.detected_categories,
        separatedServices: result.separated_services,
        confidence: result.confidence
      });
      
      console.log(`✅ GPT Analysis: ${result.service_count} services in ${result.detected_categories.length} categories`);
      
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
        confidence: parsed.confidence || 'medium'
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
      confidence: 'medium'
    };

    console.log(`🔍 Mock Analysis: ${result.service_count} services in ${result.detected_categories.length} categories`);
    
    return result;
  }

  /**
   * Mock category detection using rule-based matching
   */
  private detectCategoriesMock(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const categories = new Set<string>();

    // Category patterns (generous matching)
    const categoryPatterns = {
      hardscaping: /\b(patio|pavers?|wall|retaining|pergola|flagstone|walkway|steps?|stone|concrete|brick)\b/,
      planting: /\b(tree|shrub|flower|plant|lawn|seed|straw|pot|sod|grass)\b/,
      drainage: /\b(drain|downspout|spout|gutter|french|creek|flow|water|system)\b/,
      materials: /\b(mulch|topsoil|dirt|soil|rock|ground|chips|rainbow|straw)\b/,
      removal: /\b(removal|excavation)\b/,
      edging: /\b(edging|border|metal|steel|aluminum|spade|cut|trim)\b/,
      structures: /\b(kitchen|pergola|gathering|social|spot|cedar|intellishade|structure)\b/
    };

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

    // Service-specific matching
    const serviceMatches = {
      hardscaping: /\b(patio|pavers?|wall|retaining|walkway|steps?|stone|concrete)\b/,
      planting: /\b(tree|shrub|flower|plant|lawn|seed|sod|grass)\b/,
      drainage: /\b(drain|downspout|spout|gutter|french|creek|flow)\b/,
      materials: /\b(mulch|topsoil|dirt|soil|rock|ground|chips)\b/,
      removal: /\b(removal|excavation)\b/,
      edging: /\b(edging|border|metal|steel|aluminum)\b/,
      structures: /\b(kitchen|pergola|gathering|cedar|structure)\b/
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