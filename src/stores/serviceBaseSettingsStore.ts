import { useState, useCallback, useEffect } from 'react';

// Import the JSON configuration
import paverPatioConfigJson from '../config/paver-patio-formula.json';

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
    minimal?: { fixedLaborHours?: number; materialWaste?: number };
    moderate?: { fixedLaborHours?: number; materialWaste?: number };
    complex?: { fixedLaborHours?: number; materialWaste?: number };
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
    economyGrade?: number;
    premiumGrade?: number;
    patternMinimal?: number;
    patternSome?: number;
    patternExtensive?: number;
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

// Load services from JSON configuration
const loadServices = (): ServiceConfig[] => {
  try {
    // Currently we only have paver patio service, but this can be extended
    const paverPatioConfig = paverPatioConfigJson as any;
    
    return [{
      service: paverPatioConfig.service,
      serviceId: paverPatioConfig.serviceId,
      category: paverPatioConfig.category || 'Hardscaping',
      baseSettings: paverPatioConfig.baseSettings,
      variables: paverPatioConfig.variables,
      lastModified: paverPatioConfig.lastModified
    }];
  } catch (error) {
    console.error('Error loading services configuration:', error);
    return [];
  }
};

// Save updated configuration to localStorage (simulating JSON file update)
const saveServiceConfig = (serviceId: string, updatedService: ServiceConfig) => {
  try {
    // For now, we'll store in localStorage
    // In production, this would write back to the JSON file
    const storageKey = `service_config_${serviceId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedService));
    
    // Also store the update timestamp
    const updateInfo = {
      serviceId,
      timestamp: new Date().toISOString(),
      lastModified: new Date().toISOString().split('T')[0]
    };
    localStorage.setItem(`service_update_${serviceId}`, JSON.stringify(updateInfo));
    
    // Broadcast change to other tabs/windows
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: JSON.stringify(updatedService),
      storageArea: localStorage
    }));
    
    console.log(`✅ Service ${serviceId} configuration updated`);
  } catch (error) {
    console.error('Error saving service configuration:', error);
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

export const useServiceBaseSettings = (): ServiceBaseSettingsStore => {
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

  const updateBaseSetting = useCallback((serviceId: string, setting: string, value: number) => {
    setServices(prev => {
      const updatedServices = prev.map(service => {
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

          // Save to localStorage
          try {
            saveServiceConfig(serviceId, updatedService);
          } catch (error) {
            console.error('Failed to save service configuration:', error);
          }

          return updatedService;
        }
        return service;
      });

      return updatedServices;
    });
  }, []);

  const updateServiceVariables = useCallback((serviceId: string, updates: ServiceVariableUpdate) => {
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
                if (values.fixedLaborHours !== undefined) {
                  cuttingOptions[level].fixedLaborHours = values.fixedLaborHours;
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
            if (updates.materialSettings.economyGrade !== undefined && updatedVariables.materials?.paverStyle?.options?.economy) {
              updatedVariables.materials.paverStyle.options.economy.value = updates.materialSettings.economyGrade;
            }
            if (updates.materialSettings.premiumGrade !== undefined && updatedVariables.materials?.paverStyle?.options?.premium) {
              updatedVariables.materials.paverStyle.options.premium.value = updates.materialSettings.premiumGrade;
            }
            if (updates.materialSettings.patternMinimal !== undefined && updatedVariables.materials?.patternComplexity?.options?.minimal) {
              updatedVariables.materials.patternComplexity.options.minimal.wastePercentage = updates.materialSettings.patternMinimal;
            }
            if (updates.materialSettings.patternSome !== undefined && updatedVariables.materials?.patternComplexity?.options?.some) {
              updatedVariables.materials.patternComplexity.options.some.wastePercentage = updates.materialSettings.patternSome;
            }
            if (updates.materialSettings.patternExtensive !== undefined && updatedVariables.materials?.patternComplexity?.options?.extensive) {
              updatedVariables.materials.patternComplexity.options.extensive.wastePercentage = updates.materialSettings.patternExtensive;
            }
          }

          const updatedService = {
            ...service,
            variables: updatedVariables,
            lastModified: new Date().toISOString().split('T')[0]
          };

          // Save to localStorage
          try {
            saveServiceConfig(serviceId, updatedService);
          } catch (error) {
            console.error('Failed to save service variables:', error);
          }

          return updatedService;
        }
        return service;
      });

      return updatedServices;
    });
  }, []);

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