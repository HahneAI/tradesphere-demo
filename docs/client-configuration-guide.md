# TradeSphere Client Configuration Guide

## Overview

TradeSphere now uses a hybrid configuration system that separates visual/branding settings from sensitive API keys:

- **Visual/Branding Settings**: Stored in `src/config/branding.ts` (compiled at build-time)
- **API Keys & Technical**: Stored in `.env` file (runtime environment variables)

This approach allows you to:
- ✅ Stay under AWS Lambda's 4KB environment variable limit
- ✅ Customize branding without touching sensitive credentials
- ✅ Version control visual settings safely
- ✅ Deploy different client configurations easily

## Quick Start Guide

### 1. Set Up API Keys (.env file)
Copy `.env.example` to `.env` and fill in the actual values:

```bash
cp .env.example .env
```

### 2. Customize Visual Branding (branding.ts file)
Edit `src/config/branding.ts` with client-specific settings:

```typescript
export const brandingConfig = {
  companyName: "Your Client Name",
  primaryColor: "#your-brand-color",
  // ... other settings
}
```

### 3. Build and Deploy
```bash
npm run build
# Deploy to your hosting platform
```

---

## Detailed Configuration

### Visual Branding Configuration (`src/config/branding.ts`)

#### Core Branding
```typescript
// Company Identity
companyName: "Your Client Company Name",
logoUrl: "/assets/branding/client-logo.svg",

// Color Palette (hex format)
primaryColor: "#3b82f6",      // Main brand color
secondaryColor: "#6b7280",    // Supporting color
accentColor: "#ef4444",       // Highlights/notifications
successColor: "#22c55e",      // Success indicators
```

#### Visual Customization
```typescript
// Header & Icons
headerIcon: "Briefcase",              // Lucide icon name

// Animations & Effects
sendEffect: "none",                    // Options: none, leaf_flutter, spark_burst, gear_spin, water_ripple
loadingAnimation: "default",          // Options: default, growth, building, gears, dots
messageStyle: "geometric",            // Options: geometric, organic
backgroundPattern: "none",            // Options: none, subtle_organic, technical_grid, blueprint
```

#### Business Terminology
```typescript
// Industry-Specific Language
businessType: "landscape_contractor",
projectLanguage: "outdoor_project",
estimateLanguage: "landscape_investment",
primaryServices: "landscaping,hardscaping,design,maintenance",
placeholderExamples: "e.g., 'I want a new patio and fire pit.'",
specialization: "full_service",       // Options: full_service, specialist, consultant
urgencyLevel: "seasonal",             // Options: routine, seasonal, emergency
```

#### Industry Settings
```typescript
// Industry Theme
industryType: "landscaping",          // Options: "", "landscaping", "hvac"
useSeasonalThemes: true,             // Enable seasonal adjustments
region: "northeast",                  // Geographic region for seasonality
climateZone: "6b",                   // USDA hardiness zone
```

#### PWA (Progressive Web App) Settings
```typescript
pwa: {
  name: "Client Company Name",
  shortName: "ClientApp",            // 12 chars max for home screen
  description: "Professional description for app stores",
  icon192: "client-192x192.png",     // Place in public/ folder
  icon512: "client-512x512.png",
  favicon: "client-favicon.ico",
  appleIcon: "client-180x180-apple.png"
}
```

---

## Industry-Specific Examples

### Landscaping Company
```typescript
export const brandingConfig = {
  companyName: "GreenScape Solutions",
  primaryColor: "#2e8b57",           // Forest green
  secondaryColor: "#8b4513",         // Saddle brown
  accentColor: "#f4a460",            // Sandy brown
  successColor: "#32cd32",           // Lime green
  
  headerIcon: "TreePine",
  sendEffect: "leaf_flutter",
  loadingAnimation: "growth",
  messageStyle: "organic",
  backgroundPattern: "subtle_organic",
  
  businessType: "landscape_contractor",
  projectLanguage: "outdoor_project",
  estimateLanguage: "landscape_investment",
  primaryServices: "landscaping,hardscaping,design,maintenance",
  placeholderExamples: "e.g., 'I want a new patio and fire pit.'",
  specialization: "full_service",
  urgencyLevel: "seasonal",
  
  industryType: "landscaping",
  useSeasonalThemes: true,
  region: "northeast",
  climateZone: "6b"
};
```

### HVAC Company
```typescript
export const brandingConfig = {
  companyName: "Climate Control Pros",
  primaryColor: "#ff4500",           // Orange red
  secondaryColor: "#4169e1",         // Royal blue
  accentColor: "#ffd700",            // Gold
  successColor: "#28a745",           // Success green
  
  headerIcon: "Wrench",
  sendEffect: "spark_burst",
  loadingAnimation: "building",
  messageStyle: "geometric",
  backgroundPattern: "technical_grid",
  
  businessType: "HVAC_specialist",
  projectLanguage: "comfort_system",
  estimateLanguage: "system_quote",
  primaryServices: "HVAC repair,installation,maintenance,emergency service",
  placeholderExamples: "e.g., 'My AC is not working'",
  specialization: "specialist",
  urgencyLevel: "emergency",
  
  industryType: "hvac",
  useSeasonalThemes: false
};
```

