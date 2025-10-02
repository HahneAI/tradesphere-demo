import React from 'react';
import * as Icons from 'lucide-react';
import type { PaverPatioVariable } from '../../pricing-system/core/master-formula/formula-types';

interface VariableDropdownProps {
  variable: PaverPatioVariable;
  value: string;
  onChange: (value: string) => void;
  visualConfig: any;
  categoryColor?: string;
  disabled?: boolean;
}

export const VariableDropdown: React.FC<VariableDropdownProps> = ({
  variable,
  value,
  onChange,
  visualConfig,
  categoryColor,
  disabled = false,
}) => {
  const accentColor = categoryColor || visualConfig.colors.primary;
  const selectedOption = variable.options[value];

  // Helper function following Tom's expert guidelines for consistent formatting
  const formatVariableDisplay = (variableKey: string, option: any) => {
    if (!option) return 'N/A';

    // Overall complexity - show as percentage with proper format
    if (variableKey === 'overallComplexity') {
      if (option.value === 0 || option.value === 1.0) return 'Baseline';
      return `(+${option.value}%)`;
    }

    // Tier 1 variables (labor time factors) - show as percentages
    if (['tearoutComplexity', 'accessDifficulty', 'teamSize'].includes(variableKey)) {
      if (option.value === 0) return 'Baseline';
      return `+${option.value}%`;
    }

    // Equipment costs - show daily rates
    if (variableKey === 'equipmentRequired') {
      if (option.value === 0) return 'Hand tools';
      return `$${option.value}/day`;
    }

    // Obstacle costs - show flat fees
    if (variableKey === 'obstacleRemoval') {
      if (option.value === 0) return 'None';
      return `$${option.value}`;
    }

    // Paver style - show percentage markup
    if (variableKey === 'paverStyle') {
      if (option.value === 0 || option.multiplier === 1.0) return 'Standard';
      const multiplier = option.multiplier || option.value || 0;
      return `+${((multiplier - 1) * 100).toFixed(0)}%`;
    }

    // Pattern complexity - show waste percentage
    if (variableKey === 'patternComplexity') {
      if (option.wastePercentage === 0 || option.wastePercentage === undefined) return 'Baseline';
      return `+${option.wastePercentage}% waste`;
    }

    // Cutting complexity - show combined effects
    if (variableKey === 'cuttingComplexity') {
      const hasLabor = option.fixedLaborHours && option.fixedLaborHours > 0;
      const hasWaste = option.materialWaste && option.materialWaste > 0;

      if (!hasLabor && !hasWaste) return 'Baseline';
      if (hasLabor && hasWaste) return `+${option.fixedLaborHours}h, +${option.materialWaste}% waste`;
      if (hasLabor) return `+${option.fixedLaborHours}h fixed`;
      if (hasWaste) return `+${option.materialWaste}% waste`;
    }

    // Default fallback - check for undefined values
    if (option.value === undefined || option.value === 0) return 'Baseline';
    return `${option.value}`;
  };

  // Get variable key from the variable object for formatting
  const getVariableKey = (varObj: PaverPatioVariable) => {
    // This is a bit hacky but works for our known variables
    if (varObj.label?.includes('Tearout')) return 'tearoutComplexity';
    if (varObj.label?.includes('Access')) return 'accessDifficulty';
    if (varObj.label?.includes('Team')) return 'teamSize';
    if (varObj.label?.includes('Equipment')) return 'equipmentRequired';
    if (varObj.label?.includes('Obstacle')) return 'obstacleRemoval';
    if (varObj.label?.includes('Paver')) return 'paverStyle';
    if (varObj.label?.includes('Cutting')) return 'cuttingComplexity';
    if (varObj.label?.includes('Pattern')) return 'patternComplexity';
    return 'unknown';
  };

  const variableKey = getVariableKey(variable);

  return (
    <div className="space-y-3">
      {/* Variable Header */}
      <div>
        <h4 className="text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.primary }}>
          {variable.label}
        </h4>
        <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
          {variable.description}
        </p>
      </div>

      {/* Dropdown */}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full p-3 pr-10 border rounded-lg text-sm transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-opacity-70 focus:ring-2 focus:ring-opacity-20'}
          `}
          style={{
            backgroundColor: visualConfig.colors.surface,
            borderColor: visualConfig.colors.text.secondary + '40',
            color: visualConfig.colors.text.primary,
            focusRingColor: visualConfig.colors.primary + '20',
          }}
        >
          {Object.entries(variable.options || {})
            .sort((a, b) => {
              const aVal = a[1].value ?? a[1].multiplier ?? 0;
              const bVal = b[1].value ?? b[1].multiplier ?? 0;
              return aVal - bVal;
            })
            .map(([key, option]) => (
              <option key={key} value={key}>
                {option.label} ({formatVariableDisplay(variableKey, option)})
              </option>
            ))}
        </select>
        
        {/* Dropdown Arrow */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <Icons.ChevronDown className="h-4 w-4" style={{ color: visualConfig.colors.text.secondary }} />
        </div>
      </div>

      {/* Selected Option Details */}
      {selectedOption && (
        <div
          className="p-3 rounded-lg border-l-4"
          style={{
            backgroundColor: accentColor + '08',
            borderLeftColor: accentColor,
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
              {selectedOption.label}
            </span>
            <span
              className="text-sm font-mono px-2 py-1 rounded"
              style={{
                backgroundColor: accentColor,
                color: visualConfig.colors.text.onPrimary,
              }}
            >
              {formatVariableDisplay(variableKey, selectedOption)}
            </span>
          </div>
          <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
            {selectedOption.description}
          </p>
        </div>
      )}
    </div>
  );
};