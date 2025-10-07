import React, { useEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../../config/industry';
import { PaverPatioManager } from '../../../components/services/PaverPatioManager';
import { PaverPatioReadOnly } from '../../../components/services/PaverPatioReadOnly';
import { usePaverPatioStore } from '../../core/stores/paver-patio-store';
import { SERVICE_REGISTRY, ServiceId } from '../../config/service-registry';
import { masterPricingEngine } from '../../core/calculations/master-pricing-engine';

interface QuickCalculatorTabProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCalculatorTab: React.FC<QuickCalculatorTabProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const [selectedService, setSelectedService] = useState<ServiceId>('paver_patio_sqft');
  const store = usePaverPatioStore(user?.company_id || '');
  const hasReset = useRef(false);

  // Reset to defaults when opening (prevent infinite loop by using useRef)
  useEffect(() => {
    if (isOpen && !hasReset.current && store.resetToDefaults100) {
      store.resetToDefaults100();
      hasReset.current = true;
    }

    if (!isOpen) {
      hasReset.current = false; // Reset flag when closing
    }
  }, [isOpen]); // Remove store.resetToDefaults100 from deps to prevent loop

  // REAL-TIME SUBSCRIPTION MANAGEMENT - Lifecycle tied to modal open/close
  useEffect(() => {
    // Only run when modal is actually open AND user is authenticated
    if (!isOpen || !user?.company_id) {
      return;
    }

    console.log('🚀 [QUICK CALCULATOR] Modal opened - setting up real-time subscription');
    console.log('👤 [QUICK CALCULATOR] User:', user.email, 'Company:', user.company_id);

    // IMMEDIATE: Reload config to show latest data
    store.reloadConfig();

    // REAL-TIME: Set up subscription for live updates
    console.log('📡 [QUICK CALCULATOR] Creating real-time subscription...');
    const unsubscribe = masterPricingEngine.subscribeToConfigChanges(
      'paver_patio_sqft',
      user.company_id,
      (newConfig) => {
        console.log('🎯🎯🎯 [QUICK CALCULATOR] ========== REAL-TIME UPDATE RECEIVED ==========');
        console.log('🔄 [QUICK CALCULATOR] Updating store with new config from real-time subscription');
        store.setConfig(newConfig);
      }
    );

    console.log('✅ [QUICK CALCULATOR] Subscription created successfully');

    // CLEANUP: Runs when isOpen becomes false (IRONCLAD)
    // Guaranteed to run when modal closes, no matter how it's closed
    return () => {
      console.log('🔌 [QUICK CALCULATOR] Modal closed - cleaning up subscription');
      unsubscribe();
    };
  }, [isOpen, user?.company_id, store]);

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
          className="w-full max-w-6xl h-[90vh] bg-white rounded-lg shadow-xl animate-scale-in flex flex-col"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0"
               style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                Quick Calculator
              </h2>
              {/* Service Selector */}
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value as ServiceId)}
                className="px-4 py-2 rounded-lg border transition-colors"
                style={{
                  backgroundColor: visualConfig.colors.surface,
                  color: visualConfig.colors.text.primary,
                  borderColor: theme === 'light' ? '#e5e7eb' : '#374151'
                }}
              >
                {Object.entries(SERVICE_REGISTRY).map(([key, service]) => (
                  <option key={key} value={key}>
                    {service.displayName}
                  </option>
                ))}
              </select>
            </div>
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
              {selectedService === 'paver_patio_sqft' ? (
                <PaverPatioManager
                  visualConfig={visualConfig}
                  theme={theme}
                  store={store}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Icons.Construction className="h-16 w-16" style={{ color: visualConfig.colors.text.secondary }} />
                  <p className="text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
                    {SERVICE_REGISTRY[selectedService].displayName}
                  </p>
                  <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Calculator interface coming soon
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickCalculatorTab;