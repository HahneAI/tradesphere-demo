/**
 * PHASE 4B: DWOLLA WEBHOOK HANDLER
 *
 * Processes Dwolla webhook events for payment lifecycle management.
 * Handles transfer completion, failures, and funding source verification.
 *
 * IMPORTANT: This endpoint must be registered in Dwolla dashboard.
 * URL: https://app.tradesphere.com/.netlify/functions/dwolla-webhook
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import DwollaService from '../../src/services/DwollaService';
import type { DwollaWebhookEvent } from '../../src/types/payment';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Use service role for server-side operations
);

export const handler: Handler = async (event: HandlerEvent) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Verify webhook signature
  const signature = event.headers['x-request-signature-sha-256'];
  const webhookSecret = process.env.DWOLLA_WEBHOOK_SECRET!;

  if (!signature || !DwollaService.verifyWebhookSignature(signature, event.body!, webhookSecret)) {
    console.error('Invalid webhook signature');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  // Parse webhook event
  const dwollaEvent: DwollaWebhookEvent = JSON.parse(event.body!);

  console.log(`[Dwolla Webhook] Received: ${dwollaEvent.topic}`, {
    id: dwollaEvent.id,
    resourceId: dwollaEvent.resourceId,
    timestamp: dwollaEvent.timestamp
  });

  // Check for duplicate webhook (idempotency)
  const { data: existingWebhook } = await supabase
    .from('payment_webhooks')
    .select('id, processed')
    .eq('payload->>id', dwollaEvent.id)
    .maybeSingle();

  if (existingWebhook) {
    if (existingWebhook.processed) {
      console.log(`[Dwolla Webhook] Already processed: ${dwollaEvent.id}`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          received: true,
          duplicate: true,
          message: 'Webhook already processed'
        })
      };
    } else {
      console.log(`[Dwolla Webhook] Retrying failed webhook: ${dwollaEvent.id}`);
      // Continue to reprocess failed webhook
    }
  }

  // Log webhook event to database
  const { data: webhookRecord, error: webhookError } = await supabase
    .from('payment_webhooks')
    .insert({
      event_type: dwollaEvent.topic,
      payload: dwollaEvent,
      processed: false,
      retry_count: 0,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (webhookError) {
    console.error('[Dwolla Webhook] Failed to log event:', webhookError);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to log webhook event' })
    };
  }

  try {
    // Process webhook based on topic
    await processWebhookEvent(dwollaEvent, webhookRecord.id);

    // Mark webhook as processed
    await supabase
      .from('payment_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('id', webhookRecord.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, eventId: dwollaEvent.id })
    };
  } catch (error: any) {
    console.error('[Dwolla Webhook] Processing error:', error);

    // Mark webhook as failed
    await supabase
      .from('payment_webhooks')
      .update({
        processed: false,
        error: error.message,
        retry_count: 1
      })
      .eq('id', webhookRecord.id);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

/**
 * Process webhook event based on topic
 */
async function processWebhookEvent(event: DwollaWebhookEvent, webhookId: string): Promise<void> {
  switch (event.topic) {
    case 'customer_transfer_completed':
      await handleTransferCompleted(event, webhookId);
      break;

    case 'customer_transfer_failed':
      await handleTransferFailed(event, webhookId);
      break;

    case 'customer_funding_source_verified':
      await handleFundingSourceVerified(event, webhookId);
      break;

    case 'customer_funding_source_removed':
      await handleFundingSourceRemoved(event, webhookId);
      break;

    case 'customer_microdeposits_completed':
      await handleMicroDepositsCompleted(event, webhookId);
      break;

    case 'customer_microdeposits_failed':
    case 'customer_microdeposits_maxattempts':
      await handleMicroDepositsFailed(event, webhookId);
      break;

    default:
      console.log(`[Dwolla Webhook] Unhandled event type: ${event.topic}`);
  }
}

/**
 * Handle: customer_transfer_completed
 * Payment succeeded - update subscription status and advance billing date
 */
async function handleTransferCompleted(event: DwollaWebhookEvent, webhookId: string): Promise<void> {
  const transferUrl = event._links.resource.href;

  console.log('[Dwolla Webhook] Transfer completed:', transferUrl);

  // Find payment record by transfer ID/URL
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('dwolla_transfer_url', transferUrl)
    .single();

  if (!payment) {
    console.warn('[Dwolla Webhook] Payment not found for transfer:', transferUrl);
    return;
  }

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status: 'succeeded',
      processed_at: new Date().toISOString()
    })
    .eq('id', payment.id);

  // Update company subscription status and advance billing date
  await supabase.rpc('record_payment_success', {
    company_id_input: payment.company_id
  });

  // Link webhook to payment
  await supabase
    .from('payment_webhooks')
    .update({ payment_id: payment.id, company_id: payment.company_id })
    .eq('id', webhookId);

  console.log(`[Dwolla Webhook] Payment succeeded for company: ${payment.company_id}`);
}

/**
 * Handle: customer_transfer_failed
 * Payment failed - mark payment as failed and update company status
 */
