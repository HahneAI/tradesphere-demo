import React from 'react';
import * as Icons from 'lucide-react';
import type { PaverPatioVariable } from '../../types/paverPatioFormula';

interface VariableDropdownProps {
  variable: PaverPatioVariable;
  value: string;
  onChange: (value: string) => void;
  visualConfig: any;
  disabled?: boolean;
}

export const VariableDropdown: React.FC<VariableDropdownProps> = ({
  variable,
  value,
  onChange,
  visualConfig,
  disabled = false,
}) => {
  const selectedOption = variable.options[value];

  // Helper function following Tom's expert guidelines for consistent formatting
  const formatVariableDisplay = (variableKey: string, option: any) => {
    if (!option) return 'N/A';

    // Tier 1 variables (labor time factors) - show as percentages
    if (['tearoutComplexity', 'accessDifficulty', 'teamSize'].includes(variableKey)) {
      return option.value === 0 ? 'Baseline' : `+${option.value}%`;
    }

    // Equipment costs - show daily rates
    if (variableKey === 'equipmentRequired') {
      return option.value === 0 ? 'Hand tools' : `$${option.value}/day`;
    }

    // Obstacle costs - show flat fees
    if (variableKey === 'obstacleRemoval') {
      return option.value === 0 ? 'None' : `$${option.value}`;
    }

    // Material factors - show percentages
    if (['paverStyle', 'patternComplexity'].includes(variableKey)) {
      return option.value === 0 ? 'Standard' : `+${option.value}%`;
    }

    // Cutting complexity - show combined effects
    if (variableKey === 'cuttingComplexity') {
      if (option.fixedLaborHours && option.materialWaste) {
        return `+${option.fixedLaborHours}h, +${option.materialWaste}% waste`;
      } else if (option.fixedLaborHours) {
        return `+${option.fixedLaborHours}h fixed`;
      }
      return option.value === 0 ? 'Minimal' : `+${option.value}%`;
    }

    // Default fallback
    return option.value === 0 ? 'Default' : `${option.value}`;
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
          {Object.entries(variable.options).map(([key, option]) => (
            <option key={key} value={key}>
              {option.label} ({formatVariableDisplay(variableKey, option)}) - {option.description}
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
            backgroundColor: visualConfig.colors.primary + '08',
            borderLeftColor: visualConfig.colors.primary,
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
              {selectedOption.label}
            </span>
            <span
              className="text-sm font-mono px-2 py-1 rounded"
              style={{
                backgroundColor: visualConfig.colors.primary,
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