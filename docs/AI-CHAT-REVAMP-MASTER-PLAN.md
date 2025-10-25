# AI Chat Revamp - Master Brainstorming Document

## Document Purpose
Strategic blueprint for transforming the AI chat system into a context-aware pricing intelligence engine that seamlessly bridges Quick Calculator, Services Database, Materials Management, and Customer Memory - while leveraging specialized agent capabilities for cost-effective automation.

---

## **TIER 1: SYSTEM INTELLIGENCE ARCHITECTURE**

### 1.1 Dual-Context Memory System (REVISED)

**Current State Analysis:**
- `VC Usage` table - Stores full conversation pairs with basic `interaction_summary` (just first 100 chars)
- `netlify/functions/customer-context.js` - Loads last 2 interactions, NO AI summarization
- `src/utils/message-storage.ts` - Writes to both `demo_messages` and `VC Usage` tables
- `customers` table - Has `metadata` JSONB field, could store conversation events

**Revamp Strategy - Two-Tier Memory:**

#### TIER 1: User Memory (Non-Customer-Locked)
**NEW TABLE: company_user_interactions**
```sql
CREATE TABLE company_user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  interaction_number INT NOT NULL,

  -- Lightweight context tracking
  recent_topics TEXT[], -- ["paver patio", "excavation", "pricing"]
  mentioned_services TEXT[], -- ["Paver Patio (SQFT)", "Excavation"]
  mentioned_materials TEXT[], -- ["Cambridge Ledgestone", "Polymeric Sand"]

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Fast 5-message window queries
  INDEX idx_user_recent (company_id, user_id, created_at DESC)
);
```

**Usage:**
- Stores signed-in user's loose memory (no customer locked)
- Query last 5 messages for context window
- Switch to VC Usage table when customer locks in

#### TIER 2: Customer Memory (Event-Driven)
**ENHANCED: customers.conversation_events JSONB field**
```sql
ALTER TABLE customers ADD COLUMN conversation_events JSONB DEFAULT '{"events":[],"active_quotes":{},"decision_factors":[]}';

-- Structure:
{
  "events": [
    {
      "event_id": "uuid",
      "event_type": "PRICE_CHANGE",
      "timestamp": "2025-01-15T14:30:00Z",
      "summary": "Paver patio quote increased $6k→$9.5k (Cambridge Ledgestone upgrade)",
      "service": "Paver Patio (SQFT)",
      "old_price": 6000,
      "new_price": 9500,
      "interaction_ref": 5
    }
  ],
  "active_quotes": {
    "Paver Patio (SQFT)": {"latest_price": 9500, "status": "discussing"},
    "Mulch Installation": {"latest_price": 1200, "status": "quoted"}
  },
  "decision_factors": ["Budget conscious", "Premium quality", "June deadline"]
}
```

**Event Detection Types:**
- PRICE_CHANGE: Quote amount changed significantly
- SERVICE_ADDED: New service discussed/quoted
- SERVICE_REMOVED: Service no longer considered
- MATERIAL_CHANGE: Different material selected
- DECISION_MADE: Customer committed to something
- OBJECTION_RAISED: Customer expressed concern
- TIMELINE_DISCUSSED: Specific dates mentioned

**Integration:**
- `src/utils/message-storage.ts:229-392` - Already writes to VC Usage
- NEW: Fire-and-forget event detection after AI response
- NEW: Load customer events before building AI prompt

**Agent Recommendations:**
- **prompt-engineer**: Design event detection prompts with 90%+ precision
- **backend-architect**: Design JSONB schema for cascading event memory
- **database-optimizer**: Index company_user_interactions for 5-message window queries
- **security-auditor**: RLS policies on company_user_interactions table

---

### 1.2 Service & Material Intelligence Layer

**Current State:**
- `src/pricing-system/core/calculations/master-pricing-engine.ts` (lines 1-905) - Core calculations
- `src/services/ServiceConfigManager.ts` (lines 1-100) - Service configuration
- `src/services/materialCalculations.ts` - Material cost logic
- **NEW**: `docs/CUSTOM-SERVICE-FORMULA-STANDARD.md` - Universal custom service framework (1,943 lines)

**Revamp Strategy - AI Understanding Custom Services:**

The AI must understand ALL services in the company database, including:
1. **Hardcoded Services**: Pre-built services (Paver Patio, Mulch Beds, etc.)
2. **Custom Services**: User-created services via Custom Service Wizard
3. **Draft Services**: Incomplete services saved during wizard (category: 'draft')

#### Key Intelligence Requirements

**1. Universal Formula Recognition (Two-Tier System)**
```
Tier 1: Labor Hours = Base Hours + Σ(Variable Adjustments)
Tier 2: Total Price = (Labor + Materials) × Complexity + Profit + Pass-Through
```

AI must parse `service_pricing_configs.variables_config` JSONB field and understand:
- **6 Variable Effect Types**: labor_time_percentage, material_cost_multiplier, total_project_multiplier, cutting_complexity, daily_equipment_cost, flat_additional_cost
- **Pass-Through Costs**: Equipment/fees NOT included in profit calculation
- **Service-Material Mapping**: Materials are service-specific via `service_material_categories` table

**2. Material Calculation Methods (6 Standard Types)**
AI must recognize calculation_method from `service_material_categories` table:

```typescript
// From: docs/CUSTOM-SERVICE-FORMULA-STANDARD.md Section 3
type MaterialCalculationMethod =
  | 'AREA_COVERAGE'      // sqft-based (pavers, mulch, sod)
  | 'VOLUME_COVERAGE'    // cubic yards with compaction (base rock, concrete)
  | 'LINEAR_COVERAGE'    // linear ft (edging, pipe)
  | 'PER_UNIT'           // count-based (sand bags, plants)
  | 'WEIGHT_BASED'       // lbs/tons (stone dust)
  | 'CUSTOM_FORMULA';    // JSON-defined tiers (retaining walls)
```

**3. Service Configuration Loading**
```typescript
// NEW: src/services/ai-engine/ServiceMaterialIntelligence.ts
class ServiceMaterialIntelligence {
  // GOAL: AI understands "what can each service/material do?"

  async explainService(serviceName: string, companyId: string): Promise<string> {
    // Load from: masterPricingEngine.loadPricingConfig(serviceName, companyId)
    // Parse: baseSettings, variables_config, material_categories
    // Reference: docs/CUSTOM-SERVICE-FORMULA-STANDARD.md Section 2 (Service Anatomy)

    // Generate natural language:
    // "Paver Patio (15-2000 sqft) uses two-tier pricing:
    //  - Tier 1: Labor = (sqft ÷ 60 sqft/day) × 2-person crew × 8 hrs
    //  - Tier 2: Adds materials (4 categories), applies 20% profit
    //  - Variables: Excavation depth, access difficulty, cutting complexity
    //  - Materials: Pavers (AREA_COVERAGE), base rock (VOLUME_COVERAGE), edging (LINEAR_COVERAGE)"
  }

  async explainMaterial(materialId: string, serviceId: string, companyId: string): Promise<string> {
    // Query: service_materials table filtered by service_id
    // Parse: coverage_value, waste_factor, cost_per_unit, calculation_method
    // Reference: docs/CUSTOM-SERVICE-FORMULA-STANDARD.md Section 3 (Material Calculations)

    // Generate: "Cambridge Ledgestone (AREA_COVERAGE):
    //   - Covers 4.5 sqft/unit
    //   - Cost: $8.50/unit
    //   - Waste factor: 15% (for curves/cuts)
    //   - Formula: quantity = (project_area ÷ 4.5) × 1.15"
  }

  async explainVariable(variableKey: string, serviceConfig: any): Promise<string> {
    // From: config.variables_config[variableKey]
    // Parse effect_type and options with labor/material impacts
    // Reference: docs/CUSTOM-SERVICE-FORMULA-STANDARD.md Section 4 (Variable Effects)

    // Example: "Access Difficulty (labor_time_percentage):
    //   - 'Easy': 0% adjustment (baseline)
    //   - 'Limited': +25% labor hours (wheelbarrow-only access)
    //   - 'Difficult': +50% labor hours (hand-carry materials)"
  }

  async identifyServiceType(serviceConfig: any): Promise<string> {
    // Determine service category from variables_config structure
    // Reference: docs/CUSTOM-SERVICE-FORMULA-STANDARD.md Section 2.1 (Service Categories)

    // Categories: hardscaping, landscaping, excavation, specialty, draft
    // Draft services: is_active = false, category = 'draft'
  }
}

// Integration Points:
// - master-pricing-engine.ts:115-204 (loadPricingConfig)
// - materialCalculations.ts:calculateAllMaterialCosts()
// - ServiceConfigManager.ts:saveServiceConfig() (lines 57-95)
// - docs/CUSTOM-SERVICE-FORMULA-STANDARD.md (complete reference)
```

#### AI Prompt Context Structure

When AI generates responses, inject service intelligence:

```typescript
// Context injection for AI prompt
const serviceContext = await buildServiceContext(companyId);

const promptContext = `
AVAILABLE SERVICES IN DATABASE:
${serviceContext.activeServices.map(s => `
  • ${s.service_name} (${s.service_id}):
    - Category: ${s.category}
    - Unit: ${s.unit}
    - Base Productivity: ${s.base_productivity} ${s.unit}/day
    - Material Categories: ${s.material_categories ? Object.keys(s.material_categories).join(', ') : 'None'}
    - Variables: ${Object.keys(s.variables_config || {}).join(', ')}
`).join('\n')}

DRAFT SERVICES (incomplete):
${serviceContext.draftServices.map(s => `
  • ${s.service_name} (draft) - Last edited: Step ${s.draft_completed_step}
`).join('\n')}

STANDARD FORMULA REFERENCE:
- All services follow two-tier pricing: Labor Hours → Total Price
- Materials use 6 calculation methods: AREA_COVERAGE, VOLUME_COVERAGE, LINEAR_COVERAGE, PER_UNIT, WEIGHT_BASED, CUSTOM_FORMULA
- Variables map to 6 effect types: labor_time_percentage, material_cost_multiplier, total_project_multiplier, cutting_complexity, daily_equipment_cost, flat_additional_cost
- Pass-through costs (equipment/fees) are NOT included in profit margin

See: docs/CUSTOM-SERVICE-FORMULA-STANDARD.md for complete specification.
`;
```

**Agent Recommendations:**
- **backend-architect**: Design caching layer for service/material explanations (Redis with 1-hour TTL)
- **database-optimizer**: Index `service_pricing_configs` for fast service listing queries
- **typescript-pro**: Type-safe interfaces matching CUSTOM-SERVICE-FORMULA-STANDARD.md structures
- **prompt-engineer**: Design prompts that reference standard formula for calculation explanations

---

### 1.3 Quick Calculator Bridge

**Current State:**
- `src/pricing-system/interfaces/quick-calculator/QuickCalculatorTab.tsx` - UI component
- Quick calc uses `masterPricingEngine.calculatePricing()` directly

**Revamp Strategy:**

```typescript
// NEW: src/services/ai-engine/QuickCalcConversationBridge.ts
class QuickCalcConversationBridge {
  // GOAL: Talk through quick calculator while filling inputs

  async interpretUserRequest(userMessage: string, currentCalcState: any): Promise<CalcAction> {
    // Use Claude to parse: "I want a 15x20 patio with premium pavers"
    // Return: { sqft: 300, materialStyle: 'premium', missingParams: ['excavationDepth'] }
  }

  async explainCalculation(tier1: Tier1Results, tier2: Tier2Results): Promise<string> {
    // From master-pricing-engine.ts:410-482 (calculateTier1)
    // From master-pricing-engine.ts:488-686 (calculateTier2)
    // Generate: "Your 300 sqft patio breaks down as follows:
    //   • Base labor: 48 hours ($1,200)
    //   • Excavation (bundled): +12 hours ($300)
    //   • Material costs: $2,550 (includes 15% waste for curved cuts)"
  }

  async suggestOptimizations(currentQuote: CalculationResult): Promise<string[]> {
    // Analyze tier2Results.materialBreakdown
    // Suggest: "Switching to standard pavers saves $400" or
    //   "Reducing excavation depth by 1 inch saves 3 hours ($75)"
  }
}

// Integration:
// - Quick Calculator can send partial state to chat for "what if" questions
// - Chat can prefill Quick Calculator with parsed parameters
// - Bidirectional sync via React Context
```

