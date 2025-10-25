/**
 * Financial Adjustments Component
 *
 * Allows applying percentage discounts (max 3%), fixed discounts, surcharges,
 * and coupons to service line items.
 *
 * Replaces manual service entry in the Job Creation Wizard.
 */

import React, { useState } from 'react';
import {
  Adjustment,
  AdjustmentType,
  validatePercentageDiscount,
  validateFixedDiscount,
  validateSurcharge,
  validateCoupon,
  formatAdjustment,
  getAdjustmentBadgeColor,
} from '../adjustments';
import { ServiceLineItem } from '../../../../hooks/useJobCreationWizard';

interface FinancialAdjustmentsProps {
  services: ServiceLineItem[];
  selectedServiceIndex: number | null;
  onSelectService: (index: number | null) => void;
  onApplyAdjustment: (serviceIndex: number, adjustment: Adjustment) => void;
  onRemoveAdjustment: (serviceIndex: number, adjustmentId: string) => void;
}

export const FinancialAdjustments: React.FC<FinancialAdjustmentsProps> = ({
  services,
  selectedServiceIndex,
  onSelectService,
  onApplyAdjustment,
  onRemoveAdjustment,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('percentage_discount');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
  const [adjustmentName, setAdjustmentName] = useState<string>('');
  const [adjustmentDescription, setAdjustmentDescription] = useState<string>('');
  const [couponCode, setCouponCode] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);

  const selectedService = selectedServiceIndex !== null ? services[selectedServiceIndex] : null;
  const serviceTotal = selectedService?.total_price || 0;

  const handleApplyAdjustment = () => {
    setErrors([]);

    if (!selectedService || selectedServiceIndex === null) {
      setErrors(['Please select a service to apply the adjustment to']);
      return;
    }

    if (!adjustmentName.trim()) {
      setErrors(['Please enter a name for this adjustment']);
      return;
    }

    // Validate based on type
    let validation;
    switch (adjustmentType) {
      case 'percentage_discount':
        validation = validatePercentageDiscount(adjustmentValue);
        break;
      case 'fixed_discount':
        validation = validateFixedDiscount(adjustmentValue, serviceTotal);
        break;
      case 'surcharge':
        validation = validateSurcharge(adjustmentValue);
        break;
      case 'coupon':
        validation = validateCoupon(couponCode, adjustmentValue, serviceTotal);
        break;
    }

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Create adjustment
    const adjustment: Adjustment = {
      id: `adj-${Date.now()}`,
      type: adjustmentType,
      name: adjustmentName,
      description: adjustmentDescription || undefined,
      value: adjustmentValue,
      code: adjustmentType === 'coupon' ? couponCode : undefined,
      appliedAt: new Date(),
    };

    onApplyAdjustment(selectedServiceIndex, adjustment);

    // Reset form
    setAdjustmentName('');
    setAdjustmentDescription('');
    setAdjustmentValue(0);
    setCouponCode('');
    setErrors([]);
  };

  const getAdjustmentTypeLabel = (type: AdjustmentType): string => {
    switch (type) {
      case 'percentage_discount':
        return 'Percentage Discount';
      case 'fixed_discount':
        return 'Fixed Discount';
      case 'surcharge':
        return 'Surcharge';
      case 'coupon':
        return 'Coupon Code';
    }
  };

  return (
    <div className="p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Financial Adjustments
      </h3>

      {/* Service Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Service to Adjust
        </label>
        <select
          value={selectedServiceIndex ?? ''}
          onChange={(e) => onSelectService(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <option value="">-- Select a service --</option>
          {services.map((service, index) => (
            <option key={service.tempId || index} value={index}>
              {service.service_name} - ${service.total_price.toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {/* Only show adjustment form if service is selected */}
      {selectedService && (
        <>
          {/* Adjustment Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['percentage_discount', 'fixed_discount', 'surcharge', 'coupon'] as AdjustmentType[]).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAdjustmentType(type)}
                    className={`
                      h-10 px-3 rounded-lg text-sm font-medium transition-all
                      ${
                        adjustmentType === type
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    {getAdjustmentTypeLabel(type)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Adjustment Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adjustment Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Military Discount, Rush Fee"
              value={adjustmentName}
              onChange={(e) => setAdjustmentName(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Adjustment Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Additional notes about this adjustment"
              value={adjustmentDescription}
              onChange={(e) => setAdjustmentDescription(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Coupon Code (only for coupon type) */}
          {adjustmentType === 'coupon' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Coupon Code *
              </label>
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono"
              />
            </div>
          )}

          {/* Adjustment Value */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {adjustmentType === 'percentage_discount' ? 'Discount Percentage (Max 3%)' : 'Amount ($)'}
            </label>
            <div className="relative">
              {adjustmentType === 'percentage_discount' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              )}
              {adjustmentType !== 'percentage_discount' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              )}
              <input
                type="number"
                min="0"
                max={adjustmentType === 'percentage_discount' ? 3 : undefined}
                step={adjustmentType === 'percentage_discount' ? 0.1 : 0.01}
                value={adjustmentValue || ''}
                onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
                className={`
                  w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                  ${adjustmentType === 'percentage_discount' ? 'pr-8' : 'pl-8'}
                `}
              />
            </div>
            {adjustmentType === 'percentage_discount' && (
              <p className="text-xs text-gray-500 mt-1">Maximum allowed: 3%</p>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Apply Button */}
          <button
            type="button"
            onClick={handleApplyAdjustment}
            disabled={!adjustmentName.trim() || adjustmentValue <= 0}
            className="w-full h-10 px-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed
                       text-white rounded-lg font-medium transition-colors"
          >
            Apply Adjustment
          </button>

          {/* Current Adjustments for Selected Service */}
          {selectedService.adjustments && selectedService.adjustments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Adjustments
              </h4>
              <div className="space-y-2">
                {selectedService.adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {adj.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getAdjustmentBadgeColor(adj.type)}`}>
                          {formatAdjustment(adj)}
                        </span>
                      </div>
                      {adj.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {adj.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveAdjustment(selectedServiceIndex, adj.id)}
                      className="ml-2 w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40
                                 text-red-600 dark:text-red-400 transition-colors flex items-center justify-center"
                      aria-label="Remove adjustment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* No services message */}
      {services.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">Add services first to apply financial adjustments</p>
        </div>
      )}
    </div>
  );
};
