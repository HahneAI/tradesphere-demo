import React, { useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../../config/industry';
import { PaverPatioManager } from '../../../components/services/PaverPatioManager';
import { PaverPatioReadOnly } from '../../../components/services/PaverPatioReadOnly';
import { usePaverPatioStore } from '../../core/stores/paver-patio-store';

interface QuickCalculatorTabProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCalculatorTab: React.FC<QuickCalculatorTabProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const store = usePaverPatioStore(user?.company_id || '');

  // Reset to defaults every time the Quick Calculator opens or closes
  useEffect(() => {
    if (store.resetToDefaults100) {
      if (isOpen) {
        // Reset when opening
        store.resetToDefaults100();
      } else {
        // Also reset when closing to ensure clean state for next open
        store.resetToDefaults100();
      }
    }
  }, [isOpen, store.resetToDefaults100]);

  if (!isOpen) return null;

  // Guard: Don't render calculator without company_id
  if (!user?.company_id) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-gray-800">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-overlay-fade-in"
        onClick={() => {
          // Reset to defaults when closing via overlay click
          if (store.resetToDefaults100) {
            store.resetToDefaults100();
          }
          onClose();
        }}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => {
          // Reset to defaults when closing via background click
          if (store.resetToDefaults100) {
            store.resetToDefaults100();
          }
          onClose();
        }}
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
              Quick Calculator
            </h2>
            <button
              onClick={() => {
                // Reset to defaults when closing via X button
                if (store.resetToDefaults100) {
                  store.resetToDefaults100();
                }
                onClose();
              }}
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
              {/* Render Variable Editor Interface - Available to All Users */}
              <PaverPatioManager
                visualConfig={visualConfig}
                theme={theme}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickCalculatorTab;