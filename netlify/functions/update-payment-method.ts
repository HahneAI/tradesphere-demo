/**
 * UPDATE PAYMENT METHOD
 *
 * Netlify function to update/replace the payment method for a company.
 * Called from the app billing tab when users want to change their bank account.
 *
 * Security:
 * - Requires valid JWT token from Supabase auth
 * - Verifies user is company owner
 * - Maintains audit trail of payment method changes
 *
 * Flow:
 * 1. Verify JWT token (user is company owner)
 * 2. Receive new payment method ID from Stripe.js + Plaid
 * 3. Get company's stripe_customer_id from Supabase
 * 4. Detach old payment method (if exists)
 * 5. Attach new payment method
 * 6. Set as default for future charges
 * 7. Update payment_method_status in Supabase
 * 8. Return success with new payment method details
 *
 * TESTING GUIDE:
 *
 * Stripe Test Mode:
 * - Use test API keys (sk_test_...)
 * - Use test payment methods from Stripe.js
 *
 * Manual Testing:
 * curl -X POST https://full-code.netlify.app/.netlify/functions/update-payment-method \
 *   -H "Authorization: Bearer $TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"companyId": "uuid", "newPaymentMethodId": "pm_xxx"}'
 *
 * Expected Response:
 * {
 *   "success": true,
 *   "data": {
 *     "paymentMethodId": "pm_xxx",
 *     "last4": "1234",
 *     "bankName": "Test Bank"
 *   }
 * }
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import {
  getStripe,
  getSupabaseAdmin,
  verifyAuth,
  verifyCompanyOwner,
  getCustomerByCompanyId,
  updateCompanyPaymentMethod,
  errorResponse,
  successResponse,
  parseStripeError,
  logAudit,
  extractAuthToken,
  withRetry,
  withTimeout,
  RESPONSE_HEADERS
} from './shared/stripe-client';

/**
 * Request body for updating payment method
 */
interface UpdatePaymentMethodRequest {
  companyId: string;
  newPaymentMethodId: string; // From Stripe.js + Plaid
}

/**
 * Response data structure
 */
