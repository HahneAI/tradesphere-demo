/**
 * TradeSphere Pricing System - Main Export Module
 * 
 * Centralized exports for the complete pricing system
 * Provides clean import paths for external consumers
 */

// Core Master Formula
export * from './core/master-formula/formula-types';
export { usePaverPatioStore, calculateExpertPricing, loadPaverPatioConfig } from './core/stores/paver-patio-store';

// Services Database
export { 
  SERVICE_DATABASE, 
  SERVICE_SYNONYMS, 
  CATEGORY_SYNONYMS, 
  getServiceDefaultVariables, 
  getPaverPatioServiceDefaults 
} from './core/services-database/service-database';

// AI Engine - Parameter Collection
export { ParameterCollectorService } from './ai-engine/parameter-collection/ParameterCollectorService';
export { PaverPatioVariableMapper } from './ai-engine/parameter-collection/PaverPatioVariableMapper';

// AI Engine - Text Processing
export { GPTServiceSplitter } from './ai-engine/text-processing/GPTServiceSplitter';

// AI Engine - Pricing Calculation
export { PricingCalculatorService, createPricingCalculator } from './ai-engine/pricing-calculation/PricingCalculatorService';

// Interfaces
export { default as QuickCalculatorTab } from './interfaces/quick-calculator/QuickCalculatorTab';

// Utilities
export { calculateExpertPricing as serverCalculateExpertPricing, loadPaverPatioConfig as serverLoadPaverPatioConfig } from './utils/calculations/server-calculations';

// Configuration
export { default as paverPatioConfig } from './config/paver-patio-formula.json';