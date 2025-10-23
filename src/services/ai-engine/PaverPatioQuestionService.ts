/**
 * PaverPatioQuestionService - Dynamic Question Generation with GPT-4o
 *
 * Generates contextual, educational questions for gathering missing paver patio variables.
 * Uses GPT-4o to create personalized questions that explain why each variable matters.
 *
 * Features:
 * - GPT-4o powered question generation
 * - Educational context for each variable
 * - Impact explanations for pricing accuracy
 * - Fallback questions for API failures
 * - Response extraction and validation
 */

export interface QuestionContext {
  variableName: string;
  userMessage: string;
  confirmedVariables?: any;
  conversationHistory?: any[];
  questionCount?: number;
}

export interface GeneratedQuestion {
  question: string;
  educationalContext: string;
  impactExplanation: string;
  fallbackOptions?: string[];
}

export class PaverPatioQuestionService {
  private static readonly API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  private static readonly MODEL = 'gpt-4o';

  /**
   * Generate contextual question for specific variable using GPT-4o
   */
  static async generateVariableQuestion(context: QuestionContext): Promise<string> {
    console.log(`🎯 GENERATING QUESTION FOR: ${context.variableName}`);
    console.log(`Context: Question #${context.questionCount || 1}`);

    const questionPrompt = this.buildQuestionPrompt(context);

    try {
      const response = await this.callGPT4oAPI(questionPrompt);
      const result = JSON.parse(response);

      console.log('🎯 QUESTION GENERATED:');
      console.log(`  Variable: ${context.variableName}`);
      console.log(`  Question: "${result.question}"`);
      console.log(`  Educational: "${result.educationalContext}"`);

      // Combine question with educational context
      return this.formatQuestionWithContext(result);

    } catch (error) {
      console.error('❌ QUESTION GENERATION FAILED:', error);
      return this.getFallbackQuestion(context.variableName, context);
    }
  }

  /**
   * Build question generation prompt with variable education
   */
  private static buildQuestionPrompt(context: QuestionContext): string {
    const variableInfo = this.getVariableInformation(context.variableName);

    return `You are a friendly landscaping consultant helping a customer get an accurate paver patio quote. Generate a conversational question to gather information about ${context.variableName}.

VARIABLE: ${context.variableName}
USER'S ORIGINAL MESSAGE: "${context.userMessage}"
QUESTION NUMBER: ${context.questionCount || 1}

VARIABLE INFORMATION:
- Description: ${variableInfo.description}
- Impact on Project: ${variableInfo.impact}
- Why It Matters: ${variableInfo.importance}
- Common Options: ${variableInfo.options}

QUESTION REQUIREMENTS:
1. Conversational and friendly tone (like talking to a neighbor)
2. Explain WHY this information matters for accurate pricing
3. Provide clear options or examples to choose from
4. Keep the question concise but informative (2-3 sentences max)
5. Make it easy for customer to respond with useful information
6. Use language a homeowner would understand (avoid technical jargon)

RESPONSE FORMAT:
{
  "question": "The actual question to ask the customer",
  "educationalContext": "Brief explanation of why this matters for accurate pricing",
  "impactExplanation": "How this variable affects the final quote",
  "suggestedResponses": ["option 1", "option 2", "option 3"]
}

EXAMPLES:

For tearoutComplexity:
{
  "question": "What's currently in the patio area that needs to be removed? This significantly affects labor time and equipment needs.",
  "educationalContext": "Removing concrete takes 3-4x longer than grass removal and requires special equipment.",
  "impactExplanation": "Concrete removal can add $800-1200 to your project vs. simple grass removal.",
  "suggestedResponses": ["Just grass/sod", "Existing concrete patio", "Asphalt or pavement"]
}

For accessDifficulty:
{
  "question": "How would you describe access to the work area? Can equipment drive right up, or will materials need to be carried?",
  "educationalContext": "Access difficulty is a major factor in labor efficiency and project timeline.",
  "impactExplanation": "Difficult access can double labor time, affecting both cost and schedule.",
  "suggestedResponses": ["Easy - drive right up", "Moderate - some maneuvering needed", "Difficult - hand-carry materials through gate"]
}

GENERATE QUESTION FOR ${context.variableName}:`;
  }

  /**
   * Format question with educational context
   */
  private static formatQuestionWithContext(result: any): string {
    const { question, educationalContext, impactExplanation, suggestedResponses } = result;

    let formattedQuestion = question;

    // Add educational context if provided
    if (educationalContext) {
      formattedQuestion += `\n\n💡 ${educationalContext}`;
    }

    // Add impact explanation if provided
    if (impactExplanation) {
      formattedQuestion += `\n📊 ${impactExplanation}`;
    }

    // Add suggested responses if provided
    if (suggestedResponses && suggestedResponses.length > 0) {
      formattedQuestion += `\n\nCommon options:\n${suggestedResponses.map((option, i) => `${i + 1}. ${option}`).join('\n')}`;
    }

    return formattedQuestion;
  }

  /**
   * Extract variable value from user response using GPT-4o
   */
  static async extractVariableFromResponse(userResponse: string, variableName: string): Promise<any> {
    console.log(`🔍 EXTRACTING ${variableName} FROM: "${userResponse}"`);

    const extractionPrompt = this.buildExtractionPrompt(userResponse, variableName);

    try {
      const response = await this.callGPT4oAPI(extractionPrompt);
      const result = JSON.parse(response);

      console.log(`🔍 EXTRACTION RESULT: ${variableName} = ${result.value} (confidence: ${result.confidence})`);

      return result.value;
    } catch (error) {
      console.error('❌ VARIABLE EXTRACTION FAILED:', error);
      return this.extractVariableWithFallback(userResponse, variableName);
    }
  }

  /**
   * Build extraction prompt for specific variable
   */
  private static buildExtractionPrompt(userResponse: string, variableName: string): string {
    const extractionInfo = this.getExtractionRules(variableName);

    return `Extract the ${variableName} value from the user's response. Be intelligent about interpreting their answer.

VARIABLE: ${variableName}
VALID VALUES: ${extractionInfo.validValues}
EXTRACTION RULES: ${extractionInfo.rules}
EXAMPLES: ${extractionInfo.examples}

USER RESPONSE: "${userResponse}"

Analyze the user's response and extract the most appropriate value. Consider:
- Direct mentions of the variable
- Implied information from context
- Common synonyms and variations
- Numeric values that need calculation

If the response is unclear or doesn't contain relevant information, return null.

RESPOND WITH JSON:
{
  "value": extracted_value_or_null,
  "confidence": number_between_0_and_1,
  "reasoning": "brief explanation of how you extracted this value"
}

EXTRACT THE VALUE:`;
  }

  /**
   * Get variable information for question generation
   */
  private static getVariableInformation(variableName: string): any {
    const variableInfo = {
      squareFootage: {
        description: "The total area of the paver patio in square feet",
        impact: "Primary cost driver - affects material quantities and labor time",
        importance: "Accurate square footage is essential for materials ordering and realistic timeline",
        options: "Can be provided as dimensions (12x15) or total square feet (180 sqft)"
      },
      tearoutComplexity: {
        description: "What needs to be removed from the patio area before installation",
        impact: "Significantly affects labor time and equipment requirements",
        importance: "Concrete removal requires special equipment and adds 20-30% to project cost",
        options: "Grass/sod (baseline), concrete/pavement (+25% cost), asphalt (+30% cost)"
      },
      accessDifficulty: {
        description: "How easy it is for workers and equipment to reach the work area",
        impact: "Major factor in labor efficiency and project timeline",
        importance: "Difficult access can double labor time and limit equipment options",
        options: "Easy (equipment access), moderate (some maneuvering), difficult (hand-carry only)"
      },
      teamSize: {
        description: "Optimal number of workers for this project size and conditions",
        impact: "Affects completion timeline and labor costs",
        importance: "Right team size balances efficiency with space constraints",
        options: "2-person team (tight spaces, longer timeline), 3+ person team (optimal efficiency)"
      },
      cuttingComplexity: {
        description: "Amount of paver cutting required for edges, curves, and patterns",
        impact: "Adds labor hours and material waste",
        importance: "Complex cutting can add 8-12 hours of specialized labor",
        options: "Minimal (straight edges), moderate (some curves), complex (intricate patterns)"
      },
      equipmentRequired: {
        description: "Machinery needed based on site conditions and tearout requirements",
        impact: "Daily rental costs and capability requirements",
        importance: "Right equipment ensures efficient work and prevents delays",
        options: "Hand tools only, jackhammers/attachments, light machinery, heavy equipment"
      },
      paverStyle: {
        description: "Quality and style of pavers affecting material costs",
        impact: "Material cost variation and installation complexity",
        importance: "Premium materials add 25-40% to material costs but increase property value",
        options: "Economy grade (standard concrete), premium (natural stone, designer options)"
      },
      patternComplexity: {
        description: "Complexity of paver laying pattern affecting material waste",
        impact: "Material waste percentage and installation time",
        importance: "Complex patterns create 15-25% material waste due to cutting",
        options: "Minimal (running bond), some (herringbone), extensive (multiple patterns)"
      },
      obstacleRemoval: {
        description: "Trees, shrubs, or structures that need removal before work begins",
        impact: "Additional labor and disposal costs",
        importance: "Obstacle removal is typically charged as separate line items",
        options: "No obstacles, minor obstacles (shrubs - $300-500), major obstacles (trees - $800-1200)"
      },
      overallComplexity: {
        description: "General project difficulty based on design, site conditions, and requirements",
        impact: "Final adjustment multiplier applied to total project cost",
        importance: "Accounts for unforeseen challenges and design complexity",
        options: "Simple (1.0x), standard (1.1x), complex (1.3x), extreme (1.5x)"
      }
    };

    return variableInfo[variableName] || {
      description: `Information about ${variableName}`,
      impact: 'Affects project cost and timeline',
      importance: 'Important for accurate pricing',
      options: 'Various options available'
    };
  }

  /**
   * Get extraction rules for specific variable
   */
  private static getExtractionRules(variableName: string): any {
    const extractionRules = {
      squareFootage: {
        validValues: "Positive number (square feet)",
        rules: "Extract from direct mentions or calculate from dimensions (length × width)",
        examples: "'200 sqft' → 200, '15x20' → 300, 'about 250' → 250, 'medium size' → 250"
      },
      tearoutComplexity: {
        validValues: "'grass', 'concrete', 'asphalt'",
        rules: "Identify what material needs to be removed",
        examples: "'concrete patio' → 'concrete', 'existing pavement' → 'asphalt', 'grass area' → 'grass'"
      },
      accessDifficulty: {
        validValues: "'easy', 'moderate', 'difficult'",
        rules: "Assess how difficult it is to bring equipment and materials to work area",
        examples: "'drive right up' → 'easy', 'narrow gate' → 'difficult', 'some tight spaces' → 'moderate'"
      },
      teamSize: {
        validValues: "'twoPerson', 'threePlus'",
        rules: "Determine optimal crew size based on space constraints and efficiency needs",
        examples: "'small crew' → 'twoPerson', 'full team' → 'threePlus', 'tight space' → 'twoPerson'"
      },
      cuttingComplexity: {
        validValues: "'minimal', 'moderate', 'complex'",
        rules: "Assess amount of paver cutting needed for shapes and patterns",
        examples: "'straight edges' → 'minimal', 'some curves' → 'moderate', 'lots of cutting' → 'complex'"
      },
      equipmentRequired: {
        validValues: "'handTools', 'attachments', 'lightMachinery', 'heavyMachinery'",
        rules: "Determine equipment needs based on site conditions and removal requirements",
        examples: "'hand tools only' → 'handTools', 'jackhammer needed' → 'attachments', 'bobcat access' → 'lightMachinery'"
      },
      paverStyle: {
        validValues: "'economy', 'premium'",
        rules: "Assess quality preference for paver materials",
        examples: "'basic pavers' → 'economy', 'high-end materials' → 'premium', 'standard' → 'economy'"
      },
      patternComplexity: {
        validValues: "'minimal', 'some', 'extensive'",
        rules: "Determine complexity of paver laying pattern",
        examples: "'simple pattern' → 'minimal', 'herringbone' → 'some', 'multiple patterns' → 'extensive'"
      },
      obstacleRemoval: {
        validValues: "'none', 'minor', 'major'",
        rules: "Identify obstacles that need removal before installation",
        examples: "'clear area' → 'none', 'few shrubs' → 'minor', 'large trees' → 'major'"
      },
      overallComplexity: {
        validValues: "Number between 1.0 and 1.5",
        rules: "Assess overall project complexity for final cost adjustment",
        examples: "'simple project' → 1.0, 'standard difficulty' → 1.1, 'very complex' → 1.4"
      }
    };

    return extractionRules[variableName] || {
      validValues: "Appropriate value for this variable",
      rules: "Extract based on context and common sense",
      examples: "Context-dependent extraction"
    };
  }

