# Website-to-App Onboarding Flow (Stripe Integration)

**Date**: 2025-01-22
**Status**: ✅ COMPLETE - Stripe Migration
**Previous Version**: Dwolla (deprecated)

---

## Architecture Overview

TradeSphere uses a **two-application architecture**:

1. **Website** (Marketing Site - Separate Repo)
   - Public marketing pages
   - Owner signup with payment
   - Sends onboarding email to app

2. **App** (This Repo - `tradesphere-no-code-migration`)
   - Onboarding wizard
   - Team invitations
   - Billing management
   - Organization settings
   - Core pricing calculator

**Key Point**: The website handles **payment + company creation**, then hands off to the app for **onboarding wizard completion**.

---

## Complete Onboarding Flow

### Step 1-5: Website (Marketing Site)

**Location**: Separate React repo (website)

#### Step 1: Owner Visits Website
```
URL: https://tradesphere.com
```

#### Step 2: Owner Fills Registration Form
```typescript
Form Fields:
- Company Name
- Owner Email
- Owner Password (optional - can be set later)
- Payment Method (Stripe.js + Plaid integration)
```

#### Step 3: Website Calls create-customer-with-payment Function
```typescript
// POST /.netlify/functions/create-customer-with-payment
{
  email: "owner@company.com",
  companyName: "Acme Landscaping",
  paymentMethodId: "pm_xxxxx"  // From Stripe.js + Plaid
}
```

**What happens in this function**:
1. Creates Stripe customer (`cus_xxxxx`)
2. Attaches payment method from Plaid (`pm_xxxxx`)
3. Verifies bank account (instant with Plaid)
4. Creates company in Supabase database:
   ```sql
   INSERT INTO companies (
     name,
     email,
     stripe_customer_id,
     stripe_payment_method_id,
     payment_method_status,
     subscription_status,
     trial_end_date,
     onboarding_token,
     onboarding_completed
   ) VALUES (
     'Acme Landscaping',
     'owner@company.com',
     'cus_xxxxx',
     'pm_xxxxx',
     'verified',
     'trial',
     NOW() + INTERVAL '14 days',
     'unique-token-123',
     false  -- KEY: Triggers onboarding wizard in app
   );
   ```
5. Generates unique `onboarding_token`
6. Calls `send-onboarding-email` function

#### Step 4: Website Sends Onboarding Email
```typescript
Email Template:
Subject: "Welcome to TradeSphere - Complete Your Setup"

Body:
Hi [Owner Name],

Your TradeSphere account is ready!

Click here to complete your setup and invite your team:
https://app.tradesphere.com/onboarding?token=unique-token-123

Your 14-day free trial has started. You won't be charged until [trial_end_date].

Questions? Reply to this email.

- The TradeSphere Team
```

#### Step 5: Website Shows Success Message
```
"Check your email to complete your setup!"
```

---

### Step 6-9: App (This Repo)

**Location**: `tradesphere-no-code-migration` (this repo)

#### Step 6: Owner Clicks Email Link

**URL**: `https://app.tradesphere.com/onboarding?token=unique-token-123`

**App Detection** (App.tsx lines 72-77):
```typescript
const urlParams = new URLSearchParams(window.location.search);
const hasOnboardingToken = urlParams.has('token') && window.location.pathname === '/onboarding';

if (hasOnboardingToken) {
  setAppState('onboarding_landing');  // Show OnboardingLanding.tsx
}
```

#### Step 7: App Validates Token

**Component**: `OnboardingLanding.tsx`

**Process**:
1. Extract token from URL: `new URLSearchParams(window.location.search).get('token')`
2. Call validation API:
   ```typescript
   POST /.netlify/functions/validate-onboarding-token
   {
     token: "unique-token-123"
   }
   ```
3. Function validates token in database:
   ```sql
   SELECT * FROM validate_onboarding_token('unique-token-123');
   -- Returns: user_id, user_email, company_id, company_name
   ```
4. Marks token as used:
   ```sql
   UPDATE companies SET onboarding_token_used = true WHERE onboarding_token = 'unique-token-123';
   ```
5. Creates Supabase auth magic link
6. Auto-authenticates owner
7. Redirects to onboarding wizard

#### Step 8: App Shows Onboarding Wizard

**Component**: `OnboardingWizard.tsx`

