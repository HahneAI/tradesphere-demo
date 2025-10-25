import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface Step1IdentityProps {
  wizard: any;
  visualConfig: any;
  companyId: string;
}

export const Step1Identity: React.FC<Step1IdentityProps> = ({
  wizard,
  visualConfig,
  companyId
}) => {
  const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const { state, setState } = wizard;

  // Auto-generate service_id from service_name
  const handleServiceNameChange = (name: string) => {
    const autoId = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');

    setState((prev: any) => ({
      ...prev,
      service_name: name,
      service_id: autoId ? `${autoId}_sqft` : '' // Default to sqft suffix
    }));

    // Clear name-related errors
    setLocalErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.service_name;
      return newErrors;
    });
  };

  const handleServiceIdChange = (id: string) => {
    setState((prev: any) => ({
      ...prev,
      service_id: id
    }));

    // Clear ID-related errors
    setLocalErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.service_id;
      return newErrors;
    });
  };

  const handleCategoryChange = (category: string) => {
    setState((prev: any) => ({
      ...prev,
      category
    }));
  };

  // Check service name uniqueness on blur
  const checkUniqueness = async () => {
    if (!state.service_name.trim()) return;

    setIsCheckingUniqueness(true);

    try {
      const { data: existing } = await supabase
        .from('svc_pricing_configs')
        .select('id')
        .eq('company_id', companyId)
        .eq('service_name', state.service_name)
        .maybeSingle();

      if (existing) {
        setLocalErrors(prev => ({
          ...prev,
          service_name: 'A service with this name already exists for your company'
        }));
      }
    } catch (error) {
      console.error('Error checking service name uniqueness:', error);
    } finally {
      setIsCheckingUniqueness(false);
    }
  };

  // Validate service ID format on blur
  const validateServiceId = () => {
    if (!state.service_id) return;

    const regex = /^[a-z0-9_]+_(sqft|linear_ft|cubic_yd|item)$/;
    if (!regex.test(state.service_id)) {
      setLocalErrors(prev => ({
        ...prev,
        service_id: 'Service ID must be lowercase, underscores only, and end with _sqft, _linear_ft, _cubic_yd, or _item'
      }));
    }
  };

  // Combine wizard errors and local errors
  const allErrors = { ...state.errors, ...localErrors };

  return (
    <div className="space-y-6">
      {/* Step Title */}
      <div>
        <h3
          className="text-xl font-semibold mb-2"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Step 1: Service Identity
        </h3>
        <p
          className="text-sm"
          style={{ color: visualConfig.colors.text.secondary }}
        >
          Define the basic identity and categorization for your custom service
        </p>
      </div>

      {/* Info Banner */}
      <div
        className="p-4 rounded-lg border-l-4"
        style={{
          backgroundColor: visualConfig.colors.primary + '08',
          borderLeftColor: visualConfig.colors.primary
        }}
      >
        <div className="flex items-start">
          <Icons.Info
            className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0"
            style={{ color: visualConfig.colors.primary }}
          />
          <div>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: visualConfig.colors.text.primary }}
            >
              Creating a Database-Driven Service
            </p>
            <p
              className="text-xs"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              This wizard will create a fully-functional custom service that works immediately with Quick Calculator and AI Chat—no code changes required.
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Service Name */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: visualConfig.colors.text.primary }}
          >
            Service Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={state.service_name}
            onChange={(e) => handleServiceNameChange(e.target.value)}
            onBlur={checkUniqueness}
            placeholder="e.g., Mulch Bed Installation"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: allErrors.service_name
                ? '#DC2626'
                : visualConfig.colors.text.secondary + '40',
              color: visualConfig.colors.text.primary,
              ...(allErrors.service_name ? {} : {
                '&:focus': {
                  borderColor: visualConfig.colors.primary,
                  boxShadow: `0 0 0 2px ${visualConfig.colors.primary}20`
                }
              })
            }}
          />
          <div className="flex items-center justify-between mt-1">
            <p
              className="text-xs"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              The display name shown to users in Quick Calculator and AI Chat
            </p>
            {isCheckingUniqueness && (
              <span className="text-xs flex items-center" style={{ color: visualConfig.colors.primary }}>
                <Icons.Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Checking...
              </span>
            )}
          </div>
          {allErrors.service_name && (
            <p className="text-xs text-red-600 mt-1 flex items-center">
              <Icons.AlertCircle className="h-3 w-3 mr-1" />
              {allErrors.service_name}
            </p>
          )}
        </div>

        {/* Service ID */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: visualConfig.colors.text.primary }}
          >
            Service ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={state.service_id}
            onChange={(e) => handleServiceIdChange(e.target.value)}
            onBlur={validateServiceId}
            placeholder="e.g., mulch_bed_installation_sqft"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all font-mono text-sm"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: allErrors.service_id
                ? '#DC2626'
                : visualConfig.colors.text.secondary + '40',
              color: visualConfig.colors.text.primary
            }}
          />
          <p
            className="text-xs mt-1"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            Database key. Must be <code className="px-1 py-0.5 rounded bg-gray-100">lowercase_with_underscores</code> and end with unit suffix:
            <code className="px-1 py-0.5 rounded bg-gray-100 mx-1">_sqft</code>
            <code className="px-1 py-0.5 rounded bg-gray-100 mx-1">_linear_ft</code>
            <code className="px-1 py-0.5 rounded bg-gray-100 mx-1">_cubic_yd</code>
            <code className="px-1 py-0.5 rounded bg-gray-100 mx-1">_item</code>
          </p>
          {allErrors.service_id && (
            <p className="text-xs text-red-600 mt-1 flex items-center">
              <Icons.AlertCircle className="h-3 w-3 mr-1" />
              {allErrors.service_id}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: visualConfig.colors.text.primary }}
          >
            Service Category <span className="text-red-500">*</span>
          </label>
          <select
            value={state.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: visualConfig.colors.text.secondary + '40',
              color: visualConfig.colors.text.primary
            }}
          >
            <option value="hardscape">Hardscaping (pavers, walls, concrete)</option>
            <option value="landscape">Landscaping (mulch, sod, plants)</option>
            <option value="excavation">Excavation & Grading</option>
            <option value="specialty">Specialty Services (water features, decks)</option>
          </select>
          <p
            className="text-xs mt-1"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            Used for organizing services in the database and Quick Calculator
          </p>
        </div>
      </div>

      {/* Preview Card */}
      {state.service_name && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: visualConfig.colors.background,
            borderColor: visualConfig.colors.text.secondary + '20'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4
              className="text-sm font-semibold"
              style={{ color: visualConfig.colors.text.primary }}
            >
              Preview
            </h4>
            <span
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: visualConfig.colors.primary + '20',
                color: visualConfig.colors.primary
              }}
            >
              {state.category}
            </span>
          </div>
          <p
            className="text-base font-medium"
            style={{ color: visualConfig.colors.text.primary }}
          >
            {state.service_name}
          </p>
          <p
            className="text-xs mt-1 font-mono"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            {state.service_id || 'service_id_will_appear_here'}
          </p>
        </div>
      )}
    </div>
  );
};
