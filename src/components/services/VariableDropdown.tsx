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
    // Handles both direct percentages (30, 50) and multipliers (1.3, 1.5)
    if (variableKey === 'overallComplexity') {
      // Check for baseline values
      if (option.value === 0 || option.value === 1.0 || option.multiplier === 1.0) return 'Baseline';

      // If multiplier exists, convert to percentage
      if (option.multiplier !== undefined && option.multiplier !== 1.0) {
        const percentage = ((option.multiplier - 1) * 100).toFixed(0);
        return `(+${percentage}%)`;
      }

      // If value is a direct percentage (30, 50), show as-is
      if (option.value !== undefined && option.value > 1) {
        return `(+${option.value}%)`;
      }

      // If value is a small decimal (0.3, 0.5), it's a multiplier coefficient
      if (option.value !== undefined && option.value > 0 && option.value < 1) {
        const percentage = (option.value * 100).toFixed(0);
        return `(+${percentage}%)`;
      }

      return 'Baseline';
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

    // Cutting complexity - show combined effects
    if (variableKey === 'cuttingComplexity') {
      const hasLabor = option.laborPercentage && option.laborPercentage > 0;
      const hasWaste = option.materialWaste && option.materialWaste > 0;

      if (!hasLabor && !hasWaste) return 'Baseline';
      if (hasLabor && hasWaste) return `+${option.laborPercentage}% hours, +${option.materialWaste}% waste`;
      if (hasLabor) return `+${option.laborPercentage}% hours`;
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
              // Intelligent sorting based on option structure
              const getSortValue = (opt: any) => {
                // Priority 1: Cutting complexity uses fixedLaborHours
                if (opt.fixedLaborHours !== undefined) return opt.fixedLaborHours;
                // Priority 2: Pattern complexity uses wastePercentage
                if (opt.wastePercentage !== undefined) return opt.wastePercentage;
                // Priority 3: Multipliers
                if (opt.multiplier !== undefined) return opt.multiplier;
                // Priority 4: Standard value
                if (opt.value !== undefined) return opt.value;
                return 0;
              };

              const aVal = getSortValue(a[1]);
              const bVal = getSortValue(b[1]);
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