**Detection Logic** (App.tsx lines 116-143):
```typescript
const checkOnboardingStatus = async (companyId: string) => {
  const { data } = await supabase
    .from('companies')
    .select('onboarding_completed')
    .eq('id', companyId)
    .single();

  const completed = data?.onboarding_completed ?? true;

  if (completed) {
    setAppState('authenticated');  // Go to dashboard
  } else {
    setAppState('onboarding_wizard');  // Show wizard
  }
};
```

**Wizard Steps**:
1. **Welcome Step**: Introduction and overview
2. **AI Personality Step**: Configure pricing assistant tone
3. **Branding Step**: Upload logo, set colors
4. **Team Invites Step**: Optional team member invitations

#### Step 9: Owner Completes Onboarding

**Final Step** (TeamInviteStep.tsx):
```typescript
const completeOnboarding = async () => {
  // Mark onboarding as completed
  await supabase
    .from('companies')
    .update({ onboarding_completed: true })
    .eq('id', user.company_id);

  // Redirect to dashboard
  window.location.reload();
};
```

**App Detection** (App.tsx):
```typescript
// Next time user logs in:
if (onboarding_completed === true) {
  setAppState('authenticated');  // Show ChatInterface (dashboard)
}
```

---

## Key Database Fields

### companies table

**Critical Fields for Onboarding Detection**:

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,

  -- Stripe Payment Fields (NEW)
  stripe_customer_id TEXT,           -- cus_xxxxx
  stripe_payment_method_id TEXT,     -- pm_xxxxx (Plaid bank account)
  stripe_setup_intent_id TEXT,       -- seti_xxxxx
  payment_method_status TEXT,        -- 'verified' with Plaid
  payment_method_verified_at TIMESTAMP,

  -- Subscription Fields
  subscription_status VARCHAR DEFAULT 'trial',  -- trial, active, past_due, canceled
  subscription_tier VARCHAR DEFAULT 'basic',
  trial_end_date DATE DEFAULT (NOW() + INTERVAL '14 days'),

  -- Onboarding Fields (CRITICAL)
  onboarding_token TEXT UNIQUE,                 -- One-time token from website
  onboarding_token_used BOOLEAN DEFAULT false,  -- Prevents reuse
  onboarding_completed BOOLEAN DEFAULT false,   -- Triggers wizard on first login

  created_at TIMESTAMP DEFAULT NOW()
);
```

**Onboarding Flow Diagram**:

```
┌────────────────────────────────────────────────────────────────┐
│ WEBSITE: create-customer-with-payment.ts                      │
├────────────────────────────────────────────────────────────────┤
│ 1. Creates Stripe customer                                     │
│ 2. INSERT INTO companies (                                     │
│      onboarding_token = 'ABC123',                              │
│      onboarding_completed = false   ← Triggers wizard          │
│    )                                                            │
│ 3. Sends email with token                                      │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ APP: OnboardingLanding.tsx                                     │
├────────────────────────────────────────────────────────────────┤
│ 1. Extracts token from URL (?token=ABC123)                    │
│ 2. Validates token via API                                     │
│ 3. Auto-authenticates owner                                    │
│ 4. Reloads app                                                 │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ APP: App.tsx - checkOnboardingStatus()                        │
├────────────────────────────────────────────────────────────────┤
│ SELECT onboarding_completed FROM companies WHERE id = ?       │
│                                                                 │
│ IF onboarding_completed = false:                              │
│   → Show OnboardingWizard                                      │
│ ELSE:                                                          │
│   → Show ChatInterface (dashboard)                             │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ APP: OnboardingWizard → TeamInviteStep                        │
├────────────────────────────────────────────────────────────────┤
│ 1. Owner completes wizard steps                                │
│ 2. UPDATE companies SET onboarding_completed = true           │
│ 3. Reloads app → Shows dashboard                              │
└────────────────────────────────────────────────────────────────┘
```

---

## Stripe Payment Flow

### Payment Method Creation (Website Side)

**Using Stripe.js + Plaid**:

```typescript
// Website frontend (React)
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Create payment method via Plaid (instant bank verification)
const { paymentMethod, error } = await stripe.createPaymentMethod({
  type: 'us_bank_account',
  us_bank_account: {
    // Plaid provides these after instant verification
    account_holder_type: 'company',
    routing_number: '110000000',
    account_number: '000123456789'
  },
  billing_details: {
    name: companyName,
    email: ownerEmail
  }
});

