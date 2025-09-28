import React from 'react';
import * as Icons from 'lucide-react';
import type { PaverPatioVariable } from '../../pricing-system/core/master-formula/formula-types';

interface VariableSliderProps {
  variable: PaverPatioVariable;
  value: number;
  onChange: (value: number) => void;
  visualConfig: any;
  disabled?: boolean;
}

export const VariableSlider: React.FC<VariableSliderProps> = ({
  variable,
  value,
  onChange,
  visualConfig,
  disabled = false,
}) => {
  const min = variable.min || 0;
  const max = variable.max || 2;
  const step = variable.step || 0.1;
  
  // Find the closest preset option for display
  const getClosestPreset = (currentValue: number) => {
    let closest = null;
    let minDiff = Infinity;
    
    Object.entries(variable.options).forEach(([key, option]) => {
      const diff = Math.abs(option.value - currentValue);
      if (diff < minDiff) {
        minDiff = diff;
        closest = { key, ...option };
      }
    });
    
    return closest;
  };

  const closestPreset = getClosestPreset(value);
  const percentage = ((value - min) / (max - min)) * 100;

  // Reset to preset value
  const resetToPreset = (presetKey: string) => {
    const preset = variable.options[presetKey];
    if (preset) {
      onChange(preset.value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Variable Header */}
      <div>
        <h4 className="text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.primary }}>
          {variable.label}
        </h4>
        <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
          {variable.description}
        </p>
      </div>

      {/* Current Value Display */}
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: visualConfig.colors.text.primary }}>
          Current Value:
        </span>
        <span 
          className="text-sm font-mono px-2 py-1 rounded"
          style={{ 
            backgroundColor: visualConfig.colors.primary,
            color: visualConfig.colors.text.onPrimary,
          }}
        >
          ×{value.toFixed(2)}
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className={`
            w-full h-2 rounded-lg appearance-none cursor-pointer slider
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{
            background: `linear-gradient(to right, ${visualConfig.colors.primary} 0%, ${visualConfig.colors.primary} ${percentage}%, ${visualConfig.colors.text.secondary}40 ${percentage}%, ${visualConfig.colors.text.secondary}40 100%)`,
          }}
        />
        
        {/* Min/Max Labels */}
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
            {min}
          </span>
          <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
            {max}
          </span>
        </div>
      </div>

      {/* Preset Options */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium" style={{ color: visualConfig.colors.text.secondary }}>
          Quick Presets:
        </h5>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(variable.options).map(([key, option]) => {
            const isActive = Math.abs(option.value - value) < 0.01;
            
            return (
              <button
                key={key}
                onClick={() => resetToPreset(key)}
                disabled={disabled}
                className={`
                  p-2 rounded-lg text-xs transition-colors text-left
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
                  ${isActive ? 'ring-2' : ''}
                `}
                style={{
                  backgroundColor: isActive 
                    ? visualConfig.colors.primary + '20' 
                    : visualConfig.colors.background,
                  borderColor: visualConfig.colors.text.secondary + '20',
                  color: visualConfig.colors.text.primary,
                  ringColor: visualConfig.colors.primary,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{option.label}</span>
                  <span className="font-mono">×{option.value}</span>
                </div>
                <p className="text-xs opacity-75">
                  {option.description}
                </p>
                {isActive && (
                  <div className="flex items-center mt-1">
                    <Icons.Check className="h-3 w-3 mr-1" style={{ color: visualConfig.colors.primary }} />
                    <span className="text-xs" style={{ color: visualConfig.colors.primary }}>
                      Current
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Closest Preset Indicator */}
      {closestPreset && Math.abs(closestPreset.value - value) > 0.01 && (
        <div 
          className="p-2 rounded-lg border-l-4 text-xs"
          style={{ 
            backgroundColor: visualConfig.colors.secondary + '10',
            borderLeftColor: visualConfig.colors.secondary,
          }}
        >
          <div className="flex items-center justify-between">
            <span>Closest preset: <strong>{closestPreset.label}</strong></span>
            <button
              onClick={() => resetToPreset(closestPreset.key)}
              disabled={disabled}
              className="px-2 py-1 rounded text-xs hover:opacity-80 transition-opacity"
              style={{ 
                backgroundColor: visualConfig.colors.secondary,
                color: visualConfig.colors.text.onPrimary,
              }}
            >
              Use Preset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};