### Tech/Consulting Company
```typescript
export const brandingConfig = {
  companyName: "TechSolutions Pro",
  primaryColor: "#2563eb",           // Professional blue
  secondaryColor: "#1d4ed8",         // Deeper blue
  accentColor: "#3b82f6",            // Bright blue
  successColor: "#10b981",           // Tech green
  
  headerIcon: "Briefcase",
  sendEffect: "spark_burst",
  loadingAnimation: "default",
  messageStyle: "geometric",
  backgroundPattern: "none",
  
  businessType: "business_consultant",
  projectLanguage: "project",
  estimateLanguage: "estimate",
  primaryServices: "consulting,strategy,analysis",
  placeholderExamples: "e.g., 'I need help with my business strategy.'",
  specialization: "consultant",
  urgencyLevel: "routine",
  
  industryType: "",                  // Default tech theme
  useSeasonalThemes: false
};
```

---

## API Configuration (.env file)

⚠️ **Security Note**: Never commit your `.env` file to version control. It contains sensitive API keys.

### Required Variables
```bash
# Database Connection
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Automation Webhooks
VITE_MAKE_WEBHOOK_URL=https://hook.us1.make.com/your-webhook-id
VITE_FEEDBACK_WEBHOOK_URL=https://hook.us1.make.com/your-feedback-webhook

# AI Services
VITE_AI_API_KEY=your_claude_api_key
VITE_AI_PROVIDER="claude"
VITE_OPENAI_API_KEY_MINI=your_openai_api_key

# Google Sheets Integration
VITE_GOOGLE_SHEETS_SHEET_ID=your_google_sheet_id
VITE_GOOGLE_PROJECT_ID=your_google_project_id
VITE_GOOGLE_PRIVATE_KEY_ID=your_private_key_id
VITE_GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_content\n-----END PRIVATE KEY-----\n"

# Feature Flags
VITE_ENABLE_DUAL_TESTING=false    # Set to true only for development/testing
```

---

## Deployment Process

### 1. Prepare Client Configuration
1. **Copy configuration template**: `cp src/config/branding.ts src/config/branding-client.ts`
2. **Edit client settings**: Update colors, company name, industry settings
3. **Replace original**: `mv src/config/branding-client.ts src/config/branding.ts`

### 2. Set Up Environment
1. **Copy environment template**: `cp .env.example .env`
2. **Fill in API keys**: Add client's actual credentials
3. **Verify settings**: Test locally with `npm run dev`

### 3. Build and Deploy
```bash
# Build with client configuration
npm run build

# Deploy to hosting platform (Netlify, Vercel, etc.)
# Platform will use environment variables from their settings
```

### 4. Asset Preparation
- **Logo**: Place client logo in `public/assets/branding/`
- **PWA Icons**: Add client-specific icons to `public/` folder
- **Favicon**: Replace `public/favicon.ico` with client favicon

---

## Common Customization Patterns

### Color Palette Selection
```typescript
// Professional (Blue theme)
primaryColor: "#2563eb",
secondaryColor: "#1d4ed8",
accentColor: "#3b82f6",

// Nature/Landscaping (Green theme)  
primaryColor: "#16a34a",
secondaryColor: "#15803d",
accentColor: "#22c55e",

// Energy/HVAC (Orange theme)
primaryColor: "#ea580c",
secondaryColor: "#c2410c",
accentColor: "#fb923c",

// Luxury (Purple theme)
primaryColor: "#7c3aed",
secondaryColor: "#5b21b6",
accentColor: "#8b5cf6",
```

### Icon Selection (Lucide Icons)
Common choices by industry:
- **Landscaping**: TreePine, Flower, Sprout
- **HVAC**: Wrench, Zap, Settings
- **Construction**: HardHat, Hammer, Building
- **Tech**: Briefcase, Monitor, Cpu
- **General**: MessageCircle, Star, Target

### Terminology Customization
Adapt language to client's business style:
```typescript
// Formal/Professional
projectLanguage: "engagement",
estimateLanguage: "investment_proposal",

// Casual/Friendly  
projectLanguage: "job",
estimateLanguage: "quote",

// Industry-Specific
projectLanguage: "system_upgrade",      // HVAC
estimateLanguage: "comfort_investment", // HVAC
```

---

## Troubleshooting

### Common Issues

#### 1. Build Errors After Configuration Changes
```bash
# Clear build cache and rebuild
rm -rf dist/
npm run build
```

#### 2. Icons Not Displaying
- Verify icon name exists in [Lucide Icons](https://lucide.dev/icons/)
- Check exact spelling and capitalization
- Use fallback: `headerIcon: "MessageCircle"`

#### 3. Colors Not Applying
- Ensure hex format: `#123456` not `123456`
- Check for typos in property names
- Verify branding.ts syntax is valid

#### 4. Environment Variables Not Working
- Confirm `.env` file is in project root
- Restart development server after changes
- Check for missing quotes around values with spaces

### File Structure Reference
```
project/
├── .env                          # API keys (not in git)
├── .env.example                  # Template with placeholders
├── src/config/branding.ts        # Visual configuration
├── docs/client-configuration-guide.md  # This guide
└── public/assets/branding/       # Client logos and assets
```

---

## Support

For technical support with configuration:
1. Check build output for specific error messages
2. Verify all required fields in branding.ts are present
3. Test with minimal configuration first
4. Gradually add customizations

The configuration system is designed to be flexible while maintaining compatibility with the TradeSphere core functionality.