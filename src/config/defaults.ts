/**
 * TradeSphere Technology Defaults System
 * 
 * Centralized default values for all environment variables.
 * Provides consistent TradeSphere tech theme when variables are empty/undefined.
 * 
 * ARCHITECTURE:
 * 1. TRADESPHERE_TECH_DEFAULTS - Core tech industry defaults
 * 2. INDUSTRY_OVERRIDES - Industry-specific customizations
 * 3. BUILD-TIME BRANDING CONFIG - Visual/branding settings (not in .env)
 * 4. Helper functions for safe environment variable access
 * 5. Type-safe configuration retrieval
 */

import type { Icons } from 'lucide-react';
import { brandingConfig } from './branding';

// =============================================================================
// CORE TRADESPHERE TECHNOLOGY DEFAULTS
// =============================================================================

export const TRADESPHERE_TECH_DEFAULTS = {
  // Core Branding Defaults
  branding: {
    companyName: 'TradeSphere',
    logoUrl: '/assets/branding/default-logo.svg',
    welcomeMessage: 'Welcome to TradeSphere! How can I help you today?',
    headerIcon: 'MessageCircle' as keyof typeof Icons,
  },

  // Technology Color Palette
  colors: {
    primary: '#2563eb',      // Professional blue
    secondary: '#1d4ed8',    // Deeper blue
    accent: '#3b82f6',       // Bright blue
    success: '#10b981',      // Tech green
  },

  // Technology Visual Theme
  visual: {
    sendEffect: 'spark_burst' as const,
    loadingAnimation: 'default' as const,
    messageStyle: 'geometric' as const,
    backgroundPattern: 'none' as const,
  },

  // Technology Business Terminology
  terminology: {
    businessType: 'business consultant',
    projectLanguage: 'project',
    estimateLanguage: 'estimate',
    primaryServices: ['consulting', 'strategy', 'analysis'],
    placeholderExamples: 'e.g., "I need help with my business strategy."',
    specialization: 'consultant' as const,
    urgencyLevel: 'routine' as const,
  },

  // Geographic & Seasonal Defaults
  location: {
    useSeasonalThemes: false,
    region: 'general',
    climateZone: undefined as string | undefined,
  },

  // PWA Technology Defaults
  pwa: {
    name: 'TradeSphere',
    shortName: 'TradeSphere',
    description: 'A revolutionary pricing tool for the trade industry.',
    icon192: 'pwa-192x192.png',
    icon512: 'pwa-512x512.png',
    favicon: 'favicon.ico',
    appleIcon: 'apple-touch-icon.png',
  },

  // Technical Integration (no defaults - require explicit configuration)
  technical: {
    supabaseUrl: undefined as string | undefined,
    supabaseAnonKey: undefined as string | undefined,
    makeWebhookUrl: undefined as string | undefined,
    feedbackWebhookUrl: undefined as string | undefined,
  }
} as const;

// =============================================================================
// INDUSTRY-SPECIFIC OVERRIDES
// =============================================================================

