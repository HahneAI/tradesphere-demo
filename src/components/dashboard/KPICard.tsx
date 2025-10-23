/**
 * KPI Card Component
 *
 * Displays a single key performance indicator with:
 * - Metric value and label
 * - Trend indicator (up/down/neutral)
 * - Percentage change
 * - Icon representation
 * - Click handler for drill-down
 *
 * @module KPICard
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: keyof typeof Icons;
  color: string;
  onClick?: () => void;
  visualConfig: any;
  theme: 'light' | 'dark';
}

/**
 * KPI Card component with trend indicator
 */
export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color,
  onClick,
  visualConfig,
  theme
}) => {
  const IconComponent = Icons[icon] as React.ComponentType<any>;
  const isClickable = !!onClick;

  const handleClick = () => {
    if (onClick) {
      hapticFeedback.selection();
      onClick();
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <Icons.TrendingUp className="h-4 w-4" />;
      case 'down':
        return <Icons.TrendingDown className="h-4 w-4" />;
      default:
        return <Icons.Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#22C55E'; // green
      case 'down':
        return '#EF4444'; // red
      default:
        return visualConfig.colors.text.secondary;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`rounded-lg p-4 md:p-6 transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:shadow-lg' : ''
      }`}
      style={{
        backgroundColor: visualConfig.colors.surface,
        border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`
      }}
      role={isClickable ? 'button' : 'article'}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
      aria-label={`${title}: ${value}${trendValue ? `, ${trendValue}` : ''}`}
    >
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <IconComponent
            className="h-6 w-6"
            style={{ color }}
            aria-hidden="true"
          />
        </div>

        {/* Trend indicator */}
        {trend && trendValue && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${getTrendColor()}20`,
              color: getTrendColor()
            }}
          >
            {getTrendIcon()}
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-1">
        <div
          className="text-2xl md:text-3xl font-bold"
          style={{ color: visualConfig.colors.text.primary }}
        >
          {value}
        </div>
      </div>

      {/* Title */}
      <div
        className="text-sm font-medium mb-1"
        style={{ color: visualConfig.colors.text.secondary }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          className="text-xs"
          style={{ color: visualConfig.colors.text.secondary + '80' }}
        >
          {subtitle}
        </div>
      )}

      {/* Click indicator */}
      {isClickable && (
        <div className="flex items-center gap-1 mt-3 text-xs font-medium"
             style={{ color: visualConfig.colors.primary }}>
          <span>View details</span>
          <Icons.ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
};

export default KPICard;
