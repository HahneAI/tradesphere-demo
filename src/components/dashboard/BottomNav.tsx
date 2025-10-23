/**
 * Bottom Navigation Component
 *
 * Mobile bottom navigation bar for quick tab switching
 * Fixed to bottom of screen on mobile devices
 *
 * @module BottomNav
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface BottomNavProps {
  currentTab: 'dashboard' | 'jobs' | 'schedule' | 'crews' | 'customers';
  onNavigate: (tab: 'jobs' | 'schedule' | 'crews' | 'customers' | 'billing') => void;
  visualConfig: any;
  theme: any;
}

interface NavItem {
  id: 'dashboard' | 'jobs' | 'schedule' | 'crews' | 'customers';
  label: string;
  icon: keyof typeof Icons;
}

/**
 * Bottom Navigation
 * Mobile navigation bar
 */
export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onNavigate,
  visualConfig,
  theme
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Home', icon: 'Home' },
    { id: 'jobs', label: 'Jobs', icon: 'Briefcase' },
    { id: 'schedule', label: 'Schedule', icon: 'Calendar' },
    { id: 'crews', label: 'Crews', icon: 'Users' },
    { id: 'customers', label: 'Customers', icon: 'User' }
  ];

  /**
   * Handle navigation
   */
  const handleNavClick = (itemId: NavItem['id']) => {
    hapticFeedback.selection();

    // Dashboard is handled by parent (closes other tabs)
    if (itemId === 'dashboard') {
      // Close all tabs - parent will show dashboard
      return;
    }

    onNavigate(itemId as any);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t safe-area-bottom"
      style={{
        backgroundColor: visualConfig.colors.surface,
        borderColor: visualConfig.colors.text.secondary + '20',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const IconComponent = Icons[item.icon] as React.ComponentType<any>;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 active:scale-95 min-w-0 flex-1"
              style={{
                backgroundColor: isActive
                  ? visualConfig.colors.primary + '20'
                  : 'transparent',
                color: isActive
                  ? visualConfig.colors.primary
                  : visualConfig.colors.text.secondary
              }}
            >
              <IconComponent className="h-5 w-5 flex-shrink-0" />
              <span className="text-xs font-medium truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
