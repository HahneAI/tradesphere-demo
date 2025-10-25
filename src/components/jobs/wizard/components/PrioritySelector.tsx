/**
 * Priority Selector Component
 *
 * Radio button group for selecting job priority level.
 * Supports Low (0-2), Normal (3-5), High (6-8), Urgent (9-10).
 * Visual indicators with color coding and icons.
 *
 * @component PrioritySelector
 */

import React from 'react';

export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

interface PriorityOption {
  value: PriorityLevel;
  label: string;
  numericRange: [number, number];
  color: string;
  bgColor: string;
  borderColor: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
  icon: React.ReactNode;
}

interface PrioritySelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: 'low',
    label: 'Low',
    numericRange: [0, 2],
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    selectedBg: 'bg-gray-100',
    selectedBorder: 'border-gray-500',
    selectedText: 'text-gray-900',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  {
    value: 'normal',
    label: 'Normal',
    numericRange: [3, 5],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    selectedBg: 'bg-blue-100',
    selectedBorder: 'border-blue-500',
    selectedText: 'text-blue-900',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    value: 'high',
    label: 'High',
    numericRange: [6, 8],
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    selectedBg: 'bg-orange-100',
    selectedBorder: 'border-orange-500',
    selectedText: 'text-orange-900',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
  },
  {
    value: 'urgent',
    label: 'Urgent',
    numericRange: [9, 10],
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    selectedBg: 'bg-red-100',
    selectedBorder: 'border-red-500',
    selectedText: 'text-red-900',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  // Convert numeric value to priority level
  const getActivePriority = (): PriorityLevel => {
    const option = PRIORITY_OPTIONS.find(
      (opt) => value >= opt.numericRange[0] && value <= opt.numericRange[1]
    );
    return option?.value || 'normal';
  };

  const activePriority = getActivePriority();

  const handleSelect = (option: PriorityOption) => {
    if (disabled) return;
    // Use middle value of range as the numeric value
    const midValue = Math.floor((option.numericRange[0] + option.numericRange[1]) / 2);
    onChange(midValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Priority <span className="text-red-500">*</span>
      </label>

      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        role="radiogroup"
        aria-label="Job priority level"
      >
        {PRIORITY_OPTIONS.map((option) => {
          const isSelected = activePriority === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(option)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all
                flex flex-col items-center justify-center gap-2
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                ${
                  isSelected
                    ? `${option.selectedBg} ${option.selectedBorder} ${option.selectedText} shadow-md`
                    : `${option.bgColor} ${option.borderColor} ${option.color} hover:${option.selectedBg}`
                }
              `}
              aria-label={`${option.label} priority`}
            >
              {/* Icon */}
              <div className={isSelected ? 'scale-110' : ''}>{option.icon}</div>

              {/* Label */}
              <span className="font-medium text-sm">{option.label}</span>

              {/* Radio Circle Indicator */}
              <div
                className={`
                  absolute top-2 right-2 w-4 h-4 rounded-full border-2
                  flex items-center justify-center
                  ${
                    isSelected
                      ? `${option.selectedBorder} bg-white dark:bg-gray-900`
                      : `${option.borderColor} bg-white dark:bg-gray-800`
                  }
                `}
                aria-hidden="true"
              >
                {isSelected && (
                  <div className={`w-2 h-2 rounded-full ${option.selectedBg}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Priority affects scheduling and resource allocation
      </p>
    </div>
  );
};
