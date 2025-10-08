import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useServiceBaseSettings } from '../../../stores/serviceBaseSettingsStore';
import { GenericVariableRenderer } from './shared/GenericVariableRenderer';

interface DynamicServiceModalProps {
  isOpen: boolean;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  visualConfig: any;
  theme: string;
}

export const DynamicServiceModal: React.FC<DynamicServiceModalProps> = ({
  isOpen,
  serviceId,
  serviceName,
  onClose,
  visualConfig,
  theme,
}) => {
  const { user } = useAuth();
  const { getService, updateServiceVariables, refreshServices, services } = useServiceBaseSettings(user?.company_id);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [variableUpdates, setVariableUpdates] = useState<Record<string, any>>({});

  const isAdmin = user?.is_admin || false;

  // Refresh services from Supabase when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsRefreshing(true);
      refreshServices().then(() => {
        setIsRefreshing(false);
      });
    }
  }, [isOpen, refreshServices]);

  // Get service config
  const service = useMemo(() => {
    const svc = getService(serviceId);
    console.log('🔍 [DYNAMIC MODAL] Service loaded:', {
      serviceId,
      found: !!svc,
      hasVariables: !!svc?.variables,
      hasVariablesConfig: !!svc?.variables_config,
      variablesKeys: svc?.variables ? Object.keys(svc.variables) : [],
      variablesConfigKeys: svc?.variables_config ? Object.keys(svc.variables_config) : [],
      fullService: svc
    });
    return svc;
  }, [getService, serviceId, services]);

  // Extract categories from variables_config
  // Skip metadata fields: formulaType, formulaDescription, serviceIntegrations (handled separately)
  const categories = useMemo(() => {
    if (!service?.variables_config) {
      console.log('⚠️ [DYNAMIC MODAL] No variables_config found');
      return [];
    }

    const skipFields = ['formulaType', 'formulaDescription', 'serviceIntegrations'];

    const cats = Object.entries(service.variables_config)
      .filter(([key]) => !skipFields.includes(key))
      .map(([key, value]: [string, any]) => ({
        id: key,
        label: value.label || key,
        description: value.description || '',
        variables: value,
      }));

    console.log('📊 [DYNAMIC MODAL] Categories extracted:', cats);
    return cats;
  }, [service]);

  // Reset active tab when categories change
  useEffect(() => {
    if (categories.length > 0 && activeTab >= categories.length) {
      setActiveTab(0);
    }
  }, [categories, activeTab]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasUnsavedChanges(false);
        setVariableUpdates({});
        onClose();
      }
    } else {
      setVariableUpdates({});
      onClose();
    }
  };

  const handleSave = () => {
    try {
      // Build the update object with all modified categories
      const updates: Record<string, any> = {};

      Object.entries(variableUpdates).forEach(([categoryId, categoryUpdates]) => {
        updates[categoryId] = {};

        Object.entries(categoryUpdates).forEach(([varKey, varValue]: [string, any]) => {
          // Skip metadata fields
          if (['label', 'description'].includes(varKey)) return;

          // Get the original variable structure from service
          const originalVar = service?.variables_config?.[categoryId]?.[varKey];

          if (originalVar) {
            updates[categoryId][varKey] = {
              ...originalVar,
              default: varValue,
            };
          }
        });
      });

      updateServiceVariables(serviceId, updates);

      setHasUnsavedChanges(false);
      setVariableUpdates({});
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration. Please try again.');
    }
  };

  const handleVariableChange = (categoryId: string, variableKey: string, value: any) => {
    setVariableUpdates(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [variableKey]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Get current values for a category (merge saved + unsaved)
  const getCategoryValues = (categoryId: string) => {
    const savedValues: Record<string, any> = {};
    const category = service?.variables_config?.[categoryId];

    if (category) {
      Object.entries(category).forEach(([key, value]: [string, any]) => {
        if (!['label', 'description'].includes(key) && typeof value === 'object' && 'default' in value) {
          savedValues[key] = value.default;
        }
      });
    }

    return {
      ...savedValues,
      ...(variableUpdates[categoryId] || {}),
    };
  };

  if (!isOpen) return null;

  const useTabs = categories.length > 1;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl flex flex-col"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between p-6 border-b flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            <div>
              <h2 className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                Service Configuration: {serviceName}
              </h2>
              <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                {isAdmin
                  ? 'Edit service parameters and pricing factors'
                  : 'View current settings (admin access required to edit)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs (if multiple categories) */}
          {useTabs && (
            <div
              className="flex gap-1 px-6 pt-4 border-b flex-shrink-0"
              style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
            >
              {categories.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(index)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                    ${activeTab === index ? 'border-b-2' : 'opacity-60 hover:opacity-100'}
                  `}
                  style={{
                    color: visualConfig.colors.text.primary,
                    borderBottomColor: activeTab === index ? visualConfig.colors.primary : 'transparent',
                    backgroundColor: activeTab === index ? visualConfig.colors.background : 'transparent',
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>
          )}

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {isRefreshing ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                  Loading configuration...
                </div>
              </div>
            ) : categories.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                  No configuration available for this service.
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map((category, index) => (
                  <div
                    key={category.id}
                    className={useTabs ? (activeTab === index ? 'block' : 'hidden') : 'block'}
                  >
                    {!useTabs && (
                      <div className="mb-4">
                        <h3 className="text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
                          {category.label}
                        </h3>
                        {category.description && (
                          <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                            {category.description}
                          </p>
                        )}
                      </div>
                    )}

                    <GenericVariableRenderer
                      categoryId={category.id}
                      variables={category.variables}
                      values={getCategoryValues(category.id)}
                      onChange={(varKey, value) => handleVariableChange(category.id, varKey, value)}
                      isAdmin={isAdmin}
                      visualConfig={visualConfig}
                      theme={theme}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            className="flex items-center justify-between p-6 border-t flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            <div className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
              {isAdmin
                ? 'Changes will be saved to service configuration'
                : 'Read-only view - admin access required to make changes'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border rounded-lg font-medium transition-colors"
                style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  color: visualConfig.colors.text.secondary,
                }}
              >
                {isAdmin ? 'Cancel' : 'Close'}
              </button>
              {isAdmin && (
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    !hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{
                    backgroundColor: visualConfig.colors.primary,
                    color: 'white',
                  }}
                >
                  Save Configuration
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
