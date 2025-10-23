/**
 * CANCEL SUBSCRIPTION
 *
 * Netlify function to handle subscription cancellations with feedback collection.
 * Maintains Stripe customer data for compliance but stops future billing.
 *
 * Security:
 * - Requires valid JWT token from Supabase auth
 * - Verifies user is company owner
 * - Maintains audit trail of cancellations
 * - Preserves payment history for compliance
 *
 * Flow:
 * 1. User confirms cancellation in modal with optional reason/feedback
 * 2. Frontend calls this function with reason and feedback
 * 3. Function cancels any active Stripe subscriptions
 * 4. Updates subscription status to 'canceled'
 * 5. Sets cancelled_at timestamp and stores feedback
 * 6. Maintains Stripe customer for potential reactivation
 *
 * TESTING GUIDE:
 *
 * Stripe Test Mode:
 * - Use test API keys (sk_test_...)
 * - Test with sandbox subscriptions
 *
 * Manual Testing:
 * curl -X POST https://full-code.netlify.app/.netlify/functions/cancel-subscription \
 *   -H "Authorization: Bearer $TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"company_id": "uuid", "reason": "too_expensive", "feedback": "Optional feedback"}'
 *
 * Expected Response:
 * {
 *   "success": true,
 *   "billing": {
 *     "subscription_status": "canceled",
 *     "cancelled_at": "2025-01-15T..."
 *   }
 * }
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import {
  getStripe,
  getSupabaseAdmin,
  getSupabaseClient,
  verifyAuth,
  verifyCompanyOwner,
  getCustomerByCompanyId,
  errorResponse,
  successResponse,
  logAudit,
  extractAuthToken,
  RESPONSE_HEADERS
} from './shared/stripe-client';

/**
 * Cancel subscription request body
 */
interface CancelSubscriptionRequest {
  company_id: string;
  reason: string; // Cancellation reason enum value
  feedback?: string; // Optional detailed feedback
  immediate?: boolean; // Cancel immediately vs at period end
}

/**
 * Valid cancellation reasons (matching frontend enum)
 */
