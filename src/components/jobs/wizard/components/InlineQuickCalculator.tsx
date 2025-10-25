/**
 * Inline Quick Calculator Component
 *
 * Embeddable calculator for the Job Creation Wizard's Services Phase.
 * Provides service selection and calculation UI inline without modal overlay.
 * Integrates with existing pricing stores and calculation engine.
 */

import React, { useState, useEffect } from 'react';
import { Calculator, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { usePaverPatioStore } from '../../../../pricing-system/core/stores/paver-patio-store';
import { useExcavationStore } from '../../../../pricing-system/core/stores/excavation-store';
import { PaverPatioManager } from '../../../services/PaverPatioManager';
import { ExcavationManager } from '../../../services/ExcavationManager';
import { ServiceLineItem } from '../../../../hooks/useJobCreationWizard';
import {
  transformPaverPatioToService,
  transformExcavationToService,
} from '../../../../utils/calculatorToServiceTransformer';
import { useTheme } from '../../../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../../../config/industry';

interface InlineQuickCalculatorProps {
  companyId: string;
  userId: string;
  onCommitService: (service: ServiceLineItem) => void;
  availableServices?: string[]; // e.g., ['paver_patio_sqft', 'excavation_removal']
}

type ServiceType = 'paver_patio_sqft' | 'excavation_removal';

const SERVICE_DISPLAY_NAMES: Record<ServiceType, string> = {
  paver_patio_sqft: 'Paver Patio',
  excavation_removal: 'Excavation & Removal',
};

export const InlineQuickCalculator: React.FC<InlineQuickCalculatorProps> = ({
  companyId,
  userId,
  onCommitService,
  availableServices = ['paver_patio_sqft', 'excavation_removal'],
}) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  const [selectedService, setSelectedService] = useState<ServiceType>('paver_patio_sqft');
  const [isExpanded, setIsExpanded] = useState(true);

  // Initialize stores
  const paverPatioStore = usePaverPatioStore(companyId);
  const excavationStore = useExcavationStore(companyId);

  // Get current store based on selected service
  const currentStore = selectedService === 'paver_patio_sqft' ? paverPatioStore : excavationStore;

  // Reload config when service changes
  useEffect(() => {
    if (selectedService === 'paver_patio_sqft') {
      paverPatioStore.reloadConfig();
    } else if (selectedService === 'excavation_removal') {
      excavationStore.reloadConfig();
    }
  }, [selectedService, companyId]);

  // Handle commit to services list
  const handleCommitToJob = () => {
    if (!currentStore.lastCalculation || !currentStore.config) {
      alert('Please calculate pricing before adding to job');
      return;
    }

    let serviceItem: ServiceLineItem;

    if (selectedService === 'paver_patio_sqft') {
      serviceItem = transformPaverPatioToService(
        paverPatioStore.lastCalculation,
        paverPatioStore.config,
        paverPatioStore.sqft,
        paverPatioStore.values
      );
    } else {
      serviceItem = transformExcavationToService(
        excavationStore.lastCalculation,
        excavationStore.config,
        excavationStore.cubicYards || 0,
        excavationStore.values
      );
    }

    onCommitService(serviceItem);

    // Show success feedback
    alert(`${SERVICE_DISPLAY_NAMES[selectedService]} added to services list!`);

    // Optionally reset calculator for next service
    // currentStore.resetToDefaults();
  };

  // Calculate if ready
  const canCalculate =
    selectedService === 'paver_patio_sqft'
      ? paverPatioStore.sqft >= 100
      : (excavationStore.cubicYards || 0) >= 1;

  const hasCalculation = currentStore.lastCalculation !== null;

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header - Always Visible */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 cursor-pointer hover:from-blue-100 hover:to-blue-150 dark:hover:from-blue-800/30 dark:hover:to-blue-700/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Quick Calculator</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Calculate pricing for {SERVICE_DISPLAY_NAMES[selectedService]}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </div>

      {/* Calculator Content - Collapsible */}
      {isExpanded && (
        <div className="p-6 bg-white dark:bg-gray-800">
          {/* Service Selector Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Service Type
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as ServiceType)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              {availableServices.map((service) => (
                <option key={service} value={service}>
                  {SERVICE_DISPLAY_NAMES[service as ServiceType]}
                </option>
              ))}
            </select>
          </div>

          {/* Calculator UI - Service-Specific */}
          <div className="mb-6">
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
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {hasCalculation ? (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ✓ Calculation ready (${currentStore.lastCalculation?.tier2Results?.total?.toFixed(2)})
                </span>
              ) : (
                <span>Enter values and calculate pricing above</span>
              )}
            </div>

            <button
              onClick={handleCommitToJob}
              disabled={!hasCalculation}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${
                  hasCalculation
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Plus className="w-5 h-5" />
              Commit to Services List
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>How to use:</strong> Select a service, enter your project details, then click
              "Commit to Services List" to add it to your job.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
