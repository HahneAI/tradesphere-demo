/**
 * Financial Adjustments Types and Validation
 *
 * Supports percentage discounts (max 3%), fixed discounts, surcharges, and coupons
 * for service line items in the Job Creation Wizard.
 */

export type AdjustmentType = 'percentage_discount' | 'fixed_discount' | 'surcharge' | 'coupon';

export interface Adjustment {
  id: string;
  type: AdjustmentType;
  name: string;
  description?: string;
  value: number; // For percentage: 0-3 (%), for fixed/surcharge: dollar amount, for coupon: discount amount
  code?: string; // Optional coupon code
  appliedAt: Date;
  appliedBy?: string; // User ID who applied the adjustment
}

export interface AdjustmentValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate percentage discount (max 3%)
 */
export function validatePercentageDiscount(value: number): AdjustmentValidationResult {
  const errors: string[] = [];

  if (value < 0) {
    errors.push('Percentage discount cannot be negative');
  }

  if (value > 3) {
    errors.push('Percentage discount cannot exceed 3%');
  }

  if (isNaN(value)) {
    errors.push('Percentage discount must be a valid number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate fixed discount amount
 */
export function validateFixedDiscount(value: number, serviceTotal: number): AdjustmentValidationResult {
  const errors: string[] = [];

  if (value < 0) {
    errors.push('Fixed discount cannot be negative');
  }

  if (value > serviceTotal) {
    errors.push('Fixed discount cannot exceed service total');
  }

  if (isNaN(value)) {
    errors.push('Fixed discount must be a valid number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate surcharge amount
 */
export function validateSurcharge(value: number): AdjustmentValidationResult {
  const errors: string[] = [];

  if (value < 0) {
    errors.push('Surcharge cannot be negative');
  }

  if (isNaN(value)) {
    errors.push('Surcharge must be a valid number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate coupon code and percentage value
 */
export function validateCoupon(
  code: string,
  value: number,
  serviceTotal: number
): AdjustmentValidationResult {
  const errors: string[] = [];

  if (!code || code.trim().length === 0) {
    errors.push('Coupon code is required');
  }

  if (value < 0) {
    errors.push('Coupon discount cannot be negative');
  }

  if (value > 100) {
    errors.push('Coupon discount cannot exceed 100%');
  }

  if (isNaN(value)) {
    errors.push('Coupon discount must be a valid number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate adjusted price based on adjustment type
 */
export function calculateAdjustedPrice(basePrice: number, adjustment: Adjustment): number {
  switch (adjustment.type) {
    case 'percentage_discount':
      return basePrice - (basePrice * adjustment.value) / 100;
    case 'fixed_discount':
      return Math.max(0, basePrice - adjustment.value);
    case 'surcharge':
      return basePrice + adjustment.value;
    case 'coupon':
      // Coupons use percentage discount (value is the percentage)
      return basePrice - (basePrice * adjustment.value) / 100;
    default:
      return basePrice;
  }
}

/**
 * Format adjustment for display
 */
export function formatAdjustment(adjustment: Adjustment): string {
  switch (adjustment.type) {
    case 'percentage_discount':
      return `-${adjustment.value.toFixed(1)}%`;
    case 'fixed_discount':
      return `-$${adjustment.value.toFixed(2)}`;
    case 'surcharge':
      return `+$${adjustment.value.toFixed(2)}`;
    case 'coupon':
      // Coupons display as percentage
      return `-${adjustment.value.toFixed(1)}%`;
    default:
      return '';
  }
}

/**
 * Get adjustment badge color
 */
export function getAdjustmentBadgeColor(type: AdjustmentType): string {
  switch (type) {
    case 'percentage_discount':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'fixed_discount':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'surcharge':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    case 'coupon':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}
