import { useState, useCallback, useEffect } from 'react';
import { getSupabase } from '../services/supabase';
import { masterPricingEngine } from '../pricing-system/core/calculations/master-pricing-engine';
import { serviceConfigManager } from '../services/ServiceConfigManager';
import { calculateMultiplierFromPercentage } from '../pricing-system/utils/variable-helpers';

// Import the JSON configurations (used as fallback only)
import paverPatioConfigJson from '../pricing-system/config/paver-patio-formula.json';
// Excavation service now uses JSONB from database only - no JSON fallback

interface BaseSetting {
  value: number;
  unit: string;
  label: string;
  description: string;
  adminEditable: boolean;
  validation?: {
    min: number;
    max: number;
    step: number;
  };
}

interface ServiceConfig {
  service: string;
  serviceId: string;
  category: string;
  baseSettings: {
    laborSettings: Record<string, BaseSetting>;
    materialSettings: Record<string, BaseSetting>;
    businessSettings: Record<string, BaseSetting>;
  };
  variables?: any;
  lastModified: string;
}

interface ServiceVariableUpdate {
  equipmentCosts?: {
    handTools?: number;
    attachments?: number;
    lightMachinery?: number;
    heavyMachinery?: number;
  };
  cuttingComplexity?: {
    minimal?: { laborPercentage?: number; materialWaste?: number };
    moderate?: { laborPercentage?: number; materialWaste?: number };
    complex?: { laborPercentage?: number; materialWaste?: number };
  };
  laborMultipliers?: {
    tearoutGrass?: number;
    tearoutConcrete?: number;
    tearoutAsphalt?: number;
    accessEasy?: number;
    accessModerate?: number;
    accessDifficult?: number;
    teamTwoPerson?: number;
    teamThreePlus?: number;
  };
  materialSettings?: {
    standardGrade?: number;
    premiumGrade?: number;
  };
  complexitySettings?: {
    simple?: number;
    standard?: number;
    complex?: number;
    extreme?: number;
  };
  obstacleSettings?: {
    none?: number;
    minor?: number;
    major?: number;
  };
  calculationSettings?: any; // For generic JSONB updates (excavation, etc.)
  [key: string]: any; // Allow any additional categories for future services
}

interface ServiceBaseSettingsStore {
  services: ServiceConfig[];
  isLoading: boolean;
  error: string | null;
  updateBaseSetting: (serviceId: string, setting: string, value: number) => void;
  updateServiceVariables: (serviceId: string, updates: ServiceVariableUpdate) => void;
  getService: (serviceId: string) => ServiceConfig | undefined;
  refreshServices: () => Promise<void>; // NEW: Refresh from Supabase
}

// Load services from JSON configurations (FALLBACK ONLY - Database is primary source)
// NOTE: Excavation service removed - it MUST exist in database with JSONB structure
const loadServices = (): ServiceConfig[] => {
  try {
    const paverPatioConfig = paverPatioConfigJson as any;

    return [
      {
        service: paverPatioConfig.service,
        serviceId: paverPatioConfig.serviceId,
        category: paverPatioConfig.category || 'Hardscaping',
        baseSettings: paverPatioConfig.baseSettings,
        variables: paverPatioConfig.variables,
        lastModified: paverPatioConfig.lastModified
      }
      // Excavation service REMOVED - must be initialized in database with proper
      // variables_config JSONB structure. See: src/database/migrations/init-excavation-calculationSettings.sql
    ];
  } catch (error) {
    console.error('Error loading services configuration:', error);
    return [];
  }
};

