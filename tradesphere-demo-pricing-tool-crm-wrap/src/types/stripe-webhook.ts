/**
 * STRIPE WEBHOOK TYPE DEFINITIONS
 *
 * TypeScript types for Stripe webhook events and responses.
 * Provides type safety for webhook handler and payment processing.
 *
 * NOTE: These types extend the official Stripe SDK types with our
 * application-specific interfaces for database records.
 */

import type Stripe from 'stripe';

// ============================================================================
// STRIPE WEBHOOK EVENT TYPES
// ============================================================================

/**
 * Stripe Webhook Topics
 * All webhook event types we handle in stripe-webhook.ts
 */
export type StripeWebhookTopic =
  // Payment Intent Events (subscription billing lifecycle)
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.processing'
  | 'payment_intent.canceled'

  // Payment Method Events (bank account management)
  | 'payment_method.attached'
  | 'payment_method.detached'
  | 'payment_method.automatically_updated'

  // Charge Events (disputes and refunds)
  | 'charge.dispute.created'
  | 'charge.dispute.closed'
  | 'charge.refunded'

  // Customer Events (customer lifecycle)
  | 'customer.updated'
  | 'customer.deleted';

// ============================================================================
// STRIPE WEBHOOK RECORD (SUPABASE)
// ============================================================================

/**
 * Stripe Webhook Record (Supabase stripe_webhooks table)
 * Logs all Stripe webhook events for audit, replay, and debugging
 */
export interface StripeWebhookRecord {
  id: string;
  event_type: StripeWebhookTopic;
  payload: Stripe.Event;
  company_id?: string;
  payment_id?: string;
  processed: boolean;
  processed_at?: string;
  error?: string;
  retry_count: number;
  created_at: string;
}

// ============================================================================
// PAYMENT RECORD WITH STRIPE FIELDS
// ============================================================================

/**
 * Payment Record (Supabase payments table)
 * Updated for Stripe integration with new column names
 */
export interface StripePayment {
  id: string;
  company_id: string;
  amount: number;
  status: PaymentStatus;
  payment_type: 'monthly_subscription' | 'setup_fee' | 'addon' | 'refund';
  subscription_period_start?: string;
  subscription_period_end?: string;

  // Stripe-specific fields (migration 18)
  stripe_payment_intent_id?: string;  // PaymentIntent ID (pi_xxx)
  stripe_charge_id?: string;          // Charge ID (ch_xxx) - set when payment succeeds

  // Payment method details
  bank_account_name?: string;
  bank_account_last4?: string;

  // Failure tracking
  failure_code?: string;
  failure_message?: string;

  // Timestamps
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Payment Status Enum
 * Matches Stripe PaymentIntent status values
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// ============================================================================
// COMPANY BILLING WITH STRIPE FIELDS
// ============================================================================

/**
 * Company Billing Info (Supabase companies table)
 * Updated for Stripe integration
 */
export interface StripeCompanyBilling {
  id: string;
  name: string;
  email: string;

  // Subscription details
  subscription_status: SubscriptionStatus;
  subscription_tier: 'trial' | 'standard' | 'pro' | 'enterprise';
  trial_end_date?: string;
  next_billing_date?: string;
  monthly_amount: number;

  // Stripe-specific fields (migration 18)
  stripe_customer_id?: string;          // Customer ID (cus_xxx)
  stripe_payment_method_id?: string;    // PaymentMethod ID (pm_xxx)
  stripe_setup_intent_id?: string;      // SetupIntent ID (seti_xxx) - used during Plaid flow

  // Payment method status
  payment_method_status: PaymentMethodStatus;
  payment_method_verified_at?: string;

  // Billing details
  billing_email?: string;
  billing_name?: string;
  billing_cycle_day: number;

  // Failure tracking
  last_payment_failed_at?: string;
  payment_failure_count: number;