**Agent Recommendations:**
- **prompt-engineer**: Design "progressive disclosure" prompts (ask for sqft first, then materials, then complexity)
- **frontend-developer**: Create QuickCalcContext provider for chat ↔ calculator state sync
- **ui-ux-designer**: Design inline chat widget in Quick Calculator sidebar

---

## **TIER 2: COST OPTIMIZATION STRATEGIES**

### 2.1 Netlify Function Orchestration

**Current State:**
- `netlify/functions/customer-context.ts` - Customer data fetching
- No AI processing in functions yet
- No caching strategy for service/material intelligence

**Revamp Strategy:**

#### Multi-Scope Cache Architecture

**Three Cache Scopes for Multi-Tenant Isolation:**

```typescript
// 1. COMPANY-LEVEL CACHE (Shared across all users in same company)
// Cache key pattern: `company:{company_id}:{cache_type}:{resource_id}`
// TTL: 15 minutes - 2 hours depending on data volatility

const companyCacheKeys = {
  serviceList: `company:${companyId}:service_list:all`,           // TTL: 15 min
  serviceConfig: `company:${companyId}:service_config:${serviceId}`, // TTL: 1 hour
  serviceExplanation: `company:${companyId}:service_explanation:${serviceId}`, // TTL: 1 hour
  materialList: `company:${companyId}:material_list:${serviceId}`, // TTL: 30 min
  materialPrices: `company:${companyId}:material_prices:all`,     // TTL: 30 min
  materialComparison: `company:${companyId}:material_comparison:${categoryKey}`, // TTL: 2 hours
  aiContext: `company:${companyId}:ai_context:services`,          // TTL: 15 min
};

// 2. USER-LEVEL CACHE (Personal to each salesperson)
// Cache key pattern: `user:{user_id}:{cache_type}:{data}`
// TTL: Session-based or 24 hours

const userCacheKeys = {
  recentInteractions: `user:${userId}:recent_interactions:last_5`, // From Section 1.1
  draftQuote: `user:${userId}:draft_quote:${tempId}`,              // Temporary quotes
  preferences: `user:${userId}:preferences:defaults`,              // User settings
};

// 3. CUSTOMER-LEVEL CACHE (When locked to specific customer)
// Cache key pattern: `customer:{company_id}:{customer_id}:{cache_type}`
// TTL: Permanent (event-driven, never expires)

const customerCacheKeys = {
  conversationEvents: `customer:${companyId}:${customerId}:conversation_events`, // Section 1.1
  quoteHistory: `customer:${companyId}:${customerId}:quote_history`,
};
```

#### Orchestrator Function with Smart Caching

```typescript
// NEW: netlify/functions/ai-chat-orchestrator.ts
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  // GOAL: Offload heavy AI processing to edge functions with intelligent caching

  const { userMessage, sessionId, companyId, userId, customerContext } = JSON.parse(event.body);

  // Step 1: Load service/material intelligence (COMPANY-LEVEL CACHE)
  const serviceData = await fetchServiceIntelligenceWithCache(companyId);

  // Step 2: Load user context (USER-LEVEL CACHE)
  const userInteractions = await fetchUserInteractions(userId, 5); // Last 5 messages

  // Step 3: Load customer context if locked (CUSTOMER-LEVEL - NO CACHE, always fresh)
  let customerMemory = null;
  if (customerContext?.customerId) {
    customerMemory = await fetchCustomerEvents(companyId, customerContext.customerId);
  }

  // Step 4: Build context-aware prompt
  const prompt = buildPrompt({
    userMessage,
    serviceData,        // Cached company services/materials
    userInteractions,   // Cached user conversation window
    customerMemory,     // Fresh customer events (never cached)
  });

  // Step 5: Call Claude API (serverless = pay-per-use)
  const response = await callClaudeAPI(prompt);

  // Step 6: Store interaction in database (triggers event detection if customer locked)
  await storeInteraction(userId, companyId, userMessage, response, customerContext);

  return { statusCode: 200, body: JSON.stringify(response) };
};

// Helper: Fetch service intelligence with company-level caching
async function fetchServiceIntelligenceWithCache(companyId: string) {
  const cacheKey = `company:${companyId}:service_list:all`;

  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Cache HIT: ${cacheKey}`);
    return JSON.parse(cached);
  }

  // Cache miss: Load from database
  console.log(`❌ Cache MISS: ${cacheKey} - Loading from database...`);
  const { data: services } = await supabase
    .from('service_pricing_configs')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .neq('category', 'draft'); // Exclude draft services

  // Cache for 15 minutes (services might be added/updated frequently)
  await cache.set(cacheKey, JSON.stringify(services), { ttl: 900 });

  return services;
}

// Cost Savings Analysis:
// - Serverless = $0.00002/request (vs $50/month for always-on server)
// - Company-level caching = 80% cache hit rate for service lists
// - Context compression = 50% token reduction via smart prompt building
//
// Example: 10 salespeople at Company ABC ask "What services do we offer?"
//   - Without cache: 10 database queries + 10 AI calls
//   - With cache: 1 database query + 10 AI calls (9 get cached service data)
//   - Token savings: ~5,000 tokens per cached hit
```

#### Cache Invalidation System

**Critical: Prevent stale data after service/material updates**

```typescript
// src/services/ServiceConfigManager.ts (ENHANCED)

export class ServiceConfigManager {
  async saveServiceConfig(config: ServiceConfig) {
    // 1. Save to database
    const { error } = await supabase
      .from('service_pricing_configs')
      .upsert(config);

    if (error) throw error;

    // 2. IMMEDIATELY invalidate all related caches
    await this.invalidateServiceCaches(config.company_id, config.service_id);

    // 3. Clear pricing engine cache (already exists)
    masterPricingEngine.clearServiceCache(config.service_id, config.company_id);

    console.log(`✅ Service saved and caches invalidated: ${config.service_name}`);
  }

  private async invalidateServiceCaches(companyId: string, serviceId: string) {
    // Clear all company-level caches related to this service
    const keysToInvalidate = [
      // Service-specific caches
      `company:${companyId}:service_explanation:${serviceId}`,
      `company:${companyId}:service_config:${serviceId}`,

      // Company-wide caches (service list changed)
      `company:${companyId}:service_list:all`,
      `company:${companyId}:ai_context:services`,

      // Material caches (if service has materials)
      `company:${companyId}:material_list:${serviceId}`,
    ];

    await Promise.all(
      keysToInvalidate.map(key => cache.delete(key))
    );

    console.log(`🗑️  Invalidated ${keysToInvalidate.length} cache keys for service: ${serviceId}`);
  }
}

// src/services/MaterialManager.ts (NEW)

export class MaterialManager {
  async saveMaterial(material: ServiceMaterial) {
    // 1. Save to database
    const { error } = await supabase
      .from('service_materials')
      .upsert(material);

    if (error) throw error;

    // 2. Invalidate material caches
    await this.invalidateMaterialCaches(material.company_id, material.service_id);
  }

  async updateMaterialPrice(materialId: string, newPrice: number, companyId: string) {
    // Update price
    await supabase
      .from('service_materials')
      .update({ cost_per_unit: newPrice })
      .eq('id', materialId);

    // Invalidate ALL material comparison caches (price affects comparisons)
    const pattern = `company:${companyId}:material_comparison:*`;
    await cache.deletePattern(pattern);

    console.log(`💰 Material price updated, comparison caches cleared`);
  }

  private async invalidateMaterialCaches(companyId: string, serviceId: string) {
    const keysToInvalidate = [
      `company:${companyId}:material_list:${serviceId}`,
      `company:${companyId}:material_prices:all`,
      `company:${companyId}:material_comparison:*`, // Wildcard: clear all comparisons
    ];

    await Promise.all(
      keysToInvalidate.map(key =>
        key.includes('*') ? cache.deletePattern(key) : cache.delete(key)
      )
    );

    console.log(`🗑️  Material caches invalidated for service: ${serviceId}`);
  }
}
```

#### Real-Time Cache Invalidation via Supabase Webhooks

**Automatic cache clearing when database changes:**

```typescript
// src/services/ai-engine/CacheInvalidationListener.ts (NEW)

import { createClient } from '@supabase/supabase-js';

export class CacheInvalidationListener {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  async startListening() {
    // Listen to service_pricing_configs changes
    this.supabase
      .channel('service_changes')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'service_pricing_configs'
      }, async (payload) => {
        const { company_id, service_id } = payload.new || payload.old;

        console.log(`🔔 Service changed: ${service_id} - Invalidating caches...`);

        // Auto-invalidate caches
        const serviceConfigManager = new ServiceConfigManager();
        await serviceConfigManager['invalidateServiceCaches'](company_id, service_id);
      })
      .subscribe();

    // Listen to service_materials changes
    this.supabase
      .channel('material_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_materials'
      }, async (payload) => {
        const { company_id, service_id } = payload.new || payload.old;

        console.log(`🔔 Material changed in service: ${service_id} - Invalidating caches...`);

        // Auto-invalidate material caches
        const materialManager = new MaterialManager();
        await materialManager['invalidateMaterialCaches'](company_id, service_id);
      })
      .subscribe();

    console.log('✅ Cache invalidation listeners started');
  }
}

// Start listener when Netlify function initializes
const cacheListener = new CacheInvalidationListener();
cacheListener.startListening();
```

#### Cache Invalidation Trigger Matrix

| Event | Cache Keys Invalidated | Reason | TTL Before Invalidation |
|-------|----------------------|--------|------------------------|
| **New service added** | `company:*:service_list:all`<br>`company:*:ai_context:services` | AI needs immediate awareness of new service | 15 min |
| **Service config updated** | `company:*:service_explanation:{serviceId}`<br>`company:*:service_config:{serviceId}` | Prices, variables, or settings changed | 1 hour |
| **Material added/updated** | `company:*:material_list:{serviceId}`<br>`company:*:material_comparison:*` | Material options changed | 30 min - 2 hours |
| **Material price changed** | `company:*:material_prices:all`<br>`company:*:material_comparison:*` | Affects all quotes using that material | 30 min |
| **Service deleted** | `company:*:service_*:{serviceId}`<br>`company:*:service_list:all` | Remove from AI knowledge immediately | 15 min - 1 hour |
| **Draft service completed** | `company:*:service_list:all` | Draft → Active (now available for quotes) | 15 min |
| **Service deactivated** | `company:*:service_list:all`<br>`company:*:service_config:{serviceId}` | Remove from available services | 15 min |

#### Cache TTL Strategy

**Short TTL for Dynamic Data:**
```typescript
// Services (frequently updated by admins)
cache.set(`company:${companyId}:service_list:all`, data, { ttl: 900 }); // 15 minutes

// Material prices (owner might update daily)
cache.set(`company:${companyId}:material_prices:all`, data, { ttl: 1800 }); // 30 minutes

// AI context (needs to reflect latest services)
cache.set(`company:${companyId}:ai_context:services`, data, { ttl: 900 }); // 15 minutes
```

**Medium TTL for Semi-Static Data:**
```typescript
// Service explanations (only change when config updates)
cache.set(`company:${companyId}:service_explanation:${serviceId}`, text, { ttl: 3600 }); // 1 hour

