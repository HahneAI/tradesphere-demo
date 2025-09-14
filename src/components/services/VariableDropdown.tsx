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
              {option.label} (×{option.value}) - {option.description}
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
              ×{selectedOption.value}
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