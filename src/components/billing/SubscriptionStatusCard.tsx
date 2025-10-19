/**
 * SubscriptionStatusCard Component
 *
 * Displays subscription status with visual badges, billing information,
 * and conditional messaging based on subscription state (trial/active/past due/canceled).
 *
 * Mobile-first design with responsive layout for 320px-428px viewports.
 */

import React from 'react';
import * as Icons from 'lucide-react';
import {
  SubscriptionStatus,
  CompanyBilling,
  formatCurrency,
  formatRelativeTime,
  getBillingStatusColor,
  getSubscriptionTierName
} from '../../types/billing';
import { StatusBadge } from './StatusBadge';

interface SubscriptionStatusCardProps {
  /** Company billing data */
  billing: CompanyBilling;
  /** Callback when "Update Payment Method" clicked */
  onUpdatePayment: () => void;
  /** Callback when "Cancel Subscription" clicked */
  onCancelSubscription?: () => void;
  /** Whether component is in loading state */
  isLoading?: boolean;
}

export const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({
  billing,
  onUpdatePayment,
  onCancelSubscription,
  isLoading = false
}) => {
  const {
    subscription_status,
    subscription_tier,
    monthly_amount,
    next_billing_date,
    trial_end_date,
    cancelled_at
  } = billing;

  // Determine if cancel button should be shown
  const canCancel = (
    subscription_status === SubscriptionStatus.ACTIVE ||
    subscription_status === SubscriptionStatus.TRIAL
  ) && !cancelled_at;

  // Get status color
  const statusColor = getBillingStatusColor(subscription_status);

  // Get tier name
  const tierName = getSubscriptionTierName(subscription_tier);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4">
      {/* Header with Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Subscription Status</h3>
          <p className="text-sm text-gray-600">
            {tierName} Plan - {formatCurrency(monthly_amount)}/month
          </p>
        </div>
        <StatusBadge
          status={subscription_status.charAt(0).toUpperCase() + subscription_status.slice(1).replace('_', ' ')}
          color={statusColor}
        />
      </div>

      {/* Billing Date Information */}
      <div className="mb-4 space-y-2">
        {subscription_status === SubscriptionStatus.TRIAL && trial_end_date && (
          <div className="flex items-center gap-2 text-sm">
            <Icons.Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">
              Trial ends: <span className="font-medium">{formatRelativeTime(trial_end_date)}</span>
            </span>
          </div>
        )}

        {subscription_status === SubscriptionStatus.ACTIVE && next_billing_date && (
          <div className="flex items-center gap-2 text-sm">
            <Icons.Calendar className="h-4 w-4 text-green-600" />
            <span className="text-gray-700">
              Next billing: <span className="font-medium">{new Date(next_billing_date).toLocaleDateString()}</span>
            </span>
          </div>
        )}

        {subscription_status === SubscriptionStatus.CANCELED && cancelled_at && (
          <div className="flex items-center gap-2 text-sm">
            <Icons.Calendar className="h-4 w-4 text-gray-600" />
            <span className="text-gray-700">
              Canceled: <span className="font-medium">{new Date(cancelled_at).toLocaleDateString()}</span>
            </span>
          </div>
        )}
      </div>

      {/* Conditional Alert Messages */}
      {subscription_status === SubscriptionStatus.TRIAL && trial_end_date && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 md:p-4 mb-4 rounded-r">
          <div className="flex items-start gap-2">
            <Icons.Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-700 font-medium">
                Trial active until {formatRelativeTime(trial_end_date)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You'll be charged {formatCurrency(monthly_amount)} on {new Date(trial_end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {subscription_status === SubscriptionStatus.PAST_DUE && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 md:p-4 mb-4 rounded-r">
          <div className="flex items-start gap-2">
            <Icons.AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">
                Payment failed. Please update your payment method to avoid service interruption.
              </p>
              <button
                onClick={onUpdatePayment}
                className="mt-2 text-sm text-red-600 underline hover:text-red-700 transition-colors"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                Update Payment Method →
              </button>
            </div>
          </div>
        </div>
      )}

      {subscription_status === SubscriptionStatus.CANCELED && cancelled_at && (
        <div className="bg-gray-50 border-l-4 border-gray-400 p-3 md:p-4 mb-4 rounded-r">
          <div className="flex items-start gap-2">
            <Icons.XCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium">
                Subscription canceled on {new Date(cancelled_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Access will end on {new Date(next_billing_date || trial_end_date || cancelled_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onUpdatePayment}
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
          style={{ minHeight: '44px' }}
        >
          <Icons.CreditCard className="h-4 w-4" />
          Update Payment Method
        </button>

        {canCancel && onCancelSubscription && (
          <button
            onClick={onCancelSubscription}
            disabled={isLoading}
            className="flex-1 bg-white text-red-600 border border-red-300 py-3 px-4 rounded-md hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Icons.XCircle className="h-4 w-4" />
            Cancel Subscription
          </button>
        )}
      </div>
    </div>
  );
};