// Service configs (relatively stable)
cache.set(`company:${companyId}:service_config:${serviceId}`, config, { ttl: 3600 }); // 1 hour
```

**Long TTL for Static Data:**
```typescript
// Material comparison logic (calculation methods rarely change)
cache.set(`company:${companyId}:material_comparison:pavers`, result, { ttl: 7200 }); // 2 hours
```

**No Cache for Critical Real-Time Data:**
```typescript
// User interactions (5-message window from Section 1.1)
// ❌ NO CACHE - Always load fresh from company_user_interactions table

// Customer events (cascading memory from Section 1.1)
// ❌ NO CACHE - Always load fresh from customers.conversation_events JSONB

// Real-time pricing calculations
// ❌ NO CACHE - Always calculate fresh via masterPricingEngine
```

**Agent Recommendations:**
- **backend-architect**: Implement Redis with LRU eviction policy for cache storage
- **security-auditor**: Ensure all cache keys include company_id for RLS isolation, implement rate limiting per user
- **performance-engineer**: Profile token usage reduction from caching, monitor cache hit rates
- **database-optimizer**: Create database indexes for fast service/material queries on cache misses
- **devops-troubleshooter**: Set up CloudWatch alerts for cache invalidation failures

---

### 2.2 Custom Skills + Tools Architecture

**Current State:**
- No specialized AI capabilities for pricing calculations
- All queries use general-purpose Claude prompts
- Business logic scattered across codebase

**Revamp Strategy - Skills + Tools Pattern:**

#### Understanding Skills vs Tools

**Critical Distinction:**

```typescript
// ❌ WRONG: Skills are NOT backend endpoints
// Skills are self-contained code packages Claude executes in its secure container

// ✅ CORRECT: Skills = Business Logic (runs in Claude's container)
//             Tools = Data Access (our Netlify functions)

┌─────────────────────────────────────────────────────────┐
│ SKILLS (Claude executes code directly)                  │
│ - Python/JS code for calculations                       │
│ - Reference data (formulas, lookup tables)              │
│ - Auto-activate based on conversation context           │
│ - Max 8 skills per request                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ TOOLS (Our backend endpoints)                           │
│ - Netlify functions that return JSON                    │
│ - Query Supabase for company-specific data              │
│ - Claude calls when skills need external data           │
└─────────────────────────────────────────────────────────┘
```

**Folder Structure for Skills:**
```
~/.claude/skills/tradesphere-pricing/
├── SKILL.md              # Instructions + metadata (when to activate)
├── calculate.py          # Two-tier formula implementation
├── formulas.json         # Reference data (waste factors, compaction rates)
└── templates/            # Example calculations
```

---

#### Custom Skills for TradeSphere

**Skill 1: tradesphere-pricing-skill**

```markdown
# ~/.claude/skills/tradesphere-pricing/SKILL.md
---
name: tradesphere-pricing
version: v1
description: Calculate landscape/hardscape pricing using two-tier formula system
---

Use this skill when users request quotes for:
- Paver patios, walkways, driveways
- Retaining walls
- Mulch/soil installation
- Excavation services
- Any custom service

**Two-Tier Calculation Method:**
1. Tier 1: Calculate base labor hours + variable adjustments
2. Tier 2: Apply materials, complexity, profit margin, pass-through costs

Reference: docs/CUSTOM-SERVICE-FORMULA-STANDARD.md
```

```python
# ~/.claude/skills/tradesphere-pricing/calculate.py

def calculate_quote(service_config, dimensions, variables):
    """
    Two-tier pricing calculation following CUSTOM-SERVICE-FORMULA-STANDARD.md

    Tier 1: Labor Hours = Base Hours + Σ(Variable Adjustments)
    Tier 2: Total Price = (Labor + Materials) × Complexity + Profit + Pass-Through

    Args:
        service_config: Service configuration from database (via get_pricing_config tool)
        dimensions: Project dimensions (sqft, linear_ft, etc.)
        variables: Selected variable options from user

    Returns:
        dict: {tier1_hours, tier2_cost, breakdown}
    """

    # TIER 1: Calculate labor hours
    base_hours = (
        dimensions['measurement'] / service_config['base_productivity']
    ) * service_config['optimal_team_size'] * 8

    # Apply variable adjustments (6 effect types from Section 1.2)
    adjusted_hours = apply_variable_effects(base_hours, variables, service_config)

    # TIER 2: Calculate total cost
    labor_cost = adjusted_hours * service_config['hourly_labor_rate']

    # Calculate materials using 6 calculation methods (Section 1.2)
    material_cost = calculate_materials(
        dimensions,
        service_config['material_categories'],
        variables
    )

    # Profitable subtotal (gets profit markup)
    profitable_subtotal = labor_cost + material_cost
    profit = profitable_subtotal * (service_config['profit_margin'] / 100)

    # Pass-through costs (NO profit markup)
    pass_through = calculate_pass_through_costs(variables)

    total = profitable_subtotal + profit + pass_through

    return {
        'tier1_hours': adjusted_hours,
        'tier2_cost': total,
        'breakdown': {
            'labor': {
                'hours': adjusted_hours,
                'rate': service_config['hourly_labor_rate'],
                'cost': labor_cost
            },
            'materials': material_cost,
            'profit': profit,
            'pass_through': pass_through
        }
    }


def apply_variable_effects(base_hours, variables, config):
    """
    Applies 6 variable effect types from CUSTOM-SERVICE-FORMULA-STANDARD.md Section 4:
    1. labor_time_percentage
    2. material_cost_multiplier
    3. total_project_multiplier
    4. cutting_complexity
    5. daily_equipment_cost
    6. flat_additional_cost
    """
    adjusted_hours = base_hours

    for var_key, selected_option in variables.items():
        var_config = config['variables_config'][var_key]
        effect_type = var_config['effect_type']

        if effect_type == 'labor_time_percentage':
            # Add percentage of base hours
            adjustment = base_hours * (selected_option['value'] / 100)
            adjusted_hours += adjustment

        elif effect_type == 'cutting_complexity':
            # Fixed hours for complex cuts
            adjusted_hours += selected_option['laborPercentage']

    return adjusted_hours


def calculate_materials(dimensions, material_categories, variables):
    """
    Calculates material costs using 6 calculation methods from Section 1.2:
    - AREA_COVERAGE: sqft-based (pavers, mulch, sod)
    - VOLUME_COVERAGE: cubic yards with compaction (base rock, concrete)
    - LINEAR_COVERAGE: linear ft (edging, pipe)
    - PER_UNIT: count-based (sand bags, plants)
    - WEIGHT_BASED: lbs/tons (stone dust)
    - CUSTOM_FORMULA: JSON-defined tiers (retaining walls)
    """
    total_material_cost = 0

    for category_key, category in material_categories.items():
        method = category['calculation_method']

        if method == 'AREA_COVERAGE':
            quantity = (dimensions['sqft'] / material['coverage_value']) * \
                      (1 + material['waste_factor'])

        elif method == 'VOLUME_COVERAGE':
            volume_cy = (dimensions['sqft'] * material['depth_inches'] / 12) / 27
            quantity = volume_cy * (1 + material['compaction_factor'])

        elif method == 'LINEAR_COVERAGE':
            quantity = dimensions['linear_ft'] / material['coverage_per_unit']

        # ... handle all 6 methods

        cost = quantity * material['cost_per_unit']
        total_material_cost += cost

    return total_material_cost
```

**Skill 2: material-intelligence-skill**

```python
# ~/.claude/skills/material-intelligence/compare.py

def compare_materials(materials, project_area, calculation_method, variables):
    """
    Compares materials using 6 standard calculation methods from
    CUSTOM-SERVICE-FORMULA-STANDARD.md Section 3

    Args:
        materials: List of material configs from get_materials_list tool
        project_area: Project size (sqft, linear_ft, etc.)
        calculation_method: One of 6 standard methods
        variables: User selections affecting waste/complexity

    Returns:
        list: Sorted materials by cost with quantity breakdown
    """

    results = []

    for material in materials:
        # Calculate quantity based on method
        if calculation_method == 'AREA_COVERAGE':
            base_quantity = project_area / material['coverage_value']

            # Apply waste factor (base + complexity adjustments)
            waste_factor = material['waste_factor']
            if variables.get('cutting_complexity'):
                waste_factor += variables['cutting_complexity']['materialWaste']

            quantity = base_quantity * (1 + waste_factor)

        elif calculation_method == 'VOLUME_COVERAGE':
            volume_cy = (project_area * material['depth_inches'] / 12) / 27
            quantity = volume_cy * (1 + material['compaction_factor'])

        elif calculation_method == 'LINEAR_COVERAGE':
            quantity = project_area / material['coverage_per_unit']

        elif calculation_method == 'PER_UNIT':
            quantity = material['units_needed']

        elif calculation_method == 'WEIGHT_BASED':
            weight_lbs = project_area * material['weight_per_sqft'] * (1 + material['waste_factor'])
            quantity = weight_lbs / material['units_per_package']

        elif calculation_method == 'CUSTOM_FORMULA':
            # JSON-defined tiers (e.g., retaining wall height → blocks per linear ft)
            quantity = evaluate_custom_formula(material['formula'], project_area)

        cost = quantity * material['cost_per_unit']

        results.append({
            'material_id': material['id'],
            'material_name': material['name'],
            'quantity': quantity,
            'unit': material['unit'],
            'cost_per_unit': material['cost_per_unit'],
            'total_cost': cost,
            'calculation_method': calculation_method
        })

    # Sort by cost (cheapest first)
    return sorted(results, key=lambda x: x['total_cost'])


def generate_comparison_summary(sorted_materials, project_area):
    """
    Generates natural language comparison for user
    """
    summary = f"Comparing {len(sorted_materials)} materials for {project_area} sqft:\n\n"

    cheapest = sorted_materials[0]
    most_expensive = sorted_materials[-1]

    for i, mat in enumerate(sorted_materials):
        price_indicator = "💰 CHEAPEST" if i == 0 else ""
        summary += f"{i+1}. {mat['material_name']}: ${mat['total_cost']:.2f} "
        summary += f"({mat['quantity']:.1f} {mat['unit']} @ ${mat['cost_per_unit']}/{mat['unit']}) "
        summary += f"{price_indicator}\n"

    savings = most_expensive['total_cost'] - cheapest['total_cost']
    summary += f"\nSavings potential: ${savings:.2f} ({most_expensive['material_name']} → {cheapest['material_name']})"

    return summary
```

**Skill 3: service-intelligence-skill**

```python
# ~/.claude/skills/service-intelligence/explain.py

def explain_service(service_config):
    """
    Generates natural language explanation of service capabilities
    References: CUSTOM-SERVICE-FORMULA-STANDARD.md Section 2

    Args:
        service_config: Service configuration from get_pricing_config tool

    Returns:
        str: Human-readable service explanation
    """

    explanation = f"""
**{service_config['service_name']}** ({service_config['service_id']})

**Pricing Structure:** Two-Tier Formula
- **Tier 1 (Labor):** Base productivity {service_config['base_productivity']} {service_config['unit']}/day with {service_config['optimal_team_size']}-person crew
- **Tier 2 (Total Cost):** Labor + Materials + {service_config['profit_margin']}% profit margin

**Available Variables:**
"""

    for category_key, category in service_config['variables_config'].items():
        explanation += f"\n• **{category['label']}:**"
        for variable in category['variables']:
            explanation += f"\n  - {variable['label']} ({variable['effect_type']})"

            # Show options
            for option in variable['options']:
                if option['value'] == 0:
                    explanation += f"\n    • {option['label']}: Baseline"
                else:
                    explanation += f"\n    • {option['label']}: {format_effect(option, variable['effect_type'])}"

    if service_config.get('material_categories'):
        explanation += "\n\n**Material Categories:**"
        for cat_key, cat in service_config['material_categories'].items():
            explanation += f"\n• **{cat['name']}:** {cat['calculation_method']} method"
            if cat['required']:
                explanation += " (Required)"

    return explanation


