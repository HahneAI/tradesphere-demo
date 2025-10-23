/**
 * SourceBadge Component
 *
 * Displays customer source (chat/manual/import) with icon.
 * Shows how the customer was created in the system.
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type CustomerSource = 'chat' | 'manual' | 'import';

export interface SourceBadgeProps {
  source: CustomerSource;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SOURCE_CONFIG: Record<CustomerSource, {
  label: string;
  icon: keyof typeof Icons;
  tooltip: string;
  lightColor: string;
  darkColor: string;
}> = {
  chat: {
    label: 'Chat',
    icon: 'MessageCircle',
    tooltip: 'Created from AI conversation',
    lightColor: '#6366f1',
    darkColor: '#818cf8'
  },
  manual: {
    label: 'Manual',
    icon: 'UserPlus',
    tooltip: 'Manually created by user',
    lightColor: '#8b5cf6',
    darkColor: '#a78bfa'
  },
  import: {
    label: 'Import',
    icon: 'Upload',
    tooltip: 'Imported from CSV/external source',
    lightColor: '#06b6d4',
    darkColor: '#22d3ee'
  }
};

const SIZE_CONFIG = {
  sm: {
    fontSize: '0.75rem',
    iconSize: 12,
    gap: '4px'
  },
  md: {
    fontSize: '0.875rem',
    iconSize: 14,
    gap: '6px'
  },
  lg: {
    fontSize: '1rem',
    iconSize: 16,
    gap: '8px'
  }
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const { theme } = useTheme();
  const config = SOURCE_CONFIG[source];
  const sizeConfig = SIZE_CONFIG[size];

  const Icon = Icons[config.icon] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

  const color = theme === 'light' ? config.lightColor : config.darkColor;

  return (
    <span
      className={`inline-flex items-center font-medium ${className}`}
      style={{
        color,
        fontSize: sizeConfig.fontSize,
        gap: sizeConfig.gap
      }}
      title={config.tooltip}
      role="img"
      aria-label={config.tooltip}
    >
      <Icon style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

export default SourceBadge;
