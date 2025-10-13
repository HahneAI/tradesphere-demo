# Phase 3C: Backend Service Architecture - Complete Refactoring Plan

**Date**: 2025-10-13
**Project**: TradeSphere Customer Management Backend Refactoring
**Phase**: 3C - Backend Service Layer Implementation

---

## Executive Summary

This document outlines the complete refactoring of TradeSphere's backend customer management services from a fragmented, chat-centric architecture to a unified, repository-based service layer. The new architecture leverages the enhanced database schema from Phase 3A/3B, providing 10x performance improvements and enabling full CRUD operations with automatic sync between chat and customer records.

---

## Current vs New Architecture

### Current Architecture (Problems)
```
Frontend Components
        ↓
customerService.ts (716 lines, queries VC Usage directly)
        ↓
VC Usage Table (denormalized, no FK to customers)
        +
customers Table (unused, no sync)
        +
customerManagementService.ts (255 lines, never used)
```

**Issues**:
- Direct database queries scattered throughout services
- N+1 query patterns with in-memory aggregation
- No use of new customer_metrics materialized view
- No integration with Phase 3A features (soft deletes, lifecycle, tags)
- Two separate customer data sources with no sync
- Manual aggregation causing 500ms+ response times

### New Architecture (Solution)
```
Frontend Components
        ↓
customerService.ts (Facade - maintains backward compatibility)
        ↓
    Repository Layer (Data Access)
    ├── CustomerRepository.ts (CRUD operations)
    │   └── Uses customer_metrics view for lists
    │
    Service Layer (Business Logic)
    ├── CustomerSyncService.ts (Chat ↔ Customer sync)
    ├── CustomerMergeService.ts (Deduplication)
    ├── CustomerLifecycleService.ts (Stages & Tags)
    └── CustomerEnrichmentService.ts (Data aggregation)
        ↓
    Database Layer
    ├── customers table (primary source)
    ├── customer_metrics view (pre-calculated stats)
    ├── VC Usage table (chat data, FK to customers)
    └── Triggers (auto-sync on INSERT/UPDATE)
```

**Benefits**:
- Clean separation of concerns
- Repository pattern isolates database logic
- Leverages database triggers for auto-sync
- Uses materialized view for 10x faster queries
- Type-safe with full TypeScript coverage
- Maintains backward compatibility

---

## Service Layer Responsibilities

### 1. CustomerRepository.ts - Data Access Layer
**Purpose**: Single source of truth for all database operations

**Responsibilities**:
- All CRUD operations on customers table
- Multi-tenant filtering (company_id) on every query
- Soft delete aware (filters deleted_at IS NULL)
- Uses customer_metrics view for list queries (10x faster)
- Joins with VC Usage for conversation data
- Implements retry logic and error handling

**Key Methods**:
```typescript
- getCustomers(companyId, filters) → CustomerProfile[]
- getCustomerById(id) → CustomerProfile
- createCustomer(profile) → CustomerProfile
- updateCustomer(id, updates) → CustomerProfile
- softDeleteCustomer(id) → void
- searchCustomers(companyId, query) → CustomerProfile[]
- getCustomerWithMetrics(id) → CustomerWithMetrics
```

### 2. CustomerSyncService.ts - Synchronization Service
**Purpose**: Manage sync between customers table and VC Usage

**Responsibilities**:
- Manual sync operations (auto-sync handled by triggers)
- Link existing VC Usage records to customers
- Enrich customer profiles from conversation data
- Handle orphaned conversations (no customer link)

**Key Methods**:
```typescript
- syncFromChat(vcUsageRecord) → CustomerProfile
- linkConversationToCustomer(customerId, sessionId) → void
- enrichCustomerFromConversations(customerId) → void
- getCustomerConversations(customerId) → Conversation[]
- findOrphanedConversations(companyId) → VCUsageRecord[]
```

### 3. CustomerMergeService.ts - Deduplication Service
**Purpose**: Find and merge duplicate customer records

