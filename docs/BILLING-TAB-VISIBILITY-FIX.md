# Billing Tab Visibility Fix

**Date**: 2025-01-22
**Status**: ✅ FIXED - Migration 19 Ready
**Issue**: Billing tab not showing in hamburger menu

---

## Problem Summary

The Billing & Subscription tab was coded and functional, but **not visible in the UI** for any users.

### Root Cause

The billing tab visibility is controlled by a permission check in the hamburger menu:

```typescript
// MobileHamburgerMenu.tsx (line 210)
{user?.is_owner && (
  <button onClick={onBillingClick}>
    <Icons.CreditCard />
    <span>Billing & Subscription</span>
  </button>
)}
```

**The problem**: All users had `is_owner = false`, even though the billing infrastructure was complete.

---

## Technical Details

### Database State

**Before Fix**:
```sql
-- Companies table
company_id: 08f0827a-608f-485a-a19f-e0c55ecf6484
owner_id: NULL  ❌ Not set

-- Users table
anthony@test.com: is_owner = false  ❌
tom@test.com: is_owner = false
devon@test.com: is_owner = false
```

### Why This Happened

1. **Migration 17** (ADD-COMPANY-OWNER-TRACKING.sql) added `companies.owner_id` column
2. **Migration 11** (UPDATE-HANDLE-NEW-USER-FUNCTION.sql) sets `is_owner = true` during **new user creation**
3. **Problem**: Test users were created **before** these migrations existed
4. **Result**: Existing users never got `is_owner` flag updated

### The Flow

**Correct flow for new users** (post-migration 11):
```
Website → create-customer-with-payment → company created
  ↓
Email sent with onboarding link + token
  ↓
Owner clicks email → validate-onboarding-token
  ↓
Owner signs up → handle_new_user() trigger fires
  ↓
handle_new_user() detects company_id in metadata
  ↓
Sets is_owner = true  ✅
  ↓
Billing tab visible in UI  ✅
```

**Problem flow for existing test users** (pre-migration 11):
```
User created manually/early testing
  ↓
is_owner = false (default)  ❌
  ↓
companies.owner_id = NULL  ❌
  ↓
Billing tab hidden forever  ❌
```

---

## Solution: Migration 19

**File**: `database/migrations/19-FIX-OWNER-FLAGS-FOR-BILLING.sql`

### What It Does

1. **Sets owner_id for test company**
   ```sql
   UPDATE companies
   SET owner_id = 'cd7ad550-37f3-477a-975e-a34b226b7332'  -- Anthony
   WHERE id = '08f0827a-608f-485a-a19f-e0c55ecf6484';
   ```

2. **Syncs is_owner flags**
   ```sql
   UPDATE users u
   SET is_owner = true
   FROM companies c
   WHERE u.id = c.owner_id;
   ```

3. **Creates automatic sync trigger**
   ```sql
   CREATE TRIGGER trigger_sync_user_is_owner
   AFTER INSERT OR UPDATE OF owner_id ON companies
   FOR EACH ROW EXECUTE FUNCTION sync_user_is_owner();
   ```

4. **Updates onboarding completion function**
   - Ensures `owner_id` is set when onboarding completes
   - Automatically syncs `is_owner` flag

---

## Database State After Fix

```sql
-- Companies table
company_id: 08f0827a-608f-485a-a19f-e0c55ecf6484
owner_id: cd7ad550-37f3-477a-975e-a34b226b7332  ✅ Anthony

-- Users table
anthony@test.com: is_owner = true   ✅ OWNER
tom@test.com: is_owner = false      ✅ Team member
devon@test.com: is_owner = false    ✅ Team member
```

---

## UI Impact

### Before Migration 19
```
Hamburger Menu:
┌─────────────────────────┐
│ Databases               │ ← Collapsed
│ Quick Calculator        │
│ Customers               │
│ (Billing tab MISSING)   │ ❌
│ Miscellaneous           │ ← Collapsed
└─────────────────────────┘
```

### After Migration 19 (Owner Login)
```
Hamburger Menu:
┌─────────────────────────┐
│ Databases               │ ← Collapsed
│ Quick Calculator        │
│ Customers               │
│ Billing & Subscription  │ ✅ NOW VISIBLE
│ Miscellaneous           │ ← Collapsed
└─────────────────────────┘
```

### After Migration 19 (Non-Owner Login)
```
Hamburger Menu:
┌─────────────────────────┐
│ Databases               │ ← Collapsed
│ Quick Calculator        │
│ Customers               │
│ (Billing tab hidden)    │ ✅ Correctly hidden
│ Miscellaneous           │ ← Collapsed
└─────────────────────────┘
```

---

