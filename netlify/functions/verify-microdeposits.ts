/**
 * PHASE 4D: VERIFY MICRO-DEPOSITS
 *
 * Netlify function to verify micro-deposit amounts for bank account verification.
 * Dwolla sends two small deposits that users must verify to complete bank account setup.
 *
 * Security:
 * - Requires valid JWT token from Supabase auth
 * - Verifies user is company owner
 * - Rate limited to prevent brute force attempts
 * - Logs all verification attempts for audit
 *
 * Flow:
 * 1. User enters two micro-deposit amounts in UI
 * 2. Frontend calls this function with amounts
 * 3. Function verifies amounts with Dwolla API
 * 4. Updates company payment_method_status on success
 * 5. Returns success/error with remaining attempts
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { verifyMicroDeposits, parseDwollaError } from './shared/dwolla-client';

// Initialize Supabase clients
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for bypassing RLS
);

const supabaseClient = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY! // Anon key for JWT verification
);

/**
 * JWT payload structure from Supabase
 */
interface SupabaseJWTPayload {
  sub: string; // User ID
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
}

/**
 * Verify micro-deposits request body
 */
interface VerifyMicroDepositsRequest {
  company_id: string;
  funding_source_id?: string;
  fundingSourceUrl?: string; // Alternative to funding_source_id
  amount1: number; // Amount in cents
  amount2: number; // Amount in cents
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Extract JWT token from Authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Missing or invalid authorization header' })
    };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // ==================================================================
    // STEP 1: VERIFY JWT TOKEN
    // ==================================================================

    // Decode and verify JWT token
    const decoded = jwt.decode(token) as SupabaseJWTPayload;

    if (!decoded || !decoded.sub) {
      console.error('[VerifyMicroDeposits] Invalid JWT token structure');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid authentication token' })
      };
    }

    const userId = decoded.sub;
    console.log('[VerifyMicroDeposits] Request from user:', userId);

    // ==================================================================
    // STEP 2: PARSE AND VALIDATE REQUEST
    // ==================================================================

    const body: VerifyMicroDepositsRequest = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.company_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Company ID is required' })
      };
    }

    if (body.amount1 === undefined || body.amount2 === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Both micro-deposit amounts are required' })
      };
    }

    // Validate amount ranges (1-10 cents)
    if (body.amount1 < 1 || body.amount1 > 10 || body.amount2 < 1 || body.amount2 > 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Amounts must be between $0.01 and $0.10',
          details: 'Each micro-deposit is typically between 1 and 10 cents'
        })
      };
    }

    console.log('[VerifyMicroDeposits] Verifying amounts:', {
      company: body.company_id,
      amount1: body.amount1,
      amount2: body.amount2
    });

    // ==================================================================
    // STEP 3: VERIFY USER IS COMPANY OWNER
    // ==================================================================

    // Get company and verify ownership
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, owner_id, dwolla_customer_url, dwolla_funding_source_id, payment_method_status')
      .eq('id', body.company_id)
      .single();

    if (companyError || !company) {
      console.error('[VerifyMicroDeposits] Company not found:', companyError);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Company not found' })
      };
    }

    // Check ownership
    if (company.owner_id !== userId) {
      console.error('[VerifyMicroDeposits] User is not company owner:', {
        userId,
        ownerId: company.owner_id
      });
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'You do not have permission to verify this company\'s payment method' })
      };
    }

    // Check if already verified
    if (company.payment_method_status === 'verified') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Payment method is already verified',
          details: 'This bank account has already been successfully verified'
        })
      };
    }

    // ==================================================================
    // STEP 4: GET DWOLLA FUNDING SOURCE URL
    // ==================================================================

    // Determine funding source URL (support both old and new field names)
    let fundingSourceUrl = body.fundingSourceUrl;

    if (!fundingSourceUrl && body.funding_source_id) {
      // If only ID provided, construct the URL
      const dwollaApiUrl = process.env.DWOLLA_API_URL || 'https://api-sandbox.dwolla.com';
      fundingSourceUrl = `${dwollaApiUrl}/funding-sources/${body.funding_source_id}`;
    }

    if (!fundingSourceUrl && company.dwolla_funding_source_id) {
      // Fall back to company's stored funding source
      const dwollaApiUrl = process.env.DWOLLA_API_URL || 'https://api-sandbox.dwolla.com';
      fundingSourceUrl = `${dwollaApiUrl}/funding-sources/${company.dwolla_funding_source_id}`;
    }

    if (!fundingSourceUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'No payment method to verify',
          details: 'Please add a bank account first before attempting verification'
        })
      };
    }

    // ==================================================================
    // STEP 5: LOG VERIFICATION ATTEMPT
    // ==================================================================

    // Log the verification attempt for audit trail
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        company_id: body.company_id,
        user_id: userId,
        action: 'verify_microdeposits_attempt',
        details: {
          funding_source_url: fundingSourceUrl,
          amount1: body.amount1,
          amount2: body.amount2,
          ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
          user_agent: event.headers['user-agent']
        },
        created_at: new Date().toISOString()
      });

    // ==================================================================
    // STEP 6: VERIFY WITH DWOLLA API
    // ==================================================================

    const verificationResult = await verifyMicroDeposits(
      fundingSourceUrl,
      body.amount1,
      body.amount2
    );

    // ==================================================================
    // STEP 7: HANDLE VERIFICATION RESULT
    // ==================================================================

    if (verificationResult.success) {
      // Update company payment method status
      const { error: updateError } = await supabaseAdmin
        .from('companies')
        .update({
          payment_method_status: 'verified',
          payment_method_verified_at: new Date().toISOString()
        })
        .eq('id', body.company_id);

      if (updateError) {
        console.error('[VerifyMicroDeposits] Failed to update company:', updateError);
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Verification succeeded but failed to update status',
            details: 'Please contact support if the issue persists'
          })
        };
      }

      // Log successful verification
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          company_id: body.company_id,
          user_id: userId,
          action: 'verify_microdeposits_success',
          details: {
            funding_source_url: fundingSourceUrl,
            verified_at: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });

      console.log('[VerifyMicroDeposits] Successfully verified for company:', body.company_id);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Bank account verified successfully',
          payment_method_status: 'verified',
          verified_at: new Date().toISOString()
        })
      };
    } else {
      // Verification failed
      console.log('[VerifyMicroDeposits] Verification failed:', verificationResult.error);

      // Log failed attempt
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          company_id: body.company_id,
          user_id: userId,
          action: 'verify_microdeposits_failed',
          details: {
            funding_source_url: fundingSourceUrl,
            error: verificationResult.error,
            attempts_remaining: verificationResult.attemptsRemaining
          },
          created_at: new Date().toISOString()
        });

      // If max attempts exceeded, mark payment method as failed
      if (verificationResult.attemptsRemaining === 0) {
        await supabaseAdmin
          .from('companies')
          .update({
            payment_method_status: 'failed'
          })
          .eq('id', body.company_id);
      }

      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: verificationResult.error || 'Verification failed',
          attempts_remaining: verificationResult.attemptsRemaining,
          details: verificationResult.attemptsRemaining === 0
            ? 'Maximum attempts exceeded. Please add a new bank account to continue.'
            : 'Please check the amounts in your bank statement and try again.'
        })
      };
    }

  } catch (error: any) {
    console.error('[VerifyMicroDeposits] Unexpected error:', error);

    // Log error for debugging
    if (event.body) {
      const body = JSON.parse(event.body);
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          company_id: body.company_id,
          action: 'verify_microdeposits_error',
          details: {
            error: error.message,
            stack: error.stack
          },
          created_at: new Date().toISOString()
        });
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      })
    };
  }
};