# TradeSphere Customer System Security Documentation

**Document Date**: 2025-10-14
**Status**: RLS DISABLED (Development Phase)
**Priority**: Re-enable RLS before production deployment

---

## Executive Summary

During Phase 3 Customer Management implementation, Row Level Security (RLS) was **temporarily disabled** on all customer-related tables to resolve blocking errors with materialized views and LEFT JOIN operations. Security is currently enforced at the **application layer** through the CustomerRepository pattern.

**⚠️ CRITICAL**: This is a **temporary development configuration**. RLS MUST be re-enabled before production deployment.

---

## Table of Contents

1. [Current Security Architecture](#current-security-architecture)
2. [What Changed: RLS Disabled](#what-changed-rls-disabled)
3. [App-Side Security Implementation](#app-side-security-implementation)
4. [User Role System](#user-role-system)
5. [Security Gaps & Vulnerabilities](#security-gaps--vulnerabilities)
6. [RLS Re-Enablement Plan](#rls-re-enablement-plan)
7. [Production Readiness Checklist](#production-readiness-checklist)

---

## Current Security Architecture

### Security Layers (As Implemented)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Supabase JWT Authentication                       │
│ ✅ ACTIVE - Validates user identity                        │
│ - auth.uid() available in queries                          │
│ - JWT tokens verified by Supabase                          │
│ - Session management handled by Supabase Auth              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Application-Level Filtering (CustomerRepository)  │
│ ✅ ACTIVE - All queries filter by company_id               │
│ - CustomerRepository enforces company_id filtering         │
│ - Frontend passes user.company_id to all methods           │
│ - No direct database access from frontend                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Row Level Security (RLS)                          │
│ ❌ DISABLED - Database-level isolation removed             │
│ - RLS policies exist but are disabled                      │
│ - No enforcement at PostgreSQL level                       │
│ - Security relies entirely on app layer                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: User Role Permissions                             │
│ ⚠️  PARTIAL - Roles defined but not enforced in customers  │
│ - User roles stored in users table                         │
│ - Frontend conditionally shows/hides UI elements           │
│ - No backend enforcement on customer operations            │
└─────────────────────────────────────────────────────────────┘
```

### What We Lost by Disabling RLS

**Defense-in-Depth Principle Violated**: With RLS disabled, we no longer have database-level security as a failsafe. If the application layer is bypassed or has a bug, there's no second layer of defense.

---

## What Changed: RLS Disabled

### Migration: 09-FIX-CUSTOMER-METRICS-FINAL.sql

**Date**: 2025-10-14
**Reason**: Resolved "Failed to fetch customer" errors caused by RLS on materialized views

#### Tables Affected

```sql
-- RLS DISABLED ON:
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_matching_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_conversation_summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_merge_log DISABLE ROW LEVEL SECURITY;
```

#### Tables STILL WITH RLS ENABLED

These tables were NOT modified and still have RLS active:

```sql
-- RLS STILL ENABLED:
- customer_interactions (uses user_company_id() function)
- VC Usage (has RLS policies active)
- users (critical - has RLS policies)
- companies (has RLS policies)
```

#### Views Modified

```sql
-- BEFORE: Materialized view with RLS issues
DROP MATERIALIZED VIEW customer_metrics;

-- AFTER: Regular view (no RLS)
CREATE OR REPLACE VIEW customer_metrics AS ...
```

**Why**: Materialized views cannot have `DISABLE ROW LEVEL SECURITY` applied. Regular views don't have RLS by default.

---

## App-Side Security Implementation

### CustomerRepository Pattern

The **CustomerRepository** class is the **primary security enforcement** layer for customer data.

#### Multi-Tenancy Enforcement

**Every method filters by company_id**:

```typescript
// ✅ SECURE: All queries include company_id filter
async getCustomersByCompany(companyId: string): Promise<CustomerProfile[]> {
  const { data, error } = await this.supabase
    .from('customers')
    .select('*')
    .eq('company_id', companyId)  // 🔒 Multi-tenant filter
    .is('deleted_at', null);
}

async getCustomerById(customerId: string, companyId: string): Promise<CustomerProfile> {
  const { data, error } = await this.supabase
    .from('customers')
    .select('*, customer_metrics(*)')
    .eq('id', customerId)
    .eq('company_id', companyId)  // 🔒 Multi-tenant filter
    .is('deleted_at', null)
    .single();
}

async updateCustomer(
  customerId: string,
  companyId: string,  // 🔒 Required parameter
  updates: Partial<CustomerProfile>
): Promise<void> {
  await this.supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .eq('company_id', companyId);  // 🔒 Multi-tenant filter
}

async deleteCustomer(customerId: string, companyId: string): Promise<void> {
  await this.supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', customerId)
    .eq('company_id', companyId);  // 🔒 Multi-tenant filter
}
```

#### Frontend Usage Pattern

**All frontend calls pass user.company_id**:

```typescript
// In CustomersTab.tsx
const customerRepo = new CustomerRepository();

// ✅ SECURE: Frontend must pass company_id from authenticated user
await customerRepo.updateCustomer(
  selectedCustomer.id,
  user.company_id,  // From AuthContext
  updates
);

await customerRepo.deleteCustomer(
  customerId,
  user.company_id  // From AuthContext
);
```

#### Validation in Repository

```typescript
async createCustomer(input: CustomerCreateInput): Promise<CustomerProfile> {
  // ✅ VALIDATION: Reject if no company_id
  if (!input.company_id) {
    throw new ValidationError('company_id is required');
  }

  // ✅ DEDUPLICATION: Check for existing customer in same company
  if (input.customer_email) {
    const existing = await this.findByEmail(input.company_id, input.customer_email);
    if (existing) {
      throw new ValidationError('Customer with this email already exists');
    }
  }

  // ✅ INSERT: company_id enforced
  const customerData = {
    company_id: input.company_id,  // 🔒 Required field
    customer_name: input.customer_name,
    // ... other fields
  };
}
```

### CustomerSyncService Security

**Auto-sync from chat also enforces company_id**:

```typescript
// In message-storage.ts
if (hasCustomerInfo && payload.companyId) {
  const syncResult = await customerSyncService.syncFromChat({
    company_id: payload.companyId,  // 🔒 Required
    customer_name: vcRecord.customer_name,
    customer_email: vcRecord.customer_email,
    // ...
  });
}

// In CustomerSyncService.ts
async syncFromChat(vcUsageRecord: VCUsageRecord): Promise<CustomerSyncResult> {
  const companyId = vcUsageRecord.company_id;  // 🔒 Required in interface

  // Find existing customer BY COMPANY
  const existingCustomer = await customerRepository.findByEmail(
    companyId,  // 🔒 Multi-tenant filter
    vcUsageRecord.customer_email
  );
}
```

---

## User Role System

### Role Fields in Users Table

```sql
-- User permission flags
is_super_admin    BOOLEAN  -- Platform admin (cross-company)
is_admin          BOOLEAN  -- Company admin
is_owner          BOOLEAN  -- Company owner (billing, settings)
is_manager        BOOLEAN  -- Department manager
is_sales          BOOLEAN  -- Sales role
is_field_tech     BOOLEAN  -- Field technician
is_analyst        BOOLEAN  -- Data analyst
is_developer      BOOLEAN  -- Developer access

-- Additional fields
role              VARCHAR  -- Primary role string
company_id        UUID     -- Company association
```

### Role-Based Access SHOULD Work Like This (Not Currently Enforced)

#### Customer Management Permissions Matrix

| Operation                  | Super Admin | Owner | Admin | Manager | Sales | Field Tech | Analyst |
|----------------------------|-------------|-------|-------|---------|-------|------------|---------|
| **View Customers**         | ✅ All Cos  | ✅    | ✅    | ✅      | ✅    | ✅         | ✅      |
| **Create Customer**        | ✅          | ✅    | ✅    | ✅      | ✅    | ⚠️  Limited| ❌      |
| **Update Customer**        | ✅          | ✅    | ✅    | ✅      | ✅    | ⚠️  Own    | ❌      |
| **Delete Customer**        | ✅          | ✅    | ✅    | ⚠️  Soft| ❌    | ❌         | ❌      |
| **Merge Customers**        | ✅          | ✅    | ✅    | ❌      | ❌    | ❌         | ❌      |
| **Bulk Import**            | ✅          | ✅    | ✅    | ❌      | ❌    | ❌         | ❌      |
| **Sync Orphaned Convos**   | ✅          | ✅    | ✅    | ⚠️  View| ❌    | ❌         | ❌      |
| **Bulk Enrich**            | ✅          | ✅    | ✅    | ❌      | ❌    | ❌         | ❌      |
| **View Audit Log**         | ✅          | ✅    | ✅    | ✅      | ⚠️ Own| ❌         | ✅      |
| **Export Customer Data**   | ✅          | ✅    | ✅    | ✅      | ✅    | ❌         | ✅      |

**Legend:**
- ✅ Full access
- ⚠️ Limited access (with conditions)
- ❌ No access

### Current Frontend Role Enforcement

**UI elements conditionally rendered**:

```typescript
// In CustomersTab.tsx
{user?.is_admin || user?.is_owner ? (
  <button onClick={() => setShowSyncPanel(true)}>
    Sync
  </button>
) : null}

{user?.is_admin || user?.is_owner || user?.is_manager ? (
  <button onClick={() => setShowCreateWizard(true)}>
    Create Customer
  </button>
) : null}
```

**⚠️ SECURITY GAP**: This is **client-side only**. Malicious users can bypass by:
- Modifying React state
- Calling API directly
- Using browser dev tools

---

## Security Gaps & Vulnerabilities

### 🚨 CRITICAL GAPS (Must Fix Before Production)

#### 1. **No Database-Level Security**

**Risk Level**: 🔴 CRITICAL

```
VULNERABILITY:
With RLS disabled, if CustomerRepository is bypassed, there's no defense.

ATTACK VECTORS:
- Direct Supabase client calls from frontend (bypassing repository)
- SQL injection (if any raw queries exist)
- Compromised API keys allowing direct database access
- Bugs in repository code that forget company_id filter

EXAMPLE EXPLOIT:
// Malicious code in browser console
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

// ❌ NO RLS = Can access ANY company's data
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('customer_email', 'competitor@example.com');
// Returns customer data from ALL companies!
```

**Impact**: Complete data breach. Competitor companies can see each other's customers.

---

#### 2. **No Role-Based Access Control (RBAC) in Backend**

**Risk Level**: 🔴 CRITICAL

```
VULNERABILITY:
User roles are checked in frontend UI only. No backend enforcement.

ATTACK VECTORS:
- Bypass frontend by calling repository directly
- Modify user.is_admin flag in browser memory
- Craft API requests with elevated permissions

EXAMPLE EXPLOIT:
// Sales user (should not delete) can call:
await customerRepo.deleteCustomer(customerId, companyId);
// ❌ No backend check of user.is_sales = should fail but doesn't

// Field tech (should not merge) can call:
await mergeService.mergeCustomers(sourceId, targetId, companyId);
// ❌ No backend check of user.is_field_tech = should fail but doesn't
```

**Impact**: Privilege escalation. Low-privilege users can perform admin actions.

---

#### 3. **CustomerSyncPanel Operations Not Role-Gated**

**Risk Level**: 🟡 HIGH

```
VULNERABILITY:
Anyone who can access CustomerSyncPanel can run destructive operations.

OPERATIONS AT RISK:
- Sync Orphaned Conversations (can link convos to wrong customers)
- Bulk Enrich All Customers (can overwrite customer data)
- Manual customer merges (permanent data loss)

CURRENT STATE:
- Frontend hides "Sync" button for non-admins
- BUT CustomerSyncPanel itself has no role checks
- Service methods have no role validation

EXAMPLE EXPLOIT:
// Non-admin user modifies React state to show Sync button
setShowSyncPanel(true);  // Now visible

// Calls bulk enrich
await customerSyncService.enrichCustomerFromConversations(customerId);
// ❌ No role check in service = succeeds when it shouldn't
```

**Impact**: Data corruption. Unauthorized bulk operations on customer records.

---

#### 4. **Soft Delete Can Be Bypassed**

**Risk Level**: 🟡 HIGH

```
VULNERABILITY:
CustomerRepository uses soft delete (deleted_at timestamp).
Users with database access can hard delete.

CURRENT IMPLEMENTATION:
async deleteCustomer(customerId: string, companyId: string): Promise<void> {
  // Soft delete only
  await this.supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', customerId)
    .eq('company_id', companyId);
}

ATTACK VECTOR:
// Direct Supabase call (bypasses repository)
await supabase
  .from('customers')
  .delete()  // Hard delete
  .eq('id', customerId);
// ❌ With RLS disabled, this works from frontend
```

**Impact**: Permanent data loss. Customer records unrecoverable.

---

#### 5. **No Audit Trail for Deletions**

**Risk Level**: 🟡 MEDIUM

```
VULNERABILITY:
Customer deletions not logged to customer_audit_log.

CURRENT STATE:
- customer_audit_log table exists
- NOT used by CustomerRepository.deleteCustomer()
- No record of who deleted what and when

COMPLIANCE RISK:
- GDPR requires audit trail for data deletions
- SOC2 compliance requires access logging
- Cannot investigate unauthorized deletions
```

**Impact**: Compliance violations. Cannot trace malicious deletions.

---

#### 6. **customer_metrics View Has No Company Filter**

**Risk Level**: 🟡 MEDIUM

```sql
-- Current view definition (no WHERE clause on company_id)
CREATE OR REPLACE VIEW customer_metrics AS
SELECT
    c.id as customer_id,
    c.company_id,
    COUNT(DISTINCT vc.session_id) as total_conversations,
    ...
FROM customers c
LEFT JOIN "VC Usage" vc ON c.id = vc.customer_id
WHERE c.deleted_at IS NULL  -- ❌ No company_id filter
GROUP BY c.id, c.company_id;

VULNERABILITY:
View returns metrics for ALL companies if queried without filter.

ATTACK VECTOR:
SELECT * FROM customer_metrics;
-- Returns ALL companies' metrics (with RLS disabled)
```

**Impact**: Information disclosure. Metrics visible across companies.

---

### ⚠️ MODERATE GAPS (Should Fix)

#### 7. **No Rate Limiting on Sync Operations**

**Risk Level**: 🟠 MEDIUM

```
VULNERABILITY:
Bulk sync operations can be triggered repeatedly, causing DoS.

ATTACK VECTOR:
// Spam bulk enrich button
for (let i = 0; i < 100; i++) {
  await customerSyncService.enrichCustomerFromConversations(customerId);
}
// ❌ No throttling = database overload
```

**Impact**: Service degradation. Database performance impact.

---

#### 8. **Fuzzy Matching Can Be Exploited**

**Risk Level**: 🟠 MEDIUM

```
VULNERABILITY:
Auto-sync fuzzy matching by name (80% confidence) can be spoofed.

ATTACK VECTOR:
// Create chat with similar name to competitor's customer
{
  customer_name: "John Doe",  // Matches existing "Jhon Doe"
  customer_email: "attacker@evil.com"
}
// ❌ Gets linked to wrong customer, sees their data
```

**Impact**: Data leakage. Conversation linked to wrong customer.

---

### 🟢 LOW RISK GAPS (Nice to Have)

#### 9. **No Input Sanitization in Search**

**Risk Level**: 🟢 LOW

```typescript
// CustomerRepository.searchCustomers()
.ilike('customer_name', `%${query}%`)  // Potential SQL injection?

// NOTE: Supabase client library escapes parameters
// But should still validate input
```

**Impact**: Minimal (Supabase escapes), but best practice violation.

---

## RLS Re-Enablement Plan

### Phase 1: Audit Current RLS Policies (1-2 hours)

**Objective**: Document all existing RLS policies and identify issues.

```sql
-- 1. Check which tables have RLS enabled/disabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Review all existing policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Test each policy individually
SET ROLE authenticated;
SET request.jwt.claim.sub = '<test-user-id>';
SELECT * FROM customers LIMIT 1;
```

**Deliverables**:
- [ ] Spreadsheet of all tables + RLS status
- [ ] List of broken policies (materialize view issues)
- [ ] List of working policies (keep as-is)

---

### Phase 2: Fix Materialized View Issues (2-3 hours)

**Objective**: Resolve RLS + materialized view incompatibility.

**Option A: Keep Regular View (Current State)**

✅ Pros:
- Already working
- No RLS issues
- Real-time data (no refresh needed)

❌ Cons:
- Slower for large datasets (>10k customers)
- No RLS on view itself

**Option B: Convert to Database Function**

```sql
-- Create function that respects RLS
CREATE OR REPLACE FUNCTION get_customer_metrics(p_customer_id UUID)
RETURNS TABLE (
  customer_id UUID,
  total_conversations INTEGER,
  total_interactions INTEGER,
  total_views INTEGER,
  first_interaction_at TIMESTAMP,
  last_interaction_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as customer_id,
    COUNT(DISTINCT vc.session_id)::INTEGER as total_conversations,
    COUNT(vc.id)::INTEGER as total_interactions,
    COALESCE(SUM(vc.view_count), 0)::INTEGER as total_views,
    MIN(vc.created_at) as first_interaction_at,
    MAX(vc.created_at) as last_interaction_at
  FROM customers c
  LEFT JOIN "VC Usage" vc ON c.id = vc.customer_id
  WHERE c.id = p_customer_id
    AND c.company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )  -- RLS enforcement
    AND c.deleted_at IS NULL
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Option C: Materialized View + Refresh Function**

```sql
-- Create materialized view (no RLS)
CREATE MATERIALIZED VIEW customer_metrics_materialized AS ...;

-- Create security function to access it
CREATE OR REPLACE FUNCTION get_customer_metrics_secure(p_customer_id UUID)
RETURNS SETOF customer_metrics_materialized AS $$
BEGIN
  -- Check user has access to this customer's company
  IF NOT EXISTS (
    SELECT 1 FROM customers c
    JOIN users u ON c.company_id = u.company_id
    WHERE c.id = p_customer_id
      AND u.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT * FROM customer_metrics_materialized
  WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Recommended**: Option A (keep regular view) for now, upgrade to B/C if performance issues.

---

### Phase 3: Re-Enable RLS on Customer Tables (3-4 hours)

**Migration Script**: `10-REENABLE-CUSTOMER-RLS.sql`

```sql
-- ============================================================================
-- RE-ENABLE ROW LEVEL SECURITY ON CUSTOMER TABLES
-- ============================================================================
-- WARNING: Only run this after fixing materialized view issues
-- WARNING: Test thoroughly in staging before production
-- ============================================================================

-- STEP 1: Enable RLS on all customer tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_matching_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_merge_log ENABLE ROW LEVEL SECURITY;

-- STEP 2: Update policies to use auth.uid() properly
-- (Existing policies should already be defined, just re-enabled)

-- STEP 3: Test with authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = '<test-user-id>';

-- Should return only customers from user's company
SELECT * FROM customers LIMIT 5;

-- Should fail (different company)
SELECT * FROM customers WHERE company_id = '<different-company-id>';

-- STEP 4: Verify all policies are active
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename LIKE 'customer%';
-- Expected: All should show rowsecurity = true
```

**Testing Checklist**:
- [ ] CustomerRepository.getCustomersByCompany() works
- [ ] CustomerRepository.getCustomerById() works
- [ ] CustomerRepository.updateCustomer() works
- [ ] CustomerRepository.deleteCustomer() works
- [ ] Cannot access other companies' customers
- [ ] customer_metrics view still works with LEFT JOIN

---

### Phase 4: Implement Role-Based Access Control (6-8 hours)

**Create RBAC Helper Functions**:

```sql
-- ============================================================================
-- RBAC HELPER FUNCTIONS
-- ============================================================================

-- Check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND (
        CASE required_role
          WHEN 'super_admin' THEN is_super_admin = TRUE
          WHEN 'admin' THEN is_admin = TRUE OR is_owner = TRUE
          WHEN 'owner' THEN is_owner = TRUE
          WHEN 'manager' THEN is_manager = TRUE OR is_admin = TRUE OR is_owner = TRUE
          WHEN 'sales' THEN is_sales = TRUE
          WHEN 'field_tech' THEN is_field_tech = TRUE
          WHEN 'analyst' THEN is_analyst = TRUE
          ELSE FALSE
        END
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's company_id
CREATE OR REPLACE FUNCTION user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT company_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage customers
CREATE OR REPLACE FUNCTION user_can_manage_customers()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role('admin') OR user_has_role('manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Add RBAC Policies**:

```sql
-- ============================================================================
-- CUSTOMER TABLE RBAC POLICIES
-- ============================================================================

-- DROP old policies
DROP POLICY IF EXISTS customers_company_isolation ON customers;
DROP POLICY IF EXISTS customers_select_company ON customers;
DROP POLICY IF EXISTS customers_insert_company ON customers;
DROP POLICY IF EXISTS customers_update_company ON customers;
DROP POLICY IF EXISTS customers_delete_company ON customers;

-- SELECT: All authenticated users can view customers from their company
CREATE POLICY customers_select_rbac ON customers
  FOR SELECT
  TO authenticated
  USING (
    company_id = user_company_id()
    AND deleted_at IS NULL
  );

-- INSERT: Only admin, manager, sales can create customers
CREATE POLICY customers_insert_rbac ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = user_company_id()
    AND (
      user_has_role('admin')
      OR user_has_role('manager')
      OR user_has_role('sales')
    )
  );

-- UPDATE: Only admin, manager, sales can update
-- Field techs can only update customers they created
CREATE POLICY customers_update_rbac ON customers
  FOR UPDATE
  TO authenticated
  USING (
    company_id = user_company_id()
    AND (
      user_has_role('admin')
      OR user_has_role('manager')
      OR user_has_role('sales')
      OR (user_has_role('field_tech') AND created_by_user_id = auth.uid())
    )
  );

-- DELETE: Only admin and owner can delete
CREATE POLICY customers_delete_rbac ON customers
  FOR UPDATE  -- Soft delete is UPDATE operation
  TO authenticated
  USING (
    company_id = user_company_id()
    AND deleted_at IS NULL  -- Can only delete active customers
    AND (user_has_role('admin') OR user_has_role('owner'))
  )
  WITH CHECK (deleted_at IS NOT NULL);  -- Ensure it's a soft delete
```

**TypeScript RBAC Middleware**:

```typescript
// src/middleware/rbac.ts
export class RBACMiddleware {
  /**
   * Check if user has required role for operation
   */
  static async checkRole(
    userId: string,
    requiredRole: 'admin' | 'owner' | 'manager' | 'sales'
  ): Promise<boolean> {
    const { data } = await supabase
      .from('users')
      .select('is_admin, is_owner, is_manager, is_sales')
      .eq('id', userId)
      .single();

    if (!data) return false;

    switch (requiredRole) {
      case 'admin':
        return data.is_admin || data.is_owner;
      case 'owner':
        return data.is_owner;
      case 'manager':
        return data.is_manager || data.is_admin || data.is_owner;
      case 'sales':
        return data.is_sales;
      default:
        return false;
    }
  }

  /**
   * Throw error if user doesn't have required role
   */
  static async requireRole(
    userId: string,
    requiredRole: 'admin' | 'owner' | 'manager' | 'sales'
  ): Promise<void> {
    const hasRole = await this.checkRole(userId, requiredRole);
    if (!hasRole) {
      throw new AuthorizationError(
        `User does not have required role: ${requiredRole}`
      );
    }
  }
}
```

**Update CustomerRepository with RBAC**:

```typescript
// src/services/CustomerRepository.ts

async deleteCustomer(
  customerId: string,
  companyId: string,
  userId: string  // NEW: Add userId parameter
): Promise<void> {
  // ✅ RBAC: Check user has delete permission
  await RBACMiddleware.requireRole(userId, 'admin');

  // ✅ Multi-tenancy: Filter by company_id
  const { error } = await this.supabase
    .from('customers')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: userId  // Audit trail
    })
    .eq('id', customerId)
    .eq('company_id', companyId);

  if (error) throw new RepositoryError(`Delete failed: ${error.message}`);

  // ✅ Audit: Log deletion
  await this.logAudit({
    customer_id: customerId,
    action: 'delete',
    performed_by: userId,
    changes: { deleted_at: new Date().toISOString() }
  });
}
```

---

### Phase 5: Add Audit Logging (4-5 hours)

**Enhance customer_audit_log**:

```sql
-- Check current schema
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'customer_audit_log';

-- Add missing columns if needed
ALTER TABLE customer_audit_log ADD COLUMN IF NOT EXISTS user_role VARCHAR(50);
ALTER TABLE customer_audit_log ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE customer_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;
```

**Create Audit Trigger**:

```sql
CREATE OR REPLACE FUNCTION audit_customer_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_audit_log (
    customer_id,
    company_id,
    action,
    old_values,
    new_values,
    performed_by,
    performed_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.company_id, OLD.company_id),
    TG_OP,  -- INSERT, UPDATE, DELETE
    row_to_json(OLD),
    row_to_json(NEW),
    auth.uid(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
CREATE TRIGGER customers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION audit_customer_changes();
```

---

### Phase 6: Testing & Validation (8-10 hours)

**Test Cases**:

```typescript
// TEST 1: Multi-tenancy isolation
describe('Customer Multi-Tenancy', () => {
  it('should not allow access to other company customers', async () => {
    const companyA = 'company-a-uuid';
    const companyB = 'company-b-uuid';

    const customerA = await customerRepo.createCustomer({
      company_id: companyA,
      customer_name: 'Customer A'
    });

    // Should fail to access from company B
    await expect(
      customerRepo.getCustomerById(customerA.id, companyB)
    ).rejects.toThrow('not found');
  });
});

// TEST 2: Role-based access
describe('Customer RBAC', () => {
  it('should allow admin to delete', async () => {
    const admin = { id: 'admin-id', is_admin: true };
    await expect(
      customerRepo.deleteCustomer(customerId, companyId, admin.id)
    ).resolves.not.toThrow();
  });

  it('should deny sales user from deleting', async () => {
    const sales = { id: 'sales-id', is_sales: true };
    await expect(
      customerRepo.deleteCustomer(customerId, companyId, sales.id)
    ).rejects.toThrow('required role: admin');
  });
});

// TEST 3: RLS enforcement
describe('RLS Policies', () => {
  it('should block direct Supabase calls across companies', async () => {
    // Simulate malicious direct call
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', 'different-company-id');

    expect(data).toHaveLength(0);  // RLS blocks
  });
});
```

---

## Production Readiness Checklist

### Security Requirements

- [ ] **RLS re-enabled on all customer tables**
- [ ] **RLS policies tested with multiple user roles**
- [ ] **RBAC middleware implemented in CustomerRepository**
- [ ] **RBAC policies created in PostgreSQL**
- [ ] **Audit logging active for all customer operations**
- [ ] **Fuzzy matching reviewed for security (max 1 match)**
- [ ] **Rate limiting on sync operations**
- [ ] **Input validation on all user inputs**
- [ ] **SQL injection testing completed**
- [ ] **XSS testing completed**
- [ ] **CSRF tokens implemented**

### Compliance Requirements

- [ ] **GDPR audit trail for deletions**
- [ ] **SOC2 access logging**
- [ ] **Data retention policies enforced**
- [ ] **Customer data export functionality**
- [ ] **Right to be forgotten (hard delete) process**
- [ ] **Consent tracking for data processing**

### Testing Requirements

- [ ] **Unit tests: 100+ customer repository tests**
- [ ] **Integration tests: RLS + RBAC scenarios**
- [ ] **E2E tests: Full customer lifecycle**
- [ ] **Security tests: Penetration testing**
- [ ] **Performance tests: 10k+ customers, sync operations**
- [ ] **Load tests: Concurrent users, bulk operations**

### Monitoring Requirements

- [ ] **Alert on failed RLS checks**
- [ ] **Alert on unauthorized access attempts**
- [ ] **Dashboard for customer operations metrics**
- [ ] **Audit log monitoring and retention**
- [ ] **Error tracking for repository failures**

---

## Timeline Estimate

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Audit RLS Policies | 1-2 hours | 🔴 Critical |
| Phase 2: Fix Materialized Views | 2-3 hours | 🔴 Critical |
| Phase 3: Re-Enable RLS | 3-4 hours | 🔴 Critical |
| Phase 4: Implement RBAC | 6-8 hours | 🔴 Critical |
| Phase 5: Add Audit Logging | 4-5 hours | 🟡 High |
| Phase 6: Testing & Validation | 8-10 hours | 🔴 Critical |
| **TOTAL** | **24-32 hours** | **~1 week** |

---

## Immediate Action Items

### Before Next Development Session:
1. ⚠️  **DO NOT** make any schema changes to customer tables without documenting impact on RLS
2. ⚠️  **DO NOT** expose customer data in public APIs
3. ⚠️  **DO** ensure all new repository methods include `company_id` filter
4. ⚠️  **DO** add RBAC checks to new CustomerSyncPanel operations

### Before Staging Deployment:
1. ✅ Complete Phase 1-3 (Audit + Re-enable RLS)
2. ✅ Test with multiple companies and user roles
3. ✅ Verify no data leakage between companies

### Before Production Deployment:
1. ✅ Complete all 6 phases
2. ✅ Pass security audit
3. ✅ Complete penetration testing
4. ✅ Document all RLS policies and RBAC rules
5. ✅ Train team on security best practices

---

## Questions & Clarifications Needed

1. **User Role Strategy**: Should we use the existing boolean flags (`is_admin`, `is_owner`, etc.) or migrate to a single `role` enum field?

2. **Super Admin Cross-Company Access**: Should `is_super_admin` be able to see ALL companies' customers for support purposes? If yes, need separate policy.

3. **Field Tech Permissions**: Can field techs create customers during site visits, or should they be read-only?

4. **Audit Retention**: How long should we keep audit logs? (GDPR default: 90 days, SOC2 typically 1 year)

5. **Hard Delete Process**: Should there be a "right to be forgotten" process for GDPR? If yes, need admin-only hard delete with approval workflow.

---

## Conclusion

**Current State**: Customer system security relies entirely on application-layer filtering through CustomerRepository. RLS is disabled, creating a **single point of failure**.

**Risk Level**: 🔴 **HIGH** - Suitable for development only. **NOT production-ready**.

**Next Steps**: Follow the 6-phase re-enablement plan to restore defense-in-depth security before production deployment.

**Estimated Effort**: 1 week (24-32 hours) for full security hardening.

---

**Document Author**: Claude (AI Assistant)
**Review Status**: Awaiting Human Review
**Next Review Date**: Before production deployment
**Classification**: INTERNAL - Security Documentation
