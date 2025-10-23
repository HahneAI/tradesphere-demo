import React from 'react';

interface ToggleInputProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  isAdmin: boolean;
  visualConfig: any;
  linkedService?: string;
}

export const ToggleInput: React.FC<ToggleInputProps> = ({
  label,
  value,
  onChange,
  description,
  isAdmin,
  visualConfig,
  linkedService,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
            {label}
          </label>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: visualConfig.colors.text.secondary }}>
              {description}
            </p>
          )}
          {linkedService && (
            <p className="text-xs mt-0.5 italic" style={{ color: visualConfig.colors.text.secondary }}>
              Linked to: {linkedService}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => isAdmin && onChange(!value)}
          disabled={!isAdmin}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          style={{
            backgroundColor: value ? visualConfig.colors.primary : visualConfig.colors.text.secondary + '40',
          }}
          role="switch"
          aria-checked={value}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${value ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    </div>
  );
};
