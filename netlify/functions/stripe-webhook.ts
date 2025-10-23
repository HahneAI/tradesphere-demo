/**
 * STRIPE WEBHOOK HANDLER
 *
 * Processes Stripe webhook events for payment lifecycle management.
 * Handles PaymentIntents, PaymentMethods, Disputes, and Customer events.
 *
 * IMPORTANT: This endpoint must be registered in Stripe dashboard.
 * URL: https://full-code.netlify.app/.netlify/functions/stripe-webhook
 *
 * Stripe Webhook Signature Verification:
 * - Uses stripe.webhooks.constructEvent() method (more secure than manual HMAC)
 * - Requires STRIPE_WEBHOOK_SECRET from Stripe dashboard
 * - Includes timestamp validation to prevent replay attacks
 * - Automatically validates signature and event structure
 *
 * Database Integration:
 * - Uses renamed 'stripe_webhooks' table (migration 18)
 * - Implements idempotency to prevent duplicate processing
 * - Links events to companies via stripe_customer_id lookup
 * - Tracks retry attempts and error states
 *
 * Events Handled:
 * - payment_intent.succeeded - Payment completed successfully
 * - payment_intent.payment_failed - Payment failed (insufficient funds, etc.)
 * - payment_intent.processing - Payment is being processed
 * - payment_intent.canceled - Payment was canceled
 * - payment_method.attached - Bank account verified via Plaid
 * - payment_method.detached - Bank account removed
 * - charge.dispute.created - ACH dispute initiated
 * - charge.dispute.closed - Dispute resolved
 * - charge.refunded - Payment refunded
 * - customer.updated - Customer information changed
 * - customer.deleted - Customer account deleted
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe with API version pinned to latest stable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

// Initialize Supabase with service role for server-side operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Full database access for webhook processing
);

export const handler: Handler = async (event: HandlerEvent) => {
  // Only accept POST requests from Stripe
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Extract Stripe signature from headers
  const signature = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing signature header' })
    };
  }

  // Verify webhook signature using Stripe's built-in method
  // This validates both the signature and timestamp (prevents replay attacks)
  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: 'Invalid signature',
        message: err.message
      })
    };
  }

  console.log(`[Stripe Webhook] Received: ${stripeEvent.type}`, {
    id: stripeEvent.id,
    created: new Date(stripeEvent.created * 1000).toISOString(),
    livemode: stripeEvent.livemode
  });

  // Check for duplicate webhook (idempotency protection)
  // Stripe may send the same webhook multiple times for reliability
  const { data: existingWebhook } = await supabase
    .from('stripe_webhooks')
    .select('id, processed')
    .eq('payload->>id', stripeEvent.id)
    .maybeSingle();

  if (existingWebhook) {
    if (existingWebhook.processed) {
      console.log(`[Stripe Webhook] Already processed: ${stripeEvent.id}`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          received: true,
          duplicate: true,
          message: 'Webhook already processed'
        })
      };
    } else {
      console.log(`[Stripe Webhook] Retrying failed webhook: ${stripeEvent.id}`);
      // Continue to reprocess failed webhook
    }
  }

  // Log webhook event to database for audit trail
  const { data: webhookRecord, error: webhookError } = await supabase
    .from('stripe_webhooks')
    .insert({
      event_type: stripeEvent.type,
      payload: stripeEvent as any,  // Store full JSON payload
      processed: false,
      retry_count: 0,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (webhookError) {
    console.error('[Stripe Webhook] Failed to log event:', webhookError);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to log webhook event',
        details: webhookError.message
      })
    };
  }

  try {
    // Process webhook based on event type
    await processWebhookEvent(stripeEvent, webhookRecord.id);

    // Mark webhook as successfully processed
    await supabase
      .from('stripe_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('id', webhookRecord.id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        received: true,
        eventId: stripeEvent.id,
        type: stripeEvent.type
      })
    };
  } catch (error: any) {
    console.error('[Stripe Webhook] Processing error:', error);

    // Mark webhook as failed (Stripe will retry automatically)
    await supabase
      .from('stripe_webhooks')
      .update({
        processed: false,
        error: error.message,
        retry_count: 1
      })
      .eq('id', webhookRecord.id);

    // Return 500 to trigger Stripe's automatic retry logic
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        eventId: stripeEvent.id
      })
    };
  }
};

/**
 * Process webhook event based on type
 * Routes events to specific handler functions
 */
