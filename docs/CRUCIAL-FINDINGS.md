CRUCIAL FINDINGS: Cache & Real-time Update System
Overview
The TradeSphere pricing system uses a dual-update mechanism: in-memory caching for performance and Supabase real-time subscriptions for live updates. The Quick Calculator modal manages its subscription lifecycle tied to modal open/close events.
Cache System (master-pricing-engine.ts)
Purpose
The master pricing engine caches loaded configurations in memory to avoid repeated database queries.
Cache Key Format
const cacheKey = `${companyId}:${serviceName}`;
// Example: "08f0827a-608f-485a-a19f-e0c55ecf6484:paver_patio_sqft"
Cache Flow
Load Config: Check cache first (line 127)
Cache Hit: Return cached config immediately
Cache Miss: Query Supabase, then cache the result (line 183)
Critical Methods
loadPricingConfig() (line 108)
Checks cache before querying Supabase
Returns cached data if available
Stores fresh data in cache after Supabase query
clearCache() (line 367) - CRITICAL FIX
public clearCache(serviceName: string, companyId: string): void {
  const cacheKey = `${companyId}:${serviceName}`;
  this.configCache.delete(cacheKey);
  console.log('🧹 [MASTER ENGINE] Cache cleared for:', cacheKey);
}
Why This Was Added:
Services Database saves directly to Supabase using .upsert(), bypassing updatePricingConfig()
Without manual cache clearing, Quick Calculator would load stale cached data
Now called immediately after every Services Database save (serviceBaseSettingsStore.ts line 173)
Real-time Subscription System
Subscription Lifecycle (QuickCalculatorTab.tsx)
Creation (lines 38-70)
useEffect(() => {
  if (!isOpen || !user?.company_id) return;
  
  // 1. Reload config immediately (fresh data)
  store.reloadConfig();
  
  // 2. Create real-time subscription
  const unsubscribe = masterPricingEngine.subscribeToConfigChanges(
    'paver_patio_sqft',
    user.company_id,
    (newConfig) => {
      store.setConfig(newConfig);
    }
  );
  
  // 3. Cleanup when modal closes
  return () => {
    unsubscribe();
  };
}, [isOpen, user?.company_id]);
Key Points:
Subscription created ONLY when modal opens (isOpen === true)
Subscription created AFTER authentication (user?.company_id available)
Cleanup function guaranteed to run when isOpen changes to false
No dependency on store object (prevents infinite loop)
Cleanup Triggers (Ironclad)
All three modal close methods call onClose() which sets isOpen to false, triggering cleanup:
X button click (line 105-110)
Background overlay click (line 54-60)
Modal container click (line 66-72)
React guarantee: Cleanup runs when dependency (isOpen) changes from true to false
Complete Update Flow
Scenario 1: Services Database Save (Quick Calculator Closed)
1. User changes profit margin in Services Database
2. serviceBaseSettingsStore.ts saveServiceConfig() called
3. Supabase .upsert() executes (line 152-156)
4. ✅ Cache cleared: masterPricingEngine.clearCache() (line 173)
5. User opens Quick Calculator
6. store.reloadConfig() called (line 48)
7. Cache miss → Queries Supabase → Fresh data ✅
Scenario 2: Services Database Save (Quick Calculator Open)
1. Quick Calculator open → Real-time subscription active
2. User changes profit margin in Services Database
3. Supabase .upsert() executes
4. Cache cleared immediately (line 173)
5. Supabase broadcasts change via WebSocket
6. Real-time callback fires (line 55-59)
7. store.setConfig(newConfig) called
8. UI updates instantly ✅
Scenario 3: Modal Close
1. User closes Quick Calculator (any method)
2. isOpen changes from true to false
3. useEffect cleanup function runs (line 66-69)
4. unsubscribe() called
5. WebSocket connection closed
6. No memory leaks ✅
Why Authentication Matters
Real-time subscriptions require authentication when RLS is enabled: Without Auth:
Subscription shows SUBSCRIBED status
WebSocket connects
Events NEVER fire (silently filtered by RLS)
With Auth:
Subscription authenticated with access token
WebSocket connects with credentials
Events fire correctly ✅
Standalone Test Proved This:
Unauthenticated test: SUBSCRIBED but no events ❌
Authenticated test: SUBSCRIBED and events fired ✅
Critical Files
src/pricing-system/core/calculations/master-pricing-engine.ts
Cache management (loadPricingConfig, clearCache)
Real-time subscription setup (subscribeToConfigChanges)
src/stores/serviceBaseSettingsStore.ts
Services Database save logic
Calls masterPricingEngine.clearCache() after save
src/pricing-system/interfaces/quick-calculator/QuickCalculatorTab.tsx
Modal lifecycle management
Real-time subscription tied to isOpen state
src/pricing-system/core/stores/paver-patio-store.ts
Exposes reloadConfig() for manual refresh
Exposes setConfig() for real-time callback
Key Takeaways
✅ Cache clearing is CRITICAL - Must be called after every Supabase save, not just via updatePricingConfig() ✅ Modal lifecycle controls subscriptions - Create on open, destroy on close (no orphaned connections) ✅ Authentication required - Real-time needs valid session for RLS-protected tables ✅ Dual update paths work together - Cache clearing (immediate) + Real-time (when modal open)