def format_effect(option, effect_type):
    """
    Formats variable effect for display
    """
    if effect_type == 'labor_time_percentage':
        return f"+{option['value']}% labor hours"
    elif effect_type == 'material_cost_multiplier':
        return f"{option['multiplier']}× material cost"
    elif effect_type == 'cutting_complexity':
        return f"+{option['laborPercentage']}% labor, +{option['materialWaste']}% waste"
    elif effect_type == 'daily_equipment_cost':
        return f"${option['value']}/day (pass-through)"
    elif effect_type == 'flat_additional_cost':
        return f"+${option['value']} (pass-through)"
    else:
        return str(option['value'])
```

---

#### Custom Tools (Our Backend Endpoints)

**Tool 1: get_pricing_config**

```typescript
// netlify/functions/tools/get-pricing-config.ts

import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  // Parse tool invocation from Claude
  const { company_id, service_id } = JSON.parse(event.body);

  // Use Section 2.1 company-level caching
  const cacheKey = `company:${company_id}:service_config:${service_id}`;
  let config = await cache.get(cacheKey);

  if (!config) {
    // Cache miss: Load from database
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

    const { data, error } = await supabase
      .from('service_pricing_configs')
      .select('*')
      .eq('company_id', company_id)
      .eq('service_id', service_id)
      .eq('is_active', true)
      .neq('category', 'draft') // Exclude draft services
      .single();

    if (error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Service not found' })
      };
    }

    config = data;

    // Cache for 1 hour (Section 2.1 TTL strategy)
    await cache.set(cacheKey, JSON.stringify(config), { ttl: 3600 });
  } else {
    config = JSON.parse(config);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(config)
  };
};
```

**Tool 2: get_materials_list**

```typescript
// netlify/functions/tools/get-materials-list.ts

export const handler = async (event) => {
  const { company_id, service_id, category_key } = JSON.parse(event.body);

  // Use Section 2.1 company-level caching
  const cacheKey = `company:${company_id}:material_list:${service_id}:${category_key}`;
  let materials = await cache.get(cacheKey);

  if (!materials) {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

    const { data } = await supabase
      .from('service_materials')
      .select('*')
      .eq('company_id', company_id)
      .eq('service_id', service_id)
      .eq('category_key', category_key)
      .order('cost_per_unit', { ascending: true });

    materials = data;

    // Cache for 30 minutes (Section 2.1 TTL strategy)
    await cache.set(cacheKey, JSON.stringify(materials), { ttl: 1800 });
  } else {
    materials = JSON.parse(materials);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(materials)
  };
};
```

**Tool 3: get_customer_events**

```typescript
// netlify/functions/tools/get-customer-events.ts

export const handler = async (event) => {
  const { company_id, customer_id } = JSON.parse(event.body);

  // NO CACHE - Always load fresh (Section 2.1: Critical Real-Time Data)
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  const { data: customer } = await supabase
    .from('customers')
    .select('conversation_events, metadata')
    .eq('company_id', company_id)
    .eq('id', customer_id)
    .single();

  // Return Section 1.1 cascading memory events
  return {
    statusCode: 200,
    body: JSON.stringify({
      events: customer.conversation_events?.events || [],
      active_quotes: customer.conversation_events?.active_quotes || {},
      decision_factors: customer.conversation_events?.decision_factors || []
    })
  };
};
```

**Tool 4: get_service_list**

```typescript
// netlify/functions/tools/get-service-list.ts

export const handler = async (event) => {
  const { company_id } = JSON.parse(event.body);

  // Use Section 2.1 company-level caching
  const cacheKey = `company:${company_id}:service_list:all`;
  let services = await cache.get(cacheKey);

  if (!services) {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

    const { data } = await supabase
      .from('service_pricing_configs')
      .select('service_id, service_name, category, unit')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .neq('category', 'draft')
      .order('service_name');

    services = data;

    // Cache for 15 minutes (Section 2.1 TTL strategy)
    await cache.set(cacheKey, JSON.stringify(services), { ttl: 900 });
  } else {
    services = JSON.parse(services);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(services)
  };
};
```

---

#### Main Orchestrator Function

**Complete Implementation with Skills + Tools:**

```typescript
// netlify/functions/ai-chat-orchestrator.ts

import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const {
    userMessage,
    companyId,
    userId,
    customerId,
    sessionId
  } = JSON.parse(event.body);

  // Call Claude API with custom skills and tools
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'code-execution-2025-08-25,skills-2025-10-02',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,

      // Load custom skills (max 8, Claude auto-activates based on context)
      container: {
        skills: [
          { type: 'custom', skill_id: 'tradesphere-pricing', version: 'v1' },
          { type: 'custom', skill_id: 'material-intelligence', version: 'v1' },
          { type: 'custom', skill_id: 'service-intelligence', version: 'v1' },
          // Room for 5 more skills as needed (excavation-calculator, optimization-advisor, etc.)
        ]
      },

      // Provide tools for database access (Claude calls these when skills need data)
      tools: [
        // Required for skills to execute code
        { type: 'code_execution_20250825', name: 'code_execution' },

        // Custom tools pointing to our Netlify functions
        {
          name: 'get_pricing_config',
          description: 'Fetch company-specific service pricing configuration from database. Returns service config with variables_config JSONB, material_categories, base settings.',
          input_schema: {
            type: 'object',
            properties: {
              company_id: {
                type: 'string',
                description: 'Company UUID from authentication context'
              },
              service_id: {
                type: 'string',
                description: 'Service identifier (e.g., paver_patio_sqft, mulch_beds_sqft)'
              }
            },
            required: ['company_id', 'service_id']
          }
        },
        {
          name: 'get_materials_list',
          description: 'Fetch materials for a specific service category. Returns array of materials with coverage_value, waste_factor, cost_per_unit, calculation_method.',
          input_schema: {
            type: 'object',
            properties: {
              company_id: { type: 'string' },
              service_id: { type: 'string' },
              category_key: {
                type: 'string',
                description: 'Material category key (e.g., pavers, base_materials, edging)'
              }
            },
            required: ['company_id', 'service_id', 'category_key']
          }
        },
        {
          name: 'get_customer_events',
          description: 'Fetch conversation events for locked customer (Section 1.1 cascading memory). Returns event history, active quotes, decision factors.',
          input_schema: {
            type: 'object',
            properties: {
              company_id: { type: 'string' },
              customer_id: {
                type: 'string',
                description: 'Customer UUID when conversation is locked to specific customer'
              }
            },
            required: ['company_id', 'customer_id']
          }
        },
        {
          name: 'get_service_list',
          description: 'Fetch all active services available for this company. Use when user asks "what services do you offer" or needs to browse options.',
          input_schema: {
            type: 'object',
            properties: {
              company_id: { type: 'string' }
            },
            required: ['company_id']
          }
        }
      ],

      // Build context-aware messages
      messages: [
        {
          role: 'user',
          content: buildContextualPrompt(userMessage, companyId, customerId)
        }
      ]
    })
  });

  const result = await response.json();

  // Store interaction in Section 1.1 user memory table
  await storeUserInteraction(
    userId,
    companyId,
    userMessage,
    result.content[0].text,
    sessionId
  );

  // If customer locked, trigger event detection (Section 1.1)
  if (customerId) {
    await triggerEventDetection(
      userMessage,
      result.content[0].text,
      customerId,
      companyId
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      response: result.content[0].text,
      usage: result.usage // Token usage for monitoring
    })
  };
};


function buildContextualPrompt(userMessage: string, companyId: string, customerId?: string): string {
  let prompt = `You are an AI pricing assistant for a landscape/hardscape contractor.

**Company Context:**
- Company ID: ${companyId}
- You have access to this company's custom service configurations and material prices

**Your Capabilities:**
- Calculate accurate quotes using two-tier pricing formulas
- Compare materials and identify cost savings
- Explain service capabilities and variables
- Reference past conversations when customer is locked

**Standard Formula Reference:**
All services follow docs/CUSTOM-SERVICE-FORMULA-STANDARD.md:
- Tier 1: Labor Hours = Base Hours + Variable Adjustments
- Tier 2: Total Price = (Labor + Materials) × Complexity + Profit + Pass-Through
- 6 Material Calculation Methods: AREA_COVERAGE, VOLUME_COVERAGE, LINEAR_COVERAGE, PER_UNIT, WEIGHT_BASED, CUSTOM_FORMULA
- 6 Variable Effect Types: labor_time_percentage, material_cost_multiplier, total_project_multiplier, cutting_complexity, daily_equipment_cost, flat_additional_cost
`;

  if (customerId) {
    prompt += `\n**Customer Context:**
- Customer ID: ${customerId}
- This conversation is locked to a specific customer
- Use get_customer_events tool to access past conversation history and preferences
`;
  }

  prompt += `\n**User Request:**\n${userMessage}`;

  return prompt;
}
```

---

#### Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User: "Quote for 300 sqft paver patio with premium pavers"     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Netlify Function: ai-chat-orchestrator.ts                       │
│ - Loads: tradesphere-pricing skill                              │
│ - Provides: get_pricing_config, get_materials_list tools        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Claude API Call                                                  │
│ - Detects "quote" request in conversation                       │
│ - AUTO-ACTIVATES tradesphere-pricing skill                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Skill needs service config → Claude calls get_pricing_config    │
│ Tool params: { company_id: "abc123", service_id: "paver_patio" }│
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Netlify Function: /tools/get-pricing-config                     │
│ - Checks Section 2.1 cache (company:abc123:service_config:...)  │
│ - Cache HIT → Returns cached config (0.5ms)                     │
│ - Returns: variables_config JSONB, material_categories          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Skill needs materials → Claude calls get_materials_list         │
│ Tool params: { company_id, service_id, category_key: "pavers" } │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Netlify Function: /tools/get-materials-list                     │
│ - Queries Supabase: service_materials table                     │
│ - Returns: Array of premium pavers with costs/coverage          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Skill executes calculate.py in Claude's container               │
│ - Runs two-tier formula with returned config + materials        │
│ - Tier 1: 48 hours (300 sqft ÷ 60 sqft/day × 2 crew × 8 hrs)  │
│ - Tier 2: Labor $1,200 + Materials $2,550 + Profit $750        │
│ - Returns: {tier1_hours: 48, tier2_cost: 4500, breakdown: {...}}│
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Claude formats response to user                                 │
│ "Your 300 sqft paver patio with premium pavers: $4,500         │
│  • Labor: 48 hours @ $25/hr = $1,200                           │
│  • Materials: $2,550 (Cambridge Ledgestone premium pavers)      │
│  • Profit margin: 20% = $750                                    │
│  Total: $4,500"                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Cost Analysis

**Skills Auto-Activation = No Intent Classification Overhead:**

```typescript
// OLD WAY (Section 2.2 original) ❌
// Step 1: Intent classification (extra API call)
const intent = await classifyIntent(userMessage); // 200 tokens = $0.0006
if (intent === 'complex') {
  return await complexHandler(userMessage); // 2,000 tokens = $0.006
}
// TOTAL: 2 API calls, 2,200 tokens = $0.0066

