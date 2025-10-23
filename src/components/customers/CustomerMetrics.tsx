/**
 * CustomerMetrics Component
 *
 * Displays customer engagement metrics (conversations, views, last interaction).
 * Supports multiple layout options and formats dates relative to now.
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface CustomerMetricsProps {
  totalConversations: number;
  totalViews: number;
  lastInteractionAt?: string | null;
  viewCount: number;
  layout?: 'horizontal' | 'vertical' | 'compact';
  className?: string;
}

const formatRelativeTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

interface MetricItemProps {
  icon: keyof typeof Icons;
  value: string | number;
  label: string;
  color: string;
}

const MetricItem: React.FC<MetricItemProps> = ({ icon, value, label, color }) => {
  const Icon = Icons[icon] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

  return (
    <div className="flex items-center gap-1" role="group" aria-label={`${label}: ${value}`}>
      <Icon style={{ width: 14, height: 14, color }} />
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color }}>
        {value}
      </span>
      <span style={{ fontSize: '0.75rem', color: `${color}99` }}>
        {label}
      </span>
    </div>
  );
};

export const CustomerMetrics: React.FC<CustomerMetricsProps> = ({
  totalConversations,
  totalViews,
  lastInteractionAt,
  viewCount,
  layout = 'horizontal',
  className = ''
}) => {
  const { theme } = useTheme();

  const textColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const iconColor = theme === 'light' ? '#4b5563' : '#d1d5db';

  const relativeTime = formatRelativeTime(lastInteractionAt);

  const layoutStyles = {
    horizontal: 'flex items-center gap-4 flex-wrap',
    vertical: 'flex flex-col gap-2',
    compact: 'flex items-center gap-2'
  };

  const showMetrics = totalConversations > 0 || totalViews > 0 || lastInteractionAt;

  if (!showMetrics) {
    return (
      <div
        className={`text-sm ${className}`}
        style={{ color: textColor }}
      >
        No activity yet
      </div>
    );
  }

  return (
    <div className={`${layoutStyles[layout]} ${className}`} role="list" aria-label="Customer metrics">
      {totalConversations > 0 && (
        <MetricItem
          icon="MessageCircle"
          value={totalConversations}
          label={totalConversations === 1 ? 'conversation' : 'conversations'}
          color={iconColor}
        />
      )}

      {totalViews > 0 && (
        <MetricItem
          icon="Eye"
          value={totalViews}
          label={totalViews === 1 ? 'view' : 'views'}
          color={iconColor}
        />
      )}

      {lastInteractionAt && (
        <MetricItem
          icon="Clock"
          value={relativeTime}
          label="last seen"
          color={iconColor}
        />
      )}
    </div>
  );
};

export default CustomerMetrics;
