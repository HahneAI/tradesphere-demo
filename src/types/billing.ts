/**
 * TradeSphere Billing Type Definitions
 *
 * Comprehensive type system for Stripe payment integration,
 * subscription management, and billing UI components.
 *
 * @module billing
 */

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * Branded type for company IDs to prevent mixing with other string IDs
 */
export type CompanyId = string & { readonly __brand: 'CompanyId' };

/**
 * Branded type for payment IDs to prevent mixing with other string IDs
 */
export type PaymentId = string & { readonly __brand: 'PaymentId' };

/**
 * Branded type for Stripe customer IDs
 */
export type StripeCustomerId = string & { readonly __brand: 'StripeCustomerId' };

/**
 * Branded type for Stripe payment method IDs
 */
export type StripePaymentMethodId = string & { readonly __brand: 'StripePaymentMethodId' };

/**
 * Branded type for Stripe payment intent IDs
 */
export type StripePaymentIntentId = string & { readonly __brand: 'StripePaymentIntentId' };

/**
 * Type helper to create branded types from raw strings
 */
export function createCompanyId(id: string): CompanyId {
  return id as CompanyId;
}

export function createPaymentId(id: string): PaymentId {
  return id as PaymentId;
}

// ============================================================================
// Enums
// ============================================================================

/**
 * Subscription status values
 * Maps to companies.subscription_status database column
 */
export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled'
}

/**
 * Subscription tier pricing levels
 * Maps to companies.subscription_tier database column
 */
export enum SubscriptionTier {
  STANDARD = 'standard',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

/**
 * Payment method verification status
 * Maps to companies.payment_method_status database column
 */
export enum PaymentMethodStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed'
}

/**
 * Payment transaction status
 * Maps to payments.status database column
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed'
}

/**
 * Payment transaction type
 * Maps to payments.payment_type database column
 */
export enum PaymentType {
  MONTHLY_SUBSCRIPTION = 'monthly_subscription',
  SETUP_FEE = 'setup_fee',
  ADDON = 'addon',
  REFUND = 'refund'
}

/**
 * Cancellation reason categories
 * Maps to companies.cancellation_reason database column
 */
export enum CancellationReason {
  TOO_EXPENSIVE = 'too_expensive',
  MISSING_FEATURES = 'missing_features',
  POOR_PERFORMANCE = 'poor_performance',
  SWITCHING_COMPETITOR = 'switching_competitor',
  BUSINESS_CLOSED = 'business_closed',
  SEASONAL = 'seasonal',
  OTHER = 'other'
}

/**
 * ACH transfer failure codes
 * Common NACHA return codes mapped to Stripe error codes
 */
export enum ACHFailureCode {
  INSUFFICIENT_FUNDS = 'R01',
  ACCOUNT_CLOSED = 'R02',
  NO_ACCOUNT = 'R03',
  INVALID_ACCOUNT = 'R04',
  UNAUTHORIZED = 'R05',
  RETURNED = 'R06',
  AUTHORIZATION_REVOKED = 'R07',
  PAYMENT_STOPPED = 'R08',
  UNCOLLECTED_FUNDS = 'R09',
  CUSTOMER_ADVISES_NOT_AUTHORIZED = 'R10',
  CHECK_TRUNCATION_ENTRY_RETURN = 'R11',
  BRANCH_SOLD = 'R12',
  RDFI_NOT_QUALIFIED = 'R13',
  REPRESENTATIVE_PAYEE_DECEASED = 'R14',
  BENEFICIARY_DECEASED = 'R15',
  ACCOUNT_FROZEN = 'R16',
  UNKNOWN = 'unknown'
}

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Company billing information
 * Maps to billing-related fields in companies table
 */
export interface CompanyBilling {
  /** Company UUID */
  id: CompanyId;

  /** Current subscription status */
  subscription_status: SubscriptionStatus;

  /** Active subscription tier */
  subscription_tier: SubscriptionTier;

  /** Monthly subscription amount in cents (e.g., 2000.00 = $20.00) */
  monthly_amount: number;

  /** Next billing date (ISO 8601 date string) */
  next_billing_date: string | null;

  /** Trial period end date (ISO 8601 date string) */
  trial_end_date: string | null;