// Send to backend
fetch('/.netlify/functions/create-customer-with-payment', {
  method: 'POST',
  body: JSON.stringify({
    email: ownerEmail,
    companyName: companyName,
    paymentMethodId: paymentMethod.id  // pm_xxxxx
  })
});
```

### Backend Processing (create-customer-with-payment.ts)

```typescript
// 1. Create Stripe customer
const customer = await stripe.customers.create({
  email: body.email,
  name: body.companyName
});

// 2. Attach payment method
await stripe.paymentMethods.attach(body.paymentMethodId, {
  customer: customer.id
});

// 3. Set as default
await stripe.customers.update(customer.id, {
  invoice_settings: {
    default_payment_method: body.paymentMethodId
  }
});

// 4. Create SetupIntent for future charges
const setupIntent = await stripe.setupIntents.create({
  customer: customer.id,
  payment_method: body.paymentMethodId,
  confirm: true,
  usage: 'off_session'  // Allow charging when customer is offline
});

// 5. Save to database
await supabase.from('companies').insert({
  stripe_customer_id: customer.id,
  stripe_payment_method_id: body.paymentMethodId,
  stripe_setup_intent_id: setupIntent.id
});
```

---

## Critical Checks for Stripe Migration

### ✅ All Systems Go - No Changes Needed

The onboarding flow is **payment-agnostic** on the app side. The app only cares about:

1. **onboarding_token**: Generated by website, validated by app
2. **onboarding_completed**: Boolean flag to trigger wizard
3. **company_id**: Links owner to company

**The app never touches Stripe directly during onboarding.**

### Database Migration Already Complete

Migration 18 updated all Stripe fields:
- ✅ `dwolla_customer_url` → `stripe_customer_id`
- ✅ `dwolla_funding_source_id` → `stripe_payment_method_id`
- ✅ Added `stripe_setup_intent_id`

### Netlify Functions Already Updated

- ✅ `create-customer-with-payment.ts` - Uses Stripe
- ✅ `validate-onboarding-token.ts` - Payment-agnostic
- ✅ `send-onboarding-email.ts` - Payment-agnostic

---

## Testing Checklist

### Website-Side Testing (Separate Repo)

- [ ] Stripe.js + Plaid integration working
- [ ] `create-customer-with-payment` function creates customer
- [ ] Email sent with correct app URL
- [ ] Token generated and stored in database

### App-Side Testing (This Repo)

- [ ] App detects `?token=` in URL
- [ ] `validate-onboarding-token` function validates token
- [ ] Auto-authentication works via magic link
- [ ] App.tsx detects `onboarding_completed = false`
- [ ] OnboardingWizard displays correctly
- [ ] Completing wizard sets `onboarding_completed = true`
- [ ] Next login goes straight to dashboard

### End-to-End Flow

```bash
# 1. Website: Create customer
curl -X POST https://tradesphere.com/.netlify/functions/create-customer-with-payment \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "companyName": "Test Co",
    "paymentMethodId": "pm_test_bank_account"
  }'

# 2. Check database
SELECT onboarding_token, onboarding_completed FROM companies WHERE email = 'test@example.com';
# Expected: token = 'some-uuid', onboarding_completed = false

# 3. Visit app with token
# https://app.tradesphere.com/onboarding?token=<token>

# 4. Complete wizard steps

# 5. Check database again
SELECT onboarding_completed FROM companies WHERE email = 'test@example.com';
# Expected: onboarding_completed = true

# 6. Reload app
# Expected: Goes straight to dashboard (ChatInterface)
```

---

## Environment Variables Required

### Website (.env)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_PUBLIC_URL=https://tradesphere.com
VITE_APP_URL=https://app.tradesphere.com  # For onboarding link in email
```

### App (.env)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Netlify Functions (.env)
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Admin key for user creation
VITE_PUBLIC_URL=https://tradesphere.com
VITE_APP_URL=https://app.tradesphere.com
```

---

## Summary

### What Website Does
1. Collect payment via Stripe + Plaid
2. Create company with `onboarding_completed = false`
3. Send email with onboarding link

### What App Does
1. Validate onboarding token
2. Auto-authenticate owner
3. Check `onboarding_completed` flag
4. Show wizard if false, dashboard if true
5. Mark as completed when wizard finishes

### Key Insight
**The onboarding flow is payment-agnostic on the app side.** Stripe integration only affects the website payment collection. The app's onboarding detection logic remains unchanged from the Dwolla days.

The only change needed was the database migration (already complete) to rename Dwolla columns to Stripe columns. The app-side logic is **payment-provider independent**.

---

**Status**: ✅ COMPLETE - No further changes needed for Stripe onboarding flow