  // Cancellation
  cancelled_at?: string;
  cancellation_reason?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Subscription Status Enum
 */
export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled'
}

/**
 * Payment Method Status Enum
 */
export enum PaymentMethodStatus {
  PENDING = 'pending',      // Awaiting verification
  VERIFIED = 'verified',    // Verified via Plaid instant verification
  FAILED = 'failed',        // Verification failed
  SUSPENDED = 'suspended'   // Account issues
}

// ============================================================================
// STRIPE EVENT HANDLER TYPES
// ============================================================================

/**
 * Webhook Event Handler Function Type
 * All event handlers follow this signature
 */
export type StripeWebhookHandler = (
  event: Stripe.Event,
  webhookId: string
) => Promise<void>;

/**
 * Webhook Processing Result
 * Returned by event handler functions
 */
export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  eventType: StripeWebhookTopic;
  companyId?: string;
  paymentId?: string;
  error?: string;
}

// ============================================================================
// STRIPE ERROR TYPES
// ============================================================================

/**
 * Stripe Payment Error Details
 * Extracted from PaymentIntent.last_payment_error
 */
export interface StripePaymentError {
  code: string;
  message: string;
  decline_code?: string;
  type: 'card_error' | 'invalid_request_error' | 'api_error' | 'idempotency_error' | 'rate_limit_error' | 'authentication_error' | 'invalid_grant';
  doc_url?: string;
  param?: string;
  payment_method?: {
    id: string;
    type: string;
  };
}

/**
 * Common ACH Error Codes
 * Based on NACHA return codes mapped to Stripe error codes
 */
export enum ACHErrorCode {
  // Insufficient funds
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  R01 = 'R01',  // Insufficient funds

  // Invalid account
  ACCOUNT_CLOSED = 'account_closed',
  R02 = 'R02',  // Account closed
  R03 = 'R03',  // No account/unable to locate
  R04 = 'R04',  // Invalid account number

  // Authorization issues
  AUTHORIZATION_REVOKED = 'authorization_revoked',
  R07 = 'R07',  // Authorization revoked by customer
  R08 = 'R08',  // Payment stopped
  R10 = 'R10',  // Customer advises not authorized

  // Bank processing issues
  R09 = 'R09',  // Uncollected funds
  R13 = 'R13',  // Invalid ACH routing number
  R14 = 'R14',  // Representative payee deceased or unable to continue
  R15 = 'R15',  // Beneficiary or account holder deceased

  // Other common errors
  R16 = 'R16',  // Account frozen
  R20 = 'R20',  // Non-transaction account
  R29 = 'R29',  // Corporate customer advises not authorized
}

// ============================================================================
// STRIPE DISPUTE TYPES
// ============================================================================

/**
 * Dispute Reason
 * Common reasons for ACH disputes
 */
export enum DisputeReason {
  UNAUTHORIZED = 'unauthorized',
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  UNRECOGNIZED = 'unrecognized',
  CREDIT_NOT_PROCESSED = 'credit_not_processed',
  GENERAL = 'general',
  INCORRECT_ACCOUNT_DETAILS = 'incorrect_account_details',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  BANK_CANNOT_PROCESS = 'bank_cannot_process',
  DEBIT_NOT_AUTHORIZED = 'debit_not_authorized',
  CUSTOMER_INITIATED = 'customer_initiated'
}

/**
 * Dispute Status
 */
export enum DisputeStatus {
  WARNING_NEEDS_RESPONSE = 'warning_needs_response',
  WARNING_UNDER_REVIEW = 'warning_under_review',
  WARNING_CLOSED = 'warning_closed',
  NEEDS_RESPONSE = 'needs_response',
  UNDER_REVIEW = 'under_review',
  CHARGE_REFUNDED = 'charge_refunded',
  WON = 'won',
  LOST = 'lost'
}

// ============================================================================
// STRIPE PAYMENT METHOD TYPES
// ============================================================================

/**
 * Bank Account Type
 * Used for ACH payment methods
 */
export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings'
}

/**
 * Payment Method Details (for UI display)
 */
