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
// Import excavation integration for bundled service calculations
import { calculateExcavationHours, calculateExcavationCost } from './excavation-integration';
// REMOVED: Hardcoded helpers that bypass database
// All values now read directly from config.variables

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
  paverPatioHours?: number;      // Paver-specific hours (without excavation)
  excavationHours?: number;      // Excavation hours from bundled service
  totalManHours: number;
  totalDays: number;
  breakdown?: string[];
}

export interface Tier2Results {
  laborCost: number;
  materialCostBase: number;
  materialWasteCost: number;
  totalMaterialCost: number;
  excavationCost?: number;       // Excavation cost from bundled service
  excavationDetails?: {          // Excavation cost breakdown
    cubicYards: number;
    depth: number;
    wasteFactor: number;
    baseRate: number;
    profit: number;
  };
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
  private configCache: Map<string, PricingConfigRow> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private devModeCallCount: number = 0;
  private devModeLastReset: number = Date.now();

  /**
   * Always get fresh Supabase client with current auth state
   * This ensures we pick up auth sessions created after singleton initialization
   */
  private get supabase(): SupabaseClient {
    return getSupabase();
  }

  private constructor() {
    // Debug logging for master engine initialization
    console.log('🚀 [MASTER ENGINE] Master pricing engine initialized');
  }

  public static getInstance(): MasterPricingEngine {
    if (!MasterPricingEngine.instance) {
      MasterPricingEngine.instance = new MasterPricingEngine();
    }
    return MasterPricingEngine.instance;
  }