async function processWebhookEvent(event: Stripe.Event, webhookId: string): Promise<void> {
  switch (event.type) {
    // Payment Intent Events (subscription billing lifecycle)
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event, webhookId);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event, webhookId);
      break;

    case 'payment_intent.processing':
      await handlePaymentIntentProcessing(event, webhookId);
      break;

    case 'payment_intent.canceled':
      await handlePaymentIntentCanceled(event, webhookId);
      break;

    // Payment Method Events (bank account management)
    case 'payment_method.attached':
      await handlePaymentMethodAttached(event, webhookId);
      break;

    case 'payment_method.detached':
      await handlePaymentMethodDetached(event, webhookId);
      break;

    case 'payment_method.automatically_updated':
      await handlePaymentMethodUpdated(event, webhookId);
      break;

    // Charge Events (disputes and refunds)
    case 'charge.dispute.created':
      await handleDisputeCreated(event, webhookId);
      break;

    case 'charge.dispute.closed':
      await handleDisputeClosed(event, webhookId);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event, webhookId);
      break;

    // Customer Events (customer lifecycle)
    case 'customer.updated':
      await handleCustomerUpdated(event, webhookId);
      break;

    case 'customer.deleted':
      await handleCustomerDeleted(event, webhookId);
      break;

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle: payment_intent.succeeded
 * Payment completed successfully - update subscription status and advance billing date
 *
 * IMPORTANT: This is the core event for successful subscription billing
 * - Updates payment status to 'succeeded'
 * - Calls record_payment_success() to update subscription status
 * - Advances next_billing_date by 30 days
 * - Resets payment failure counter
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event, webhookId: string): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log('[Stripe Webhook] Payment succeeded:', paymentIntent.id);

  // Find payment record by stripe_payment_intent_id
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (!payment) {
    console.warn('[Stripe Webhook] Payment not found for PaymentIntent:', paymentIntent.id);
    return;
  }

  // Extract charge ID from latest charge (for future reference)
  const chargeId = paymentIntent.latest_charge as string | null;

  // Update payment status to succeeded
  await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: chargeId,
      processed_at: new Date().toISOString()
    })
    .eq('id', payment.id);

  // Update company subscription status and advance billing date
  // This database function:
  // - Sets subscription_status to 'active'
  // - Advances next_billing_date by 30 days
  // - Resets payment_failure_count to 0
  await supabase.rpc('record_payment_success', {
    company_id_input: payment.company_id
  });

  // Link webhook to payment and company for audit trail
  await supabase
    .from('stripe_webhooks')
    .update({
      payment_id: payment.id,
      company_id: payment.company_id
    })
    .eq('id', webhookId);

  console.log(`[Stripe Webhook] Payment succeeded for company: ${payment.company_id}`, {
    amount: paymentIntent.amount / 100,  // Convert cents to dollars
    chargeId: chargeId
  });

  // TODO: Send payment receipt email to company owner
  // await sendPaymentReceiptEmail(payment.company_id, payment.id);
}

/**
 * Handle: payment_intent.payment_failed
 * Payment failed - mark payment as failed and update company status
 *
 * Common ACH failure reasons:
 * - Insufficient funds (R01)
 * - Account closed (R02)
 * - Invalid account number (R03, R04)
 * - Authorization revoked (R07)
 * - Payment stopped (R08)
 */
async function handlePaymentIntentFailed(event: Stripe.Event, webhookId: string): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log('[Stripe Webhook] Payment failed:', paymentIntent.id, {
    lastPaymentError: paymentIntent.last_payment_error
  });

  // Find payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (!payment) {
    console.warn('[Stripe Webhook] Payment not found for failed PaymentIntent:', paymentIntent.id);
    return;
  }

  // Extract failure details from Stripe error
  const failureCode = paymentIntent.last_payment_error?.code || 'payment_failed';
  const failureMessage = paymentIntent.last_payment_error?.message ||
    'ACH payment failed. Possible reasons: insufficient funds, invalid account, or account closed.';

  // Update payment status to failed
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_code: failureCode,
      failure_message: failureMessage,
      processed_at: new Date().toISOString()
    })
    .eq('id', payment.id);

  // Update company status (increment failure count, suspend after 3 failures)
  // This database function:
  // - Increments payment_failure_count
  // - Sets last_payment_failed_at to now
  // - If payment_failure_count >= 3, sets subscription_status to 'suspended'
  await supabase.rpc('record_payment_failure', {
    company_id_input: payment.company_id
  });

  // Link webhook to payment
  await supabase
    .from('stripe_webhooks')
    .update({
      payment_id: payment.id,
      company_id: payment.company_id
    })
    .eq('id', webhookId);

  console.log(`[Stripe Webhook] Payment failed for company: ${payment.company_id}`, {
    failureCode,
    failureMessage
  });

  // TODO: Send email notification to company owner about payment failure
  // Include failure reason and instructions to update payment method
  // await sendPaymentFailedEmail(payment.company_id, failureCode, failureMessage);
}

