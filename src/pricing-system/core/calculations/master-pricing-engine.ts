/**
 * Master Pricing Engine - Single Source of Truth
 *
 * Live Supabase integration for company-wide pricing consistency.
 * Both AI Chat and Quick Calculator use this unified engine.
 *
 * CRITICAL: All pricing changes made in Services tab instantly sync
 * across all users via Supabase real-time subscriptions.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { PaverPatioConfig, PaverPatioValues } from '../master-formula/formula-types';
import paverPatioConfigJson from '../../config/paver-patio-formula.json';
import { getSupabase } from '../../../services/supabase';

export interface PricingConfigRow {
  id: string;
  company_id: string;
  service_name: string;
  hourly_labor_rate: number;
  optimal_team_size: number;
  base_productivity: number;
  base_material_cost: number;
  profit_margin: number;
  variables_config: any;
  default_variables: any;
  is_active: boolean;
  version: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Tier1Results {
  baseHours: number;
  adjustedHours: number;
  totalManHours: number;
  totalDays: number;
  breakdown?: string[];
}

export interface Tier2Results {
  laborCost: number;
  materialCostBase: number;
  materialWasteCost: number;
  totalMaterialCost: number;
  equipmentCost: number;
  obstacleCost: number;
  subtotal: number;
  profit: number;
  total: number;
  pricePerSqft: number;
}

export interface CalculationResult {
  tier1Results: Tier1Results;
  tier2Results: Tier2Results;
  sqft: number;
  inputValues: PaverPatioValues;
  confidence: number;
  calculationDate: string;
}

export class MasterPricingEngine {
  private static instance: MasterPricingEngine;
  private supabase: SupabaseClient;
  private configCache: Map<string, PricingConfigRow> = new Map();
  private subscriptions: Map<string, any> = new Map();

  private constructor() {
    this.supabase = getSupabase();

    // Debug logging for Supabase client initialization
    console.log('🚀 [MASTER ENGINE] Using authenticated Supabase client');
  }

  public static getInstance(): MasterPricingEngine {
    if (!MasterPricingEngine.instance) {
      MasterPricingEngine.instance = new MasterPricingEngine();
    }
    return MasterPricingEngine.instance;
  }

  /**
   * Refresh the Supabase client instance (call after login to pick up auth session)
   */
  public refreshClient(): void {
    this.supabase = getSupabase();
    console.log('🔄 [MASTER ENGINE] Supabase client refreshed to pick up auth session');
  }

  /**
   * Load pricing configuration from Supabase
   * DEV MODE: Uses fallback company_id for development
   */
  public async loadPricingConfig(
    serviceName: string = 'paver_patio_sqft',
    companyId?: string
  ): Promise<PaverPatioConfig> {
    try {
      // Check authentication status
      const { data: { session } } = await this.supabase.auth.getSession();
      console.log('🔐 [MASTER ENGINE] Auth session present?', !!session);
      console.log('🔐 [MASTER ENGINE] User ID:', session?.user?.id);

      // DEV MODE: Use fallback company_id if not provided
      const targetCompanyId = companyId || await this.getDevModeCompanyId();

      console.log('🔍 [MASTER ENGINE] Loading pricing config:', {
        serviceName,
        companyId: targetCompanyId,
        mode: companyId ? 'production' : 'development',
        hasAuth: !!session
      });

      // Check cache first
      const cacheKey = `${targetCompanyId}:${serviceName}`;
      if (this.configCache.has(cacheKey)) {
        console.log('📋 [MASTER ENGINE] Using cached config');
        return this.convertRowToConfig(this.configCache.get(cacheKey)!);
      }

      // Query Supabase with detailed logging
      console.log('🔍 [MASTER ENGINE] Executing Supabase query:', {
        table: 'service_pricing_configs',
        company_id: targetCompanyId,
        service_name: serviceName,
        is_active: true
      });

      const { data, error } = await this.supabase
        .from('service_pricing_configs')
        .select('*')
        .eq('company_id', targetCompanyId)
        .eq('service_name', serviceName)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.error('❌ [MASTER ENGINE] Supabase query error:', error);
        console.log('🔄 [MASTER ENGINE] Falling back to JSON config due to query error');
        return this.getFallbackConfig();
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ [MASTER ENGINE] No pricing config found in Supabase for:', {
          company_id: targetCompanyId,
          service_name: serviceName
        });
        console.log('🔄 [MASTER ENGINE] Falling back to JSON config - no matching records');
        return this.getFallbackConfig();
      }

      const configRow = data[0];
      if (!configRow) {
        console.warn('⚠️ [MASTER ENGINE] No config found, using fallback');
        return this.getFallbackConfig();
      }

      // Cache the result
      this.configCache.set(cacheKey, configRow);

      console.log('✅ [MASTER ENGINE] Config loaded from Supabase:', {
        profitMargin: configRow.profit_margin,
        hourlyRate: configRow.hourly_labor_rate,
        lastUpdated: configRow.updated_at,
        source: 'Supabase Database'
      });

      return this.convertRowToConfig(configRow);

    } catch (error) {
      console.error('💥 [MASTER ENGINE] Failed to load config:', error);
      return this.getFallbackConfig();
    }
  }

  /**
   * Subscribe to real-time pricing config changes
   */
  public subscribeToConfigChanges(
    serviceName: string,
    companyId: string,
    onUpdate: (config: PaverPatioConfig) => void
  ): void {
    const subscriptionKey = `${companyId}:${serviceName}`;

    // Remove existing subscription
    if (this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.get(subscriptionKey).unsubscribe();
    }

    // Create new subscription
    const subscription = this.supabase
      .channel(`pricing_config_${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_pricing_configs',
          filter: `company_id=eq.${companyId} and service_name=eq.${serviceName}`
        },
        async (payload) => {
          console.log('🔄 [MASTER ENGINE] Real-time config update:', payload);

          // Clear cache
          this.configCache.delete(subscriptionKey);

          // Load fresh config
          const newConfig = await this.loadPricingConfig(serviceName, companyId);
          onUpdate(newConfig);
        }
      )
      .subscribe();

    this.subscriptions.set(subscriptionKey, subscription);

    console.log('👂 [MASTER ENGINE] Subscribed to real-time updates:', subscriptionKey);
  }

  /**
   * Update pricing configuration in Supabase
   */
  public async updatePricingConfig(
    serviceName: string,
    updates: Partial<PricingConfigRow>,
    companyId?: string
  ): Promise<boolean> {
    try {
      const targetCompanyId = companyId || await this.getDevModeCompanyId();

      const { error } = await this.supabase
        .from('service_pricing_configs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', targetCompanyId)
        .eq('service_name', serviceName);

      if (error) {
        console.error('❌ [MASTER ENGINE] Update failed:', error);
        return false;
      }

      // Clear cache
      const cacheKey = `${targetCompanyId}:${serviceName}`;
      this.configCache.delete(cacheKey);

      console.log('✅ [MASTER ENGINE] Config updated in Supabase');
      return true;

    } catch (error) {
      console.error('💥 [MASTER ENGINE] Update error:', error);
      return false;
    }
  }

  /**
   * Calculate pricing using live Supabase configuration
   */
  public async calculatePricing(
    values: PaverPatioValues,
    sqft: number = 100,
    serviceName: string = 'paver_patio_sqft',
    companyId?: string
  ): Promise<CalculationResult> {
    // Load live config from Supabase
    const config = await this.loadPricingConfig(serviceName, companyId);

    // Calculate Tier 1 (labor hours)
    const tier1Results = this.calculateTier1(config, values, sqft);

    // Calculate Tier 2 (costs)
    const tier2Results = this.calculateTier2(config, values, tier1Results, sqft);

    return {
      tier1Results,
      tier2Results,
      sqft,
      inputValues: values,
      confidence: 0.9,
      calculationDate: new Date().toISOString()
    };
  }

  /**
   * TIER 1: Calculate labor hours with base-independent percentage system
   */
  private calculateTier1(config: PaverPatioConfig, values: PaverPatioValues, sqft: number): Tier1Results {
    const optimalTeamSize = config?.baseSettings?.laborSettings?.optimalTeamSize?.value ?? 3;
    const baseProductivity = config?.baseSettings?.laborSettings?.baseProductivity?.value ?? 50;

    // Base labor calculation
    const baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;
    let adjustedHours = baseHours;

    // Apply base-independent variable system
    const tearoutPercentage = this.getTearoutPercentage(values.excavation.tearoutComplexity);
    const accessPercentage = this.getAccessPercentage(values.siteAccess.accessDifficulty);
    const teamSizePercentage = this.getTeamSizePercentage(values.labor.teamSize);

    // Apply each variable as independent percentage of base hours
    if (tearoutPercentage > 0) {
      adjustedHours += baseHours * (tearoutPercentage / 100);
    }
    if (accessPercentage > 0) {
      adjustedHours += baseHours * (accessPercentage / 100);
    }
    if (teamSizePercentage > 0) {
      adjustedHours += baseHours * (teamSizePercentage / 100);
    }

    const totalManHours = adjustedHours;
    const totalDays = totalManHours / (optimalTeamSize * 8);

    return {
      baseHours: Math.round(baseHours * 10) / 10,
      adjustedHours: Math.round(adjustedHours * 10) / 10,
      totalManHours: Math.round(totalManHours * 10) / 10,
      totalDays: Math.round(totalDays * 10) / 10
    };
  }

  /**
   * TIER 2: Calculate complete cost breakdown with all 6 components
   */
  private calculateTier2(
    config: PaverPatioConfig,
    values: PaverPatioValues,
    tier1Results: Tier1Results,
    sqft: number
  ): Tier2Results {
    const hourlyRate = config?.baseSettings?.laborSettings?.hourlyLaborRate?.value ?? 25;
    const baseMaterialCost = config?.baseSettings?.materialSettings?.baseMaterialCost?.value ?? 5.84;
    const profitMargin = config?.baseSettings?.businessSettings?.profitMarginTarget?.value ?? 0.20;
    const optimalTeamSize = config?.baseSettings?.laborSettings?.optimalTeamSize?.value ?? 3;

    // 1. Labor costs
    const laborCost = tier1Results.totalManHours * hourlyRate;

    // 2. Material costs with waste
    const materialMultiplier = this.getMaterialMultiplier(values.materials.paverStyle);
    const materialCostBase = baseMaterialCost * sqft * materialMultiplier;

    const cuttingVar = config?.variables?.materials?.cuttingComplexity;
    const cuttingOption = cuttingVar?.options?.[values?.materials?.cuttingComplexity ?? 'minimal'];
    const cuttingWastePercent = cuttingOption?.materialWaste ?? 0;
    const materialWasteCost = materialCostBase * (cuttingWastePercent / 100);
    const totalMaterialCost = materialCostBase + materialWasteCost;

    // 3. Equipment costs
    const projectDays = tier1Results.totalManHours / (optimalTeamSize * 8);
    const equipmentVar = config?.variables?.excavation?.equipmentRequired;
    const equipmentOption = equipmentVar?.options?.[values?.excavation?.equipmentRequired ?? 'handTools'];
    const equipmentCost = (equipmentOption?.value ?? 0) * projectDays;

    // 4. Obstacle costs
    const obstacleVar = config?.variables?.siteAccess?.obstacleRemoval;
    const obstacleOption = obstacleVar?.options?.[values?.siteAccess?.obstacleRemoval ?? 'none'];
    const obstacleCost = obstacleOption?.value ?? 0;

    // 5. Subtotal and profit
    const subtotal = laborCost + totalMaterialCost + equipmentCost + obstacleCost;
    const profit = subtotal * profitMargin;
    const beforeComplexity = subtotal + profit;

    // 6. Apply complexity multiplier
    const complexityMultiplier = this.getComplexityMultiplier(values.complexity.overallComplexity);
    const total = beforeComplexity * complexityMultiplier;

    console.log('💰 [MASTER ENGINE] Tier 2 calculation:', {
      laborCost: laborCost.toFixed(2),
      totalMaterialCost: totalMaterialCost.toFixed(2),
      equipmentCost: equipmentCost.toFixed(2),
      obstacleCost: obstacleCost.toFixed(2),
      subtotal: subtotal.toFixed(2),
      profitMargin: (profitMargin * 100).toFixed(1) + '%',
      profit: profit.toFixed(2),
      complexityMultiplier: complexityMultiplier,
      total: total.toFixed(2)
    });

    return {
      laborCost: Math.round(laborCost * 100) / 100,
      materialCostBase: Math.round(materialCostBase * 100) / 100,
      materialWasteCost: Math.round(materialWasteCost * 100) / 100,
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      equipmentCost: Math.round(equipmentCost * 100) / 100,
      obstacleCost: Math.round(obstacleCost * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      total: Math.round(total * 100) / 100,
      pricePerSqft: Math.round((total / sqft) * 100) / 100
    };
  }

  /**
   * Get development mode company ID (first company in database)
   */
  private async getDevModeCompanyId(): Promise<string> {
    try {
      console.log('🔍 [DEV MODE] Looking up first company ID...');

      const { data, error } = await this.supabase
        .from('companies')
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ [DEV MODE] Query error:', error);
        throw new Error(`Companies query failed: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.error('❌ [DEV MODE] No companies found in database');
        throw new Error('No companies found for dev mode');
      }

      const companyId = data[0].id;
      console.log('✅ [DEV MODE] Using company ID:', companyId);
      return companyId;
    } catch (error) {
      console.error('❌ [DEV MODE] Could not get company ID:', error);
      // Return a fallback UUID for development
      return '00000000-0000-0000-0000-000000000000';
    }
  }

  /**
   * Convert Supabase row to PaverPatioConfig format
   */
  private convertRowToConfig(row: PricingConfigRow): PaverPatioConfig {
    return {
      service: row.service_name,
      serviceId: row.service_name,
      category: "Hardscaping",
      version: row.version,
      lastModified: row.updated_at,
      description: "Live Supabase configuration",
      baseSettings: {
        laborSettings: {
          hourlyLaborRate: { value: row.hourly_labor_rate },
          optimalTeamSize: { value: row.optimal_team_size },
          baseProductivity: { value: row.base_productivity }
        },
        materialSettings: {
          baseMaterialCost: { value: row.base_material_cost }
        },
        businessSettings: {
          profitMarginTarget: { value: row.profit_margin }
        }
      },
      calculationSystem: {
        type: "two_tier",
        description: "Live Supabase configuration",
        tier1: "man_hours_calculation",
        tier2: "cost_calculation"
      },
      variables: row.variables_config
    } as PaverPatioConfig;
  }

  /**
   * Fallback configuration for development/offline mode
   */
  private getFallbackConfig(): PaverPatioConfig {
    console.warn('⚠️ [MASTER ENGINE] Using fallback configuration');

    // Override profit margin to 20% for current setup
    return {
      ...paverPatioConfigJson,
      baseSettings: {
        ...paverPatioConfigJson.baseSettings,
        businessSettings: {
          ...paverPatioConfigJson.baseSettings.businessSettings,
          profitMarginTarget: { value: 0.20 }
        }
      }
    } as PaverPatioConfig;
  }

  // Helper functions
  private getTearoutPercentage(tearoutComplexity: string): number {
    switch (tearoutComplexity) {
      case 'grass': return 0;
      case 'concrete': return 20;
      case 'asphalt': return 30;
      default: return 0;
    }
  }

  private getAccessPercentage(accessDifficulty: string): number {
    switch (accessDifficulty) {
      case 'easy': return 0;
      case 'moderate': return 50;
      case 'difficult': return 100;
      default: return 0;
    }
  }

  private getTeamSizePercentage(teamSize: string): number {
    switch (teamSize) {
      case 'twoPerson': return 40;
      case 'threePlus': return 0;
      default: return 0;
    }
  }

  private getMaterialMultiplier(paverStyle: string): number {
    switch (paverStyle) {
      case 'standard': return 1.0;
      case 'premium': return 1.2;
      default: return 1.0;
    }
  }

  private getComplexityMultiplier(complexity: string | number): number {
    if (typeof complexity === 'number') return complexity;
    switch (complexity) {
      case 'simple': return 1.0;
      case 'standard': return 1.1;
      case 'complex': return 1.3;
      case 'extreme': return 1.5;
      default: return 1.0;
    }
  }
}

