import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { usePaverPatioStore } from '../../stores/paverPatioStore';
import { VariableDropdown } from './VariableDropdown';
import { VariableSlider } from './VariableSlider';
import { PricingPreview } from './PricingPreview';
import type { PaverPatioValues } from '../../types/paverPatioFormula';

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

  const renderVariableSection = (
    categoryKey: keyof PaverPatioValues,
    categoryConfig: any,
    categoryValues: any
  ) => {
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
                {categoryConfig.label}
              </h3>
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                {categoryConfig.description}
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
              title={`Reset ${categoryConfig.label} to defaults`}
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
            {Object.entries(categoryConfig)
              .filter(([key, value]) => !['label', 'description'].includes(key) && typeof value === 'object' && value !== null)
              .map(([variableKey, variableConfig]: [string, any]) => {
                const currentValue = categoryValues[variableKey];
                
                return (
                  <div key={variableKey}>
                    {variableConfig.type === 'slider' ? (
                      <VariableSlider
                        variable={variableConfig}
                        value={currentValue}
                        onChange={(value) => handleValueChange(categoryKey, variableKey, value)}
                        visualConfig={visualConfig}
                      />
                    ) : (
                      <VariableDropdown
                        variable={variableConfig}
                        value={currentValue}
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
          {Object.entries(store.config.variables).map(([categoryKey, categoryConfig]) => {
            // Only process if this is a complete category object with variables
            const hasVariables = Object.entries(categoryConfig)
              .some(([key, value]) => !['label', 'description'].includes(key) && typeof value === 'object' && value !== null);

            if (!hasVariables) return null;

            return renderVariableSection(
              categoryKey as keyof PaverPatioValues,
              categoryConfig,
              store.values[categoryKey as keyof PaverPatioValues]
            );
          })}
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