/**
 * PHASE 4B: PAYMENT & BILLING TYPE DEFINITIONS
 *
 * TypeScript types for Stripe payment integration and subscription management.
 * Provides type safety for Stripe API responses, webhook events, and payment data.
 */

import type Stripe from 'stripe';

// ============================================================================
// PAYMENT STATUS ENUMS
// ============================================================================

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled'
}

export enum PaymentMethodStatus {
  PENDING = 'pending',        // Awaiting verification
  VERIFIED = 'verified',      // Verified and ready for use
  FAILED = 'failed',          // Verification failed
  SUSPENDED = 'suspended'     // Account issues
}

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings'
}

export enum PaymentMethodVerificationStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  REMOVED = 'removed'
}

// ============================================================================
// STRIPE SDK TYPE RE-EXPORTS
// ============================================================================

/**
 * Re-export commonly used Stripe SDK types for convenience
 * Import directly from Stripe SDK to ensure type compatibility
 */
export type StripeCustomer = Stripe.Customer;
export type StripePaymentMethod = Stripe.PaymentMethod;
export type StripePaymentIntent = Stripe.PaymentIntent;
export type StripeCharge = Stripe.Charge;
export type StripeDispute = Stripe.Dispute;
export type StripeEvent = Stripe.Event;
export type StripeSetupIntent = Stripe.SetupIntent;

// ============================================================================
// APPLICATION PAYMENT TYPES
// ============================================================================

/**
 * Payment Record (Supabase)
 * Represents a payment transaction in our database
 */
export interface Payment {
  id: string;
  company_id: string;
  amount: number;
  status: PaymentStatus;
  payment_type: 'monthly_subscription' | 'setup_fee' | 'addon' | 'refund';
  subscription_period_start?: string;
  subscription_period_end?: string;

  // Stripe payment references
  stripe_payment_intent_id?: string;  // PaymentIntent ID (pi_xxx)
  stripe_charge_id?: string;          // Charge ID (ch_xxx) - set when payment succeeds

  bank_account_name?: string;
  bank_account_last4?: string;
  failure_code?: string;
  failure_message?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Payment Webhook Record (Supabase)
 * Logs all Stripe webhook events for audit and replay
 */
export interface PaymentWebhook {
  id: string;
  event_type: string;
  payload: StripeEvent;
  company_id?: string;
  payment_id?: string;
  processed: boolean;
  processed_at?: string;
  error?: string;
  retry_count: number;
  created_at: string;
}

/**
 * Company Billing Info (Supabase companies table)
 * Subscription and payment method details
 */
export interface CompanyBilling {
  id: string;
  name: string;
  email: string;
  subscription_status: SubscriptionStatus;
  subscription_tier: 'trial' | 'standard' | 'pro' | 'enterprise';
  trial_end_date?: string;
  next_billing_date?: string;
  monthly_amount: number;

  // Stripe customer and payment method references
  stripe_customer_id?: string;          // Customer ID (cus_xxx)
  stripe_payment_method_id?: string;    // PaymentMethod ID (pm_xxx)
  stripe_setup_intent_id?: string;      // SetupIntent ID (seti_xxx) - used during Plaid flow

  payment_method_status: PaymentMethodStatus;
  payment_method_verified_at?: string;
  billing_email?: string;
  billing_name?: string;
  billing_cycle_day: number;
  last_payment_failed_at?: string;
  payment_failure_count: number;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STRIPE SERVICE METHOD PARAMETERS
// ============================================================================

/**
 * Parameters for creating a Stripe customer
 */
export interface CreateStripeCustomerParams {
  email: string;
  companyName: string;
  metadata?: Record<string, string>;
}

/**
 * Parameters for attaching a payment method to a customer
 * Payment method is created client-side via Stripe.js + Plaid integration
 */
export interface AttachPaymentMethodParams {
  customerId: string;           // Stripe Customer ID (cus_xxx)
  paymentMethodId: string;      // Payment Method ID created client-side (pm_xxx)
}

/**
 * Parameters for creating a payment intent (charge)
 */
export interface CreatePaymentIntentParams {
  customerId: string;           // Stripe Customer ID (cus_xxx)
  amount: number;               // Amount in cents (e.g., 2000 = $20.00)
  paymentMethodId: string;      // Payment Method ID (pm_xxx)
  metadata?: Record<string, string>;  // Custom data (company_id, subscription_period, etc.)
}

// ============================================================================
// STRIPE SERVICE RESPONSE TYPES
// ============================================================================

/**
 * Generic Stripe API Response
 * Wrapper for all Stripe service method responses
 */
export interface StripeResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    type?: 'card_error' | 'invalid_request_error' | 'api_error' | 'idempotency_error' | 'rate_limit_error' | 'authentication_error';
    decline_code?: string;
    param?: string;
  };
}

/**
 * Response from createCustomer()
 */
export interface CreateCustomerResponse extends StripeResponse {
  data?: {
    customerId: string;           // Stripe Customer ID (cus_xxx)
    customer: StripeCustomer;     // Full Stripe Customer object
  };
}

/**
 * Response from attachPaymentMethod()
 */
export interface AttachPaymentMethodResponse extends StripeResponse {
  data?: {
    paymentMethod: StripePaymentMethod;  // Full Stripe PaymentMethod object
  };
}

/**
 * Response from createPaymentIntent()
 */
export interface CreatePaymentIntentResponse extends StripeResponse {
  data?: {
    paymentIntentId: string;      // PaymentIntent ID (pi_xxx)
    clientSecret: string;         // Client secret for confirmation (if needed)
    status: string;               // PaymentIntent status
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Subscription plan configuration
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'annual';
  features: string[];
  maxUsers?: number;
  maxCustomers?: number;
}

/**
 * Payment method details (for UI display)
 */
export interface PaymentMethod {
  id: string;
  type: 'bank_account';
  bankName: string;
  accountType: BankAccountType;
  last4: string;
  status: PaymentMethodVerificationStatus;
  isDefault: boolean;
}

/**
 * Billing summary (for dashboard display)
 */
export interface BillingSummary {
  subscriptionStatus: SubscriptionStatus;
  currentPlan: string;
  nextBillingDate?: string;
  monthlyAmount: number;
  paymentMethod?: PaymentMethod;
  recentPayments: Payment[];
  trialEndsAt?: string;
  daysUntilTrial?: number;
}
