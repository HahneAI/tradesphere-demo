/**
 * Quick Actions Panel Component
 *
 * Primary navigation buttons for quick access to key features
 * Displays 4 main actions: New Job, View Schedule, Manage Crews, View Customers
 *
 * @module QuickActionsPanel
 */

import React, { useCallback } from 'react';
import * as Icons from 'lucide-react';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface QuickActionsPanelProps {
  onNavigate: (tab: 'jobs' | 'schedule' | 'crews' | 'customers' | 'billing') => void;
  visualConfig: any;
  theme: any;
}

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Icons;
  tab: 'jobs' | 'schedule' | 'crews' | 'customers' | 'billing';
  color: string;
  description: string;
}

/**
 * Quick Actions Panel
 * Navigation shortcuts for primary features
 */
export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  onNavigate,
  visualConfig,
  theme
}) => {
  /**
   * Quick action definitions
   */
  const quickActions: QuickAction[] = [
    {
      id: 'new_job',
      label: 'New Job',
      icon: 'Plus',
      tab: 'jobs',
      color: visualConfig.colors.primary,
      description: 'Create a new job or quote'
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: 'Calendar',
      tab: 'schedule',
      color: '#8B5CF6',
      description: 'View and manage schedule'
    },
    {
      id: 'crews',
      label: 'Crews',
      icon: 'Users',
      tab: 'crews',
      color: '#F59E0B',
      description: 'Manage crews and assignments'
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: 'User',
      tab: 'customers',
      color: '#10B981',
      description: 'View customer profiles'
    }
  ];

  /**
   * Handle action click
   */
  const handleActionClick = useCallback((action: QuickAction) => {
    hapticFeedback.impact('medium');
    onNavigate(action.tab);
  }, [onNavigate]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {quickActions.map((action) => {
        const IconComponent = Icons[action.icon] as React.ComponentType<any>;

        return (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className="group relative p-4 md:p-6 rounded-xl transition-all duration-300 text-left overflow-hidden hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus-visible:outline-none"
            style={{
              backgroundColor: visualConfig.colors.surface,
              boxShadow: theme === 'light'
                ? '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)'
                : '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
            }}
            aria-label={`${action.label}: ${action.description}. Press to open.`}
          >
            {/* Gradient border effect on hover */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${visualConfig.colors.primary}40, ${visualConfig.colors.primary}20)`,
                padding: '1px',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />

            {/* Subtle gradient background on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${visualConfig.colors.primary}05, transparent)`,
              }}
            />

            {/* Focus ring */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-focus-visible:opacity-100 transition-opacity pointer-events-none"
              style={{
                boxShadow: `0 0 0 3px ${visualConfig.colors.primary}30`,
              }}
            />

            {/* Content wrapper with relative positioning */}
            <div className="relative z-10">
              {/* Icon container with enhanced treatment */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: action.color + '20',
                  border: `1.5px solid ${action.color}30`,
                }}
              >
                <IconComponent
                  className="h-6 w-6 transition-transform duration-300"
                  style={{ color: action.color }}
                />
              </div>

              {/* Label */}
              <h3
                className="font-semibold text-base mb-1"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {action.label}
              </h3>

              {/* Description */}
              <p
                className="text-xs mb-3"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                {action.description}
              </p>

              {/* Action indicator - appears on hover */}
              <div className="flex items-center gap-1 text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                <span style={{ color: visualConfig.colors.primary }}>Open</span>
                <Icons.ArrowRight className="h-3 w-3" style={{ color: visualConfig.colors.primary }} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActionsPanel;
