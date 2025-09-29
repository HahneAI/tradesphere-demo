import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { usePaverPatioStore } from '../../pricing-system/core/stores/paver-patio-store';
import { VariableDropdown } from './VariableDropdown';
import { VariableSlider } from './VariableSlider';
import { PricingPreview } from './PricingPreview';
import type { PaverPatioValues } from '../../pricing-system/core/master-formula/formula-types';

interface PaverPatioManagerProps {
  visualConfig: any;
  theme: 'light' | 'dark';
}

export const PaverPatioManager: React.FC<PaverPatioManagerProps> = ({
  visualConfig,
  theme,
}) => {
  const store = usePaverPatioStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['excavation', 'siteAccess', 'materials', 'labor', 'complexity'])
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleValueChange = (category: keyof PaverPatioValues, variable: string, value: string | number) => {
    console.log('🔍 [DEBUG] Value change:', { category, variable, value, type: typeof value });
    store.updateValue(category, variable, value);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await store.saveConfig();
      await store.createBackup();
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleResetAll = () => {
    if (window.confirm('Reset all variables to default values? This cannot be undone.')) {
      store.resetToDefaults();
      setHasUnsavedChanges(true);
    }
  };

  const handleResetCategory = (category: keyof PaverPatioValues) => {
    if (window.confirm(`Reset all ${category} variables to defaults?`)) {
      store.resetCategory(category);
      setHasUnsavedChanges(true);
    }
  };

  if (store.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
             style={{ borderColor: visualConfig.colors.primary }}></div>
        <span className="ml-3" style={{ color: visualConfig.colors.text.primary }}>
          Loading paver patio configuration...
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

  const renderVariableSection = (
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
          <div className="flex items-center space-x-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetCategory(categoryKey);
              }}
              className="p-1 rounded hover:opacity-70 transition-opacity"
              title={`Reset ${categoryConfig.label || categoryKey} to defaults`}
              style={{ color: visualConfig.colors.text.secondary }}
            >
              <Icons.RotateCcw className="h-4 w-4" />
            </button>
            <Icons.ChevronDown 
              className={`h-5 w-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
              style={{ color: visualConfig.colors.text.secondary }}
            />
          </div>
        </button>

        {/* Section Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-6">
            {Object.entries(categoryConfig || {})
              .filter(([key, value]) =>
                !['label', 'description'].includes(key) &&
                value &&
                typeof value === 'object' &&
                value.type &&
                value.options
              )
              .map(([variableKey, variableConfig]: [string, any]) => {
                const currentValue = categoryValues?.[variableKey];

                return (
                  <div key={variableKey}>
                    {variableConfig.type === 'slider' ? (
                      <VariableSlider
                        variable={variableConfig}
                        value={currentValue || variableConfig.default}
                        onChange={(value) => handleValueChange(categoryKey, variableKey, value)}
                        visualConfig={visualConfig}
                      />
                    ) : (
                      <VariableDropdown
                        variable={variableConfig}
                        value={currentValue || variableConfig.default}
                        onChange={(value) => handleValueChange(categoryKey, variableKey, value)}
                        visualConfig={visualConfig}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  // Debug output
  console.log('🔍 [DEBUG] PaverPatioManager render:', {
    configAvailable: !!store.config,
    valuesAvailable: !!store.values,
    configCategories: store.config ? Object.keys(store.config.variables || {}) : [],
    complexity: store.values?.complexity,
    lastCalculation: store.lastCalculation?.tier2Results?.total
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
            Paver Patio Configuration
          </h2>
          <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
            Configure pricing variables for paver patio installations
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <span className="text-sm" style={{ color: visualConfig.colors.secondary }}>
              Unsaved changes
            </span>
          )}
          
          <button
            onClick={handleResetAll}
            className="px-3 py-2 text-sm rounded-lg border transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'transparent',
              borderColor: visualConfig.colors.text.secondary + '40',
              color: visualConfig.colors.text.secondary,
            }}
          >
            <Icons.RotateCcw className="h-4 w-4 mr-1 inline" />
            Reset All
          </button>
          
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-4 py-2 text-sm rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: visualConfig.colors.text.onPrimary,
            }}
          >
            {saveStatus === 'saving' && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block" />
            )}
            {saveStatus === 'saved' && <Icons.Check className="h-4 w-4 mr-1 inline" />}
            {saveStatus === 'error' && <Icons.AlertTriangle className="h-4 w-4 mr-1 inline" />}
            {saveStatus === 'saving' ? 'Saving...' : 
             saveStatus === 'saved' ? 'Saved!' : 
             saveStatus === 'error' ? 'Error!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
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
                  value.type &&
                  value.options
                );

              if (!hasVariables) return null;

              return renderVariableSection(
                categoryKey as keyof PaverPatioValues,
                categoryConfig,
                store.values[categoryKey as keyof PaverPatioValues]
              );
            }) :
            <div>No configuration available</div>
          }
        </div>

        {/* Pricing Preview Panel */}
        <div className="lg:col-span-1">
          <div 
            className="sticky top-4 p-4 rounded-lg border"
            style={{ 
              backgroundColor: visualConfig.colors.surface,
              borderColor: visualConfig.colors.text.secondary + '20'
            }}
          >
            <h3 className="text-lg font-medium mb-4" style={{ color: visualConfig.colors.text.primary }}>
              Live Pricing Preview
            </h3>
            <PricingPreview
              calculation={store.lastCalculation}
              onCalculate={store.calculatePrice}
              visualConfig={visualConfig}
            />
          </div>
        </div>
      </div>
    </div>
  );
};