  /**
   * Load pricing configuration from Supabase
   * REQUIRES company_id - no dev mode fallback
   */
  public async loadPricingConfig(
    serviceName: string = 'paver_patio_sqft',
    companyId?: string
  ): Promise<PaverPatioConfig> {
    // CRITICAL: Reject empty/undefined immediately - NO DEV MODE
    if (!companyId || companyId.trim() === '') {
      console.error('❌ [MASTER ENGINE] No company_id provided - returning fallback config');
      return this.getFallbackConfig();
    }

    try {
      // Check authentication status
      const { data: { session } } = await this.supabase.auth.getSession();

      // Use companyId directly - NO getDevModeCompanyId() call
      const targetCompanyId = companyId;

      console.log('🔍 [MASTER ENGINE] Loading pricing config:', {
        serviceName,
        companyId: targetCompanyId,
        hasAuth: !!session
      });

      // Check cache first
      const cacheKey = `${targetCompanyId}:${serviceName}`;
      if (this.configCache.has(cacheKey)) {
        console.log('📋 [MASTER ENGINE] Using cached config');
        return this.convertRowToConfig(this.configCache.get(cacheKey)!);
      }

      // Query Supabase with detailed logging
      // 🔍 DEBUG: Check auth status before query
      console.log('🔍 [LOAD DEBUG] Auth session status:', {
        hasSession: !!session,
        authUid: session?.user?.id,
        userEmail: session?.user?.email
      });

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
        console.error('❌ [LOAD DEBUG] Full query error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          isRLS: error.code === 'PGRST301' || error.message?.includes('RLS') || error.message?.includes('policy')
        });
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

      // 🔍 DEBUG: Log variables_config from database
      console.log('🔍 [MASTER ENGINE DEBUG] variables_config from DB:', {
        hasVariablesConfig: !!configRow.variables_config,
        variableKeys: Object.keys(configRow.variables_config || {}),
        premiumMaterialValue: configRow.variables_config?.materials?.paverStyle?.options?.premium?.value,
        premiumMultiplier: configRow.variables_config?.materials?.paverStyle?.options?.premium?.multiplier
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
  ): () => void {
    const subscriptionKey = `${companyId}:${serviceName}`;

    // Remove existing subscription
    if (this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.get(subscriptionKey).unsubscribe();
    }

    // CRITICAL: Check if we're authenticated before subscribing (async check, log results when ready)
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔧 [MASTER ENGINE] Auth check for subscription:', {
        channelName: `pricing_config_${subscriptionKey}`,
        isAuthenticated: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        accessToken: session?.access_token ? `${session.access_token.substring(0, 20)}...` : 'NONE'
      });

      if (!session) {
        console.error('❌ [MASTER ENGINE] CRITICAL: No auth session found! Real-time will NOT work with RLS!');
        console.error('❌ [MASTER ENGINE] Subscription will appear SUBSCRIBED but events will never fire!');
      } else {
        console.log('✅ [MASTER ENGINE] Auth session found - real-time should work');
      }
    });

    console.log('🔧 [MASTER ENGINE] Creating subscription channel:', {
      channelName: `pricing_config_${subscriptionKey}`,
      companyId,
      serviceName,
      table: 'service_pricing_configs'
    });

    // Create new subscription
    const subscription = this.supabase
      .channel(`pricing_config_${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_pricing_configs',
          filter: `company_id=eq.${companyId}`
        },
        async (payload) => {
          console.log('🎯🎯🎯 [MASTER ENGINE] ========== REAL-TIME EVENT RECEIVED ==========', {
            timestamp: new Date().toISOString(),
            event: payload.eventType,
            serviceName: payload.new?.service_name || payload.old?.service_name,
            targetService: serviceName,
            willProcess: (payload.new?.service_name === serviceName || payload.old?.service_name === serviceName),
            payload: payload
          });

          // Only process updates for matching service
          if (payload.new?.service_name === serviceName || payload.old?.service_name === serviceName) {
            console.log('🔄 [MASTER ENGINE] Real-time config update:', payload);

            // Clear cache
            this.configCache.delete(subscriptionKey);

            // Load fresh config
            const newConfig = await this.loadPricingConfig(serviceName, companyId);

            // CRITICAL FIX: Add timestamp to force React to detect change
            // Without this, setConfig(newConfig) won't trigger useEffect because
            // the object structure is identical
            const configWithTimestamp = {
              ...newConfig,
              _lastUpdated: Date.now(),
              _updateSource: 'real-time-subscription'
            };

            console.log('🔄 [MASTER ENGINE] Triggering config update with timestamp:', configWithTimestamp._lastUpdated);
            onUpdate(configWithTimestamp as any);
          }
        }
      )
      .subscribe((status, error) => {
        console.log('📡 [MASTER ENGINE] Subscription status change:', {
          status,
          error,
          subscriptionKey,
          timestamp: new Date().toISOString()
        });

        if (status === 'SUBSCRIBED') {
          console.log('✅ [MASTER ENGINE] Real-time subscription ACTIVE and ready', {
            channel: `pricing_config_${subscriptionKey}`,
            table: 'service_pricing_configs',
            filter: `company_id=eq.${companyId}`
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [MASTER ENGINE] Subscription FAILED:', error);
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ [MASTER ENGINE] Subscription TIMED OUT - WebSocket connection failed');
        } else if (status === 'CLOSED') {
          console.warn('🔌 [MASTER ENGINE] Subscription CLOSED (component unmounted or StrictMode cleanup)');
        }
      });

    this.subscriptions.set(subscriptionKey, subscription);

    console.log('👂 [MASTER ENGINE] Subscription setup complete:', {
      subscriptionKey,
      channelName: `pricing_config_${subscriptionKey}`,
      table: 'service_pricing_configs',
      filter: `company_id=eq.${companyId}`,
      serviceName
    });

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
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
   * Clear cache for a specific service/company combo
   * Called by Services Database after direct Supabase saves
   */
  public clearCache(serviceName: string, companyId: string): void {
    const cacheKey = `${companyId}:${serviceName}`;
    this.configCache.delete(cacheKey);
    console.log('🧹 [MASTER ENGINE] Cache cleared for:', cacheKey);
  }

  /**
   * Clear ALL cached pricing configs
   * Called on app startup to ensure fresh data
   */
  public clearAllCaches(): void {
    const cacheSize = this.configCache.size;
    this.configCache.clear();
    console.log('🧹🧹🧹 [MASTER ENGINE] ALL CACHES CLEARED on app startup (cleared', cacheSize, 'entries)');
  }

  /**
   * Force reload config from database, bypassing cache
   * Use when you need guaranteed fresh data
   */
  public async forceReloadFromDatabase(
    serviceName: string = 'paver_patio_sqft',
    companyId?: string
  ): Promise<PaverPatioConfig> {
    // Clear cache first
    if (companyId) {
      this.clearCache(serviceName, companyId);
    }

    console.log('🔄 [MASTER ENGINE] Force reloading from database (bypassing cache):', {
      serviceName,
      companyId
    });

    // Load fresh from database
    return this.loadPricingConfig(serviceName, companyId);
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

    // Calculate Tier 2 (costs) - now async to support excavation cost calculation
    const tier2Results = await this.calculateTier2(config, values, tier1Results, sqft, companyId);

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
   * ALL VALUES READ FROM DATABASE - No hardcoded helpers
   */
  private calculateTier1(config: PaverPatioConfig, values: PaverPatioValues, sqft: number): Tier1Results {
    const optimalTeamSize = config?.baseSettings?.laborSettings?.optimalTeamSize?.value ?? 3;
    const baseProductivity = config?.baseSettings?.laborSettings?.baseProductivity?.value ?? 50;

    // Base labor calculation
    const baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;
    let adjustedHours = baseHours;
    const breakdownSteps: string[] = [`Base: ${sqft} sqft ÷ ${baseProductivity} sqft/day × ${optimalTeamSize} people × 8 hours = ${baseHours.toFixed(1)} hours`];

    // NEW: Add excavation hours if service integration toggle is enabled
    // ONLY check toggle value - respects user's choice to enable/disable
    let excavationHours = 0;
    const excavationEnabled = values?.serviceIntegrations?.includeExcavation === true;

    console.log('🔍 [MASTER ENGINE] Checking excavation integration:', {
      toggleValue: values?.serviceIntegrations?.includeExcavation,
      excavationEnabled,
      willCalculateExcavation: excavationEnabled
    });

    if (excavationEnabled) {
      excavationHours = calculateExcavationHours(sqft);
      adjustedHours += excavationHours;
      breakdownSteps.push(`+Excavation (bundled service): +${excavationHours.toFixed(1)} hours`);
    }

    // REMOVED: tearoutComplexity (now handled by excavation service integration)

    // CRITICAL FIX: Read access percentage from DATABASE, not hardcoded helper
    const accessVar = config?.variables_config?.siteAccess?.accessDifficulty;
    const accessOption = accessVar?.options?.[values?.siteAccess?.accessDifficulty ?? 'easy'];
    const accessPercentage = accessOption?.value ?? 0;

    // CRITICAL FIX: Read team size percentage from DATABASE, not hardcoded helper
    const teamVar = config?.variables_config?.labor?.teamSize;
    const teamOption = teamVar?.options?.[values?.labor?.teamSize ?? 'threePlus'];
    const teamSizePercentage = teamOption?.value ?? 0;

    // Apply each variable as independent percentage of base hours
    if (accessPercentage > 0) {
      const accessHours = baseHours * (accessPercentage / 100);
      adjustedHours += accessHours;
      breakdownSteps.push(`+Access difficulty (+${accessPercentage}% of base): +${accessHours.toFixed(1)} hours`);
    }
    if (teamSizePercentage > 0) {
      const teamHours = baseHours * (teamSizePercentage / 100);
      adjustedHours += teamHours;
      breakdownSteps.push(`+Team size adjustment (+${teamSizePercentage}% of base): +${teamHours.toFixed(1)} hours`);
    }

    // Add cutting complexity labor percentage (calculated from BASE hours)
    const cuttingVar = config?.variables_config?.materials?.cuttingComplexity;
    const cuttingOption = cuttingVar?.options?.[values?.materials?.cuttingComplexity ?? 'minimal'];
    const cuttingLaborPercentage = cuttingOption?.laborPercentage ?? 0;
    if (cuttingLaborPercentage > 0) {
      const cuttingHours = baseHours * (cuttingLaborPercentage / 100);
      adjustedHours += cuttingHours;
      breakdownSteps.push(`+Cutting complexity (+${cuttingLaborPercentage}% of base): +${cuttingHours.toFixed(1)} hours`);
    }

    const totalManHours = adjustedHours;
    const totalDays = totalManHours / (optimalTeamSize * 8);

    return {
      baseHours: Math.round(baseHours * 10) / 10,
      adjustedHours: Math.round(adjustedHours * 10) / 10,
      paverPatioHours: Math.round(baseHours * 10) / 10,  // Paver-specific hours (without excavation)
      excavationHours: Math.round(excavationHours * 10) / 10,  // Excavation hours from bundled service
      totalManHours: Math.round(totalManHours * 10) / 10,
      totalDays: Math.round(totalDays * 10) / 10,
      breakdown: breakdownSteps
    };
  }

  /**
   * TIER 2: Calculate complete cost breakdown with all components
   * Now async to support excavation cost calculation
   */
  private async calculateTier2(
    config: PaverPatioConfig,
    values: PaverPatioValues,
    tier1Results: Tier1Results,
    sqft: number,
    companyId?: string
  ): Promise<Tier2Results> {
    const hourlyRate = config?.baseSettings?.laborSettings?.hourlyLaborRate?.value ?? 25;
    const baseMaterialCost = config?.baseSettings?.materialSettings?.baseMaterialCost?.value ?? 5.84;
    const profitMargin = config?.baseSettings?.businessSettings?.profitMarginTarget?.value ?? 0.20;
    const optimalTeamSize = config?.baseSettings?.laborSettings?.optimalTeamSize?.value ?? 3;

    // 1. Labor costs
    const laborCost = tier1Results.totalManHours * hourlyRate;

    // 2. Material costs with waste
    // CRITICAL FIX: Read multiplier from config.variables_config instead of hardcoded helper
    const paverVar = config?.variables_config?.materials?.paverStyle;
    const paverStyleValue = values?.materials?.paverStyle ?? 'standard';
    const paverOption = paverVar?.options?.[paverStyleValue];
    const materialMultiplier = paverOption?.multiplier ?? 1.0;

    // 🔍 DEBUG: Log what material multiplier is being used
    console.log('🔍 [MASTER ENGINE DEBUG] Material multiplier from DATABASE:', {
      selectedPaverStyle: paverStyleValue,
      paverStyleOptions: paverVar?.options,
      selectedOption: paverOption,
      multiplierFromDB: materialMultiplier,
      premiumOption: paverVar?.options?.premium,
      premiumValue: paverVar?.options?.premium?.value,
      premiumMultiplier: paverVar?.options?.premium?.multiplier
    });

    const materialCostBase = baseMaterialCost * sqft * materialMultiplier;

    const cuttingVar = config?.variables_config?.materials?.cuttingComplexity;
    const cuttingOption = cuttingVar?.options?.[values?.materials?.cuttingComplexity ?? 'minimal'];
    const cuttingWastePercent = cuttingOption?.materialWaste ?? 0;
    const materialWasteCost = materialCostBase * (cuttingWastePercent / 100);
    const totalMaterialCost = materialCostBase + materialWasteCost;

    // 3. Excavation costs (bundled service)
    // ONLY check toggle value - respects user's choice to enable/disable
    let excavationCost = 0;
    let excavationDetails = undefined;

    const excavationEnabled = values?.serviceIntegrations?.includeExcavation === true;

    if (excavationEnabled) {
      try {
        const details = await calculateExcavationCost(sqft, companyId);
        excavationCost = details.cost;
        excavationDetails = {
          cubicYards: details.cubicYards,
          depth: details.depth,
          wasteFactor: details.wasteFactor,
          baseRate: details.baseRate,
          profit: details.profit
        };
        console.log('💰 [MASTER ENGINE] Excavation cost calculated:', {
          enabled: excavationEnabled,
          cost: excavationCost,
          details: excavationDetails
        });
      } catch (error) {
        console.error('❌ [MASTER ENGINE] Failed to calculate excavation cost:', error);
      }
    }

    // 4. Equipment costs (deprecated - set to 0 for backward compatibility)
    const equipmentCost = 0;

    // 5. Obstacle costs
    const obstacleVar = config?.variables_config?.siteAccess?.obstacleRemoval;
    const obstacleOption = obstacleVar?.options?.[values?.siteAccess?.obstacleRemoval ?? 'none'];
    const obstacleCost = obstacleOption?.value ?? 0;

    // 5. CRITICAL: Apply complexity multiplier ONLY to labor and materials
    // Equipment rental rates and obstacle removal fees are fixed costs that don't scale with complexity
    // (Complexity already affects equipment costs indirectly via increased projectDays from tier1 labor calculations)
    const complexityVar = config?.variables_config?.complexity?.overallComplexity;
    const complexityValue = values?.complexity?.overallComplexity;

    let complexityMultiplier = 1.0;

    // Check if it's stored as a percentage value in the database
    if (complexityVar?.options && typeof complexityValue === 'string') {
      const complexityOption = complexityVar.options[complexityValue];
      // If database stores as percentage (e.g., 0, 10, 30, 50), convert to multiplier
      if (complexityOption?.value !== undefined) {
        complexityMultiplier = 1 + (complexityOption.value / 100);
      }
    } else if (typeof complexityValue === 'number') {
      // Legacy: If stored as direct multiplier
      complexityMultiplier = complexityValue;
    }

    console.log('🎯 [MASTER ENGINE] Complexity calculation:', {
      selectedComplexity: complexityValue,
      complexityMultiplier,
      laborBeforeComplexity: laborCost.toFixed(2),
      materialsBeforeComplexity: totalMaterialCost.toFixed(2),
      laborAfterComplexity: (laborCost * complexityMultiplier).toFixed(2),
      materialsAfterComplexity: (totalMaterialCost * complexityMultiplier).toFixed(2),
      equipmentNotAffected: equipmentCost.toFixed(2),
      obstacleNotAffected: obstacleCost.toFixed(2)
    });

    // Apply complexity to labor and materials only
    const adjustedLaborCost = laborCost * complexityMultiplier;
    const adjustedMaterialCost = totalMaterialCost * complexityMultiplier;

    // 6. Calculate profit on labor, materials, AND excavation (the actual work)
    // Equipment rentals and obstacle removal are pass-through costs (no profit markup)
    // Excavation gets complexity & profit markup since it's actual work
    const profitableSubtotal = adjustedLaborCost + adjustedMaterialCost + excavationCost;
    const profit = profitableSubtotal * profitMargin;

    // 7. Calculate final subtotal: profitable costs + profit + pass-through costs
    const subtotalBeforePassThrough = profitableSubtotal + profit;
    const subtotal = subtotalBeforePassThrough + equipmentCost + obstacleCost;

    // 8. Final total (subtotal already includes profit)
    const total = subtotal;

    console.log('💰 [MASTER ENGINE] Tier 2 calculation (detailed breakdown):', {
      '1_laborCostBase': laborCost.toFixed(2),
      '2_laborCostAfterComplexity': adjustedLaborCost.toFixed(2),
      '3_materialCostBase': totalMaterialCost.toFixed(2),
      '4_materialCostAfterComplexity': adjustedMaterialCost.toFixed(2),
      '5_profitableSubtotal': profitableSubtotal.toFixed(2),
      '6_profitMargin': (profitMargin * 100).toFixed(1) + '%',
      '7_profitAmount': profit.toFixed(2),
      '8_subtotalWithProfit': subtotalBeforePassThrough.toFixed(2),
      '9_PASS_THROUGH_equipmentCost': equipmentCost.toFixed(2) + ' (no profit markup)',
      '10_PASS_THROUGH_obstacleCost': obstacleCost.toFixed(2) + ' (no profit markup)',
      '11_finalSubtotal': subtotal.toFixed(2),
      '12_finalTotal': total.toFixed(2)
    });

    return {
      laborCost: Math.round(adjustedLaborCost * 100) / 100,
      materialCostBase: Math.round(materialCostBase * 100) / 100,
      materialWasteCost: Math.round(materialWasteCost * 100) / 100,
      totalMaterialCost: Math.round(adjustedMaterialCost * 100) / 100,
      excavationCost: excavationCost ? Math.round(excavationCost * 100) / 100 : undefined,
      excavationDetails: excavationDetails,
      equipmentCost: Math.round(equipmentCost * 100) / 100,
      obstacleCost: Math.round(obstacleCost * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      total: Math.round(total * 100) / 100,
      pricePerSqft: Math.round((total / sqft) * 100) / 100
    };
  }

  /**
   * Calculate excavation pricing - Simple volume-based calculation
   */
  public async calculateExcavationPricing(
    area_sqft: number,
    depth_inches: number,
    calculationSettings: any,
    serviceName: string = 'excavation_removal',
    companyId?: string
  ): Promise<any> {
    // CRITICAL: Force reload from database to bypass cache
    // This ensures admin changes (like base rate) take effect immediately
    const config = await this.forceReloadFromDatabase(serviceName, companyId) as any;

    // Extract calculation settings with defaults
    const wasteFactor = calculationSettings?.wasteFactor?.default ?? 10;
    const compactionFactor = calculationSettings?.compactionFactor?.default ?? 0;
    const roundingRule = calculationSettings?.roundingRule?.default ?? 'up_whole';

    // Extract base settings
    const baseRate = config?.hourly_labor_rate ?? 25;  // Actually $/cubic yard
    const profitMargin = config?.profit_margin ?? 0.05;
    const teamSize = config?.optimal_team_size ?? 3;

    // Calculate cubic yards
    const depth_ft = depth_inches / 12;
    const cubic_feet = area_sqft * depth_ft;
    const cy_raw = cubic_feet / 27;

    // STEP 2: Apply waste and compaction factors
    const waste_multiplier = 1 + (wasteFactor / 100);
    const compaction_multiplier = 1 + (compactionFactor / 100);
    const cy_adjusted = cy_raw * waste_multiplier * compaction_multiplier;

    // STEP 3: Apply rounding rule
    let cy_final = cy_adjusted;
    if (roundingRule === 'up_whole') {
      cy_final = Math.ceil(cy_adjusted);
    } else if (roundingRule === 'up_half') {
      cy_final = Math.ceil(cy_adjusted * 2) / 2;
    }
    // 'exact' means no rounding

    // STEP 4: Calculate time using AREA-BASED TIERS
    // Time is based ONLY on area (depth does not affect time)
    // 12 hours per 1000 sqft tier, 1.5 days per 1000 sqft tier
    const sqftTiers = Math.ceil(area_sqft / 1000);
    const base_hours = sqftTiers * 12;
    const project_days = sqftTiers * 1.5;

    // STEP 5: Calculate costs (simple formula - NO multipliers)
    const base_cost = cy_final * baseRate;
    const profit = base_cost * profitMargin;
    const total_cost = base_cost + profit;

    const result = {
      // Volume calculations
      area_sqft,
      depth_inches,
      cubic_yards_raw: Math.round(cy_raw * 100) / 100,
      cubic_yards_adjusted: Math.round(cy_adjusted * 100) / 100,
      cubic_yards_final: Math.round(cy_final * 100) / 100,

      // Time estimates (area-based tiers)
      base_hours: base_hours,
      project_days: project_days,

      // Cost breakdown
      base_cost: Math.round(base_cost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      total_cost: Math.round(total_cost * 100) / 100,
      cost_per_cubic_yard: Math.round((total_cost / cy_final) * 100) / 100,
      hours_per_cubic_yard: Math.round((base_hours / cy_final) * 10) / 10
    };

    console.log('✅ [MASTER ENGINE] Excavation calculation complete:', result);

    return result;
  }

  /**
   * Get development mode company ID (first company in database)
   * RATE LIMITED to prevent infinite loops
   */
  private async getDevModeCompanyId(): Promise<string> {
    // Reset counter every 10 seconds
    const now = Date.now();
    if (now - this.devModeLastReset > 10000) {
      this.devModeCallCount = 0;
      this.devModeLastReset = now;
    }

    this.devModeCallCount++;

    if (this.devModeCallCount > 5) {
      const errorMsg = `❌ [CRITICAL] getDevModeCompanyId called ${this.devModeCallCount} times in 10s - INFINITE LOOP DETECTED`;
      console.error(errorMsg);
      throw new Error('Infinite loop detected in getDevModeCompanyId - check component company_id guards');
    }

    try {
      console.log(`🔍 [DEV MODE] Looking up first company ID (call ${this.devModeCallCount}/5)...`);

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
      variables: row.variables_config,  // For paver patio (uses 'variables')
      variables_config: row.variables_config  // For excavation & new services (uses 'variables_config')
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
}

// Export singleton instance
export const masterPricingEngine = MasterPricingEngine.getInstance();

// Export only the master pricing engine instance - all components should use this directly
// and pass company_id from AuthContext