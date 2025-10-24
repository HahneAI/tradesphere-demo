/**
 * Header Menu Component
 *
 * Dropdown menu that appears when hamburger button is clicked
 * Provides navigation to main sections and Sign Out option
 *
 * @module HeaderMenu
 */

import React, { useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface HeaderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: 'jobs' | 'schedule' | 'crews' | 'customers' | 'billing') => void;
  onSignOut: () => void;
  visualConfig: any;
  theme: any;
}

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Icons;
  action: 'navigate' | 'signout';
  tab?: 'jobs' | 'schedule' | 'crews' | 'customers' | 'billing';
  color?: string;
}

/**
 * Header Menu
 * Navigation dropdown for hamburger menu
 */
export const HeaderMenu: React.FC<HeaderMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSignOut,
  visualConfig,
  theme
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Menu items configuration
   */
  const menuItems: MenuItem[] = [
    {
      id: 'jobs',
      label: 'Jobs',
      icon: 'Briefcase',
      action: 'navigate',
      tab: 'jobs',
      color: visualConfig.colors.primary
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: 'Calendar',
      action: 'navigate',
      tab: 'schedule',
      color: '#8B5CF6'
    },
    {
      id: 'crews',
      label: 'Crews',
      icon: 'Users',
      action: 'navigate',
      tab: 'crews',
      color: '#F59E0B'
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: 'User',
      action: 'navigate',
      tab: 'customers',
      color: '#10B981'
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: 'CreditCard',
      action: 'navigate',
      tab: 'billing',
      color: '#6366F1'
    },
    {
      id: 'signout',
      label: 'Sign Out',
      icon: 'LogOut',
      action: 'signout',
      color: '#EF4444'
    }
  ];

  /**
   * Handle menu item click
   */
  const handleItemClick = (item: MenuItem) => {
    hapticFeedback.selection();

    if (item.action === 'navigate' && item.tab) {
      onNavigate(item.tab);
    } else if (item.action === 'signout') {
      onSignOut();
    }

    onClose();
  };

  /**
   * Handle click outside to close menu
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add slight delay to prevent immediate close from hamburger button click
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  /**
   * Handle keyboard events
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div
        ref={menuRef}
        className="fixed top-16 left-4 z-50 w-64 rounded-lg shadow-xl border animate-in fade-in slide-in-from-top-2 duration-200"
        style={{
          backgroundColor: visualConfig.colors.surface,
          borderColor: visualConfig.colors.text.secondary + '20'
        }}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="menu-button"
      >
        <div className="py-2">
          {menuItems.map((item, index) => {
            const IconComponent = Icons[item.icon] as React.ComponentType<any>;
            const isSignOut = item.action === 'signout';

            return (
              <React.Fragment key={item.id}>
                {/* Divider before Sign Out */}
                {isSignOut && (
                  <div
                    className="my-2 border-t"
                    style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
                  />
                )}

                <button
                  onClick={() => handleItemClick(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-opacity-50 active:scale-98"
                  style={{
                    color: isSignOut ? item.color : visualConfig.colors.text.primary,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${visualConfig.colors.primary}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(item);
                    }
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${item.color}20`,
                    }}
                  >
                    <IconComponent
                      className="h-4 w-4"
                      style={{ color: item.color }}
                    />
                  </div>

                  {/* Label */}
                  <span className="font-medium text-sm">
                    {item.label}
                  </span>

                  {/* Arrow indicator */}
                  {!isSignOut && (
                    <Icons.ChevronRight
                      className="h-4 w-4 ml-auto opacity-40"
                      style={{ color: visualConfig.colors.text.secondary }}
                    />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default HeaderMenu;
