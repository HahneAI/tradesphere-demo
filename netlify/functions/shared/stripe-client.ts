/**
 * Shared Stripe Client Utility for Netlify Functions
 *
 * Provides common Stripe API functionality for serverless functions.
 * Handles customer creation, payment method management, and error handling.
 *
 * SECURITY:
 * - Uses Supabase auth.getUser() for JWT verification (not jsonwebtoken)
 * - Validates user ownership for sensitive operations
 * - Maintains audit trail of all payment operations
 *
 * @module stripe-client
 */

import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Initialize singleton Stripe instance
 */
let stripeInstance: Stripe | null = null;

/**
 * Get or create Stripe instance
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-09-30.clover',
      typescript: true
    });
  }

  return stripeInstance;
}

/**
 * Initialize Supabase Admin client (bypasses RLS)
 */
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Initialize Supabase client for auth verification
 */
export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase environment variables not configured');
  }

  return createClient(supabaseUrl, anonKey);
}

/**
 * Verify JWT token and get user
 */
export async function verifyAuth(token: string) {
  const supabaseClient = getSupabaseClient();

  const { data: { user }, error } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid authentication token');
  }

  return user;
}

/**
 * Verify user is company owner
 */
export async function verifyCompanyOwner(userId: string, companyId: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: isOwner } = await supabaseAdmin.rpc('is_company_owner', {
    user_id_input: userId,
    company_id_input: companyId
  });

  return !!isOwner;
}

/**
 * Format standardized error response
 */
export function errorResponse(statusCode: number, message: string, code?: string) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify({
      success: false,
      error: message,
      code: code || 'ERROR'
    })
  };
}

/**
 * Format standardized success response
 */
export function successResponse<T = any>(data: T, message?: string) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify({
      success: true,
      message,
      data
    })
  };
}

/**
 * Parse Stripe error and return user-friendly message
 */
export function parseStripeError(error: any): { message: string; code: string } {
  if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
    return {
      message: error.message || 'Payment processing error',
      code: error.code || 'STRIPE_ERROR'
    };
  }

  if (error.type === 'StripeAPIError') {
    return {
      message: 'Payment service temporarily unavailable',
      code: 'STRIPE_API_ERROR'
    };
  }

  if (error.type === 'StripeConnectionError') {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK_ERROR'
    };
  }

  if (error.type === 'StripeAuthenticationError') {
    console.error('[Stripe] Authentication error - check API keys');
    return {
      message: 'Payment configuration error. Please contact support.',
      code: 'CONFIG_ERROR'
    };
  }

  if (error.type === 'StripeRateLimitError') {
    return {
      message: 'Too many requests. Please wait and try again.',
      code: 'RATE_LIMIT'
    };
  }

  // Handle specific decline codes
  if (error.decline_code === 'insufficient_funds') {
    return {
      message: 'Bank account has insufficient funds for this transaction.',
      code: 'INSUFFICIENT_FUNDS'
    };
  }

  if (error.code === 'account_invalid') {
    return {
      message: 'Bank account is invalid or closed. Please verify account details.',
      code: 'ACCOUNT_INVALID'
    };
  }

  // Generic error
  return {
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'UNKNOWN_ERROR'
  };
}

/**
 * Log audit trail entry
 */
export async function logAudit(params: {
  companyId: string;
  userId?: string;
  action: string;
  details: any;
}) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        company_id: params.companyId,
        user_id: params.userId,
        action: params.action,
        details: params.details,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('[Audit] Failed to log:', error);
    // Non-fatal: Don't fail the operation if audit logging fails
  }
}

/**
 * Extract auth token from headers
 */
export function extractAuthToken(headers: Record<string, string | undefined>): string | null {
  const authHeader = headers.authorization || headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Retry wrapper for transient failures
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry for non-transient errors
      if (
        error.type === 'StripeCardError' ||
        error.type === 'StripeInvalidRequestError' ||
        error.statusCode === 400 ||
        error.statusCode === 401 ||
        error.statusCode === 403
      ) {
        throw error;
      }

      // Exponential backoff
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}

/**
 * Timeout wrapper for Netlify's 10-second limit
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 9000 // Leave 1 second buffer
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Verify webhook signature from Stripe
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Get customer by company ID
 */
export async function getCustomerByCompanyId(companyId: string): Promise<{
  customerId: string;
  paymentMethodId: string | null;
} | null> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('stripe_customer_id, stripe_payment_method_id')
    .eq('id', companyId)
    .single();

  if (error || !data || !data.stripe_customer_id) {
    return null;
  }

  return {
    customerId: data.stripe_customer_id,
    paymentMethodId: data.stripe_payment_method_id
  };
}

/**
 * Update company payment method in database
 */
export async function updateCompanyPaymentMethod(
  companyId: string,
  paymentMethodId: string,
  status: 'verified' | 'pending' | 'failed' = 'verified'
): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('companies')
    .update({
      stripe_payment_method_id: paymentMethodId,
      payment_method_status: status,
      payment_method_verified_at: status === 'verified' ? new Date().toISOString() : null
    })
    .eq('id', companyId);

  if (error) {
    throw new Error(`Failed to update company payment method: ${error.message}`);
  }
}

/**
 * Common headers for all responses
 */
export const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};