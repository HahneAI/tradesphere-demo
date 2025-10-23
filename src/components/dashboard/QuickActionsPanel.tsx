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
            className="p-6 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 text-left"
            style={{
              backgroundColor: visualConfig.colors.surface,
              border: `1px solid ${visualConfig.colors.text.secondary}20`
            }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{
                backgroundColor: action.color + '20'
              }}
            >
              <IconComponent
                className="h-6 w-6"
                style={{ color: action.color }}
              />
            </div>

            <h3
              className="font-semibold text-base mb-1"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {action.label}
            </h3>

            <p
              className="text-xs"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              {action.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActionsPanel;