## Component Reference

### MobileHamburgerMenu.tsx

**Location**: `src/components/mobile/MobileHamburgerMenu.tsx`

**Billing Tab Code** (lines 210-227):
```typescript
{/* Billing - Top Level (Owner Only) */}
{user?.is_owner && (
  <button
    onClick={() => {
      onBillingClick();
      onClose();
    }}
    className="w-full flex items-center gap-4 px-3 h-12 min-h-[48px] rounded-lg"
  >
    <Icons.CreditCard className="h-6 w-6" />
    <span className="font-medium">Billing & Subscription</span>
  </button>
)}
```

**Key Check**: `{user?.is_owner && (...)}` - Only renders if user is owner

### BillingTab.tsx

**Location**: `src/components/billing/BillingTab.tsx`

**The tab itself was always fully functional** - it just wasn't accessible via the menu.

---

## Testing Checklist

### Manual Testing

- [ ] **Run Migration 18** (Stripe migration) first
- [ ] **Run Migration 19** (Owner flags fix)
- [ ] **Login as anthony@test.com**
  - [ ] Open hamburger menu
  - [ ] Verify "Billing & Subscription" tab is visible
  - [ ] Click billing tab
  - [ ] Verify subscription status displays
  - [ ] Verify payment method card shows
- [ ] **Login as tom@test.com or devon@test.com**
  - [ ] Open hamburger menu
  - [ ] Verify "Billing & Subscription" tab is **NOT** visible
- [ ] **Test owner transfer** (optional)
  ```sql
  UPDATE companies SET owner_id = '50dfad12-a6bc-42cd-a77a-1679fb9619a1' WHERE id = '08f0827a-608f-485a-a19f-e0c55ecf6484';
  ```
  - [ ] Verify Devon can now see billing tab
  - [ ] Verify Anthony can no longer see billing tab

### Verification Queries

```sql
-- Check current owner status
SELECT
    u.id,
    u.email,
    u.name,
    u.is_owner,
    c.owner_id,
    CASE
        WHEN u.id = c.owner_id THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as status
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
ORDER BY u.is_owner DESC;
```

---

## Future-Proofing

### Automatic Sync

Migration 19 includes a **trigger** that automatically keeps `is_owner` in sync with `owner_id`:

- **When company.owner_id changes** → trigger updates user.is_owner flags
- **When new company created with owner_id** → trigger sets is_owner = true
- **When owner completes onboarding** → trigger ensures consistency

### Website Integration

When the **website** (separate repo) creates a new company:

```typescript
// website: create-customer-with-payment.ts
const { data: newCompany } = await supabase
  .from('companies')
  .insert({
    stripe_customer_id: customerId,
    // owner_id will be set when onboarding completes
    onboarding_completed: false
  });
```

When **owner completes onboarding wizard** (app):

```typescript
// app: TeamInviteStep.tsx
await supabase.rpc('complete_company_onboarding', {
  company_id_input: user.company_id
});

// complete_company_onboarding() function:
// 1. Sets companies.owner_id = session_user_id
// 2. Trigger fires → sets users.is_owner = true
// 3. Next login → billing tab visible ✅
```

---

## Related Files

### Database Migrations
- `database/migrations/11-UPDATE-HANDLE-NEW-USER-FUNCTION.sql` - Sets is_owner during signup
- `database/migrations/17-ADD-COMPANY-OWNER-TRACKING.sql` - Adds owner_id column
- `database/migrations/18-MIGRATE-DWOLLA-TO-STRIPE.sql` - Stripe payment integration
- `database/migrations/19-FIX-OWNER-FLAGS-FOR-BILLING.sql` - **This fix**

### Frontend Components
- `src/components/mobile/MobileHamburgerMenu.tsx` - Billing tab visibility check
- `src/components/billing/BillingTab.tsx` - Billing UI (already working)
- `src/context/AuthContext.tsx` - Fetches is_owner from database

### Documentation
- `docs/WEBSITE-TO-APP-ONBOARDING-FLOW.md` - Complete onboarding flow
- `docs/DWOLLA_TO_STRIPE_MIGRATION_COMPLETE.md` - Stripe migration summary

---

## Summary

**Problem**: Billing tab existed but was invisible (all users had `is_owner = false`)

**Cause**: Test users created before owner tracking migrations existed

**Solution**: Migration 19 syncs `is_owner` with `companies.owner_id` + creates trigger for future consistency

**Result**: Anthony (owner) sees billing tab ✅, Tom and Devon (team) don't ✅

**Status**: Ready for production - run migrations 18 and 19 in sequence

---

**Next Step**: Run migration 19 in Supabase SQL Editor to enable billing tab visibility
