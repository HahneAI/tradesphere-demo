import React from 'react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  isAdmin: boolean;
  visualConfig: any;
  description?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  unit = '',
  min = 0,
  max = 1000,
  step = 1,
  isAdmin,
  visualConfig,
  description
}) => (
  <div className="space-y-1">
    <label className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
      {label}
    </label>
    {description && (
      <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
        {description}
      </p>
    )}
    <div className="flex items-center space-x-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        disabled={!isAdmin}
        className={`flex-1 p-2 border rounded-lg text-sm ${!isAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
        style={{
          backgroundColor: visualConfig.colors.surface,
          borderColor: visualConfig.colors.text.secondary + '40',
          color: visualConfig.colors.text.primary,
        }}
      />
      {unit && (
        <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
          {unit}
        </span>
      )}
    </div>
  </div>
);
