import React from 'react';
import { NumberInput } from './NumberInput';
import { ToggleInput } from './ToggleInput';
import { OptionValueEditor } from './OptionValueEditor';

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
    <div className="space-y-6">
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
            <div key={`${categoryId}-${varKey}`}>
              {/* Simple number input - for variables without options */}
              {varConfig.type === 'number' && !varConfig.options && (
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    borderColor: visualConfig.colors.text.secondary + '40',
                    backgroundColor: visualConfig.colors.background
                  }}
                >
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
                </div>
              )}

              {/* Select with options - use OptionValueEditor to edit option values */}
              {varConfig.type === 'select' && varConfig.options && (
                <OptionValueEditor
                  label={varConfig.label || varKey}
                  description={varConfig.description}
                  options={varConfig.options}
                  onChange={(optionKey, updates) => {
                    // Batch update all fields in specific option at once
                    onChange(varKey, {
                      ...varConfig,
                      options: {
                        ...varConfig.options,
                        [optionKey]: {
                          ...varConfig.options[optionKey],
                          ...updates
                        }
                      }
                    });
                  }}
                  isAdmin={isAdmin && (varConfig.adminEditable ?? true)}
                  visualConfig={visualConfig}
                />
              )}

              {/* Toggle input for boolean values */}
              {varConfig.type === 'toggle' && (
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    borderColor: visualConfig.colors.text.secondary + '40',
                    backgroundColor: visualConfig.colors.background
                  }}
                >
                  <ToggleInput
                    label={varConfig.label || varKey}
                    value={currentValue}
                    onChange={(val) => onChange(varKey, val)}
                    isAdmin={isAdmin && (varConfig.adminEditable ?? true)}
                    visualConfig={visualConfig}
                    description={varConfig.description}
                    linkedService={varConfig.linkedService}
                  />
                </div>
              )}

              {/* Slider type - could use OptionValueEditor if it has options */}
              {varConfig.type === 'slider' && varConfig.options && (
                <OptionValueEditor
                  label={varConfig.label || varKey}
                  description={varConfig.description}
                  options={varConfig.options}
                  onChange={(optionKey, updates) => {
                    // Batch update all fields in specific option at once
                    onChange(varKey, {
                      ...varConfig,
                      options: {
                        ...varConfig.options,
                        [optionKey]: {
                          ...varConfig.options[optionKey],
                          ...updates
                        }
                      }
                    });
                  }}
                  isAdmin={isAdmin && (varConfig.adminEditable ?? true)}
                  visualConfig={visualConfig}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};
