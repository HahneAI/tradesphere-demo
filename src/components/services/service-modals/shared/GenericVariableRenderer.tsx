import React from 'react';
import { NumberInput } from './NumberInput';
import { SelectInput } from './SelectInput';
import { SliderInput } from './SliderInput';

// Note: These imports use direct paths to avoid circular dependency with index.ts

interface GenericVariableRendererProps {
  variablesConfig: any; // JSONB structure
  values: Record<string, any>; // Current values
  onChange: (category: string, variable: string, value: any) => void;
  visualConfig: any;
  isAdmin: boolean;
}

export const GenericVariableRenderer: React.FC<GenericVariableRendererProps> = ({
  variablesConfig,
  values,
  onChange,
  visualConfig,
  isAdmin
}) => {
  if (!variablesConfig || typeof variablesConfig !== 'object') {
    return (
      <div className="p-4 text-center" style={{ color: visualConfig.colors.text.secondary }}>
        No variables configuration found for this service.
      </div>
    );
  }

  // Iterate through categories (calculationSettings, materials, etc.)
  return (
    <div className="space-y-6">
      {Object.entries(variablesConfig).map(([categoryKey, categoryConfig]: [string, any]) => {
        // Skip if not a valid category object
        if (!categoryConfig || typeof categoryConfig !== 'object') {
          return null;
        }

        return (
          <div key={categoryKey}>
            {/* Category Header */}
            {categoryConfig.label && (
              <div className="mb-4">
                <h3 className="text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
                  {categoryConfig.label}
                </h3>
                {categoryConfig.description && (
                  <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                    {categoryConfig.description}
                  </p>
                )}
              </div>
            )}

            {/* Iterate through variables in category */}
            <div className="space-y-4">
              {Object.entries(categoryConfig)
                .filter(([key]) => !['label', 'description'].includes(key))
                .map(([varKey, varConfig]: [string, any]) => {
                  // Skip if not a valid variable config
                  if (!varConfig || typeof varConfig !== 'object' || !varConfig.type) {
                    return null;
                  }

                  const currentValue = values[categoryKey]?.[varKey] ?? varConfig.default;

                  // Render based on type
                  return (
                    <div
                      key={`${categoryKey}-${varKey}`}
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
                          onChange={(val) => onChange(categoryKey, varKey, val)}
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
                          onChange={(val) => onChange(categoryKey, varKey, val)}
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
                          onChange={(val) => onChange(categoryKey, varKey, val)}
                          min={varConfig.min ?? 0}
                          max={varConfig.max ?? 100}
                          step={varConfig.step ?? 1}
                          unit={varConfig.unit}
                          isAdmin={isAdmin && (varConfig.adminEditable ?? true)}
                          visualConfig={visualConfig}
                          description={varConfig.description}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