**Responsibilities**:
- Duplicate detection using customer_matching_keys
- Merge customer records with conflict resolution
- Transfer all FK references to merged customer
- Log merges in customer_merge_log
- Provide undo capability

**Key Methods**:
```typescript
- findDuplicates(customerId) → CustomerProfile[]
- mergeCustomers(sourceId, targetId) → MergeResult
- previewMerge(sourceId, targetId) → MergePreview
- undoMerge(mergeId) → void
- bulkFindDuplicates(companyId) → DuplicateGroup[]
```

### 4. CustomerLifecycleService.ts - Lifecycle Management
**Purpose**: Manage customer lifecycle stages and tags

**Responsibilities**:
- Update lifecycle stages (prospect → lead → customer)
- Manage customer tags
- Track customer events
- Generate customer timeline

**Key Methods**:
```typescript
- updateLifecycleStage(customerId, stage) → void
- addTags(customerId, tags[]) → void
- removeTags(customerId, tags[]) → void
- getCustomerTimeline(customerId) → CustomerEvent[]
- bulkUpdateLifecycleStage(customerIds[], stage) → void
```

### 5. CustomerEnrichmentService.ts - Data Enrichment
**Purpose**: Aggregate and enrich customer data from multiple sources

**Responsibilities**:
- Extract customer data from conversations
- Merge conversation summaries into profiles
- Update customer metrics
- Generate customer insights

**Key Methods**:
```typescript
- enrichFromConversations(customerId) → EnrichmentResult
- extractContactInfo(conversations[]) → ContactInfo
- generateConversationSummary(customerId) → string
- updateCustomerNotes(customerId, notes) → void
```

---

## Data Flow Diagrams

### Customer Creation Flow
```
User creates customer in UI
        ↓
customerService.createCustomer()
        ↓
CustomerRepository.createCustomer()
        ↓
INSERT INTO customers
        ↓
TRIGGER: trg_customers_matching_keys_sync
        ├── Creates matching keys for duplicate detection
        └── Logs to customer_events
        ↓
TRIGGER: trg_customers_audit_log
        └── Logs change to audit trail
        ↓
Return CustomerProfile to UI
```

### Chat Auto-Sync Flow
```
User chats with AI (customer name entered)
        ↓
INSERT INTO "VC Usage"
        ↓
TRIGGER: trg_vc_usage_customer_sync_insert
        ↓
find_or_create_customer_from_chat()
        ├── Check customer_matching_keys for duplicate
        ├── If found: link via customer_id FK
        └── If not found: create new customer
        ↓
TRIGGER: trg_vc_usage_metrics_refresh
        └── Updates customer_metrics view
        ↓
Customer available in customers table
```

### Customer List Query Flow
```
User opens Customers tab
        ↓
customerService.getCustomerList()
        ↓
CustomerRepository.getCustomers()
        ↓
SELECT FROM customer_metrics (materialized view)
        ├── Pre-calculated stats (instant)
        └── Joined with customers table
        ↓
Apply filters and pagination
        ↓
Return CustomerProfile[] (50ms vs 500ms before)
```

### Customer Merge Flow
```
User selects duplicate customers
        ↓
CustomerMergeService.previewMerge()
        ├── Show field-by-field comparison
        └── Highlight conflicts
        ↓
User confirms merge
        ↓
CustomerMergeService.mergeCustomers()
        ├── Update target customer with merged data
        ├── Transfer all VC Usage FK references
        ├── Set source.merged_into_customer_id
        ├── Set source.deleted_at (soft delete)
        └── Log to customer_merge_log
        ↓
TRIGGER: refresh_customer_metrics()
        └── Recalculate metrics for target
        ↓
Return merged CustomerProfile
```

---

## Migration Strategy

### Phase 1: Deploy New Services (No Breaking Changes)
1. Deploy new repository and service files
2. Keep existing customerService.ts unchanged
3. Test new services in parallel
4. Monitor performance metrics