  /** Payment method verification status */
  payment_method_status: PaymentMethodStatus;

  /** Timestamp when payment method was verified (ISO 8601 timestamp string) */
  payment_method_verified_at: string | null;

  /** Stripe customer ID reference */
  stripe_customer_id: StripeCustomerId | null;

  /** Stripe payment method ID (bank account ID) */
  stripe_payment_method_id: StripePaymentMethodId | null;

  /** Stripe setup intent ID (used during Plaid flow) */
  stripe_setup_intent_id: string | null;

  /** Billing contact email */
  billing_email: string | null;

  /** Billing contact name */
  billing_name: string | null;

  /** Day of month for recurring billing (1-31) */
  billing_cycle_day: number;

  /** Count of consecutive payment failures */
  payment_failure_count: number;

  /** Timestamp of most recent payment failure (ISO 8601 timestamp string) */
  last_payment_failed_at: string | null;

  /** Timestamp when subscription was canceled (ISO 8601 timestamp string) */
  cancelled_at: string | null;

  /** Reason for cancellation */
  cancellation_reason: CancellationReason | null;
}

/**
 * Payment transaction record
 * Maps to payments table
 */
export interface Payment {
  /** Payment UUID */
  id: PaymentId;

  /** Company UUID */
  company_id: CompanyId;

  /** Payment amount in cents (e.g., 2000.00 = $20.00) */
  amount: number;

  /** Payment processing status */
  status: PaymentStatus;

  /** Type of payment transaction */
  payment_type: PaymentType;

  /** Start date of subscription period (ISO 8601 date string) */
  subscription_period_start: string | null;

  /** End date of subscription period (ISO 8601 date string) */
  subscription_period_end: string | null;

  /** Stripe payment intent ID reference */
  stripe_payment_intent_id: StripePaymentIntentId | null;

  /** Stripe charge ID (set when payment succeeds) */
  stripe_charge_id: string | null;

  /** ACH failure code if payment failed */
  failure_code: ACHFailureCode | null;

  /** Human-readable failure message */
  failure_message: string | null;

  /** Last 4 digits of bank account number */
  bank_account_last4: string | null;

  /** Timestamp when payment was processed (ISO 8601 timestamp string) */
  processed_at: string | null;

  /** Timestamp when payment was created (ISO 8601 timestamp string) */
  created_at: string;
}

/**
 * Billing period date range
 */
export interface BillingPeriod {
  /** Start date (ISO 8601 date string) */
  start: string;

  /** End date (ISO 8601 date string) */
  end: string;

  /** Number of days in period */
  days: number;
}

/**
 * Payment method information (bank account details)
 */
export interface PaymentMethodInfo {
  /** Verification status */
  status: PaymentMethodStatus;

  /** Last 4 digits of bank account number */
  last4: string | null;

  /** Bank name (if available) */
  bank_name: string | null;

  /** Account type (checking/savings) */
  account_type: 'checking' | 'savings' | null;

  /** Timestamp when verified (ISO 8601 timestamp string) */
  verified_at: string | null;

  /** Stripe payment method ID */
  payment_method_id: StripePaymentMethodId | null;
}

/**
 * Aggregated payment statistics
 */
export interface PaymentSummary {
  /** Total amount paid (all time) in cents */
  total_paid: number;

  /** Number of successful payments */
  successful_count: number;

  /** Number of failed payments */
  failed_count: number;

  /** Amount of most recent payment in cents */
  last_payment_amount: number | null;

  /** Date of most recent payment (ISO 8601 date string) */
  last_payment_date: string | null;

  /** Next scheduled payment date (ISO 8601 date string) */
  next_payment_date: string | null;
}

/**
 * Computed billing status (combines subscription + payment method status)
 */
export interface BillingStatus {
  /** Overall status indicator */
  status: 'active' | 'action_required' | 'past_due' | 'trial' | 'canceled';

  /** Human-readable status message */
  message: string;

  /** Action items required from user */
  actions: BillingAction[];

  /** Whether immediate action is required */
  is_urgent: boolean;
}

/**
 * Action item for billing issues
 */
export interface BillingAction {
  /** Action type identifier */
  type: 'add_payment_method' | 'update_payment_method' | 'contact_support' | 'upgrade' | 'reactivate';

