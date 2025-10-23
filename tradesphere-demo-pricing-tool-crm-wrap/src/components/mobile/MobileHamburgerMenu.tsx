import React from 'react';
import * as Icons from 'lucide-react';
import { SmartVisualTheme } from '../../config/industry';
import { User } from '../../context/AuthContext';

const DynamicIcon = ({ name, ...props }: { name: string } & any) => {
  const IconComponent = Icons[name as keyof typeof Icons] || Icons.User;
  return <IconComponent {...props} />;
};

interface MobileHamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick: () => void;
  onFeedbackClick: () => void;
  onNotesClick: () => void;
  onAvatarClick: () => void;
  onCustomersClick: () => void;
  onServicesClick: () => void;
  onMaterialsClick: () => void;
  onBillingClick: () => void;
  onQuickCalculatorClick: () => void;
  visualConfig: SmartVisualTheme;
  theme: 'light' | 'dark';
  user: User | null;
}

export const MobileHamburgerMenu: React.FC<MobileHamburgerMenuProps> = ({
  isOpen,
  onClose,
  onLogoutClick,
  onFeedbackClick,
  onNotesClick,
  onCustomersClick,
  onServicesClick,
  onMaterialsClick,
  onBillingClick,
  onQuickCalculatorClick,
  visualConfig,
  onAvatarClick,
  theme,
  user,
}) => {
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = React.useState<{
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

  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-overlay-fade-in"
        onClick={onClose}
      ></div>

      {/* Menu Container */}
      <div
        className={`fixed top-0 left-0 h-full bg-white z-50 flex flex-col transition-transform duration-300 ease-in-out animate-slide-in-left`}
        style={{
          width: '80vw',
          maxWidth: '300px',
          backgroundColor: visualConfig.colors.surface,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Menu Header */}
        <div
          className="p-4 border-b"
          style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
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
                {user?.name || 'User'}
              </p>
              <p
                className="text-xs"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                {user?.title || 'Technician'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-3">
          {/* Databases Section - Collapsible */}
          <div>
            <button
              onClick={() => toggleSection('databases')}
              className="w-full flex items-center justify-between px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
              style={{
                color: visualConfig.colors.text.primary,
                backgroundColor: 'transparent',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                    onServicesClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Icons.Settings className="h-5 w-5" />
                  <span className="font-medium">Services Configuration</span>
                </button>
                <button
                  onClick={() => {
                    onMaterialsClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
              onQuickCalculatorClick();
              onClose();
            }}
            className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
            style={{
              color: visualConfig.colors.text.primary,
              backgroundColor: 'transparent',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.Calculator className="h-6 w-6" />
            <span className="font-medium">Quick Calculator</span>
          </button>

          {/* Customers - Top Level */}
          <button
            onClick={() => {
              onCustomersClick();
              onClose();
            }}
            className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
            style={{
              color: visualConfig.colors.text.primary,
              backgroundColor: 'transparent',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.Users className="h-6 w-6" />
            <span className="font-medium">Customers</span>
          </button>

          {/* Billing - Top Level (Owner Only) */}
          {user?.is_owner && (
            <button
              onClick={() => {
                onBillingClick();
                onClose();
              }}
              className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
              style={{
                color: visualConfig.colors.text.primary,
                backgroundColor: 'transparent',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                    onAvatarClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <DynamicIcon name={user?.user_icon || 'User'} className="h-5 w-5" />
                  <span className="font-medium">Change Profile Icon</span>
                </button>
                <button
                  onClick={() => {
                    onNotesClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Icons.StickyNote className="h-5 w-5" />
                  <span className="font-medium">Your Notes from Us</span>
                </button>
                <button
                  onClick={() => {
                    onFeedbackClick();
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 pl-12 pr-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 active:scale-95"
                  style={{
                    color: visualConfig.colors.text.primary,
                    backgroundColor: 'transparent',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Icons.MessageSquareQuote className="h-5 w-5" />
                  <span className="font-medium">Send Feedback</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Footer Actions */}
        <div
          className="p-4 border-t"
          style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
        >
          <button
            onClick={onLogoutClick}
            className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg text-left transition-all duration-200 text-red-600 hover:bg-red-50 active:scale-95"
            style={{
                backgroundColor: 'transparent',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = theme === 'light' ? '#fee2e2' : 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.LogOut className="h-6 w-6" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};
