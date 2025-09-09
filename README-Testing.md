# TradeSphere Pricing Agent - Testing Framework

## Overview

Comprehensive testing framework for the TradeSphere pricing agent with two testing approaches:
- **Mock Testing**: Development and business logic validation (no API credentials required)
- **Real API Testing**: Pre-deployment verification with live APIs

Validates Make.com parity while achieving 85% performance improvement (3-8s vs 30-50s).

---

## SECTION 1: Mock Testing (Development)

### 🚀 Pure Mock Testing Framework

**Perfect for development** - Tests business logic with zero external dependencies.

#### Features:
- ✅ **Zero API calls** - No credentials needed
- ✅ **Instant execution** - Tests complete in milliseconds
- ✅ **Production data** - Uses real service pricing and scenarios
- ✅ **VS Code debugging** - Full breakpoint support
- ✅ **Business logic validation** - Parameter extraction, pricing calculation, response formatting

#### Quick Start:
```bash
# Run all mock tests (no setup required)
npm run test:mock:pure

# Run performance benchmark
npm run test:benchmark:pure
```

#### VS Code Debug Configurations:
1. **🚀 Pure Mock Tests (No APIs)** - Debug all test cases with breakpoints
2. **⚡ Pure Mock Benchmark** - Debug performance testing

**How to debug:**
1. Open VS Code
2. Press `F5` or go to Run & Debug panel
3. Select "🚀 Pure Mock Tests (No APIs)"
4. Set breakpoints in `src/tests/mock-only-runner.ts`
5. Click the green play button

#### Test Cases Covered:
1. **Multi-Service**: `"45 sq ft triple ground mulch and 3 feet metal edging"`
   - Expected: 2 services (Mulch + Metal Edging)
   - Mock Price: $81.75
   - Execution: <5ms
   
2. **Simple**: `"100 square feet of mulch"`
   - Expected: 1 service (Triple Ground Mulch)
   - Mock Price: $125.00
   - Execution: <5ms

#### Mock Data Location:
- `src/tests/mock-only-runner.ts` - Pure mock test runner
- `src/mocks/mock-data.ts` - Production pricing data
- `src/config/service-database.ts` - Real 32-service database

---

## SECTION 2: Real API Testing (Pre-deployment)

### 🔗 Live API Integration Tests

**Required before deployment** - Tests with actual Google Sheets and AI APIs.

⚠️ **Requires API Credentials:**
- Google Sheets API key
- OpenAI/Claude API key
- Supabase credentials

#### Environment Setup:
```bash
# Required environment variables
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
GOOGLE_SHEETS_ID=your-sheet-id
OPENAI_API_KEY=your-openai-key
```

#### Real API Test Commands:
```bash
# Install test runner (if not already installed)
npm install tsx --save-dev

# Run Make.com parity tests (with real Google Sheets API)
npm run test:parity

# Run pricing agent tests (with real AI APIs)
npm run test:pricing

# Run integration tests (full pipeline)
npx tsx src/tests/integration.test.ts
```

#### Real API Test Structure:

##### 1. Unit Tests (`src/tests/pricing-agent.test.ts`)
- **Parameter Collection**: Validates AI service extraction from natural language
- **Pricing Calculation**: Tests actual Google Sheets integration and calculations  
- **Response Formatting**: Verifies sales personality and tone matching
- **Performance**: Benchmarks against 3-8s target vs Make.com's 30-50s

##### 2. Integration Tests (`src/tests/integration.test.ts`)
- **End-to-end**: Complete webhook processing pipeline
- **CORS**: Validates cross-origin request handling
- **Error Handling**: Tests graceful failure modes
- **Response Format**: Ensures Supabase compatibility

##### 3. Production Test Cases:
1. **Multi-Service**: `"45 sq ft triple ground mulch and 3 feet metal edging"`
   - Expected: 2 services (Mulch + Metal Edging)
   - Price Range: $50-200
   
2. **Irrigation**: `"irrigation setup with 2 turf zones"`  
   - Expected: Setup + 2 zones
   - Price Range: $800-1500
   - Special: Zone calculation logic
   
3. **Simple**: `"100 square feet of mulch"`
   - Expected: 1 service (Triple Ground Mulch)
   - Price Range: $80-150

---

## SECTION 3: Testing Strategy

### 📋 When to Use Each Test Type

| Test Type | Purpose | Requirements | Speed | Use Case |
|-----------|---------|-------------|-------|----------|
| **Mock Tests** | Business logic validation | None | Milliseconds | Development, debugging, CI/CD |
| **Real API Tests** | End-to-end validation | API credentials | 3-8 seconds | Pre-deployment verification |

### 🚀 Recommended Testing Pipeline

```
Development → Mock Tests → Real API Tests → Deployment
```

#### 1. **Development Phase**
```bash
# Quick feedback loop
npm run test:mock:pure
# Debug with breakpoints in VS Code
# Validate business logic changes
```

#### 2. **Pre-deployment Phase**
```bash
# Verify real API integration
npm run test:parity
npm run test:pricing
# Ensure Make.com parity
# Validate performance targets
```

