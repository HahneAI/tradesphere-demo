import React from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../config/industry';
import { PaverPatioManager } from './services/PaverPatioManager';
import { PaverPatioReadOnly } from './services/PaverPatioReadOnly';

interface ServicesTabProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-overlay-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-xl animate-scale-in flex flex-col"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0"
               style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <h2 className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
              Services Management
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Render Admin or Employee Interface */}
              {user?.is_admin ? (
                <PaverPatioManager 
                  visualConfig={visualConfig}
                  theme={theme}
                />
              ) : (
                <PaverPatioReadOnly 
                  visualConfig={visualConfig}
                  theme={theme}
                  userName={user?.first_name || 'User'}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};