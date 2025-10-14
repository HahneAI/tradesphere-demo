/**
 * LifecycleBadge Component
 *
 * Displays customer lifecycle stage with color-coded badge.
 * Supports prospect, lead, customer, and churned stages.
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type LifecycleStage = 'prospect' | 'lead' | 'customer' | 'churned';

export interface LifecycleBadgeProps {
  stage: LifecycleStage;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const LIFECYCLE_CONFIG: Record<LifecycleStage, {
  label: string;
  icon: keyof typeof Icons;
  lightBg: string;
  lightText: string;
  darkBg: string;
  darkText: string;
}> = {
  prospect: {
    label: 'Prospect',
    icon: 'Eye',
    lightBg: '#dbeafe',
    lightText: '#1e40af',
    darkBg: '#1e3a8a',
    darkText: '#bfdbfe'
  },
  lead: {
    label: 'Lead',
    icon: 'TrendingUp',
    lightBg: '#fef3c7',
    lightText: '#92400e',
    darkBg: '#78350f',
    darkText: '#fde68a'
  },
  customer: {
    label: 'Customer',
    icon: 'CheckCircle',
    lightBg: '#d1fae5',
    lightText: '#065f46',
    darkBg: '#064e3b',
    darkText: '#a7f3d0'
  },
  churned: {
    label: 'Churned',
    icon: 'XCircle',
    lightBg: '#fee2e2',
    lightText: '#991b1b',
    darkBg: '#7f1d1d',
    darkText: '#fecaca'
  }
};

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

export const LifecycleBadge: React.FC<LifecycleBadgeProps> = ({
  stage,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const { theme } = useTheme();
  const config = LIFECYCLE_CONFIG[stage];
  const sizeConfig = SIZE_CONFIG[size];

  const Icon = Icons[config.icon] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

  const backgroundColor = theme === 'light' ? config.lightBg : config.darkBg;
  const textColor = theme === 'light' ? config.lightText : config.darkText;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${className}`}
      style={{
        backgroundColor,
        color: textColor,
        fontSize: sizeConfig.fontSize,
        padding: sizeConfig.padding,
        gap: sizeConfig.gap
      }}
      role="status"
      aria-label={`Lifecycle stage: ${config.label}`}
    >
      {showIcon && <Icon style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }} />}
      <span>{config.label}</span>
    </span>
  );
};

export default LifecycleBadge;
