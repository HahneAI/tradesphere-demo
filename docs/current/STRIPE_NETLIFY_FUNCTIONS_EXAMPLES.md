# Stripe Service - Netlify Functions Examples

Complete examples of Netlify functions using the StripeService.ts for ACH payment processing.

## File Structure

```
netlify/functions/
├── stripe-create-customer.ts       # Create Stripe customer during onboarding
├── stripe-attach-payment-method.ts # Attach bank account to customer
├── stripe-create-payment.ts        # Create monthly subscription payment
├── stripe-webhook.ts               # Handle Stripe webhook events
└── stripe-get-customer-info.ts     # Get customer & payment method details
```

## 1. Create Customer Function

**File**: `netlify/functions/stripe-create-customer.ts`

```typescript
import { Handler } from '@netlify/functions';
import { stripe } from '../../src/services/StripeService';
import { createClient } from '@supabase/supabase-js';

/**
 * Create Stripe customer during company onboarding
 *
 * Called from website after company creates account in Supabase.
 */
export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Parse request
    const { email, companyName, companyId } = JSON.parse(event.body || '{}');

    if (!email || !companyName || !companyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: email, companyName, companyId'
        })
      };
    }

    // Create Stripe customer
    const result = await stripe.createCustomer({
      email,
      companyName,
      metadata: {
        company_id: companyId,
        source: 'tradesphere_onboarding',
        created_at: new Date().toISOString()
      }
    });

    if (!result.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: result.error?.message || 'Failed to create customer'
        })
      };
    }

    // Update Supabase company record with Stripe customer ID
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
      .from('companies')
      .update({
        stripe_customer_id: result.data!.customerId,
        payment_provider: 'stripe',
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        customerId: result.data!.customerId
      })
    };
  } catch (error: any) {
    console.error('Error creating Stripe customer:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
};
```

## 2. Attach Payment Method Function

**File**: `netlify/functions/stripe-attach-payment-method.ts`

```typescript
import { Handler } from '@netlify/functions';
import { stripe } from '../../src/services/StripeService';
import { createClient } from '@supabase/supabase-js';

/**
 * Attach payment method (bank account) to customer
 *
 * Called from app after user creates payment method via Stripe.js + Plaid.
 */
export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Verify user authentication (Supabase JWT)
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Parse request
    const { paymentMethodId, companyId } = JSON.parse(event.body || '{}');

    if (!paymentMethodId || !companyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: paymentMethodId, companyId'
        })
      };
    }

    // Get company's Stripe customer ID
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company?.stripe_customer_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Company not found or Stripe customer not created'
        })
      };
    }

    // Attach payment method to customer
    const attachResult = await stripe.attachPaymentMethod(
      company.stripe_customer_id,
      paymentMethodId
    );

    if (!attachResult.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: attachResult.error?.message || 'Failed to attach payment method'
        })
      };
    }

    // Set as default payment method
    await stripe.setDefaultPaymentMethod(
      company.stripe_customer_id,
      paymentMethodId
    );

    // Verify bank account status
    const verifyResult = await stripe.verifyBankAccount(paymentMethodId);

    // Update Supabase
    await supabase
      .from('companies')
      .update({
        stripe_payment_method_id: paymentMethodId,
        payment_method_status: verifyResult.data?.verified ? 'verified' : 'pending',
        payment_method_verified_at: verifyResult.data?.verified
          ? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        paymentMethodId,
        verified: verifyResult.data?.verified || false,
        status: verifyResult.data?.status || 'unknown'
      })
    };
  } catch (error: any) {
    console.error('Error attaching payment method:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

## 3. Create Payment Function

**File**: `netlify/functions/stripe-create-payment.ts`

```typescript
import { Handler } from '@netlify/functions';
import { stripe, StripeService } from '../../src/services/StripeService';
import { createClient } from '@supabase/supabase-js';

/**
 * Create monthly subscription payment
 *
 * Called by automated billing cron job or manual payment trigger.
 */
export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Parse request
    const {
      companyId,
      amount, // in dollars (e.g., 2000.00)
      billingPeriodStart,
      billingPeriodEnd,
      invoiceId
    } = JSON.parse(event.body || '{}');

    if (!companyId || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: companyId, amount'
        })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get company payment info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id, stripe_payment_method_id, payment_method_status')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Company not found' })
      };
    }

    if (!company.stripe_customer_id || !company.stripe_payment_method_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Payment method not configured for this company'
        })
      };
    }

    if (company.payment_method_status !== 'verified') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Payment method not verified. Please verify bank account first.'
        })
      };
    }

    // Convert dollars to cents
    const amountInCents = StripeService.formatAmount(amount);

    // Create PaymentIntent
    const paymentResult = await stripe.createPaymentIntent({
      customerId: company.stripe_customer_id,
      amount: amountInCents,
      paymentMethodId: company.stripe_payment_method_id,
      metadata: {
        company_id: companyId,
        billing_period_start: billingPeriodStart || '',
        billing_period_end: billingPeriodEnd || '',
        invoice_id: invoiceId || '',
        payment_type: 'monthly_subscription'
      }
    });

    if (!paymentResult.success) {
      // Log payment failure
      await supabase.from('payments').insert({
        company_id: companyId,
        amount,
        status: 'failed',
        payment_type: 'monthly_subscription',
        failure_code: paymentResult.error?.code,
        failure_message: paymentResult.error?.message,
        subscription_period_start: billingPeriodStart,
        subscription_period_end: billingPeriodEnd
      });

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: paymentResult.error?.message || 'Failed to create payment'
        })
      };
    }

    // Log payment in database
    const { data: payment } = await supabase
      .from('payments')
      .insert({
        company_id: companyId,
        amount,
        status: 'processing', // ACH takes 4 days
        payment_type: 'monthly_subscription',
        stripe_payment_intent_id: paymentResult.data!.paymentIntentId,
        subscription_period_start: billingPeriodStart,
        subscription_period_end: billingPeriodEnd
      })
      .select()
      .single();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        paymentId: payment?.id,
        stripePaymentIntentId: paymentResult.data!.paymentIntentId,
        amount,
        status: paymentResult.data!.status,
        message: 'Payment initiated. ACH payments take 4 business days to process.'
      })
    };
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

## 4. Webhook Handler Function

**File**: `netlify/functions/stripe-webhook.ts`

```typescript
import { Handler } from '@netlify/functions';
import { StripeService } from '../../src/services/StripeService';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

/**
 * Handle Stripe webhook events
 *
 * CRITICAL: This endpoint receives payment status updates from Stripe.
 * Must verify webhook signature to prevent spoofing attacks.
 */
export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    const signature = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.error('Missing webhook signature or secret');
      return { statusCode: 400, headers };
    }

    // Verify webhook signature
    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = StripeService.verifyWebhookSignature(
        event.body || '',
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Invalid webhook signature:', err);
      return { statusCode: 400, headers };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Log webhook event
    await supabase.from('payment_webhooks').insert({
      event_type: stripeEvent.type,
      payload: stripeEvent,
      processed: false
    });

    // Process event based on type
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;

        // Update payment record
        await supabase
          .from('payments')
          .update({
            status: 'succeeded',
            processed_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // Update company billing
        const companyId = paymentIntent.metadata.company_id;
        if (companyId) {
          await supabase
            .from('companies')
            .update({
              payment_failure_count: 0,
              last_successful_payment_at: new Date().toISOString()
            })
            .eq('id', companyId);
        }

        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;

        // Update payment record
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_code: paymentIntent.last_payment_error?.code || 'unknown',
            failure_message: paymentIntent.last_payment_error?.message || 'Payment failed'
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // Update company billing
        const companyId = paymentIntent.metadata.company_id;
        if (companyId) {
          await supabase.rpc('increment_payment_failure_count', {
            company_id_param: companyId
          });
        }

        console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error);
        break;
      }

      case 'payment_intent.processing': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;

        await supabase
          .from('payments')
          .update({
            status: 'processing'
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        console.log('Payment processing:', paymentIntent.id);
        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = stripeEvent.data.object as Stripe.PaymentMethod;

        console.log('Payment method attached:', paymentMethod.id);
        break;
      }

      case 'payment_method.detached': {
        const paymentMethod = stripeEvent.data.object as Stripe.PaymentMethod;

        // Find company and clear payment method
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('stripe_payment_method_id', paymentMethod.id)
          .single();

        if (company) {
          await supabase
            .from('companies')
            .update({
              stripe_payment_method_id: null,
              payment_method_status: 'pending'
            })
            .eq('id', company.id);
        }

        console.log('Payment method detached:', paymentMethod.id);
        break;
      }

      case 'customer.updated': {
        const customer = stripeEvent.data.object as Stripe.Customer;
        console.log('Customer updated:', customer.id);
        break;
      }

      default:
        console.log('Unhandled event type:', stripeEvent.type);
    }

    // Mark webhook as processed
    await supabase
      .from('payment_webhooks')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('payload->id', stripeEvent.id);

    return { statusCode: 200, headers };
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return { statusCode: 500, headers };
  }
};
```