/**
 * Handle: payment_intent.processing
 * Payment is being processed (ACH payments take 3-5 business days)
 *
 * This event fires when ACH debit is initiated but not yet completed
 */
async function handlePaymentIntentProcessing(event: Stripe.Event, webhookId: string): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log('[Stripe Webhook] Payment processing:', paymentIntent.id);

  // Find payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (!payment) {
    console.warn('[Stripe Webhook] Payment not found for processing PaymentIntent:', paymentIntent.id);
    return;
  }

  // Update payment status to processing
  await supabase
    .from('payments')
    .update({
      status: 'processing'
    })
    .eq('id', payment.id);

  // Link webhook to payment
  await supabase
    .from('stripe_webhooks')
    .update({
      payment_id: payment.id,
      company_id: payment.company_id
    })
    .eq('id', webhookId);

  console.log(`[Stripe Webhook] Payment processing for company: ${payment.company_id}`);
}

/**
 * Handle: payment_intent.canceled
 * Payment was canceled before completion
 */
async function handlePaymentIntentCanceled(event: Stripe.Event, webhookId: string): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  console.log('[Stripe Webhook] Payment canceled:', paymentIntent.id);

  // Find payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (!payment) {
    console.warn('[Stripe Webhook] Payment not found for canceled PaymentIntent:', paymentIntent.id);
    return;
  }

  // Update payment status to cancelled
  await supabase
    .from('payments')
    .update({
      status: 'cancelled',
      processed_at: new Date().toISOString()
    })
    .eq('id', payment.id);

  // Link webhook to payment
  await supabase
    .from('stripe_webhooks')
    .update({
      payment_id: payment.id,
      company_id: payment.company_id
    })
    .eq('id', webhookId);

  console.log(`[Stripe Webhook] Payment canceled for company: ${payment.company_id}`);
}

/**
 * Handle: payment_method.attached
 * Bank account verified and attached to customer (via Plaid instant verification)
 *
 * IMPORTANT: This event fires after successful Plaid verification
 * - Sets payment_method_status to 'verified'
 * - Enables automatic subscription billing
 * - Stores stripe_payment_method_id for future charges
 */
async function handlePaymentMethodAttached(event: Stripe.Event, webhookId: string): Promise<void> {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;

  console.log('[Stripe Webhook] Payment method attached:', paymentMethod.id, {
    customerId: paymentMethod.customer,
    type: paymentMethod.type
  });

  // Extract customer ID (can be string or null if not attached)
  const customerId = paymentMethod.customer as string | null;

  if (!customerId) {
    console.warn('[Stripe Webhook] No customer ID in payment method attached event');
    return;
  }

  // Find company by Stripe customer ID
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!company) {
    console.warn('[Stripe Webhook] Company not found for customer:', customerId);
    return;
  }

  // Update company payment method status to verified
  // Store payment method ID for future subscription charges
  await supabase
    .from('companies')
    .update({
      stripe_payment_method_id: paymentMethod.id,
      payment_method_status: 'verified',
      payment_method_verified_at: new Date().toISOString()
    })
    .eq('id', company.id);

  // Link webhook to company
  await supabase
    .from('stripe_webhooks')
    .update({ company_id: company.id })
    .eq('id', webhookId);

  console.log(`[Stripe Webhook] Bank account verified for company: ${company.id}`);

  // TODO: Send confirmation email to company owner
  // Include details about automatic billing starting
  // await sendBankAccountVerifiedEmail(company.id);
}

/**
 * Handle: payment_method.detached
 * Bank account removed from customer
 *
 * IMPORTANT: This suspends automatic billing
 * - Sets payment_method_status to 'pending'
 * - Sets subscription_status to 'past_due'
 * - Requires company to add new payment method
 */
