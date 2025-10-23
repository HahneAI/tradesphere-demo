# Phase 3C: Migration Guide - Backend Service Refactoring

**Date**: 2025-10-13
**Project**: TradeSphere Customer Management Backend Migration
**Risk Level**: Low (backward compatible)

---

## Overview

This guide provides step-by-step instructions for migrating from the current fragmented customer service architecture to the new repository-based service layer. The migration is designed to be gradual and reversible, with no breaking changes.

---

## Pre-Migration Checklist

### Prerequisites
- [ ] Phase 3A database schema deployed (customers table enhanced)
- [ ] Phase 3B indexes created (10x performance optimization)
- [ ] Database triggers active (auto-sync from VC Usage)
- [ ] Customer_metrics materialized view created
- [ ] Backup of production database completed

### Testing Environment
- [ ] Staging environment available
- [ ] Test data loaded (minimum 100 customers)
- [ ] Performance monitoring tools configured
- [ ] Error tracking enabled (Sentry/LogRocket)

---

## Migration Phases

## Phase 1: Deploy New Services (Day 1-2)
**Risk: None - New files only**

### Step 1.1: Deploy Type Definitions
```bash
# Deploy new type definitions
cp src/types/customer.ts staging/src/types/
```

**Verification**:
```typescript
// Test type imports work
import { CustomerProfile, CustomerSearchFilters } from '../types/customer';
```

### Step 1.2: Deploy Repository and Services
```bash
# Deploy new service files
cp src/services/CustomerRepository.ts staging/src/services/
cp src/services/CustomerSyncService.ts staging/src/services/
cp src/services/CustomerMergeService.ts staging/src/services/
cp src/services/CustomerLifecycleService.ts staging/src/services/
cp src/services/CustomerEnrichmentService.ts staging/src/services/
```

**Verification**:
```typescript
// Test services initialize without errors
import { customerRepository } from './CustomerRepository';
import { customerSyncService } from './CustomerSyncService';

// Test basic operations
const customers = await customerRepository.getCustomers(companyId, { limit: 10 });
console.log(`Loaded ${customers.items.length} customers`);
```

### Step 1.3: Test New Services in Isolation
Create a test script to verify new services work correctly:

```typescript
// test-new-services.ts
async function testNewServices() {
  const companyId = 'test-company-id';

  // Test repository
  const { items } = await customerRepository.getCustomers(companyId, {
    limit: 5,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  console.log('Repository test passed:', items.length);

  // Test sync service
  const orphaned = await customerSyncService.findOrphanedConversations(companyId);
  console.log('Found orphaned conversations:', orphaned.length);

  // Test lifecycle service
  const timeline = await customerLifecycleService.getCustomerTimeline(items[0].id);
  console.log('Timeline events:', timeline.events.length);

  return true;
}
```

---

## Phase 2: Gradual Service Migration (Day 3-7)
**Risk: Low - Facade pattern maintains compatibility**

### Step 2.1: Update customerService.ts - Read Operations
Start with read-only operations to minimize risk:

```typescript
// customerService.ts - Phase 2.1
import { customerRepository } from './CustomerRepository';
import { customerSyncService } from './CustomerSyncService';

export class CustomerService {
  private supabase = getSupabase();
  private useNewServices = process.env.USE_NEW_SERVICES === 'true';

  async getCustomerList(techId: string, filters: CustomerSearchFilters) {
    if (this.useNewServices) {
      // NEW: Use repository
      const companyId = await this.getUserCompanyId(techId);
      return customerRepository.getCustomers(companyId, filters);
    } else {
      // OLD: Keep existing implementation
      return this.getCustomerListLegacy(techId, filters);
    }
  }

  // Keep old implementation as fallback
  private async getCustomerListLegacy(techId: string, filters: CustomerSearchFilters) {
    // ... existing code ...
  }
}
```

### Step 2.2: A/B Testing Configuration
Enable gradual rollout with feature flags:

```typescript
// config/features.ts
export const features = {
  useNewCustomerRepository: {
    enabled: process.env.NODE_ENV === 'staging',
    rolloutPercentage: 10, // Start with 10% of users
    userWhitelist: ['admin@company.com'] // Test with specific users
  }
};

// In customerService.ts
private shouldUseNewService(userId: string): boolean {
  const feature = features.useNewCustomerRepository;

  if (!feature.enabled) return false;
  if (feature.userWhitelist.includes(userId)) return true;

  // Random rollout
  return Math.random() * 100 < feature.rolloutPercentage;
}
```

### Step 2.3: Update Write Operations
After read operations are stable, migrate write operations:

```typescript
// customerService.ts - Phase 2.3
async updateCustomerDetails(sessionId: string, techId: string, updates: any) {
  if (this.useNewServices) {
    // Find customer by session
    const { data: vcUsage } = await this.supabase
      .from('VC Usage')
      .select('customer_id')
      .eq('session_id', sessionId)
      .single();

    if (vcUsage?.customer_id) {
      return customerRepository.updateCustomer(vcUsage.customer_id, updates);
    } else {
      // Fallback to old method if no customer link
      return this.updateCustomerDetailsLegacy(sessionId, techId, updates);
    }
  } else {
    return this.updateCustomerDetailsLegacy(sessionId, techId, updates);
  }
}
```

