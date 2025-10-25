/**
 * Type Definitions Index
 *
 * Central export point for all type definitions.
 * Import from this file for convenience.
 *
 * @module types
 */

// ============================================================================
// CRM Types
// ============================================================================

export * from './crm';
export * from './customer';

// ============================================================================
// Job Wizard Types
// ============================================================================

export * from './job-wizard';
export * from './job-wizard-schemas';

// For examples, import directly from job-wizard.examples.ts
// export * from './job-wizard.examples';

// ============================================================================
// Re-exports for convenience
// ============================================================================

// Job Wizard State Management
export type {
  JobWizardState,
  WizardStep,
  WizardMetadata,
  WizardSource,
} from './job-wizard';

// Step Data Types
export type {
  CustomerSelectionData,
  CustomerSelectionMode,
  JobDetailsData,
  ServicesData,
  ReviewData,
  ScheduleData,
} from './job-wizard';

// Service Types
export type {
  ServiceLineItem,
  ServiceCalculation,
  ServiceSource,
  CalculationMethod,
  PricingVariables,
} from './job-wizard';

// Validation Types
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationErrorCode,
} from './job-wizard';

// Integration Types
export type {
  ChatInterfaceResult,
  ChatServiceExtraction,
  PricingEngineResult,
  CustomerManagementResponse,
} from './job-wizard';

// Helper Functions
export {
  generateTempId,
  calculateProgress,
  getStepCompletionStatus,
  canNavigateToStep,
  convertWizardStateToJobInput,
  getStepLabel,
  getStepDescription,
} from './job-wizard';

// Type Guards
export {
  isCustomerSelectionData,
  isJobDetailsData,
  isServicesData,
  isReviewData,
  isScheduleData,
  isValidationSuccess,
} from './job-wizard';

// Validation Schemas
export {
  customerSelectionDataSchema,
  jobDetailsDataSchema,
  servicesDataSchema,
  reviewDataSchema,
  scheduleDataSchema,
  validateStepData,
  safeParse,
  zodErrorsToValidationErrors,
} from './job-wizard-schemas';
