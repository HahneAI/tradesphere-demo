/**
 * Customer Selection Step (Step 1)
 *
 * Allows user to search and select existing customer or create new one.
 * Features: autocomplete search, recent customers, inline customer creation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CustomerProfile } from '../../../types/customer';
import { CustomerCard } from './components/CustomerCard';
import { customerManagementService } from '../../../services/customerManagementService';
import { getSupabase } from '../../../services/supabase';

interface CustomerSelectionStepProps {
  companyId: string;
  userId: string;
  selectedCustomer: CustomerProfile | null;
  onCustomerSelect: (customer: CustomerProfile) => void;
  onCreateCustomer?: () => void;
}

export const CustomerSelectionStep: React.FC<CustomerSelectionStepProps> = ({
  companyId,
  userId,
  selectedCustomer,
  onCustomerSelect,
  onCreateCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  // Load recent customers
  useEffect(() => {
    loadRecentCustomers();
  }, [companyId]);

  const loadRecentCustomers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_customers')
        .select('*, jobs:ops_jobs(id, created_at)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCustomers(data || []);
      setCustomers(data || []);
    } catch (err: any) {
      setError('Failed to load customers');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setCustomers(recentCustomers);
      return;
    }

    const timer = setTimeout(() => {
      searchCustomers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, recentCustomers]);

  const searchCustomers = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('*')
        .eq('company_id', companyId)
        .or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%,customer_phone.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Search error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Select Customer
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose an existing customer or create a new one
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 text-sm border border-gray-300 dark:border-gray-600
                     rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="Search customers"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Customer List */}
      {customers.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {searchQuery ? 'Search Results' : 'Recent Customers'}
          </h3>
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isSelected={selectedCustomer?.id === customer.id}
              onSelect={onCustomerSelect}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No customers found</p>
        </div>
      )}

      {/* Create New Customer */}
      <button
        type="button"
        onClick={onCreateCustomer}
        className="w-full p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600
                   bg-gray-50 dark:bg-gray-800/50 hover:border-blue-400 hover:bg-blue-50
                   dark:hover:bg-blue-900/10 transition-all group"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center
                          justify-center group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            Create New Customer
          </span>
        </div>
      </button>
    </div>
  );
};