// NEW WAY (Skills + Tools) ✅
const response = await callClaudeWithSkills(userMessage);
// Claude auto-activates skills only when needed
// Simple query: 1,000 tokens = $0.003
// Complex query: 2,500 tokens = $0.0075 (skills auto-activate)
// TOTAL: 1 API call, context-dependent tokens
```

**Token Usage Breakdown:**

| Query Type | Skills Activated | Tokens | Cost | Example |
|------------|-----------------|--------|------|---------|
| **Simple** | None | ~1,000 | $0.003 | "What services do you offer?" |
| **Explanation** | service-intelligence | ~1,500 | $0.0045 | "Explain paver patios" |
| **Comparison** | material-intelligence | ~2,000 | $0.006 | "Compare all paver materials" |
| **Quote** | tradesphere-pricing | ~2,500 | $0.0075 | "Quote for 300 sqft patio" |
| **Multi-step** | All 3 skills | ~4,000 | $0.012 | "Compare materials, optimize for cost, generate quote" |

**Cost Savings vs General-Purpose Prompts:**
- Skills contain business logic → Less context in prompts
- Tools use Section 2.1 caching → Faster data access
- Auto-activation → No manual routing overhead
- **Overall:** 40-60% token reduction for complex queries

---

#### Integration Points

**With Section 1.1 (Memory System):**
```typescript
// Customer locked conversation
if (customerId) {
  // Skill can call get_customer_events tool to access:
  // - Conversation events (price changes, service additions)
  // - Active quotes (pending decisions)
  // - Decision factors (budget constraints, timeline)
}
```

**With Section 1.2 (Service Intelligence):**
```typescript
// Skills understand custom services via tools
// get_pricing_config returns variables_config JSONB with 6 effect types
// Skills apply same formula logic to ALL services (custom or default)
```

**With Section 2.1 (Caching):**
```typescript
// All tool calls use company-level caching
// get_pricing_config: 1 hour TTL (cache hit = 0.5ms vs 50ms database query)
// get_materials_list: 30 min TTL
// Cache invalidation triggers from Section 2.1 apply automatically
```

---

**Agent Recommendations:**
- **backend-architect**: Design tool endpoint routing system, implement tool authentication
- **security-auditor**: Ensure tool endpoints validate company_id matches authenticated user, implement rate limiting per tool
- **prompt-engineer**: Optimize skill SKILL.md instructions for clear auto-activation triggers
- **typescript-pro**: Create type-safe interfaces for tool request/response schemas
- **python-pro**: Implement skill calculation code following CUSTOM-SERVICE-FORMULA-STANDARD.md exactly
- **devops-troubleshooter**: Monitor skill activation rates, tool call latency, cache hit rates

---

### 2.3 Anthropic Prompt Caching Strategy

**Current State:**
- All prompt context sent fresh with every API call
- System instructions repeated for every request
- High token costs for stable, repeatable context

**Revamp Strategy - API-Side Prompt Caching:**

#### What is Anthropic Prompt Caching?

**Different from Section 2.1 Redis Caching:**
- **Section 2.1**: Caches database queries (our backend, Redis)
- **Section 2.3**: Caches prompt context (Anthropic's backend, API feature)
- **Combined Impact**: 90% total cost reduction

**How Prompt Caching Works:**
```typescript
// Anthropic caches portions of system prompts for 5 minutes
// Subsequent requests reuse cached context at 90% discount
// Isolated per API key + conversation thread (no cross-contamination)
```

---

#### 🚨 CRITICAL: AI System Namespace Convention

**⚠️ MANDATORY FOR ALL NEW AI SYSTEMS:**

Every AI system MUST use a unique `[SYSTEM: NAME]` prefix in its first line of system prompt. This prevents prompt cache confusion when multiple AI systems run concurrently.

```typescript
// ✅ CORRECT: Each AI system has distinct namespace
const chatSystemPrompt = `[SYSTEM: MAIN_CHAT_AGENT]
You are an AI pricing assistant...`;

const eventSystemPrompt = `[SYSTEM: EVENT_DETECTOR]
You analyze conversations for important events...`;

const notificationSystemPrompt = `[SYSTEM: NOTIFICATION_GENERATOR]
You create professional customer notifications...`;

// ❌ WRONG: Generic system prompts can cause cache collisions
const genericPrompt = `You are an AI assistant...`; // DON'T DO THIS
```

**Registered AI System Namespaces:**

| Namespace | Purpose | File Location |
|-----------|---------|---------------|
| `MAIN_CHAT_AGENT` | Primary chat interface (Section 2.2) | `netlify/functions/ai-chat-orchestrator.ts` |
| `EVENT_DETECTOR` | Conversation event analysis (Section 3.2) | `netlify/functions/ai-event-detector.ts` |
| `USAGE_INSIGHTS_ANALYZER` | Monthly user interaction pattern analysis (Section 3.3) | `netlify/functions/ai-usage-insights.ts` |
| `QUICK_CALCULATOR_BRIDGE` | Natural language → calculator (Section 1.3) | TBD |
| `NOTIFICATION_GENERATOR` | Automated customer notifications | TBD |
| `WIZARD_ASSISTANT` | Custom service wizard helper | TBD |

**When Creating New AI Systems:**
1. Choose a unique, descriptive namespace (ALL_CAPS_SNAKE_CASE)
2. Add `[SYSTEM: YOUR_NAMESPACE]` as first line of system prompt
3. Register namespace in table above
4. Document in system's primary file

---

#### Safe Caching Targets

**✅ What TO Cache:**

1. **System Instructions** (changes: never)
   ```typescript
   {
     type: 'text',
     text: `[SYSTEM: MAIN_CHAT_AGENT]

            You are an AI pricing assistant for landscape contractors.

            Your response format should be:
            - Clear, concise quotes
            - Itemized breakdowns
            - Professional tone`,
     cache_control: { type: 'ephemeral' } // ✅ Cache this
   }
   ```

2. **Formula Documentation** (changes: never)
   ```typescript
   {
     type: 'text',
     text: `Standard Formula Reference (docs/CUSTOM-SERVICE-FORMULA-STANDARD.md):

            Tier 1: Labor Hours = Base Hours + Σ(Variable Adjustments)
            Tier 2: Total Price = (Labor + Materials) × Complexity + Profit + Pass-Through

            6 Material Calculation Methods: AREA_COVERAGE, VOLUME_COVERAGE...
            6 Variable Effect Types: labor_time_percentage, material_cost_multiplier...`,
     cache_control: { type: 'ephemeral' } // ✅ Cache this
   }
   ```

3. **Company Service List** (changes: every 15 minutes via Section 2.1)
   ```typescript
   {
     type: 'text',
     text: buildCompanyServicesContext(services), // Synced with Section 2.1 cache
     cache_control: { type: 'ephemeral' } // ✅ Cache this (auto-refreshes)
   }
   ```

**❌ What NOT to Cache:**

1. **User-Specific Data** (changes: every request)
   ```typescript
   {
     type: 'text',
     text: `User: ${userName}, Session: ${sessionId}`, // Unique every time
     // ❌ NO cache_control - caching provides no benefit
   }
   ```

2. **Customer-Specific Data** (changes: during conversation)
   ```typescript
   {
     type: 'text',
     text: buildCustomerContext(customerId), // Events change frequently
     // ❌ NO cache_control - must always be fresh
   }
   ```

3. **Dynamic Variables** (changes: continuously)
   ```typescript
   {
     type: 'text',
     text: `Current calculator: sqft=${sqft}, materials=${selected}`, // In-progress state
     // ❌ NO cache_control - state changes
   }
   ```

4. **Cross-System Context** (prevents namespace pollution)
   ```typescript
   // ❌ DON'T cache notification templates in chat agent prompts
   // Each AI system has its own cached context
   ```

---

#### Conservative Implementation Pattern

**Main Chat Agent (Section 2.2) with Safe Prompt Caching:**

```typescript
// netlify/functions/ai-chat-orchestrator.ts

export const handler = async (event) => {
  const { userMessage, companyId, userId, customerId, sessionId } = JSON.parse(event.body);

  // Load company services from Section 2.1 cache (15 min TTL)
  const services = await fetchServiceIntelligenceWithCache(companyId);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,

      // System prompt with SAFE caching strategy
      system: [
        {
          type: 'text',
          text: buildStaticSystemPrompt(), // NEVER changes
          cache_control: { type: 'ephemeral' } // ✅ Cache for 5 minutes
        },
        {
          type: 'text',
          text: buildFormulaDocumentation(), // NEVER changes
          cache_control: { type: 'ephemeral' } // ✅ Cache for 5 minutes
        },
        {
          type: 'text',
          text: buildCompanyServicesContext(services), // Changes every 15 min (synced with Section 2.1)
          cache_control: { type: 'ephemeral' } // ✅ Cache (refreshes automatically)
        },
        {
          type: 'text',
          text: buildCustomerContext(customerId) // ❌ Changes frequently - DON'T cache
          // No cache_control - always fresh
        }
      ],

      // Skills and tools from Section 2.2
      container: {
        skills: [
          { type: 'custom', skill_id: 'tradesphere-pricing', version: 'v1' },
          { type: 'custom', skill_id: 'material-intelligence', version: 'v1' },
          { type: 'custom', skill_id: 'service-intelligence', version: 'v1' }
        ]
      },

      tools: [
        { type: 'code_execution_20250825', name: 'code_execution' },
        // ... custom tools from Section 2.2
      ],

      messages: [
        {
          role: 'user',
          content: userMessage // ❌ Unique every time - DON'T cache
        }
      ]
    })
  });

  const result = await response.json();

  // Store interaction (Section 1.1)
  await storeUserInteraction(userId, companyId, userMessage, result.content[0].text, sessionId);

  // Event detection if customer locked (Section 1.1)
  if (customerId) {
    await triggerEventDetection(userMessage, result.content[0].text, customerId, companyId);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      response: result.content[0].text,
      usage: result.usage,
      cache_performance: {
        cache_creation_input_tokens: result.usage?.cache_creation_input_tokens || 0,
        cache_read_input_tokens: result.usage?.cache_read_input_tokens || 0
      }
    })
  };
};


// ✅ SAFE: Static system instructions (NEVER changes)
function buildStaticSystemPrompt(): string {
  return `[SYSTEM: MAIN_CHAT_AGENT]

You are an AI pricing assistant for landscape/hardscape contractors.

**Your Capabilities:**
- Calculate accurate quotes using two-tier pricing formulas
- Compare materials and identify cost savings
- Explain service capabilities and variables
- Reference past conversations when customer is locked

**Response Format:**
- Professional, consultative tone
- Clear itemized breakdowns
- Explain complex calculations simply
- Suggest optimizations when appropriate

**Important Rules:**
- ALWAYS use tools to fetch fresh data (don't assume from cached context)
- Customer events must be loaded via get_customer_events tool (Section 1.1)
- Service configurations must be loaded via get_pricing_config tool (Section 2.2)
- Material lists must be loaded via get_materials_list tool (Section 2.2)`;
}


// ✅ SAFE: Formula documentation (NEVER changes)
function buildFormulaDocumentation(): string {
  return `**Standard Formula Reference:**
All services follow docs/CUSTOM-SERVICE-FORMULA-STANDARD.md:

**Two-Tier Pricing System:**
- Tier 1: Labor Hours = Base Hours + Σ(Variable Adjustments)
- Tier 2: Total Price = (Labor + Materials) × Complexity + Profit + Pass-Through

**6 Material Calculation Methods:**
1. AREA_COVERAGE: sqft-based (pavers, mulch, sod) → quantity = (area ÷ coverage) × (1 + waste_factor)
2. VOLUME_COVERAGE: cubic yards with compaction (base rock, concrete) → volume_cy = (area × depth ÷ 12) ÷ 27
3. LINEAR_COVERAGE: linear ft (edging, pipe) → quantity = linear_ft ÷ coverage_per_unit
4. PER_UNIT: count-based (sand bags, plants) → quantity = count × units_per_package
5. WEIGHT_BASED: lbs/tons (stone dust) → weight = area × weight_per_sqft × (1 + waste)
6. CUSTOM_FORMULA: JSON-defined tiers (retaining walls) → evaluate formula from service config

**6 Variable Effect Types:**
1. labor_time_percentage: Adds % of base hours → adjusted_hours = base × (1 + value/100)
2. material_cost_multiplier: Scales material costs → material_cost = base_cost × multiplier
3. total_project_multiplier: Scales entire project → total = subtotal × multiplier
4. cutting_complexity: Adds fixed hours + material waste → hours += fixed; waste += percentage
5. daily_equipment_cost: Pass-through (NO profit) → cost = value × project_days
6. flat_additional_cost: Pass-through (NO profit) → total += value

**Pass-Through Cost Rule:**
Equipment and flat fees are NEVER included in profit margin calculation.
- Profitable Subtotal = Labor + Materials (profit applied here)
- Pass-Through = Equipment + Flat Fees (added after profit)`;
}