// Export singleton instance
export const masterPricingEngine = MasterPricingEngine.getInstance();

/**
 * Get current user's company ID from auth context
 */
const getCurrentUserCompanyId = (): string | undefined => {
  try {
    const storedUser = localStorage.getItem('tradesphere_beta_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      console.log('🔍 [MASTER ENGINE DEBUG] Retrieved user company_id from auth:', {
        hasStoredUser: true,
        userId: userData.id,
        firstName: userData.first_name,
        companyId: userData.company_id,
        companyIdType: typeof userData.company_id,
        companyIdValid: !!(userData.company_id && userData.company_id.length > 10)
      });
      return userData.company_id;
    } else {
      console.warn('🔍 [MASTER ENGINE DEBUG] No stored user found in localStorage');
    }
  } catch (error) {
    console.warn('Could not get user company_id from auth context:', error);
  }
  return undefined;
};

// Export convenience functions with automatic company context
export const loadPricingConfig = (serviceName?: string, companyId?: string) =>
  masterPricingEngine.loadPricingConfig(serviceName, companyId || getCurrentUserCompanyId());

export const calculatePricing = (values: PaverPatioValues, sqft?: number, serviceName?: string, companyId?: string) =>
  masterPricingEngine.calculatePricing(values, sqft, serviceName, companyId || getCurrentUserCompanyId());

export const subscribeToConfigChanges = (serviceName: string = 'paver_patio_sqft', companyId?: string, onUpdate?: (config: PaverPatioConfig) => void) => {
  const actualCompanyId = companyId || getCurrentUserCompanyId();
  const actualCallback = onUpdate || (() => {});

  if (!actualCompanyId) {
    console.warn('No company_id available for subscription - using development mode');
    return () => {}; // Return empty unsubscribe function
  }

  return masterPricingEngine.subscribeToConfigChanges(serviceName, actualCompanyId, actualCallback);
};