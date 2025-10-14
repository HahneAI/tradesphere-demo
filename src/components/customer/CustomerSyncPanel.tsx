/**
 * Customer Sync Panel
 *
 * Manual sync operations UI for customer data management:
 * - Sync orphaned chat conversations to customers
 * - Bulk enrich customer profiles from conversations
 * - View sync statistics and progress
 *
 * Part of Phase 3E: Customer Data Sync System
 */

import { useState } from 'react';
import { customerSyncService } from '../../services/CustomerSyncService';
import { customerRepository } from '../../services/CustomerRepository';
import { useAuth } from '../../context/AuthContext';

interface SyncStats {
  totalCustomers: number;
  orphanedConversations: number;
  lastSyncTime: string | null;
  syncInProgress: boolean;
}

export function CustomerSyncPanel() {
  const { user } = useAuth();
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalCustomers: 0,
    orphanedConversations: 0,
    lastSyncTime: null,
    syncInProgress: false
  });

  const [syncProgress, setSyncProgress] = useState<{
    operation: string;
    current: number;
    total: number;
  } | null>(null);

  const [syncResults, setSyncResults] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Load initial stats
  const loadStats = async () => {
    if (!user?.company_id) return;

    try {
      // Get total customers count
      const customers = await customerRepository.getCustomersByCompany(user.company_id);

      // Get orphaned conversations count
      const orphaned = await customerSyncService.findOrphanedConversations(user.company_id);

      setSyncStats({
        totalCustomers: customers.length,
        orphanedConversations: orphaned.length,
        lastSyncTime: localStorage.getItem('last_customer_sync') || null,
        syncInProgress: false
      });
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  };

  // Sync orphaned conversations
  const handleSyncOrphaned = async () => {
    if (!user?.company_id) {
      setSyncResults({
        success: false,
        message: 'No company ID found. Please ensure you are logged in.'
      });
      return;
    }

    setSyncStats(prev => ({ ...prev, syncInProgress: true }));
    setSyncProgress({
      operation: 'Syncing orphaned conversations...',
      current: 0,
      total: syncStats.orphanedConversations
    });
    setSyncResults(null);

    try {
      const synced = await customerSyncService.syncOrphanedConversations(user.company_id);

      setSyncResults({
        success: true,
        message: `Successfully synced ${synced} conversations`,
        details: {
          synced,
          total: syncStats.orphanedConversations
        }
      });

      // Update last sync time
      localStorage.setItem('last_customer_sync', new Date().toISOString());

      // Refresh stats
      await loadStats();
    } catch (error: any) {
      setSyncResults({
        success: false,
        message: `Sync failed: ${error.message}`,
        details: error
      });
    } finally {
      setSyncStats(prev => ({ ...prev, syncInProgress: false }));
      setSyncProgress(null);
    }
  };

  // Bulk enrich all customers
  const handleBulkEnrich = async () => {
    if (!user?.company_id) {
      setSyncResults({
        success: false,
        message: 'No company ID found. Please ensure you are logged in.'
      });
      return;
    }

    setSyncStats(prev => ({ ...prev, syncInProgress: true }));
    setSyncProgress({
      operation: 'Enriching customer profiles...',
      current: 0,
      total: syncStats.totalCustomers
    });
    setSyncResults(null);

    try {
      const customers = await customerRepository.getCustomersByCompany(user.company_id);
      let enriched = 0;
      let failed = 0;

      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];

        setSyncProgress({
          operation: 'Enriching customer profiles...',
          current: i + 1,
          total: customers.length
        });

        try {
          await customerSyncService.enrichCustomerFromConversations(customer.id);
          enriched++;
        } catch (error) {
          console.error(`Failed to enrich customer ${customer.id}:`, error);
          failed++;
        }
      }

      setSyncResults({
        success: true,
        message: `Enriched ${enriched} customers`,
        details: {
          enriched,
          failed,
          total: customers.length
        }
      });

      // Update last sync time
      localStorage.setItem('last_customer_sync', new Date().toISOString());

    } catch (error: any) {
      setSyncResults({
        success: false,
        message: `Enrichment failed: ${error.message}`,
        details: error
      });
    } finally {
      setSyncStats(prev => ({ ...prev, syncInProgress: false }));
      setSyncProgress(null);
    }
  };

  // Refresh stats on mount
  useState(() => {
    loadStats();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Customer Data Sync
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage customer data synchronization from chat conversations
        </p>
      </div>

      {/* Sync Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Customers
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {syncStats.totalCustomers}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Orphaned Conversations
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {syncStats.orphanedConversations}
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Last Sync
              </p>
              <p className="text-lg font-medium text-gray-900 dark:text-white mt-2">
                {syncStats.lastSyncTime
                  ? new Date(syncStats.lastSyncTime).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sync Operations
        </h3>

        <div className="space-y-4">
          {/* Sync Orphaned Conversations */}
          <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Sync Orphaned Conversations
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Link chat conversations to customer records automatically using fuzzy matching on name, email, and phone.
              </p>
              {syncStats.orphanedConversations === 0 && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  ✓ All conversations are linked
                </p>
              )}
            </div>
            <button
              onClick={handleSyncOrphaned}
              disabled={syncStats.syncInProgress || syncStats.orphanedConversations === 0}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {syncStats.syncInProgress ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* Bulk Enrich Customers */}
          <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Bulk Enrich All Customers
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Update customer profiles with extracted topics, tags, and conversation summaries from their chat history.
              </p>
            </div>
            <button
              onClick={handleBulkEnrich}
              disabled={syncStats.syncInProgress || syncStats.totalCustomers === 0}
              className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {syncStats.syncInProgress ? 'Enriching...' : 'Enrich All'}
            </button>
          </div>

          {/* Refresh Stats */}
          <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Refresh Statistics
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Update the sync statistics displayed above.
              </p>
            </div>
            <button
              onClick={loadStats}
              disabled={syncStats.syncInProgress}
              className="ml-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {syncProgress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {syncProgress.operation}
            </span>
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {syncProgress.current} / {syncProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(syncProgress.current / syncProgress.total) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Sync Results */}
      {syncResults && (
        <div className={`rounded-lg p-6 ${
          syncResults.success
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {syncResults.success ? (
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                syncResults.success
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {syncResults.message}
              </h3>
              {syncResults.details && (
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(syncResults.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          How Customer Sync Works
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li className="flex items-start">
            <svg className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Auto-sync:</strong> New conversations are automatically linked to customers when customer info is provided in chat</span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Fuzzy matching:</strong> Conversations are matched by email (100% confidence), phone (90%), or name (80%)</span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Enrichment:</strong> Customer profiles are enhanced with topics, tags, and summaries extracted from conversations</span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span><strong>Multi-tenant safe:</strong> All sync operations respect company boundaries and only access your company's data</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
