/**
 * Pipeline Module Exports
 * 
 * Clean 4-Step Make.com Mirror Pipeline
 * Ready for production with full testing support
 */

// Core Pipeline
export { SimplePipeline } from './SimplePipeline';
export { PipelineFactory } from './PipelineFactory';

// Interfaces and Types
export * from './interfaces';

// Concrete Implementations  
export { DetectorImpl } from './implementations/DetectorImpl';
export { CheckerImpl } from './implementations/CheckerImpl';
export { MapperImpl } from './implementations/MapperImpl';
export { CalculatorImpl } from './implementations/CalculatorImpl';

// Mock Implementations
export {
  MockDetector,
  MockChecker, 
  MockMapper,
  MockCalculator,
  MockFactory,
  MockDataProvider
} from './mocks/MockImplementations';

// Test Runner
export { PipelineTestRunner } from '../../tests/pipeline-test';

/**
 * Quick Setup Examples:
 * 
 * // Production use
 * const pipeline = PipelineFactory.createProduction();
 * const result = await pipeline.process(userInput);
 * 
 * // Development use  
 * const pipeline = PipelineFactory.createDevelopment();
 * 
 * // Testing use
 * const pipeline = PipelineFactory.createMock();
 * 
 * // Debugging specific step
 * const pipeline = PipelineFactory.createForDebugging('detect');
 */

export default {
  SimplePipeline,
  PipelineFactory
};