/**
 * Enhanced CustomersTab Component - Phase 3H UI/UX Improvements
 *
 * Enhancements:
 * - WCAG 2.1 AA compliance with proper ARIA attributes
 * - Full keyboard navigation support
 * - Enhanced empty states with illustrations
 * - Pull-to-refresh for mobile
 * - Filter indicator badges
 * - Improved loading states
 * - Better visual hierarchy
 * - Toast notifications for operations
 * - Focus management
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSupabase } from '../services/supabase';
import { getSmartVisualThemeConfig } from '../config/industry';
import {
  debounce,
  hapticFeedback,
  getTouchTargetSize,
  isMobileDevice,
  SwipeGestureDetector,
  LongPressDetector
} from '../utils/mobile-gestures';
import { customerService } from '../services/customerService';
import { useCustomerContext } from '../hooks/useCustomerContext';
import { Message } from '../types/message';
import { CustomerRepository } from '../services/CustomerRepository';
import { CustomerLifecycleService } from '../services/CustomerLifecycleService';
import { CustomerMergeService } from '../services/CustomerMergeService';
import { CustomerProfile, CustomerSearchFilters } from '../types/customer';
import { LifecycleBadge } from './customers/LifecycleBadge';
import { SourceBadge } from './customers/SourceBadge';
import { TagChip } from './customers/TagChip';
import { CustomerMetrics } from './customers/CustomerMetrics';
import { CustomerDetailModal } from './customers/CustomerDetailModal';
import { CustomerCreateWizard } from './customers/CustomerCreateWizard';
import { CustomerFilterPanel } from './customers/CustomerFilterPanel';
import { CustomerSyncPanel } from './customer/CustomerSyncPanel';

interface Customer {
  session_id: string;
  customer_name: string | null;
  customer_address: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  interaction_summary: string | null;
  created_at: string;
  id?: string;
  company_id?: string;
  lifecycle_stage?: 'prospect' | 'lead' | 'customer' | 'churned';
  tags?: string[];
  source?: 'chat' | 'manual' | 'import';
  status?: 'active' | 'inactive' | 'merged' | 'deleted';
  total_conversations?: number;
  total_interactions?: number;
  total_views?: number;
  first_interaction_at?: string;
  last_interaction_at?: string;
  deleted_at?: string | null;
}

interface EditCustomerData {
  customer_name: string;
  customer_address: string;
  customer_email: string;
  customer_phone: string;
}

interface CustomersTabProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCustomer?: (customer: Customer, messages: Message[]) => void;
}

// Toast notification component
const Toast: React.FC<{
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? '#22C55E' : type === 'error' ? '#EF4444' : visualConfig.colors.primary;
  const Icon = type === 'success' ? Icons.CheckCircle : type === 'error' ? Icons.XCircle : Icons.Info;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in-up"
      style={{ backgroundColor: bgColor, color: 'white' }}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
        aria-label="Close notification"
      >
        <Icons.X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const CustomersTab: React.FC<CustomersTabProps> = ({ isOpen, onClose, onLoadCustomer }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchResultCount, setSearchResultCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchTargetSize, setTouchTargetSize] = useState(getTouchTargetSize());
  const [editData, setEditData] = useState<EditCustomerData>({
    customer_name: '',
    customer_address: '',
    customer_email: '',
    customer_phone: ''
  });

  // Phase 3 New State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [useNewSystem, setUseNewSystem] = useState(true);
  const [filters, setFilters] = useState<CustomerSearchFilters>({});

  // Enhanced state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isPullToRefresh, setIsPullToRefresh] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const visualConfig = getSmartVisualThemeConfig(theme);
  const customerContext = useCustomerContext();
  const isMobile = useMemo(() => isMobileDevice(), []);

  // Phase 3 Service Instances
  const customerRepo = useMemo(() => new CustomerRepository(), []);
  const lifecycleService = useMemo(() => new CustomerLifecycleService(), []);
  const mergeService = useMemo(() => new CustomerMergeService(), []);

  // Recently viewed tracking
  const [recentlyViewedCustomers, setRecentlyViewedCustomers] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const stored = localStorage.getItem(`recentlyViewed_${user.id}`);
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Persist recently viewed
  useEffect(() => {
    if (user?.id && recentlyViewedCustomers.size > 0) {
      try {
        const recentArray = Array.from(recentlyViewedCustomers).slice(0, 20);
        localStorage.setItem(`recentlyViewed_${user.id}`, JSON.stringify(recentArray));
      } catch (error) {
        console.warn('Failed to persist recently viewed customers:', error);
      }
    }
  }, [recentlyViewedCustomers, user?.id]);

  // Focus management
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Focus trap for modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch customers
  useEffect(() => {
    if (user?.id) {
      fetchCustomers();
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCustomers();
    }
  }, [isOpen, user?.id]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Filter and sort
  useEffect(() => {
    let processedCustomers = [...customers];

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      processedCustomers = processedCustomers.filter(customer =>
        customer.customer_name?.toLowerCase().includes(query) ||
        customer.customer_email?.toLowerCase().includes(query) ||
        customer.customer_phone?.toLowerCase().includes(query) ||
        customer.customer_address?.toLowerCase().includes(query)
      );
    }

    processedCustomers.sort((a, b) => {
      const aRecentlyViewed = recentlyViewedCustomers.has(a.customer_name || '');
      const bRecentlyViewed = recentlyViewedCustomers.has(b.customer_name || '');

      if (aRecentlyViewed && !bRecentlyViewed) return -1;
      if (!aRecentlyViewed && bRecentlyViewed) return 1;

      return 0;
    });

    setFilteredCustomers(processedCustomers);
    setSearchResultCount(processedCustomers.length);
  }, [customers, debouncedSearchQuery, recentlyViewedCustomers]);

  const fetchCustomers = async (isRefresh = false) => {
    if (!user?.id || !user?.company_id) return;

    if (isRefresh) {
      setIsRefreshing(true);
      if (isMobile) {
        setIsPullToRefresh(true);
      }
      hapticFeedback.impact('light');
    } else {
      setIsLoading(true);
    }

    try {
      if (useNewSystem) {
        const customerFilters: CustomerSearchFilters = {
          ...filters,
          searchQuery: debouncedSearchQuery || undefined,
          limit: 100,
          sort_by: 'created_at',
          sort_order: 'desc'
        };

        const response = await customerRepo.getCustomers(
          user.company_id,
          customerFilters
        );

        const customerProfiles = response.items;

        const formattedCustomers: Customer[] = customerProfiles.map(profile => ({
          id: profile.id,
          session_id: profile.id || '',
          customer_name: profile.customer_name,
          customer_address: profile.customer_address || null,
          customer_email: profile.customer_email || null,
          customer_phone: profile.customer_phone || null,
          interaction_summary: profile.customer_notes || null,
          created_at: profile.created_at,
          company_id: profile.company_id,
          lifecycle_stage: profile.lifecycle_stage,
          tags: profile.tags,
          source: profile.source,
          status: profile.status,
          total_conversations: profile.total_conversations,
          total_interactions: profile.total_interactions,
          total_views: profile.total_views,
          first_interaction_at: profile.first_interaction_at,
          last_interaction_at: profile.last_interaction_at,
          deleted_at: profile.deleted_at
        }));

        setCustomers(formattedCustomers);
      } else {
        const { customers: customerData, error } = await customerService.getCustomerList(
          user.id,
          { limit: 100 }
        );

        if (error) {
          console.error('Error fetching customers (legacy):', error);
          hapticFeedback.notification('error');
          setToast({ message: 'Failed to load customers', type: 'error' });
          return;
        }

        const formattedCustomers: Customer[] = customerData.map(customer => ({
          session_id: customer.latest_session_id,
          customer_name: customer.customer_name,
          customer_address: customer.customer_address,
          customer_email: customer.customer_email,
          customer_phone: customer.customer_phone,
          interaction_summary: customer.interaction_summary,
          created_at: customer.last_interaction_at
        }));

        setCustomers(formattedCustomers);
      }

      if (isRefresh) {
        hapticFeedback.notification('success');
        setToast({ message: 'Customers refreshed', type: 'success' });
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (isRefresh) {
        hapticFeedback.notification('error');
        setToast({ message: 'Refresh failed', type: 'error' });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsPullToRefresh(false);
    }
  };

  const handleCustomerClick = async (customer: Customer) => {
    hapticFeedback.selection();

    if (isEditMode) {
      setSelectedCustomer(customer);
      setEditData({
        customer_name: customer.customer_name || '',
        customer_address: customer.customer_address || '',
        customer_email: customer.customer_email || '',
        customer_phone: customer.customer_phone || ''
      });
      setShowEditModal(true);
    } else if (useNewSystem) {
      setSelectedCustomer(customer);
      setShowDetailModal(true);

      if (customer.customer_name) {
        setRecentlyViewedCustomers(prev => new Set([customer.customer_name!, ...Array.from(prev)]));
      }
    } else if (onLoadCustomer && customer.customer_name && user?.id) {
      try {
        await customerService.trackCustomerInteraction(
          user.id,
          customer.customer_name,
          customer.session_id,
          'load'
        );

        setRecentlyViewedCustomers(prev => new Set([customer.customer_name!, ...Array.from(prev)]));

        await customerContext.loadCustomerContext(
          customer.customer_name,
          customer.session_id
        );

        if (customerContext.hasContext()) {
          const messages = customerContext.getMessagesForChat();
          onLoadCustomer(customer, messages);
          hapticFeedback.notification('success');
          onClose();
        }
      } catch (error) {
        console.error('Error loading customer context:', error);
        hapticFeedback.notification('error');
        setToast({ message: 'Failed to load customer', type: 'error' });
      }
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer || !user?.id) return;

    hapticFeedback.impact('medium');

    try {
      const { success, error } = await customerService.updateCustomerDetails(
        selectedCustomer.session_id,
        user.id,
        {
          customer_name: editData.customer_name,
          customer_address: editData.customer_address,
          customer_email: editData.customer_email,
          customer_phone: editData.customer_phone
        }
      );

      if (!success) {
        console.error('Error updating customer:', error);
        hapticFeedback.notification('error');
        setToast({ message: 'Failed to update customer', type: 'error' });
        return;
      }

      if (editData.customer_name) {
        setRecentlyViewedCustomers(prev => new Set([editData.customer_name, ...Array.from(prev)]));
      }

      setCustomers(prev =>
        prev.map(c =>
          c.session_id === selectedCustomer.session_id
            ? { ...c, ...editData }
            : c
        )
      );

      setShowEditModal(false);
      setSelectedCustomer(null);
      hapticFeedback.notification('success');
      setToast({ message: 'Customer updated successfully', type: 'success' });

      await fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      hapticFeedback.notification('error');
      setToast({ message: 'Update failed', type: 'error' });
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedCustomer(null);
    setEditData({
      customer_name: '',
      customer_address: '',
      customer_email: '',
      customer_phone: ''
    });
  };

  // Active filters count
  const activeFilterCount = Object.keys(filters).filter(key =>
    filters[key as keyof CustomerSearchFilters] !== undefined
  ).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-overlay-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customers-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-xl animate-scale-in flex flex-col"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0"
               style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <div>
              <h2
                id="customers-modal-title"
                className="text-xl font-semibold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                Customers
              </h2>
              <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: visualConfig.colors.text.secondary }}
              aria-label="Close customers dialog"
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Search and Controls */}
          <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <div className="flex items-center justify-between mb-4">
              {isLoading && (
                <div className="flex items-center" role="status" aria-live="polite">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2"
                       style={{ borderColor: visualConfig.colors.primary }}
                       aria-hidden="true"></div>
                  <span className="ml-3 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Loading customers...
                  </span>
                </div>
              )}
              {isRefreshing && !isPullToRefresh && (
                <div className="flex items-center" role="status" aria-live="polite">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2"
                       style={{ borderColor: visualConfig.colors.primary }}
                       aria-hidden="true"></div>
                  <span className="ml-3 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Refreshing...
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 ml-auto">
                {/* Create Customer Button */}
                <button
                  onClick={() => {
                    setShowCreateWizard(true);
                    hapticFeedback.selection();
                  }}
                  className="px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  style={{
                    backgroundColor: visualConfig.colors.primary,
                    color: visualConfig.colors.text.onPrimary
                  }}
                  aria-label="Create new customer"
                >
                  <Icons.UserPlus className="h-4 w-4" />
                  <span className="text-sm font-medium">New Customer</span>
                </button>

                {/* Filter Button */}
                <button
                  onClick={() => {
                    setShowFilterPanel(!showFilterPanel);
                    hapticFeedback.selection();
                  }}
                  className="relative px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  style={{
                    backgroundColor: showFilterPanel || activeFilterCount > 0
                      ? visualConfig.colors.primary + '20'
                      : 'transparent',
                    color: showFilterPanel || activeFilterCount > 0
                      ? visualConfig.colors.primary
                      : visualConfig.colors.text.secondary,
                    border: `1px solid ${showFilterPanel || activeFilterCount > 0
                      ? visualConfig.colors.primary
                      : (theme === 'light' ? '#d1d5db' : '#4b5563')}`
                  }}
                  aria-label={`Filter customers${activeFilterCount > 0 ? `, ${activeFilterCount} active filters` : ''}`}
                  aria-pressed={showFilterPanel}
                >
                  <Icons.Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filter</span>
                  {activeFilterCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: visualConfig.colors.primary,
                        color: visualConfig.colors.text.onPrimary
                      }}
                      aria-label={`${activeFilterCount} active filters`}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Sync Panel Button */}
                <button
                  onClick={() => {
                    setShowSyncPanel(true);
                    hapticFeedback.selection();
                  }}
                  className="px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  style={{
                    backgroundColor: visualConfig.colors.primary + '10',
                    color: visualConfig.colors.primary
                  }}
                  aria-label="Open customer data sync panel"
                >
                  <Icons.RefreshCcw className="h-4 w-4" />
                  <span className="text-sm font-medium">Sync</span>
                </button>

                {/* Refresh Button */}
                <button
                  onClick={() => fetchCustomers(true)}
                  disabled={isRefreshing}
                  className="p-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  style={{
                    backgroundColor: 'transparent',
                    color: visualConfig.colors.text.secondary
                  }}
                  aria-label="Refresh customer list"
                >
                  <Icons.RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                {/* Edit Mode Toggle */}
                <button
                  onClick={() => {
                    setIsEditMode(!isEditMode);
                    hapticFeedback.selection();
                  }}
                  className={`p-2 rounded-lg transition-colors duration-200`}
                  style={{
                    backgroundColor: isEditMode ? visualConfig.colors.primary + '20' : 'transparent',
                    color: isEditMode ? visualConfig.colors.primary : visualConfig.colors.text.secondary
                  }}
                  aria-label={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
                  aria-pressed={isEditMode}
                >
                  <Icons.Edit3 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div role="search" className="relative">
              <Icons.Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: visualConfig.colors.text.secondary }}
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search customers by name, email, phone, or address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 rounded-lg border focus:outline-none focus:ring-2 transition-all duration-200"
                style={{
                  minHeight: `${touchTargetSize.recommendedSize}px`,
                  padding: `${Math.max(12, (touchTargetSize.recommendedSize - 20) / 2)}px 12px ${Math.max(12, (touchTargetSize.recommendedSize - 20) / 2)}px 40px`,
                  backgroundColor: visualConfig.colors.surface,
                  borderColor: searchQuery ? visualConfig.colors.primary : (theme === 'light' ? '#d1d5db' : '#4b5563'),
                  color: visualConfig.colors.text.primary,
                  fontSize: isMobile ? '16px' : '14px'
                }}
                aria-label="Search customers"
                aria-controls="customer-list"
                aria-describedby="search-results-count"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    hapticFeedback.selection();
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 rounded-full transition-colors duration-200"
                  style={{
                    width: `${touchTargetSize.minSize}px`,
                    height: `${touchTargetSize.minSize}px`,
                    backgroundColor: 'transparent',
                    color: visualConfig.colors.text.secondary
                  }}
                  aria-label="Clear search"
                >
                  <Icons.X className="h-4 w-4 mx-auto" />
                </button>
              )}
            </div>

            {/* Search results announcement for screen readers */}
            <div
              id="search-results-count"
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {searchQuery && `Found ${searchResultCount} ${searchResultCount === 1 ? 'customer' : 'customers'}`}
            </div>
          </div>

          {/* Customer List */}
          <div
            id="customer-list"
            className="flex-1 overflow-y-auto p-4"
            role="region"
            aria-label="Customer list"
          >
            {isPullToRefresh && (
              <div className="flex items-center justify-center py-4" role="status" aria-live="polite">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2"
                     style={{ borderColor: visualConfig.colors.primary }}
                     aria-hidden="true"></div>
                <span className="ml-3 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                  Refreshing...
                </span>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3" role="status" aria-label="Loading customers">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonCustomerCard
                    key={`skeleton-${index}`}
                    visualConfig={visualConfig}
                    theme={theme}
                    delay={index * 0.1}
                  />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                {searchQuery ? (
                  <>
                    <Icons.SearchX
                      className="h-16 w-16 mb-4"
                      style={{ color: visualConfig.colors.text.secondary }}
                      aria-hidden="true"
                    />
                    <p className="text-xl font-semibold mb-2" style={{ color: visualConfig.colors.text.primary }}>
                      No matching customers
                    </p>
                    <p className="text-sm mb-6" style={{ color: visualConfig.colors.text.secondary }}>
                      Try adjusting your search terms or clear the search
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        hapticFeedback.selection();
                      }}
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{
                        backgroundColor: visualConfig.colors.primary,
                        color: visualConfig.colors.text.onPrimary
                      }}
                    >
                      Clear Search
                    </button>
                  </>
                ) : customers.length === 0 ? (
                  <>
                    <Icons.Users
                      className="h-16 w-16 mb-4"
                      style={{ color: visualConfig.colors.text.secondary }}
                      aria-hidden="true"
                    />
                    <p className="text-xl font-semibold mb-2" style={{ color: visualConfig.colors.text.primary }}>
                      No customers yet
                    </p>
                    <p className="text-sm mb-6 text-center max-w-md" style={{ color: visualConfig.colors.text.secondary }}>
                      Get started by creating your first customer or start a chat conversation
                    </p>
                    <button
                      onClick={() => {
                        setShowCreateWizard(true);
                        hapticFeedback.selection();
                      }}
                      className="px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                      style={{
                        backgroundColor: visualConfig.colors.primary,
                        color: visualConfig.colors.text.onPrimary
                      }}
                    >
                      <Icons.UserPlus className="h-5 w-5" />
                      Create Your First Customer
                    </button>
                  </>
                ) : (
                  <>
                    <Icons.Filter
                      className="h-16 w-16 mb-4"
                      style={{ color: visualConfig.colors.text.secondary }}
                      aria-hidden="true"
                    />
                    <p className="text-xl font-semibold mb-2" style={{ color: visualConfig.colors.text.primary }}>
                      No customers match your filters
                    </p>
                    <p className="text-sm mb-6" style={{ color: visualConfig.colors.text.secondary }}>
                      Try removing some filters to see more results
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map((customer, index) => (
                  <div
                    key={customer.session_id}
                    className="stagger-item"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <CustomerCard
                      customer={customer}
                      visualConfig={visualConfig}
                      theme={theme}
                      isEditMode={isEditMode}
                      onClick={() => handleCustomerClick(customer)}
                      searchQuery={searchQuery}
                      touchTargetSize={touchTargetSize}
                      isMobile={isMobile}
                      isRecentlyViewed={recentlyViewedCustomers.has(customer.customer_name || '')}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legacy Edit Modal */}
          {showEditModal && selectedCustomer && (
            <EditCustomerModal
              customer={selectedCustomer}
              editData={editData}
              setEditData={setEditData}
              visualConfig={visualConfig}
              theme={theme}
              onSave={handleSaveCustomer}
              onClose={closeEditModal}
            />
          )}

          {/* Phase 3 Customer Detail Modal */}
          {showDetailModal && selectedCustomer && selectedCustomer.id && (
            <CustomerDetailModal
              customer={{
                id: selectedCustomer.id,
                company_id: selectedCustomer.company_id || user?.company_id || '',
                customer_name: selectedCustomer.customer_name || '',
                customer_email: selectedCustomer.customer_email,
                customer_phone: selectedCustomer.customer_phone,
                customer_address: selectedCustomer.customer_address,
                customer_notes: selectedCustomer.interaction_summary,
                lifecycle_stage: selectedCustomer.lifecycle_stage || 'prospect',
                tags: selectedCustomer.tags || [],
                source: selectedCustomer.source || 'chat',
                status: selectedCustomer.status || 'active',
                total_conversations: selectedCustomer.total_conversations || 0,
                total_interactions: selectedCustomer.total_interactions || 0,
                total_views: selectedCustomer.total_views || 0,
                view_count: selectedCustomer.total_views || 0,
                first_interaction_at: selectedCustomer.first_interaction_at,
                last_interaction_at: selectedCustomer.last_interaction_at,
                created_at: selectedCustomer.created_at,
                updated_at: selectedCustomer.created_at,
                deleted_at: selectedCustomer.deleted_at || null,
                merged_into_customer_id: null,
                created_by_user_id: user?.id,
                created_by_user_name: user?.display_name || null
              }}
              isOpen={showDetailModal}
              onClose={() => {
                setShowDetailModal(false);
                setSelectedCustomer(null);
              }}
              onUpdate={async (updates) => {
                if (!selectedCustomer.id || !user?.company_id) return;

                await customerRepo.updateCustomer(selectedCustomer.id, user.company_id, updates);
                await fetchCustomers();

                setShowDetailModal(false);
                setSelectedCustomer(null);
                setToast({ message: 'Customer updated successfully', type: 'success' });
              }}
              onDelete={async (customerId) => {
                if (!user?.company_id) return;

                await customerRepo.deleteCustomer(customerId, user.company_id);
                await fetchCustomers();

                setShowDetailModal(false);
                setSelectedCustomer(null);
                setToast({ message: 'Customer deleted successfully', type: 'success' });
              }}
            />
          )}
        </div>
      </div>

      {/* Phase 3E Customer Sync Panel Modal */}
      {showSyncPanel && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[60] animate-overlay-fade-in"
            onClick={() => setShowSyncPanel(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sync-panel-title"
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowSyncPanel(false)}
          >
            <div
              className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl animate-scale-in overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
                <h2 id="sync-panel-title" className="text-2xl font-bold text-gray-900 dark:text-white">
                  Customer Data Sync
                </h2>
                <button
                  onClick={() => setShowSyncPanel(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close sync panel"
                >
                  <Icons.X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <CustomerSyncPanel />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

// Customer Card Component (kept same as original with minor accessibility enhancements)
const CustomerCard: React.FC<{
  customer: Customer;
  visualConfig: any;
  theme: 'light' | 'dark';
  isEditMode: boolean;
  onClick: () => void;
  searchQuery: string;
  touchTargetSize: { minSize: number; recommendedSize: number };
  isMobile: boolean;
  isRecentlyViewed: boolean;
}> = ({ customer, visualConfig, theme, isEditMode, onClick, searchQuery, touchTargetSize, isMobile, isRecentlyViewed }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPressed, setIsPressed] = useState(false);
  const swipeDetector = useMemo(() => new SwipeGestureDetector({ minDistance: 60 }), []);
  const longPressDetector = useMemo(() => new LongPressDetector({ duration: 600 }), []);

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setIsVisible(true);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches =
      customer.customer_name?.toLowerCase().includes(query) ||
      customer.customer_email?.toLowerCase().includes(query) ||
      customer.customer_phone?.toLowerCase().includes(query) ||
      customer.customer_address?.toLowerCase().includes(query);

    setIsVisible(matches);
  }, [searchQuery, customer]);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Customer: ${customer.customer_name || 'Unnamed'}${isRecentlyViewed ? ' (Recently viewed)' : ''}`}
      className={`rounded-lg border cursor-pointer transition-all duration-300 ${
        isEditMode ? 'hover:shadow-lg' : ''
      } ${isPressed ? 'scale-98' : 'scale-100'} ${
        isRecentlyViewed ? 'ring-1' : ''
      }`}
      style={{
        backgroundColor: isPressed ? visualConfig.colors.primary + '10' : (
          isRecentlyViewed ? visualConfig.colors.primary + '05' : visualConfig.colors.surface
        ),
        borderColor: isPressed || isEditMode || isRecentlyViewed ? visualConfig.colors.primary : (theme === 'light' ? '#e5e7eb' : '#374151'),
        opacity: isVisible ? 1 : 0.3,
        transform: `${isVisible ? 'translateY(0)' : 'translateY(-10px)'} ${isPressed ? 'scale(0.98)' : 'scale(1)'}`,
        minHeight: `${touchTargetSize.recommendedSize}px`,
        padding: `${Math.max(12, (touchTargetSize.recommendedSize - 40) / 2)}px 16px`,
        ...(isRecentlyViewed && {
          ringColor: visualConfig.colors.primary + '30'
        })
      }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onTouchStart={(e) => {
        if (!isEditMode) {
          longPressDetector.onTouchStart(e.nativeEvent, () => {
            hapticFeedback.impact('medium');
          });
        }
        swipeDetector.onTouchStart(e.nativeEvent);
        setIsPressed(true);
      }}
      onTouchMove={(e) => {
        longPressDetector.onTouchMove(e.nativeEvent);
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const isOutside = touch.clientX < rect.left || touch.clientX > rect.right ||
                         touch.clientY < rect.top || touch.clientY > rect.bottom;
        if (isOutside) {
          setIsPressed(false);
        }
      }}
      onTouchEnd={(e) => {
        longPressDetector.onTouchEnd();
        swipeDetector.onTouchEnd(e.nativeEvent, (direction, distance) => {
          if (direction === 'right' && distance > 80) {
            hapticFeedback.impact('light');
          }
        });
        setIsPressed(false);
      }}
      onMouseOver={(e) => {
        if (!isMobile && (isEditMode || !isEditMode)) {
          e.currentTarget.style.borderColor = visualConfig.colors.primary;
          e.currentTarget.style.backgroundColor = visualConfig.colors.primary + '05';
        }
      }}
      onMouseOut={(e) => {
        if (!isMobile) {
          e.currentTarget.style.borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
          e.currentTarget.style.backgroundColor = visualConfig.colors.surface;
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {!isEditMode && (
            <>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isRecentlyViewed ? visualConfig.colors.primary : visualConfig.colors.text.secondary + '40' }}
                aria-hidden="true"
              />
              {isRecentlyViewed && (
                <div className="flex items-center gap-1">
                  <Icons.Clock className="h-3 w-3" style={{ color: visualConfig.colors.primary }} aria-hidden="true" />
                  <span className="text-xs font-medium" style={{ color: visualConfig.colors.primary }}>Recently viewed</span>
                </div>
              )}
            </>
          )}
        </div>
        {isEditMode && (
          <div className="flex items-center gap-1">
            <Icons.Edit3 className="h-4 w-4" style={{ color: visualConfig.colors.primary }} aria-hidden="true" />
            <span className="text-xs" style={{ color: visualConfig.colors.primary }}>Tap to edit</span>
          </div>
        )}
        {!isEditMode && (
          <div className="flex items-center gap-1">
            <Icons.MessageCircle className="h-4 w-4" style={{ color: visualConfig.colors.text.secondary }} aria-hidden="true" />
            <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>Tap to view</span>
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-2" style={{ color: visualConfig.colors.text.primary }}>
        {customer.customer_name || 'Unnamed Customer'}
      </h3>

      {customer.interaction_summary && (
        <p className="text-sm mb-3 line-clamp-2" style={{ color: visualConfig.colors.text.secondary }}>
          {customer.interaction_summary}
        </p>
      )}

      <div className="space-y-1 text-sm">
        {customer.customer_address && (
          <div className="flex items-center gap-2">
            <Icons.MapPin className="h-3 w-3 flex-shrink-0" style={{ color: visualConfig.colors.text.secondary }} aria-hidden="true" />
            <span style={{ color: visualConfig.colors.text.secondary }}>{customer.customer_address}</span>
          </div>
        )}

        {customer.customer_email && (
          <div className="flex items-center gap-2">
            <Icons.Mail className="h-3 w-3 flex-shrink-0" style={{ color: visualConfig.colors.text.secondary }} aria-hidden="true" />
            <span style={{ color: visualConfig.colors.text.secondary }}>{customer.customer_email}</span>
          </div>
        )}

        {customer.customer_phone && (
          <div className="flex items-center gap-2">
            <Icons.Phone className="h-3 w-3 flex-shrink-0" style={{ color: visualConfig.colors.text.secondary }} aria-hidden="true" />
            <span style={{ color: visualConfig.colors.text.secondary }}>{customer.customer_phone}</span>
          </div>
        )}
      </div>
    </article>
  );
};

// Edit Customer Modal (kept same as original)
const EditCustomerModal: React.FC<{
  customer: Customer;
  editData: EditCustomerData;
  setEditData: React.Dispatch<React.SetStateAction<EditCustomerData>>;
  visualConfig: any;
  theme: 'light' | 'dark';
  onSave: () => void;
  onClose: () => void;
}> = ({ customer, editData, setEditData, visualConfig, theme, onSave, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-overlay-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-customer-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white rounded-lg shadow-xl animate-scale-in"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b"
               style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <h2 id="edit-customer-title" className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
              Edit Customer
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: visualConfig.colors.text.secondary }}
              aria-label="Close dialog"
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div>
              <label htmlFor="customer-name" className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Customer Name
              </label>
              <input
                id="customer-name"
                type="text"
                value={editData.customer_name}
                onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary
                }}
                required
              />
            </div>

            <div>
              <label htmlFor="customer-address" className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Address
              </label>
              <textarea
                id="customer-address"
                value={editData.customer_address}
                onChange={(e) => setEditData({ ...editData, customer_address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary
                }}
              />
            </div>

            <div>
              <label htmlFor="customer-email" className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Email
              </label>
              <input
                id="customer-email"
                type="email"
                value={editData.customer_email}
                onChange={(e) => setEditData({ ...editData, customer_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary
                }}
              />
            </div>

            <div>
              <label htmlFor="customer-phone" className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Phone Number
              </label>
              <input
                id="customer-phone"
                type="tel"
                value={editData.customer_phone}
                onChange={(e) => setEditData({ ...editData, customer_phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t"
                 style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  color: visualConfig.colors.text.secondary,
                  border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: visualConfig.colors.primary,
                  color: visualConfig.colors.text.onPrimary,
                  opacity: isSaving ? 0.7 : 1
                }}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2"
                         style={{ borderColor: visualConfig.colors.text.onPrimary }} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

// Skeleton Customer Card (kept same as original)
const SkeletonCustomerCard: React.FC<{
  visualConfig: any;
  theme: 'light' | 'dark';
  delay: number;
}> = ({ visualConfig, theme, delay }) => {
  return (
    <div
      className="rounded-lg border p-4 animate-bounce-in-mobile"
      style={{
        backgroundColor: visualConfig.colors.surface,
        borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
        animationDelay: `${delay}s`
      }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full skeleton-shimmer"
            style={{ backgroundColor: visualConfig.colors.primary + '30' }}
          />
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded skeleton-shimmer"
            style={{ backgroundColor: visualConfig.colors.text.secondary + '20' }}
          />
          <div
            className="w-12 h-3 rounded skeleton-shimmer"
            style={{ backgroundColor: visualConfig.colors.text.secondary + '20' }}
          />
        </div>
      </div>

      <div
        className="h-6 rounded skeleton-shimmer mb-3"
        style={{
          backgroundColor: visualConfig.colors.text.primary + '20',
          width: `${60 + Math.random() * 30}%`
        }}
      />

      <div className="space-y-2 mb-3">
        <div
          className="h-4 rounded skeleton-shimmer"
          style={{
            backgroundColor: visualConfig.colors.text.secondary + '15',
            width: `${80 + Math.random() * 15}%`
          }}
        />
        <div
          className="h-4 rounded skeleton-shimmer"
          style={{
            backgroundColor: visualConfig.colors.text.secondary + '15',
            width: `${50 + Math.random() * 30}%`
          }}
        />
      </div>

      <div className="space-y-2">
        {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded skeleton-shimmer"
              style={{ backgroundColor: visualConfig.colors.text.secondary + '20' }}
            />
            <div
              className="h-3 rounded skeleton-shimmer"
              style={{
                backgroundColor: visualConfig.colors.text.secondary + '15',
                width: `${40 + Math.random() * 40}%`
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomersTab;
