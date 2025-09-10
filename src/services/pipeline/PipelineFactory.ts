/**
 * PipelineFactory - Factory for Creating Pipeline Configurations
 * 
 * Creates production, mock, and hybrid pipelines with proper dependency injection
 * Supports easy switching between implementations for testing and development
 */

import { SimplePipeline } from './SimplePipeline';
import { PipelineConfig, PipelineMode, FactoryConfig } from './interfaces';

// Import implementations
import { DetectorImpl } from './implementations/DetectorImpl';
import { CheckerImpl } from './implementations/CheckerImpl';
import { MapperImpl } from './implementations/MapperImpl';
import { CalculatorImpl } from './implementations/CalculatorImpl';

// Import mocks
import {
  MockDetector,
  MockChecker,
  MockMapper,
  MockCalculator,
  MockFactory
} from './mocks/MockImplementations';

export class PipelineFactory {
  
  /**
   * Create a production pipeline with real implementations
   */
  static createProduction(enableDebug: boolean = false): SimplePipeline {
    const config: PipelineConfig = {
      detector: new DetectorImpl(),
      checker: new CheckerImpl(),
      mapper: new MapperImpl(),
      calculator: new CalculatorImpl(true), // Use Google Sheets
      options: {
        enableDebug,
        enableTimings: true,
        earlyReturn: true,
        logIntermediateSteps: enableDebug
      }
    };

    return new SimplePipeline(config);
  }

  /**
   * Create a mock pipeline for testing (no external dependencies)
   */
  static createMock(enableDebug: boolean = true): SimplePipeline {
    const mockImplementations = MockFactory.createMockPipeline();
    
    const config: PipelineConfig = {
      detector: mockImplementations.detector,
      checker: mockImplementations.checker,
      mapper: mockImplementations.mapper,
      calculator: mockImplementations.calculator,
      options: {
        enableDebug,
        enableTimings: true,
        earlyReturn: false, // Allow full pipeline in tests
        logIntermediateSteps: enableDebug
      }
    };

    return new SimplePipeline(config);
  }

  /**
   * Create a hybrid pipeline (mix of real and mock implementations)
   */
  static createHybrid(mockSteps: Array<'detect' | 'check' | 'map' | 'calc'>, enableDebug: boolean = true): SimplePipeline {
    const hybridImplementations = MockFactory.createHybridPipeline(mockSteps);
    
    const config: PipelineConfig = {
      detector: hybridImplementations.detector,
      checker: hybridImplementations.checker,
      mapper: hybridImplementations.mapper,
      calculator: hybridImplementations.calculator,
      options: {
        enableDebug,
        enableTimings: true,
        earlyReturn: true,
        logIntermediateSteps: enableDebug
      }
    };

    return new SimplePipeline(config);
  }

  /**
   * Create pipeline from configuration object
   */
  static create(factoryConfig: FactoryConfig): SimplePipeline {
    switch (factoryConfig.mode) {
      case 'production':
        return this.createProduction(factoryConfig.enableDebug);
      
      case 'mock':
        return this.createMock(factoryConfig.enableDebug);
      
      case 'hybrid':
        return this.createHybrid(
          factoryConfig.mockSteps || [],
          factoryConfig.enableDebug
        );
      
      default:
        throw new Error(`Unknown pipeline mode: ${factoryConfig.mode}`);
    }
  }

  /**
   * Create pipeline optimized for development
   */
  static createDevelopment(): SimplePipeline {
    // Use mostly real implementations but mock expensive operations
    return this.createHybrid(['calc'], true);
  }

  /**
   * Create pipeline optimized for CI/CD testing
   */
  static createTesting(): SimplePipeline {
    // Use all mocks for fast, predictable testing
    return this.createMock(false);
  }

  /**
   * Create pipeline optimized for debugging specific steps
   */
  static createForDebugging(stepToDebug: 'detect' | 'check' | 'map' | 'calc'): SimplePipeline {
    // Mock all steps except the one being debugged
    const allSteps: Array<'detect' | 'check' | 'map' | 'calc'> = ['detect', 'check', 'map', 'calc'];
    const mockSteps = allSteps.filter(step => step !== stepToDebug);
    
    return this.createHybrid(mockSteps, true);
  }

