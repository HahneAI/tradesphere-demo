/**
 * TagChip Component
 *
 * Displays customer tags with optional remove functionality.
 * Supports color customization and size variants.
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { hapticFeedback } from '../../utils/mobile-gestures';

export interface TagChipProps {
  label: string;
  onRemove?: () => void;
  removable?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    fontSize: '0.75rem',
    padding: '2px 8px',
    iconSize: 12,
    gap: '4px'
  },
  md: {
    fontSize: '0.875rem',
    padding: '4px 12px',
    iconSize: 14,
    gap: '6px'
  },
  lg: {
    fontSize: '1rem',
    padding: '6px 16px',
    iconSize: 16,
    gap: '8px'
  }
};

export const TagChip: React.FC<TagChipProps> = ({
  label,
  onRemove,
  removable = false,
  color,
  size = 'md',
  className = ''
}) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const sizeConfig = SIZE_CONFIG[size];

  // Default color based on theme
  const defaultLightBg = '#f3f4f6';
  const defaultLightText = '#374151';
  const defaultDarkBg = '#374151';
  const defaultDarkText = '#d1d5db';

  const backgroundColor = color
    ? `${color}20`
    : theme === 'light' ? defaultLightBg : defaultDarkBg;

  const textColor = color
    ? color
    : theme === 'light' ? defaultLightText : defaultDarkText;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback.impact('light');
    onRemove?.();
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium transition-all duration-200 ${className}`}
      style={{
        backgroundColor: isHovered && removable ? `${color || textColor}30` : backgroundColor,
        color: textColor,
        fontSize: sizeConfig.fontSize,
        padding: sizeConfig.padding,
        gap: sizeConfig.gap
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="listitem"
      aria-label={`Tag: ${label}`}
    >
      <span>{label}</span>

      {removable && onRemove && (
        <button
          onClick={handleRemove}
          className="inline-flex items-center justify-center rounded-full transition-colors duration-200 hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10"
          style={{
            width: sizeConfig.iconSize + 4,
            height: sizeConfig.iconSize + 4,
            padding: 0,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer'
          }}
          aria-label={`Remove ${label} tag`}
          type="button"
        >
          <Icons.X style={{
            width: sizeConfig.iconSize,
            height: sizeConfig.iconSize,
            color: textColor
          }} />
        </button>
      )}
    </span>
  );
};

export default TagChip;
