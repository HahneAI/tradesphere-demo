import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import type { PaverPatioCalculationResult } from '../../types/paverPatioFormula';

interface PricingPreviewProps {
  calculation: PaverPatioCalculationResult | null;
  onCalculate: (sqft: number) => PaverPatioCalculationResult;
  visualConfig: any;
  className?: string;
}

export const PricingPreview: React.FC<PricingPreviewProps> = ({
  calculation,
  onCalculate,
  visualConfig,
  className = '',
}) => {
  const [sqft, setSqft] = useState<string>('300');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleSqftChange = (value: string) => {
    setSqft(value);
    const numValue = parseFloat(value) || 1;
    onCalculate(numValue);
  };

  // Safe access to calculation values with defaults
  const getTotal = () => calculation?.tier2Results?.total ?? 0;
  const getSubtotal = () => calculation?.tier2Results?.subtotal ?? 0;
  const getLaborCost = () => calculation?.tier2Results?.laborCost ?? 0;
  const getMaterialCost = () => calculation?.tier2Results?.totalMaterialCost ?? 0;
  const getEquipmentCost = () => calculation?.tier2Results?.equipmentCost ?? 0;
  const getObstacleCost = () => calculation?.tier2Results?.obstacleCost ?? 0;
  const getProfit = () => calculation?.tier2Results?.profit ?? 0;
  const getTotalHours = () => calculation?.tier1Results?.totalManHours ?? 0;

  if (!calculation) {
    return (
      <div 
        className={`p-4 rounded-lg border ${className}`}
        style={{ 
          backgroundColor: visualConfig.colors.background,
          borderColor: visualConfig.colors.text.secondary + '40'
        }}
      >
        <div className="animate-pulse flex items-center justify-center">
          <Icons.Calculator className="h-6 w-6 mr-2" style={{ color: visualConfig.colors.text.secondary }} />
          <span style={{ color: visualConfig.colors.text.secondary }}>
            Loading calculation...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`space-y-4 ${className}`}
    >
      {/* Square Footage Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
          Project Size (Square Feet)
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={sqft}
            onChange={(e) => handleSqftChange(e.target.value)}
            min="1"
            max="10000"
            step="1"
            className="flex-1 p-2 border rounded-lg text-sm"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: visualConfig.colors.text.secondary + '40',
              color: visualConfig.colors.text.primary,
            }}
          />
          <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            sq ft
          </span>
        </div>
      </div>

      {/* Price Display */}
      <div 
        className="p-4 rounded-lg border-2"
        style={{ 
          backgroundColor: visualConfig.colors.primary + '08',
          borderColor: visualConfig.colors.primary + '40'
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
            Estimated Total Price
          </span>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            <Icons.Info className="h-4 w-4" />
          </button>
        </div>
        
        <div className="text-2xl font-bold" style={{ color: visualConfig.colors.primary }}>
          ${getTotal().toFixed(2)}
        </div>

        <div className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
          ${(getTotal() / parseFloat(sqft || '1')).toFixed(2)} per sq ft
        </div>

        <div className="text-xs mt-1" style={{ color: visualConfig.colors.text.secondary }}>
          {getTotalHours().toFixed(1)} total hours
        </div>
      </div>

      {/* Quick Size Presets */}
      <div className="space-y-2">
        <span className="text-xs font-medium" style={{ color: visualConfig.colors.text.secondary }}>
          Quick Sizes:
        </span>
        <div className="grid grid-cols-4 gap-2">
          {[100, 200, 300, 500].map(size => (
            <button
              key={size}
              onClick={() => handleSqftChange(size.toString())}
              className={`
                p-2 rounded text-xs transition-colors
                ${sqft === size.toString() ? 'ring-2' : ''}
              `}
              style={{
                backgroundColor: sqft === size.toString() 
                  ? visualConfig.colors.primary + '20' 
                  : visualConfig.colors.background,
                color: visualConfig.colors.text.primary,
                ringColor: visualConfig.colors.primary,
              }}
            >
              {size} sq ft
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Breakdown */}
      {showBreakdown && (
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ 
            backgroundColor: visualConfig.colors.surface,
            border: `1px solid ${visualConfig.colors.text.secondary}40`
          }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
              Expert-Validated Breakdown
            </h4>
            <button
              onClick={() => setShowBreakdown(false)}
              className="p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              <Icons.X className="h-4 w-4" />
            </button>
          </div>

          {/* Tier 1: Man Hours */}
          <div className="space-y-2">
            <div className="text-xs font-medium" style={{ color: visualConfig.colors.text.secondary }}>
              Tier 1 - Labor Hours Calculation:
            </div>
            <div className="text-xs space-y-1" style={{ color: visualConfig.colors.text.primary }}>
              {(calculation?.tier1Results?.breakdown || []).map((step, index) => (
                <div key={index} className="pl-2">• {step}</div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2"
                 style={{ borderColor: visualConfig.colors.text.secondary + '40' }}>
              <span style={{ color: visualConfig.colors.text.secondary }}>Total Hours:</span>
              <span style={{ color: visualConfig.colors.text.primary }}>
                {getTotalHours().toFixed(1)}h
              </span>
            </div>
          </div>

          {/* Tier 2: Cost Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-medium" style={{ color: visualConfig.colors.text.secondary }}>
              Tier 2 - Cost Calculation:
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: visualConfig.colors.text.secondary }}>Labor Cost:</span>
                <span style={{ color: visualConfig.colors.text.primary }}>
                  ${getLaborCost().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: visualConfig.colors.text.secondary }}>Material Cost:</span>
                <span style={{ color: visualConfig.colors.text.primary }}>
                  ${getMaterialCost().toFixed(2)}
                </span>
              </div>
              {getEquipmentCost() > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: visualConfig.colors.text.secondary }}>Equipment:</span>
                  <span style={{ color: visualConfig.colors.text.primary }}>
                    ${getEquipmentCost().toFixed(2)}
                  </span>
                </div>
              )}
              {getObstacleCost() > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: visualConfig.colors.text.secondary }}>Obstacles:</span>
                  <span style={{ color: visualConfig.colors.text.primary }}>
                    ${getObstacleCost().toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-sm border-t pt-2"
                 style={{ borderColor: visualConfig.colors.text.secondary + '40' }}>
              <span style={{ color: visualConfig.colors.text.secondary }}>Subtotal:</span>
              <span style={{ color: visualConfig.colors.text.primary }}>
                ${getSubtotal().toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-xs">
              <span style={{ color: visualConfig.colors.text.secondary }}>Profit Margin:</span>
              <span style={{ color: visualConfig.colors.text.primary }}>
                ${getProfit().toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-sm font-bold border-t pt-2"
                 style={{ borderColor: visualConfig.colors.primary }}>
              <span style={{ color: visualConfig.colors.text.primary }}>Final Total:</span>
              <span style={{ color: visualConfig.colors.primary }}>
                ${getTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {/* Formula Display */}
          <div className="mt-4 p-3 rounded" style={{ backgroundColor: visualConfig.colors.background }}>
            <span className="text-xs font-medium" style={{ color: visualConfig.colors.text.secondary }}>
              Two-Tier Expert Formula:
            </span>
            <p className="text-xs mt-1 font-mono break-all" style={{ color: visualConfig.colors.text.primary }}>
              {calculation?.breakdown || 'No breakdown available'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};