  /**
   * Create pipeline from environment variables
   */
  static createFromEnvironment(): SimplePipeline {
    const mode = (process.env.PIPELINE_MODE as PipelineMode) || 'production';
    const enableDebug = process.env.NODE_ENV === 'development' || process.env.PIPELINE_DEBUG === 'true';
    const mockSteps = process.env.PIPELINE_MOCK_STEPS?.split(',') as Array<'detect' | 'check' | 'map' | 'calc'>;

    return this.create({
      mode,
      enableDebug,
      mockSteps
    });
  }

  /**
   * Validate pipeline configuration
   */
  static validateConfig(config: PipelineConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.detector) {
      errors.push('Pipeline configuration missing detector');
    }

    if (!config.checker) {
      errors.push('Pipeline configuration missing checker');
    }

    if (!config.mapper) {
      errors.push('Pipeline configuration missing mapper');
    }

    if (!config.calculator) {
      errors.push('Pipeline configuration missing calculator');
    }

    if (!config.options) {
      errors.push('Pipeline configuration missing options');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended configuration for different environments
   */
  static getRecommendedConfig(environment: 'development' | 'testing' | 'staging' | 'production'): FactoryConfig {
    switch (environment) {
      case 'development':
        return {
          mode: 'hybrid',
          mockSteps: ['calc'], // Mock expensive operations
          enableDebug: true
        };

      case 'testing':
        return {
          mode: 'mock',
          enableDebug: false // Reduce noise in test output
        };

      case 'staging':
        return {
          mode: 'production',
          enableDebug: true // Enable debugging in staging
        };

      case 'production':
        return {
          mode: 'production',
          enableDebug: false // Minimal logging in production
        };

      default:
        return {
          mode: 'production',
          enableDebug: false
        };
    }
  }

  /**
   * Create multiple pipelines for A/B testing
   */
  static createForABTesting(): {
    production: SimplePipeline;
    mockComparison: SimplePipeline;
  } {
    return {
      production: this.createProduction(true),
      mockComparison: this.createMock(true)
    };
  }

  /**
   * Health check all pipeline implementations
   */
  static async healthCheckAll(): Promise<{
    production: { healthy: boolean; issues: string[] };
    mock: { healthy: boolean; issues: string[] };
  }> {
    const productionPipeline = this.createProduction(false);
    const mockPipeline = this.createMock(false);

    const [productionHealth, mockHealth] = await Promise.all([
      productionPipeline.healthCheck(),
      mockPipeline.healthCheck()
    ]);

    return {
      production: productionHealth,
      mock: mockHealth
    };
  }

  /**
   * Performance comparison between implementations
   */
  static async performanceComparison(input: string, iterations: number = 5): Promise<{
    production: { averageTime: number; results: any[] };
    mock: { averageTime: number; results: any[] };
    speedupFactor: number;
  }> {
    const productionPipeline = this.createProduction(false);
    const mockPipeline = this.createMock(false);

    // Run production tests
    const productionTimes: number[] = [];
    const productionResults: any[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await productionPipeline.process(input);
      productionTimes.push(result.totalTime);
      productionResults.push(result);
    }

    // Run mock tests
    const mockTimes: number[] = [];
    const mockResults: any[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await mockPipeline.process(input);
      mockTimes.push(result.totalTime);
      mockResults.push(result);
    }

    const productionAvg = productionTimes.reduce((sum, time) => sum + time, 0) / iterations;
    const mockAvg = mockTimes.reduce((sum, time) => sum + time, 0) / iterations;

    return {
      production: {
        averageTime: productionAvg,
        results: productionResults
      },
      mock: {
        averageTime: mockAvg,
        results: mockResults
      },
      speedupFactor: productionAvg / mockAvg
    };
  }
}