/**
 * Shared Dwolla Client Utility
 *
 * Provides common Dwolla API functionality for serverless functions.
 * Handles OAuth token generation, API requests, and error handling.
 *
 * @module dwolla-client
 */

import crypto from 'crypto';

/**
 * Dwolla API environment configuration
 */
export interface DwollaConfig {
  apiUrl: string;
  appKey: string;
  appSecret: string;
}

/**
 * Dwolla OAuth token response
 */
interface DwollaToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Dwolla API error response
 */
export interface DwollaError {
  code: string;
  message: string;
  _embedded?: {
    errors?: Array<{
      code: string;
      message: string;
      path?: string;
    }>;
  };
}

/**
 * Micro-deposit verification request
 */
export interface MicroDepositAmounts {
  amount1: {
    value: string;
    currency: 'USD';
  };
  amount2: {
    value: string;
    currency: 'USD';
  };
}

/**
 * Cached OAuth token to avoid unnecessary token generation
 */
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get Dwolla configuration from environment variables
 */
export function getDwollaConfig(): DwollaConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    apiUrl: process.env.DWOLLA_API_URL || (isDevelopment
      ? 'https://api-sandbox.dwolla.com'
      : 'https://api.dwolla.com'),
    appKey: process.env.DWOLLA_APP_KEY!,
    appSecret: process.env.DWOLLA_APP_SECRET!
  };
}

/**
 * Generate or retrieve cached Dwolla OAuth token
 * Tokens are cached for their lifetime minus 5 minutes for safety
 */
export async function getDwollaToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) { // 5 min buffer
    return cachedToken.token;
  }

  const config = getDwollaConfig();

  if (!config.appKey || !config.appSecret) {
    throw new Error('Dwolla credentials not configured in environment variables');
  }

  try {
    // Request new OAuth token
    const tokenResponse = await fetch(`${config.apiUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.appKey}:${config.appSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[Dwolla] Token generation failed:', error);
      throw new Error(`Failed to generate Dwolla token: ${tokenResponse.statusText}`);
    }

    const tokenData: DwollaToken = await tokenResponse.json();

    // Cache the token
    cachedToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000)
    };

    console.log('[Dwolla] New OAuth token generated, expires in:', tokenData.expires_in, 'seconds');
    return tokenData.access_token;
  } catch (error: any) {
    console.error('[Dwolla] Failed to get OAuth token:', error);
    throw new Error(`Dwolla authentication failed: ${error.message}`);
  }
}

/**
 * Verify micro-deposit amounts for a funding source
 *
 * @param fundingSourceUrl - The Dwolla funding source URL
 * @param amount1 - First micro-deposit amount in cents
 * @param amount2 - Second micro-deposit amount in cents
 * @returns Success status and any error details
 */
export async function verifyMicroDeposits(
  fundingSourceUrl: string,
  amount1: number,
  amount2: number
): Promise<{ success: boolean; error?: string; attemptsRemaining?: number }> {
  const config = getDwollaConfig();
  const token = await getDwollaToken();

  // Convert cents to dollars with 2 decimal places
  const amounts: MicroDepositAmounts = {
    amount1: {
      value: (amount1 / 100).toFixed(2),
      currency: 'USD'
    },
    amount2: {
      value: (amount2 / 100).toFixed(2),
      currency: 'USD'
    }
  };

  console.log('[Dwolla] Verifying micro-deposits:', {
    fundingSource: fundingSourceUrl,
    amount1: amounts.amount1.value,
    amount2: amounts.amount2.value
  });

  try {
    const response = await fetch(`${fundingSourceUrl}/micro-deposits`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.dwolla.v1.hal+json',
        'Content-Type': 'application/vnd.dwolla.v1.hal+json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(amounts)
    });

    // Success (200 OK)
    if (response.ok) {
      console.log('[Dwolla] Micro-deposits verified successfully');
      return { success: true };
    }

    // Parse error response
    const errorData: DwollaError = await response.json();
    console.error('[Dwolla] Micro-deposit verification failed:', errorData);

    // Handle specific error codes
    if (errorData.code === 'ValidationError' && errorData._embedded?.errors) {
      const errors = errorData._embedded.errors;

      // Check for incorrect amounts
      const incorrectAmounts = errors.some(e =>
        e.code === 'Invalid' && e.message.includes('amounts')
      );

      if (incorrectAmounts) {
        // Extract attempts remaining if available
        const attemptsMatch = errorData.message.match(/(\d+) attempt/);
        const attemptsRemaining = attemptsMatch ? parseInt(attemptsMatch[1]) : undefined;

        return {
          success: false,
          error: 'Incorrect amounts. Please check your bank statement and try again.',
          attemptsRemaining
        };
      }
    }

    // Check for max attempts exceeded
    if (errorData.code === 'MaxAttemptsExceeded' ||
        errorData.message?.includes('maximum number of attempts')) {
      return {
        success: false,
        error: 'Maximum verification attempts exceeded. Please contact support.',
        attemptsRemaining: 0
      };
    }

    // Generic error
    return {
      success: false,
      error: errorData.message || 'Verification failed. Please try again.'
    };

  } catch (error: any) {
    console.error('[Dwolla] Request failed:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
}

/**
 * Get funding source details
 *
 * @param fundingSourceUrl - The Dwolla funding source URL
 * @returns Funding source details or null if not found
 */
export async function getFundingSource(fundingSourceUrl: string): Promise<any | null> {
  const config = getDwollaConfig();
  const token = await getDwollaToken();

  try {
    const response = await fetch(fundingSourceUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.dwolla.v1.hal+json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('[Dwolla] Failed to get funding source:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error: any) {
    console.error('[Dwolla] Failed to get funding source:', error);
    return null;
  }
}

/**
 * Verify webhook signature from Dwolla
 *
 * @param signature - The X-Request-Signature-Sha-256 header value
 * @param body - The raw request body
 * @param secret - The webhook secret from Dwolla
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return signature === hash;
}

/**
 * Parse Dwolla error response and return user-friendly message
 *
 * @param error - The error from Dwolla API
 * @returns User-friendly error message
 */
export function parseDwollaError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error.code === 'ValidationError' && error._embedded?.errors) {
    const messages = error._embedded.errors.map((e: any) => e.message);
    return messages.join('. ');
  }

  if (error.message) {
    return error.message;
  }

  return 'An error occurred while processing your request. Please try again.';
}