async function handlePaymentMethodDetached(event: Stripe.Event, webhookId: string): Promise<void> {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;

  console.log('[Stripe Webhook] Payment method detached:', paymentMethod.id);

  // Extract customer ID from previous_attributes (payment method was attached before)
  // Stripe doesn't include customer in detached event, so we need to look it up
  const { data: company } = await supabase
    .from('companies')
    .select('id, subscription_status')
    .eq('stripe_payment_method_id', paymentMethod.id)
    .single();

  if (!company) {
    console.warn('[Stripe Webhook] Company not found for detached payment method:', paymentMethod.id);
    return;
  }

  // Update company status to past_due (no payment method available)
  await supabase
    .from('companies')
    .update({
      subscription_status: 'past_due',
      payment_method_status: 'pending',
      stripe_payment_method_id: null  // Clear payment method
    })
    .eq('id', company.id);

  // Link webhook to company
  await supabase
    .from('stripe_webhooks')
    .update({ company_id: company.id })
    .eq('id', webhookId);

  console.log(`[Stripe Webhook] Payment method removed for company: ${company.id}`);

  // TODO: Send urgent email to company owner to add new payment method
  // Include warning that service may be suspended
  // await sendPaymentMethodRemovedEmail(company.id);
}

/**
 * Handle: payment_method.automatically_updated
 * Bank account details updated automatically by Stripe
 *
 * This can happen when:
 * - Bank account is transferred to new bank (merger/acquisition)
 * - Account number changes but routing stays same
 * - Stripe's Account Updater feature detects changes
 */
async function handlePaymentMethodUpdated(event: Stripe.Event, webhookId: string): Promise<void> {
  const paymentMethod = event.data.object as Stripe.PaymentMethod;

  console.log('[Stripe Webhook] Payment method automatically updated:', paymentMethod.id);

  // Find company by payment method ID
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('stripe_payment_method_id', paymentMethod.id)
    .single();

  if (company) {
    // Link webhook to company for audit trail
    await supabase
      .from('stripe_webhooks')
      .update({ company_id: company.id })
      .eq('id', webhookId);

    console.log(`[Stripe Webhook] Payment method updated for company: ${company.id}`);

    // TODO: Send informational email to company owner
    // Let them know payment method was updated automatically
    // await sendPaymentMethodUpdatedEmail(company.id);
  }
}

/**
 * Handle: charge.dispute.created
 * ACH dispute initiated by customer's bank
 *
 * Common dispute reasons:
 * - Unauthorized transaction
 * - Duplicate charge
 * - Customer doesn't recognize charge
 * - Amount incorrect
 */
async function handleDisputeCreated(event: Stripe.Event, webhookId: string): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;

  console.log('[Stripe Webhook] Dispute created:', dispute.id, {
    chargeId: dispute.charge,
    amount: dispute.amount / 100,
    reason: dispute.reason
  });

  // Find payment by Stripe charge ID
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_charge_id', dispute.charge)
    .single();

  if (!payment) {
    console.warn('[Stripe Webhook] Payment not found for disputed charge:', dispute.charge);
    return;
  }

  // Mark payment as disputed
  // NOTE: We don't change status to 'failed' yet because dispute may be resolved in our favor
  await supabase
    .from('payments')
    .update({
      failure_code: 'disputed',
      failure_message: `ACH dispute: ${dispute.reason}. Status: under_review`
    })
    .eq('id', payment.id);

  // Link webhook to payment
  await supabase
    .from('stripe_webhooks')
    .update({
      payment_id: payment.id,
      company_id: payment.company_id
    })
    .eq('id', webhookId);

  console.log(`[Stripe Webhook] Dispute created for company: ${payment.company_id}`);

  // TODO: Send urgent notification to admin/billing team
  // Disputes require evidence submission within 7 days
  // await notifyAdminOfDispute(payment.company_id, dispute.id, dispute.reason);
}

/**
 * Handle: charge.dispute.closed
 * Dispute resolved (won or lost)
 *
 * Status can be:
 * - won: We submitted evidence and bank ruled in our favor
 * - lost: Bank ruled against us, funds are permanently lost
 */
