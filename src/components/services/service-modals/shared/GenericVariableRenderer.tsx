import React from 'react';
import { NumberInput } from './NumberInput';
import { SelectInput } from './SelectInput';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

// Note: These imports use direct paths to avoid circular dependency with index.ts

interface GenericVariableRendererProps {
  categoryId: string; // Category identifier (for debugging/keys)
  variables: any; // JSONB structure for a SINGLE category's variables
  values: Record<string, any>; // Current values for this category
  onChange: (variableKey: string, value: any) => void;
  visualConfig: any;
  isAdmin: boolean;
  theme?: string;
}

export const GenericVariableRenderer: React.FC<GenericVariableRendererProps> = ({
  categoryId,
  variables,
  values,
  onChange,
  visualConfig,
  isAdmin,
  theme
}) => {
  if (!variables || typeof variables !== 'object') {
    return (
      <div className="p-4 text-center" style={{ color: visualConfig.colors.text.secondary }}>
        No variables found for this category.
      </div>
    );
  }

  // Iterate through variables in this category
  return (
    <div className="space-y-4">
      {Object.entries(variables)
        .filter(([key]) => !['label', 'description'].includes(key))
        .map(([varKey, varConfig]: [string, any]) => {
          // Skip if not a valid variable config
          if (!varConfig || typeof varConfig !== 'object' || !varConfig.type) {
            return null;
          }

          const currentValue = values[varKey] ?? varConfig.default;

          // Render based on type
          return (
            <div
              key={`${categoryId}-${varKey}`}
              className="p-4 rounded-lg border"
              style={{
                borderColor: visualConfig.colors.text.secondary + '40',
                backgroundColor: visualConfig.colors.background
              }}
            >
              {varConfig.type === 'number' && (
                <NumberInput
                  label={varConfig.label || varKey}
                  value={currentValue}
                  onChange={(val) => onChange(varKey, val)}
                  min={varConfig.min ?? 0}
                  max={varConfig.max ?? 1000}
                  step={varConfig.step ?? 1}
                  unit={varConfig.unit}
                  isAdmin={isAdmin && (varConfig.adminEditable ?? true)}
                  visualConfig={visualConfig}
                  description={varConfig.description}
                />
              )}

              {varConfig.type === 'select' && (
                <SelectInput
                  label={varConfig.label || varKey}
                  value={currentValue}
                  onChange={(val) => onChange(varKey, val)}
                  options={varConfig.options || {}}
                  isAdmin={isAdmin && (varConfig.adminEditable ?? true)}
                  visualConfig={visualConfig}
                  description={varConfig.description}
                />
              )}

              {varConfig.type === 'slider' && (
                <SliderInput
                  label={varConfig.label || varKey}
                  value={currentValue}
                  onChange={(val) => onChange(varKey, val)}
                  min={varConfig.min ?? 0}
                  max={varConfig.max ?? 100}
                  step={varConfig.step ?? 1}
                  unit={varConfig.unit}
                  isAdmin={isAdmin && (varConfig.adminEditable ?? true)}
                  visualConfig={visualConfig}
                  description={varConfig.description}
                />
              )}

              {varConfig.type === 'toggle' && (
                <ToggleInput
                  label={varConfig.label || varKey}
                  value={currentValue}
                  onChange={(val) => onChange(varKey, val)}
                  isAdmin={isAdmin && (varConfig.adminEditable ?? true)}
                  visualConfig={visualConfig}
                  description={varConfig.description}
                  linkedService={varConfig.linkedService}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};
