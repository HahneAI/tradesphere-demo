/**
 * TradeSphere Technology Defaults System
 * 
 * Centralized default values for all environment variables.
 * Provides consistent TradeSphere tech theme when variables are empty/undefined.
 * 
 * ARCHITECTURE:
 * 1. TRADESPHERE_TECH_DEFAULTS - Core tech industry defaults
 * 2. INDUSTRY_OVERRIDES - Industry-specific customizations
 * 3. Helper functions for safe environment variable access
 * 4. Type-safe configuration retrieval
 */

import type { Icons } from 'lucide-react';

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
    return import.meta.env.VITE_INDUSTRY_TYPE as IndustryType;
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
    return import.meta.env.VITE_COMPANY_NAME || 
           this.getTechDefault('branding.companyName');
  }

  static getLogoUrl(): string {
    return import.meta.env.VITE_LOGO_URL || 
           this.getTechDefault('branding.logoUrl');
  }

  static getWelcomeMessage(): string {
    return import.meta.env.VITE_WELCOME_MESSAGE || 
           `Welcome to ${this.getCompanyName()}! How can I help you today?`;
  }

  static getHeaderIcon(): keyof typeof Icons {
    return (import.meta.env.VITE_HEADER_ICON as keyof typeof Icons) ||
           this.getIndustryOverride('branding.headerIcon') ||
           this.getTechDefault('branding.headerIcon');
  }

  // ==========================================================================
  // PUBLIC API - COLORS
  // ==========================================================================

  static getPrimaryColor(): string {
    return import.meta.env.VITE_PRIMARY_COLOR ||
           this.getIndustryOverride('colors.primary') ||
           this.getTechDefault('colors.primary');
  }

  static getSecondaryColor(): string {
    return import.meta.env.VITE_SECONDARY_COLOR ||
           this.getIndustryOverride('colors.secondary') ||
           this.getTechDefault('colors.secondary');
  }

  static getAccentColor(): string {
    return import.meta.env.VITE_ACCENT_COLOR ||
           this.getIndustryOverride('colors.accent') ||
           this.getTechDefault('colors.accent');
  }

  static getSuccessColor(): string {
    return import.meta.env.VITE_SUCCESS_COLOR ||
           this.getIndustryOverride('colors.success') ||
           this.getTechDefault('colors.success');
  }

  // ==========================================================================
  // PUBLIC API - VISUAL THEME
  // ==========================================================================

  static getSendEffect(): SendEffect {
    return (import.meta.env.VITE_SEND_EFFECT as SendEffect) ||
           this.getIndustryOverride('visual.sendEffect') ||
           this.getTechDefault('visual.sendEffect');
  }

  static getLoadingAnimation(): LoadingAnimation {
    return (import.meta.env.VITE_LOADING_ANIMATION as LoadingAnimation) ||
           this.getIndustryOverride('visual.loadingAnimation') ||
           this.getTechDefault('visual.loadingAnimation');
  }

  static getMessageStyle(): MessageStyle {
    return (import.meta.env.VITE_MESSAGE_STYLE as MessageStyle) ||
           this.getIndustryOverride('visual.messageStyle') ||
           this.getTechDefault('visual.messageStyle');
  }

  static getBackgroundPattern(): BackgroundPattern {
    return (import.meta.env.VITE_BACKGROUND_PATTERN as BackgroundPattern) ||
           this.getIndustryOverride('visual.backgroundPattern') ||
           this.getTechDefault('visual.backgroundPattern');
  }

  // ==========================================================================
  // PUBLIC API - BUSINESS TERMINOLOGY
  // ==========================================================================

  static getBusinessType(): string {
    return import.meta.env.VITE_BUSINESS_TYPE ||
           this.getIndustryOverride('terminology.businessType') ||
           this.getTechDefault('terminology.businessType');
  }

  static getProjectLanguage(): string {
    return import.meta.env.VITE_PROJECT_LANGUAGE ||
           this.getIndustryOverride('terminology.projectLanguage') ||
           this.getTechDefault('terminology.projectLanguage');
  }

  static getEstimateLanguage(): string {
    return import.meta.env.VITE_ESTIMATE_LANGUAGE ||
           this.getIndustryOverride('terminology.estimateLanguage') ||
           this.getTechDefault('terminology.estimateLanguage');
  }

  static getPrimaryServices(): string[] {
    const envServices = import.meta.env.VITE_PRIMARY_SERVICES;
    if (envServices) return envServices.split(',').map(s => s.trim());
    
    return this.getIndustryOverride('terminology.primaryServices') ||
           this.getTechDefault('terminology.primaryServices');
  }

  static getPlaceholderExamples(): string {
    return import.meta.env.VITE_PLACEHOLDER_EXAMPLES ||
           this.getIndustryOverride('terminology.placeholderExamples') ||
           this.getTechDefault('terminology.placeholderExamples');
  }

  static getSpecialization(): Specialization {
    return (import.meta.env.VITE_SPECIALIZATION as Specialization) ||
           this.getIndustryOverride('terminology.specialization') ||
           this.getTechDefault('terminology.specialization');
  }

  static getUrgencyLevel(): UrgencyLevel {
    return (import.meta.env.VITE_URGENCY_LEVEL as UrgencyLevel) ||
           this.getIndustryOverride('terminology.urgencyLevel') ||
           this.getTechDefault('terminology.urgencyLevel');
  }

  // ==========================================================================
  // PUBLIC API - LOCATION & SEASONAL
  // ==========================================================================

  static getUseSeasonalThemes(): boolean {
    return import.meta.env.VITE_USE_SEASONAL_THEMES === 'true' ||
           this.getTechDefault('location.useSeasonalThemes');
  }

  static getRegion(): string {
    return import.meta.env.VITE_REGION ||
           this.getTechDefault('location.region');
  }

  static getClimateZone(): string | undefined {
    return import.meta.env.VITE_CLIMATE_ZONE ||
           this.getTechDefault('location.climateZone');
  }

  // ==========================================================================
  // PUBLIC API - PWA CONFIGURATION
  // ==========================================================================

  static getPwaName(): string {
    return import.meta.env.VITE_PWA_NAME ||
           this.getTechDefault('pwa.name');
  }

  static getPwaShortName(): string {
    return import.meta.env.VITE_PWA_SHORT_NAME ||
           this.getTechDefault('pwa.shortName');
  }

  static getPwaDescription(): string {
    return import.meta.env.VITE_PWA_DESCRIPTION ||
           this.getTechDefault('pwa.description');
  }

  // ==========================================================================
  // PUBLIC API - TECHNICAL INTEGRATION (NO DEFAULTS)
  // ==========================================================================

  static getSupabaseUrl(): string {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url || url === 'YOUR_SUPABASE_URL') {
      throw new Error('VITE_SUPABASE_URL must be configured');
    }
    return url;
  }

  static getSupabaseAnonKey(): string {
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!key || key === 'YOUR_SUPABASE_ANON_KEY') {
      throw new Error('VITE_SUPABASE_ANON_KEY must be configured');
    }
    return key;
  }

  static getMakeWebhookUrl(): string {
    const url = import.meta.env.VITE_MAKE_WEBHOOK_URL;
    if (!url || url === 'YOUR_MAKE_WEBHOOK_URL') {
      throw new Error('VITE_MAKE_WEBHOOK_URL must be configured');
    }
    return url;
  }

  static getFeedbackWebhookUrl(): string | undefined {
    const url = import.meta.env.VITE_FEEDBACK_WEBHOOK_URL;
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