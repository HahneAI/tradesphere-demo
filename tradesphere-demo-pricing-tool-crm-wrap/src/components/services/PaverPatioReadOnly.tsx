import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { usePaverPatioStore } from '../../pricing-system/core/stores/paver-patio-store';
import { PricingPreview } from './PricingPreview';
import type { PaverPatioValues } from '../../pricing-system/core/master-formula/formula-types';

interface PaverPatioReadOnlyProps {
  visualConfig: any;
  theme: 'light' | 'dark';
  userName?: string;
  store: ReturnType<typeof usePaverPatioStore>; // Store passed from parent to prevent duplicate instances
}

export const PaverPatioReadOnly: React.FC<PaverPatioReadOnlyProps> = ({
  visualConfig,
  theme,
  userName = 'User',
  store, // Receive store from parent instead of creating new instance
}) => {
  // ✅ REMOVED: const { user } = useAuth();
  // ✅ REMOVED: const store = usePaverPatioStore(user?.company_id);
  // This was creating a DUPLICATE store instance, preventing real-time updates from propagating to UI
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['materials', 'complexity']) // Show most relevant sections by default
  );
  const [showContactForm, setShowContactForm] = useState(false);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  if (store.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
             style={{ borderColor: visualConfig.colors.primary }}></div>
        <span className="ml-3" style={{ color: visualConfig.colors.text.primary }}>
          Loading paver patio information...
        </span>
      </div>
    );
  }

  if (store.error) {
    return (
      <div 
        className="p-4 rounded-lg border-l-4"
        style={{ 
          backgroundColor: '#fee2e2',
          borderLeftColor: '#dc2626'
        }}
      >
        <div className="flex items-center">
          <Icons.AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">Error loading configuration</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{store.error}</p>
      </div>
    );
  }

  if (!store.config || !store.config.variables) {
    return <div>Loading configuration...</div>;
  }

  // Helper function following Tom's expert guidelines
  const formatVariableDisplay = (variableKey: string, selectedOption: any) => {
    if (!selectedOption) return 'N/A';

    // Tier 1 variables (labor time factors) - show as percentages
    if (['tearoutComplexity', 'accessDifficulty', 'teamSize'].includes(variableKey)) {
      return selectedOption.value === 0 ? 'Baseline' : `+${selectedOption.value}%`;
    }

    // Equipment costs - show daily rates
    if (variableKey === 'equipmentRequired') {
      return selectedOption.value === 0 ? 'Hand tools' : `$${selectedOption.value}/day`;
    }

    // Obstacle costs - show flat fees
    if (variableKey === 'obstacleRemoval') {
      return selectedOption.value === 0 ? 'None' : `$${selectedOption.value}`;
    }

    // Material factors - show percentages
    if (['paverStyle', 'patternComplexity'].includes(variableKey)) {
      return selectedOption.value === 0 ? 'Standard' : `+${selectedOption.value}%`;
    }

    // Cutting complexity - show combined effects
    if (variableKey === 'cuttingComplexity') {
      if (selectedOption.fixedLaborHours && selectedOption.materialWaste) {
        return `+${selectedOption.fixedLaborHours}h, +${selectedOption.materialWaste}% waste`;
      } else if (selectedOption.fixedLaborHours) {
        return `+${selectedOption.fixedLaborHours}h fixed`;
      }
      return selectedOption.value === 0 ? 'Minimal' : `+${selectedOption.value}%`;
    }

    // Default fallback
    return selectedOption.value === 0 ? 'Default' : `${selectedOption.value}`;
  };

  const renderReadOnlySection = (
    categoryKey: keyof PaverPatioValues,
    categoryConfig: any,
    categoryValues: any
  ) => {
    // Comprehensive null guard at function start
    if (!categoryConfig || typeof categoryConfig !== 'object') {
      return null;
    }

    const isExpanded = expandedSections.has(categoryKey);
    
    return (
      <div 
        key={categoryKey}
        className="border rounded-lg overflow-hidden"
        style={{ 
          backgroundColor: visualConfig.colors.surface,
          borderColor: visualConfig.colors.text.secondary + '20'
        }}
      >
        {/* Section Header */}
        <button
          onClick={() => toggleSection(categoryKey)}
          className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center space-x-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: visualConfig.colors.primary }}
            />
            <div className="text-left">
              <h3 className="text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
                {categoryConfig.label || categoryKey}
              </h3>
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                {categoryConfig.description || ''}
              </p>
            </div>
          </div>
          <Icons.ChevronDown 
            className={`h-5 w-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
            style={{ color: visualConfig.colors.text.secondary }}
          />
        </button>

        {/* Section Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4">
            {Object.entries(categoryConfig || {})
              .filter(([key, value]) =>
                !['label', 'description'].includes(key) &&
                value &&
                typeof value === 'object' &&
                value.options
              )
              .map(([variableKey, variableConfig]: [string, any]) => {
                const currentValue = categoryValues?.[variableKey];
                const selectedOption = variableConfig.options?.[currentValue] || variableConfig.options?.[variableConfig.default];

                return (
                  <div
                    key={variableKey}
                    className="p-3 rounded-lg border-l-4"
                    style={{
                      backgroundColor: visualConfig.colors.background,
                      borderLeftColor: visualConfig.colors.primary,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                        {variableConfig.label || variableKey}
                      </h4>
                      <span
                        className="text-sm font-mono px-2 py-1 rounded"
                        style={{
                          backgroundColor: visualConfig.colors.primary + '20',
                          color: visualConfig.colors.primary,
                        }}
                      >
                        {variableConfig.type === 'slider'
                          ? `×${(currentValue ?? 1.0).toFixed(2)}`
                          : formatVariableDisplay(variableKey, selectedOption)
                        }
                      </span>
                    </div>

                    <div className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                      <div className="font-medium mb-1">
                        Current: {selectedOption?.label || currentValue || 'Default'}
                      </div>
                      <div className="text-xs">
                        {selectedOption?.description || variableConfig.description || 'No description available'}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
            Paver Patio Pricing Information
          </h2>
          <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
            Current company pricing configuration for paver patio installations
          </p>
        </div>
        
        <button
          onClick={() => setShowContactForm(true)}
          className="px-4 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
          style={{
            backgroundColor: visualConfig.colors.secondary,
            color: visualConfig.colors.text.onPrimary,
          }}
        >
          <Icons.MessageSquare className="h-4 w-4 mr-2 inline" />
          Request Changes
        </button>
      </div>

      {/* Info Banner */}
      <div 
        className="p-4 rounded-lg border-l-4"
        style={{ 
          backgroundColor: visualConfig.colors.primary + '08',
          borderLeftColor: visualConfig.colors.primary,
        }}
      >
        <div className="flex items-start">
          <Icons.Info className="h-5 w-5 mr-3 mt-0.5" style={{ color: visualConfig.colors.primary }} />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.primary }}>
              Pricing Variables Information
            </p>
            <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
              These settings control how paver patio projects are priced. Only administrators can modify these values. 
              Last updated: {store.config.lastModified}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Display */}
        <div className="lg:col-span-2 space-y-4">
          {store.config && store.config.variables ?
            Object.entries(store.config.variables).map(([categoryKey, categoryConfig]) => {
              // Only process if this is a complete category object with variables
              if (!categoryConfig || typeof categoryConfig !== 'object') {
                return null;
              }

              const hasVariables = Object.entries(categoryConfig)
                .some(([key, value]) =>
                  !['label', 'description'].includes(key) &&
                  value &&
                  typeof value === 'object' &&
                  value.options
                );

              if (!hasVariables) return null;

              return renderReadOnlySection(
                categoryKey as keyof PaverPatioValues,
                categoryConfig,
                store.values[categoryKey as keyof PaverPatioValues]
              );
            }) :
            <div>No configuration available</div>
          }
        </div>

        {/* Pricing Calculator */}
        <div className="lg:col-span-1">
          <div 
            className="sticky top-4 p-4 rounded-lg border"
            style={{ 
              backgroundColor: visualConfig.colors.surface,
              borderColor: visualConfig.colors.text.secondary + '20'
            }}
          >
            <h3 className="text-lg font-medium mb-4" style={{ color: visualConfig.colors.text.primary }}>
              Pricing Calculator
            </h3>
            <PricingPreview
              calculation={store.lastCalculation}
              onCalculate={store.calculatePrice}
              visualConfig={visualConfig}
            />
            
            {/* Why These Variables Matter */}
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                Why These Variables Matter:
              </h4>
              <div className="space-y-2 text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                <p><strong>Materials:</strong> Different paver types require different installation methods and costs</p>
                <p><strong>Site Access:</strong> Difficult access increases labor time and equipment needs</p>
                <p><strong>Excavation:</strong> Existing surface removal affects project complexity and cost</p>
                <p><strong>Labor:</strong> Team size and experience level directly impact efficiency and quality</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Admin Modal */}
      {showContactForm && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowContactForm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md bg-white rounded-lg shadow-xl p-6"
              style={{ backgroundColor: visualConfig.colors.surface }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                  Request Configuration Changes
                </h3>
                <button
                  onClick={() => setShowContactForm(false)}
                  className="p-1 rounded hover:opacity-70"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  <Icons.X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                Contact your administrator to request changes to the paver patio pricing configuration.
              </p>
              
              <div 
                className="p-4 rounded-lg border-l-4 mb-4"
                style={{ 
                  backgroundColor: visualConfig.colors.primary + '08',
                  borderLeftColor: visualConfig.colors.primary,
                }}
              >
                <p className="text-sm" style={{ color: visualConfig.colors.text.primary }}>
                  <strong>Note:</strong> Include specific details about which variables you'd like changed and why. 
                  This helps administrators understand the business need for the adjustment.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    // In a real implementation, this would open an email client or internal messaging system
                    alert('Feature coming soon: Direct admin messaging system');
                    setShowContactForm(false);
                  }}
                  className="flex-1 px-4 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: visualConfig.colors.primary,
                    color: visualConfig.colors.text.onPrimary,
                  }}
                >
                  Send Request
                </button>
                <button
                  onClick={() => setShowContactForm(false)}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: visualConfig.colors.text.secondary + '40',
                    color: visualConfig.colors.text.secondary,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};