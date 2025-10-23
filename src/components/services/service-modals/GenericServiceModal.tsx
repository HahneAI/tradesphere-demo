import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useServiceBaseSettings } from '../../../stores/serviceBaseSettingsStore';
import { GenericVariableRenderer } from './shared';

interface ServiceSpecificsModalProps {
  isOpen: boolean;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  visualConfig: any;
  theme: string;
}

/**
 * GenericServiceModal - Fallback modal for services without custom modals
 *
 * Uses GenericVariableRenderer to dynamically render any variables_config JSONB structure.
 * This modal provides a plug-and-play solution for new services.
 */
export const GenericServiceModal: React.FC<ServiceSpecificsModalProps> = ({
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

  const isAdmin = user?.is_admin || false;

  // Dynamic state to hold all variable values
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});

  // Refresh services from Supabase when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [GENERIC MODAL] Modal opened, forcing fresh load from database');
      setIsRefreshing(true);
      refreshServices().then(() => {
        console.log('✅ [GENERIC MODAL] Fresh data loaded from database');
        setIsRefreshing(false);
      });
    }
  }, [isOpen, refreshServices]);

  // Get service using useMemo for reactivity
  const service = useMemo(() => {
    const svc = getService(serviceId);
    console.log('🔍 [GENERIC MODAL] Service retrieved:', {
      found: !!svc,
      serviceId,
      hasVariablesConfig: !!svc?.variables_config,
    });
    return svc;
  }, [getService, serviceId, services]);

  // Load values from variables_config
  useEffect(() => {
    if (!isRefreshing && service?.variables_config) {
      console.log('📝 [GENERIC MODAL] Loading variables from config');

      const initialValues: Record<string, any> = {};

      // Iterate through all categories in variables_config
      Object.entries(service.variables_config).forEach(([categoryKey, categoryConfig]: [string, any]) => {
        if (!categoryConfig || typeof categoryConfig !== 'object') return;

        initialValues[categoryKey] = {};

        // Iterate through all variables in the category
        Object.entries(categoryConfig).forEach(([varKey, varConfig]: [string, any]) => {
          // Skip metadata fields
          if (['label', 'description'].includes(varKey)) return;

          if (varConfig && typeof varConfig === 'object' && varConfig.default !== undefined) {
            initialValues[categoryKey][varKey] = varConfig.default;
          }
        });
      });

      setVariableValues(initialValues);
      console.log('📊 [GENERIC MODAL] Loaded initial values:', initialValues);
    }
  }, [service, isRefreshing]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    try {
      console.log('💾 [GENERIC MODAL] Saving variable values:', variableValues);

      // Build the update object - preserve the full structure but update defaults
      const updatedConfig: Record<string, any> = {};

      Object.entries(service?.variables_config || {}).forEach(([categoryKey, categoryConfig]: [string, any]) => {
        if (!categoryConfig || typeof categoryConfig !== 'object') return;

        updatedConfig[categoryKey] = { ...categoryConfig };

        // Update default values for each variable
        Object.entries(categoryConfig).forEach(([varKey, varConfig]: [string, any]) => {
          if (['label', 'description'].includes(varKey)) return;

          if (varConfig && typeof varConfig === 'object') {
            updatedConfig[categoryKey][varKey] = {
              ...varConfig,
              default: variableValues[categoryKey]?.[varKey] ?? varConfig.default,
            };
          }
        });
      });

      updateServiceVariables(serviceId, updatedConfig);

      console.log('✅ [GENERIC MODAL] Configuration saved successfully');
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('❌ [GENERIC MODAL] Failed to save:', error);
      alert('Failed to save configuration. Please try again.');
    }
  };

  const handleVariableChange = (category: string, variable: string, value: any) => {
    setVariableValues(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [variable]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  if (!isOpen) return null;

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
                  ? 'Edit service configuration variables'
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

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {isRefreshing ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Icons.Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: visualConfig.colors.primary }} />
                  <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Loading configuration...
                  </p>
                </div>
              </div>
            ) : (
              <GenericVariableRenderer
                variablesConfig={service?.variables_config}
                values={variableValues}
                onChange={handleVariableChange}
                visualConfig={visualConfig}
                isAdmin={isAdmin}
              />
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
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
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