### Phase 2: Gradual Migration (1-2 weeks)
1. Update customerService.ts to delegate to repository
2. One method at a time to minimize risk
3. A/B test old vs new implementation
4. Monitor error rates and performance

### Phase 3: Complete Migration (Week 3)
1. Fully migrate all methods to new architecture
2. Update Netlify functions to use repository
3. Deprecate customerManagementService.ts
4. Clean up unused code

### Phase 4: Optimization (Week 4)
1. Fine-tune database indexes
2. Optimize query patterns
3. Add caching layer if needed
4. Performance testing at scale

---

## Backward Compatibility Plan

### Maintain Existing API Surface
```typescript
// customerService.ts - Facade pattern
export class CustomerService {
  private repository = new CustomerRepository();
  private syncService = new CustomerSyncService();

  // Keep existing method signature
  async getCustomerList(techId: string, filters: CustomerSearchFilters) {
    // Delegate to new repository
    return this.repository.getCustomers(
      await this.getUserCompanyId(techId),
      filters
    );
  }

  // All existing methods maintained
  // Internal implementation changed only
}
```

### Gradual Deprecation
1. Mark old methods as @deprecated
2. Log usage of deprecated methods
3. Provide migration guide for consumers
4. Remove after 3-month grace period

---

## Performance Improvements Expected

### Query Performance
| Operation | Current | New | Improvement |
|-----------|---------|-----|-------------|
| Customer List (1000 records) | 500ms | 50ms | **10x** |
| Customer Search | 300ms | 30ms | **10x** |
| Customer Details + History | 400ms | 100ms | **4x** |
| Bulk Customer Update | 2000ms | 200ms | **10x** |

### Database Efficiency
- **Before**: 7-13 queries per customer list (N+1 problem)
- **After**: 1-2 queries using joins and views
- **Reduction**: 85% fewer database queries

### Memory Usage
- **Before**: Load all VC Usage records, aggregate in memory
- **After**: Pre-aggregated in database, stream results
- **Reduction**: 90% less memory usage

---

## Error Handling Strategy

### Repository Layer
```typescript
class CustomerRepository {
  async getCustomerById(id: string): Promise<CustomerProfile> {
    try {
      const result = await this.withRetry(
        () => this.supabase
          .from('customers')
          .select('*, customer_metrics(*)')
          .eq('id', id)
          .single(),
        3, // max retries
        'getCustomerById'
      );

      if (!result.data) {
        throw new NotFoundError(`Customer ${id} not found`);
      }

      return this.mapToCustomerProfile(result.data);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;

      this.logger.error('Failed to get customer', { id, error });
      throw new RepositoryError('Failed to retrieve customer', error);
    }
  }
}
```

### Service Layer
```typescript
class CustomerMergeService {
  async mergeCustomers(sourceId: string, targetId: string): Promise<MergeResult> {
    const transaction = await this.db.transaction();

    try {
      // Validate customers exist
      const [source, target] = await Promise.all([
        this.repository.getCustomerById(sourceId),
        this.repository.getCustomerById(targetId)
      ]);

      // Check permissions
      if (!this.canMerge(source, target)) {
        throw new PermissionError('Cannot merge these customers');
      }

      // Perform merge
      const result = await this.performMerge(source, target, transaction);

      await transaction.commit();
      return result;

    } catch (error) {
      await transaction.rollback();

      if (error instanceof BusinessError) throw error;

      this.logger.error('Merge failed', { sourceId, targetId, error });
      throw new ServiceError('Customer merge failed', error);
    }
  }
}
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('CustomerRepository', () => {
  it('should filter soft-deleted customers', async () => {
    const customers = await repository.getCustomers(companyId);
    expect(customers.every(c => !c.deleted_at)).toBe(true);
  });

  it('should enforce company isolation', async () => {
    const customersA = await repository.getCustomers(companyA);
    const customersB = await repository.getCustomers(companyB);
    expect(customersA).not.toContainAny(customersB);
  });
});
```