// Save updated configuration to Supabase (new primary method)
const saveServiceConfig = async (serviceId: string, updatedService: ServiceConfig, companyId?: string, userId?: string) => {
  try {
    if (!companyId) {
      console.warn('⚠️ No company_id available, falling back to localStorage only');
      await saveServiceConfigLegacy(serviceId, updatedService);
      return;
    }

    // Get authenticated Supabase client
    const supabase = getSupabase();

    const supabaseData = {
      company_id: companyId,
      service_name: serviceId,
      hourly_labor_rate: updatedService.baseSettings?.laborSettings?.hourlyLaborRate?.value || 25,
      optimal_team_size: updatedService.baseSettings?.laborSettings?.optimalTeamSize?.value || 3,
      base_productivity: updatedService.baseSettings?.laborSettings?.baseProductivity?.value || 50,
      base_material_cost: updatedService.baseSettings?.materialSettings?.baseMaterialCost?.value || 5.84,
      profit_margin: updatedService.baseSettings?.businessSettings?.profitMarginTarget?.value || 0.20,
      variables_config: updatedService.variables_config || updatedService.variables || {},
      default_variables: {},
      is_active: true,
      version: '2.0.0',
      updated_at: new Date().toISOString(),
      updated_by: userId || null  // FIXED: Use userId instead of companyId
    };

    // Upsert to Supabase (update if exists, insert if not)
    const { error } = await supabase
      .from('service_pricing_configs')
      .upsert(supabaseData, {
        onConflict: 'company_id,service_name'
      });

    if (error) {
      console.error('❌ [SAVE DEBUG] Full Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        isRLS: error.code === 'PGRST301' || error.message?.includes('RLS') || error.message?.includes('policy')
      });
      throw error;
    }

    // Clear master engine cache so Quick Calculator sees fresh data
    masterPricingEngine.clearCache(serviceId, companyId);

    // Also store in localStorage for immediate local access
    const storageKey = `service_config_${serviceId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedService));

    // STEP 4: Broadcast change to trigger real-time updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: JSON.stringify(updatedService),
      storageArea: localStorage
    }));

    // STEP 5: Trigger immediate refresh of pricing calculations
    window.dispatchEvent(new CustomEvent('paver-config-updated', {
      detail: { serviceId, updatedService }
    }));

  } catch (error) {
    console.error('Error saving service configuration:', error);
    // Fallback to legacy localStorage method if Supabase fails
    await saveServiceConfigLegacy(serviceId, updatedService);
  }
};

// Legacy localStorage-only save method (fallback)
const saveServiceConfigLegacy = async (serviceId: string, updatedService: ServiceConfig) => {
  try {
    // STEP 1: Store in localStorage for immediate use
    const storageKey = `service_config_${serviceId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedService));

    // STEP 2: Also store the update timestamp
    const updateInfo = {
      serviceId,
      timestamp: new Date().toISOString(),
      lastModified: new Date().toISOString().split('T')[0]
    };
    localStorage.setItem(`service_update_${serviceId}`, JSON.stringify(updateInfo));

    // STEP 3: Write back to JSON file via Netlify function
    if (serviceId === 'paver_patio_sqft') {
      writeConfigToJsonFile(updatedService).catch(error => {
        console.warn('⚠️ Failed to update JSON file, using localStorage only:', error.message);
      });
    }

    // STEP 4: Broadcast change to other tabs/windows AND all pricing components
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: JSON.stringify(updatedService),
      storageArea: localStorage
    }));

    // STEP 5: Trigger immediate refresh of pricing calculations
    window.dispatchEvent(new CustomEvent('paver-config-updated', {
      detail: { serviceId, updatedService }
    }));

  } catch (error) {
    console.error('Error saving service configuration:', error);
    throw error;
  }
};

