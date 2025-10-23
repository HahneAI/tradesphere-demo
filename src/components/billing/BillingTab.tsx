/**
 * BillingTab Component
 *
 * Main container for owner billing dashboard. Orchestrates all billing
 * sub-components and manages data fetching, modal state, and refresh logic.
 *
 * Features:
 * - Owner-only access control
 * - Fetch company billing data + payment history on mount
 * - Error handling with user-friendly messages
 * - Loading states while fetching data
 * - Refresh data after modal actions
 * - Mobile-responsive layout
 *
 * Security:
 * - Multi-tenant: All queries filter by company_id
 * - Role check: Only owners can access (is_owner flag)
 * - RLS policies enforced at database level
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSupabase } from '../../services/supabase';
import {
  CompanyBilling,
  Payment,
  PaymentMethodInfo,
  PaymentMethodStatus,
  createCompanyId
} from '../../types/billing';
import { SubscriptionStatusCard } from './SubscriptionStatusCard';
import { PaymentMethodCard } from './PaymentMethodCard';
import { PaymentHistoryTable } from './PaymentHistoryTable';
import { UpdatePaymentMethodModal } from './UpdatePaymentMethodModal';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';

interface BillingTabProps {
  onBackClick: () => void;
}

export const BillingTab: React.FC<BillingTabProps> = ({ onBackClick }) => {
  const { user, isOwner } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  // Data state
  const [billing, setBilling] = useState<CompanyBilling | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Load billing data on mount
  useEffect(() => {
    if (!user?.company_id) {
      setLoading(false);
      return;
    }

    // Check if user is owner
    if (!isOwner) {
      setError('Only company owners can access billing information.');
      setLoading(false);
      return;
    }

    loadBillingData();
  }, [user, isOwner]);

  /**
   * Load all billing data (company + payments)
   */
  const loadBillingData = async () => {
    if (!user?.company_id) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();

      // Fetch company billing information
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();

      if (companyError) {
        throw new Error(`Failed to load billing data: ${companyError.message}`);
      }

      if (!companyData) {
        throw new Error('Company not found');
      }

      // Set billing data
      setBilling(companyData as CompanyBilling);

      // Extract payment method info
      setPaymentMethod({
        status: companyData.payment_method_status as PaymentMethodStatus,
        last4: companyData.bank_account_last4 || null,
        bank_name: null, // Not stored in companies table
        account_type: companyData.bank_account_type as 'checking' | 'savings' | null,
        verified_at: companyData.payment_method_verified_at,
        payment_method_id: companyData.stripe_payment_method_id
      });

      // Fetch last 12 payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', user.company_id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (paymentsError) {
        console.error('Failed to load payment history:', paymentsError);
        // Don't fail the whole page if payments don't load
      } else {
        setPayments(paymentsData || []);
      }

    } catch (err: any) {
      console.error('Error loading billing data:', err);
      setError(err.message || 'Failed to load billing information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle successful payment method update
   */
  const handleVerifySuccess = () => {
    setShowVerifyModal(false);
    loadBillingData(); // Refresh data
  };

  /**
   * Handle successful subscription cancellation
   */
  const handleCancelSuccess = () => {
    setShowCancelModal(false);
    loadBillingData(); // Refresh data
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <Icons.Loader className="h-12 w-12 text-blue-600 animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Loading billing information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <Icons.AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
            <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          {/* TODO: [NATIVE-APP] window.location.reload() is web-only
              Current: Hard page reload via browser API
              Native React Native: Use soft reload (setError(null); loadBillingData();)
              Or: navigation.reset({ index: 0, routes: [{ name: 'BillingTab' }] })
              See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4d-3
              MIGRATION RISK: LOW (soft reload already implemented) */}
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            style={{ minHeight: '44px' }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // No billing data
  if (!billing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 max-w-md w-full text-center">
          <Icons.CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Billing Information</h2>
          <p className="text-gray-600">Unable to load billing data. Please contact support.</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div
      className="min-h-screen p-4 md:p-6 lg:p-8 animate-fade-up-in"
      style={{ backgroundColor: visualConfig.colors.background }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={onBackClick}
            className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
            style={{
              color: visualConfig.colors.primary,
              backgroundColor: visualConfig.colors.surface,
            }}
          >
            <Icons.ArrowLeft className="h-5 w-5" />
            <span>Back to Chat</span>
          </button>

          <div className="relative inline-block mb-2">
            <h1
              className="text-3xl md:text-4xl font-extrabold tracking-tight"
              style={{ color: visualConfig.colors.text.primary }}
            >
              Billing & Subscription
            </h1>
            <div
              className="absolute -bottom-2 left-0 w-24 h-1 rounded-full"
              style={{
                background: `linear-gradient(to right, ${visualConfig.colors.primary}, ${visualConfig.colors.secondary})`
              }}
            ></div>
          </div>
          <p className="mt-4" style={{ color: visualConfig.colors.text.secondary }}>
            Manage your subscription, payment method, and billing history.
          </p>
        </div>

        {/* Subscription Status Card */}
        <SubscriptionStatusCard
          billing={billing}
          onUpdatePayment={() => setShowVerifyModal(true)}
          onCancelSubscription={() => setShowCancelModal(true)}
          isLoading={loading}
        />

        {/* Payment Method Card */}
        {paymentMethod && (
          <PaymentMethodCard
            paymentMethod={paymentMethod}
            onUpdatePaymentMethod={() => setShowVerifyModal(true)}
            isLoading={loading}
          />
        )}

        {/* Payment History Table */}
        <PaymentHistoryTable
          payments={payments}
          isLoading={loading}
        />

        {/* Refresh Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadBillingData}
            disabled={loading}
            className="bg-white text-gray-700 border border-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Icons.RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Billing Data
          </button>
        </div>

        {/* Modals */}
        <UpdatePaymentMethodModal
          isOpen={showVerifyModal}
          onClose={() => setShowVerifyModal(false)}
          billing={billing}
          onSuccess={handleVerifySuccess}
        />

        <CancelSubscriptionModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          billing={billing}
          onSuccess={handleCancelSuccess}
        />
      </div>
    </div>
  );
};
