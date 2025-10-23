import React from 'react';

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, { label: string; value: number; description?: string }>;
  isAdmin: boolean;
  visualConfig: any;
  description?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  onChange,
  options,
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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!isAdmin}
      className={`w-full p-2 border rounded-lg text-sm ${!isAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
      style={{
        backgroundColor: visualConfig.colors.surface,
        borderColor: visualConfig.colors.text.secondary + '40',
        color: visualConfig.colors.text.primary,
      }}
    >
      {Object.entries(options).map(([key, option]) => (
        <option key={key} value={key}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);
