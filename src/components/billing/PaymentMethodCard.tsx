/**
 * PaymentMethodCard Component
 *
 * Displays bank account information, verification status, and action buttons
 * for managing payment methods.
 *
 * With Stripe + Plaid integration:
 * - Instant verification (no micro-deposits needed)
 * - "Update Payment Method" opens Plaid Link for bank selection
 * - All accounts are verified instantly via Plaid
 *
 * Mobile-first design with responsive layout and touch-optimized buttons (44px minimum).
 */

import React from 'react';
import * as Icons from 'lucide-react';
import {
  PaymentMethodStatus,
  PaymentMethodInfo,
  maskBankAccount,
  getPaymentStatusColor
} from '../../types/billing';
import { StatusBadge } from './StatusBadge';
import { VisualThemeConfig } from '../../config/industry';

interface PaymentMethodCardProps {
  /** Payment method information */
  paymentMethod: PaymentMethodInfo;
  /** Callback when "Update Payment Method" clicked */
  onUpdatePaymentMethod: () => void;
  /** Whether component is in loading state */
  isLoading?: boolean;
  /** Visual theme configuration */
  visualConfig: VisualThemeConfig;
  /** Theme mode (light/dark) */
  theme: 'light' | 'dark';
}

/**
 * Get human-readable status label
 */
const getStatusLabel = (status: PaymentMethodStatus): string => {
  switch (status) {
    case PaymentMethodStatus.PENDING:
      return 'Pending Verification';
    case PaymentMethodStatus.VERIFIED:
      return 'Verified';
    case PaymentMethodStatus.FAILED:
      return 'Verification Failed';
    default:
      return 'Unknown';
  }
};

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  onUpdatePaymentMethod,
  isLoading = false,
  visualConfig,
  theme
}) => {
  const { status, last4, bank_name, account_type, verified_at } = paymentMethod;

  const statusColor = getPaymentStatusColor(
    status === PaymentMethodStatus.VERIFIED ? 'succeeded' as any :
    status === PaymentMethodStatus.PENDING ? 'pending' as any :
    'failed' as any
  );

  return (
    <div className="rounded-lg shadow-md p-4 md:p-6 mb-4" style={{ backgroundColor: visualConfig.colors.surface }}>
      {/* Header */}
      <h3 className="text-lg font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
        Payment Method
      </h3>

      {/* Bank Account Display */}
      {last4 ? (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 p-3 rounded-lg"
          style={{ backgroundColor: visualConfig.colors.elevated }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Icons.Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                Bank Account
              </p>
              <p className="text-base md:text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
                {maskBankAccount(last4)}
              </p>
              {account_type && (
                <p className="text-xs capitalize" style={{ color: visualConfig.colors.text.secondary }}>
                  {account_type}
                </p>
              )}
              {bank_name && (
                <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                  {bank_name}
                </p>
              )}
            </div>
          </div>

          <StatusBadge status={getStatusLabel(status)} color={statusColor} theme={theme} />
        </div>
      ) : (
        <div
          className="flex items-center gap-3 mb-4 p-4 border border-yellow-200 rounded-lg"
          style={{ backgroundColor: theme === 'dark' ? 'rgba(251, 191, 36, 0.1)' : 'rgb(254, 252, 232)' }}
        >
          <Icons.AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm" style={{ color: theme === 'dark' ? '#fbbf24' : '#a16207' }}>
            No payment method on file
          </p>
        </div>
      )}

      {/* Conditional Status Messages and Actions */}
      {status === PaymentMethodStatus.VERIFIED && verified_at && (
        <div className="space-y-3">
          <div
            className="border-l-4 border-green-400 p-3 rounded-r"
            style={{ backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgb(240, 253, 244)' }}
          >
            <div className="flex items-start gap-2">
              <Icons.CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#86efac' : '#15803d' }}>
                  Bank account verified
                </p>
                <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#4ade80' : '#16a34a' }}>
                  Verified on {new Date(verified_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onUpdatePaymentMethod}
            disabled={isLoading}
            className="w-full border py-3 px-4 rounded-md hover:opacity-80 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            style={{
              minHeight: '44px',
              backgroundColor: visualConfig.colors.surface,
              color: visualConfig.colors.text.primary,
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgb(209, 213, 219)',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            <Icons.Edit className="h-4 w-4" />
            Update Payment Method
          </button>
        </div>
      )}

      {status === PaymentMethodStatus.PENDING && (
        <div className="space-y-3">
          <div
            className="border-l-4 border-yellow-400 p-3 rounded-r"
            style={{ backgroundColor: theme === 'dark' ? 'rgba(251, 191, 36, 0.1)' : 'rgb(254, 252, 232)' }}
          >
            <div className="flex items-start gap-2">
              <Icons.Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#fbbf24' : '#a16207' }}>
                  Payment method pending
                </p>
                <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#fcd34d' : '#ca8a04' }}>
                  Your bank account is being verified. This usually completes within a few minutes.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onUpdatePaymentMethod}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Icons.RefreshCw className="h-4 w-4" />
            Update Payment Method
          </button>
        </div>
      )}

      {status === PaymentMethodStatus.FAILED && (
        <div className="space-y-3">
          <div
            className="border-l-4 border-red-400 p-3 rounded-r"
            style={{ backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgb(254, 242, 242)' }}
          >
            <div className="flex items-start gap-2">
              <Icons.XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#fca5a5' : '#b91c1c' }}>
                  Verification failed
                </p>
                <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#f87171' : '#dc2626' }}>
                  Unable to verify your bank account. Please try adding it again or use a different account.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onUpdatePaymentMethod}
            disabled={isLoading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Icons.RotateCcw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      )}

      {/* No payment method - show add button */}
      {!last4 && (
        <button
          onClick={onUpdatePaymentMethod}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
          style={{ minHeight: '44px' }}
        >
          <Icons.Plus className="h-4 w-4" />
          Add Payment Method
        </button>
      )}
    </div>
  );
};
