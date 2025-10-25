/**
 * Empty State Component
 *
 * Displays friendly message when no jobs exist
 * Includes call-to-action button for creating first job
 *
 * @module EmptyState
 */

import React from 'react';
import { Briefcase, FileText, Calendar, Users } from 'lucide-react';

interface EmptyStateProps {
  variant?: 'no_jobs' | 'no_results' | 'no_schedule' | 'no_crews';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  visualConfig?: any; // From theme context
}

/**
 * Empty State Component
 * Shows when no data is available
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'no_jobs',
  title,
  description,
  actionLabel,
  onAction,
  visualConfig
}) => {
  // Default content based on variant
  const variants = {
    no_jobs: {
      icon: Briefcase,
      title: 'No Jobs Yet',
      description: 'Start by creating your first job. You can add customers, services, and schedule crews.',
      actionLabel: 'Create First Job',
      iconColor: '#3B82F6'
    },
    no_results: {
      icon: FileText,
      title: 'No Results Found',
      description: 'Try adjusting your search or filters to find what you\'re looking for.',
      actionLabel: 'Clear Filters',
      iconColor: '#94A3B8'
    },
    no_schedule: {
      icon: Calendar,
      title: 'No Scheduled Jobs',
      description: 'Schedule jobs to see them on the calendar. Assign crews and set start/end dates.',
      actionLabel: 'View All Jobs',
      iconColor: '#8B5CF6'
    },
    no_crews: {
      icon: Users,
      title: 'No Crews Available',
      description: 'Create crews to assign them to jobs and manage your team\'s schedule.',
      actionLabel: 'Create First Crew',
      iconColor: '#10B981'
    }
  };

  const config = variants[variant];
  const IconComponent = config.icon;

  // Use theme colors if available
  const backgroundColor = visualConfig?.colors.surface || '#FFFFFF';
  const textPrimary = visualConfig?.colors.text.primary || '#1F2937';
  const textSecondary = visualConfig?.colors.text.secondary || '#6B7280';
  const primaryColor = visualConfig?.colors.primary || config.iconColor;

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 rounded-lg border-2 border-dashed"
      style={{
        backgroundColor,
        borderColor: `${textSecondary}30`
      }}
    >
      {/* Icon */}
      <div
        className="mb-6 p-4 rounded-full"
        style={{
          backgroundColor: `${config.iconColor}20`
        }}
      >
        <IconComponent
          size={48}
          style={{ color: config.iconColor }}
          strokeWidth={1.5}
        />
      </div>

      {/* Title */}
      <h3
        className="text-xl font-bold mb-2 text-center"
        style={{ color: textPrimary }}
      >
        {title || config.title}
      </h3>

      {/* Description */}
      <p
        className="text-center max-w-md mb-6"
        style={{ color: textSecondary }}
      >
        {description || config.description}
      </p>

      {/* Action Button */}
      {onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-lg transform hover:-translate-y-0.5"
          style={{
            backgroundColor: primaryColor,
            color: '#FFFFFF'
          }}
        >
          {actionLabel || config.actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