interface UpdatePaymentMethodResponse {
  paymentMethodId: string;
  last4: string;
  bankName: string;
  accountHolderType: string;
  verified: boolean;
  isDefault: boolean;
  updatedAt: string;
}

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
      console.log('[UpdatePaymentMethod] Request from user:', userId, userEmail);
    } catch (authError) {
      console.error('[UpdatePaymentMethod] Auth verification failed:', authError);
      return errorResponse(401, 'Invalid authentication token');
    }

    // ==================================================================
    // STEP 2: PARSE AND VALIDATE REQUEST
    // ==================================================================

    const body: UpdatePaymentMethodRequest = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.companyId || !body.newPaymentMethodId) {
      return errorResponse(400, 'Missing required fields: companyId, newPaymentMethodId');
    }

    // Validate payment method ID format (pm_xxxxx)
    if (!body.newPaymentMethodId.startsWith('pm_')) {
      return errorResponse(400, 'Invalid payment method ID format');
    }

    console.log('[UpdatePaymentMethod] Updating payment method for company:', body.companyId);

    // ==================================================================
    // STEP 3: VERIFY USER IS COMPANY OWNER
    // ==================================================================

    const isOwner = await verifyCompanyOwner(userId, body.companyId);
    if (!isOwner) {
      console.error('[UpdatePaymentMethod] User is not company owner:', {
        userId,
        companyId: body.companyId
      });
      return errorResponse(403, 'You do not have permission to update this company\'s payment method');
    }

    // ==================================================================
    // STEP 4: GET COMPANY'S STRIPE CUSTOMER ID
    // ==================================================================

    const customerInfo = await getCustomerByCompanyId(body.companyId);
    if (!customerInfo || !customerInfo.customerId) {
      return errorResponse(404, 'No Stripe customer found for this company', 'NO_CUSTOMER');
    }

    const { customerId, paymentMethodId: oldPaymentMethodId } = customerInfo;
    console.log('[UpdatePaymentMethod] Found Stripe customer:', customerId);

    // ==================================================================
    // STEP 5: VERIFY NEW PAYMENT METHOD EXISTS
    // ==================================================================

    const stripe = getStripe();
    let newPaymentMethod;

    try {
      newPaymentMethod = await stripe.paymentMethods.retrieve(body.newPaymentMethodId);

      if (!newPaymentMethod || newPaymentMethod.type !== 'us_bank_account') {
        return errorResponse(400, 'Invalid payment method. Must be a verified US bank account.');
      }

      // Check if already attached to another customer
      if (newPaymentMethod.customer && newPaymentMethod.customer !== customerId) {
        return errorResponse(400, 'This payment method is already attached to another customer');
      }

    } catch (error: any) {
      const { message, code } = parseStripeError(error);
      console.error('[UpdatePaymentMethod] Failed to retrieve payment method:', error);
      return errorResponse(400, message, code);
    }

    // ==================================================================
    // STEP 6: DETACH OLD PAYMENT METHOD (IF EXISTS)
    // ==================================================================

    if (oldPaymentMethodId && oldPaymentMethodId !== body.newPaymentMethodId) {
      try {
        await withRetry(async () => {
          await stripe.paymentMethods.detach(oldPaymentMethodId);
        });
        console.log('[UpdatePaymentMethod] Detached old payment method:', oldPaymentMethodId);
      } catch (detachError) {
        // Non-fatal: Log but continue
        console.warn('[UpdatePaymentMethod] Could not detach old payment method:', detachError);
      }
    }

    // ==================================================================
    // STEP 7: ATTACH NEW PAYMENT METHOD TO CUSTOMER
    // ==================================================================

    try {
      // Attach if not already attached
      if (!newPaymentMethod.customer) {
        await withRetry(async () => {
          await stripe.paymentMethods.attach(body.newPaymentMethodId, {
            customer: customerId
          });
        });
        console.log('[UpdatePaymentMethod] Attached new payment method:', body.newPaymentMethodId);
      }

      // Set as default payment method for invoices and subscriptions
      await withRetry(async () => {
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: body.newPaymentMethodId
          }
        });
      });

      console.log('[UpdatePaymentMethod] Set as default payment method');

    } catch (stripeError: any) {
      const { message, code } = parseStripeError(stripeError);
      console.error('[UpdatePaymentMethod] Failed to attach payment method:', stripeError);
      return errorResponse(500, message, code);
    }

    // ==================================================================
    // STEP 8: CREATE SETUP INTENT FOR FUTURE CHARGES
    // ==================================================================

    let setupIntentId: string | undefined;

    try {
      // Create a SetupIntent to authorize future charges
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method: body.newPaymentMethodId,
        confirm: true,
        usage: 'off_session', // Allow charging when customer is not present
        payment_method_types: ['us_bank_account'],
        metadata: {
          company_id: body.companyId,
          updated_by: userId,
          updated_at: new Date().toISOString()
        }
      });

      setupIntentId = setupIntent.id;
      console.log('[UpdatePaymentMethod] Setup intent created:', setupIntentId);

    } catch (setupError) {
      // Non-fatal: Log but don't fail the whole operation
      console.warn('[UpdatePaymentMethod] Could not create setup intent:', setupError);
    }

    // ==================================================================
    // STEP 9: UPDATE COMPANY IN SUPABASE
    // ==================================================================

    try {
      await updateCompanyPaymentMethod(body.companyId, body.newPaymentMethodId, 'verified');

      // Also update setup intent ID if created
      if (setupIntentId) {
        const supabaseAdmin = getSupabaseAdmin();
        await supabaseAdmin
          .from('companies')
          .update({
            stripe_setup_intent_id: setupIntentId
          })
          .eq('id', body.companyId);
      }

      console.log('[UpdatePaymentMethod] Updated company payment method in database');

    } catch (dbError: any) {
      console.error('[UpdatePaymentMethod] Failed to update database:', dbError);
      // Continue: Stripe update succeeded, database update failed (can be fixed manually)
    }

    // ==================================================================
    // STEP 10: LOG AUDIT TRAIL
    // ==================================================================

    const bankAccount = newPaymentMethod.us_bank_account;

    await logAudit({
      companyId: body.companyId,
      userId,
      action: 'payment_method_updated',
      details: {
        old_payment_method_id: oldPaymentMethodId,
        new_payment_method_id: body.newPaymentMethodId,
        bank_name: bankAccount?.bank_name,
        last4: bankAccount?.last4,
        account_holder_type: bankAccount?.account_holder_type,
        setup_intent_id: setupIntentId,
        ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
        user_agent: event.headers['user-agent']
      }
    });

    // ==================================================================
    // STEP 11: RETURN SUCCESS RESPONSE
    // ==================================================================

    const responseData: UpdatePaymentMethodResponse = {
      paymentMethodId: body.newPaymentMethodId,
      last4: bankAccount?.last4 || 'Unknown',
      bankName: bankAccount?.bank_name || 'Unknown Bank',
      accountHolderType: bankAccount?.account_holder_type || 'individual',
      verified: true, // With Plaid, always verified instantly
      isDefault: true,
      updatedAt: new Date().toISOString()
    };

    console.log('[UpdatePaymentMethod] Payment method updated successfully:', {
      companyId: body.companyId,
      paymentMethodId: body.newPaymentMethodId,
      bankName: responseData.bankName,
      last4: responseData.last4
    });

    return successResponse(responseData, 'Payment method updated successfully');

  } catch (error: any) {
    console.error('[UpdatePaymentMethod] Unexpected error:', error);

    // Log error for debugging
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        await logAudit({
          companyId: body.companyId,
          action: 'payment_method_update_error',
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