### Step 2.4: Monitor Performance
Track key metrics during migration:

```typescript
// monitoring.ts
export async function trackMigrationMetrics(operation: string, useNew: boolean) {
  const start = Date.now();

  try {
    // ... perform operation ...
    const duration = Date.now() - start;

    // Log to monitoring service
    await logMetric({
      operation,
      implementation: useNew ? 'new' : 'legacy',
      duration,
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await logMetric({
      operation,
      implementation: useNew ? 'new' : 'legacy',
      error: error.message,
      success: false
    });
    throw error;
  }
}
```

---

## Phase 3: Update Netlify Functions (Day 8-10)
**Risk: Medium - External API changes**

### Step 3.1: Update customer-context.js
```javascript
// netlify/functions/customer-context.js
import { customerRepository } from '../../src/services/CustomerRepository';
import { customerSyncService } from '../../src/services/CustomerSyncService';

export const handler = async (event, context) => {
  // ... existing setup ...

  // NEW: Use repository if customer_id provided
  if (customerId) {
    const history = await customerSyncService.getCustomerConversationHistory(
      customerId,
      sessionId,
      2
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        conversationHistory: history
      })
    };
  } else {
    // FALLBACK: Use old method for backward compatibility
    // ... existing VC Usage query ...
  }
};
```

### Step 3.2: Update customer-update.js
```javascript
// netlify/functions/customer-update.js
import { customerRepository } from '../../src/services/CustomerRepository';

export const handler = async (event, context) => {
  // ... existing setup ...

  // NEW: Update via repository if customer_id available
  const { data: vcUsage } = await supabase
    .from('VC Usage')
    .select('customer_id')
    .eq('session_id', payload.sessionId)
    .single();

  if (vcUsage?.customer_id) {
    // Update via repository
    await customerRepository.updateCustomer(vcUsage.customer_id, {
      customer_name: payload.customerName,
      customer_email: payload.customerEmail,
      customer_phone: payload.customerPhone,
      customer_address: payload.customerAddress
    });
  } else {
    // Fallback to updating VC Usage directly
    // ... existing update logic ...
  }
};
```

---

## Phase 4: Complete Migration (Day 11-14)
**Risk: Low - With fallbacks in place**

### Step 4.1: Remove Legacy Code
After confirming stability, remove legacy implementations:

```typescript
// customerService.ts - Final
export class CustomerService {
  private repository = new CustomerRepository();
  private syncService = new CustomerSyncService();
  private mergeService = new CustomerMergeService();
  private lifecycleService = new CustomerLifecycleService();
  private enrichmentService = new CustomerEnrichmentService();

  async getCustomerList(techId: string, filters: CustomerSearchFilters) {
    const companyId = await this.getUserCompanyId(techId);
    return this.repository.getCustomers(companyId, filters);
  }

  // All methods now use new services
  // Legacy code removed
}
```

### Step 4.2: Deprecate customerManagementService.ts
```typescript
// customerManagementService.ts
/**
 * @deprecated Use CustomerRepository instead
 * This service will be removed in v2.0.0
 */
export class CustomerManagementService {
  constructor() {
    console.warn('CustomerManagementService is deprecated. Use CustomerRepository instead.');
  }
  // ... existing code ...
}
```

### Step 4.3: Run Data Sync
Sync any orphaned conversations:

```typescript
// one-time-sync.ts
async function syncAllOrphanedConversations() {
  const companies = await getAllCompanies();

  for (const company of companies) {
    console.log(`Syncing company ${company.id}...`);
    const synced = await customerSyncService.syncOrphanedConversations(company.id);
    console.log(`Synced ${synced} conversations`);
  }
}
```

---

## Testing Checklist

### Unit Tests
- [ ] CustomerRepository all methods
- [ ] CustomerSyncService sync logic
- [ ] CustomerMergeService merge operations
- [ ] CustomerLifecycleService stage transitions
- [ ] CustomerEnrichmentService data extraction

### Integration Tests
- [ ] Customer creation from chat
- [ ] Customer sync with VC Usage
- [ ] Customer merge with data transfer
- [ ] Multi-tenant isolation
- [ ] Soft delete filtering

### Performance Tests
- [ ] Customer list query < 100ms (1000 records)
- [ ] Customer search < 50ms
- [ ] Bulk operations < 5s (100 records)
- [ ] Memory usage stable

### User Acceptance Tests
- [ ] Customers tab loads correctly
- [ ] Customer search works
- [ ] Customer details display
- [ ] Customer edit saves
- [ ] No duplicate customers created

---

## Rollback Plan

