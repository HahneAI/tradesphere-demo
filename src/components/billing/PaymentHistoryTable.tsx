/**
 * PaymentHistoryTable Component
 *
 * Displays payment transaction history with mobile-responsive layout:
 * - Desktop (≥640px): Full table with sortable columns
 * - Mobile (<640px): Card-based layout
 *
 * Features:
 * - Status badges for visual scanning
 * - Click to view failure details
 * - Empty state for new accounts
 * - Last 12 months of payment history
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import {
  Payment,
  PaymentStatus,
  formatCurrency,
  formatBillingPeriod,
  getPaymentStatusColor,
  getACHFailureMessage
} from '../../types/billing';
import { StatusBadge } from './StatusBadge';
import { VisualThemeConfig } from '../../config/industry';

interface PaymentHistoryTableProps {
  /** List of payment transactions */
  payments: Payment[];
  /** Callback when payment row clicked */
  onPaymentClick?: (payment: Payment) => void;
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
const getStatusLabel = (status: PaymentStatus): string => {
  switch (status) {
    case PaymentStatus.SUCCEEDED:
      return 'Paid';
    case PaymentStatus.PENDING:
      return 'Pending';
    case PaymentStatus.PROCESSING:
      return 'Processing';
    case PaymentStatus.FAILED:
      return 'Failed';
    default:
      return 'Unknown';
  }
};

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  payments,
  onPaymentClick,
  isLoading = false,
  visualConfig,
  theme
}) => {
  // TODO: [NATIVE-APP] Expandable table rows use HTML table elements
  // Current: <tr> with colSpan for full-width expansion
  // Native React Native: Use LayoutAnimation or react-native-collapsible
  //   - Enable LayoutAnimation.configureNext() before setState
  //   - Use Pressable for click handling (supports touch feedback)
  //   - Render error section conditionally (no table rows needed)
  //   - Add chevron indicator (chevron-up/chevron-down)
  // Alternative: <Collapsible collapsed={!expanded}> component
  // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4d-7
  // MIGRATION RISK: MEDIUM (smooth animations required)
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const handleRowClick = (payment: Payment) => {
    if (payment.status === PaymentStatus.FAILED) {
      setExpandedPaymentId(expandedPaymentId === payment.id ? null : payment.id);
    }
    onPaymentClick?.(payment);
  };

  // Empty state
  if (!isLoading && payments.length === 0) {
    return (
      <div className="rounded-lg shadow-md p-6 md:p-8" style={{ backgroundColor: visualConfig.colors.surface }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
          Payment History
        </h3>
        <div className="text-center py-16 px-4">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-full">
              <Icons.CreditCard className="w-16 h-16 mx-auto text-blue-600" />
            </div>
          </div>
          <h4 className="text-xl font-bold mb-2" style={{ color: visualConfig.colors.text.primary }}>
            No payment history yet
          </h4>
          <p className="text-base max-w-md mx-auto mb-6" style={{ color: visualConfig.colors.text.secondary }}>
            Your first payment will appear here after your trial ends. We'll keep a detailed record of all transactions.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            <Icons.Shield className="h-4 w-4" />
            <span>Bank-level security with Stripe ACH</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-md p-4 md:p-6" style={{ backgroundColor: visualConfig.colors.surface }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
        Payment History
      </h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Icons.Loader className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* TODO: [NATIVE-APP] Responsive table uses Tailwind CSS classes
              Current: hidden sm:block (desktop table) + sm:hidden (mobile cards)
              Native React Native: Always use card layout (mobile-first)
              - Replace table with FlatList component
              - Use card layout from sm:hidden section (already mobile-optimized)
              - Optional: Add tablet support with useWindowDimensions() hook
              See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4d-4
              MIGRATION RISK: LOW (mobile card layout already implemented) */}
          {/* Desktop Table View (≥640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(229, 231, 235)'}` }}>
                  <th className="text-left py-3 px-4 font-semibold text-sm" style={{ color: visualConfig.colors.text.primary }}>Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm" style={{ color: visualConfig.colors.text.primary }}>Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm" style={{ color: visualConfig.colors.text.primary }}>Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm" style={{ color: visualConfig.colors.text.primary }}>Period</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <React.Fragment key={payment.id}>
                    <tr
                      className={`transition-colors ${payment.status === PaymentStatus.FAILED ? 'cursor-pointer' : ''}`}
                      style={{
                        borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(243, 244, 246)'}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(249, 250, 251)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={() => handleRowClick(payment)}
                    >
                      <td className="py-3 px-4 text-sm" style={{ color: visualConfig.colors.text.primary }}>
                        {new Date(payment.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          status={getStatusLabel(payment.status)}
                          color={getPaymentStatusColor(payment.status)}
                          theme={theme}
                        />
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                        {payment.subscription_period_start && payment.subscription_period_end
                          ? formatBillingPeriod(payment.subscription_period_start, payment.subscription_period_end)
                          : 'N/A'}
                      </td>
                    </tr>
                    {/* Expandable failure details row */}
                    {expandedPaymentId === payment.id && payment.status === PaymentStatus.FAILED && (
                      <tr
                        style={{
                          backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgb(254, 242, 242)',
                          borderBottom: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgb(254, 226, 226)'}`
                        }}
                      >
                        <td colSpan={4} className="py-3 px-4">
                          <div className="flex items-start gap-2">
                            <Icons.AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-medium" style={{ color: theme === 'dark' ? '#fca5a5' : '#b91c1c' }}>
                                Failure Reason
                              </p>
                              <p className="text-sm mt-1" style={{ color: theme === 'dark' ? '#f87171' : '#dc2626' }}>
                                {payment.failure_message || getACHFailureMessage(payment.failure_code)}
                              </p>
                              {payment.failure_code && (
                                <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#ef4444' : '#ef4444' }}>
                                  Code: {payment.failure_code}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (<640px) */}
          <div className="sm:hidden space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className={`border rounded-lg p-4 ${
                  payment.status === PaymentStatus.FAILED ? 'cursor-pointer' : ''
                }`}
                style={{
                  minHeight: '44px',
                  backgroundColor: visualConfig.colors.surface,
                  borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(229, 231, 235)'
                }}
                onMouseEnter={(e) => {
                  if (payment.status === PaymentStatus.FAILED) {
                    e.currentTarget.style.borderColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgb(209, 213, 219)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(229, 231, 235)';
                }}
                onClick={() => handleRowClick(payment)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                    {formatCurrency(payment.amount)}
                  </span>
                  <StatusBadge
                    status={getStatusLabel(payment.status)}
                    color={getPaymentStatusColor(payment.status)}
                    theme={theme}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    <Icons.Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(payment.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}</span>
                  </div>

                  {payment.subscription_period_start && payment.subscription_period_end && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                      <Icons.Clock className="h-3.5 w-3.5" />
                      <span>Period: {formatBillingPeriod(payment.subscription_period_start, payment.subscription_period_end)}</span>
                    </div>
                  )}
                </div>

                {/* Expandable failure details */}
                {expandedPaymentId === payment.id && payment.status === PaymentStatus.FAILED && (
                  <div
                    className="mt-3 pt-3 -mx-4 -mb-4 p-4 rounded-b-lg"
                    style={{
                      borderTop: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : 'rgb(254, 226, 226)'}`,
                      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgb(254, 242, 242)'
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Icons.AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium mb-1" style={{ color: theme === 'dark' ? '#fca5a5' : '#b91c1c' }}>
                          Failure Reason
                        </p>
                        <p className="text-sm" style={{ color: theme === 'dark' ? '#f87171' : '#dc2626' }}>
                          {payment.failure_message || getACHFailureMessage(payment.failure_code)}
                        </p>
                        {payment.failure_code && (
                          <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#ef4444' : '#ef4444' }}>
                            Code: {payment.failure_code}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
