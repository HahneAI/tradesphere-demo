# Stripe ACH Payment Service - Implementation Guide

**File**: `src/services/StripeService.ts`

## Overview

Production-ready Stripe service for ACH payments with Plaid instant verification. This service replaces the existing DwollaService.ts and provides the same architectural patterns while leveraging Stripe's advantages:

- **No SSN Required**: Unlike Dwolla, Stripe doesn't require SSN for receiving payments
- **Instant Verification**: Plaid integration eliminates 1-3 day micro-deposit delays
- **Lower Fees**: 0.8% capped at $5 per transaction (vs Dwolla's variable fees)
- **Unified Platform**: Single provider for ACH + cards (if needed later)

## Architecture Pattern

The service follows the exact same singleton pattern as DwollaService:

```typescript
// Singleton pattern with private constructor
private constructor() {
  // Environment variable validation
  // Stripe SDK initialization
}

// Get singleton instance
public static getInstance(): StripeService;

// Server-side only (Netlify functions, never browser)
```

## Core Functionality

### 1. Customer Management

```typescript
// Create customer during onboarding
const { data } = await stripe.createCustomer({
  email: 'owner@company.com',
  companyName: 'ABC Landscaping',
  metadata: {
    company_id: 'uuid-from-supabase',
    onboarding_date: '2025-01-15'
  }
});
console.log(data.customerId); // cus_xxxxx

// Get customer details
const customer = await stripe.getCustomer('cus_xxxxx');

// Update customer
const updated = await stripe.updateCustomer('cus_xxxxx', {
  email: 'newemail@company.com'
});
```

### 2. Payment Methods (ACH with Plaid)

**IMPORTANT**: Payment methods are created CLIENT-SIDE via Stripe.js + Plaid. The server only attaches them to customers.

**Client-Side Flow** (to be implemented):
```javascript
// 1. User connects bank via Plaid Link
const plaidHandler = Plaid.create({
  token: 'link-public-token',
  onSuccess: async (publicToken, metadata) => {
    // 2. Exchange Plaid token for Stripe token
    const { stripe_bank_account_token } = await fetch('/api/create-stripe-token', {
      method: 'POST',
      body: JSON.stringify({ publicToken })
    }).then(r => r.json());

    // 3. Create payment method with Stripe.js
    const { paymentMethod } = await stripe.createPaymentMethod({
      type: 'us_bank_account',
      us_bank_account: {
        account_holder_type: 'company',
        financial_connections_account: stripe_bank_account_token
      }
    });

    // 4. Send to server to attach to customer
    await fetch('/api/attach-payment-method', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'cus_xxxxx',
        paymentMethodId: paymentMethod.id
      })
    });
  }
});
```

**Server-Side Methods**:
```typescript
// Attach payment method to customer
const { data } = await stripe.attachPaymentMethod(
  'cus_xxxxx',
  'pm_xxxxx'  // Created client-side
);

// Set as default payment method
const customer = await stripe.setDefaultPaymentMethod(
  'cus_xxxxx',
  'pm_xxxxx'
);

// List all payment methods
const paymentMethods = await stripe.listPaymentMethods('cus_xxxxx');

// Get single payment method
const pm = await stripe.getPaymentMethod('pm_xxxxx');

// Remove payment method
const { data } = await stripe.detachPaymentMethod('pm_xxxxx');
```

### 3. Payments (PaymentIntents)

**ACH Processing Time**: 4 business days (same as Dwolla)

```typescript
// Create monthly subscription payment
const { data } = await stripe.createPaymentIntent({
  customerId: 'cus_xxxxx',
  amount: 200000,  // $2000.00 in cents
  paymentMethodId: 'pm_xxxxx',
  metadata: {
    company_id: 'uuid',
    billing_period: '2025-01-01',
    invoice_id: 'INV-12345'
  }
});

// Check payment status
const pi = await stripe.getPaymentIntent('pi_xxxxx');
console.log(pi.status); // 'processing', 'succeeded', 'failed'

// Cancel pending payment
const cancelled = await stripe.cancelPaymentIntent('pi_xxxxx');

// Get payment history
const payments = await stripe.listPaymentIntents('cus_xxxxx', 10);
```

### 4. Instant Verification (Plaid)

With Plaid, bank accounts are verified **instantly** when created. No micro-deposits needed.

```typescript
// Check verification status
const { data } = await stripe.verifyBankAccount('pm_xxxxx');
console.log(data.verified); // true (instant with Plaid)
console.log(data.status);   // 'verified'
```

### 5. Webhook Signature Verification

**CRITICAL**: Always verify webhook signatures to prevent spoofing attacks.

```typescript
// In Netlify function webhook handler:
export const handler = async (event) => {
  try {
    const stripeEvent = StripeService.verifyWebhookSignature(
      event.body,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Process verified event
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = stripeEvent.data.object;
        // Update database: mark payment as succeeded
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = stripeEvent.data.object;
        // Update database: mark payment as failed
        // Notify customer
        break;

      case 'payment_method.attached':
        const paymentMethod = stripeEvent.data.object;
        // Update database: payment method added
        break;

      case 'payment_method.detached':
        const detachedPM = stripeEvent.data.object;
        // Update database: payment method removed
        break;
    }

    return { statusCode: 200 };
  } catch (err) {
    // Invalid signature - reject webhook
    console.error('Invalid webhook signature:', err);
    return { statusCode: 400 };
  }
};
```

### 6. Utility Methods

```typescript
// Convert dollars to cents for Stripe API
const cents = StripeService.formatAmount(2000.50);
console.log(cents); // 200050

// Convert cents to dollars from Stripe response
const dollars = StripeService.parseAmount(200050);
console.log(dollars); // 2000.50
```

## Error Handling

All methods return standardized `StripeResponse<T>` format:

```typescript
interface StripeResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    type?: string;
    declineCode?: string;
  };
}
```

**Example Error Handling**:
```typescript
const result = await stripe.createPaymentIntent({
  customerId: 'cus_xxxxx',
  amount: 200000,
  paymentMethodId: 'pm_xxxxx'
});

if (!result.success) {
  console.error('Payment failed:', result.error.message);

  // Handle specific errors
  if (result.error.code === 'insufficient_funds') {
    // Show user-friendly message
    alert('Insufficient funds. Please use a different bank account.');
  } else if (result.error.code === 'account_invalid') {
    alert('Bank account is invalid. Please verify account details.');
  }
}
```

## Environment Variables Required

Add these to your `.env` file and Netlify environment:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxx  # Use sk_live_xxxxx for production
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx  # For client-side Stripe.js

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From Stripe Dashboard > Webhooks
```

## Migration from Dwolla

| Dwolla Method | Stripe Equivalent | Notes |
|---------------|-------------------|-------|
| `createCustomer()` | `createCustomer()` | Same pattern, different params |
| `createFundingSource()` | `attachPaymentMethod()` | Client-side creation + server attach |
| `initiateMicroDeposits()` | N/A | Not needed with Plaid |
| `verifyMicroDeposits()` | `verifyBankAccount()` | Instant verification |
| `createTransfer()` | `createPaymentIntent()` | PaymentIntents vs Transfers |
| `getTransfer()` | `getPaymentIntent()` | Status checking |
| `cancelTransfer()` | `cancelPaymentIntent()` | Same functionality |
| `getFundingSources()` | `listPaymentMethods()` | List bank accounts |
| `removeFundingSource()` | `detachPaymentMethod()` | Remove bank account |

## Webhook Events to Handle

Critical events for subscription billing:

1. **payment_intent.succeeded** - Payment completed successfully
2. **payment_intent.payment_failed** - Payment failed (insufficient funds, etc.)
3. **payment_intent.processing** - Payment is being processed (4 days for ACH)
4. **payment_method.attached** - Bank account added to customer
5. **payment_method.detached** - Bank account removed from customer
6. **customer.updated** - Customer details changed

## Security Best Practices

1. **Server-Side Only**: Never use this service in browser code
2. **Environment Variables**: Store all secrets in Netlify environment
3. **Webhook Verification**: Always verify webhook signatures
4. **Error Logging**: Log errors for debugging but never log card/bank data
5. **Metadata**: Use metadata for tracking (company_id, invoice_id) but never store sensitive data

## Testing

### Test Mode Credentials
Use Stripe test mode keys for development:
- **Secret Key**: `sk_test_xxxxx`
- **Publishable Key**: `pk_test_xxxxx`

### Test Bank Accounts (Plaid)
Plaid provides test credentials for Sandbox mode:
- **Username**: `user_good`
- **Password**: `pass_good`
- **Bank**: Any test bank in Plaid Link

### Test Scenarios

```typescript
// 1. Successful payment
const success = await stripe.createPaymentIntent({
  customerId: 'cus_test_xxxxx',
  amount: 100000, // $1000.00
  paymentMethodId: 'pm_test_xxxxx'
});
// Expect: { success: true, data: { status: 'processing' } }

// 2. Insufficient funds (use test decline code)
// Stripe will simulate this in test mode
// Expect: { success: false, error: { code: 'insufficient_funds' } }

// 3. Invalid customer
const invalid = await stripe.getCustomer('cus_invalid');
// Expect: Error thrown
```

## Production Checklist

Before going live:

- [ ] Replace test keys with production keys (`sk_live_xxxxx`)
- [ ] Configure production webhook endpoint
- [ ] Verify webhook signature validation works
- [ ] Test with real bank account (your own)
- [ ] Monitor first few transactions closely
- [ ] Set up error alerting (Sentry, etc.)
- [ ] Document ACH processing timeline for customers (4 days)
- [ ] Prepare customer support scripts for payment failures

## Next Steps

1. **Create Netlify Functions** for:
   - Customer creation (`/api/create-customer`)
   - Payment method attachment (`/api/attach-payment-method`)
   - Payment creation (`/api/create-payment`)
   - Webhook handler (`/api/stripe-webhook`)

2. **Update Supabase Schema**:
   - Add `stripe_customer_id` to `companies` table
   - Add `stripe_payment_method_id` to `companies` table
   - Create `payments` table with Stripe references

3. **Build Client-Side Integration**:
   - Stripe.js initialization
   - Plaid Link integration
   - Payment method creation UI

4. **Implement Webhook Processing**:
   - Event handler for payment status updates
   - Database updates on payment success/failure
   - Customer notifications

## Support Resources

- **Stripe ACH Docs**: https://stripe.com/docs/payments/ach-debit
- **Plaid Integration**: https://stripe.com/docs/financial-connections
- **Webhook Events**: https://stripe.com/docs/webhooks
- **Testing Guide**: https://stripe.com/docs/testing