## 5. Get Customer Info Function

**File**: `netlify/functions/stripe-get-customer-info.ts`

```typescript
import { Handler } from '@netlify/functions';
import { stripe, StripeService } from '../../src/services/StripeService';
import { createClient } from '@supabase/supabase-js';

/**
 * Get customer payment information
 *
 * Returns customer details, payment methods, and recent payment history.
 */
export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Get company ID from query params
    const companyId = event.queryStringParameters?.companyId;

    if (!companyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing companyId parameter' })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id, stripe_payment_method_id, payment_method_status')
      .eq('id', companyId)
      .single();

    if (companyError || !company?.stripe_customer_id) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Company not found' })
      };
    }

    // Get Stripe customer
    const customer = await stripe.getCustomer(company.stripe_customer_id);

    // Get payment methods
    const paymentMethods = await stripe.listPaymentMethods(company.stripe_customer_id);

    // Get recent payments (last 10)
    const paymentIntents = await stripe.listPaymentIntents(company.stripe_customer_id, 10);

    // Format payment methods for display
    const formattedPaymentMethods = paymentMethods.map(pm => ({
      id: pm.id,
      bankName: pm.us_bank_account?.bank_name || 'Unknown',
      accountType: pm.us_bank_account?.account_type || 'Unknown',
      last4: pm.us_bank_account?.last4 || 'XXXX',
      isDefault: pm.id === company.stripe_payment_method_id
    }));

    // Format payment history
    const formattedPayments = paymentIntents.map(pi => ({
      id: pi.id,
      amount: StripeService.parseAmount(pi.amount),
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
      description: pi.description || 'Monthly subscription'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name
        },
        paymentMethods: formattedPaymentMethods,
        recentPayments: formattedPayments
      })
    };
  } catch (error: any) {
    console.error('Error getting customer info:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

## Environment Variables

Add these to your `.env` file and Netlify environment:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx  # sk_live_xxxxx for production
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx  # pk_live_xxxxx for production
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From Stripe Dashboard

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx  # For server-side operations
```

## Testing Functions Locally

Use Netlify CLI to test functions:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Start local dev server
netlify dev

# Functions available at:
# http://localhost:8888/.netlify/functions/stripe-create-customer
# http://localhost:8888/.netlify/functions/stripe-attach-payment-method
# etc.
```

## Webhook Testing

Use Stripe CLI to forward webhooks to local dev:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local function
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

## Error Handling Best Practices

1. **Always check success flags**:
```typescript
const result = await stripe.createCustomer({ ... });
if (!result.success) {
  // Handle error
  console.error(result.error.message);
}
```

2. **Log errors for debugging**:
```typescript
console.error('Stripe error:', {
  code: result.error?.code,
  message: result.error?.message,
  context: { companyId, amount }
});
```

3. **Return user-friendly messages**:
```typescript
if (result.error?.code === 'insufficient_funds') {
  return {
    statusCode: 400,
    body: JSON.stringify({
      error: 'Insufficient funds. Please use a different bank account.'
    })
  };
}
```

4. **Never expose sensitive data**:
```typescript
// BAD: Don't return full error objects to client
return { error: stripeError };

// GOOD: Return sanitized messages
return { error: 'Payment failed. Please try again.' };
```
