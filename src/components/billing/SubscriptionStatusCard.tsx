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
import { VisualThemeConfig } from '../../config/industry';

interface SubscriptionStatusCardProps {
  /** Company billing data */
  billing: CompanyBilling;
  /** Callback when "Update Payment Method" clicked */
  onUpdatePayment: () => void;
  /** Callback when "Cancel Subscription" clicked */
  onCancelSubscription?: () => void;
  /** Whether component is in loading state */
  isLoading?: boolean;
  /** Visual theme configuration */
  visualConfig: VisualThemeConfig;
  /** Theme mode (light/dark) */
  theme: 'light' | 'dark';
}

export const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({
  billing,
  onUpdatePayment,
  onCancelSubscription,
  isLoading = false,
  visualConfig,
  theme
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
    <div className="rounded-lg shadow-md p-4 md:p-6 mb-4" style={{ backgroundColor: visualConfig.colors.surface }}>
      {/* Header with Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: visualConfig.colors.text.primary }}>
            Subscription Status
          </h3>
          <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            {tierName} Plan - {formatCurrency(monthly_amount)}/month
          </p>
        </div>
        <StatusBadge
          status={subscription_status.charAt(0).toUpperCase() + subscription_status.slice(1).replace('_', ' ')}
          color={statusColor}
          theme={theme}
        />
      </div>

      {/* Billing Date Information */}
      <div className="mb-4 space-y-2">
        {subscription_status === SubscriptionStatus.TRIAL && trial_end_date && (
          <div className="flex items-center gap-2 text-sm">
            <Icons.Calendar className="h-4 w-4 text-blue-600" />
            <span style={{ color: visualConfig.colors.text.primary }}>
              Trial ends: <span className="font-medium">{formatRelativeTime(trial_end_date)}</span>
            </span>
          </div>
        )}

        {subscription_status === SubscriptionStatus.ACTIVE && next_billing_date && (
          <div className="flex items-center gap-2 text-sm">
            <Icons.Calendar className="h-4 w-4 text-green-600" />
            <span style={{ color: visualConfig.colors.text.primary }}>
              Next billing: <span className="font-medium">{new Date(next_billing_date).toLocaleDateString()}</span>
            </span>
          </div>
        )}

        {subscription_status === SubscriptionStatus.CANCELED && cancelled_at && (
          <div className="flex items-center gap-2 text-sm">
            <Icons.Calendar className="h-4 w-4 text-gray-600" />
            <span style={{ color: visualConfig.colors.text.primary }}>
              Canceled: <span className="font-medium">{new Date(cancelled_at).toLocaleDateString()}</span>
            </span>
          </div>
        )}
      </div>

      {/* Conditional Alert Messages */}
      {subscription_status === SubscriptionStatus.TRIAL && trial_end_date && (
        <div
          className="border-l-4 border-blue-400 p-3 md:p-4 mb-4 rounded-r"
          style={{ backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.1)' : 'rgb(239, 246, 255)' }}
        >
          <div className="flex items-start gap-2">
            <Icons.Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#93c5fd' : '#1e40af' }}>
                Trial active until {formatRelativeTime(trial_end_date)}
              </p>
              <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#60a5fa' : '#2563eb' }}>
                You'll be charged {formatCurrency(monthly_amount)} on {new Date(trial_end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {subscription_status === SubscriptionStatus.PAST_DUE && (
        <div
          className="border-l-4 border-red-400 p-3 md:p-4 mb-4 rounded-r"
          style={{ backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgb(254, 242, 242)' }}
        >
          <div className="flex items-start gap-2">
            <Icons.AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#fca5a5' : '#b91c1c' }}>
                Payment failed. Please update your payment method to avoid service interruption.
              </p>
              <button
                onClick={onUpdatePayment}
                className="mt-2 text-sm underline hover:opacity-80 transition-colors"
                style={{
                  minHeight: '44px',
                  minWidth: '44px',
                  color: theme === 'dark' ? '#f87171' : '#dc2626'
                }}
              >
                Update Payment Method →
              </button>
            </div>
          </div>
        </div>
      )}

      {subscription_status === SubscriptionStatus.CANCELED && cancelled_at && (
        <div
          className="border-l-4 border-gray-400 p-3 md:p-4 mb-4 rounded-r"
          style={{ backgroundColor: theme === 'dark' ? 'rgba(107, 114, 128, 0.1)' : 'rgb(249, 250, 251)' }}
        >
          <div className="flex items-start gap-2">
            <Icons.XCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                Subscription canceled on {new Date(cancelled_at).toLocaleDateString()}
              </p>
              <p className="text-xs mt-1" style={{ color: visualConfig.colors.text.secondary }}>
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
            className="flex-1 border border-red-300 py-3 px-4 rounded-md hover:opacity-80 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            style={{
              minHeight: '44px',
              backgroundColor: visualConfig.colors.surface,
              color: '#dc2626',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            <Icons.XCircle className="h-4 w-4" />
            Cancel Subscription
          </button>
        )}
      </div>
    </div>
  );
};