// ✅ SAFE: Company services (changes every 15 min, synced with Section 2.1)
function buildCompanyServicesContext(services: ServiceConfig[]): string {
  return `**Available Services for Company:**

${services.map(s => `
• ${s.service_name} (${s.service_id}):
  - Category: ${s.category}
  - Unit: ${s.unit}
  - Base Productivity: ${s.base_productivity} ${s.unit}/day
  - Team Size: ${s.optimal_team_size} person crew
`).join('\n')}

**To Generate Quote:**
1. Use get_pricing_config tool to fetch full service configuration
2. Use get_materials_list tool to fetch materials for each category
3. Activate tradesphere-pricing skill to calculate quote
4. Present itemized breakdown to user

**Important:** Service list updates every 15 minutes. Full config must be loaded via tools.`;
}


// ❌ NOT CACHED: Customer context (changes during conversation)
function buildCustomerContext(customerId?: string): string {
  if (!customerId) return '';

  return `**Customer Context:**
- Customer ID: ${customerId}
- This conversation is locked to a specific customer
- ⚠️ IMPORTANT: Use get_customer_events tool to load fresh customer data
- Customer events include: quote history, price changes, decision factors, objections
- Events are stored in customers.conversation_events JSONB field (Section 1.1)

**DO NOT assume customer preferences from this prompt.**
**ALWAYS call get_customer_events tool for current customer state.**`;
}
```

---

#### Cost Impact Analysis

**Token Breakdown (Per Request):**

```typescript
// Without Prompt Caching:
const systemPrompt = 2000; // Static instructions + formula docs
const companyServices = 500; // Service list
const customerContext = 300; // Customer-specific (not cached anyway)
const userMessage = 200; // User input
const aiResponse = 1000; // AI output

const totalTokens = 2000 + 500 + 300 + 200 + 1000 = 4000 tokens
const cost = 4000 × $0.003 = $0.012 per request

// With Conservative Prompt Caching:
// First Request (cache creation):
const cost_first = 4000 × $0.003 = $0.012

// Subsequent Requests (within 5 min, cache hit):
const cachedTokens = 2000 + 500; // System + company services (90% discount)
const freshTokens = 300 + 200 + 1000; // Customer + user + response

const cost_cached =
  (2500 × $0.0003) + // Cached portion (90% discount)
  (1500 × $0.003);    // Fresh portion (regular price)
const cost_cached = $0.00075 + $0.0045 = $0.00525 per request

// Cost Reduction: 56% per cached request
```

**Monthly Cost Projection (1,000 requests/day):**

```
Average cache window: 5 requests per 5-minute period

Without caching:
  1,000 requests × $0.012 = $12/day = $360/month

With caching:
  - Cache creation: 200 first requests × $0.012 = $2.40/day
  - Cache hits: 800 cached requests × $0.00525 = $4.20/day
  - Total: $6.60/day = $198/month

Savings: $162/month (45% reduction)

Combined with Section 2.1 caching savings ($270/month):
  Total AI infrastructure savings: $432/month
```

---

#### Cache Performance Monitoring

**Track Cache Effectiveness:**

```typescript
// Monitor cache performance via API response
const result = await response.json();

console.log('Cache Performance:', {
  cache_creation_input_tokens: result.usage?.cache_creation_input_tokens || 0,
  cache_read_input_tokens: result.usage?.cache_read_input_tokens || 0,
  input_tokens: result.usage?.input_tokens || 0,
  output_tokens: result.usage?.output_tokens || 0
});

// Good cache performance indicators:
// - cache_read_input_tokens > 2000 (system + formula cached)
// - cache_creation_input_tokens = 0 (cache hit, not creating new)
// - input_tokens low (only fresh context + user message)
```

**Cache Refresh Strategy:**

```typescript
// Prompt cache TTL: 5 minutes (Anthropic's setting)
// Section 2.1 cache TTL: 15 minutes (our Redis)

// Every 15 minutes:
// 1. Section 2.1 cache expires → fresh service list loaded
// 2. buildCompanyServicesContext() returns updated list
// 3. Anthropic creates NEW prompt cache with updated services
// 4. Old prompt cache expires naturally after 5 min

// This ensures service updates appear within 15 minutes max
```

---

#### Integration Points

**With Section 2.1 (Redis Caching):**
```typescript
// Company services cached in BOTH places:
// - Section 2.1: Redis cache (15 min TTL) → fast database queries
// - Section 2.3: Anthropic cache (5 min TTL) → cheap prompt tokens

// Sync strategy: Section 2.3 loads from Section 2.1
// Result: New services appear within 15 minutes
```

**With Section 2.2 (Skills + Tools):**
```typescript
// System prompt tells Claude about tools
// Cached prompt includes tool descriptions and usage patterns
// Tool calls themselves are NOT cached (always fresh data)
```

**With Section 1.1 (Memory System):**
```typescript
// Customer events are NEVER cached in prompts
// Always loaded fresh via get_customer_events tool
// Ensures real-time event awareness
```

---

#### AI System Registry (For Future Development)

**When Creating New AI Systems:**

1. **Choose Namespace**: Descriptive, ALL_CAPS_SNAKE_CASE
2. **Register Below**: Add row to table
3. **Document File**: Create orchestrator function in `netlify/functions/`
4. **Test Isolation**: Verify no cache collisions with other systems

| Namespace | Purpose | System Prompt Begins With | File Location | Status |
|-----------|---------|--------------------------|---------------|--------|
| `MAIN_CHAT_AGENT` | Primary pricing assistant | `[SYSTEM: MAIN_CHAT_AGENT]` | `netlify/functions/ai-chat-orchestrator.ts` | ✅ Active |
| `EVENT_DETECTOR` | Conversation event analysis | `[SYSTEM: EVENT_DETECTOR]` | `netlify/functions/ai-event-detector.ts` | 🔄 Planned |
| `QUICK_CALCULATOR_BRIDGE` | Natural language → calculator | `[SYSTEM: QUICK_CALCULATOR_BRIDGE]` | TBD | 🔄 Planned |
| `NOTIFICATION_GENERATOR` | Customer notifications | `[SYSTEM: NOTIFICATION_GENERATOR]` | TBD | 🔄 Planned |
| `WIZARD_ASSISTANT` | Custom service wizard guide | `[SYSTEM: WIZARD_ASSISTANT]` | TBD | 🔄 Planned |
| `QUOTE_OPTIMIZER` | Cost reduction suggestions | `[SYSTEM: QUOTE_OPTIMIZER]` | TBD | 🔄 Planned |
| `EXCAVATION_ANALYZER` | Soil/terrain analysis | `[SYSTEM: EXCAVATION_ANALYZER]` | TBD | 🔄 Planned |

---

**Agent Recommendations:**
- **backend-architect**: Implement cache performance monitoring dashboard
- **performance-engineer**: Profile cache hit rates and optimize cache boundaries
- **prompt-engineer**: Design system prompts that maximize cacheable portions
- **devops-troubleshooter**: Set up alerts for cache hit rate drops below 70%
- **security-auditor**: Ensure cached prompts don't leak company-specific data across namespaces

---

## **TIER 3: PRODUCTION IMPLEMENTATION ROADMAP**

### 3.1 Phase 1: User Memory Table (Week 1-2)

---

#### 🚨 BEFORE STARTING: Required Context Review

**STEP 1: Query Current Database Schema**
```bash
# Use the PostgreSQL MCP tool to understand existing schema
mcp__postgresql__query("SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;")
```

**STEP 2: Review Schema Reference File**
- **File**: `@src/database/schema-reference.sql`
- **Focus**:
  - `ai_chat_sessions` table (lines 4-45) - Current chat storage structure
  - `crm_customers` table (lines 269-294) - Customer data structure
  - `users` table (lines 564-583) - User authentication
  - `companies` table (lines 153-191) - Multi-tenant isolation

**STEP 3: Review Relevant Netlify Functions**
- **`netlify/functions/chat-response.js`** - Main AI chat orchestration (will need to route to new user memory storage)
- **`netlify/functions/customer-context.js`** - Customer data loading (reference for similar pattern)
- **`netlify/functions/chat-messages.js`** - Message retrieval (will need to support new user memory queries)

**STEP 4: Identify Integration Points**
Before writing any code, understand:
- Where does `ai_chat_sessions` currently store messages?
- How does `customer-context.js` load customer data? (Use same pattern for user memory)
- What RLS policies exist on `ai_chat_sessions`? (Apply similar to new table)
- How are `company_id` and `user_id` currently filtered in queries?

**STEP 5: Check for Existing Memory Tables**
```bash
# Query to see if any user interaction tables already exist
mcp__postgresql__query("SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%user%' OR table_name LIKE '%interaction%';")
```

---

**Database Migration:**
1. Create `company_user_interactions` table migration
2. Add RLS policies (company_id filtering)
3. Create indexes for 5-message window queries

**Files to Create:**
1. `src/services/ai-engine/UserMemoryService.ts` - Manages user interaction storage
2. `src/types/userMemory.ts` - TypeScript interfaces

**Files to Update:**
1. `src/utils/message-storage.ts:108-223` - Add storeUserInteraction() method
2. `src/components/ChatInterface.tsx` - Check if customer locked before storage routing
3. `src/services/ai-engine/MainChatAgentService.ts:114-150` - Load user context for non-customer chats

**Implementation:**
```typescript
// src/services/ai-engine/UserMemoryService.ts
class UserMemoryService {
  async storeUserMessage(
    userId: string,
    companyId: string,
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    interactionNumber: number
  ): Promise<void> {
    // Extract topics/services/materials via simple keyword matching
    const topics = this.extractTopics(userMessage + ' ' + aiResponse);
    const services = this.extractServices(userMessage);
    const materials = this.extractMaterials(userMessage);

    // Insert to company_user_interactions
    await supabase.from('company_user_interactions').insert({
      company_id: companyId,
      user_id: userId,
      session_id: sessionId,
      user_message: userMessage,
      ai_response: aiResponse,
      interaction_number: interactionNumber,
      recent_topics: topics,
      mentioned_services: services,
      mentioned_materials: materials
    });
  }

