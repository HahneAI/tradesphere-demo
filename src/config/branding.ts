/**
 * Build-Time Branding Configuration
 * These values are compiled into the build and don't count toward Lambda 4KB limit
 */

export const brandingConfig = {
  // Core Branding
  companyName: "TradeSphere Dev",
  logoUrl: "/assets/branding/default-logo.svg",
  
  // Color Palette
  primaryColor: "#3b82f6",
  secondaryColor: "#6b7280", 
  accentColor: "#ef4444",
  successColor: "#22c55e",
  
  // Visual Customization
  headerIcon: "Briefcase",
  sendEffect: "none",
  loadingAnimation: "default",
  messageStyle: "geometric",
  backgroundPattern: "none",
  
  // Business Terminology
  businessType: "business_consultant",
  projectLanguage: "project",
  estimateLanguage: "estimate",
  primaryServices: "consulting,strategy,analysis",
  placeholderExamples: "e.g., 'I need help with my business strategy.'",
  specialization: "consultant",
  urgencyLevel: "routine",
  
  // Industry Settings
  industryType: "",
  useSeasonalThemes: false,
  region: "northeast",
  climateZone: "6b",
  
  // PWA Configuration
  pwa: {
    name: "TradeSphere",
    shortName: "TradeSphere",
    description: "A revolutionary pricing tool for the trade industry.",
    icon192: "192x192-ts.png",
    icon512: "512x512-ts.png",
    favicon: "favicon.ico",
    appleIcon: "180x180-ts-apple.png"
  }
} as const;

export type BrandingConfig = typeof brandingConfig;