/**
 * Priority Indicator Component
 *
 * Visual priority marker for jobs
 * Shows priority level with color coding and optional label
 *
 * @module PriorityIndicator
 */

import React from 'react';
import { AlertCircle, ChevronUp, Minus } from 'lucide-react';
import {
  getPriorityLabelFromValue,
  getPriorityColorFromValue
} from '../../../types/jobs-views';

interface PriorityIndicatorProps {
  priority: number;
  variant?: 'dot' | 'badge' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Priority Indicator Component
 * Displays job priority with visual indicators
 */
export const PriorityIndicator: React.FC<PriorityIndicatorProps> = ({
  priority,
  variant = 'dot',
  size = 'md',
  showLabel = false,
  className = ''
}) => {
  const label = getPriorityLabelFromValue(priority);
  const color = getPriorityColorFromValue(priority);

  // Size mappings
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Render dot variant
  if (variant === 'dot') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div
          className={`rounded-full ${dotSizes[size]}`}
          style={{ backgroundColor: color }}
          title={label}
        />
        {showLabel && (
          <span className={`font-medium ${textSizes[size]}`} style={{ color }}>
            {label}
          </span>
        )}
      </div>
    );
  }

  // Render badge variant
  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${className}`}
        style={{
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}40`
        }}
      >
        <span className={dotSizes[size]} style={{ backgroundColor: color }} />
        {label}
      </span>
    );
  }

  // Render icon variant
  const IconComponent = priority >= 8 ? AlertCircle : priority >= 5 ? ChevronUp : Minus;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <IconComponent
        size={iconSizes[size]}
        style={{ color }}
        strokeWidth={2.5}
      />
      {showLabel && (
        <span className={`font-medium ${textSizes[size]}`} style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
};

export default PriorityIndicator;
