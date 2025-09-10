# 🔧 TradeSphere Debug Configuration Guide

*Complete guide to activating and using all debug points in the TradeSphere pricing pipeline*

---

## 📁 VS Code Debug Configuration

### File to Create: `.vscode/launch.json`
Copy the following content to enable VS Code debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "🤖 Debug GPT Service Splitting Process",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/services/ai-engine/GPTServiceSplitter.ts",
      "runtimeArgs": ["--import=tsx/esm"],
      "env": {
        "TEST_INPUT": "45 sqft mulch and 3 feet edging",
        "DEBUG_MODE": "true"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "📐 Debug Dimension Calculator Isolated",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/utils/dimension-calculator.ts",
      "runtimeArgs": ["--import=tsx/esm"],
      "env": {
        "TEST_INPUT": "15 by 10 patio"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "🎭 Debug Sales Personality Formatting",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/services/ai-engine/SalesPersonalityService.ts",
      "runtimeArgs": ["--import=tsx/esm"],
      "env": {
        "DEBUG_MODE": "true"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "🔍 Debug Full Parameter Collection Flow",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/services/ai-engine/ParameterCollectorService.ts",
      "runtimeArgs": ["--import=tsx/esm"],
      "env": {
        "TEST_INPUT": "45 sqft mulch and 3 feet edging",
        "DEBUG_MODE": "true",
        "MOCK_MODE": "true"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "💰 Debug Pricing Calculator Service",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/services/ai-engine/PricingCalculatorService.ts",
      "runtimeArgs": ["--import=tsx/esm"],
      "env": {
        "DEBUG_MODE": "true",
        "MOCK_MODE": "true"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "⚡ Debug Netlify Function",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/netlify/functions/pricing-agent.ts",
      "runtimeArgs": ["--import=tsx/esm"],
      "env": {
        "DEBUG_MODE": "true"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## 🎯 Debug Points Activation Guide

### 1. 🤖 **GPT Service Splitting Debug Points**

**File**: `src/services/ai-engine/GPTServiceSplitter.ts`

**How to Activate**:
```typescript
import { GPTServiceSplitter } from './src/services/ai-engine/GPTServiceSplitter';

const splitter = new GPTServiceSplitter();
const result = await splitter.analyzeAndSplit("20x15 patio with mulch and edging");
```

**Debug Output Includes**:
- 🤖 GPT REQUEST PAYLOAD: Input, model, prompt preview
- 🤖 API REQUEST DETAILS: Endpoint, temperature, token limits, masked API key
- 🤖 HTTP RESPONSE STATUS: Status codes, headers
- 🤖 GPT RAW RESPONSE: Choices count, content preview, usage metrics
- 🤖 GPT PARSED RESULT: Service count, categories, confidence scores

**Test Command**: 
```bash
npm run test:gpt-splitter
```

---

### 2. 📐 **Dimension Calculation Debug Points**

**File**: `src/services/ai-engine/ServiceMappingEngine.ts`

**How to Activate**:
```typescript
import { ServiceMappingEngine } from './src/services/ai-engine/ServiceMappingEngine';

const result = await ServiceMappingEngine.mapUserInput("15x10 patio installation");
```

**Debug Output Includes**:
- 📐 DIMENSION CHECK: Text analysis for dimensions
- 📐 SERVICE CONFIG: Expected unit validation
- 📐 DIMENSION FOUND: Calculation type, quantity, confidence
- 📐 UNIT COMPATIBILITY CHECK: Unit conversion verification
- 📐 NO DIMENSIONS FOUND: Fallback to standard patterns

**Triggers**: Any input with dimensions like "15x10", "20 by 30", "100 sqft"

---

### 3. 🗺️ **Service-to-Row Mapping Debug Points**

**File**: `src/services/ai-engine/ParameterCollectorService.ts`

**How to Activate**:
```typescript
import { ParameterCollectorService } from './src/services/ai-engine/ParameterCollectorService';

const result = await ParameterCollectorService.collectParameters("I need mulch and edging");
```

**Debug Output Includes**:
- 🗺️ SERVICE MAPPING START: Input and timestamp
- 🗺️ SERVICE MAPPING COMPLETE: Services found, confidence, unmapped text
- 🗺️ SERVICE 1, 2, 3...: Detailed breakdown per service
- ⚠️ UNMAPPED TEXT FOUND: Text that couldn't be mapped

**Test Command**:
```bash
npm run test:mock:simple
```

---

### 4. 📈 **Google Sheets API Debug Points**

**File**: `src/services/ai-engine/PricingCalculatorService.ts`

**How to Activate**:
```typescript
import { PricingCalculatorService } from './src/services/ai-engine/PricingCalculatorService';

const calculator = new PricingCalculatorService();
const result = await calculator.calculatePricing(services, betaCodeId);
```

**Debug Output Includes**:
- 📈 GOOGLE SHEETS API REQUEST: Services, beta code, masked sheet ID
- 📈 GOOGLE SHEETS API RESPONSE: Success, total cost, processing time
- 📈 SERVICE 1, 2, 3... PRICING: Individual service breakdowns

**Test Commands**:
```bash
npm run test:real-logic
npm run test:pricing
```

---

### 5. 🎭 **Sales Personality Debug Points**

**File**: `src/services/ai-engine/SalesPersonalityService.ts`

**How to Activate**:
```typescript
import { SalesPersonalityService } from './src/services/ai-engine/SalesPersonalityService';

const response = SalesPersonalityService.formatSalesResponse(pricingResult, customerContext);
```

**Debug Output Includes**:
- 🎭 RESPONSE FORMATTING START: Customer info, total cost, services count
- 🎭 PERSONALITY ANALYSIS: Customer context, pricing context, selected tone
- 🎭 FINAL RESPONSE GENERATED: Message length, price inclusion, tone

**Test Scenario**: Any completed pricing calculation triggers this automatically

---

### 6. 🎯 **Netlify Function Debug Points**

**File**: `netlify/functions/pricing-agent.ts`

**How to Activate**:
Send POST request to pricing endpoint:
```bash
curl -X POST http://localhost:8888/.netlify/functions/pricing-agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need 100 sqft mulch and 20 feet edging",
    "sessionId": "test-session",
    "firstName": "John",
    "betaCodeId": 1
  }'
```

**Debug Output Includes**:
- 🎯 STEP 1 START: Parameter Collection inputs
- 🎯 STEP 1 COMPLETE: Services found, confidence, processing time
- 💰 STEP 2 START: Pricing Calculation inputs  
- 💰 STEP 2 INPUT: Services count, beta code, irrigation detection
- 📝 STEP 3 START: Sales Response Formatting
- 📝 STEP 3 INPUT: Total cost, customer context

**Test Command**:
```bash
npm run dev  # Then use curl or frontend
```

---

### 7. 🔧 **Debug Helper Utilities**

**File**: `src/utils/debug-helper.ts`

**How to Activate Each Function**:
```typescript
import { DebugHelper } from './src/utils/debug-helper';

// Environment status
DebugHelper.logEnvironmentStatus();

// Service mapping analysis
DebugHelper.logServiceMappingDebug(input, result);

// Performance timing
DebugHelper.logTimingBreakdown(metrics);

// Google Sheets interactions
DebugHelper.logGoogleSheetsDebug('CALCULATION', { sheetId, betaCodeId, success: true });

// AI interactions
DebugHelper.logAIInteractionDebug('GPT', 'ANALYSIS', { model: 'gpt-4o-mini', inputLength: 100 });

// Resource usage
DebugHelper.logResourceUsage();

// Error with context
DebugHelper.logErrorWithContext(error, { operation: 'pricing', input: message });

// Session tracking
DebugHelper.logSessionDebug(sessionId, 'START', { firstName: 'John', betaCodeId: 1 });
```

---

## 🧪 Testing Scenarios

### Complete End-to-End Debug Flow:
```bash
# 1. Start dev server
npm run dev

# 2. Send test request (triggers ALL debug points)
curl -X POST http://localhost:5173/.netlify/functions/pricing-agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a 15x20 patio with 100 sqft mulch and 50 feet metal edging",
    "sessionId": "debug-test-session",
    "firstName": "DebugUser",
    "betaCodeId": 1
  }'
```

### Individual Component Testing:
```bash
# Test GPT splitting only
npm run test:gpt:enhanced

# Test dimension calculations
TEST_INPUT="20x15 patio" npx tsx src/services/ai-engine/ServiceMappingEngine.ts

# Test full pipeline with mocks
npm run test:pipeline:mock

# Test conversation context
npm run test:conversation
```

---

## 🔑 Required Environment Variables

Ensure these are set for full debugging:
```env
VITE_OPENAI_API_KEY_MINI=sk-proj-...     # For GPT debugging
VITE_GOOGLE_SHEETS_SHEET_ID=1SM64A...    # For Sheets debugging  
VITE_AI_API_KEY=sk-ant-...               # For conversation debugging
DEBUG_MODE=true                          # Enables all debug output
MOCK_MODE=true                          # Uses mocks for testing
```

---

## 📊 Debug Output Legend

- 🤖 **GPT/AI Operations**: API calls, responses, parsing
- 📐 **Dimension Calculations**: Geometry parsing, unit conversion
- 🗺️ **Service Mapping**: Text to service conversion
- 📈 **Google Sheets**: API requests, pricing calculations  
- 🎭 **Sales Personality**: Response formatting, tone selection
- 🎯 **Pipeline Steps**: End-to-end flow tracking (Steps 1-3)
- 🔧 **Environment**: Configuration, resource usage
- ⏱️ **Performance**: Timing, comparison to Make.com baseline
- ❌ **Errors**: Failures with context
- 👤 **Sessions**: User interaction tracking

---

*This debug configuration provides complete visibility into your TradeSphere pricing pipeline. All debug points are production-safe and include sensitive data masking.*