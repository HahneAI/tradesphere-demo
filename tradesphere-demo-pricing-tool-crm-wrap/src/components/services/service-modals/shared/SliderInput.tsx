import React from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  isAdmin: boolean;
  visualConfig: any;
  description?: string;
}

export const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  isAdmin,
  visualConfig,
  description
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
        {label}
      </label>
      <span className="text-sm font-medium" style={{ color: visualConfig.colors.primary }}>
        {value}{unit}
      </span>
    </div>
    {description && (
      <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
        {description}
      </p>
    )}
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      min={min}
      max={max}
      step={step}
      disabled={!isAdmin}
      className={`w-full ${!isAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
      style={{
        accentColor: visualConfig.colors.primary,
      }}
    />
    <div className="flex items-center justify-between text-xs" style={{ color: visualConfig.colors.text.secondary }}>
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
);