### Immediate Rollback (Critical Issue)
```bash
# 1. Switch feature flag
export USE_NEW_SERVICES=false

# 2. Deploy previous version
git checkout previous-release
npm run build
npm run deploy

# 3. Monitor for 24 hours
```

### Gradual Rollback (Performance Issue)
```typescript
// Reduce rollout percentage
features.useNewCustomerRepository.rolloutPercentage = 0;

// Or disable for specific operations
features.useNewCustomerRepository.operations = {
  read: false,  // Rollback reads
  write: true   // Keep writes on new system
};
```

### Database Rollback (Data Issue)
```sql
-- Disable triggers if causing issues
ALTER TABLE "VC Usage" DISABLE TRIGGER trg_vc_usage_customer_sync_insert;
ALTER TABLE "VC Usage" DISABLE TRIGGER trg_vc_usage_customer_sync_update;

-- Remove customer_id links if needed
UPDATE "VC Usage" SET customer_id = NULL WHERE customer_linked_at > '2024-01-01';
```

---

## Post-Migration Tasks

### Week 1 Post-Migration
- [ ] Monitor error rates (should not increase)
- [ ] Check performance metrics (should improve 10x)
- [ ] Review user feedback
- [ ] Fix any edge cases

### Week 2 Post-Migration
- [ ] Remove feature flags
- [ ] Delete legacy code
- [ ] Update documentation
- [ ] Train support team

### Month 1 Post-Migration
- [ ] Performance optimization based on real usage
- [ ] Plan Phase 4 features
- [ ] Archive migration scripts
- [ ] Celebrate success! 🎉

---

## Monitoring & Alerts

### Key Metrics to Track
```typescript
// Set up monitoring for these metrics
const metricsToTrack = {
  // Performance
  'customer.list.duration': { threshold: 100, unit: 'ms' },
  'customer.search.duration': { threshold: 50, unit: 'ms' },
  'customer.create.duration': { threshold: 200, unit: 'ms' },

  // Reliability
  'customer.sync.success_rate': { threshold: 95, unit: '%' },
  'customer.merge.success_rate': { threshold: 90, unit: '%' },

  // Business
  'customer.duplicates.created': { threshold: 5, unit: 'per_hour' },
  'customer.orphaned.conversations': { threshold: 10, unit: 'per_hour' }
};
```

### Alert Configuration
```yaml
alerts:
  - name: customer-service-error-rate
    condition: error_rate > 1%
    duration: 5 minutes
    severity: warning

  - name: customer-query-slow
    condition: p95_latency > 200ms
    duration: 10 minutes
    severity: warning

  - name: customer-sync-failed
    condition: sync_success_rate < 90%
    duration: 5 minutes
    severity: critical
```

---

## Support & Troubleshooting

### Common Issues

#### Issue: Customer list slow
```typescript
// Check if using new repository
console.log('Using new services:', process.env.USE_NEW_SERVICES);

// Check if indexes exist
const { data } = await supabase.rpc('check_indexes', {
  table_name: 'customers'
});
```

#### Issue: Duplicate customers appearing
```typescript
// Run deduplication
const { merged, skipped } = await customerMergeService.autoMergeDuplicates(companyId);
console.log(`Merged ${merged}, skipped ${skipped}`);
```

#### Issue: Conversations not linked to customers
```typescript
// Run sync for orphaned conversations
const synced = await customerSyncService.syncOrphanedConversations(companyId);
console.log(`Synced ${synced} orphaned conversations`);
```

### Contact for Issues
- Technical Lead: backend-architect
- Database Issues: database-architect
- Performance Issues: performance-engineer
- Emergency Hotline: [Your on-call rotation]

---

## Success Criteria

### Technical Success
- ✅ All services deployed without errors
- ✅ No increase in error rates
- ✅ Performance improved by 10x
- ✅ All tests passing
- ✅ Zero data loss

### Business Success
- ✅ Customer list loads instantly
- ✅ No duplicate customers
- ✅ All conversations linked
- ✅ Support tickets reduced
- ✅ User satisfaction increased

---

## Appendix: SQL Queries for Verification

### Check customer sync status
```sql
-- Count customers with linked conversations
SELECT COUNT(DISTINCT customer_id) as linked_customers
FROM "VC Usage"
WHERE customer_id IS NOT NULL;

-- Count orphaned conversations
SELECT COUNT(*) as orphaned
FROM "VC Usage"
WHERE customer_id IS NULL
  AND customer_name IS NOT NULL;
```

### Verify performance improvements
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT c.*, cm.*
FROM customers c
JOIN customer_metrics cm ON cm.customer_id = c.id
WHERE c.company_id = 'your-company-id'
  AND c.deleted_at IS NULL
LIMIT 50;
```

### Audit customer operations
```sql
-- Recent customer operations
SELECT event_type, COUNT(*) as count
FROM customer_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;
```

---

**Migration Guide Version**: 1.0.0
**Last Updated**: 2025-10-13
**Next Review**: Post-migration Week 1