### Integration Tests
```typescript
describe('Customer Sync Flow', () => {
  it('should auto-create customer from chat', async () => {
    // Insert VC Usage record
    await supabase.from('VC Usage').insert({
      customer_name: 'John Doe',
      customer_email: 'john@example.com'
    });

    // Wait for trigger
    await delay(100);

    // Verify customer created
    const customer = await repository.findByEmail('john@example.com');
    expect(customer).toBeDefined();
    expect(customer.source).toBe('chat');
  });
});
```

### Performance Tests
```typescript
describe('Performance', () => {
  it('should query 1000 customers in <100ms', async () => {
    const start = Date.now();
    const customers = await repository.getCustomers(companyId, { limit: 1000 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
    expect(customers.length).toBe(1000);
  });
});
```

---

## Security Considerations

### Multi-Tenant Isolation
- Every query includes company_id filter
- RLS policies enforce at database level
- No cross-company data access possible

### Soft Delete Implementation
```typescript
class CustomerRepository {
  // Never expose deleted records
  private baseQuery() {
    return this.supabase
      .from('customers')
      .select()
      .is('deleted_at', null); // Always filter soft-deleted
  }

  // Soft delete only
  async deleteCustomer(id: string): Promise<void> {
    await this.supabase
      .from('customers')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'deleted'
      })
      .eq('id', id);
    // Never hard delete
  }
}
```

### Audit Trail
- All changes logged to customer_audit_log
- Immutable audit records
- Includes user, timestamp, before/after values

---

## Monitoring & Observability

### Metrics to Track
```typescript
// Repository metrics
- Query duration by method
- Cache hit rate
- Database connection pool usage
- Error rate by error type

// Service metrics
- Sync success rate
- Merge operation count
- Duplicate detection accuracy
- Enrichment completeness

// Business metrics
- Customers created per hour
- Average customer completeness
- Duplicate rate
- Lifecycle stage distribution
```

### Logging Strategy
```typescript
class CustomerRepository {
  private logger = new Logger('CustomerRepository');

  async createCustomer(profile: CustomerProfile) {
    const correlationId = uuid();

    this.logger.info('Creating customer', {
      correlationId,
      companyId: profile.company_id,
      source: profile.source
    });

    try {
      const result = await this.performCreate(profile);

      this.logger.info('Customer created', {
        correlationId,
        customerId: result.id,
        duration: Date.now() - start
      });

      return result;
    } catch (error) {
      this.logger.error('Customer creation failed', {
        correlationId,
        error: error.message,
        profile
      });
      throw error;
    }
  }
}
```

---

## Rollback Plan

### Immediate Rollback (Critical Issues)
1. Revert customerService.ts to previous version
2. Deploy previous build
3. Monitor for 24 hours

### Gradual Rollback (Performance Issues)
1. Switch specific methods back to old implementation
2. Investigate performance bottlenecks
3. Fix and redeploy

### Database Rollback (Data Corruption)
1. Disable triggers
2. Restore from backup
3. Rerun migration scripts after fixes

---

## Success Criteria

### Technical Success
- ✅ All existing APIs maintain backward compatibility
- ✅ Query performance improved by 10x
- ✅ Zero data loss during migration
- ✅ 100% test coverage on critical paths
- ✅ No increase in error rates

### Business Success
- ✅ Customer list loads in <100ms
- ✅ Duplicate customers reduced by 90%
- ✅ Customer data completeness increased by 50%
- ✅ Support tickets reduced by 40%

---

## Next Steps

1. **Review and Approval**: Technical review of architecture
2. **Implementation**: Create service files (4-6 hours)
3. **Testing**: Unit and integration tests (2-3 hours)
4. **Staging Deployment**: Deploy to test environment
5. **Performance Testing**: Load test with 1000+ customers
6. **Production Deployment**: Gradual rollout with monitoring

---

## Conclusion

This architecture provides a clean, maintainable, and performant foundation for TradeSphere's customer management system. By leveraging the repository pattern, database triggers, and materialized views, we achieve 10x performance improvements while maintaining backward compatibility and enabling future enhancements.