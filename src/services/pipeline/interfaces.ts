/**
 * Pipeline Interfaces - Clean 4-Step Make.com Mirror
 * 
 * Defines contracts for each pipeline step with dependency injection support
 * Enables easy testing and future optimization while maintaining Make.com parity
 */

// ===============================
// CORE DATA STRUCTURES
// ===============================

export interface RawService {
  name: string;
  quantity: number;
  unit?: string;
  confidence: number;
  originalText: string;
}

export interface ValidatedService extends RawService {
  isComplete: boolean;
  missingInfo: string[];
  questions: string[];
}

export interface MappedService extends ValidatedService {
  serviceName: string;  // Exact Google Sheets name
  row: number;          // Google Sheets row (2-33)
  category: string;     // hardscape, materials, etc.
  isSpecial: boolean;   // Requires special handling
}

export interface PricedService extends MappedService {
  unitCost: number;
  totalCost: number;
  laborHours: number;
}

// ===============================
// STEP RESULT STRUCTURES
// ===============================

export interface StepResult<T = any> {
  success: boolean;
  data: T;
  debug: {
    step: string;
    processingTime: number;
    intermediateOutput: any;
    warnings?: string[];
    info?: string[];
  };
  error?: string;
}

export interface DetectionResult {
  services: RawService[];
  unmappedText: string[];
  inputAnalysis: {
    hasMultipleServices: boolean;
    hasQuantities: boolean;
    hasUnits: boolean;
    overallConfidence: number;
  };
}

export interface ValidationResult {
  completeServices: ValidatedService[];
  incompleteServices: ValidatedService[];
  clarificationQuestions: string[];
  needsClarification: boolean;
  readyForMapping: boolean;
}

export interface MappingResult {
  mappedServices: MappedService[];
  unmappedServices: ValidatedService[];
  specialServices: MappedService[];
  mappingConfidence: number;
}

export interface PricingResult {
  services: PricedService[];
  totals: {
    totalCost: number;
    totalLaborHours: number;
    serviceCount: number;
  };
  calculationTime: number;
  specialCalculations: {
    irrigation?: {
      setupCost: number;
      zoneCost: number;
      boringRequired: boolean;
    };
  };
}

// ===============================
// PIPELINE STEP INTERFACES
// ===============================

/**
 * Step 1: Service Detection
 * Parses natural language input to identify services and quantities
 */
export interface IServiceDetector {
  detect(input: string): Promise<StepResult<DetectionResult>> | StepResult<DetectionResult>;
}

/**
 * Step 2: Completeness Checker
 * Validates that detected services have all required information
 */
export interface ICompletenessChecker {
  check(detected: DetectionResult): Promise<StepResult<ValidationResult>> | StepResult<ValidationResult>;
}

/**
 * Step 3: Service Mapper
 * Maps validated services to exact Google Sheets service names and rows
 */
export interface IServiceMapper {
  map(validated: ValidationResult): Promise<StepResult<MappingResult>> | StepResult<MappingResult>;
}

/**
 * Step 4: Price Calculator
 * Calculates costs using Google Sheets formulas
 */
export interface IPriceCalculator {
  calculate(mapped: MappingResult): Promise<StepResult<PricingResult>>;
}

// ===============================
// PIPELINE CONFIGURATION
// ===============================

export interface PipelineConfig {
  detector: IServiceDetector;
  checker: ICompletenessChecker;
  mapper: IServiceMapper;
  calculator: IPriceCalculator;
  options: {
    enableDebug: boolean;
    enableTimings: boolean;
    earlyReturn: boolean;     // Stop on first error
    logIntermediateSteps: boolean;
  };
}

export interface PipelineResult {
  success: boolean;
  finalResult?: PricingResult;
  clarificationNeeded?: {
    questions: string[];
    incompleteServices: ValidatedService[];
    suggestedResponse: string;
  };
  steps: StepResult[];
  totalTime: number;
  performance: {
    step1_detection: number;
    step2_validation: number;
    step3_mapping: number;
    step4_calculation: number;
  };
  debug?: {
    inputAnalysis: any;
    serviceFlow: any[];
    warnings: string[];
  };
}

// ===============================
// UTILITY INTERFACES
// ===============================

export interface PipelineMetrics {
  totalRequests: number;
  averageProcessingTime: number;
  successRate: number;
  commonFailureReasons: string[];
  serviceRecognitionAccuracy: number;
  clarificationRate: number;
}

export interface ServiceDatabase {
  findByName(name: string): { serviceName: string; row: number; category: string } | null;
  findBySynonym(synonym: string): { serviceName: string; row: number; category: string } | null;
  getAllServices(): { serviceName: string; row: number; category: string }[];
  isSpecialService(serviceName: string): boolean;
}

// ===============================
// FACTORY INTERFACES
// ===============================

export type PipelineMode = 'production' | 'mock' | 'hybrid';

export interface FactoryConfig {
  mode: PipelineMode;
  mockSteps?: Array<'detect' | 'check' | 'map' | 'calculate'>;
  enableDebug?: boolean;
  serviceDatabase?: ServiceDatabase;
}

// ===============================
// ERROR HANDLING
// ===============================

export class PipelineError extends Error {
  constructor(
    message: string,
    public step: string,
    public data?: any,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export class ValidationError extends PipelineError {
  constructor(message: string, public missingInfo: string[]) {
    super(message, 'validation', missingInfo, true);
    this.name = 'ValidationError';
  }
}

export class MappingError extends PipelineError {
  constructor(message: string, public unmappedServices: string[]) {
    super(message, 'mapping', unmappedServices, true);
    this.name = 'MappingError';
  }
}

export class CalculationError extends PipelineError {
  constructor(message: string, public calculationDetails?: any) {
    super(message, 'calculation', calculationDetails, false);
    this.name = 'CalculationError';
  }
}

// ===============================
// TESTING INTERFACES
// ===============================

export interface TestCase {
  name: string;
  input: string;
  expectedServices: {
    serviceName: string;
    quantity: number;
    unit: string;
    row: number;
  }[];
  expectedCost: {
    min: number;
    max: number;
  };
  shouldNeedClarification?: boolean;
  description?: string;
}

export interface PipelineTestResult {
  testCase: TestCase;
  result: PipelineResult;
  passed: boolean;
  errors: string[];
  performance: {
    actualTime: number;
    targetTime: number;
    withinTarget: boolean;
  };
  accuracy: {
    servicesDetected: number;
    servicesExpected: number;
    costWithinRange: boolean;
    mappingAccuracy: number;
  };
}

export interface MockDataProvider {
  getDetectionMockData(input: string): DetectionResult;
  getValidationMockData(detected: DetectionResult): ValidationResult;
  getMappingMockData(validated: ValidationResult): MappingResult;
  getPricingMockData(mapped: MappingResult): PricingResult;
}

export default {
  // Export all interfaces for easy importing
  StepResult,
  DetectionResult,
  ValidationResult,
  MappingResult,
  PricingResult,
  PipelineConfig,
  PipelineResult,
  IServiceDetector,
  ICompletenessChecker,
  IServiceMapper,
  IPriceCalculator,
  PipelineError,
  ValidationError,
  MappingError,
  CalculationError
};