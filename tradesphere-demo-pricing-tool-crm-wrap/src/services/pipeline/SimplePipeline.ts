/**
 * SimplePipeline - Clean 4-Step Make.com Mirror Implementation
 * 
 * Orchestrates the exact same 4-step flow as Make.com with clear intermediate outputs
 * for debugging and validation. Supports dependency injection for easy testing.
 */

import {
  PipelineConfig,
  PipelineResult,
  StepResult,
  DetectionResult,
  ValidationResult,
  MappingResult,
  PricingResult,
  PipelineError,
  ValidationError
} from './interfaces';

export class SimplePipeline {
  constructor(private config: PipelineConfig) {
    this.validateConfig();
  }

  /**
   * Main pipeline execution - mirrors Make.com's 4-step process
   */
  async process(input: string): Promise<PipelineResult> {
    const startTime = Date.now();
    const steps: StepResult[] = [];
    const performance = {
      step1_detection: 0,
      step2_validation: 0,
      step3_mapping: 0,
      step4_calculation: 0
    };

    if (this.config.options.enableDebug) {
      console.log('🏃 SIMPLE PIPELINE START');
      console.log(`📝 Input: "${input}"`);
    }

    try {
      // STEP 1: SERVICE DETECTION
      const step1Start = Date.now();
      const detectionResult = await this.step1_detect(input);
      performance.step1_detection = Date.now() - step1Start;
      steps.push(detectionResult);

      if (!detectionResult.success) {
        return this.createFailureResult(steps, performance, Date.now() - startTime);
      }

      if (this.config.options.earlyReturn && detectionResult.data.services.length === 0) {
        return this.createEarlyReturn('No services detected', steps, performance, Date.now() - startTime);
      }

      // STEP 2: COMPLETENESS VALIDATION
      const step2Start = Date.now();
      const validationResult = await this.step2_validate(detectionResult.data);
      performance.step2_validation = Date.now() - step2Start;
      steps.push(validationResult);

      if (!validationResult.success) {
        return this.createFailureResult(steps, performance, Date.now() - startTime);
      }

      // Check if clarification is needed
      if (validationResult.data.needsClarification) {
        return this.createClarificationResult(validationResult.data, steps, performance, Date.now() - startTime);
      }

      // STEP 3: SERVICE MAPPING
      const step3Start = Date.now();
      const mappingResult = await this.step3_map(validationResult.data);
      performance.step3_mapping = Date.now() - step3Start;
      steps.push(mappingResult);

      if (!mappingResult.success) {
        return this.createFailureResult(steps, performance, Date.now() - startTime);
      }

      if (this.config.options.earlyReturn && mappingResult.data.mappedServices.length === 0) {
        return this.createEarlyReturn('No services could be mapped', steps, performance, Date.now() - startTime);
      }

      // STEP 4: PRICE CALCULATION
      const step4Start = Date.now();
      const pricingResult = await this.step4_calculate(mappingResult.data);
      performance.step4_calculation = Date.now() - step4Start;
      steps.push(pricingResult);

      if (!pricingResult.success) {
        return this.createFailureResult(steps, performance, Date.now() - startTime);
      }

      // SUCCESS - Return complete result
      const totalTime = Date.now() - startTime;

      if (this.config.options.enableDebug) {
        console.log('✅ PIPELINE SUCCESS');
        console.log(`💰 Total Cost: $${pricingResult.data.totals.totalCost}`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        this.logPerformanceBreakdown(performance);
      }

      return {
        success: true,
        finalResult: pricingResult.data,
        steps,
        totalTime,
        performance,
        debug: this.config.options.enableDebug ? this.createDebugInfo(input, steps) : undefined
      };

    } catch (error) {
      console.error('❌ PIPELINE ERROR:', error);
      
      const totalTime = Date.now() - startTime;
      
      return {
        success: false,
        steps,
        totalTime,
        performance,
        debug: this.config.options.enableDebug ? {
          inputAnalysis: { input, error: error.message },
          serviceFlow: steps.map(s => s.debug),
          warnings: [`Pipeline failed: ${error.message}`]
        } : undefined
      };
    }
  }

  /**
   * STEP 1: Service Detection
   * Replicates Make.com's service detection module
   */
  private async step1_detect(input: string): Promise<StepResult<DetectionResult>> {
    const stepStart = Date.now();
    
    if (this.config.options.logIntermediateSteps) {
      console.log('🎯 STEP 1: Service Detection');
    }

    try {
      const result = await this.config.detector.detect(input);
      
      if (this.config.options.logIntermediateSteps) {
        console.log(`   Found ${result.data.services.length} potential services`);
        result.data.services.forEach(service => {
          console.log(`   - ${service.name}: ${service.quantity} ${service.unit || 'units'}`);
        });
      }

      return {
        ...result,
        debug: {
          ...result.debug,
          step: 'detection',
          processingTime: Date.now() - stepStart,
          intermediateOutput: {
            servicesFound: result.data.services.length,
            overallConfidence: result.data.inputAnalysis.overallConfidence,
            hasMultipleServices: result.data.inputAnalysis.hasMultipleServices
          }
        }
      };

    } catch (error) {
      return this.createStepError('detection', error, Date.now() - stepStart);
    }
  }

  /**
   * STEP 2: Completeness Validation
   * Replicates Make.com's completeness checker module
   */
  private async step2_validate(detectionData: DetectionResult): Promise<StepResult<ValidationResult>> {
    const stepStart = Date.now();
    
    if (this.config.options.logIntermediateSteps) {
      console.log('✅ STEP 2: Completeness Validation');
    }

    try {
      const result = await this.config.checker.check(detectionData);
      
      if (this.config.options.logIntermediateSteps) {
        console.log(`   Complete: ${result.data.completeServices.length}`);
        console.log(`   Incomplete: ${result.data.incompleteServices.length}`);
        if (result.data.needsClarification) {
          console.log(`   Questions: ${result.data.clarificationQuestions.length}`);
        }
      }

      return {
        ...result,
        debug: {
          ...result.debug,
          step: 'validation',
          processingTime: Date.now() - stepStart,
          intermediateOutput: {
            completeServices: result.data.completeServices.length,
            incompleteServices: result.data.incompleteServices.length,
            needsClarification: result.data.needsClarification,
            questions: result.data.clarificationQuestions
          }
        }
      };

    } catch (error) {
      return this.createStepError('validation', error, Date.now() - stepStart);
    }
  }

  /**
   * STEP 3: Service Mapping
   * Replicates Make.com's service mapping module
   */
  private async step3_map(validationData: ValidationResult): Promise<StepResult<MappingResult>> {
    const stepStart = Date.now();
    
    if (this.config.options.logIntermediateSteps) {
      console.log('🗺️  STEP 3: Service Mapping');
    }

    try {
      const result = await this.config.mapper.map(validationData);
      
      if (this.config.options.logIntermediateSteps) {
        console.log(`   Mapped: ${result.data.mappedServices.length}`);
        console.log(`   Unmapped: ${result.data.unmappedServices.length}`);
        result.data.mappedServices.forEach(service => {
          console.log(`   - ${service.serviceName} (row ${service.row}): ${service.quantity} ${service.unit}`);
        });
      }

      return {
        ...result,
        debug: {
          ...result.debug,
          step: 'mapping',
          processingTime: Date.now() - stepStart,
          intermediateOutput: {
            mappedServices: result.data.mappedServices.length,
            unmappedServices: result.data.unmappedServices.length,
            specialServices: result.data.specialServices.length,
            mappingConfidence: result.data.mappingConfidence
          }
        }
      };

    } catch (error) {
      return this.createStepError('mapping', error, Date.now() - stepStart);
    }
  }

  /**
   * STEP 4: Price Calculation
   * Replicates Make.com's pricing calculation module
   */
  private async step4_calculate(mappingData: MappingResult): Promise<StepResult<PricingResult>> {
    const stepStart = Date.now();
    
    if (this.config.options.logIntermediateSteps) {
      console.log('💰 STEP 4: Price Calculation');
    }

    try {
      const result = await this.config.calculator.calculate(mappingData);
      
      if (this.config.options.logIntermediateSteps) {
        console.log(`   Services Priced: ${result.data.services.length}`);
        console.log(`   Total Cost: $${result.data.totals.totalCost}`);
        console.log(`   Total Hours: ${result.data.totals.totalLaborHours}h`);
      }

      return {
        ...result,
        debug: {
          ...result.debug,
          step: 'calculation',
          processingTime: Date.now() - stepStart,
          intermediateOutput: {
            servicesCalculated: result.data.services.length,
            totalCost: result.data.totals.totalCost,
            totalHours: result.data.totals.totalLaborHours,
            calculationTime: result.data.calculationTime
          }
        }
      };

    } catch (error) {
      return this.createStepError('calculation', error, Date.now() - stepStart);
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Validate pipeline configuration
   */
  private validateConfig(): void {
    if (!this.config.detector) {
      throw new Error('Pipeline requires a detector implementation');
    }
    if (!this.config.checker) {
      throw new Error('Pipeline requires a completeness checker implementation');
    }
    if (!this.config.mapper) {
      throw new Error('Pipeline requires a mapper implementation');
    }
    if (!this.config.calculator) {
      throw new Error('Pipeline requires a calculator implementation');
    }
  }

  /**
   * Create error result for failed step
   */
  private createStepError(step: string, error: any, processingTime: number): StepResult {
    return {
      success: false,
      data: null,
      debug: {
        step,
        processingTime,
        intermediateOutput: null,
        warnings: [`${step} failed: ${error.message}`]
      },
      error: error.message
    };
  }

  /**
   * Create failure result for pipeline
   */
  private createFailureResult(
    steps: StepResult[], 
    performance: any, 
    totalTime: number
  ): PipelineResult {
    return {
      success: false,
      steps,
      totalTime,
      performance,
      debug: this.config.options.enableDebug ? {
        inputAnalysis: { error: 'Pipeline step failed' },
        serviceFlow: steps.map(s => s.debug),
        warnings: steps.filter(s => !s.success).map(s => s.error || 'Unknown error')
      } : undefined
    };
  }

  /**
   * Create early return result
   */
  private createEarlyReturn(
    reason: string,
    steps: StepResult[], 
    performance: any, 
    totalTime: number
  ): PipelineResult {
    return {
      success: false,
      steps,
      totalTime,
      performance,
      clarificationNeeded: {
        questions: [`I need more information: ${reason}`],
        incompleteServices: [],
        suggestedResponse: `Could you please provide more details about your landscaping needs?`
      }
    };
  }

  /**
   * Create clarification result
   */
  private createClarificationResult(
    validationData: ValidationResult,
    steps: StepResult[],
    performance: any,
    totalTime: number
  ): PipelineResult {
    const suggestedResponse = this.buildClarificationResponse(validationData);

    return {
      success: false,
      steps,
      totalTime,
      performance,
      clarificationNeeded: {
        questions: validationData.clarificationQuestions,
        incompleteServices: validationData.incompleteServices,
        suggestedResponse
      }
    };
  }

  /**
   * Build clarification response message
   */
  private buildClarificationResponse(validationData: ValidationResult): string {
    let response = 'I need a few more details to provide accurate pricing:\n\n';
    
    validationData.clarificationQuestions.forEach((question, index) => {
      response += `${index + 1}. ${question}\n`;
    });

    if (validationData.completeServices.length > 0) {
      response += '\nSo far I understand you need:\n';
      validationData.completeServices.forEach(service => {
        response += `• ${service.name}: ${service.quantity} ${service.unit}\n`;
      });
    }

    return response;
  }

  /**
   * Create debug information
   */
  private createDebugInfo(input: string, steps: StepResult[]): any {
    return {
      inputAnalysis: {
        originalInput: input,
        inputLength: input.length,
        processingSteps: steps.length
      },
      serviceFlow: steps.map(step => ({
        step: step.debug.step,
        time: step.debug.processingTime,
        success: step.success,
        output: step.debug.intermediateOutput
      })),
      warnings: steps.reduce((warnings: string[], step) => {
        if (step.debug.warnings) {
          warnings.push(...step.debug.warnings);
        }
        return warnings;
      }, [])
    };
  }

  /**
   * Log performance breakdown
   */
  private logPerformanceBreakdown(performance: any): void {
    console.log('📊 PERFORMANCE BREAKDOWN:');
    console.log(`  Step 1 (Detection): ${performance.step1_detection}ms`);
    console.log(`  Step 2 (Validation): ${performance.step2_validation}ms`);
    console.log(`  Step 3 (Mapping): ${performance.step3_mapping}ms`);
    console.log(`  Step 4 (Calculation): ${performance.step4_calculation}ms`);
    
    const total = Object.values(performance).reduce((sum: number, time: any) => sum + time, 0);
    console.log(`  Total Processing: ${total}ms`);
  }

  // ===============================
  // PUBLIC UTILITY METHODS
  // ===============================

  /**
   * Get pipeline configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Process with specific step debugging
   */
  async processWithStepDebugging(input: string, debugSteps: string[] = []): Promise<PipelineResult> {
    const originalLogSteps = this.config.options.logIntermediateSteps;
    const originalDebug = this.config.options.enableDebug;
    
    // Temporarily enable debugging for specified steps
    this.config.options.logIntermediateSteps = debugSteps.length > 0;
    this.config.options.enableDebug = true;
    
    try {
      const result = await this.process(input);
      return result;
    } finally {
      // Restore original settings
      this.config.options.logIntermediateSteps = originalLogSteps;
      this.config.options.enableDebug = originalDebug;
    }
  }

  /**
   * Health check - test pipeline with simple input
   */
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      const testInput = "100 square feet of mulch";
      const result = await this.process(testInput);
      
      if (!result.success && !result.clarificationNeeded) {
        issues.push('Pipeline failed on simple test input');
      }
      
      if (result.totalTime > 10000) {
        issues.push('Pipeline processing time exceeded 10 seconds');
      }
      
    } catch (error) {
      issues.push(`Health check failed: ${error.message}`);
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }
}