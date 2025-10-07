/**
 * ServiceConfigManager - Centralized Service Configuration Management
 *
 * CRITICAL: This is the ONLY way to save service configs.
 * Guarantees cache clearing for real-time Quick Calculator updates.
 *
 * ⚠️ DO NOT bypass by calling supabase.upsert() directly!
 */

import { getSupabase } from './supabase';
import { masterPricingEngine } from '../pricing-system/core/calculations/master-pricing-engine';

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

export interface ServiceConfig {
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

export class ServiceConfigManager {
  private static instance: ServiceConfigManager;

  private constructor() {
    console.log('🏗️ [SERVICE MANAGER] Initialized');
  }

  public static getInstance(): ServiceConfigManager {
    if (!ServiceConfigManager.instance) {
      ServiceConfigManager.instance = new ServiceConfigManager();
    }
    return ServiceConfigManager.instance;
  }

  /**
   * Save service configuration to Supabase
   * AUTOMATICALLY clears cache - guaranteed!
   */
  public async saveServiceConfig(
    serviceId: string,
    configData: ServiceConfig,
    companyId: string,
    userId?: string
  ): Promise<boolean> {
    console.log('🚀 [SERVICE MANAGER] Starting save:', {
      serviceId,
      companyId,
      userId,
      hasBaseSettings: !!configData.baseSettings,
      hasVariables: !!configData.variables
    });

    try {
      // Validate
      if (!companyId || !serviceId) {
        throw new Error('Missing companyId or serviceId');
      }

      const supabase = getSupabase();

      // Prepare Supabase data
      const supabaseData = {
        company_id: companyId,
        service_name: serviceId,
        hourly_labor_rate: configData.baseSettings?.laborSettings?.hourlyLaborRate?.value || 25,
        optimal_team_size: configData.baseSettings?.laborSettings?.optimalTeamSize?.value || 3,
        base_productivity: configData.baseSettings?.laborSettings?.baseProductivity?.value || 50,
        base_material_cost: configData.baseSettings?.materialSettings?.baseMaterialCost?.value || 5.84,
        profit_margin: configData.baseSettings?.businessSettings?.profitMarginTarget?.value || 0.20,
        variables_config: configData.variables || {},
        default_variables: {},
        is_active: true,
        version: '2.0.0',
        updated_at: new Date().toISOString(),
        updated_by: userId || null
      };

      console.log('💾 [SERVICE MANAGER] Saving to Supabase:', {
        table: 'service_pricing_configs',
        service_name: supabaseData.service_name,
        hasVariablesConfig: Object.keys(supabaseData.variables_config).length > 0,
        variableKeys: Object.keys(supabaseData.variables_config)
      });

      // Save to Supabase
      const { error } = await supabase
        .from('service_pricing_configs')
        .upsert(supabaseData, {
          onConflict: 'company_id,service_name'
        });

      if (error) {
        console.error('❌ [SERVICE MANAGER] Supabase error:', error);
        throw error;
      }

      console.log('✅ [SERVICE MANAGER] Saved to Supabase');

      // CRITICAL: Clear master engine cache
      masterPricingEngine.clearCache(serviceId, companyId);
      console.log('🧹 [SERVICE MANAGER] Cache cleared automatically');

      // 🔍 DEBUG: Log what was saved to variables_config
      console.log('🔍 [SERVICE MANAGER DEBUG] Saved variables_config:', {
        hasVariables: !!supabaseData.variables_config,
        variableKeys: Object.keys(supabaseData.variables_config || {}),
        premiumMaterialValue: supabaseData.variables_config?.materials?.paverStyle?.options?.premium?.value,
        fullVariablesConfig: JSON.stringify(supabaseData.variables_config, null, 2).substring(0, 500) + '...'
      });

      return true;
    } catch (error) {
      console.error('💥 [SERVICE MANAGER] Save failed:', error);
      throw error;
    }
  }

  /**
   * Create new service from template
   */
  public async createService(
    serviceId: string,
    serviceName: string,
    category: string,
    companyId: string,
    userId?: string,
    template?: ServiceConfig
  ): Promise<boolean> {
    console.log('🆕 [SERVICE MANAGER] Creating new service:', {
      serviceId,
      serviceName,
      category,
      companyId,
      usingTemplate: !!template
    });

    const newService: ServiceConfig = template || this.getDefaultTemplate(serviceId, serviceName, category);

    return this.saveServiceConfig(serviceId, newService, companyId, userId);
  }

  /**
   * Get default service template
   */
  private getDefaultTemplate(serviceId: string, serviceName: string, category: string): ServiceConfig {
    return {
      service: serviceName,
      serviceId: serviceId,
      category: category,
      baseSettings: {
        laborSettings: {
          hourlyLaborRate: {
            value: 25,
            unit: '$/hr',
            label: 'Hourly Labor Rate',
            description: 'Base labor rate per hour',
            adminEditable: true,
            validation: { min: 10, max: 200, step: 1 }
          },
          optimalTeamSize: {
            value: 3,
            unit: 'people',
            label: 'Optimal Team Size',
            description: 'Standard team size for this service',
            adminEditable: true,
            validation: { min: 1, max: 10, step: 1 }
          },
          baseProductivity: {
            value: 50,
            unit: 'sqft/hr',
            label: 'Base Productivity',
            description: 'Square feet completed per hour',
            adminEditable: true,
            validation: { min: 10, max: 500, step: 5 }
          }
        },
        materialSettings: {
          baseMaterialCost: {
            value: 5.84,
            unit: '$/sqft',
            label: 'Base Material Cost',
            description: 'Material cost per square foot',
            adminEditable: true,
            validation: { min: 0, max: 50, step: 0.1 }
          }
        },
        businessSettings: {
          profitMarginTarget: {
            value: 0.20,
            unit: '%',
            label: 'Profit Margin Target',
            description: 'Desired profit margin percentage',
            adminEditable: true,
            validation: { min: 0.05, max: 0.50, step: 0.01 }
          }
        }
      },
      variables: {},
      lastModified: new Date().toISOString().split('T')[0]
    };
  }
}

// Export singleton instance
export const serviceConfigManager = ServiceConfigManager.getInstance();
