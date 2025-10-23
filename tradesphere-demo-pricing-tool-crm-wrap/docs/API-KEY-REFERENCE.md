# 🔑 TradeSphere API Key Reference Guide

This document explains TradeSphere's dual AI API key configuration and which services use each key.

## 📋 Overview

TradeSphere uses **two separate AI API keys** for optimal performance, cost efficiency, and service isolation:

1. **Main AI Key** (`VITE_AI_API_KEY`) - Primary conversation and chat functionality
2. **GPT-4o-mini Key** (`VITE_OPENAI_API_KEY_MINI`) - Fast service categorization and splitting

## 🔧 API Key Configuration

### 1. Main AI Key (`VITE_AI_API_KEY`)

**Purpose**: Powers main chat interface and conversation AI  
**Used By**: 
- Main chat functionality
- Make.com webhook integration  
- Conversation AI processing
- User interaction handling

**Supported Providers**:
- OpenAI (GPT-3.5, GPT-4, GPT-4-turbo)
- Anthropic Claude (Claude-3, Claude-3.5)

**Example Configuration**:
```bash
VITE_AI_API_KEY=sk-1234567890abcdef...  # OpenAI key
# OR
VITE_AI_API_KEY=sk-ant-1234567890...    # Claude key
```

**Get Your Key**:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

### 2. GPT-4o-mini Key (`VITE_OPENAI_API_KEY_MINI`)

**Purpose**: Fast, cost-efficient service splitting and category detection  
**Used By**:
- `GPTServiceSplitter.ts` - Service categorization
- Multi-service input parsing
- Category detection for priority matching
- Smart service splitting

**Model**: GPT-4o-mini (optimized for speed and cost)

**Example Configuration**:
```bash
VITE_OPENAI_API_KEY_MINI=sk-proj-1234567890abcdef...
```

**Get Your Key**: https://platform.openai.com/api-keys

## 📊 Service Mapping

| Service/Component | API Key Used | Fallback Behavior |
|-------------------|--------------|------------------|
| Main Chat Interface | `VITE_AI_API_KEY` | Show error message |
| Make.com Webhook | `VITE_AI_API_KEY` | Webhook fails |
| GPTServiceSplitter | `VITE_OPENAI_API_KEY_MINI` | **Mock mode** |
| Category Detection | `VITE_OPENAI_API_KEY_MINI` | Rule-based patterns |
| Service Splitting | `VITE_OPENAI_API_KEY_MINI` | Regex-based splitting |
| ServiceMappingEngine | None (local processing) | Always works |
| Google Sheets Integration | `VITE_GOOGLE_SHEETS_API_KEY` | Mock pricing |

## ⚡ Benefits of Dual Key Setup

### 🏆 **Performance Optimization**
- **Main AI Key**: High-quality models for complex conversations
- **GPT-4o-mini Key**: Fast, lightweight model for parsing tasks

### 💰 **Cost Efficiency** 
- Use expensive models only for high-value chat interactions
- Use cost-efficient GPT-4o-mini for repetitive parsing tasks
- Separate billing tracking for different service types

### 🔒 **Rate Limiting & Reliability**
- Independent rate limits for each service type
- If one key hits limits, other services continue working
- Better fault tolerance and service isolation

### 📈 **Monitoring & Analytics**
- Track usage separately by functionality
- Identify optimization opportunities
- Better cost attribution

## 🚀 Setup Instructions

### Step 1: Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

### Step 2: Add Your API Keys

Edit `.env` file:
```bash
# Main AI functionality
VITE_AI_API_KEY=your_main_ai_api_key_here

# Fast service splitting
VITE_OPENAI_API_KEY_MINI=your_gpt_4o_mini_api_key_here

# Google Sheets integration
VITE_GOOGLE_SHEETS_API_KEY=your_google_api_key_here
VITE_GOOGLE_SHEETS_SHEET_ID=your_spreadsheet_id
```

### Step 3: Verify Setup

Run the environment validation:
```bash
npm run test:gpt
```

Or check status programmatically:
```typescript
import { logEnvironmentStatus } from './src/utils/environment-validator';
logEnvironmentStatus();
```

## 🔍 Testing & Validation

### Environment Status Check
```bash
# Full GPT-enhanced test suite
npm run test:gpt:enhanced

# Compare GPT vs traditional approaches  
npm run test:gpt:comparison

# Test GPT service splitter only
npm run test:gpt-splitter
```

### VS Code Debug Configurations

Two debug configurations are available:

1. **🤖 Debug: GPT Category & Splitting (API Mode)**
   - Uses `VITE_OPENAI_API_KEY_MINI` 
   - Prompts for OpenAI API key if not set

2. **🧪 Debug: Mock Category & Splitting (No API)**
   - Uses mock mode (no API key required)
   - Perfect for testing without API costs

## 🛠️ Troubleshooting

### Common Issues

**❌ "No VITE_OPENAI_API_KEY_MINI found, using mock mode"**
- **Solution**: Add `VITE_OPENAI_API_KEY_MINI=your_key` to `.env` file
- **Impact**: Service splitting uses rule-based patterns instead of AI

**❌ "Main AI API key not configured"**  
- **Solution**: Add `VITE_AI_API_KEY=your_key` to `.env` file
- **Impact**: Chat functionality may not work

**❌ API key format errors**
- OpenAI keys start with `sk-` or `sk-proj-`
- Claude keys start with `sk-ant-`
- Keys should be 50+ characters long

### Fallback Behaviors

| Missing Key | Service Impact | Fallback Behavior |
|-------------|---------------|------------------|
| `VITE_AI_API_KEY` | Main chat fails | Error messages |
| `VITE_OPENAI_API_KEY_MINI` | **Graceful degradation** | Mock mode with rule-based logic |
| Both keys | Limited functionality | Local processing only |

## 🎯 Best Practices

### 🔐 Security
- Never commit API keys to version control
- Use separate keys for development and production
- Rotate keys regularly
- Monitor usage for unusual patterns

### 💡 Optimization
- Use GPT-4o-mini key for high-volume parsing tasks
- Reserve main AI key for complex conversations
- Monitor costs by service type
- Adjust rate limits based on usage patterns

### 🧪 Development
- Use mock mode during development to save API costs
- Test with both keys to ensure full functionality
- Validate environment before deployment
- Use VS Code debug configs for easy testing

## 📞 Support

For additional help with API key configuration:

1. **Environment Validation**: Run `npm run test:gpt`
2. **Documentation**: Check `.env.example` for latest examples
3. **Testing**: Use mock mode for cost-free development
4. **Debugging**: Use VS Code configurations for step-through testing

---

*Last updated: 2024 - TradeSphere v2.0*