async function handleDisputeClosed(event: Stripe.Event, webhookId: string): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;

  console.log('[Stripe Webhook] Dispute closed:', dispute.id, {
    chargeId: dispute.charge,
    status: dispute.status
  });

  // Find payment by charge ID
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_charge_id', dispute.charge)
    .single();

  if (!payment) {
    console.warn('[Stripe Webhook] Payment not found for closed dispute:', dispute.charge);
    return;
  }

  if (dispute.status === 'won') {
    // We won the dispute - restore payment to succeeded status
    await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        failure_code: null,
        failure_message: null
      })
      .eq('id', payment.id);

    console.log(`[Stripe Webhook] Dispute won for payment: ${payment.id}`);
  } else if (dispute.status === 'lost') {
    // We lost the dispute - mark payment as failed permanently
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_code: 'dispute_lost',
        failure_message: `ACH dispute lost: ${dispute.reason}`
      })
      .eq('id', payment.id);

    // Record payment failure to increment company failure count
    await supabase.rpc('record_payment_failure', {
      company_id_input: payment.company_id
    });

    console.log(`[Stripe Webhook] Dispute lost for payment: ${payment.id}`);
  }

  // Link webhook to payment
  await supabase
    .from('stripe_webhooks')
    .update({
      payment_id: payment.id,
      company_id: payment.company_id
    })
    .eq('id', webhookId);

  // TODO: Send notification about dispute resolution
  // await notifyAdminOfDisputeResolution(payment.company_id, dispute.id, dispute.status);
}

/**
 * Handle: charge.refunded
 * Payment refunded (partial or full)
 *
 * Refunds can be:
 * - Full refund: entire payment amount returned
 * - Partial refund: only part of payment returned
 */
async function handleChargeRefunded(event: Stripe.Event, webhookId: string): Promise<void> {
  const charge = event.data.object as Stripe.Charge;

  console.log('[Stripe Webhook] Charge refunded:', charge.id, {
    amount: charge.amount / 100,
    amountRefunded: charge.amount_refunded / 100,
    refunded: charge.refunded
  });

  // Find payment by charge ID
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_charge_id', charge.id)
    .single();

  if (!payment) {
    console.warn('[Stripe Webhook] Payment not found for refunded charge:', charge.id);
    return;
  }

  // Update payment status to refunded
  await supabase
    .from('payments')
    .update({
      status: 'refunded',
      processed_at: new Date().toISOString()
    })
    .eq('id', payment.id);

  // Link webhook to payment
  await supabase
    .from('stripe_webhooks')
    .update({
      payment_id: payment.id,
      company_id: payment.company_id
    })
    .eq('id', webhookId);

  console.log(`[Stripe Webhook] Payment refunded for company: ${payment.company_id}`);

  // TODO: Send refund confirmation email to company owner
  // await sendRefundConfirmationEmail(payment.company_id, charge.amount_refunded / 100);
}

/**
 * Handle: customer.updated
 * Customer information changed (email, metadata, etc.)
 */
async function handleCustomerUpdated(event: Stripe.Event, webhookId: string): Promise<void> {
  const customer = event.data.object as Stripe.Customer;

  console.log('[Stripe Webhook] Customer updated:', customer.id);

  // Find company by Stripe customer ID
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('stripe_customer_id', customer.id)
    .single();

  if (company) {
    // Link webhook to company
    await supabase
      .from('stripe_webhooks')
      .update({ company_id: company.id })
      .eq('id', webhookId);

    console.log(`[Stripe Webhook] Customer updated for company: ${company.id}`);

    // TODO: Sync updated customer data to companies table if needed
    // For example, if billing email changed in Stripe
  }
}

/**
 * Handle: customer.deleted
 * Customer account deleted from Stripe
 *
 * This should rarely happen - usually triggered by admin action
 */
async function handleCustomerDeleted(event: Stripe.Event, webhookId: string): Promise<void> {
  const customer = event.data.object as Stripe.Customer;

  console.log('[Stripe Webhook] Customer deleted:', customer.id);

  // Find company by Stripe customer ID
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('stripe_customer_id', customer.id)
    .single();

  if (company) {
    // Clear Stripe references from company
    // NOTE: We don't delete the company, just remove Stripe integration
    await supabase
      .from('companies')
      .update({
        stripe_customer_id: null,
        stripe_payment_method_id: null,
        payment_method_status: 'pending',
        subscription_status: 'cancelled'
      })
      .eq('id', company.id);

    // Link webhook to company
    await supabase
      .from('stripe_webhooks')
      .update({ company_id: company.id })
      .eq('id', webhookId);

    console.log(`[Stripe Webhook] Customer deleted for company: ${company.id}`);

    // TODO: Send notification to admin team
    // This should rarely happen and may indicate an issue
    // await notifyAdminOfCustomerDeletion(company.id, customer.id);
  }
}
