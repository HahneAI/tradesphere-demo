/**
 * STRIPE ACH PAYMENT SERVICE
 *
 * Centralized service for Stripe API integration with ACH payments and Plaid instant verification.
 * Handles customer creation, ACH payment methods, PaymentIntents, and instant bank verification.
 *
 * IMPORTANT: This service can be used by BOTH the website (owner signup)
 * and the app (subscription management).
 *
 * KEY ADVANTAGES OVER DWOLLA:
 * - No SSN required for receiving payments
 * - Instant bank verification via Plaid (no micro-deposits)
 * - Lower fees: 0.8% capped at $5 per transaction
 * - Unified payment platform (ACH + cards if needed later)
 */

import Stripe from 'stripe';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Generic Stripe API Response
 */
export interface StripeResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    type?: string;
    declineCode?: string;
  };
}

/**
 * Response from createCustomer()
 */
export interface CreateStripeCustomerResponse extends StripeResponse {
  data?: {
    customerId: string;
    customer: Stripe.Customer;
  };
}

/**
 * Response from attachPaymentMethod()
 */
export interface AttachPaymentMethodResponse extends StripeResponse {
  data?: {
    paymentMethod: Stripe.PaymentMethod;
  };
}

/**
 * Response from createPaymentIntent()
 */
export interface CreatePaymentIntentResponse extends StripeResponse {
  data?: {
    paymentIntentId: string;
    clientSecret: string;
    status: string;
    amount: number;
  };
}

/**
 * Response from verifyBankAccount()
 */
export interface VerifyBankAccountResponse extends StripeResponse {
  data?: {
    verified: boolean;
    status: string;
    paymentMethodId: string;
  };
}

/**
 * Parameters for creating a Stripe customer
 */
export interface CreateStripeCustomerParams {
  email: string;
  companyName: string;
  metadata?: Record<string, string>;
}

/**
 * Parameters for creating a PaymentIntent
 */
export interface CreatePaymentIntentParams {
  customerId: string;
  amount: number; // in cents (e.g., 200000 = $2000)
  paymentMethodId: string;
  metadata?: Record<string, string>;
}

// ============================================================================
// STRIPE SERVICE CLASS
// ============================================================================

export class StripeService {
  private stripe: Stripe;
  private static instance: StripeService;

