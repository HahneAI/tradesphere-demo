import React from 'react';
import { NumberInput } from './NumberInput';

interface OptionValueEditorProps {
  label: string;
  description?: string;
  options: Record<string, any>;
  onChange: (optionKey: string, field: string, value: any) => void;
  isAdmin: boolean;
  visualConfig: any;
}

/**
 * OptionValueEditor - Edit the VALUES inside each option
 *
 * This is for the Services Configuration modal where admins edit:
 * - Equipment costs: "Light Machinery" → $250/day
 * - Cutting complexity: "Moderate" → +20% hours, +15% waste
 * - Labor multipliers: "Moderate Access" → +50%
 *
 * NOT for selecting options (that's VariableDropdown in Quick Calculator)
 */
export const OptionValueEditor: React.FC<OptionValueEditorProps> = ({
  label,
  description,
  options,
  onChange,
  isAdmin,
  visualConfig,
}) => {
  if (!options || Object.keys(options).length === 0) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: visualConfig.colors.text.secondary }}>
        No options configured for {label}
      </div>
    );
  }

  // Analyze option structure to determine what fields to show
  const firstOption = Object.values(options)[0];
  const hasLaborPercentage = 'laborPercentage' in firstOption;
  const hasMaterialWaste = 'materialWaste' in firstOption;
  const hasValue = 'value' in firstOption;
  const hasMultiplier = 'multiplier' in firstOption;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="mb-4">
        <h4 className="text-base font-semibold" style={{ color: visualConfig.colors.text.primary }}>
          {label}
        </h4>
        {description && (
          <p className="text-xs mt-1" style={{ color: visualConfig.colors.text.secondary }}>
            {description}
          </p>
        )}
      </div>

      {/* Option Value Editors */}
      <div className="space-y-3">
        {Object.entries(options).map(([optionKey, option]) => (
          <div
            key={optionKey}
            className="p-5 rounded-xl border-2 hover:border-opacity-60 transition-all"
            style={{
              borderColor: visualConfig.colors.text.secondary + '20',
              backgroundColor: visualConfig.colors.surface,
            }}
          >
            {/* Option Label */}
            <h5 className="text-sm font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
              {option.label || optionKey}
            </h5>

            {/* Dynamic Fields Based on Option Structure */}
            <div className="grid grid-cols-2 gap-6">
              {/* Complex option: Cutting complexity with labor + waste */}
              {hasLaborPercentage && (
                <NumberInput
                  label="Labor Hours"
                  value={option.laborPercentage ?? 0}
                  onChange={(value) => onChange(optionKey, 'laborPercentage', value)}
                  unit="%"
                  min={0}
                  max={100}
                  step={5}
                  isAdmin={isAdmin}
                  visualConfig={visualConfig}
                  description="Percentage added to base labor hours"
                />
              )}

              {hasMaterialWaste && (
                <NumberInput
                  label="Material Waste"
                  value={option.materialWaste ?? 0}
                  onChange={(value) => onChange(optionKey, 'materialWaste', value)}
                  unit="%"
                  min={0}
                  max={50}
                  step={5}
                  isAdmin={isAdmin}
                  visualConfig={visualConfig}
                  description="Percentage of material waste"
                />
              )}

              {/* Simple value option: Equipment costs, obstacles */}
              {hasValue && !hasLaborPercentage && !hasMaterialWaste && (
                <NumberInput
                  label="Cost/Value"
                  value={option.value ?? 0}
                  onChange={(value) => {
                    onChange(optionKey, 'value', value);
                    // Also update multiplier if it exists
                    if (hasMultiplier && value > 0) {
                      const multiplier = 1 + (value / 100);
                      onChange(optionKey, 'multiplier', multiplier);
                    }
                  }}
                  unit={option.value >= 50 ? '$' : '%'}
                  min={0}
                  max={option.value >= 50 ? 2000 : 100}
                  step={option.value >= 50 ? 25 : 5}
                  isAdmin={isAdmin}
                  visualConfig={visualConfig}
                  description={option.description}
                />
              )}

              {/* Show multiplier as readonly if it exists and differs from calculated */}
              {hasMultiplier && option.multiplier !== undefined && (
                <div className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                  <span>Multiplier: </span>
                  <span className="font-mono">{option.multiplier.toFixed(2)}x</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
