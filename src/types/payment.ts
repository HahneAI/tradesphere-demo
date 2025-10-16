/**
 * PHASE 4B: PAYMENT & BILLING TYPE DEFINITIONS
 *
 * TypeScript types for Dwolla ACH payment integration and subscription management.
 * Provides type safety for Dwolla API responses, webhook events, and payment data.
 */

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

export enum FundingSourceType {
  CHECKING = 'checking',
  SAVINGS = 'savings'
}

export enum FundingSourceStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  REMOVED = 'removed'
}

export enum TransferStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// ============================================================================
// DWOLLA API RESPONSE TYPES
// ============================================================================

/**
 * Dwolla Customer Resource
 * Represents a business customer in Dwolla
 */
export interface DwollaCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  type: 'business' | 'personal';
  businessName?: string;
  businessType?: string;
  businessClassification?: string;
  status: 'unverified' | 'retry' | 'document' | 'verified' | 'suspended' | 'deactivated';
  created: string;
  _links: {
    self: { href: string };
    'funding-sources': { href: string };
    transfers: { href: string };
  };
}

/**
 * Dwolla Funding Source (Bank Account)
 * Represents a linked bank account
 */
export interface DwollaFundingSource {
  id: string;
  status: FundingSourceStatus;
  type: 'bank';
  bankAccountType: FundingSourceType;
  name: string;
  created: string;
  balance?: {
    value: string;
    currency: 'USD';
  };
  removed: boolean;
  channels: string[];
  bankName?: string;
  fingerprint?: string;
  _links: {
    self: { href: string };
    customer: { href: string };
    'micro-deposits'?: { href: string };
  };
}

/**
 * Dwolla Transfer Resource
 * Represents an ACH payment transfer
 */
export interface DwollaTransfer {
  id: string;
  status: TransferStatus;
  amount: {
    value: string;
    currency: 'USD';
  };
  created: string;
  metadata?: Record<string, string>;
  clearing?: {
    source: 'standard' | 'next-day';
  };
  _links: {
    self: { href: string };
    source: { href: string };
    destination: { href: string };
    'source-funding-source'?: { href: string };
    'destination-funding-source'?: { href: string };
    cancel?: { href: string };
  };
  _embedded?: {
    source?: DwollaCustomer;
    destination?: DwollaCustomer;
  };
}

/**
 * Dwolla Micro-Deposit Verification
 */
export interface DwollaMicroDeposit {
  _links: {
    self: { href: string };
    verify: { href: string };
  };
  created: string;
  status: 'pending' | 'processed' | 'failed';
  failure?: {
    code: string;
    description: string;
  };
}

// ============================================================================
// DWOLLA WEBHOOK EVENT TYPES
// ============================================================================

/**
 * Dwolla Webhook Event
 * Structure of webhook payloads from Dwolla
 */
export interface DwollaWebhookEvent {
  id: string;
  resourceId: string;
  topic: DwollaWebhookTopic;
  timestamp: string;
  _links: {
    self: { href: string };
    account: { href: string };
    resource: { href: string };
    customer?: { href: string };
  };
  _embedded?: {
    [key: string]: any;
  };
}

/**
 * Dwolla Webhook Topics
 * All possible webhook event types from Dwolla
 */
export type DwollaWebhookTopic =
  // Customer Events
  | 'customer_created'
  | 'customer_verified'
  | 'customer_suspended'
  | 'customer_activated'
  | 'customer_deactivated'

  // Funding Source Events
  | 'customer_funding_source_added'
  | 'customer_funding_source_removed'
  | 'customer_funding_source_verified'
  | 'customer_funding_source_negative'
  | 'customer_funding_source_updated'
  | 'customer_funding_source_unverified'

  // Transfer Events
  | 'customer_transfer_created'
  | 'customer_transfer_completed'
  | 'customer_transfer_failed'
  | 'customer_transfer_cancelled'

  // Micro-Deposit Events
  | 'customer_microdeposits_added'
  | 'customer_microdeposits_failed'
  | 'customer_microdeposits_completed'
  | 'customer_microdeposits_maxattempts'

  // Bank Transfer Events
  | 'customer_bank_transfer_created'
  | 'customer_bank_transfer_creation_failed'
  | 'customer_bank_transfer_completed'
  | 'customer_bank_transfer_failed'
  | 'customer_bank_transfer_cancelled';

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
  dwolla_transfer_id?: string;
  dwolla_transfer_url?: string;
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
 * Logs all Dwolla webhook events for audit and replay
 */
export interface PaymentWebhook {
  id: string;
  event_type: string;
  payload: DwollaWebhookEvent;
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
  dwolla_customer_url?: string;
  dwolla_funding_source_id?: string;
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
// DWOLLA SERVICE METHOD PARAMETERS
// ============================================================================

/**
 * Parameters for creating a Dwolla customer
 */
export interface CreateCustomerParams {
  email: string;
  companyName: string;
  firstName: string;
  lastName: string;
  businessType?: 'llc' | 'corporation' | 'partnership' | 'soleProprietorship';
  businessClassification?: string;
  ein?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

/**
 * Parameters for creating a funding source
 */
export interface CreateFundingSourceParams {
  customerUrl: string;
  routingNumber: string;
  accountNumber: string;
  bankAccountType: FundingSourceType;
  name: string;
}

/**
 * Parameters for verifying micro-deposits
 */
export interface VerifyMicroDepositsParams {
  fundingSourceUrl: string;
  amount1: number;  // In cents (e.g., 0.03 = 3 cents)
  amount2: number;  // In cents (e.g., 0.09 = 9 cents)
}

/**
 * Parameters for creating a transfer (payment)
 */
export interface CreateTransferParams {
  sourceFundingSourceUrl: string;      // Customer's bank account
  destinationFundingSourceUrl: string; // TradeSphere's bank account
  amount: number;                      // In dollars (e.g., 2000.00)
  metadata?: Record<string, string>;   // Custom data (company_id, invoice_id, etc.)
}

// ============================================================================
// DWOLLA SERVICE RESPONSE TYPES
// ============================================================================

/**
 * Generic Dwolla API Response
 */
export interface DwollaResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    _embedded?: {
      errors?: Array<{
        code: string;
        message: string;
        path: string;
      }>;
    };
  };
}

/**
 * Response from createCustomer()
 */
export interface CreateCustomerResponse extends DwollaResponse {
  data?: {
    customerUrl: string;
    customerId: string;
  };
}

/**
 * Response from createFundingSource()
 */
export interface CreateFundingSourceResponse extends DwollaResponse {
  data?: {
    fundingSourceUrl: string;
    fundingSourceId: string;
  };
}

/**
 * Response from createTransfer()
 */
export interface CreateTransferResponse extends DwollaResponse {
  data?: {
    transferUrl: string;
    transferId: string;
    status: TransferStatus;
  };
}

/**
 * List of funding sources for a customer
 */
export interface FundingSourcesList {
  _embedded: {
    'funding-sources': DwollaFundingSource[];
  };
}

/**
 * List of transfers for a customer
 */
export interface TransfersList {
  _embedded: {
    transfers: DwollaTransfer[];
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
  accountType: FundingSourceType;
  last4: string;
  status: FundingSourceStatus;
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
