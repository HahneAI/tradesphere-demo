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
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Get Tailwind CSS classes for badge color theme
 */
const getColorClasses = (color: string): string => {
  switch (color) {
    case 'green':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'blue':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'red':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'gray':
      return 'bg-gray-100 text-gray-800 border border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, color, className = '' }) => {
  const colorClasses = getColorClasses(color);

  return (
    <span
      className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap ${colorClasses} ${className}`}
      style={{ minHeight: '32px' }}
    >
      {status}
    </span>
  );
};
