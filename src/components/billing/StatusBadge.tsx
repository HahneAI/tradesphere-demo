/**
 * StatusBadge Component
 *
 * Reusable status badge for displaying subscription, payment, and verification status
 * with color-coded styling for quick visual recognition.
 */

import React from 'react';

interface StatusBadgeProps {
  /** Status text to display */
  status: string;
  /** Color theme (green, blue, yellow, red, gray) */
  color: string;
  /** Theme mode (light/dark) */
  theme: 'light' | 'dark';
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Get theme-aware color styles for badge
 */
const getColorStyles = (color: string, theme: 'light' | 'dark'): { backgroundColor: string; color: string; borderColor: string } => {
  const isDark = theme === 'dark';

  switch (color) {
    case 'green':
      return {
        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgb(220, 252, 231)',
        color: isDark ? '#86efac' : '#15803d',
        borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgb(187, 247, 208)'
      };
    case 'blue':
      return {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgb(219, 234, 254)',
        color: isDark ? '#93c5fd' : '#1e40af',
        borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgb(191, 219, 254)'
      };
    case 'yellow':
      return {
        backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgb(254, 249, 195)',
        color: isDark ? '#fbbf24' : '#a16207',
        borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgb(253, 230, 138)'
      };
    case 'red':
      return {
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgb(254, 226, 226)',
        color: isDark ? '#fca5a5' : '#b91c1c',
        borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgb(254, 202, 202)'
      };
    case 'gray':
    default:
      return {
        backgroundColor: isDark ? 'rgba(107, 114, 128, 0.15)' : 'rgb(243, 244, 246)',
        color: isDark ? '#d1d5db' : '#374151',
        borderColor: isDark ? 'rgba(107, 114, 128, 0.3)' : 'rgb(229, 231, 235)'
      };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, color, theme, className = '' }) => {
  const styles = getColorStyles(color, theme);

  return (
    <span
      className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap border ${className}`}
      style={{
        minHeight: '32px',
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      }}
    >
      {status}
    </span>
  );
};
