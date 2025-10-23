import React, { useState, useEffect } from 'react';

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
}) => {
  // Use string state to allow empty input and smooth editing
  const [inputValue, setInputValue] = useState(value.toString());

  // Sync with prop value changes (when parent updates)
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Only call onChange if value is valid number
    const parsed = parseFloat(newValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else if (newValue === '' || newValue === '-') {
      // Allow empty or minus sign during typing
      // Don't call onChange yet - wait for valid number
    }
  };

  const handleBlur = () => {
    // On blur, ensure we have a valid number
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || inputValue === '' || inputValue === '-') {
      // Reset to last valid value or 0
      setInputValue(value.toString());
    }
  };

  return (
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
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
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
};