  /**
   * Private constructor for singleton pattern
   *
   * SECURITY: Stripe credentials must ONLY be available server-side.
   * This service should only be used in Netlify functions, never in browser code.
   */
  private constructor() {
    // Validate environment variables (server-side only)
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        'Stripe credentials not configured. Set STRIPE_SECRET_KEY environment variable. ' +
        'This service can only be used server-side (Netlify functions), never in browser code.'
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-09-30.clover', // Latest API version with TypeScript support
      typescript: true
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  // ============================================================================
  // CUSTOMER MANAGEMENT
  // ============================================================================

  /**
   * Create a Stripe customer for a new company
   *
   * Called during website onboarding when a company signs up.
   *
   * @param params Customer creation parameters
   * @returns Customer ID and full customer object
   *
   * @example
   * const { data } = await stripe.createCustomer({
   *   email: 'owner@company.com',
   *   companyName: 'ABC Landscaping',
   *   metadata: {
   *     company_id: 'uuid-from-supabase',
   *     onboarding_date: '2025-01-15'
   *   }
   * });
   * console.log(data.customerId); // cus_xxxxx
   */
  async createCustomer(params: CreateStripeCustomerParams): Promise<CreateStripeCustomerResponse> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.companyName,
        description: `TradeSphere customer for ${params.companyName}`,
        metadata: {
          company_name: params.companyName,
          ...params.metadata
        }
      });

      return {
        success: true,
        data: {
          customerId: customer.id,
          customer
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Get customer details
   *
   * @param customerId Stripe customer ID (cus_xxxxx)
   * @returns Customer object
   *
   * @example
   * const customer = await stripe.getCustomer('cus_xxxxx');
   * console.log(customer.email, customer.name);
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
  }

  /**
   * Update customer details
   *
   * @param customerId Stripe customer ID
   * @param updates Fields to update
   * @returns Updated customer object
   *
   * @example
   * const customer = await stripe.updateCustomer('cus_xxxxx', {
   *   email: 'newemail@company.com',
   *   metadata: { updated_at: '2025-01-15' }
   * });
   */
  async updateCustomer(
    customerId: string,
    updates: Stripe.CustomerUpdateParams
  ): Promise<Stripe.Customer> {
    return await this.stripe.customers.update(customerId, updates);
  }

  // ============================================================================
  // PAYMENT METHODS (ACH WITH PLAID INSTANT VERIFICATION)
  // ============================================================================

  /**
   * Attach a payment method to a customer
   *
   * IMPORTANT: Payment methods are created CLIENT-SIDE via Stripe.js + Plaid.
   * This method attaches an existing payment method to a customer.
   *
   * Flow:
   * 1. Client: User connects bank via Plaid Link
   * 2. Client: Stripe.js creates payment method with Plaid token
   * 3. Server: This method attaches payment method to customer
   *
   * @param customerId Stripe customer ID
   * @param paymentMethodId Payment method ID (pm_xxxxx)
   * @returns Attached payment method
   *
   * @example
   * const { data } = await stripe.attachPaymentMethod(
   *   'cus_xxxxx',
   *   'pm_xxxxx'  // Created client-side via Stripe.js
   * );
   * console.log(data.paymentMethod.us_bank_account.last4);
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<AttachPaymentMethodResponse> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      return {
        success: true,
        data: {
          paymentMethod
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Set a payment method as the default for future payments
   *
   * This payment method will be used for all subscription charges.
   *
   * @param customerId Stripe customer ID
   * @param paymentMethodId Payment method ID to set as default
   * @returns Updated customer object
   *
   * @example
   * const customer = await stripe.setDefaultPaymentMethod(
   *   'cus_xxxxx',
   *   'pm_xxxxx'
   * );
   * console.log(customer.invoice_settings.default_payment_method);
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.Customer> {
    return await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
  }

  /**
   * Detach (remove) a payment method from a customer
   *
   * Use this when customer wants to remove a bank account.
   *
   * @param paymentMethodId Payment method ID to detach
   * @returns Detached payment method
   *
   * @example
   * const { data } = await stripe.detachPaymentMethod('pm_xxxxx');
   * console.log(data.paymentMethod.customer); // null (detached)
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<AttachPaymentMethodResponse> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);

      return {
        success: true,
        data: {
          paymentMethod
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Get all payment methods for a customer
   *
   * Returns only ACH payment methods (us_bank_account type).
   *
   * @param customerId Stripe customer ID
   * @returns List of payment methods
   *
   * @example
   * const paymentMethods = await stripe.listPaymentMethods('cus_xxxxx');
   * paymentMethods.forEach(pm => {
   *   console.log(pm.us_bank_account.bank_name, pm.us_bank_account.last4);
   * });
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const response = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'us_bank_account'
    });

    return response.data;
  }

  /**
   * Get a single payment method by ID
   *
   * @param paymentMethodId Payment method ID
   * @returns Payment method object
   *
   * @example
   * const pm = await stripe.getPaymentMethod('pm_xxxxx');
   * console.log(pm.us_bank_account.routing_number);
   */
  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return await this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  // ============================================================================
  // PAYMENTS (PAYMENTINTENTS FOR ACH)
  // ============================================================================

  /**
   * Create a PaymentIntent for monthly subscription payment
   *
   * ACH payments take 4 business days to process (same as Dwolla).
   * PaymentIntent will have status 'processing' initially.
   *
   * IMPORTANT: Use PaymentIntents (not Charges) for ACH payments.
   * This provides better error handling and webhook events.
   *
   * @param params Payment parameters
   * @returns PaymentIntent ID, client secret, and status
   *
   * @example
   * const { data } = await stripe.createPaymentIntent({
   *   customerId: 'cus_xxxxx',
   *   amount: 200000,  // $2000.00 in cents
   *   paymentMethodId: 'pm_xxxxx',
   *   metadata: {
   *     company_id: 'uuid',
   *     billing_period: '2025-01-01',
   *     invoice_id: 'INV-12345'
   *   }
   * });
   *
   * // PaymentIntent will process in 4 business days
   * // Webhook: payment_intent.succeeded will fire when complete
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: 'usd',
        customer: params.customerId,
        payment_method: params.paymentMethodId,
        payment_method_types: ['us_bank_account'],
        confirm: true, // Auto-confirm the payment
        metadata: {
          ...params.metadata
        }
      });

      return {
        success: true,
        data: {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret || '',
          status: paymentIntent.status,
          amount: paymentIntent.amount
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Retrieve a PaymentIntent by ID
   *
   * Use this to check payment status.
   *
   * @param paymentIntentId PaymentIntent ID (pi_xxxxx)
   * @returns PaymentIntent object
   *
   * @example
   * const pi = await stripe.getPaymentIntent('pi_xxxxx');
   * console.log(pi.status); // 'processing', 'succeeded', 'failed'
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Cancel a pending PaymentIntent
   *
   * Only works if payment is still in 'processing' or 'requires_action' status.
   *
   * @param paymentIntentId PaymentIntent ID to cancel
   * @returns Cancelled PaymentIntent
   *
   * @example
   * const pi = await stripe.cancelPaymentIntent('pi_xxxxx');
   * console.log(pi.status); // 'canceled'
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  /**
   * List all PaymentIntents for a customer (payment history)
   *
   * @param customerId Customer ID
   * @param limit Number of payments to retrieve (default 100)
   * @returns List of PaymentIntents
   *
   * @example
   * const payments = await stripe.listPaymentIntents('cus_xxxxx', 10);
   * payments.forEach(pi => {
   *   console.log(pi.created, pi.amount, pi.status);
   * });
   */
  async listPaymentIntents(customerId: string, limit: number = 100): Promise<Stripe.PaymentIntent[]> {
    const response = await this.stripe.paymentIntents.list({
      customer: customerId,
      limit
    });

    return response.data;
  }

  // ============================================================================
  // INSTANT VERIFICATION (PLAID)
  // ============================================================================

  /**
   * Verify a bank account using Stripe's automatic verification
   *
   * IMPORTANT: With Plaid integration, bank accounts are verified INSTANTLY.
   * No micro-deposits needed. This method checks verification status.
   *
   * Verification happens automatically when:
   * 1. User connects bank via Plaid Link (client-side)
   * 2. Stripe.js creates payment method with Plaid token
   * 3. Payment method is attached to customer (this service)
   *
   * @param paymentMethodId Payment method ID to check
   * @returns Verification status
   *
   * @example
   * const { data } = await stripe.verifyBankAccount('pm_xxxxx');
   * console.log(data.verified); // true (instant with Plaid)
   * console.log(data.status);   // 'verified'
   */
  async verifyBankAccount(paymentMethodId: string): Promise<VerifyBankAccountResponse> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

      // Check if payment method has us_bank_account
      if (paymentMethod.type !== 'us_bank_account') {
        return {
          success: false,
          error: {
            code: 'INVALID_PAYMENT_METHOD_TYPE',
            message: 'Payment method is not a US bank account'
          }
        };
      }

      // With Plaid, accounts are verified instantly via account_holder_type
      // Check verification status via status_details
      const statusDetails = paymentMethod.us_bank_account as any;
      const verified = statusDetails?.status === 'verified' ||
                       statusDetails?.verification_method === 'instant';

      return {
        success: true,
        data: {
          verified,
          status: statusDetails?.status || 'verified',
          paymentMethodId: paymentMethod.id
        }
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // WEBHOOK SIGNATURE VERIFICATION
  // ============================================================================

  /**
   * Verify Stripe webhook signature
   *
   * Uses Stripe's built-in constructEvent method for security.
   * This prevents webhook spoofing attacks.
   *
   * IMPORTANT: Use this in your webhook handler (Netlify function).
   *
   * @param payload Raw request body (string or Buffer)
   * @param signature Stripe-Signature header
   * @param secret Webhook secret from Stripe dashboard (whsec_xxxxx)
   * @returns Verified Stripe event
   * @throws Error if signature is invalid
   *
   * @example
   * // In Netlify function webhook handler:
   * try {
   *   const event = StripeService.verifyWebhookSignature(
   *     request.body,
   *     request.headers['stripe-signature'],
   *     process.env.STRIPE_WEBHOOK_SECRET
   *   );
   *
   *   // Process verified event
   *   if (event.type === 'payment_intent.succeeded') {
   *     const paymentIntent = event.data.object;
   *     // Update database...
   *   }
   * } catch (err) {
   *   // Invalid signature - reject webhook
   *   return { statusCode: 400 };
   * }
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-09-30.clover'
    });

    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Format dollar amount for Stripe API (convert to cents)
   *
   * Stripe uses cents for all amounts (no decimals).
   *
   * @param dollars Amount in dollars (e.g., 2000.50)
   * @returns Amount in cents (e.g., 200050)
   *
   * @example
   * const cents = StripeService.formatAmount(2000.50);
   * console.log(cents); // 200050
   */
  static formatAmount(dollars: number): number {
    return Math.round(dollars * 100);
  }

  /**
   * Parse amount from Stripe (convert from cents to dollars)
   *
   * @param cents Amount in cents from Stripe (e.g., 200050)
   * @returns Amount in dollars (e.g., 2000.50)
   *
   * @example
   * const dollars = StripeService.parseAmount(200050);
   * console.log(dollars); // 2000.50
   */
  static parseAmount(cents: number): number {
    return cents / 100;
  }

  /**
   * Handle Stripe API errors with proper typing
   *
   * Converts Stripe errors to standardized StripeResponse format.
   */
  private handleError(error: any): StripeResponse {
    console.error('Stripe API Error:', error);

    let errorMessage = 'An unknown error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    let errorType = '';
    let declineCode = '';

    if (error.type) {
      // Stripe error object
      errorType = error.type;
      errorCode = error.code || 'STRIPE_ERROR';
      errorMessage = error.message || errorMessage;

      // Decline codes for card/ACH failures
      if (error.decline_code) {
        declineCode = error.decline_code;
      }

      // Common Stripe error types:
      // - StripeCardError: Card declined, insufficient funds, etc.
      // - StripeInvalidRequestError: Invalid parameters
      // - StripeAPIError: Stripe API error
      // - StripeConnectionError: Network error
      // - StripeAuthenticationError: Invalid API key
      // - StripeRateLimitError: Too many requests

      // Make error messages user-friendly
      if (errorCode === 'payment_intent_unexpected_state') {
        errorMessage = 'This payment is already being processed. Please wait.';
      } else if (errorCode === 'insufficient_funds') {
        errorMessage = 'Insufficient funds in bank account. Please use a different account.';
      } else if (declineCode === 'insufficient_funds') {
        errorMessage = 'Bank account has insufficient funds for this transaction.';
      } else if (errorCode === 'account_invalid') {
        errorMessage = 'Bank account is invalid or closed. Please verify account details.';
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        type: errorType,
        declineCode
      }
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export singleton instance (default export for backward compatibility)
export const stripe = StripeService.getInstance();

// Export class for testing and custom instances
export default StripeService;