  async loadRecentUserContext(
    userId: string,
    companyId: string
  ): Promise<UserContext> {
    // Query last 5 messages ordered by created_at DESC
    const { data } = await supabase
      .from('company_user_interactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Aggregate topics, services, materials
    return {
      recentMessages: data.reverse(), // Chronological order
      topics: [...new Set(data.flatMap(d => d.recent_topics))],
      services: [...new Set(data.flatMap(d => d.mentioned_services))],
      materials: [...new Set(data.flatMap(d => d.mentioned_materials))]
    };
  }
}
```

**Agent Deployment:**
- **database-optimizer**: Design indexes for fast 5-message queries
- **typescript-pro**: Type-safe interfaces and validation
- **security-auditor**: RLS policies for multi-tenant isolation

---

### 3.2 Phase 2: Customer Event Detection (Week 3-4)

---

#### 🚨 BEFORE STARTING: Required Context Review

**STEP 1: Query Customer Table Structure**
```bash
# Use PostgreSQL MCP tool to check customers table
mcp__postgresql__query("SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_customers'
ORDER BY ordinal_position;")
```

**STEP 2: Review Schema Reference File**
- **File**: `@src/database/schema-reference.sql`
- **Focus**:
  - `crm_customers` table (lines 269-294) - Check if `conversation_events` JSONB field exists
  - `ai_chat_sessions` table (lines 4-45) - Understand current VC Usage structure for linking events
  - `crm_customer_events` table (lines 211-223) - See if event tracking already exists (may need to differentiate)
  - `crm_customer_conversation_summaries` table (lines 200-210) - Related conversation tracking

**STEP 3: Review Relevant Netlify Functions**
- **`netlify/functions/customer-context.js`** - Customer data loading (will need to return conversation_events)
- **`netlify/functions/chat-response.js`** - Main AI orchestration (will fire event detection)
- **`netlify/functions/generate-interaction-summary.js`** - Similar AI analysis pattern (use as reference)

**STEP 4: Identify Integration Points**
Before writing any code, understand:
- Does `crm_customers.metadata` JSONB already store events? (Check existing structure)
- What's the difference between `crm_customer_events` and `conversation_events`? (One is CRM actions, other is AI-detected)
- How does `customer-context.js` currently query customer data? (Will add events to response)
- What's the current structure of VC Usage IDs in `ai_chat_sessions`? (For event linkage)

**STEP 5: Check for Existing Event Detection**
```bash
# Query to see if event detection or JSONB event fields exist
mcp__postgresql__query("SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND (column_name LIKE '%event%' OR data_type = 'jsonb');")
```

---

**Database Migration:**
1. Add `conversation_events` JSONB field to customers table
2. Create helper functions for event append operations

**Files to Create:**
1. `netlify/functions/ai-event-detector.ts` - Event detection Netlify function
2. `src/services/ai-engine/EventDetectionService.ts` - Event detection logic
3. `src/types/customerEvents.ts` - Event type definitions

**Files to Update:**
1. `src/utils/message-storage.ts:229-392` - Fire-and-forget event detection after VC Usage insert
2. `netlify/functions/customer-context.js:138-144` - Return customer events in response
3. `src/services/ai-engine/MainChatAgentService.ts:79-83` - Inject customer events into prompt

**Implementation:**
```typescript
// netlify/functions/ai-event-detector.ts
export const handler = async (event) => {
  const { userMessage, aiResponse, customerContext, vcUsageId } = JSON.parse(event.body);

  // Call Claude API with event detection prompt
  const detectedEvents = await EventDetectionService.analyzeConversation({
    userMessage,
    aiResponse,
    previousEvents: customerContext.events || []
  });

  // If high-confidence events found (≥0.6), append to customer record
  if (detectedEvents.some(e => e.confidence >= 0.6)) {
    await EventDetectionService.appendEventsToCustomer(
      customerContext.customerId,
      detectedEvents,
      vcUsageId
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      events_detected: detectedEvents.length,
      high_confidence: detectedEvents.filter(e => e.confidence >= 0.6).length
    })
  };
};

// src/services/ai-engine/EventDetectionService.ts
class EventDetectionService {
  private readonly EVENT_DETECTION_PROMPT = `
    Analyze this conversation turn for important business events.

    Previous Context: {previousEvents}

    Current Turn:
    User: "{userMessage}"
    AI: "{aiResponse}"

    Detect these event types:
    1. PRICE_CHANGE: Quote amount changed >$500
    2. SERVICE_ADDED: New service discussed
    3. SERVICE_REMOVED: Service dropped
    4. MATERIAL_CHANGE: Different material selected
    5. DECISION_MADE: Customer committed
    6. OBJECTION_RAISED: Concern expressed
    7. TIMELINE_DISCUSSED: Dates mentioned

    Return JSON with confidence 0.0-1.0:
    {
      "events": [{
        "type": "PRICE_CHANGE",
        "confidence": 0.95,
        "summary": "Quote $6k→$9.5k (material upgrade)",
        "metadata": {
          "service": "Paver Patio",
          "old_price": 6000,
          "new_price": 9500,
          "reason": "Cambridge Ledgestone upgrade"
        }
      }]
    }
  `;

  static async analyzeConversation(input: ConversationInput): Promise<DetectedEvent[]> {
    const response = await callClaudeAPI(this.EVENT_DETECTION_PROMPT, {
      userMessage: input.userMessage,
      aiResponse: input.aiResponse,
      previousEvents: JSON.stringify(input.previousEvents.slice(-3)) // Last 3 events for context
    });

    return response.events.filter(e => e.confidence > 0.5); // Filter low-confidence
  }

  static async appendEventsToCustomer(
    customerId: string,
    events: DetectedEvent[],
    vcUsageId: number
  ): Promise<void> {
    // Use Postgres JSONB append operation
    const { data } = await supabase.rpc('append_customer_events', {
      p_customer_id: customerId,
      p_events: events.map(e => ({
        event_id: uuidv4(),
        event_type: e.type,
        timestamp: new Date().toISOString(),
        summary: e.summary,
        metadata: e.metadata,
        interaction_ref: vcUsageId,
        confidence: e.confidence
      }))
    });

    console.log(`✅ Appended ${events.length} events to customer ${customerId}`);
  }
}
```

**Agent Deployment:**
- **prompt-engineer**: Design event detection prompts for 90%+ precision
- **backend-architect**: Design event append RPC functions
- **database-optimizer**: Index conversation_events JSONB field for fast queries

---

#### 💡 BRAINSTORMING: Event-Triggered Automatic Actions

**Future Enhancement (Post-Phase 2):**
Once event detection is stable and accurate, consider implementing automatic actions triggered by specific event types:

**Potential Automation Ideas:**

1. **DECISION_MADE Event:**
   - Auto-generate follow-up task: "Send contract to [Customer Name]"
   - Trigger notification to sales manager: "[Salesperson] closed [Service] for $[Amount]"
   - Auto-create calendar reminder: "Follow up on signed contract in 3 days"

2. **OBJECTION_RAISED Event:**
   - Auto-flag customer record with objection type (price, timeline, material concern)
   - Suggest AI-generated responses based on past successful objection handling
   - Notify sales manager if multiple objections in single conversation

3. **TIMELINE_DISCUSSED Event:**
   - Auto-create calendar event: "[Customer Name] - [Service] target date: [Date]"
   - Set reminder 2 weeks before timeline: "Check in on [Customer] project timing"
   - Add to scheduling pipeline if date is within 30 days

4. **PRICE_CHANGE Event (>$2k increase):**
   - Auto-flag for manager approval before quote finalization
   - Generate price justification summary for salesperson to review
   - Track price sensitivity metrics per customer

5. **SERVICE_ADDED/REMOVED Event:**
   - Auto-update quote line items in real-time
   - Suggest bundle discounts if multiple services detected
   - Recalculate total and update conversation context immediately

6. **MATERIAL_CHANGE Event:**
   - Auto-check material availability in inventory (if integrated)
   - Suggest similar alternatives if selected material is out of stock
   - Update lead time estimates based on material availability

**Implementation Considerations:**
- Add `trigger_actions` boolean flag to event detection settings (default: false for Phase 2)
- Create `netlify/functions/event-action-dispatcher.ts` to route events to action handlers
- Build action handler registry: `{ DECISION_MADE: [createFollowUpTask, notifyManager], ... }`
- Add user preferences: "Which events should trigger notifications for me?"
- Implement undo/rollback for automatic actions (in case AI misdetected event)

**Database Schema Addition:**
```sql
CREATE TABLE event_triggered_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES conversation_events(event_id),
  action_type TEXT NOT NULL, -- 'notification', 'task_creation', 'calendar_event', etc.
  action_payload JSONB,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  undone BOOLEAN DEFAULT FALSE
);
```

**Notes for Implementation:**
- Start with READ-ONLY actions (notifications, suggestions) before WRITE actions (calendar, tasks)
- Add confidence threshold override: High-impact actions require ≥0.8 confidence
- Build audit trail: Every automatic action must be traceable to specific event
- User controls: "Pause automatic actions" toggle in settings

---

### 3.3 Phase 3: Integration & Optimization (Week 5-6)

---

#### 🚨 BEFORE STARTING: Required Context Review

**STEP 1: Query All Memory-Related Tables**
```bash
# Use PostgreSQL MCP tool to verify Phase 1 & 2 tables exist
mcp__postgresql__query("SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name = 'company_user_interactions'
     OR table_name = 'crm_customers')
ORDER BY table_name;")

