import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { usePaverPatioStore } from '../../pricing-system/core/stores/paver-patio-store';
import { VariableDropdown } from './VariableDropdown';
import { VariableSlider } from './VariableSlider';
import { ToggleInput } from './service-modals/shared/ToggleInput';
import { PricingPreview } from './PricingPreview';
import type { PaverPatioValues } from '../../pricing-system/core/master-formula/formula-types';

interface PaverPatioManagerProps {
  visualConfig: any;
  theme: 'light' | 'dark';
  store: ReturnType<typeof usePaverPatioStore>; // Store passed from parent to prevent duplicate instances
}

export const PaverPatioManager: React.FC<PaverPatioManagerProps> = ({
  visualConfig,
  theme,
  store, // Receive store from parent instead of creating new instance
}) => {
  // ✅ REMOVED: const { user } = useAuth();
  // ✅ REMOVED: const store = usePaverPatioStore(user?.company_id);
  // This was creating a DUPLICATE store instance, preventing real-time updates from propagating to UI
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([])  // Start with all sections collapsed
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
    if (variableKey === 'paverStyle') {
      return selectedOption.value === 0 ? 'Standard' : `+${selectedOption.value}%`;
    }

    // Cutting complexity - show combined effects
    if (variableKey === 'cuttingComplexity') {
      const hasLabor = selectedOption.laborPercentage && selectedOption.laborPercentage > 0;
      const hasWaste = selectedOption.materialWaste && selectedOption.materialWaste > 0;

      if (!hasLabor && !hasWaste) return 'Minimal';
      if (hasLabor && hasWaste) return `+${selectedOption.laborPercentage}% hours, +${selectedOption.materialWaste}% waste`;
      if (hasLabor) return `+${selectedOption.laborPercentage}% hours`;
      if (hasWaste) return `+${selectedOption.materialWaste}% waste`;
      return 'Minimal';
    }

    // Default fallback
    return selectedOption.value === 0 ? 'Default' : `${selectedOption.value}`;
  };

  // Category color scheme for visual distinction
  const getCategoryColors = (categoryKey: keyof PaverPatioValues) => {
    const colorSchemes = {
      excavation: {
        accent: '#f59e0b', // amber-500
        background: '#f59e0b10', // amber with 6% opacity
        dot: '#f59e0b',
      },
      siteAccess: {
        accent: '#f43f5e', // rose-500
        background: '#f43f5e10', // rose with 6% opacity
        dot: '#f43f5e',
      },
      materials: {
        accent: '#3b82f6', // blue-500
        background: '#3b82f610', // blue with 6% opacity
        dot: '#3b82f6',
      },
      labor: {
        accent: '#10b981', // emerald-500
        background: '#10b98110', // emerald with 6% opacity
        dot: '#10b981',
      },
      complexity: {
        accent: '#a855f7', // purple-500
        background: '#a855f710', // purple with 6% opacity
        dot: '#a855f7',
      },
    };

    return colorSchemes[categoryKey] || colorSchemes.materials;
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
    const categoryColors = getCategoryColors(categoryKey);

    return (
      <div
        key={categoryKey}
        className="border-l-4 border rounded-lg overflow-hidden"
        style={{
          backgroundColor: visualConfig.colors.surface,
          borderColor: visualConfig.colors.text.secondary + '20',
          borderLeftColor: categoryColors.accent,
        }}
      >
        {/* Section Header */}
        <button
          onClick={() => toggleSection(categoryKey)}
          className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
          style={{ backgroundColor: categoryColors.background }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: categoryColors.dot }}
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
                (value.options || value.type === 'toggle')  // ✅ Support toggle type
              )
              .map(([variableKey, variableConfig]: [string, any]) => {
                const currentValue = categoryValues?.[variableKey];

                // Check if materials database is enabled (for conditional hiding)
                const useMaterialsDatabase = categoryKey === 'materials'
                  ? (categoryValues?.useMaterialsDatabase ?? variableConfig.default ?? true)
                  : false;

                // Hide legacy variables when new system is enabled
                if (useMaterialsDatabase && ['paverStyle', 'cuttingComplexity'].includes(variableKey)) {
                  return null;
                }

                return (
                  <div key={variableKey}>
                    {variableConfig.type === 'toggle' ? (
                      <div className="p-4 rounded-lg border" style={{
                        borderColor: visualConfig.colors.text.secondary + '40',
                        backgroundColor: visualConfig.colors.background
                      }}>
                        <ToggleInput
                          label={variableConfig.label || variableKey}
                          value={currentValue ?? variableConfig.default ?? false}
                          onChange={(value) => handleValueChange(categoryKey, variableKey, value)}
                          description={variableConfig.description}
                          isAdmin={true}
                          visualConfig={visualConfig}
                        />
                      </div>
                    ) : variableConfig.type === 'slider' ? (
                      <VariableSlider
                        variable={variableConfig}
                        value={currentValue || variableConfig.default}
                        onChange={(value) => handleValueChange(categoryKey, variableKey, value)}
                        visualConfig={visualConfig}
                        categoryColor={categoryColors.accent}
                      />
                    ) : (
                      <VariableDropdown
                        variable={variableConfig}
                        value={currentValue || variableConfig.default}
                        onChange={(value) => handleValueChange(categoryKey, variableKey, value)}
                        visualConfig={visualConfig}
                        categoryColor={categoryColors.accent}
                      />
                    )}
                  </div>
                );
              })}

            {/* NEW: Live Materials Breakdown (when database toggle is ON) */}
            {categoryKey === 'materials' &&
             (categoryValues?.useMaterialsDatabase ?? true) &&
             store.lastCalculation?.tier2Results?.materialBreakdown && (
              <div className="mt-4 p-4 rounded-lg border-2" style={{
                backgroundColor: visualConfig.colors.primary + '08',
                borderColor: visualConfig.colors.primary + '40'
              }}>
                <div className="flex items-center mb-3">
                  <Icons.Package className="h-5 w-5 mr-2" style={{ color: visualConfig.colors.primary }} />
                  <h4 className="text-sm font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                    Live Material Breakdown
                  </h4>
                </div>

                <div className="space-y-2">
                  {store.lastCalculation.tier2Results.materialBreakdown.categories.map(category => (
                    <div
                      key={category.categoryKey}
                      className="flex items-center justify-between p-2 rounded"
                      style={{ backgroundColor: visualConfig.colors.background }}
                    >
                      <div className="flex-1">
                        <div className="text-xs font-medium" style={{ color: visualConfig.colors.text.primary }}>
                          {category.categoryLabel}
                        </div>
                        <div className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                          {category.quantities.quantityDisplay}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold" style={{ color: visualConfig.colors.primary }}>
                          ${category.subtotal.toFixed(2)}
                        </div>
                        <div className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                          ${(category.subtotal / store.sqft).toFixed(2)}/sqft
                        </div>
                      </div>
                    </div>
                  ))}

                  <div
                    className="flex justify-between pt-2 mt-2 border-t"
                    style={{ borderColor: visualConfig.colors.text.secondary + '40' }}
                  >
                    <span className="text-sm font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                      Total Materials:
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: visualConfig.colors.primary }}>
                        ${store.lastCalculation.tier2Results.materialBreakdown.totalMaterialCost.toFixed(2)}
                      </div>
                      <div className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                        ${store.lastCalculation.tier2Results.materialBreakdown.costPerSquareFoot.toFixed(2)}/sqft
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Pricing Preview Panel - MOBILE FIRST (shows first on mobile, right side on desktop) */}
        <div className="lg:col-span-1 lg:order-2">
          <div
            className="p-4 rounded-lg border lg:sticky lg:top-4"
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
              initialSqft={store.sqft}
            />
          </div>
        </div>

        {/* Configuration Panel - Shows second on mobile, left side on desktop */}
        <div className="lg:col-span-2 lg:order-1 space-y-4">
          {store.config && store.config.variables ?
            Object.entries(store.config.variables)
              .filter(([categoryKey]) => categoryKey !== 'excavation') // SKIP excavation category - now handled via serviceIntegrations
              .map(([categoryKey, categoryConfig]) => {
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

          {/* Service Integrations Section */}
          {store.config?.variables_config?.serviceIntegrations && (
            <div
              className="border-l-4 border rounded-lg overflow-hidden"
              style={{
                backgroundColor: visualConfig.colors.surface,
                borderColor: visualConfig.colors.text.secondary + '20',
                borderLeftColor: '#10b981', // Green accent for bundled services
              }}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection('serviceIntegrations')}
                className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                style={{ backgroundColor: '#10b98110' }} // Light green background
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#10b981' }}
                  />
                  <div className="text-left">
                    <h3 className="text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
                      {store.config.variables_config.serviceIntegrations.label || 'Bundled Services'}
                    </h3>
                    <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                      {store.config.variables_config.serviceIntegrations.description || 'Automatically include related service calculations'}
                    </p>
                  </div>
                </div>
                <Icons.ChevronDown
                  className={`h-5 w-5 transition-transform ${expandedSections.has('serviceIntegrations') ? 'transform rotate-180' : ''}`}
                  style={{ color: visualConfig.colors.text.secondary }}
                />
              </button>

              {/* Section Content */}
              {expandedSections.has('serviceIntegrations') && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Excavation Toggle */}
                  {store.config.variables_config.serviceIntegrations.includeExcavation && (
                    <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
                      <div className="flex-1">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={store.values.serviceIntegrations?.includeExcavation ?? true}
                            onChange={(e) => handleValueChange('serviceIntegrations', 'includeExcavation', e.target.checked)}
                            className="w-5 h-5 rounded border-2 transition-colors"
                            style={{
                              accentColor: '#10b981'
                            }}
                          />
                          <div>
                            <div className="font-medium" style={{ color: visualConfig.colors.text.primary }}>
                              {store.config.variables_config.serviceIntegrations.includeExcavation.label}
                            </div>
                            <div className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                              {store.config.variables_config.serviceIntegrations.includeExcavation.description}
                            </div>
                          </div>
                        </label>
                      </div>
                      {store.values.serviceIntegrations?.includeExcavation && (
                        <div className="ml-4 flex items-center space-x-2 px-3 py-1 rounded-full" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
                          <Icons.Check className="h-4 w-4" />
                          <span className="text-sm font-medium">Active</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};