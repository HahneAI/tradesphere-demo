/**
 * PaymentMethodCard Component
 *
 * Displays bank account information, verification status, and action buttons
 * for managing payment methods (verify micro-deposits, update bank account).
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

interface PaymentMethodCardProps {
  /** Payment method information */
  paymentMethod: PaymentMethodInfo;
  /** Callback when "Verify Micro-Deposits" clicked */
  onVerifyMicroDeposits: () => void;
  /** Callback when "Update Bank Account" clicked */
  onUpdateBankAccount?: () => void;
  /** Whether component is in loading state */
  isLoading?: boolean;
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
  onVerifyMicroDeposits,
  onUpdateBankAccount,
  isLoading = false
}) => {
  const { status, last4, bank_name, account_type, verified_at } = paymentMethod;

  const statusColor = getPaymentStatusColor(
    status === PaymentMethodStatus.VERIFIED ? 'succeeded' as any :
    status === PaymentMethodStatus.PENDING ? 'pending' as any :
    'failed' as any
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4">
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>

      {/* Bank Account Display */}
      {last4 ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Icons.Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bank Account</p>
              <p className="text-base md:text-lg font-medium text-gray-900">
                {maskBankAccount(last4)}
              </p>
              {account_type && (
                <p className="text-xs text-gray-500 capitalize">{account_type}</p>
              )}
              {bank_name && (
                <p className="text-xs text-gray-500">{bank_name}</p>
              )}
            </div>
          </div>

          <StatusBadge status={getStatusLabel(status)} color={statusColor} />
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Icons.AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-700">No payment method on file</p>
        </div>
      )}

      {/* Conditional Status Messages and Actions */}
      {status === PaymentMethodStatus.PENDING && (
        <div className="space-y-3">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r">
            <div className="flex items-start gap-2">
              <Icons.Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-700 font-medium">
                  Waiting for micro-deposit verification
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  We've sent 2 small deposits to your bank account. They should appear in 1-3 business days. Once received, verify the amounts below.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onVerifyMicroDeposits}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Icons.CheckCircle className="h-4 w-4" />
            Verify Micro-Deposits
          </button>
        </div>
      )}

      {status === PaymentMethodStatus.VERIFIED && verified_at && (
        <div className="space-y-3">
          <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r">
            <div className="flex items-start gap-2">
              <Icons.CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-700 font-medium">
                  Bank account verified
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Verified on {new Date(verified_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {onUpdateBankAccount && (
            <button
              onClick={onUpdateBankAccount}
              disabled={isLoading}
              className="w-full bg-white text-gray-700 border border-gray-300 py-3 px-4 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              <Icons.Edit className="h-4 w-4" />
              Update Bank Account
            </button>
          )}
        </div>
      )}

      {status === PaymentMethodStatus.FAILED && (
        <div className="space-y-3">
          <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r">
            <div className="flex items-start gap-2">
              <Icons.XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">
                  Verification failed
                </p>
                <p className="text-xs text-red-600 mt-1">
                  The amounts you entered don't match our records. Please check your bank statement and try again.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onVerifyMicroDeposits}
            disabled={isLoading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Icons.RotateCcw className="h-4 w-4" />
            Retry Verification
          </button>
        </div>
      )}

      {/* No payment method - show add button */}
      {!last4 && onUpdateBankAccount && (
        <button
          onClick={onUpdateBankAccount}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
          style={{ minHeight: '44px' }}
        >
          <Icons.Plus className="h-4 w-4" />
          Add Bank Account
        </button>
      )}
    </div>
  );
};
