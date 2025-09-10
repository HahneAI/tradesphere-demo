/**
 * DimensionCalculator - Smart Unit Calculation for Make.com Intelligence
 * 
 * Handles dimension inputs like "15 by 10 patio" → 150 sqft calculations
 * Provides barebones input parsing with auto-unit detection
 */

export interface DimensionResult {
  quantity: number;
  unit: 'sqft' | 'linear_feet' | 'each' | 'cubic_yards';
  dimensions?: {
    length: number;
    width: number;
    area?: number;
  };
  confidence: number;
  calculationType: 'area' | 'linear' | 'count' | 'single';
  originalText: string;
}

export class DimensionCalculator {
  
  /**
   * Dimension parsing patterns for various input formats
   */
  private static readonly DIMENSION_PATTERNS = [
    // Pattern 1: "15 by 10", "20 x 30", "12 × 8"
    /(\d+(?:\.\d+)?)\s*(?:by|x|×|X)\s*(\d+(?:\.\d+)?)/gi,
    
    // Pattern 2: "12 foot by 8 foot", "25 ft x 15 ft"
    /(\d+(?:\.\d+)?)\s*(?:foot|feet|ft\.?)\s*(?:by|x|×|X)\s*(\d+(?:\.\d+)?)\s*(?:foot|feet|ft\.?)/gi,
    
    // Pattern 3: "15' by 10'", "20' x 30'"
    /(\d+(?:\.\d+)?)'?\s*(?:by|x|×|X)\s*(\d+(?:\.\d+)?)'?/gi,
    
    // Pattern 4: "15-by-10", "20x30" (no spaces)
    /(\d+(?:\.\d+)?)[-]?(?:by|x|×|X)(\d+(?:\.\d+)?)/gi
  ];

  /**
   * Single dimension patterns for linear measurements
   */
  private static readonly LINEAR_PATTERNS = [
    // "50 feet", "25 linear feet", "30 ft"
    /(\d+(?:\.\d+)?)\s*(?:linear\s+)?(?:feet|foot|ft\.?)(?!\s*(?:by|x|×|X))/gi,
    
    // "100 linear feet of edging"
    /(\d+(?:\.\d+)?)\s*linear\s*(?:feet|ft\.?)/gi
  ];

  /**
   * Area patterns for when area is explicitly mentioned
   */
  private static readonly AREA_PATTERNS = [
    // "150 square feet", "200 sqft", "100 sq ft"
    /(\d+(?:\.\d+)?)\s*(?:square\s*)?(?:feet|foot|ft\.?|sqft|sq\.?\s*ft\.?)/gi
  ];

  /**
   * Main parsing function - analyzes text and returns dimension calculations
   */
  static parse(text: string, serviceName?: string): DimensionResult | null {
    const originalText = text.trim();
    console.log(`📐 DIMENSION CALCULATOR: Parsing "${originalText}" for service "${serviceName || 'unknown'}"`);

    // Try dimension patterns first (highest priority)
    const dimensionResult = this.parseDimensions(text, serviceName);
    if (dimensionResult) {
      console.log(`✅ DIMENSIONS FOUND: ${dimensionResult.dimensions?.length}x${dimensionResult.dimensions?.width} = ${dimensionResult.quantity} ${dimensionResult.unit}`);
      return { ...dimensionResult, originalText };
    }

    // Try single measurements
    const singleResult = this.parseSingleMeasurement(text, serviceName);
    if (singleResult) {
      console.log(`✅ SINGLE MEASUREMENT: ${singleResult.quantity} ${singleResult.unit}`);
      return { ...singleResult, originalText };
    }

    console.log(`❌ NO DIMENSIONS FOUND in "${text}"`);
    return null;
  }

