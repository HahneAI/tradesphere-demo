/**
 * PaverPatioVariableMapper - Bridge between AI conversation and master formula variables
 *
 * Converts natural language descriptions into PaverPatioValues format compatible
 * with the master formula calculation system.
 *
 * NOTE: Services Database Integration
 * This mapper focuses on variable extraction from user input. When validation fails,
 * the ParameterCollectorService applies Services database defaults as fallback.
 * See ParameterCollectorService.ts lines 147-172 for Services database integration.
 */

import type { PaverPatioValues, PaverPatioConfig } from '../../core/master-formula/formula-types';
import { ExtractedService } from './ParameterCollectorService';
import { getPaverPatioServiceDefaults } from '../../core/services-database/service-database';

export interface PaverPatioVariableExtractionResult {
  sqft: number;
  paverPatioValues: PaverPatioValues;
  confidence: number;
  extractedVariables: string[];
  defaultsUsed: string[];
}

export class PaverPatioVariableMapper {
  /**
   * Extract paver patio variables from user message and create master formula compatible values
   * ENHANCED: Now extracts 15+ variables with improved pattern matching
   */
  static extractPaverPatioVariables(
    userMessage: string,
    sqft: number = 100
  ): PaverPatioVariableExtractionResult {
    console.log('🗺️ PAVER PATIO VARIABLE EXTRACTION START (ENHANCED)');
    console.log(`Message: "${userMessage}"`);
    console.log(`Square footage: ${sqft}`);

    const lowerMessage = userMessage.toLowerCase();
    const extractedVariables: string[] = [];
    const defaultsUsed: string[] = [];

    // Initialize with safe baseline defaults
    const paverPatioValues: PaverPatioValues = {
      excavation: {
        tearoutComplexity: 'grass',
        equipmentRequired: 'handTools'
      },
      siteAccess: {
        accessDifficulty: 'moderate',
        obstacleRemoval: 'minor'
      },
      materials: {
        paverStyle: 'economy',
        cuttingComplexity: 'moderate',
        patternComplexity: 'minimal'
      },
      labor: {
        teamSize: 'threePlus' // Use optimal team size as default
      },
      complexity: {
        overallComplexity: 1.0
      }
    };

    // 1. SQUARE FOOTAGE EXTRACTION (Enhanced)
    let extractedSqft = sqft;
    const sqftDirectMatch = lowerMessage.match(/(\d+)\s*(?:sq\.?\s*ft\.?|sqft|square\s+feet)/);
    const dimensionMatch = lowerMessage.match(/(\d+)\s*(?:x|by)\s*(\d+)/);

    if (sqftDirectMatch) {
      extractedSqft = parseInt(sqftDirectMatch[1]);
      extractedVariables.push(`Square footage: ${extractedSqft} sqft (direct)`);
    } else if (dimensionMatch) {
      extractedSqft = parseInt(dimensionMatch[1]) * parseInt(dimensionMatch[2]);
      extractedVariables.push(`Square footage: ${extractedSqft} sqft (calculated from ${dimensionMatch[1]}x${dimensionMatch[2]})`);
    } else {
      // Size estimation from descriptive terms
      if (/\b(?:small|compact|tiny)\s+patio\b/.test(lowerMessage)) {
        extractedSqft = 150;
        extractedVariables.push('Square footage: 150 sqft (estimated small)');
      } else if (/\b(?:large|big|huge)\s+patio\b/.test(lowerMessage)) {
        extractedSqft = 400;
        extractedVariables.push('Square footage: 400 sqft (estimated large)');
      } else if (/\b(?:medium|average)\s+patio\b/.test(lowerMessage)) {
        extractedSqft = 250;
        extractedVariables.push('Square footage: 250 sqft (estimated medium)');
      } else {
        defaultsUsed.push(`Square footage: ${extractedSqft} sqft (default)`);
      }
    }

    // 2. TEAROUT COMPLEXITY (Enhanced with more patterns)
    if (/\b(?:removing|remove|demo|demolish|tear\s+out)\s+(?:existing\s+)?(?:concrete|cement|pavement|slab)\b/.test(lowerMessage)) {
      paverPatioValues.excavation.tearoutComplexity = 'concrete';
      extractedVariables.push('Tearout complexity: concrete removal detected');
    } else if (/\b(?:removing|remove|demo)\s+(?:existing\s+)?(?:asphalt|blacktop|pavement)\b/.test(lowerMessage)) {
      paverPatioValues.excavation.tearoutComplexity = 'asphalt';
      extractedVariables.push('Tearout complexity: asphalt removal detected');
    } else if (/\b(?:removing|remove)\s+(?:existing\s+)?(?:grass|sod|lawn|turf)\b/.test(lowerMessage)) {
      paverPatioValues.excavation.tearoutComplexity = 'grass';
      extractedVariables.push('Tearout complexity: grass/sod removal detected');
    } else if (/\b(?:existing|current|old)\s+(?:patio|surface)\b/.test(lowerMessage)) {
      paverPatioValues.excavation.tearoutComplexity = 'concrete';
      extractedVariables.push('Tearout complexity: existing surface removal (assumed concrete)');
    } else {
      defaultsUsed.push('Tearout complexity: grass/sod (default)');
    }

    // 3. ACCESS DIFFICULTY (Enhanced patterns)
    if (/\b(?:tight|narrow|difficult|hard|limited|restricted|challenging)\s*(?:access|space|gate|entrance)\b/.test(lowerMessage)) {
      paverPatioValues.siteAccess.accessDifficulty = 'difficult';
      extractedVariables.push('Access difficulty: difficult access detected');
    } else if (/\b(?:no\s+equipment\s+access|hand\s+carry|walk\s+through|narrow\s+gate)\b/.test(lowerMessage)) {
      paverPatioValues.siteAccess.accessDifficulty = 'difficult';
      extractedVariables.push('Access difficulty: very difficult (hand carry required)');
    } else if (/\b(?:easy|open|wide|simple|good|direct|drive)\s*(?:access|approach)\b/.test(lowerMessage)) {
      paverPatioValues.siteAccess.accessDifficulty = 'easy';
      extractedVariables.push('Access difficulty: easy access detected');
    } else if (/\b(?:driveway|front\s+yard|street\s+access)\b/.test(lowerMessage)) {
      paverPatioValues.siteAccess.accessDifficulty = 'easy';
      extractedVariables.push('Access difficulty: easy (driveway/front access)');
    } else if (/\b(?:backyard|back\s+yard|behind\s+house)\b/.test(lowerMessage)) {
      paverPatioValues.siteAccess.accessDifficulty = 'moderate';
      extractedVariables.push('Access difficulty: moderate (backyard access)');
    } else {
      defaultsUsed.push('Access difficulty: moderate (default)');
    }

    // 4. TEAM SIZE PREFERENCES (Enhanced)
    if (/\b(?:2|two)\s*(?:person|man|people|worker)\s*(?:crew|team)\b/.test(lowerMessage)) {
      paverPatioValues.labor.teamSize = 'twoPerson';
      extractedVariables.push('Team size: 2-person crew requested');
    } else if (/\b(?:small|minimal|compact)\s*(?:crew|team)\b/.test(lowerMessage)) {
      paverPatioValues.labor.teamSize = 'twoPerson';
      extractedVariables.push('Team size: small crew (2-person)');
    } else if (/\b(?:3|three|4|four|\d+)\s*(?:person|man|people|worker)\s*(?:crew|team)\b/.test(lowerMessage)) {
      paverPatioValues.labor.teamSize = 'threePlus';
      extractedVariables.push('Team size: 3+ person crew detected');
    } else if (/\b(?:full|standard|normal|large)\s*(?:crew|team)\b/.test(lowerMessage)) {
      paverPatioValues.labor.teamSize = 'threePlus';
      extractedVariables.push('Team size: full crew (3+ person)');
    } else {
      defaultsUsed.push('Team size: 3+ person crew (optimal default)');
    }

    // 5. EQUIPMENT REQUIREMENTS (Enhanced)
    if (/\b(?:jackhammer|pneumatic|heavy\s+equipment|excavator|bobcat|skid\s+steer)\b/.test(lowerMessage)) {
      paverPatioValues.excavation.equipmentRequired = 'heavyMachinery';
      extractedVariables.push('Equipment: heavy machinery detected');
    } else if (/\b(?:attachment|light\s+machinery|small\s+excavator|compact\s+equipment)\b/.test(lowerMessage)) {
      paverPatioValues.excavation.equipmentRequired = 'lightMachinery';
      extractedVariables.push('Equipment: light machinery detected');
    } else if (/\b(?:demo\s+hammer|power\s+tools|electric\s+tools)\b/.test(lowerMessage)) {
      paverPatioValues.excavation.equipmentRequired = 'attachments';
      extractedVariables.push('Equipment: demo attachments detected');
    } else if (/\b(?:hand\s+tools|manual|shovel|pick)\b/.test(lowerMessage)) {
      paverPatioValues.excavation.equipmentRequired = 'handTools';
      extractedVariables.push('Equipment: hand tools specified');
    } else {
      defaultsUsed.push('Equipment: hand tools (default)');
    }

    // 6. MATERIAL STYLE (Enhanced)
    if (/\b(?:premium|high.end|expensive|luxury|natural\s+stone|designer|custom)\b/.test(lowerMessage)) {
      paverPatioValues.materials.paverStyle = 'premium';
      extractedVariables.push('Paver style: premium materials detected');
    } else if (/\b(?:flagstone|bluestone|travertine|natural|stone)\b/.test(lowerMessage)) {
      paverPatioValues.materials.paverStyle = 'premium';
      extractedVariables.push('Paver style: premium (natural stone specified)');
    } else if (/\b(?:basic|standard|budget|economy|concrete\s+paver)\b/.test(lowerMessage)) {
      paverPatioValues.materials.paverStyle = 'economy';
      extractedVariables.push('Paver style: economy grade detected');
    } else {
      defaultsUsed.push('Paver style: economy grade (default)');
    }

    // 7. CUTTING COMPLEXITY (NEW)
    if (/\b(?:straight|rectangular|square|simple|basic)\s*(?:design|pattern|shape)\b/.test(lowerMessage)) {
      paverPatioValues.materials.cuttingComplexity = 'minimal';
      extractedVariables.push('Cutting complexity: minimal (straight edges)');
    } else if (/\b(?:curves|curved|angles|angled|borders)\b/.test(lowerMessage)) {
      paverPatioValues.materials.cuttingComplexity = 'moderate';
      extractedVariables.push('Cutting complexity: moderate (curves/angles)');
    } else if (/\b(?:complex|intricate|lots\s+of\s+cutting|detailed|custom\s+shape)\b/.test(lowerMessage)) {
      paverPatioValues.materials.cuttingComplexity = 'complex';
      extractedVariables.push('Cutting complexity: complex (intricate design)');
    } else {
      defaultsUsed.push('Cutting complexity: moderate (default)');
    }

    // 8. PATTERN COMPLEXITY (Enhanced)
    if (/\b(?:herringbone|basket\s+weave|circular|radial)\b/.test(lowerMessage)) {
      paverPatioValues.materials.patternComplexity = 'some';
      extractedVariables.push('Pattern complexity: some (decorative pattern)');
    } else if (/\b(?:complex\s+pattern|multiple\s+patterns|intricate|mosaic)\b/.test(lowerMessage)) {
      paverPatioValues.materials.patternComplexity = 'extensive';
      extractedVariables.push('Pattern complexity: extensive (complex patterns)');
    } else if (/\b(?:simple|basic|running\s+bond|standard)\s*pattern\b/.test(lowerMessage)) {
      paverPatioValues.materials.patternComplexity = 'minimal';
      extractedVariables.push('Pattern complexity: minimal (simple pattern)');
    } else {
      defaultsUsed.push('Pattern complexity: minimal (default)');
    }

    // 9. OBSTACLE REMOVAL (Enhanced)
    if (/\b(?:no\s+obstacles|clear\s+area|open\s+space)\b/.test(lowerMessage)) {
      paverPatioValues.siteAccess.obstacleRemoval = 'none';
      extractedVariables.push('Obstacle removal: none (clear area)');
    } else if (/\b(?:shrubs|bushes|small\s+plants|minor\s+landscaping)\b/.test(lowerMessage)) {
      paverPatioValues.siteAccess.obstacleRemoval = 'minor';
      extractedVariables.push('Obstacle removal: minor (shrubs/plants)');
    } else if (/\b(?:trees|large\s+shrubs|structures|major\s+obstacles)\b/.test(lowerMessage)) {
      paverPatioValues.siteAccess.obstacleRemoval = 'major';
      extractedVariables.push('Obstacle removal: major (trees/structures)');
    } else {
      defaultsUsed.push('Obstacle removal: minor (default)');
    }

    // 10. OVERALL COMPLEXITY (Enhanced calculation)
    let complexityScore = 1.0;
    let complexityFactors: string[] = [];

    // Complexity factors
    if (paverPatioValues.excavation.tearoutComplexity === 'concrete') {
      complexityScore += 0.2;
      complexityFactors.push('concrete removal');
    } else if (paverPatioValues.excavation.tearoutComplexity === 'asphalt') {
      complexityScore += 0.3;
      complexityFactors.push('asphalt removal');
    }

    if (paverPatioValues.siteAccess.accessDifficulty === 'difficult') {
      complexityScore += 0.2;
      complexityFactors.push('difficult access');
    }

    if (paverPatioValues.materials.cuttingComplexity === 'complex') {
      complexityScore += 0.15;
      complexityFactors.push('complex cutting');
    } else if (paverPatioValues.materials.cuttingComplexity === 'moderate') {
      complexityScore += 0.05;
    }

    if (paverPatioValues.materials.patternComplexity === 'extensive') {
      complexityScore += 0.1;
      complexityFactors.push('complex patterns');
    }

    if (paverPatioValues.siteAccess.obstacleRemoval === 'major') {
      complexityScore += 0.1;
      complexityFactors.push('major obstacles');
    }

    paverPatioValues.complexity.overallComplexity = Math.min(1.5, complexityScore);

    if (complexityFactors.length > 0) {
      extractedVariables.push(`Overall complexity: ${complexityScore.toFixed(1)}x (${complexityFactors.join(', ')})`);
    } else {
      defaultsUsed.push('Overall complexity: 1.0x (standard)');
    }

    // Calculate enhanced confidence based on extraction success
    const totalVariables = 10; // All major variables
    const extractedCount = extractedVariables.length;
    const confidence = Math.min(0.95, 0.2 + (extractedCount / totalVariables) * 0.75);

    console.log('🗺️ ENHANCED VARIABLE EXTRACTION COMPLETE:');
    console.log(`  Extracted: ${extractedVariables.length} variables`);
    console.log(`  Defaults: ${defaultsUsed.length} variables`);
    console.log(`  Confidence: ${(confidence * 100).toFixed(1)}%`);
    console.log(`  Complexity Score: ${complexityScore.toFixed(1)}x`);

    return {
      sqft: extractedSqft,
      paverPatioValues,
      confidence,
      extractedVariables,
      defaultsUsed
    };
  }

  /**
   * Create an ExtractedService for paver patio that's compatible with existing system
   */
  static createPaverPatioService(sqft: number): ExtractedService {
    return {
      serviceName: 'Paver Patio (SQFT)',
      quantity: sqft,
      unit: 'sqft',
      row: 999, // Special row number to indicate master formula routing
      isSpecial: true,
      status: 'complete'
    };
  }

  /**
   * Validate extracted variables and provide user feedback
   */
  static validateExtractionResult(result: PaverPatioVariableExtractionResult): {
    isValid: boolean;
    missingInfo: string[];
    clarifyingQuestions: string[];
  } {
    const missingInfo: string[] = [];
    const clarifyingQuestions: string[] = [];

    // Check if we have minimum required information
    if (result.sqft <= 0) {
      missingInfo.push('Square footage');
      clarifyingQuestions.push('What is the square footage of your patio project?');
    }

    // Low confidence check
    if (result.confidence < 0.4) {
      clarifyingQuestions.push('Could you provide more details about your patio project? For example, what needs to be removed (grass, concrete, etc.) and how is the access to the area?');
    }

    const isValid = missingInfo.length === 0 && result.confidence >= 0.3;

    return {
      isValid,
      missingInfo,
      clarifyingQuestions
    };
  }
}