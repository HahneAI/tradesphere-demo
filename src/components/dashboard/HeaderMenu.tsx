/**
 * Header Menu Component
 *
 * Comprehensive navigation menu matching original MobileHamburgerMenu
 * Includes CRM navigation, databases, calculator, and miscellaneous features
 *
 * @module HeaderMenu
 */

import React, { useRef, useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { hapticFeedback } from '../../utils/mobile-gestures';
import { User } from '../../context/AuthContext';

const DynamicIcon = ({ name, ...props }: { name: string } & any) => {
  const IconComponent = Icons[name as keyof typeof Icons] || Icons.User;
  return <IconComponent {...props} />;
};

interface HeaderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // CRM Navigation
  onNavigate: (tab: 'jobs' | 'schedule' | 'crews' | 'customers' | 'billing') => void;
  // Additional Features
  onServicesClick: () => void;
  onMaterialsClick: () => void;
  onQuickCalculatorClick: () => void;
  onAvatarClick: () => void;
  onNotesClick: () => void;
  onFeedbackClick: () => void;
  onSignOut: () => void;
  // Context
  visualConfig: any;
  theme: any;
  user: User | null;
}

/**
 * Header Menu
 * Comprehensive navigation with collapsible sections
 */
export const HeaderMenu: React.FC<HeaderMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onServicesClick,
  onMaterialsClick,
  onQuickCalculatorClick,
  onAvatarClick,
  onNotesClick,
  onFeedbackClick,
  onSignOut,
  visualConfig,
  theme,
  user
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<{
    databases: boolean;
    miscellaneous: boolean;
  }>({
    databases: false,
    miscellaneous: false,
  });

  const toggleSection = (section: 'databases' | 'miscellaneous') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-overlay-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Container */}
      <div
        ref={menuRef}
        className="fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out animate-slide-in-left"
        style={{
          width: '80vw',
          maxWidth: '320px',
          backgroundColor: visualConfig.colors.surface,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        role="menu"
        aria-orientation="vertical"
      >
        {/* Menu Header - User Profile */}
        <div
          className="p-4 border-b"
          style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-full"
              style={{
                backgroundColor: visualConfig.colors.primary,
                color: visualConfig.colors.text.onPrimary,
              }}
            >
              <DynamicIcon name={user?.user_icon || 'User'} className="h-6 w-6" />
            </div>
            <div>
              <p
                className="font-semibold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {user?.name || user?.full_name || 'User'}
              </p>
              <p
                className="text-xs"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                {user?.title || 'Team Member'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* CRM Navigation - Jobs */}
          <button
            onClick={() => {
              hapticFeedback.selection();
              onNavigate('jobs');
              onClose();
            }}
            className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
            style={{
              color: visualConfig.colors.text.primary,
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.Briefcase className="h-6 w-6" style={{ color: visualConfig.colors.primary }} />
            <span className="font-medium">Jobs</span>
          </button>

          {/* CRM Navigation - Schedule */}
          <button
            onClick={() => {
              hapticFeedback.selection();
              onNavigate('schedule');
              onClose();
            }}
            className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
            style={{
              color: visualConfig.colors.text.primary,
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.Calendar className="h-6 w-6" style={{ color: '#8B5CF6' }} />
            <span className="font-medium">Schedule</span>
          </button>

          {/* CRM Navigation - Crews */}
          <button
            onClick={() => {
              hapticFeedback.selection();
              onNavigate('crews');
              onClose();
            }}
            className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
            style={{
              color: visualConfig.colors.text.primary,
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.Users className="h-6 w-6" style={{ color: '#F59E0B' }} />
            <span className="font-medium">Crews</span>
          </button>

          {/* Databases Section - Collapsible */}
          <div>
            <button
              onClick={() => toggleSection('databases')}
              className="w-full flex items-center justify-between px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
              style={{
                color: visualConfig.colors.text.primary,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-4">
                <Icons.Database className="h-6 w-6" />
                <span className="font-semibold">Databases</span>
              </div>
              <Icons.ChevronDown
                className={`h-5 w-5 transition-transform duration-300 ${expandedSections.databases ? 'rotate-180' : ''}`}
                style={{ color: visualConfig.colors.text.secondary }}
              />
            </button>
            {expandedSections.databases && (
              <div className="mt-1 space-y-2">
                <button
                  onClick={() => {
                    hapticFeedback.selection();
                    onServicesClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Icons.Settings className="h-5 w-5" />
                  <span className="font-medium">Services Configuration</span>
                </button>
                <button
                  onClick={() => {
                    hapticFeedback.selection();
                    onMaterialsClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Icons.Package className="h-5 w-5" />
                  <span className="font-medium">Materials Management</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Calculator - Top Level */}
          <button
            onClick={() => {
              hapticFeedback.selection();
              onQuickCalculatorClick();
              onClose();
            }}
            className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
            style={{
              color: visualConfig.colors.text.primary,
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.Calculator className="h-6 w-6" />
            <span className="font-medium">Quick Calculator</span>
          </button>

          {/* Customers - Top Level */}
          <button
            onClick={() => {
              hapticFeedback.selection();
              onNavigate('customers');
              onClose();
            }}
            className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
            style={{
              color: visualConfig.colors.text.primary,
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.User className="h-6 w-6" style={{ color: '#10B981' }} />
            <span className="font-medium">Customers</span>
          </button>

          {/* Billing - Top Level (Owner Only) */}
          {user?.is_owner && (
            <button
              onClick={() => {
                hapticFeedback.selection();
                onNavigate('billing');
                onClose();
              }}
              className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
              style={{
                color: visualConfig.colors.text.primary,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Icons.CreditCard className="h-6 w-6" />
              <span className="font-medium">Billing & Subscription</span>
            </button>
          )}

          {/* Miscellaneous Section - Collapsible */}
          <div>
            <button
              onClick={() => toggleSection('miscellaneous')}
              className="w-full flex items-center justify-between px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
              style={{
                color: visualConfig.colors.text.primary,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-4">
                <Icons.Settings className="h-6 w-6" />
                <span className="font-semibold">Miscellaneous</span>
              </div>
              <Icons.ChevronDown
                className={`h-5 w-5 transition-transform duration-300 ${expandedSections.miscellaneous ? 'rotate-180' : ''}`}
                style={{ color: visualConfig.colors.text.secondary }}
              />
            </button>
            {expandedSections.miscellaneous && (
              <div className="mt-1 space-y-2">
                <button
                  onClick={() => {
                    hapticFeedback.selection();
                    onAvatarClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <DynamicIcon name={user?.user_icon || 'User'} className="h-5 w-5" />
                  <span className="font-medium">Change Profile Icon</span>
                </button>
                <button
                  onClick={() => {
                    hapticFeedback.selection();
                    onNotesClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Icons.StickyNote className="h-5 w-5" />
                  <span className="font-medium">Your Notes from Us</span>
                </button>
                <button
                  onClick={() => {
                    hapticFeedback.selection();
                    onFeedbackClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Icons.MessageSquareQuote className="h-5 w-5" />
                  <span className="font-medium">Send Feedback</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Footer Actions - Logout */}
        <div
          className="p-4 border-t"
          style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
        >
          <button
            onClick={() => {
              hapticFeedback.impact('medium');
              onSignOut();
            }}
            className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 text-red-600 active:scale-95"
            style={{
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === 'light' ? '#fee2e2' : 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.LogOut className="h-6 w-6" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default HeaderMenu;