  /**
   * Call GPT-4o API for question generation or extraction
   */
  private static async callGPT4oAPI(prompt: string): Promise<string> {
    const apiKey = this.getAPIKey();

    const requestBody = {
      model: this.MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Slightly higher for more natural questions
      max_tokens: 800
    };

    const response = await fetch(this.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    return data.choices[0].message.content;
  }

  /**
   * Fallback questions when GPT-4o API fails
   */
  private static getFallbackQuestion(variableName: string, context: QuestionContext): string {
    const fallbackQuestions = {
      squareFootage: "What's the approximate size of your patio area? You can provide dimensions (like 15x20) or total square feet.\n\n💡 Square footage is the primary factor in material costs and project timeline.",

      tearoutComplexity: "What's currently in the patio area that needs to be removed?\n\n💡 Removal type significantly affects labor time and equipment needs.\n📊 Concrete removal typically adds 20-25% to project cost vs. grass removal.\n\nCommon options:\n1. Just grass/sod\n2. Existing concrete patio\n3. Asphalt or pavement",

      accessDifficulty: "How would you describe access to the work area? Can equipment drive right up, or will materials need to be carried?\n\n💡 Access difficulty is a major factor in labor efficiency.\n📊 Difficult access can increase labor time by 40-60%.\n\nCommon options:\n1. Easy - equipment can drive right up\n2. Moderate - some maneuvering needed\n3. Difficult - hand-carry materials through gate",

      teamSize: "Do you have any preference for crew size? Smaller crews work better in tight spaces but take longer.\n\n💡 Team size affects both timeline and workspace efficiency.\n📊 Optimal crew size balances speed with space constraints.\n\nCommon options:\n1. 2-person crew (better for tight spaces)\n2. 3+ person crew (faster completion)",

      cuttingComplexity: "Will your patio design need much paver cutting for curves, angles, or borders?\n\n💡 Cutting complexity affects both material waste and labor time.\n📊 Complex cutting can add 8-12 hours of specialized labor.\n\nCommon options:\n1. Minimal - mostly straight edges\n2. Moderate - some curves or angles\n3. Complex - intricate patterns or lots of cutting",

      equipmentRequired: "Based on what needs to be removed and site conditions, what equipment do you think will be needed?\n\n💡 Equipment requirements affect daily rental costs and project capability.\n📊 Light machinery rental adds $200-300 per day but speeds up work significantly.\n\nCommon options:\n1. Hand tools only\n2. Jackhammer/demo tools\n3. Light machinery (bobcat, small excavator)\n4. Heavy equipment",

      paverStyle: "What quality level are you considering for the pavers?\n\n💡 Paver quality affects both material costs and long-term value.\n📊 Premium pavers add 25-35% to material cost but increase property value.\n\nCommon options:\n1. Economy grade (standard concrete pavers)\n2. Premium (natural stone, designer options)",

      patternComplexity: "Are you planning a simple paver pattern or something more decorative?\n\n💡 Pattern complexity affects material waste and installation time.\n📊 Complex patterns create 15-25% material waste due to cutting requirements.\n\nCommon options:\n1. Simple running bond pattern\n2. Herringbone or moderate complexity\n3. Multiple patterns or intricate design",

      obstacleRemoval: "Are there any trees, shrubs, or other obstacles that need to be removed before installation?\n\n💡 Obstacle removal is typically charged separately from patio installation.\n📊 Minor obstacles add $300-500, major obstacles add $800-1200.\n\nCommon options:\n1. No obstacles - clear area\n2. Minor obstacles (shrubs, small plants)\n3. Major obstacles (trees, structures)",

      overallComplexity: "How would you rate the overall complexity of your patio project?\n\n💡 Overall complexity accounts for design challenges and site conditions.\n📊 Complexity multiplier affects final project cost (1.0x to 1.5x).\n\nCommon options:\n1. Simple - straightforward installation\n2. Standard - typical challenges\n3. Complex - multiple challenges or custom design"
    };

    return fallbackQuestions[variableName] || `Can you provide more details about ${variableName} for your patio project?`;
  }

  /**
   * Fallback variable extraction using pattern matching
   */
  private static extractVariableWithFallback(userResponse: string, variableName: string): any {
    const lowerResponse = userResponse.toLowerCase();

    const fallbackPatterns = {
      squareFootage: {
        patterns: [
          { regex: /(\d+)\s*(?:sq\.?\s*ft\.?|sqft|square\s+feet)/, transform: (match) => parseInt(match[1]) },
          { regex: /(\d+)\s*x\s*(\d+)/, transform: (match) => parseInt(match[1]) * parseInt(match[2]) },
          { regex: /small/, transform: () => 150 },
          { regex: /medium/, transform: () => 250 },
          { regex: /large/, transform: () => 400 }
        ]
      },
      tearoutComplexity: {
        patterns: [
          { regex: /\b(?:concrete|cement|pavement)\b/, transform: () => 'concrete' },
          { regex: /\b(?:asphalt|blacktop)\b/, transform: () => 'asphalt' },
          { regex: /\b(?:grass|sod|lawn)\b/, transform: () => 'grass' }
        ]
      },
      accessDifficulty: {
        patterns: [
          { regex: /\b(?:difficult|tight|narrow|hand.carry|no.equipment)\b/, transform: () => 'difficult' },
          { regex: /\b(?:easy|drive.up|open|direct)\b/, transform: () => 'easy' },
          { regex: /\b(?:moderate|some|maneuvering)\b/, transform: () => 'moderate' }
        ]
      },
      teamSize: {
        patterns: [
          { regex: /\b(?:small|2.person|two.person|tight.space)\b/, transform: () => 'twoPerson' },
          { regex: /\b(?:full|3.person|three.person|standard|normal)\b/, transform: () => 'threePlus' }
        ]
      }
    };

    const variablePatterns = fallbackPatterns[variableName];
    if (!variablePatterns) return null;

    for (const pattern of variablePatterns.patterns) {
      const match = lowerResponse.match(pattern.regex);
      if (match) {
        return pattern.transform(match);
      }
    }

    return null;
  }

  /**
   * Get API key from environment
   */
  private static getAPIKey(): string {
    const getEnvVar = (key: string): string | undefined => {
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
      }
      try {
        if (typeof import.meta !== 'undefined' && import.meta?.env?.[key]) {
          return import.meta.env[key];
        }
      } catch (e) {
        // import.meta not available
      }
      return undefined;
    };

    const apiKey = getEnvVar('VITE_OPENAI_API_KEY_MINI') || getEnvVar('VITE_AI_API_KEY');

    if (!apiKey) {
      throw new Error('OpenAI API key not found. Set VITE_OPENAI_API_KEY_MINI environment variable.');
    }

    return apiKey;
  }
}