  /** Human-readable action description */
  label: string;

  /** Button/link CTA text */
  cta: string;

  /** Priority level */
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for SubscriptionStatusCard component
 */
export interface SubscriptionStatusCardProps {
  /** Company billing data */
  billing: CompanyBilling;

  /** Callback when upgrade button clicked */
  onUpgrade?: () => void;

  /** Callback when cancel button clicked */
  onCancel?: () => void;

  /** Whether component is in loading state */
  isLoading?: boolean;
}

/**
 * Props for PaymentMethodCard component
 */
export interface PaymentMethodCardProps {
  /** Payment method information */
  paymentMethod: PaymentMethodInfo;

  /** Company billing data */
  billing: CompanyBilling;

  /** Callback when update payment method clicked */
  onUpdate: () => void;

  /** Whether component is in loading state */
  isLoading?: boolean;
}

/**
 * Props for PaymentHistoryTable component
 */
export interface PaymentHistoryTableProps {
  /** List of payment transactions */
  payments: Payment[];

  /** Payment summary statistics */
  summary?: PaymentSummary;

  /** Callback when payment row clicked */
  onPaymentClick?: (payment: Payment) => void;

  /** Whether to show pagination */
  showPagination?: boolean;

  /** Current page number (1-indexed) */
  currentPage?: number;

  /** Total number of pages */
  totalPages?: number;

  /** Callback when page changed */
  onPageChange?: (page: number) => void;

  /** Whether component is in loading state */
  isLoading?: boolean;
}

/**
 * Props for UpdatePaymentMethodModal component
 */
export interface UpdatePaymentMethodModalProps {
  /** Whether modal is open */
  isOpen: boolean;

  /** Callback to close modal */
  onClose: () => void;

  /** Current company billing data */
  billing: CompanyBilling;

  /** Callback when bank account linked successfully */
  onSuccess: (paymentMethodId: StripePaymentMethodId) => void;

  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

/**
 * Props for CancelSubscriptionModal component
 */
export interface CancelSubscriptionModalProps {
  /** Whether modal is open */
  isOpen: boolean;

  /** Callback to close modal */
  onClose: () => void;

  /** Current company billing data */
  billing: CompanyBilling;

  /** Callback when subscription canceled successfully */
  onConfirm: (reason: CancellationReason, feedback?: string) => Promise<void>;

  /** Whether cancellation is processing */
  isProcessing?: boolean;
}


// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request payload for canceling subscription
 */
export interface CancelSubscriptionRequest {
  /** Company ID */
  company_id: CompanyId;

  /** Reason for cancellation */
  reason: CancellationReason;

  /** Optional feedback text */
  feedback?: string;

  /** Whether to cancel immediately or at period end */
  immediate: boolean;
}

/**
 * Response from cancel subscription API
 */
export interface CancelSubscriptionResponse {
  /** Whether cancellation was successful */
  success: boolean;

  /** Updated company billing data */
  billing: CompanyBilling;

  /** Effective cancellation date (ISO 8601 date string) */
  cancelled_at: string;

  /** Refund amount if applicable (in cents) */
  refund_amount?: number;

  /** Error message if failed */
  error?: string;
}


/**
 * Request payload for updating payment method
 */
export interface UpdatePaymentMethodRequest {
  /** Company ID */
  company_id: CompanyId;

  /** Plaid public token (from Plaid Link flow) */
  plaid_token: string;

  /** Bank account metadata from Plaid */
  bank_account_last4?: string;
  bank_name?: string;
}

/**
 * Response from update payment method API
 */
export interface UpdatePaymentMethodResponse {
  /** Whether update was successful */
  success: boolean;

  /** New Stripe payment method ID */
  payment_method_id: StripePaymentMethodId;

  /** Updated payment method information */
  payment_method: PaymentMethodInfo;

  /** Error message if failed */
  error?: string;
}

/**
 * Request payload for retrying failed payment
 */
export interface RetryPaymentRequest {
  /** Payment ID to retry */
  payment_id: PaymentId;

  /** Company ID */
  company_id: CompanyId;