export interface StripePaymentMethodDetails {
  id: string;
  type: 'us_bank_account';
  bankName?: string;
  accountType: BankAccountType;
  last4: string;
  routingNumber: string;
  status: 'verified' | 'unverified' | 'errored';
  isDefault: boolean;
  fingerprint?: string;
}

// ============================================================================
// WEBHOOK HANDLER HELPER TYPES
// ============================================================================

/**
 * Database Function Parameters
 * For record_payment_success() and record_payment_failure()
 */
export interface RecordPaymentSuccessParams {
  company_id_input: string;  // UUID
}

export interface RecordPaymentFailureParams {
  company_id_input: string;  // UUID
}

/**
 * Webhook Idempotency Check Result
 */
export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  existingWebhookId?: string;
  alreadyProcessed: boolean;
}

/**
 * Company Lookup Result
 * Used in webhook handlers to find company by Stripe customer ID
 */
export interface CompanyLookupResult {
  id: string;
  subscription_status: SubscriptionStatus;
  payment_method_status: PaymentMethodStatus;
  stripe_customer_id?: string;
  stripe_payment_method_id?: string;
}

// ============================================================================
// WEBHOOK RESPONSE TYPES
// ============================================================================

/**
 * Webhook Handler Success Response
 */
export interface WebhookSuccessResponse {
  statusCode: 200;
  body: string;  // JSON stringified
  data: {
    received: true;
    eventId: string;
    type: StripeWebhookTopic;
    duplicate?: boolean;
  };
}

/**
 * Webhook Handler Error Response
 */
export interface WebhookErrorResponse {
  statusCode: 401 | 500;
  body: string;  // JSON stringified
  data: {
    error: string;
    message?: string;
    eventId?: string;
  };
}

/**
 * Combined Webhook Response Type
 */
export type WebhookResponse = WebhookSuccessResponse | WebhookErrorResponse;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract Stripe Event Data Type
 * Helper to get strongly-typed event data object
 */
export type StripeEventData<T extends StripeWebhookTopic> =
  T extends 'payment_intent.succeeded' | 'payment_intent.payment_failed' | 'payment_intent.processing' | 'payment_intent.canceled'
    ? Stripe.PaymentIntent
    : T extends 'payment_method.attached' | 'payment_method.detached' | 'payment_method.automatically_updated'
    ? Stripe.PaymentMethod
    : T extends 'charge.dispute.created' | 'charge.dispute.closed'
    ? Stripe.Dispute
    : T extends 'charge.refunded'
    ? Stripe.Charge
    : T extends 'customer.updated' | 'customer.deleted'
    ? Stripe.Customer
    : never;

/**
 * Webhook Event Type Guard
 * Check if event is a specific webhook type
 */
export function isWebhookType<T extends StripeWebhookTopic>(
  event: Stripe.Event,
  type: T
): event is Stripe.Event & { type: T; data: { object: StripeEventData<T> } } {
  return event.type === type;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Webhook Event Types We Handle
 * Used for validation and filtering
 */
export const HANDLED_WEBHOOK_EVENTS: StripeWebhookTopic[] = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.processing',
  'payment_intent.canceled',
  'payment_method.attached',
  'payment_method.detached',
  'payment_method.automatically_updated',
  'charge.dispute.created',
  'charge.dispute.closed',
  'charge.refunded',
  'customer.updated',
  'customer.deleted'
];

/**
 * Critical Events (require immediate processing)
 */
export const CRITICAL_WEBHOOK_EVENTS: StripeWebhookTopic[] = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.dispute.created'
];

/**
 * Webhook Retry Configuration
 */
export const WEBHOOK_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: [1000, 5000, 30000],  // 1s, 5s, 30s
  TIMEOUT_MS: 10000  // 10 seconds max processing time
};

/**
 * Payment Failure Thresholds
 */
export const PAYMENT_FAILURE_THRESHOLDS = {
  SUSPEND_AFTER_FAILURES: 3,
  ADVANCE_BILLING_DATE_DAYS: 30,
  TRIAL_PERIOD_DAYS: 14
};
