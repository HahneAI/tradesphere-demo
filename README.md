# TradeSphere - AI-Powered Pricing Tool

TradeSphere is a work-in-progress application that uses artificial intelligence to power pricing quotes for various small trade companies. The platform provides intelligent, conversational project estimates while adapting to different industry needs.

## Overview

This tool helps trade businesses deliver instant, accurate pricing estimates through an AI-powered chat interface. Whether you're a landscaping contractor, HVAC technician, or other service-based business, TradeSphere can be customized to match your specific industry requirements and pricing models.

## Key Features

- **AI-Powered Conversations**: Natural language processing for understanding customer project requests
- **Industry-Specific Customization**: Configurable for different trade industries (landscaping, HVAC, etc.)
- **Dynamic Pricing Calculation**: Integration with Google Sheets for real-time pricing calculations
- **Client Branding**: Customizable visual themes and terminology for different businesses
- **Progressive Web App**: Installable mobile-friendly interface

## Technology Stack

- **Frontend**: React with TypeScript
- **AI Integration**: Claude/OpenAI APIs for conversation and service analysis
- **Backend**: Netlify Functions with Make.com webhook integration
- **Database**: Supabase for data persistence
- **Pricing Engine**: Google Sheets API integration
- **Build System**: Vite with PWA support

## Getting Started

1. **Configuration**: See `docs/client-configuration-guide.md` for complete setup instructions
2. **API Keys**: Configure environment variables in `.env` file
3. **Development**: Run `npm run dev` to start local development server
4. **Testing**: Use `npm run test:mock:pure` for quick validation testing

## Documentation

- **Client Setup**: `docs/client-configuration-guide.md` - Complete client customization guide
- **API Reference**: `API-KEY-REFERENCE.md` - AI API key configuration
- **Testing Guide**: `README-Testing.md` - Testing framework documentation
- **Build Configuration**: `NETLIFY-BUILD-FIX.md` - Production deployment setup

## Project Status

This is an active work-in-progress project focused on replacing complex automation workflows with direct AI-powered pricing solutions. The application is designed to be lightweight, fast, and easily deployable for individual trade businesses.

## Support

For configuration and setup questions, refer to the documentation files in the `docs/` directory or review the test files for implementation examples.