const VALID_CANCELLATION_REASONS = [
  'too_expensive',
  'missing_features',
  'poor_performance',
  'switching_competitor',
  'business_closed',
  'seasonal',
  'other'
];

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: RESPONSE_HEADERS,
      body: ''
    };
  }

  // Extract auth token
  const token = extractAuthToken(event.headers);
  if (!token) {
    return errorResponse(401, 'Missing or invalid authorization header');
  }

  try {
    // ==================================================================
    // STEP 1: VERIFY JWT TOKEN USING SUPABASE
    // ==================================================================

    let userId: string;
    let userEmail: string | undefined;

    try {
      const user = await verifyAuth(token);
      userId = user.id;
      userEmail = user.email;
      console.log('[CancelSubscription] Request from user:', userId, userEmail);
    } catch (authError) {
      console.error('[CancelSubscription] Auth verification failed:', authError);
      return errorResponse(401, 'Invalid authentication token');
    }

    // ==================================================================
    // STEP 2: PARSE AND VALIDATE REQUEST
    // ==================================================================

    const body: CancelSubscriptionRequest = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.company_id) {
      return errorResponse(400, 'Company ID is required');
    }

    // Validate cancellation reason
    if (body.reason && !VALID_CANCELLATION_REASONS.includes(body.reason)) {
      return errorResponse(400, 'Invalid cancellation reason', 'INVALID_REASON');
    }

    // Default to 'other' if no reason provided
    const cancellationReason = body.reason || 'other';

    console.log('[CancelSubscription] Cancellation request:', {
      company: body.company_id,
      reason: cancellationReason,
      hasFeedback: !!body.feedback,
      immediate: body.immediate
    });

    // ==================================================================
    // STEP 3: VERIFY USER IS COMPANY OWNER
    // ==================================================================

    const isOwner = await verifyCompanyOwner(userId, body.company_id);
    if (!isOwner) {
      console.error('[CancelSubscription] User is not company owner:', {
        userId,
        companyId: body.company_id
      });
      return errorResponse(403, 'You do not have permission to cancel this subscription');
    }

    // Get company details
    const supabaseAdmin = getSupabaseAdmin();
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select(`
        id,
        owner_id,
        name,
        email,
        subscription_status,
        subscription_tier,
        next_billing_date,
        trial_end_date,
        cancelled_at,
        monthly_amount,
        stripe_customer_id,
        stripe_subscription_id
      `)
      .eq('id', body.company_id)
      .single();

    if (companyError || !company) {
      console.error('[CancelSubscription] Company not found:', companyError);
      return errorResponse(404, 'Company not found');
    }

    // Check if already canceled
    if (company.subscription_status === 'canceled' || company.cancelled_at) {
      return errorResponse(400, 'Subscription is already canceled', 'ALREADY_CANCELED');
    }

    // ==================================================================
    // STEP 4: DETERMINE EFFECTIVE CANCELLATION DATE
    // ==================================================================

    const now = new Date();
    let effectiveDate: Date;
    let refundAmount = 0;

    if (body.immediate) {
      // Immediate cancellation
      effectiveDate = now;

      // Calculate prorated refund if applicable
      if (company.subscription_status === 'active' && company.next_billing_date) {
        const nextBilling = new Date(company.next_billing_date);
        const daysRemaining = Math.max(0, Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const monthlyAmount = company.monthly_amount || 0;

        if (daysRemaining > 0 && monthlyAmount > 0) {
          // Prorate refund for unused days (assuming 30-day month)
          refundAmount = Math.round((monthlyAmount / 30) * daysRemaining);
        }
      }
    } else {
      // Cancel at period end
      if (company.subscription_status === 'trial' && company.trial_end_date) {
        effectiveDate = new Date(company.trial_end_date);
      } else if (company.next_billing_date) {
        effectiveDate = new Date(company.next_billing_date);
      } else {
        // No billing date set, cancel immediately
        effectiveDate = now;
      }
    }

    console.log('[CancelSubscription] Effective cancellation date:', effectiveDate);

    // ==================================================================
    // STEP 5: CANCEL STRIPE SUBSCRIPTION (IF EXISTS)
    // ==================================================================

    if (company.stripe_subscription_id) {
      try {
        const stripe = getStripe();

        // Cancel subscription at period end or immediately
        const subscription = await stripe.subscriptions.update(
          company.stripe_subscription_id,
          {
            cancel_at_period_end: !body.immediate,
            cancellation_details: {
              comment: body.feedback || undefined,
              feedback: cancellationReason as any // Map our reason to Stripe's enum
            },
            metadata: {
              cancelled_by: userId,
              cancelled_at: now.toISOString(),
              cancellation_reason: cancellationReason,
              cancellation_feedback: body.feedback || ''
            }
          }
        );

        console.log('[CancelSubscription] Stripe subscription canceled:', {
          subscriptionId: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end
        });

        // If immediate cancellation, cancel the subscription now
        if (body.immediate) {
          await stripe.subscriptions.cancel(company.stripe_subscription_id);
        }

      } catch (stripeError: any) {
        console.error('[CancelSubscription] Failed to cancel Stripe subscription:', stripeError);
        // Non-fatal: Continue with database update even if Stripe cancellation fails
      }
    }

    // ==================================================================
    // STEP 6: UPDATE COMPANY SUBSCRIPTION STATUS
    // ==================================================================

    // Build update object
    const updateData: any = {
      subscription_status: 'canceled',
      cancelled_at: now.toISOString(),
      cancellation_reason: cancellationReason
    };

    // NOTE: The database doesn't have a cancellation_feedback column yet
    // This will need to be added in a migration
    // For now, we'll store the feedback in the audit log

    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update(updateData)
      .eq('id', body.company_id);

    if (updateError) {
      console.error('[CancelSubscription] Failed to update company:', updateError);
      return errorResponse(500, 'Failed to cancel subscription', 'UPDATE_FAILED');
    }

    // ==================================================================
    // STEP 7: LOG CANCELLATION IN AUDIT TRAIL
    // ==================================================================

    await logAudit({
      companyId: body.company_id,
      userId,
      action: 'subscription_canceled',
      details: {
        reason: cancellationReason,
        feedback: body.feedback,
        immediate: body.immediate,
        effective_date: effectiveDate.toISOString(),
        refund_amount: refundAmount,
        subscription_tier: company.subscription_tier,
        monthly_amount: company.monthly_amount,
        stripe_customer_id: company.stripe_customer_id,
        stripe_subscription_id: company.stripe_subscription_id,
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
        user_agent: event.headers['user-agent']
      }
    });

    // ==================================================================
    // STEP 8: STORE CANCELLATION FEEDBACK (TEMPORARY SOLUTION)
    // ==================================================================

    // Since cancellation_feedback column doesn't exist yet, store in a separate table
    // or as a JSON field in audit_logs (already done above)

    if (body.feedback) {
      // Create a feedback record for analysis
      await supabaseAdmin
        .from('customer_feedback')
        .insert({
          company_id: body.company_id,
          user_id: userId,
          feedback_type: 'cancellation',
          reason: cancellationReason,
          feedback_text: body.feedback,
          created_at: now.toISOString()
        })
        .single()
        .then(() => {
          console.log('[CancelSubscription] Feedback stored successfully');
        })
        .catch((err) => {
          // Non-fatal: Feedback table might not exist yet
          console.warn('[CancelSubscription] Could not store feedback:', err.message);
        });
    }

    // ==================================================================
    // STEP 9: HANDLE REFUND IF APPLICABLE
    // ==================================================================

    if (refundAmount > 0 && company.stripe_customer_id) {
      try {
        const stripe = getStripe();

        // Get the last successful payment
        const payments = await stripe.paymentIntents.list({
          customer: company.stripe_customer_id,
          limit: 1
        });

        if (payments.data.length > 0 && payments.data[0].status === 'succeeded') {
          // Create refund through Stripe
          const refund = await stripe.refunds.create({
            payment_intent: payments.data[0].id,
            amount: refundAmount, // Amount in cents
            reason: 'requested_by_customer',
            metadata: {
              company_id: body.company_id,
              cancellation_reason: cancellationReason,
              cancelled_by: userId
            }
          });

          console.log('[CancelSubscription] Stripe refund created:', refund.id);

          // Record refund in database
          await supabaseAdmin
            .from('payments')
            .insert({
              company_id: body.company_id,
              amount: -refundAmount, // Negative amount for refund
              status: 'pending',
              payment_type: 'refund',
              stripe_refund_id: refund.id,
              created_at: now.toISOString()
            });
        }
      } catch (refundError) {
        console.error('[CancelSubscription] Failed to create refund:', refundError);
        // Non-fatal: Continue even if refund fails
      }
    }

    // ==================================================================
    // STEP 10: SEND CANCELLATION EMAIL
    // ==================================================================

    // TODO: Send cancellation confirmation email
    // await sendCancellationEmail({
    //   to: company.email,
    //   companyName: company.name,
    //   effectiveDate: effectiveDate,
    //   reason: cancellationReason,
    //   feedback: body.feedback
    // });

    console.log('[CancelSubscription] Subscription canceled successfully:', {
      companyId: body.company_id,
      effectiveDate: effectiveDate.toISOString(),
      reason: cancellationReason
    });

    // ==================================================================
    // STEP 11: RETURN SUCCESS RESPONSE
    // ==================================================================

    return successResponse({
      message: body.immediate
        ? 'Your subscription has been canceled immediately'
        : `Your subscription will remain active until ${effectiveDate.toLocaleDateString()}`,
      billing: {
        id: body.company_id,
        subscription_status: 'canceled',
        cancelled_at: now.toISOString(),
        cancellation_reason: cancellationReason,
        effective_date: effectiveDate.toISOString(),
        stripe_customer_id: company.stripe_customer_id
      },
      cancelled_at: effectiveDate.toISOString(),
      refund_amount: refundAmount > 0 ? refundAmount : undefined
    });

  } catch (error: any) {
    console.error('[CancelSubscription] Unexpected error:', error);

    // Log error for debugging
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        await logAudit({
          companyId: body.company_id,
          action: 'subscription_cancel_error',
          details: {
            error: error.message,
            stack: error.stack
          }
        });
      } catch {
        // Ignore audit log errors
      }
    }

    return errorResponse(
      500,
      process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      'INTERNAL_ERROR'
    );
  }
};