// Write configuration back to JSON file
const writeConfigToJsonFile = async (updatedService: ServiceConfig) => {
  try {
    const response = await fetch('/.netlify/functions/update-service-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceId: 'paver_patio_sqft',
        configData: updatedService
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

  } catch (error) {
    console.error('❌ Failed to update JSON file:', error);
    throw error;
  }
};

// Load service from localStorage if it exists, otherwise use default
const loadServiceWithOverrides = (defaultService: ServiceConfig): ServiceConfig => {
  try {
    const storageKey = `service_config_${defaultService.serviceId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const storedConfig = JSON.parse(stored);
      // Merge stored base settings with default config - handle nested structure
      return {
        ...defaultService,
        baseSettings: {
          laborSettings: { ...defaultService.baseSettings.laborSettings, ...storedConfig.baseSettings?.laborSettings },
          materialSettings: { ...defaultService.baseSettings.materialSettings, ...storedConfig.baseSettings?.materialSettings },
          businessSettings: { ...defaultService.baseSettings.businessSettings, ...storedConfig.baseSettings?.businessSettings }
        },
        lastModified: storedConfig.lastModified || defaultService.lastModified
      };
    }
  } catch (error) {
    console.error('Error loading stored service configuration:', error);
  }
  
  return defaultService;
};

export const useServiceBaseSettings = (companyId?: string, userId?: string): ServiceBaseSettingsStore => {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // CRITICAL FIX: Load services from Supabase instead of JSON files
  useEffect(() => {
    const loadServicesFromSupabase = async () => {
      try {
        setIsLoading(true);

        if (!companyId) {
          console.warn('⚠️ No company_id available, loading from JSON files only');
          const defaultServices = loadServices();
          const servicesWithOverrides = defaultServices.map(loadServiceWithOverrides);
          setServices(servicesWithOverrides);
          setError(null);
          setIsLoading(false);
          return;
        }

        const supabase = getSupabase();
        const { data, error: fetchError } = await supabase
          .from('service_pricing_configs')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (fetchError) {
          console.error('❌ [SERVICES STORE] Error fetching from Supabase:', fetchError);
          throw fetchError;
        }

        if (data && data.length > 0) {
          // Convert Supabase rows to ServiceConfig format
          const supabaseServices = data.map(row => ({
            service: row.service_name,
            serviceId: row.service_name,
            category: 'Hardscaping', // Could be stored in DB if needed
            baseSettings: {
              laborSettings: {
                hourlyLaborRate: { value: parseFloat(row.hourly_labor_rate), unit: '$/hour/person', label: 'Labor Price Per Hour' },
                optimalTeamSize: { value: row.optimal_team_size, unit: 'people', label: 'Optimal Team Size' },
                baseProductivity: { value: parseFloat(row.base_productivity), unit: 'sqft/day', label: 'Base Productivity Rate' }
              },
              materialSettings: {
                baseMaterialCost: { value: parseFloat(row.base_material_cost), unit: '$/sqft', label: 'Base Material Cost' }
              },
              businessSettings: {
                profitMarginTarget: { value: parseFloat(row.profit_margin), unit: 'percentage', label: 'Profit Margin Target' }
              }
            },
            variables: row.variables_config || {},
            variables_config: row.variables_config || {},
            lastModified: new Date(row.updated_at).toISOString().split('T')[0]
          }));

          setServices(supabaseServices);
          setError(null);
        } else {
          // No data in Supabase, fall back to JSON files
          console.warn('⚠️ No services found in Supabase, falling back to JSON files');
          const defaultServices = loadServices();
          const servicesWithOverrides = defaultServices.map(loadServiceWithOverrides);
          setServices(servicesWithOverrides);
          setError(null);
        }
      } catch (err) {
        console.error('❌ [SERVICES STORE] Error loading services:', err);
        setError(err instanceof Error ? err.message : 'Failed to load services');

        // Fallback to JSON files on error
        try {
          const defaultServices = loadServices();
          const servicesWithOverrides = defaultServices.map(loadServiceWithOverrides);
          setServices(servicesWithOverrides);
        } catch (fallbackErr) {
          console.error('❌ [SERVICES STORE] Fallback also failed:', fallbackErr);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadServicesFromSupabase();
  }, [companyId]); // Re-load when companyId changes

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('service_config_') && e.newValue) {
        try {
          const serviceId = e.key.replace('service_config_', '');
          const updatedService = JSON.parse(e.newValue);
          
          setServices(prev => prev.map(service => 
            service.serviceId === serviceId ? updatedService : service
          ));
        } catch (error) {
          console.error('Error handling storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateBaseSetting = useCallback(async (serviceId: string, setting: string, value: number) => {
    const updatedServices = services.map(service => {
      if (service.serviceId === serviceId) {
        // Handle nested settings path (e.g., "laborSettings.hourlyLaborRate")
        const [category, settingKey] = setting.split('.');

        const updatedService = {
          ...service,
          baseSettings: {
            ...service.baseSettings,
            [category]: {
              ...service.baseSettings[category],
              [settingKey]: {
                ...service.baseSettings[category][settingKey],
                value: value
              }
            }
          },
          lastModified: new Date().toISOString().split('T')[0]
        };

        // Save to Supabase using ServiceConfigManager (guaranteed cache clear)
        serviceConfigManager.saveServiceConfig(serviceId, updatedService, companyId, userId).catch(error => {
          console.error('Failed to save base setting:', error);
          alert('Failed to save configuration. Please try again.');
        });

        return updatedService;
      }
      return service;
    });

    // CRITICAL FIX: Actually update state with new services array
    setServices(updatedServices);
  }, [services, companyId, userId]);

  const updateServiceVariables = useCallback(async (serviceId: string, updates: ServiceVariableUpdate) => {
    // Find the service to update
    const service = services.find(s => s.serviceId === serviceId);
    if (!service) {
      console.error('Service not found:', serviceId);
      return;
    }

    const updatedVariables = { ...service.variables };

    // Update equipment costs
    if (updates.equipmentCosts && updatedVariables.excavation?.equipmentRequired?.options) {
      const equipmentOptions = updatedVariables.excavation.equipmentRequired.options;
      if (updates.equipmentCosts.handTools !== undefined) {
        equipmentOptions.handTools.value = updates.equipmentCosts.handTools;
      }
      if (updates.equipmentCosts.attachments !== undefined) {
        equipmentOptions.attachments.value = updates.equipmentCosts.attachments;
      }
      if (updates.equipmentCosts.lightMachinery !== undefined) {
        equipmentOptions.lightMachinery.value = updates.equipmentCosts.lightMachinery;
      }
      if (updates.equipmentCosts.heavyMachinery !== undefined) {
        equipmentOptions.heavyMachinery.value = updates.equipmentCosts.heavyMachinery;
      }
    }

    // Update cutting complexity
    if (updates.cuttingComplexity && updatedVariables.materials?.cuttingComplexity?.options) {
      const cuttingOptions = updatedVariables.materials.cuttingComplexity.options;
      Object.entries(updates.cuttingComplexity).forEach(([level, values]) => {
        if (cuttingOptions[level] && values) {
          if (values.laborPercentage !== undefined) {
            cuttingOptions[level].laborPercentage = values.laborPercentage;
          }
          if (values.materialWaste !== undefined) {
            cuttingOptions[level].materialWaste = values.materialWaste;
          }
        }
      });
    }

    // Update labor multipliers - CRITICAL FIX: Sync both value AND multiplier
    if (updates.laborMultipliers) {
      if (updates.laborMultipliers.tearoutGrass !== undefined && updatedVariables.excavation?.tearoutComplexity?.options?.grass) {
        const value = updates.laborMultipliers.tearoutGrass;
        updatedVariables.excavation.tearoutComplexity.options.grass.value = value;
        updatedVariables.excavation.tearoutComplexity.options.grass.multiplier = calculateMultiplierFromPercentage(value);
      }
      if (updates.laborMultipliers.tearoutConcrete !== undefined && updatedVariables.excavation?.tearoutComplexity?.options?.concrete) {
        const value = updates.laborMultipliers.tearoutConcrete;
        updatedVariables.excavation.tearoutComplexity.options.concrete.value = value;
        updatedVariables.excavation.tearoutComplexity.options.concrete.multiplier = calculateMultiplierFromPercentage(value);
      }
      if (updates.laborMultipliers.tearoutAsphalt !== undefined && updatedVariables.excavation?.tearoutComplexity?.options?.asphalt) {
        const value = updates.laborMultipliers.tearoutAsphalt;
        updatedVariables.excavation.tearoutComplexity.options.asphalt.value = value;
        updatedVariables.excavation.tearoutComplexity.options.asphalt.multiplier = calculateMultiplierFromPercentage(value);
      }
      if (updates.laborMultipliers.accessEasy !== undefined && updatedVariables.siteAccess?.accessDifficulty?.options?.easy) {
        const value = updates.laborMultipliers.accessEasy;
        updatedVariables.siteAccess.accessDifficulty.options.easy.value = value;
        updatedVariables.siteAccess.accessDifficulty.options.easy.multiplier = calculateMultiplierFromPercentage(value);
      }
      if (updates.laborMultipliers.accessModerate !== undefined && updatedVariables.siteAccess?.accessDifficulty?.options?.moderate) {
        const value = updates.laborMultipliers.accessModerate;
        updatedVariables.siteAccess.accessDifficulty.options.moderate.value = value;
        updatedVariables.siteAccess.accessDifficulty.options.moderate.multiplier = calculateMultiplierFromPercentage(value);
      }
      if (updates.laborMultipliers.accessDifficult !== undefined && updatedVariables.siteAccess?.accessDifficulty?.options?.difficult) {
        const value = updates.laborMultipliers.accessDifficult;
        updatedVariables.siteAccess.accessDifficulty.options.difficult.value = value;
        updatedVariables.siteAccess.accessDifficulty.options.difficult.multiplier = calculateMultiplierFromPercentage(value);
      }
      if (updates.laborMultipliers.teamTwoPerson !== undefined && updatedVariables.labor?.teamSize?.options?.twoPerson) {
        const value = updates.laborMultipliers.teamTwoPerson;
        updatedVariables.labor.teamSize.options.twoPerson.value = value;
        updatedVariables.labor.teamSize.options.twoPerson.multiplier = calculateMultiplierFromPercentage(value);
      }
      if (updates.laborMultipliers.teamThreePlus !== undefined && updatedVariables.labor?.teamSize?.options?.threePlus) {
        const value = updates.laborMultipliers.teamThreePlus;
        updatedVariables.labor.teamSize.options.threePlus.value = value;
        updatedVariables.labor.teamSize.options.threePlus.multiplier = calculateMultiplierFromPercentage(value);
      }
    }

    // Update material settings - CRITICAL FIX: Sync both value AND multiplier
    if (updates.materialSettings) {
      if (updates.materialSettings.standardGrade !== undefined && updatedVariables.materials?.paverStyle?.options?.standard) {
        const value = updates.materialSettings.standardGrade;
        updatedVariables.materials.paverStyle.options.standard.value = value;
        updatedVariables.materials.paverStyle.options.standard.multiplier = calculateMultiplierFromPercentage(value);
      }
      if (updates.materialSettings.premiumGrade !== undefined && updatedVariables.materials?.paverStyle?.options?.premium) {
        const value = updates.materialSettings.premiumGrade;
        updatedVariables.materials.paverStyle.options.premium.value = value;
        updatedVariables.materials.paverStyle.options.premium.multiplier = calculateMultiplierFromPercentage(value);
      }
    }

    // Update complexity settings - CRITICAL FIX: Convert percentage to both value AND multiplier
    if (updates.complexitySettings && updatedVariables.complexity?.overallComplexity?.options) {
      const complexityOptions = updatedVariables.complexity.overallComplexity.options;

      if (updates.complexitySettings.simple !== undefined && complexityOptions.simple) {
        // Input is percentage (0, 10, 30, 50), convert to value + multiplier
        const percentageValue = updates.complexitySettings.simple;
        complexityOptions.simple.value = percentageValue;
        complexityOptions.simple.multiplier = calculateMultiplierFromPercentage(percentageValue);
      }
      if (updates.complexitySettings.standard !== undefined && complexityOptions.standard) {
        const percentageValue = updates.complexitySettings.standard;
        complexityOptions.standard.value = percentageValue;
        complexityOptions.standard.multiplier = calculateMultiplierFromPercentage(percentageValue);
      }
      if (updates.complexitySettings.complex !== undefined && complexityOptions.complex) {
        const percentageValue = updates.complexitySettings.complex;
        complexityOptions.complex.value = percentageValue;
        complexityOptions.complex.multiplier = calculateMultiplierFromPercentage(percentageValue);
      }
      if (updates.complexitySettings.extreme !== undefined && complexityOptions.extreme) {
        const percentageValue = updates.complexitySettings.extreme;
        complexityOptions.extreme.value = percentageValue;
        complexityOptions.extreme.multiplier = calculateMultiplierFromPercentage(percentageValue);
      }
    }

    // Update obstacle removal costs (flat_additional_cost type - value only, no multiplier)
    if (updates.obstacleSettings && updatedVariables.siteAccess?.obstacleRemoval?.options) {
      const obstacleOptions = updatedVariables.siteAccess.obstacleRemoval.options;
      if (updates.obstacleSettings.none !== undefined && obstacleOptions.none) {
        obstacleOptions.none.value = updates.obstacleSettings.none;
      }
      if (updates.obstacleSettings.minor !== undefined && obstacleOptions.minor) {
        obstacleOptions.minor.value = updates.obstacleSettings.minor;
      }
      if (updates.obstacleSettings.major !== undefined && obstacleOptions.major) {
        obstacleOptions.major.value = updates.obstacleSettings.major;
      }
    }

    // ============================================================================
    // GENERIC HANDLER: Process any JSONB category updates (for new service templates)
    // ============================================================================
    // This handles updates from all service template types:
    // - calculationSettings (VOLUME_BASED_TEMPLATE)
    // - dimensions, installation (LINEAR_MEASUREMENT_TEMPLATE)
    // - labor, scheduling (SIMPLE_HOURLY_TEMPLATE)
    // - Any future categories from new templates

    const knownCategories = [
      'equipmentCosts', 'cuttingComplexity', 'laborMultipliers',
      'materialSettings', 'complexitySettings', 'obstacleSettings'
    ];

    Object.keys(updates).forEach(updateKey => {
      // Skip if this is a known/handled category
      if (knownCategories.includes(updateKey)) return;

      const updateValue = updates[updateKey];
      if (!updateValue || typeof updateValue !== 'object') return;

      // Check if this category exists in the service's variables_config
      if (!updatedVariables[updateKey]) {
        updatedVariables[updateKey] = updateValue;
        return;
      }

      // Deep merge: Update each variable's default value while preserving structure
      Object.entries(updateValue).forEach(([varKey, varValue]: [string, any]) => {
        // Skip metadata fields
        if (['label', 'description'].includes(varKey)) return;

        if (updatedVariables[updateKey][varKey]) {
          // Variable exists, update its default value
          if (typeof varValue === 'object' && 'default' in varValue) {
            // Format: { default: value, ... } (from ExcavationSpecificsModal)
            updatedVariables[updateKey][varKey] = {
              ...updatedVariables[updateKey][varKey],
              ...varValue
            };
          } else {
            // Format: direct value (simple updates)
            updatedVariables[updateKey][varKey] = {
              ...updatedVariables[updateKey][varKey],
              default: varValue
            };
          }
        } else {
          // New variable, add it
          updatedVariables[updateKey][varKey] = varValue;
        }
      });
    });

    const updatedService = {
      ...service,
      variables: updatedVariables,
      variables_config: updatedVariables, // Also update variables_config for excavation & new services
      lastModified: new Date().toISOString().split('T')[0]
    };

    try {
      await serviceConfigManager.saveServiceConfig(serviceId, updatedService, companyId, userId);

      // Update local state after successful save
      setServices(prev => prev.map(s => s.serviceId === serviceId ? updatedService : s));
    } catch (error) {
      console.error('Failed to save service variables:', error);
      alert('Failed to save service variables: ' + (error as Error).message);
      throw error;
    }
  }, [services, companyId, userId]);

  const getService = useCallback((serviceId: string): ServiceConfig | undefined => {
    return services.find(service => service.serviceId === serviceId);
  }, [services]);

  // Refresh services from Supabase (called when modal opens)
  const refreshServices = useCallback(async () => {
    if (!companyId) {
      return;
    }

    try {
      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from('service_pricing_configs')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (fetchError) {
        console.error('Error refreshing from Supabase:', fetchError);
        return;
      }

      if (data && data.length > 0) {

        // Convert Supabase rows to ServiceConfig format
        const supabaseServices = data.map(row => ({
          service: row.service_name,
          serviceId: row.service_name,
          category: 'Hardscaping',
          baseSettings: {
            laborSettings: {
              hourlyLaborRate: { value: parseFloat(row.hourly_labor_rate), unit: '$/hour/person', label: 'Labor Price Per Hour' },
              optimalTeamSize: { value: row.optimal_team_size, unit: 'people', label: 'Optimal Team Size' },
              baseProductivity: { value: parseFloat(row.base_productivity), unit: 'sqft/day', label: 'Base Productivity Rate' }
            },
            materialSettings: {
              baseMaterialCost: { value: parseFloat(row.base_material_cost), unit: '$/sqft', label: 'Base Material Cost' }
            },
            businessSettings: {
              profitMarginTarget: { value: parseFloat(row.profit_margin), unit: 'percentage', label: 'Profit Margin Target' }
            }
          },
          variables: row.variables_config || {},
          lastModified: new Date(row.updated_at).toISOString().split('T')[0]
        }));

        setServices(supabaseServices);
      }
    } catch (err) {
      console.error('❌ [SERVICES STORE] Error refreshing services:', err);
    }
  }, [companyId]);

  return {
    services,
    isLoading,
    error,
    updateBaseSetting,
    updateServiceVariables,
    getService,
    refreshServices
  };
};