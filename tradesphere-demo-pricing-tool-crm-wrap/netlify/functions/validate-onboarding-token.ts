/**
 * PHASE 4C: VALIDATE ONBOARDING TOKEN
 *
 * Netlify function to validate onboarding session tokens and create Supabase auth session.
 *
 * Flow:
 * 1. Owner clicks email link with token: /onboarding?token=ABC123
 * 2. Frontend calls this function to validate token
 * 3. Function validates token, marks as used, creates auth session
 * 4. Returns session data for auto-authentication
 *
 * Security:
 * - Token is one-time use only
 * - Token expires after 24 hours
 * - IP address and user agent logged
 * - Uses database helper functions for validation
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Admin key for session creation
);

export const handler: Handler = async (event: HandlerEvent) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token } = JSON.parse(event.body!);

    if (!token || typeof token !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Token is required' })
      };
    }

    // ==================================================================
    // STEP 1: VALIDATE TOKEN USING DATABASE HELPER FUNCTION
    // ==================================================================

    const { data: sessionData, error: validateError } = await supabaseAdmin.rpc(
      'validate_onboarding_token',
      { token_input: token }
    );

    if (validateError || !sessionData || sessionData.length === 0) {
      console.error('[OnboardingToken] Validation failed:', validateError);
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Invalid, expired, or already used token',
          details: validateError?.message
        })
      };
    }

    const session = sessionData[0];  // validate_onboarding_token returns single row

    console.log('[OnboardingToken] Token validated for user:', session.user_email);

    // ==================================================================
    // STEP 2: MARK TOKEN AS USED
    // ==================================================================

    const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    const { data: markUsedResult, error: markUsedError } = await supabaseAdmin.rpc(
      'mark_onboarding_token_used',
      {
        token_input: token,
        ip_address_input: ipAddress,
        user_agent_input: userAgent
      }
    );

    if (markUsedError) {
      console.error('[OnboardingToken] Failed to mark token as used:', markUsedError);
      // Non-fatal: Continue with session creation
    } else if (!markUsedResult) {
      console.warn('[OnboardingToken] Token already used or expired');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Token already used or expired' })
      };
    }

    // ==================================================================
    // STEP 3: CREATE SUPABASE AUTH SESSION
    // ==================================================================

    const { data: authSession, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: session.user_email
    });

    if (sessionError || !authSession) {
      console.error('[OnboardingToken] Failed to create auth session:', sessionError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to create authentication session',
          details: sessionError?.message
        })
      };
    }

    console.log('[OnboardingToken] Auth session created for user:', session.user_email);

    // ==================================================================
    // STEP 4: RETURN SUCCESS WITH SESSION DATA
    // ==================================================================

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        session: {
          access_token: authSession.properties.action_link,
          user: {
            id: session.user_id,
            email: session.user_email
          }
        },
        company: {
          id: session.company_id,
          name: session.company_name
        },
        message: 'Token validated successfully'
      })
    };

  } catch (error: any) {
    console.error('[OnboardingToken] Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