# Check if conversation_events JSONB field was added
mcp__postgresql__query("SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'crm_customers'
AND column_name = 'conversation_events';")
```

**STEP 2: Review Schema Reference File**
- **File**: `@src/database/schema-reference.sql`
- **Focus**:
  - `company_user_interactions` table (should be created in Phase 1) - User memory storage
  - `crm_customers` table (lines 269-294) - Should have `conversation_events` JSONB field from Phase 2
  - `ai_chat_sessions` table (lines 4-45) - Integration point for routing storage
  - Review all foreign key relationships between these tables

**STEP 3: Review ALL Relevant Netlify Functions**
- **`netlify/functions/chat-response.js`** - Main orchestration (integrate both memory systems)
- **`netlify/functions/customer-context.js`** - Customer event loading (verify events returned)
- **`netlify/functions/chat-messages.js`** - Message retrieval (support both memory modes)
- **`netlify/functions/ai-event-detector.ts`** - Created in Phase 2 (verify it's working)
- **`netlify/functions/pricing-agent.js`** - May need context injection

**STEP 4: Identify Full Integration Points**
Before writing any code, understand:
- How does `ChatInterface.tsx` currently determine if customer is locked? (Need exact state variable)
- What's the current message flow from UI → storage → AI → response? (Map full pipeline)
- Where in `chat-response.js` do we inject context prompts? (Find exact line numbers)
- How does `message-storage.ts` currently route to `ai_chat_sessions`? (Will add conditional routing)
- What's the performance of 5-message queries in `company_user_interactions`? (May need indexes)

**STEP 5: Test Both Memory Paths Exist**
```bash
# Verify user memory service is accessible
mcp__postgresql__query("SELECT COUNT(*) as user_interaction_count
FROM company_user_interactions
WHERE created_at > NOW() - INTERVAL '7 days';")

# Verify customer events are being stored
mcp__postgresql__query("SELECT id, customer_name,
jsonb_array_length(COALESCE(conversation_events->'events', '[]'::jsonb)) as event_count
FROM crm_customers
WHERE conversation_events IS NOT NULL
LIMIT 5;")
```

---

**Full Flow Integration:**
1. Connect User Memory → Customer Event Detection → Context Loading
2. Update message flow in ChatInterface.tsx
3. Test complete cycle with real conversations

**Files to Update:**
1. `src/components/ChatInterface.tsx` - Route storage based on customer-locked state
2. `src/services/ai-engine/MainChatAgentService.ts:79-150` - Load and inject context
3. `src/utils/message-storage.ts:229-392` - Trigger event detection after VC Usage insert

**Context Loading Flow:**
```typescript
// src/services/ai-engine/MainChatAgentService.ts
static async generateResponse(input: ChatAgentInput): Promise<ChatAgentResponse> {
  let contextPrompt = '';

  // STEP 1: Check if customer is locked
  if (input.customerName && input.customerId) {
    // CUSTOMER-LOCKED: Load event-driven memory
    const customerEvents = await loadCustomerEvents(input.customerId);

    contextPrompt = `
CUSTOMER CONTEXT (${input.customerName}):

Active Quotes:
${customerEvents.active_quotes.map(q => `- ${q.service}: $${q.price} (${q.status})`).join('\n')}

Decision Factors: ${customerEvents.decision_factors.join(', ')}

Recent Events:
${customerEvents.events.slice(-5).map(e => `• ${e.summary} (${e.timestamp})`).join('\n')}

Previous Conversation (last 4 interactions):
${input.previousContext?.user_input || ''}
${input.previousContext?.ai_response || ''}
    `;
  } else {
    // NON-CUSTOMER: Load user loose memory
    const userMemory = await UserMemoryService.loadRecentUserContext(
      input.userId,
      input.companyId
    );

    contextPrompt = `
USER CONTEXT (${input.userName}):

Recent Topics: ${userMemory.topics.join(', ')}
Services Discussed: ${userMemory.services.join(', ')}
Materials Mentioned: ${userMemory.materials.join(', ')}

Last 4 Interactions:
${userMemory.recentMessages.map((m, i) => `
  User: ${m.user_message.substring(0, 100)}...
  AI: ${m.ai_response.substring(0, 100)}...
`).join('\n')}
    `;
  }

  // STEP 2: Build full prompt with context
  const fullPrompt = `${this.ENHANCED_SYSTEM_PROMPT}

${contextPrompt}

${input.collectionResult...}`;

  // STEP 3: Call Claude API
  const aiResponse = await this.processWithEnhancedFewShot(...);

  // STEP 4: AFTER response, fire-and-forget event detection (customer-locked only)
  if (input.customerName && input.customerId) {
    fetch('/.netlify/functions/ai-event-detector', {
      method: 'POST',
      body: JSON.stringify({
        userMessage: input.originalMessage,
        aiResponse: aiResponse.content,
        customerContext: { customerId: input.customerId, events: [...] },
        vcUsageId: <just inserted VC Usage ID>
      })
    }).catch(err => console.warn('Event detection failed (non-blocking)', err));
  }

  return { message: aiResponse.content, ... };
}
```

**Performance Optimization:**

Integrate multi-layered caching from Sections 2.1 and 2.3 with optimized TTLs per cache type:

1. **Company-Level Caching (Section 2.1):**
   - Service list: `company:{id}:service_list:all` → **TTL: 15 min** (frequent updates)
   - Service config: `company:{id}:service_config:{serviceId}` → **TTL: 1 hour** (stable data)
   - Service explanations: `company:{id}:service_explanation:{serviceId}` → **TTL: 1 hour** (stable AI-generated content)
   - Material list: `company:{id}:material_list:{serviceId}` → **TTL: 30 min** (moderate volatility)
   - Material prices: `company:{id}:material_prices:all` → **TTL: 30 min** (price changes affect quotes)
   - Material comparisons: `company:{id}:material_comparison:{category}` → **TTL: 2 hours** (computationally expensive)

2. **User-Level Caching (Section 2.1):**
   - Recent interactions: `user:{id}:recent_interactions:last_4` → **TTL: Session-based** (24 hours max)
   - Draft quotes: `user:{id}:draft_quote:{tempId}` → **TTL: 7 days** (allow work resumption)
   - User preferences: `user:{id}:preferences:defaults` → **TTL: 24 hours** (settings don't change often)

3. **Customer-Level Memory (Section 2.1):**
   - Conversation events: **NO CACHE** (always load fresh from `crm_customers.conversation_events` JSONB)
   - Quote history: **NO CACHE** (real-time accuracy critical for sales)

4. **Anthropic Prompt Caching (Section 2.3):**
   - System instructions → **API-side cache: 5 min** (90% cost reduction)
   - Formula documentation → **API-side cache: 5 min** (static reference content)
   - Company services context → **API-side cache: 5 min** (synced with Section 2.1's 15min TTL)
   - Customer/User context → **NO CACHE** (unique per request)

5. **Event Detection Batching:**
   - Max 1 event detection call per 10 seconds per customer (prevent API spam)
   - Queue rapid-fire messages and batch analyze after cooldown period

6. **Token Usage Monitoring:**
   - Track tokens per conversation turn (customer vs non-customer)
   - Alert if conversation exceeds 50k tokens (indicates context bloat)
   - Monthly report: Average tokens per quote generated

**Cache Invalidation Integration:**
- Automatic via Supabase webhooks (Section 2.1: lines 509-625)
- Manual invalidation when service/material saved (ServiceConfigManager, MaterialManager)
- Cache key pattern matching for wildcard clears (`company:*:material_comparison:*`)

**Agent Deployment:**
- **performance-engineer**: Profile token usage, latency, and cache hit rates per cache scope
- **backend-architect**: Implement cache invalidation webhooks and batching queues
- **security-auditor**: Rate limiting on event detection endpoint (10s cooldown per customer)
- **database-optimizer**: Index JSONB conversation_events for fast event queries

---

#### 💡 BRAINSTORMING: User Memory Light Event Detection for AI Training Insights

**Future Enhancement (Post-Phase 3):**
Add lightweight event detection to user memory (non-customer interactions) for the purpose of gathering AI model usage insights and preparing training data.

**Use Case:**
Analyze how salespeople use the AI chat system in their real-world trade business jobs:
- What questions do they ask when NOT working on a customer?
- How do they explore services/materials before presenting to customers?
- What pricing scenarios do they test/simulate?
- Where does the AI struggle to provide helpful answers?

**Implementation Strategy:**

1. **Separate Endpoint for Usage Analytics:**
   ```typescript
   // netlify/functions/ai-usage-insights.ts
   export const handler = async (event) => {
     // Runs MONTHLY (batch process, not real-time)
     // Analyzes company_user_interactions table for patterns

     const { companyId, dateRange } = JSON.parse(event.body);

     // Load last 30 days of non-customer interactions
     const interactions = await loadUserInteractions(companyId, dateRange);

     // Call GPT-4 Mini for cost-effective analysis
     const insights = await analyzeInteractionPatterns(interactions);

     return { statusCode: 200, body: JSON.stringify(insights) };
   };
   ```

2. **GPT-4 Mini Analysis (Cost-Effective):**
   ```typescript
   async function analyzeInteractionPatterns(interactions: UserInteraction[]) {
     // Batch analyze 100-500 interactions at once
     // GPT-4 Mini = 10x cheaper than Claude for bulk analysis

     const prompt = `[SYSTEM: USAGE_INSIGHTS_ANALYZER]

     Analyze these ${interactions.length} user interactions to identify:

     1. **Common Question Patterns**: What do users repeatedly ask?
     2. **Feature Discovery**: Which features are users unaware of?
     3. **Confusion Points**: Where does AI fail to provide clear answers?
     4. **Workflow Patterns**: How do users navigate pricing → materials → quotes?
     5. **Training Data Candidates**: Which conversations would improve future AI models?

     Return JSON with structured insights.`;

     const response = await callOpenAI_GPT4Mini(prompt, interactions);
     return response.insights;
   }
   ```

3. **Training Data Pre-Processing:**
   ```typescript
   // netlify/functions/ai-training-data-prep.ts
   export const handler = async (event) => {
     // SEPARATE API CALL: Prepare data for AI model fine-tuning

     const { companyId, interactionIds } = JSON.parse(event.body);

     // Load selected interactions (flagged by usage insights)
     const conversations = await loadConversationsForTraining(interactionIds);

     // Pre-process into training format (awaiting manual cleaning)
     const trainingData = conversations.map(conv => ({
       system: "[SYSTEM: MAIN_CHAT_AGENT] ...",
       user: conv.user_message,
       assistant: conv.ai_response,
       metadata: {
         company_id: companyId,
         service_discussed: conv.mentioned_services,
         quality_score: null, // Awaiting human review
         needs_cleaning: true
       }
     }));

     // Export to S3 or Supabase storage for manual review
     await exportTrainingDataForReview(companyId, trainingData);

     return {
       statusCode: 200,
       body: JSON.stringify({
         conversations_exported: trainingData.length,
         next_step: "Manual cleaning and quality scoring required"
       })
     };
   }
   ```

4. **Database Schema for Insights:**
   ```sql
   CREATE TABLE ai_usage_insights (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     company_id UUID NOT NULL REFERENCES companies(id),
     insight_type TEXT NOT NULL, -- 'common_question', 'confusion_point', 'feature_gap', etc.
     summary TEXT NOT NULL,
     frequency_count INTEGER,
     example_interactions JSONB, -- Array of interaction IDs
     analyzed_date_range TSTZRANGE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE ai_training_candidates (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     company_id UUID NOT NULL REFERENCES companies(id),
     interaction_id UUID REFERENCES company_user_interactions(id),
     candidate_reason TEXT, -- 'clear_question_answer', 'edge_case', 'confusion_resolved', etc.
     quality_score INTEGER, -- 1-5 (null = awaiting review)
     needs_cleaning BOOLEAN DEFAULT TRUE,
     reviewed_by UUID REFERENCES users(id),
     reviewed_at TIMESTAMPTZ,
     included_in_training BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

5. **Execution Schedule:**
   - **Monthly Analysis**: Run usage insights at end of each month
   - **Quarterly Training Prep**: Export training data candidates every 3 months
   - **Manual Review**: Human reviews flagged conversations for quality
   - **Model Fine-Tuning**: After 6-12 months, use cleaned data to fine-tune company-specific models

**Key Differences from Customer Event Detection (Section 3.2):**
| Feature | Customer Events (3.2) | User Memory Insights (3.3) |
|---------|----------------------|---------------------------|
| **Timing** | Real-time (fire-and-forget after each message) | Batch (monthly analysis) |
| **Purpose** | Sales intelligence (what customer cares about) | AI model improvement (how users use the system) |
| **AI Model** | Claude Sonnet 4.5 (accuracy) | GPT-4 Mini (cost-effective bulk analysis) |
| **Storage** | `crm_customers.conversation_events` JSONB | `ai_usage_insights` + `ai_training_candidates` tables |
| **Confidence** | ≥0.6 (actionable events only) | No confidence threshold (exploratory analysis) |

**Benefits:**
- **Product Intelligence**: Understand how users actually use the AI chat system
- **Feature Gaps**: Discover missing functionality users repeatedly ask about
- **Training Data Pipeline**: Build company-specific fine-tuned models over time
- **Cost Optimization**: GPT-4 Mini for bulk analysis = 90% cheaper than real-time Claude calls

**Notes for Implementation:**
- Keep user memory event detection SEPARATE from customer event detection (different pipelines)
- Batch processing only (never block real-time user interactions)
- Privacy-aware: Anonymize data before exporting for training (strip customer names, dollar amounts)
- Opt-in per company: "Allow anonymous interaction data for AI model improvements"

---

## **TIER 4: EXPECTED OUTCOMES**

### 4.1 User Experience Improvements
- **Contextual Intelligence**: AI remembers user's recent topics and customer's full quote history
- **Quick Calculator Conversations**: Talk through pricing while filling calculator inputs
- **Material Guidance**: AI explains "what can each material do?" and suggests optimizations

### 4.2 Cost Reductions
- **Token Savings**: 50% reduction via context compression and caching
- **Serverless Efficiency**: Edge functions = pay-per-use vs. always-on server
- **Agent Routing**: Complex queries only (5% of requests) use expensive multi-step processing

### 4.3 Performance Metrics
- **Response Time**: < 2 seconds (80% cache hit rate)
- **Context Accuracy**: 95%+ relevance score (tested via human eval)
- **Cost per Conversation**: $0.02 (down from $0.08 without caching)

---

## **CRITICAL SUCCESS FACTORS**

1. **Incremental Rollout**: Deploy in phases, validate each tier before next
2. **Cost Monitoring**: Track token usage per feature, kill expensive patterns
3. **Agent Discipline**: Only use specialized agents for high-value tasks
4. **Cache Invalidation**: Ensure real-time updates when services/materials change
5. **Customer Memory Pruning**: Archive conversations > 90 days old to reduce context size

---

**Document Version**: 1.0
**Total Lines**: 392
**Target Agents**: prompt-engineer, backend-architect, database-optimizer, frontend-developer, ui-ux-designer, typescript-pro, performance-engineer, security-auditor, mobile-developer
