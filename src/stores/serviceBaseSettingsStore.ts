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
    [key: string]: BaseSetting;
  };
  variables?: any;
  lastModified: string;
}

interface ServiceBaseSettingsStore {
  services: ServiceConfig[];
  isLoading: boolean;
  error: string | null;
  updateBaseSetting: (serviceId: string, setting: string, value: number) => void;
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
      // Merge stored base settings with default config
      return {
        ...defaultService,
        baseSettings: { ...defaultService.baseSettings, ...storedConfig.baseSettings },
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
          const updatedService = {
            ...service,
            baseSettings: {
              ...service.baseSettings,
              [setting]: {
                ...service.baseSettings[setting],
                value: value
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

  const getService = useCallback((serviceId: string): ServiceConfig | undefined => {
    return services.find(service => service.serviceId === serviceId);
  }, [services]);

  return {
    services,
    isLoading,
    error,
    updateBaseSetting,
    getService
  };
};