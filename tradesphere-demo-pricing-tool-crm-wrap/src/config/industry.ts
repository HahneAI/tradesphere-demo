import * as Icons from 'lucide-react';
import { EnvironmentManager } from './defaults';

// SECTION 1: TYPE DEFINITIONS

interface LoadingAnimationConfig {
  type: 'growth' | 'building' | 'flow' | 'spark' | 'generic';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  icon: keyof typeof Icons;
  message: string;
}

interface SendEffectConfig {
  effect: 'leaf_flutter' | 'stone_ripple' | 'water_flow' | 'spark_burst' | 'gentle_pulse';
  colors: string[];
  duration: number;
}

interface TerminologyConfig {
  businessType: string;
  serviceTerms: string[];
  projectLanguage: string;
  estimateLanguage: string;
  completionTerms: string;
  placeholderExamples: string;
  buttonTexts: {
    send: string;
    clear: string;
    export: string;
  };
  statusMessages: {
    thinking: string;
    processing: string;
    complete: string;
  };
  urgencyLevel: 'routine' | 'seasonal' | 'emergency';
}

import { createSmartColorSystem } from './color-system';
type Theme = 'light' | 'dark';

export interface SmartVisualThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    background: string;
    surface: string;
    elevated: string;
    text: {
      primary: string;
      secondary: string;
      onPrimary: string;
      onSecondary: string;
    };
  };
  patterns: {
    backgroundTexture: string;
    borderStyle: string;
    componentShape: 'organic' | 'geometric';
  };
  animations: {
    messageEntry: 'slide' | 'grow';
    loadingStyle: 'pulse' | 'grow';
    hoverEffect: 'lift' | 'glow';
  };
}

type Season = 'spring' | 'summer' | 'fall' | 'winter';

interface SeasonalConfig {
  currentSeason: Season;
  seasonalColors: string[];
  seasonalMessage: string;
  weatherAwareness: boolean;
}


// SECTION 2: HELPER FUNCTIONS

const getCurrentSeason = (): Season => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
};

const getSeasonalColors = (season: Season, industry: string): string[] => {
  if (industry === 'landscaping') {
    switch (season) {
      case 'spring': return ['#4CAF50', '#81C784', '#A5D6A7'];
      case 'summer': return ['#FFC107', '#FFD54F', '#FFE082'];
      case 'fall': return ['#FF5722', '#FF8A65', '#FFAB91'];
      case 'winter': return ['#2196F3', '#64B5F6', '#90CAF9'];
    }
  }
  if (industry === 'tech') {
     switch (season) {
      case 'spring': return ['#2563eb', '#3b82f6', '#60a5fa'];
      case 'summer': return ['#1d4ed8', '#2563eb', '#3b82f6'];
      case 'fall': return ['#3b82f6', '#60a5fa', '#93c5fd'];
      case 'winter': return ['#60a5fa', '#93c5fd', '#bfdbfe'];
    }
  }
  return [];
}

const getSeasonalMessage = (season: Season, industry: string, region: string, climateZone?: string): string => {
  if (industry === 'landscaping') {
    const locationInfo = climateZone ? `${region} (Zone ${climateZone})` : region;
    switch (season) {
      case 'spring':
        return `It's a great time for planting and landscape refreshing in the ${locationInfo} area!`;
      case 'summer':
        return 'Ideal time for hardscaping and outdoor living projects.';
      case 'fall':
        return 'Ask about our fall cleanup and winter preparation services.';
      case 'winter':
        return `Perfect for planning next season's landscape transformation in ${locationInfo}.`;
      default:
        return '';
    }
  }
  return '';
};


// SECTION 3: CONFIGURATION GETTERS

export const getLoadingConfig = (): LoadingAnimationConfig => {
  // 🎯 USING CENTRALIZED DEFAULTS: Safe fallback to TradeSphere tech defaults
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const primaryColor = EnvironmentManager.getPrimaryColor();
  const secondaryColor = EnvironmentManager.getSecondaryColor();
  const loadingAnimation = EnvironmentManager.getLoadingAnimation();
  const companyName = EnvironmentManager.getCompanyName();

  // Industry-specific configurations
  if (industryType === 'landscaping' || loadingAnimation === 'growth') {
    return {
      type: 'growth',
      colors: { primary: primaryColor || '#2e8b57', secondary: secondaryColor || '#8b4513', accent: '#32cd32' },
      icon: 'TreePine',
      message: `Designing your landscape transformation for ${companyName}...`
    };
  }
  if (industryType === 'hvac' || loadingAnimation === 'building') { // Assuming 'building' for hvac
    return {
      type: 'building',
      colors: { primary: primaryColor || '#ff4500', secondary: secondaryColor || '#4169e1', accent: '#ffd700' },
      icon: 'Wrench',
      message: `Calibrating comfort systems for ${companyName}...`
    };
  }

  // TradeSphere defaults
  return {
    type: 'generic',
    colors: { primary: '#2563eb', secondary: '#1d4ed8', accent: '#3b82f6' },
    icon: 'MessageCircle',
    message: 'Initializing AI Pricing Engine...'
  };
};

export const getSendEffectConfig = (): SendEffectConfig => {
  // 🎯 USING CENTRALIZED DEFAULTS: Safe fallback to TradeSphere tech defaults
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const primaryColor = EnvironmentManager.getPrimaryColor();
  const sendEffect = EnvironmentManager.getSendEffect();

  // FIXED LOGIC: Check explicit effect setting first
  if (sendEffect === 'leaf_flutter') {
    return {
      effect: 'leaf_flutter',
      colors: [primaryColor, '#32cd32', '#8fbc8f'],
      duration: 1200
    };
  }

  if (sendEffect === 'spark_burst') {
    return {
      effect: 'spark_burst',
      colors: ['#ff4500', '#4169e1', '#ffd700'],
      duration: 600
    };
  }

  // THEN check industry defaults
  if (industryType === 'landscaping') {
    return {
      effect: 'leaf_flutter',
      colors: [primaryColor, '#32cd32', '#8fbc8f'],
      duration: 1200
    };
  }

  if (industryType === 'hvac') {
    return {
      effect: 'spark_burst',
      colors: ['#ff4500', '#4169e1', '#ffd700'],
      duration: 600
    };
  }

  // DEFAULT: Tech theme gets spark_burst
  return {
    effect: 'spark_burst',
    colors: [primaryColor, '#3b82f6', '#60a5fa'],
    duration: 600
  };
};

export const getTerminologyConfig = (): TerminologyConfig => {
  // 🎯 USING CENTRALIZED DEFAULTS: Safe fallback to TradeSphere tech defaults
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const companyName = EnvironmentManager.getCompanyName();

  // Define base configuration using centralized environment manager
  const baseConfig = {
    businessType: EnvironmentManager.getBusinessType(),
    serviceTerms: EnvironmentManager.getPrimaryServices(),
    projectLanguage: EnvironmentManager.getProjectLanguage(),
    estimateLanguage: EnvironmentManager.getEstimateLanguage(),
    completionTerms: 'project completion',
    placeholderExamples: EnvironmentManager.getPlaceholderExamples(),
    urgencyLevel: EnvironmentManager.getUrgencyLevel(),
    specialization: EnvironmentManager.getSpecialization() // Not used in returned object yet, but parsed
  };

  // Start with a default configuration
  let config = {
    ...baseConfig,
    buttonTexts: {
      send: 'Send',
      clear: 'Clear',
      export: 'Export',
    },
    statusMessages: {
      thinking: 'Analyzing your request...',
      processing: `Generating your ${baseConfig.estimateLanguage}...`,
      complete: `Your ${baseConfig.estimateLanguage} is ready!`,
    },
  };

  // Apply industry-specific overrides
  switch (industryType) {
    case 'landscaping':
      config = {
        ...config,
        // 🎯 Industry overrides handled by centralized defaults system
        businessType: EnvironmentManager.getBusinessType(),
        projectLanguage: EnvironmentManager.getProjectLanguage(),
        estimateLanguage: EnvironmentManager.getEstimateLanguage(),
        placeholderExamples: EnvironmentManager.getPlaceholderExamples(),
        urgencyLevel: EnvironmentManager.getUrgencyLevel(),
        buttonTexts: {
          send: 'Get My Landscape Estimate',
          clear: 'Start New Project Design',
          export: 'Download Landscape Proposal'
        },
        statusMessages: {
          thinking: `Calculating your ${config.estimateLanguage}...`,
          processing: `Designing your outdoor living solution for ${companyName}...`,
          complete: 'Your landscape transformation plan is ready!'
        },
      };
      break;

    case 'hvac':
      config = {
        ...config,
        // 🎯 Industry overrides handled by centralized defaults system
        businessType: EnvironmentManager.getBusinessType(),
        projectLanguage: EnvironmentManager.getProjectLanguage(),
        estimateLanguage: EnvironmentManager.getEstimateLanguage(),
        placeholderExamples: EnvironmentManager.getPlaceholderExamples(),
        urgencyLevel: EnvironmentManager.getUrgencyLevel(),
        buttonTexts: {
          send: 'Get My HVAC Quote',
          clear: 'Start New System Quote',
          export: 'Download HVAC Proposal'
        },
        statusMessages: {
          thinking: `Calculating your ${config.estimateLanguage}...`,
          processing: `Designing your comfort solution for ${companyName}...`,
          complete: 'Your comfort system plan is ready!'
        },
      };
      break;
  }

  return config;
};

export const getSmartVisualThemeConfig = (theme: Theme): SmartVisualThemeConfig => {
  // 🎯 USING CENTRALIZED DEFAULTS: Safe fallback to TradeSphere tech defaults
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const primaryColor = EnvironmentManager.getPrimaryColor();
  const secondaryColor = EnvironmentManager.getSecondaryColor();
  const accentColor = EnvironmentManager.getAccentColor();
  const messageStyle = EnvironmentManager.getMessageStyle();
  const backgroundPattern = EnvironmentManager.getBackgroundPattern();

  // Define default colors based on industry
  const industryDefaults = {
    landscaping: {
      primary: '#2e8b57',
      secondary: '#8b4513',
      accent: '#f4a460',
    },
    tech: {
      primary: '#2563eb',
      secondary: '#1d4ed8',
      accent: '#3b82f6',
    },
  };

  const defaults = industryType === 'landscaping' ? industryDefaults.landscaping : industryDefaults.tech;

  // Create the smart color system
  const colorSystem = createSmartColorSystem(
    primaryColor || defaults.primary,
    secondaryColor || defaults.secondary,
    accentColor || defaults.accent
  );

  // Define industry-specific patterns and animations
  const industryPatterns = {
    landscaping: {
      backgroundTexture: backgroundPattern || 'subtle-organic',
      borderStyle: 'soft-borders',
      componentShape: messageStyle === 'organic' ? 'organic' : 'geometric',
      messageEntry: 'grow',
      loadingStyle: 'grow',
      hoverEffect: 'lift',
    },
    tech: {
      backgroundTexture: backgroundPattern || 'subtle-tech',
      borderStyle: 'subtle-borders',
      componentShape: 'geometric',
      messageEntry: 'slide',
      loadingStyle: 'pulse',
      hoverEffect: 'glow',
    },
  };

  const patterns = industryType === 'landscaping' ? industryPatterns.landscaping : industryPatterns.tech;

  return {
    colors: {
      primary: colorSystem.primary[theme],
      secondary: colorSystem.secondary[theme],
      accent: colorSystem.accent[theme],
      success: colorSystem.success[theme],
      background: colorSystem.surfaces[theme].background,
      surface: colorSystem.surfaces[theme].surface,
      elevated: colorSystem.surfaces[theme].elevated,
      text: {
        primary: colorSystem.text[theme].primary,
        secondary: colorSystem.text[theme].secondary,
        onPrimary: colorSystem.contrast[theme].onPrimary,
        onSecondary: colorSystem.contrast[theme].onSecondary,
      },
    },
    patterns: {
      backgroundTexture: patterns.backgroundTexture,
      borderStyle: patterns.borderStyle,
      componentShape: patterns.componentShape as 'organic' | 'geometric',
    },
    animations: {
      messageEntry: patterns.messageEntry as 'grow' | 'slide',
      loadingStyle: patterns.loadingStyle as 'grow' | 'pulse',
      hoverEffect: patterns.hoverEffect as 'lift' | 'glow',
    },
  };
};

/**
 * @deprecated Use getSmartVisualThemeConfig instead.
 * This function is for backward compatibility to prevent app crashes.
 * It defaults to the 'light' theme.
 */
export const getVisualThemeConfig = () => {
    console.warn("getVisualThemeConfig is deprecated and will be removed. Use getSmartVisualThemeConfig(theme) for dynamic theme support.");
    return getSmartVisualThemeConfig('light');
};

export const getSeasonalConfig = (): SeasonalConfig => {
  // 🎯 USING CENTRALIZED DEFAULTS: Safe fallback to TradeSphere tech defaults
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const seasonalThemes = EnvironmentManager.getUseSeasonalThemes();
  const region = EnvironmentManager.getRegion();
  const climateZone = EnvironmentManager.getClimateZone();

  if (!seasonalThemes) {
    return {
      currentSeason: 'spring', // default
      seasonalColors: [],
      seasonalMessage: '',
      weatherAwareness: false
    };
  }

  const currentSeason = getCurrentSeason();

  if (industryType === 'landscaping') {
    return {
      currentSeason,
      seasonalColors: getSeasonalColors(currentSeason, 'landscaping'),
      seasonalMessage: getSeasonalMessage(currentSeason, 'landscaping', region, climateZone),
      weatherAwareness: true
    };
  }

  // TradeSphere default
  return {
    currentSeason,
    seasonalColors: getSeasonalColors(currentSeason, 'tech'),
    seasonalMessage: '', // No message for default theme
    weatherAwareness: false
  };
};

// Core config that doesn't change by industry
export const getCoreConfig = () => {
    // 🎯 USING CENTRALIZED DEFAULTS: Safe fallback to TradeSphere tech defaults
    // Note: Technical integration variables (Supabase/Make) will throw errors if not configured
    return {
        supabaseUrl: EnvironmentManager.getSupabaseUrl(),
        supabaseAnonKey: EnvironmentManager.getSupabaseAnonKey(),
        makeWebhookUrl: EnvironmentManager.getMakeWebhookUrl(),
        companyName: EnvironmentManager.getCompanyName(),
        headerIcon: EnvironmentManager.getHeaderIcon(),
        logoUrl: EnvironmentManager.getLogoUrl(),
    };
};
