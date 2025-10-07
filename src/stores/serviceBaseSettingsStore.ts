import { useState, useCallback, useEffect } from 'react';
import { getSupabase } from '../services/supabase';
import { masterPricingEngine } from '../pricing-system/core/calculations/master-pricing-engine';
import { serviceConfigManager } from '../services/ServiceConfigManager';

// Import the JSON configurations
import paverPatioConfigJson from '../pricing-system/config/paver-patio-formula.json';
import excavationConfigJson from '../pricing-system/config/excavation-removal-formula.json';

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
}

interface ServiceBaseSettingsStore {
  services: ServiceConfig[];
  isLoading: boolean;
  error: string | null;
  updateBaseSetting: (serviceId: string, setting: string, value: number) => void;
  updateServiceVariables: (serviceId: string, updates: ServiceVariableUpdate) => void;
  getService: (serviceId: string) => ServiceConfig | undefined;
}

// Load services from JSON configurations
const loadServices = (): ServiceConfig[] => {
  try {
    const paverPatioConfig = paverPatioConfigJson as any;
    const excavationConfig = excavationConfigJson as any;

    return [
      {
        service: paverPatioConfig.service,
        serviceId: paverPatioConfig.serviceId,
        category: paverPatioConfig.category || 'Hardscaping',
        baseSettings: paverPatioConfig.baseSettings,
        variables: paverPatioConfig.variables,
        lastModified: paverPatioConfig.lastModified
      },
      {
        service: excavationConfig.service,
        serviceId: excavationConfig.serviceId,
        category: excavationConfig.category || 'Excavation',
        baseSettings: excavationConfig.baseSettings,
        variables: excavationConfig.variables,
        lastModified: excavationConfig.lastModified
      }
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

    console.log('🚀 [SERVICES] Saving configuration to Supabase:', {
      serviceId,
      companyId,
      userId,
      hasBaseSettings: !!updatedService.baseSettings
    });

    // STEP 1: Get authenticated Supabase client (FIXED: was creating new unauthenticated client)
    const supabase = getSupabase();

    // 🔍 DEBUG: Check auth session before save
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔍 [SAVE DEBUG] Auth session status:', {
      hasSession: !!session,
      authUid: session?.user?.id,
      userEmail: session?.user?.email
    });

    const supabaseData = {
      company_id: companyId,
      service_name: serviceId,
      hourly_labor_rate: updatedService.baseSettings?.laborSettings?.hourlyLaborRate?.value || 25,
      optimal_team_size: updatedService.baseSettings?.laborSettings?.optimalTeamSize?.value || 3,
      base_productivity: updatedService.baseSettings?.laborSettings?.baseProductivity?.value || 50,
      base_material_cost: updatedService.baseSettings?.materialSettings?.baseMaterialCost?.value || 5.84,
      profit_margin: updatedService.baseSettings?.businessSettings?.profitMarginTarget?.value || 0.20,
      variables_config: updatedService.variables || {},
      default_variables: {},
      is_active: true,
      version: '2.0.0',
      updated_at: new Date().toISOString(),
      updated_by: userId || null  // FIXED: Use userId instead of companyId
    };

    console.log('🔍 [SAVE DEBUG] Upsert data:', {
      company_id: supabaseData.company_id,
      service_name: supabaseData.service_name,
      updated_by: supabaseData.updated_by,
      hasVariables: !!supabaseData.variables_config
    });

    // STEP 2: Upsert to Supabase (update if exists, insert if not)
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

    console.log('✅ [SERVICES] Configuration saved to Supabase successfully');

    // CRITICAL: Clear master engine cache so Quick Calculator sees fresh data
    masterPricingEngine.clearCache(serviceId, companyId);
    console.log('🧹 [SERVICES] Cleared master engine cache');

    // STEP 3: Also store in localStorage for immediate local access
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

    console.log(`✅ [SERVICES] Service ${serviceId} configuration updated (Supabase + localStorage)`);
  } catch (error) {
    console.error('❌ [SERVICES] Error saving service configuration:', error);
    // Fallback to legacy localStorage method if Supabase fails
    console.warn('🔄 [SERVICES] Falling back to localStorage method');
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

    console.log(`✅ [LEGACY] Service ${serviceId} configuration updated (localStorage + JSON file sync)`);
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

    console.log('✅ JSON file updated successfully');
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

  // Initialize services
  useEffect(() => {
    try {
      const defaultServices = loadServices();
      const servicesWithOverrides = defaultServices.map(loadServiceWithOverrides);
      setServices(servicesWithOverrides);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
      console.error('Service loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    setServices(prev => {
      const updatedServices = prev.map(service => {
        if (service.serviceId === serviceId) {
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

          // Update labor multipliers
          if (updates.laborMultipliers) {
            if (updates.laborMultipliers.tearoutGrass !== undefined && updatedVariables.excavation?.tearoutComplexity?.options?.grass) {
              updatedVariables.excavation.tearoutComplexity.options.grass.value = updates.laborMultipliers.tearoutGrass;
            }
            if (updates.laborMultipliers.tearoutConcrete !== undefined && updatedVariables.excavation?.tearoutComplexity?.options?.concrete) {
              updatedVariables.excavation.tearoutComplexity.options.concrete.value = updates.laborMultipliers.tearoutConcrete;
            }
            if (updates.laborMultipliers.tearoutAsphalt !== undefined && updatedVariables.excavation?.tearoutComplexity?.options?.asphalt) {
              updatedVariables.excavation.tearoutComplexity.options.asphalt.value = updates.laborMultipliers.tearoutAsphalt;
            }
            if (updates.laborMultipliers.accessEasy !== undefined && updatedVariables.siteAccess?.accessDifficulty?.options?.easy) {
              updatedVariables.siteAccess.accessDifficulty.options.easy.value = updates.laborMultipliers.accessEasy;
            }
            if (updates.laborMultipliers.accessModerate !== undefined && updatedVariables.siteAccess?.accessDifficulty?.options?.moderate) {
              updatedVariables.siteAccess.accessDifficulty.options.moderate.value = updates.laborMultipliers.accessModerate;
            }
            if (updates.laborMultipliers.accessDifficult !== undefined && updatedVariables.siteAccess?.accessDifficulty?.options?.difficult) {
              updatedVariables.siteAccess.accessDifficulty.options.difficult.value = updates.laborMultipliers.accessDifficult;
            }
            if (updates.laborMultipliers.teamTwoPerson !== undefined && updatedVariables.labor?.teamSize?.options?.twoPerson) {
              updatedVariables.labor.teamSize.options.twoPerson.value = updates.laborMultipliers.teamTwoPerson;
            }
            if (updates.laborMultipliers.teamThreePlus !== undefined && updatedVariables.labor?.teamSize?.options?.threePlus) {
              updatedVariables.labor.teamSize.options.threePlus.value = updates.laborMultipliers.teamThreePlus;
            }
          }

          // Update material settings
          if (updates.materialSettings) {
            if (updates.materialSettings.standardGrade !== undefined && updatedVariables.materials?.paverStyle?.options?.standard) {
              updatedVariables.materials.paverStyle.options.standard.value = updates.materialSettings.standardGrade;
            }
            if (updates.materialSettings.premiumGrade !== undefined && updatedVariables.materials?.paverStyle?.options?.premium) {
              updatedVariables.materials.paverStyle.options.premium.value = updates.materialSettings.premiumGrade;
            }
          }

          const updatedService = {
            ...service,
            variables: updatedVariables,
            lastModified: new Date().toISOString().split('T')[0]
          };

          // Save to Supabase - FIXED: Now passing userId
          console.log('🎯 [UPDATE VARIABLES] Attempting save:', {
            serviceId,
            hasCompanyId: !!companyId,
            companyId,
            hasUserId: !!userId,
            userId,
            hasVariables: !!updatedService.variables,
            variableKeys: Object.keys(updatedService.variables || {})
          });

          try {
            await serviceConfigManager.saveServiceConfig(serviceId, updatedService, companyId, userId);
            console.log('✅ [UPDATE VARIABLES] Save successful');
          } catch (error) {
            console.error('❌ [UPDATE VARIABLES] Save FAILED:', error);
            alert('Failed to save service variables: ' + (error as Error).message);
            throw error; // Re-throw to show user
          }

          return updatedService;
        }
        return service;
      });

      return updatedServices;
    });
  }, [companyId, userId]); // FIXED: Added dependencies to prevent stale closure

  const getService = useCallback((serviceId: string): ServiceConfig | undefined => {
    return services.find(service => service.serviceId === serviceId);
  }, [services]);

  return {
    services,
    isLoading,
    error,
    updateBaseSetting,
    updateServiceVariables,
    getService
  };
};