export const INDUSTRY_OVERRIDES = {
  landscaping: {
    colors: {
      primary: '#2e8b57',    // Forest green
      secondary: '#8b4513',  // Saddle brown
      accent: '#f4a460',     // Sandy brown
      success: '#32cd32',    // Lime green
    },
    visual: {
      sendEffect: 'leaf_flutter' as const,
      loadingAnimation: 'growth' as const,
      messageStyle: 'organic' as const,
      backgroundPattern: 'subtle_organic' as const,
    },
    terminology: {
      businessType: 'landscape contractor',
      projectLanguage: 'outdoor project',
      estimateLanguage: 'landscape investment',
      primaryServices: ['landscaping', 'hardscaping', 'design', 'maintenance'],
      placeholderExamples: 'e.g., "I want a new patio and a fire pit."',
      specialization: 'full_service' as const,
      urgencyLevel: 'seasonal' as const,
    },
    branding: {
      headerIcon: 'TreePine' as keyof typeof Icons,
    }
  },

  hvac: {
    colors: {
      primary: '#ff4500',    // Orange red
      secondary: '#4169e1',  // Royal blue
      accent: '#ffd700',     // Gold
      success: '#28a745',    // Success green
    },
    visual: {
      sendEffect: 'spark_burst' as const,
      loadingAnimation: 'building' as const,
      messageStyle: 'geometric' as const,
      backgroundPattern: 'technical_grid' as const,
    },
    terminology: {
      businessType: 'HVAC specialist',
      projectLanguage: 'comfort system',
      estimateLanguage: 'system quote',
      primaryServices: ['HVAC repair', 'installation', 'maintenance', 'emergency service'],
      placeholderExamples: 'e.g., "My AC is not working"',
      specialization: 'specialist' as const,
      urgencyLevel: 'emergency' as const,
    },
    branding: {
      headerIcon: 'Wrench' as keyof typeof Icons,
    }
  }
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type IndustryType = keyof typeof INDUSTRY_OVERRIDES | '' | undefined;
export type SendEffect = 'leaf_flutter' | 'spark_burst' | 'gear_spin' | 'water_ripple' | 'none';
export type LoadingAnimation = 'growth' | 'building' | 'gears' | 'dots' | 'default';
export type MessageStyle = 'organic' | 'geometric';
export type BackgroundPattern = 'subtle_organic' | 'technical_grid' | 'blueprint' | 'none';
export type Specialization = 'full_service' | 'specialist' | 'consultant';
export type UrgencyLevel = 'routine' | 'seasonal' | 'emergency';

// =============================================================================
// SAFE ENVIRONMENT VARIABLE ACCESS FUNCTIONS
// =============================================================================

/**
 * Safely retrieve environment variable with TradeSphere tech defaults
 */
export class EnvironmentManager {
  private static getIndustryType(): IndustryType {
    return brandingConfig.industryType as IndustryType;
  }

  private static getIndustryOverride<T>(path: string): T | undefined {
    const industry = this.getIndustryType();
    if (!industry || industry === '') return undefined;
    
    const overrides = INDUSTRY_OVERRIDES[industry];
    if (!overrides) return undefined;
    
    return this.getNestedValue(overrides, path);
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static getTechDefault<T>(path: string): T {
    return this.getNestedValue(TRADESPHERE_TECH_DEFAULTS, path);
  }

  // ==========================================================================
  // PUBLIC API - BRANDING
  // ==========================================================================

  static getCompanyName(): string {
    return brandingConfig.companyName;
  }

  static getLogoUrl(): string {
    return brandingConfig.logoUrl;
  }

  static getWelcomeMessage(): string {
    return `Welcome to ${this.getCompanyName()}! How can I help you today?`;
  }

  static getHeaderIcon(): keyof typeof Icons {
    return (brandingConfig.headerIcon as keyof typeof Icons) ||
           this.getIndustryOverride('branding.headerIcon') ||
           this.getTechDefault('branding.headerIcon');
  }

  // ==========================================================================
  // PUBLIC API - COLORS
  // ==========================================================================

  static getPrimaryColor(): string {
    return brandingConfig.primaryColor ||
           this.getIndustryOverride('colors.primary') ||
           this.getTechDefault('colors.primary');
  }

  static getSecondaryColor(): string {
    return brandingConfig.secondaryColor ||
           this.getIndustryOverride('colors.secondary') ||
           this.getTechDefault('colors.secondary');
  }

  static getAccentColor(): string {
    return brandingConfig.accentColor ||
           this.getIndustryOverride('colors.accent') ||
           this.getTechDefault('colors.accent');
  }

  static getSuccessColor(): string {
    return brandingConfig.successColor ||
           this.getIndustryOverride('colors.success') ||
           this.getTechDefault('colors.success');
  }

  // ==========================================================================
  // PUBLIC API - VISUAL THEME
  // ==========================================================================

  static getSendEffect(): SendEffect {
    return (brandingConfig.sendEffect as SendEffect) ||
           this.getIndustryOverride('visual.sendEffect') ||
           this.getTechDefault('visual.sendEffect');
  }

  static getLoadingAnimation(): LoadingAnimation {
    return (brandingConfig.loadingAnimation as LoadingAnimation) ||
           this.getIndustryOverride('visual.loadingAnimation') ||
           this.getTechDefault('visual.loadingAnimation');
  }

  static getMessageStyle(): MessageStyle {
    return (brandingConfig.messageStyle as MessageStyle) ||
           this.getIndustryOverride('visual.messageStyle') ||
           this.getTechDefault('visual.messageStyle');
  }

  static getBackgroundPattern(): BackgroundPattern {
    return (brandingConfig.backgroundPattern as BackgroundPattern) ||
           this.getIndustryOverride('visual.backgroundPattern') ||
           this.getTechDefault('visual.backgroundPattern');
  }

  // ==========================================================================
  // PUBLIC API - BUSINESS TERMINOLOGY
  // ==========================================================================

  static getBusinessType(): string {
    return brandingConfig.businessType ||
           this.getIndustryOverride('terminology.businessType') ||
           this.getTechDefault('terminology.businessType');
  }

  static getProjectLanguage(): string {
    return brandingConfig.projectLanguage ||
           this.getIndustryOverride('terminology.projectLanguage') ||
           this.getTechDefault('terminology.projectLanguage');
  }

  static getEstimateLanguage(): string {
    return brandingConfig.estimateLanguage ||
           this.getIndustryOverride('terminology.estimateLanguage') ||
           this.getTechDefault('terminology.estimateLanguage');
  }

  static getPrimaryServices(): string[] {
    if (brandingConfig.primaryServices) return brandingConfig.primaryServices.split(',').map(s => s.trim());
    
    return this.getIndustryOverride('terminology.primaryServices') ||
           this.getTechDefault('terminology.primaryServices');
  }

  static getPlaceholderExamples(): string {
    return brandingConfig.placeholderExamples ||
           this.getIndustryOverride('terminology.placeholderExamples') ||
           this.getTechDefault('terminology.placeholderExamples');
  }

  static getSpecialization(): Specialization {
    return (brandingConfig.specialization as Specialization) ||
           this.getIndustryOverride('terminology.specialization') ||
           this.getTechDefault('terminology.specialization');
  }

  static getUrgencyLevel(): UrgencyLevel {
    return (brandingConfig.urgencyLevel as UrgencyLevel) ||
           this.getIndustryOverride('terminology.urgencyLevel') ||
           this.getTechDefault('terminology.urgencyLevel');
  }

  // ==========================================================================
  // PUBLIC API - LOCATION & SEASONAL
  // ==========================================================================

  static getUseSeasonalThemes(): boolean {
    return brandingConfig.useSeasonalThemes ||
           this.getTechDefault('location.useSeasonalThemes');
  }

  static getRegion(): string {
    return brandingConfig.region ||
           this.getTechDefault('location.region');
  }

  static getClimateZone(): string | undefined {
    return brandingConfig.climateZone ||
           this.getTechDefault('location.climateZone');
  }

  // ==========================================================================
  // PUBLIC API - PWA CONFIGURATION
  // ==========================================================================

  static getPwaName(): string {
    return brandingConfig.pwa.name ||
           this.getTechDefault('pwa.name');
  }

  static getPwaShortName(): string {
    return brandingConfig.pwa.shortName ||
           this.getTechDefault('pwa.shortName');
  }

  static getPwaDescription(): string {
    return brandingConfig.pwa.description ||
           this.getTechDefault('pwa.description');
  }

  // ==========================================================================
  // PUBLIC API - TECHNICAL INTEGRATION (NO DEFAULTS)
  // ==========================================================================

  static getSupabaseUrl(): string {
    const url = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) ||
                (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : undefined);
    if (!url || url === 'YOUR_SUPABASE_URL') {
      throw new Error('VITE_SUPABASE_URL must be configured');
    }
    return url;
  }

  static getSupabaseAnonKey(): string {
    const key = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) ||
                (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined);
    if (!key || key === 'YOUR_SUPABASE_ANON_KEY') {
      throw new Error('VITE_SUPABASE_ANON_KEY must be configured');
    }
    return key;
  }

  static getFeedbackWebhookUrl(): string | undefined {
    const url = (typeof process !== 'undefined' ? process.env.VITE_FEEDBACK_WEBHOOK_URL : undefined) ||
                (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_FEEDBACK_WEBHOOK_URL : undefined);
    return (url && url !== 'YOUR_FEEDBACK_WEBHOOK_URL') ? url : undefined;
  }

  // ==========================================================================
  // BACKWARD COMPATIBILITY HELPERS
  // ==========================================================================

  /**
   * Get all configuration as a single object (for existing industry.ts compatibility)
   */
  static getAllConfig() {
    return {
      // Core branding
      companyName: this.getCompanyName(),
      logoUrl: this.getLogoUrl(),
      welcomeMessage: this.getWelcomeMessage(),
      headerIcon: this.getHeaderIcon(),

      // Colors
      colors: {
        primary: this.getPrimaryColor(),
        secondary: this.getSecondaryColor(),
        accent: this.getAccentColor(),
        success: this.getSuccessColor(),
      },

      // Visual theme
      visual: {
        sendEffect: this.getSendEffect(),
        loadingAnimation: this.getLoadingAnimation(),
        messageStyle: this.getMessageStyle(),
        backgroundPattern: this.getBackgroundPattern(),
      },

      // Terminology
      terminology: {
        businessType: this.getBusinessType(),
        projectLanguage: this.getProjectLanguage(),
        estimateLanguage: this.getEstimateLanguage(),
        primaryServices: this.getPrimaryServices(),
        placeholderExamples: this.getPlaceholderExamples(),
        specialization: this.getSpecialization(),
        urgencyLevel: this.getUrgencyLevel(),
      },

      // Location
      location: {
        useSeasonalThemes: this.getUseSeasonalThemes(),
        region: this.getRegion(),
        climateZone: this.getClimateZone(),
      },

      // Technical (may throw errors)
      technical: {
        supabaseUrl: this.getSupabaseUrl(),
        supabaseAnonKey: this.getSupabaseAnonKey(),
        makeWebhookUrl: this.getMakeWebhookUrl(),
        feedbackWebhookUrl: this.getFeedbackWebhookUrl(),
      }
    };
  }
}

// =============================================================================
// EXPORT CONVENIENCE FUNCTIONS
// =============================================================================

export const getTechDefaults = () => TRADESPHERE_TECH_DEFAULTS;
export const getIndustryOverrides = () => INDUSTRY_OVERRIDES;
export const env = EnvironmentManager;