  /**
   * Parse dimension patterns like "15 by 10", "20 x 30"
   */
  private static parseDimensions(text: string, serviceName?: string): DimensionResult | null {
    for (const pattern of this.DIMENSION_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const length = parseFloat(match[1]);
        const width = parseFloat(match[2]);
        
        if (length > 0 && width > 0 && length < 10000 && width < 10000) {
          const area = length * width;
          const unit = this.determineUnit(serviceName, 'area');
          
          console.log(`📐 DIMENSION MATCH: "${match[0]}" → ${length} x ${width} = ${area} ${unit}`);
          
          return {
            quantity: area,
            unit,
            dimensions: { length, width, area },
            confidence: 0.95,
            calculationType: 'area',
            originalText: text
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Parse single measurements like "50 feet", "200 square feet"
   */
  private static parseSingleMeasurement(text: string, serviceName?: string): DimensionResult | null {
    
    // Check for explicit area mentions first
    for (const match of text.matchAll(this.AREA_PATTERNS[0])) {
      const quantity = parseFloat(match[1]);
      if (quantity > 0) {
        console.log(`📏 AREA MATCH: "${match[0]}" → ${quantity} sqft`);
        return {
          quantity,
          unit: 'sqft',
          confidence: 0.90,
          calculationType: 'single',
          originalText: text
        };
      }
    }

    // Check for linear measurements
    for (const match of text.matchAll(this.LINEAR_PATTERNS[0])) {
      const quantity = parseFloat(match[1]);
      if (quantity > 0) {
        const unit = this.determineUnit(serviceName, 'linear');
        console.log(`📏 LINEAR MATCH: "${match[0]}" → ${quantity} ${unit}`);
        return {
          quantity,
          unit,
          confidence: 0.85,
          calculationType: 'linear',
          originalText: text
        };
      }
    }

    return null;
  }

  /**
   * Determine the appropriate unit based on service type and measurement type
   */
  private static determineUnit(
    serviceName?: string, 
    measurementType?: 'area' | 'linear' | 'count'
  ): 'sqft' | 'linear_feet' | 'each' | 'cubic_yards' {
    
    if (!serviceName) {
      // Default based on measurement type
      switch (measurementType) {
        case 'area': return 'sqft';
        case 'linear': return 'linear_feet';
        case 'count': return 'each';
        default: return 'sqft';
      }
    }

    const service = serviceName.toLowerCase();
    
    // Service-specific unit intelligence
    if (service.includes('patio') || service.includes('deck') || 
        service.includes('mulch') || service.includes('sod') || 
        service.includes('seed') || service.includes('rock') ||
        service.includes('gravel')) {
      return 'sqft';
    }
    
    if (service.includes('edging') || service.includes('wall') || 
        service.includes('drain') || service.includes('fence')) {
      return 'linear_feet';
    }
    
    if (service.includes('tree') || service.includes('shrub') || 
        service.includes('plant') || service.includes('spout') ||
        service.includes('zone')) {
      return 'each';
    }
    
    if (service.includes('topsoil') || service.includes('soil') ||
        service.includes('gravel') || service.includes('stone')) {
      return 'cubic_yards';
    }

    // Default fallback
    return measurementType === 'linear' ? 'linear_feet' : 'sqft';
  }

  /**
   * Calculate area from dimensions
   */
  static calculateArea(length: number, width: number): number {
    return Math.round(length * width * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate dimensions are reasonable
   */
  static validateDimensions(length: number, width: number): boolean {
    return length > 0 && width > 0 && length < 1000 && width < 1000;
  }

  /**
   * Get suggestions for ambiguous inputs
   */
  static getSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    
    // Check if dimensions are detected but no service
    const hasDimensions = this.DIMENSION_PATTERNS.some(pattern => 
      text.match(pattern)
    );
    
    if (hasDimensions) {
      suggestions.push("What type of service is this for? (patio, mulch, edging, etc.)");
    }
    
    // Check if numbers exist but no clear measurement
    const hasNumbers = /\d+/.test(text);
    if (hasNumbers && !hasDimensions) {
      suggestions.push("Please specify the measurement type (square feet, linear feet, etc.)");
    }
    
    return suggestions;
  }

  /**
   * Test utility for debugging dimension calculations
   */
  static test(input: string, serviceName?: string): void {
    console.log(`🧪 TESTING DIMENSION CALCULATOR: "${input}"`);
    const result = this.parse(input, serviceName);
    
    if (result) {
      console.log(`✅ Result: ${result.quantity} ${result.unit} (${result.confidence * 100}% confidence)`);
      if (result.dimensions) {
        console.log(`   Dimensions: ${result.dimensions.length} x ${result.dimensions.width}`);
      }
      console.log(`   Type: ${result.calculationType}`);
    } else {
      console.log(`❌ No dimensions found`);
      const suggestions = this.getSuggestions(input);
      if (suggestions.length > 0) {
        console.log(`💡 Suggestions: ${suggestions.join(', ')}`);
      }
    }
  }
}

// CLI testing interface
if (process.argv[1] && process.argv[1].endsWith('dimension-calculator.ts')) {
  const testCases = [
    { input: '15 by 10 patio', service: 'Paver Patio (SQFT)' },
    { input: '20 x 30 deck', service: 'Cedar Pergola (SQFT)' },
    { input: '12 foot by 8 foot mulch area', service: 'Triple Ground Mulch (SQFT)' },
    { input: '50 feet of edging', service: 'Metal Edging' },
    { input: '200 square feet mulch', service: 'Triple Ground Mulch (SQFT)' },
    { input: 'mulch 12x8 area', service: 'Triple Ground Mulch (SQFT)' }
  ];
  
  console.log('🧪 DIMENSION CALCULATOR TEST SUITE');
  console.log('===================================\n');
  
  testCases.forEach(testCase => {
    DimensionCalculator.test(testCase.input, testCase.service);
    console.log('');
  });
}