import React, { useEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../../config/industry';
import { PaverPatioManager } from '../../../components/services/PaverPatioManager';
import { PaverPatioReadOnly } from '../../../components/services/PaverPatioReadOnly';
import { ExcavationManager } from '../../../components/services/ExcavationManager';
import { usePaverPatioStore } from '../../core/stores/paver-patio-store';
import { useExcavationStore } from '../../core/stores/excavation-store';
import { SERVICE_REGISTRY, ServiceId } from '../../config/service-registry';
import { masterPricingEngine } from '../../core/calculations/master-pricing-engine';
import { ServiceSelectionScreen } from './ServiceSelectionScreen';

interface QuickCalculatorTabProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCalculatorTab: React.FC<QuickCalculatorTabProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const [selectedService, setSelectedService] = useState<ServiceId | null>(null);
  const [showSelectionScreen, setShowSelectionScreen] = useState(true);
  const paverPatioStore = usePaverPatioStore(user?.company_id || '');
  const excavationStore = useExcavationStore(user?.company_id || '');

  // Transition state management
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [transitionType, setTransitionType] = useState<'zoom-in' | 'slide-back' | 'screen-switch' | null>(null);

  // Reset to selection screen when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowSelectionScreen(true);
      setSelectedService(null);
      setTransitionState('idle');
      setTransitionType(null);
    }
  }, [isOpen]);

  // Handle service selection from front menu (ZOOM IN transition)
  const handleServiceSelect = (serviceId: ServiceId) => {
    setTransitionType('zoom-in');
    setTransitionState('exiting');

    setTimeout(() => {
      setSelectedService(serviceId);
      setShowSelectionScreen(false);
      setTransitionState('entering');

      // Force recalculation when service opens to ensure fresh material data
      if (serviceId === 'paver_patio_sqft') {
        setTimeout(() => paverPatioStore.forceRecalculate(), 100);
      }
    }, 300);

    setTimeout(() => {
      setTransitionState('idle');
      setTransitionType(null);
    }, 700);
  };

  // Handle back to selection screen (SLIDE BACK transition)
  const handleBackToSelection = () => {
    setTransitionType('slide-back');
    setTransitionState('exiting');

    setTimeout(() => {
      setShowSelectionScreen(true);
      setSelectedService(null);
      setTransitionState('entering');
    }, 350);

    setTimeout(() => {
      setTransitionState('idle');
      setTransitionType(null);
    }, 750);
  };

  // Handle service-to-service switch via dropdown (SCREEN SWITCH transition)
  const handleServiceSwitch = (newServiceId: ServiceId) => {
    if (newServiceId === selectedService) return;

    setTransitionType('screen-switch');
    setTransitionState('exiting');

    setTimeout(() => {
      setSelectedService(newServiceId);
      setTransitionState('entering');

      // Force recalculation when switching to service to ensure fresh material data
      if (newServiceId === 'paver_patio_sqft') {
        setTimeout(() => paverPatioStore.forceRecalculate(), 100);
      }
    }, 200);

    setTimeout(() => {
      setTransitionState('idle');
      setTransitionType(null);
    }, 450);
  };

  // Get transition CSS class based on current state
  const getTransitionClass = () => {
    if (transitionState === 'idle') return '';

    switch (transitionType) {
      case 'zoom-in':
        return transitionState === 'exiting'
          ? 'animate-zoom-out-selection'
          : 'animate-zoom-in-service';

      case 'slide-back':
        return transitionState === 'exiting'
          ? 'animate-slide-back-exit'
          : 'animate-slide-back-enter';

      case 'screen-switch':
        return transitionState === 'exiting'
          ? 'animate-screen-switch-exit'
          : 'animate-screen-switch-enter';

      default:
        return '';
    }
  };

  // REAL-TIME SUBSCRIPTION MANAGEMENT - Lifecycle tied to modal open/close
  useEffect(() => {
    // Only run when modal is actually open AND user is authenticated AND service is selected
    if (!isOpen || !user?.company_id || !selectedService) {
      return;
    }

    console.log('🚀 [QUICK CALCULATOR] Modal opened - setting up real-time subscription');
    console.log('👤 [QUICK CALCULATOR] User:', user.email, 'Company:', user.company_id);
    console.log('🔧 [QUICK CALCULATOR] Selected service:', selectedService);

    // Handle paver patio service
    if (selectedService === 'paver_patio_sqft') {
      // IMMEDIATE: Reload config to show latest data
      paverPatioStore.reloadConfig();

      // REAL-TIME: Set up subscription for live updates
      console.log('📡 [QUICK CALCULATOR] Creating paver patio real-time subscription...');
      const unsubscribe = masterPricingEngine.subscribeToConfigChanges(
        'paver_patio_sqft',
        user.company_id,
        (newConfig) => {
          console.log('🎯🎯🎯 [QUICK CALCULATOR] ========== PAVER PATIO REAL-TIME UPDATE ==========');
          console.log('🔄 [QUICK CALCULATOR] Updating paver patio store');
          paverPatioStore.setConfig(newConfig);
        }
      );

      console.log('✅ [QUICK CALCULATOR] Paver patio subscription created');

      return () => {
        console.log('🔌 [QUICK CALCULATOR] Cleaning up paver patio subscription');
        unsubscribe();
      };
    }

    // Handle excavation service
    if (selectedService === 'excavation_removal') {
      // IMMEDIATE: Reload config to show latest data
      excavationStore.reloadConfig();

      // REAL-TIME: Set up subscription for live updates
      console.log('📡 [QUICK CALCULATOR] Creating excavation real-time subscription...');
      const unsubscribe = masterPricingEngine.subscribeToConfigChanges(
        'excavation_removal',
        user.company_id,
        (newConfig) => {
          console.log('🎯🎯🎯 [QUICK CALCULATOR] ========== EXCAVATION REAL-TIME UPDATE ==========');
          console.log('🔄 [QUICK CALCULATOR] Updating excavation store');
          excavationStore.setConfig(newConfig);
        }
      );

      console.log('✅ [QUICK CALCULATOR] Excavation subscription created');

      return () => {
        console.log('🔌 [QUICK CALCULATOR] Cleaning up excavation subscription');
        unsubscribe();
      };
    }
  }, [isOpen, user?.company_id, selectedService]); // React to service changes

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
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-6xl h-[90vh] bg-white rounded-lg shadow-xl animate-scale-in flex flex-col"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 border-b flex-shrink-0 gap-3 md:gap-0"
               style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              {/* Back Button (only show when on a specific service) */}
              {!showSelectionScreen && (
                <button
                  onClick={handleBackToSelection}
                  className="p-1 rounded-lg hover:bg-opacity-20 transition-colors flex-shrink-0"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  <Icons.ArrowLeft className="h-5 w-5" />
                </button>
              )}

              <h2 className="text-lg md:text-xl font-semibold flex-shrink-0" style={{ color: visualConfig.colors.text.primary }}>
                Quick Calculator
              </h2>

              {/* Service Selector (only show when NOT on selection screen) */}
              {!showSelectionScreen && selectedService && (
                <select
                  value={selectedService}
                  onChange={(e) => handleServiceSwitch(e.target.value as ServiceId)}
                  className="px-3 md:px-4 py-2 rounded-lg border transition-colors text-sm md:text-base min-w-0 flex-1 md:flex-initial max-w-xs md:max-w-none truncate"
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
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-opacity-20 transition-colors absolute top-4 right-4 md:relative md:top-auto md:right-auto"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Main Content Area with Transitions */}
            <div className={`flex-1 overflow-y-auto ${getTransitionClass()}`}>
              {/* Show Selection Screen OR Service-Specific Interface */}
              {showSelectionScreen ? (
                <ServiceSelectionScreen
                  onSelectService={handleServiceSelect}
                  visualConfig={visualConfig}
                  theme={theme}
                />
              ) : (
                <div className="p-6">
                  {/* Render Service-Specific Interface */}
                  {selectedService === 'paver_patio_sqft' && (
                    <PaverPatioManager
                      visualConfig={visualConfig}
                      theme={theme}
                      store={paverPatioStore}
                    />
                  )}
                  {selectedService === 'excavation_removal' && (
                    <ExcavationManager
                      visualConfig={visualConfig}
                      theme={theme}
                      store={excavationStore}
                    />
                  )}
                  {selectedService !== 'paver_patio_sqft' && selectedService !== 'excavation_removal' && selectedService && (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickCalculatorTab;