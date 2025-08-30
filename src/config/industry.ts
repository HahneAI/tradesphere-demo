import * as Icons from 'lucide-react';

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
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const primaryColor = import.meta.env.VITE_PRIMARY_COLOR;
  const secondaryColor = import.meta.env.VITE_SECONDARY_COLOR;
  const loadingAnimation = import.meta.env.VITE_LOADING_ANIMATION;
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'TradeSphere';

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
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const primaryColor = import.meta.env.VITE_PRIMARY_COLOR || '#2563eb';
  const sendEffect = import.meta.env.VITE_SEND_EFFECT;

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
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'TradeSphere';

  // Define base configuration from environment variables with sensible defaults
  const baseConfig = {
    businessType: import.meta.env.VITE_BUSINESS_TYPE || 'business consultant',
    serviceTerms: (import.meta.env.VITE_PRIMARY_SERVICES || 'consulting,strategy,analysis').split(','),
    projectLanguage: import.meta.env.VITE_PROJECT_LANGUAGE || 'project',
    estimateLanguage: import.meta.env.VITE_ESTIMATE_LANGUAGE || 'estimate',
    completionTerms: 'project completion',
    placeholderExamples: import.meta.env.VITE_PLACEHOLDER_EXAMPLES || 'e.g., "I need help with my business strategy."',
    urgencyLevel: (import.meta.env.VITE_URGENCY_LEVEL as TerminologyConfig['urgencyLevel']) || 'routine',
    specialization: import.meta.env.VITE_SPECIALIZATION || 'consultant' // Not used in returned object yet, but parsed
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
        businessType: import.meta.env.VITE_BUSINESS_TYPE || 'landscape contractor',
        projectLanguage: import.meta.env.VITE_PROJECT_LANGUAGE || 'outdoor project',
        estimateLanguage: import.meta.env.VITE_ESTIMATE_LANGUAGE || 'landscape investment',
        placeholderExamples: import.meta.env.VITE_PLACEHOLDER_EXAMPLES || "e.g., 'I want a new patio and a fire pit.'",
        urgencyLevel: (import.meta.env.VITE_URGENCY_LEVEL as TerminologyConfig['urgencyLevel']) || 'seasonal',
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
        businessType: import.meta.env.VITE_BUSINESS_TYPE || 'HVAC specialist',
        projectLanguage: import.meta.env.VITE_PROJECT_LANGUAGE || 'comfort system',
        estimateLanguage: import.meta.env.VITE_ESTIMATE_LANGUAGE || 'system quote',
        placeholderExamples: import.meta.env.VITE_PLACEHOLDER_EXAMPLES || "e.g., 'My AC is not working'",
        urgencyLevel: (import.meta.env.VITE_URGENCY_LEVEL as TerminologyConfig['urgencyLevel']) || 'emergency',
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
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const primaryColor = import.meta.env.VITE_PRIMARY_COLOR;
  const secondaryColor = import.meta.env.VITE_SECONDARY_COLOR;
  const accentColor = import.meta.env.VITE_ACCENT_COLOR;
  const messageStyle = import.meta.env.VITE_MESSAGE_STYLE;
  const backgroundPattern = import.meta.env.VITE_BACKGROUND_PATTERN;

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
  const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
  const seasonalThemes = import.meta.env.VITE_USE_SEASONAL_THEMES === 'true';
  const region = import.meta.env.VITE_REGION || 'general';
  const climateZone = import.meta.env.VITE_CLIMATE_ZONE;

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
    return {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        makeWebhookUrl: import.meta.env.VITE_MAKE_WEBHOOK_URL,
        companyName: import.meta.env.VITE_COMPANY_NAME || 'TradeSphere',
        headerIcon: (import.meta.env.VITE_HEADER_ICON as keyof typeof Icons) || 'MessageCircle',
        logoUrl: import.meta.env.VITE_LOGO_URL,
    };
};