  /** Optional: Use different payment method */
  payment_method_id?: StripePaymentMethodId;
}

/**
 * Response from retry payment API
 */
export interface RetryPaymentResponse {
  /** Whether retry was successful */
  success: boolean;

  /** Updated payment record */
  payment: Payment;

  /** Stripe payment intent ID */
  payment_intent_id: StripePaymentIntentId | null;

  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard: Check if company is on active trial
 */
export function isActiveTrial(billing: CompanyBilling): boolean {
  return (
    billing.subscription_status === SubscriptionStatus.TRIAL &&
    billing.trial_end_date !== null &&
    new Date(billing.trial_end_date) > new Date()
  );
}

/**
 * Type guard: Check if subscription is past due
 */
export function isPastDue(billing: CompanyBilling): boolean {
  return billing.subscription_status === SubscriptionStatus.PAST_DUE;
}

/**
 * Type guard: Check if payment method needs verification
 * Note: With Stripe + Plaid, instant verification is used, so this is rarely needed
 */
export function requiresPaymentVerification(billing: CompanyBilling): boolean {
  return (
    billing.payment_method_status === PaymentMethodStatus.PENDING &&
    billing.stripe_payment_method_id !== null
  );
}

/**
 * Type guard: Check if subscription can be canceled
 */
export function canCancelSubscription(billing: CompanyBilling): boolean {
  return (
    billing.subscription_status === SubscriptionStatus.ACTIVE ||
    billing.subscription_status === SubscriptionStatus.TRIAL ||
    billing.subscription_status === SubscriptionStatus.PAST_DUE
  ) && billing.cancelled_at === null;
}

/**
 * Type guard: Check if trial is expiring soon (within 7 days)
 */
export function isTrialExpiringSoon(billing: CompanyBilling): boolean {
  if (!isActiveTrial(billing) || !billing.trial_end_date) {
    return false;
  }

  const trialEnd = new Date(billing.trial_end_date);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return trialEnd <= sevenDaysFromNow;
}

/**
 * Type guard: Check if payment method is verified and ready
 */
export function isPaymentMethodReady(billing: CompanyBilling): boolean {
  return (
    billing.payment_method_status === PaymentMethodStatus.VERIFIED &&
    billing.stripe_payment_method_id !== null
  );
}

/**
 * Type guard: Check if payment failed
 */
export function isPaymentFailed(payment: Payment): boolean {
  return payment.status === PaymentStatus.FAILED;
}

/**
 * Type guard: Check if payment is pending or processing
 */
export function isPaymentInProgress(payment: Payment): boolean {
  return (
    payment.status === PaymentStatus.PENDING ||
    payment.status === PaymentStatus.PROCESSING
  );
}

/**
 * Type guard: Check if company has excessive payment failures (3+ in a row)
 */
export function hasExcessiveFailures(billing: CompanyBilling): boolean {
  return billing.payment_failure_count >= 3;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format currency amount with USD symbol
 * @param amount - Amount in cents (e.g., 2000.00 = $20.00)
 * @returns Formatted currency string (e.g., "$20.00")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount / 100);
}

/**
 * Format billing period as human-readable date range
 * @param start - Start date (ISO 8601 date string)
 * @param end - End date (ISO 8601 date string)
 * @returns Formatted date range (e.g., "Jan 1 - Jan 31, 2024")
 */
export function formatBillingPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Get color code for subscription status badge
 * @param status - Subscription status
 * @returns Tailwind CSS color class
 */
export function getBillingStatusColor(status: SubscriptionStatus): string {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return 'green';
    case SubscriptionStatus.TRIAL:
      return 'blue';
    case SubscriptionStatus.PAST_DUE:
      return 'red';
    case SubscriptionStatus.CANCELED:
      return 'gray';
    default:
      return 'gray';
  }
}

/**
 * Get color code for payment status badge
 * @param status - Payment status
 * @returns Tailwind CSS color class
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  switch (status) {
    case PaymentStatus.SUCCEEDED:
      return 'green';
    case PaymentStatus.PENDING:
    case PaymentStatus.PROCESSING:
      return 'yellow';
    case PaymentStatus.FAILED:
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Mask bank account number (show only last 4 digits)
 * @param last4 - Last 4 digits of bank account
 * @returns Masked account number (e.g., "•••• 4242")
 */
export function maskBankAccount(last4: string | null): string {
  if (!last4) {
    return '•••• ••••';
  }
  return `•••• ${last4}`;
}

/**
 * Format date as relative time (e.g., "2 days ago", "in 5 days")
 * @param dateString - ISO 8601 date/timestamp string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // Future dates
  if (diffDays > 0) {
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)} weeks`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Past dates
  const absDiffDays = Math.abs(diffDays);
  const absDiffHours = Math.abs(diffHours);
  const absDiffMinutes = Math.abs(diffMinutes);

  if (absDiffMinutes < 1) return 'Just now';
  if (absDiffMinutes < 60) return `${absDiffMinutes} min ago`;
  if (absDiffHours < 24) return `${absDiffHours} hr ago`;
  if (absDiffDays === 1) return 'Yesterday';
  if (absDiffDays < 7) return `${absDiffDays} days ago`;
  if (absDiffDays < 30) return `${Math.floor(absDiffDays / 7)} weeks ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Calculate billing period from start date and billing cycle day
 * @param startDate - Period start date (ISO 8601 date string)
 * @param cycleDay - Day of month for billing cycle (1-31)
 * @returns Billing period with start, end, and day count
 */
export function calculateBillingPeriod(startDate: string, cycleDay: number): BillingPeriod {
  const start = new Date(startDate);
  const end = new Date(start);

  // Set end date to next occurrence of cycle day
  end.setMonth(end.getMonth() + 1);
  end.setDate(cycleDay);

  // If cycle day doesn't exist in month (e.g., Feb 30), use last day of month
  if (end.getDate() !== cycleDay) {
    end.setDate(0); // Go to last day of previous month
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    days: diffDays
  };
}

/**
 * Compute overall billing status from company billing data
 * @param billing - Company billing information
 * @returns Computed billing status with actions
 */
export function computeBillingStatus(billing: CompanyBilling): BillingStatus {
  const actions: BillingAction[] = [];

  // Canceled subscription
  if (billing.subscription_status === SubscriptionStatus.CANCELED) {
    return {
      status: 'canceled',
      message: 'Your subscription has been canceled',
      actions: [{
        type: 'reactivate',
        label: 'Reactivate your subscription to continue using TradeSphere',
        cta: 'Reactivate Subscription',
        priority: 'medium'
      }],
      is_urgent: false
    };
  }

  // Past due subscription
  if (isPastDue(billing)) {
    actions.push({
      type: 'update_payment_method',
      label: 'Update payment method to restore access',
      cta: 'Update Payment Method',
      priority: 'high'
    });

    if (hasExcessiveFailures(billing)) {
      actions.push({
        type: 'contact_support',
        label: 'Contact support for assistance with recurring payment failures',
        cta: 'Contact Support',
        priority: 'high'
      });
    }

    return {
      status: 'past_due',
      message: 'Your subscription is past due. Please update your payment method.',
      actions,
      is_urgent: true
    };
  }

  // Active trial
  if (isActiveTrial(billing)) {
    if (!isPaymentMethodReady(billing)) {
      actions.push({
        type: 'add_payment_method',
        label: 'Add payment method before trial ends',
        cta: 'Add Payment Method',
        priority: 'high'
      });
    }

    if (isTrialExpiringSoon(billing)) {
      actions.push({
        type: 'upgrade',
        label: 'Upgrade to continue after trial ends',
        cta: 'Upgrade Now',
        priority: 'medium'
      });
    }

    return {
      status: 'trial',
      message: isTrialExpiringSoon(billing)
        ? `Trial ends ${formatRelativeTime(billing.trial_end_date!)}`
        : 'Active trial period',
      actions,
      is_urgent: isTrialExpiringSoon(billing) && !isPaymentMethodReady(billing)
    };
  }

  // Active subscription - check payment method
  if (billing.subscription_status === SubscriptionStatus.ACTIVE) {
    if (!isPaymentMethodReady(billing)) {
      actions.push({
        type: 'add_payment_method',
        label: 'Add a payment method to avoid service interruption',
        cta: 'Add Payment Method',
        priority: 'high'
      });

      return {
        status: 'action_required',
        message: 'Payment method required',
        actions,
        is_urgent: true
      };
    }

    return {
      status: 'active',
      message: 'Your subscription is active',
      actions: [],
      is_urgent: false
    };
  }

  // Default fallback
  return {
    status: 'action_required',
    message: 'Action required',
    actions: [{
      type: 'contact_support',
      label: 'Contact support for assistance',
      cta: 'Contact Support',
      priority: 'medium'
    }],
    is_urgent: false
  };
}

/**
 * Get human-readable payment type label
 * @param type - Payment type enum
 * @returns Human-readable label
 */
export function getPaymentTypeLabel(type: PaymentType): string {
  switch (type) {
    case PaymentType.MONTHLY_SUBSCRIPTION:
      return 'Monthly Subscription';
    case PaymentType.SETUP_FEE:
      return 'Setup Fee';
    case PaymentType.ADDON:
      return 'Add-on';
    case PaymentType.REFUND:
      return 'Refund';
    default:
      return 'Payment';
  }
}

/**
 * Get human-readable failure message from ACH error code
 * @param code - ACH failure code (NACHA return code)
 * @returns Human-readable error message
 */
export function getACHFailureMessage(code: ACHFailureCode | null): string {
  if (!code) return 'Payment failed';

  switch (code) {
    case ACHFailureCode.INSUFFICIENT_FUNDS:
      return 'Insufficient funds in account';
    case ACHFailureCode.ACCOUNT_CLOSED:
      return 'Bank account has been closed';
    case ACHFailureCode.NO_ACCOUNT:
      return 'No account found';
    case ACHFailureCode.INVALID_ACCOUNT:
      return 'Invalid account number';
    case ACHFailureCode.UNAUTHORIZED:
      return 'Transaction not authorized';
    case ACHFailureCode.RETURNED:
      return 'Payment was returned by bank';
    case ACHFailureCode.AUTHORIZATION_REVOKED:
      return 'Authorization revoked';
    case ACHFailureCode.PAYMENT_STOPPED:
      return 'Payment stopped by customer';
    case ACHFailureCode.ACCOUNT_FROZEN:
      return 'Account is frozen';
    default:
      return 'Payment processing failed';
  }
}

/**
 * Calculate payment summary statistics from payment list
 * @param payments - List of payment transactions
 * @param nextBillingDate - Next scheduled billing date (ISO 8601 date string)
 * @returns Aggregated payment summary
 */
export function calculatePaymentSummary(
  payments: Payment[],
  nextBillingDate: string | null
): PaymentSummary {
  const successfulPayments = payments.filter(p => p.status === PaymentStatus.SUCCEEDED);
  const failedPayments = payments.filter(p => p.status === PaymentStatus.FAILED);

  const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

  const lastPayment = successfulPayments.sort((a, b) =>
    new Date(b.processed_at || b.created_at).getTime() -
    new Date(a.processed_at || a.created_at).getTime()
  )[0];

  return {
    total_paid: totalPaid,
    successful_count: successfulPayments.length,
    failed_count: failedPayments.length,
    last_payment_amount: lastPayment?.amount || null,
    last_payment_date: lastPayment?.processed_at || lastPayment?.created_at || null,
    next_payment_date: nextBillingDate
  };
}

/**
 * Get subscription tier display name
 * @param tier - Subscription tier enum
 * @returns Human-readable tier name
 */
export function getSubscriptionTierName(tier: SubscriptionTier): string {
  switch (tier) {
    case SubscriptionTier.STANDARD:
      return 'Standard';
    case SubscriptionTier.PRO:
      return 'Pro';
    case SubscriptionTier.ENTERPRISE:
      return 'Enterprise';
    default:
      return 'Unknown';
  }
}

/**
 * Get subscription tier pricing (monthly amount in cents)
 * @param tier - Subscription tier enum
 * @returns Monthly price in cents
 */
export function getSubscriptionTierPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case SubscriptionTier.STANDARD:
      return 2000; // $20.00/month
    case SubscriptionTier.PRO:
      return 5000; // $50.00/month
    case SubscriptionTier.ENTERPRISE:
      return 10000; // $100.00/month
    default:
      return 2000;
  }
}