async function handleTransferFailed(event: DwollaWebhookEvent, webhookId: string): Promise<void> {
  const transferUrl = event._links.resource.href;

  console.log('[Dwolla Webhook] Transfer failed:', transferUrl);

  // Find payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('dwolla_transfer_url', transferUrl)
    .single();

  if (!payment) {
    console.warn('[Dwolla Webhook] Payment not found for failed transfer:', transferUrl);
    return;
  }

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_code: 'transfer_failed',
      failure_message: 'ACH transfer failed. Possible reasons: insufficient funds, invalid account, or account closed.',
      processed_at: new Date().toISOString()
    })
    .eq('id', payment.id);

  // Update company status (increment failure count, suspend after 3 failures)
  await supabase.rpc('record_payment_failure', {
    company_id_input: payment.company_id
  });

  // Link webhook to payment
  await supabase
    .from('payment_webhooks')
    .update({ payment_id: payment.id, company_id: payment.company_id })
    .eq('id', webhookId);

  console.log(`[Dwolla Webhook] Payment failed for company: ${payment.company_id}`);

  // TODO: Send email notification to company owner about payment failure
  // await sendPaymentFailedEmail(payment.company_id);
}

/**
 * Handle: customer_funding_source_verified
 * Bank account verified - enable automatic billing
 */
async function handleFundingSourceVerified(event: DwollaWebhookEvent, webhookId: string): Promise<void> {
  const customerUrl = event._links.customer?.href;
  const fundingSourceUrl = event._links.resource.href;

  if (!customerUrl) {
    console.warn('[Dwolla Webhook] No customer URL in funding source verified event');
    return;
  }

  console.log('[Dwolla Webhook] Funding source verified:', fundingSourceUrl);

  // Find company by Dwolla customer URL
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('dwolla_customer_url', customerUrl)
    .single();

  if (!company) {
    console.warn('[Dwolla Webhook] Company not found for customer:', customerUrl);
    return;
  }

  // Update company payment method status
  await supabase
    .from('companies')
    .update({
      payment_method_status: 'verified',
      payment_method_verified_at: new Date().toISOString()
    })
    .eq('id', company.id);

  // Link webhook to company
  await supabase
    .from('payment_webhooks')
    .update({ company_id: company.id })
    .eq('id', webhookId);

  console.log(`[Dwolla Webhook] Bank account verified for company: ${company.id}`);

  // TODO: Send confirmation email to company owner
  // await sendBankAccountVerifiedEmail(company.id);
}

/**
 * Handle: customer_funding_source_removed
 * Bank account removed - suspend automatic billing
 */
async function handleFundingSourceRemoved(event: DwollaWebhookEvent, webhookId: string): Promise<void> {
  const customerUrl = event._links.customer?.href;

  if (!customerUrl) {
    console.warn('[Dwolla Webhook] No customer URL in funding source removed event');
    return;
  }

  console.log('[Dwolla Webhook] Funding source removed for customer:', customerUrl);

  // Find company by Dwolla customer URL
  const { data: company } = await supabase
    .from('companies')
    .select('id, subscription_status')
    .eq('dwolla_customer_url', customerUrl)
    .single();

  if (!company) {
    console.warn('[Dwolla Webhook] Company not found for customer:', customerUrl);
    return;
  }

  // Update company status to past_due (no payment method)
  await supabase
    .from('companies')
    .update({
      subscription_status: 'past_due',
      payment_method_status: 'pending'
    })
    .eq('id', company.id);

  // Link webhook to company
  await supabase
    .from('payment_webhooks')
    .update({ company_id: company.id })
    .eq('id', webhookId);

  console.log(`[Dwolla Webhook] Payment method removed for company: ${company.id}`);

  // TODO: Send urgent email to company owner to add new payment method
  // await sendPaymentMethodRemovedEmail(company.id);
}

/**
 * Handle: customer_microdeposits_completed
 * Micro-deposits successfully sent - ready for verification
 */
async function handleMicroDepositsCompleted(event: DwollaWebhookEvent, webhookId: string): Promise<void> {
  const customerUrl = event._links.customer?.href;

  if (!customerUrl) {
    return;
  }

  // Find company
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('dwolla_customer_url', customerUrl)
    .single();

  if (company) {
    await supabase
      .from('payment_webhooks')
      .update({ company_id: company.id })
      .eq('id', webhookId);

    console.log(`[Dwolla Webhook] Micro-deposits sent to company: ${company.id}`);

    // TODO: Send email with instructions to verify micro-deposits
    // await sendMicroDepositsReadyEmail(company.id);
  }
}

/**
 * Handle: customer_microdeposits_failed / customer_microdeposits_maxattempts
 * Micro-deposit verification failed
 */
async function handleMicroDepositsFailed(event: DwollaWebhookEvent, webhookId: string): Promise<void> {
  const customerUrl = event._links.customer?.href;

  if (!customerUrl) {
    return;
  }

  // Find company
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('dwolla_customer_url', customerUrl)
    .single();

  if (company) {
    // Update payment method status to failed
    await supabase
      .from('companies')
      .update({
        payment_method_status: 'failed'
      })
      .eq('id', company.id);

    await supabase
      .from('payment_webhooks')
      .update({ company_id: company.id })
      .eq('id', webhookId);

    console.log(`[Dwolla Webhook] Micro-deposit verification failed for company: ${company.id}`);

    // TODO: Send email asking to re-add bank account
    // await sendMicroDepositsFailedEmail(company.id);
  }
}
