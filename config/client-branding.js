export const brandingConfig = {
  companyName: process.env.VITE_COMPANY_NAME || 'TradeSphere',
  primaryColor: process.env.VITE_PRIMARY_COLOR || '#2563eb',
  logoUrl: process.env.VITE_LOGO_URL || '/assets/branding/default-logo.svg',
  welcomeMessage: process.env.VITE_WELCOME_MESSAGE || "Let's make some profit. What are we doing today?",
  industry: process.env.VITE_INDUSTRY_TYPE || 'general_trades'
};