#### 3. **CI/CD Pipeline**
```bash
# Stage 1: Mock tests (fast)
npm run test:mock:pure

# Stage 2: Real API tests (with credentials)
npm run test:parity
npm run test:pricing

# Stage 3: Deploy if all pass
```

### 🔧 Debug Workflow

**For Logic Issues:**
1. Use VS Code "🚀 Pure Mock Tests" debug config
2. Set breakpoints in business logic
3. Step through parameter collection, pricing, formatting
4. No API setup required

**For API Integration Issues:**
1. Ensure environment variables are set
2. Run `npm run test:parity` for detailed logs
3. Check Google Sheets formulas and AI prompts
4. Validate API response formats

### 📊 Test Reports

#### Mock Test Results:
```
📊 TEST SUMMARY
================
Tests Passed: 2/2
Success Rate: 100%
Average Time: <5ms
vs Make.com: 100% faster (mock simulation)

🎉 ALL TESTS PASSED!
✅ Mock framework working perfectly
✅ Business logic validated
✅ Performance targets met
```

#### Real API Test Reports:
Real API tests generate comprehensive reports in `test-report.md`:
- Performance comparisons with actual timing
- Service mapping accuracy with real AI
- Parity validation results
- Deployment readiness assessment

### 🎯 Expected Results

#### Performance Targets:
- **Response Time**: <8s (vs Make.com 30-50s)
- **Token Usage**: 2-3k (vs Make.com 17-20k) 
- **Service Recognition**: >95% accuracy
- **Parity Achievement**: 100% Make.com compatibility

#### Mock vs Real Comparison:
| Metric | Mock Tests | Real API Tests | Make.com Baseline |
|--------|------------|----------------|-------------------|
| **Speed** | <5ms | 3-8s | 30-50s |
| **Setup** | None | API keys | Full Make.com account |
| **Accuracy** | Business logic | End-to-end | Production baseline |
| **Use Case** | Development | Pre-deployment | Legacy system |

### 🚨 Important Notes

#### API Credentials Required for Real Tests:
- **Google Sheets API**: For pricing calculations
- **OpenAI/Claude API**: For parameter extraction
- **Supabase**: For data storage

#### No Credentials Required for Mock Tests:
- Pure simulation data
- No external API calls
- Perfect for development and CI/CD

#### VS Code Debug Menu:
After setup, your VS Code debug dropdown will show:
```
🧪 TradeSphere Tests
  🧪 Debug Multi-Service Test (Mulch + Edging)
  🧪 Debug Simple Test (Mulch Only)
  🚀 Debug All Tests with Parity Check

🔧 TradeSphere Debug  
  🔧 Debug Pricing Agent Function

⚡ Performance
  ⚡ Performance Benchmark Test

🚀 Pure Mock Tests
  🚀 Pure Mock Tests (No APIs)
  ⚡ Pure Mock Benchmark
```

---

## Success Criteria

### For Mock Tests:
✅ Both test cases pass (Multi-Service + Simple)
✅ Business logic validation complete
✅ Performance simulation confirms targets
✅ Zero external dependencies

### For Real API Tests:
✅ All 3 production test cases pass
✅ Performance targets achieved (3-8s)
✅ Service mapping >90% accurate  
✅ Error handling robust
✅ CORS properly configured
✅ Make.com parity confirmed

## Deployment Pipeline

1. **Development**: `npm run test:mock:pure` (instant feedback)
2. **Pre-deployment**: `npm run test:parity` (real API verification)
3. **Environment Setup**: Configure Google Sheets API
4. **Netlify Deploy**: Deploy pricing-agent function
5. **A/B Testing**: 10% traffic split with Make.com
6. **Full Rollout**: After 48h successful A/B test

## Architecture Validation

The tests verify the complete Make.com replacement:

```
User Input → Parameter Collection → Pricing Calculation → Response Formatting → Supabase Storage
     ↓              ↓                      ↓                    ↓                ↓
Service Mapping    Google Sheets      Sales Personality    Database Update   Frontend Display
```

Each stage is validated for:
- **Accuracy**: Same results as Make.com
- **Performance**: <8s total processing
- **Reliability**: Error handling and fallbacks
- **Compatibility**: Existing frontend integration

## Troubleshooting

### Common Mock Test Issues:
**Tests Don't Run**
- Ensure `tsx` is installed: `npm install tsx --save-dev`
- Check that `npm run test:mock:pure` command exists in package.json

**Debug Breakpoints Not Hit**
- Verify VS Code launch.json configuration exists
- Select correct debug configuration: "🚀 Pure Mock Tests (No APIs)"
- Ensure TypeScript source maps are enabled

### Common Real API Test Issues:
**Service Mapping Fails**
- Check `SERVICE_SYNONYMS` in service-database.ts
- Verify NLP patterns in ServiceMappingEngine.ts

**Pricing Calculation Errors**  
- Validate Google Sheets API credentials
- Check service row mappings (rows 2-33)
- Verify formula compatibility

**Performance Issues**
- Profile with `console.time()` blocks
- Check Google Sheets API latency
- Optimize service mapping algorithms

**Response Format Problems**
- Validate SalesPersonalityService tone logic
- Check Supabase schema compatibility
- Verify frontend message handling

---

*Generated: ${new Date().toISOString()}*