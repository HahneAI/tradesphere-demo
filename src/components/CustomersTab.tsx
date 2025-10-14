import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
// Phase 3 New Imports
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

interface Customer {
  // Legacy fields (for backward compatibility)
  session_id: string;
  customer_name: string | null;
  customer_address: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  interaction_summary: string | null;
  created_at: string;
  // Phase 3 new fields
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
  const [useNewSystem, setUseNewSystem] = useState(true); // Feature flag for gradual rollout
  const [filters, setFilters] = useState<CustomerSearchFilters>({});

  const visualConfig = getSmartVisualThemeConfig(theme);
  const customerContext = useCustomerContext();
  const isMobile = useMemo(() => isMobileDevice(), []);

  // Phase 3 Service Instances
  const customerRepo = useMemo(() => new CustomerRepository(), []);
  const lifecycleService = useMemo(() => new CustomerLifecycleService(), []);
  const mergeService = useMemo(() => new CustomerMergeService(), []);

  // Recently viewed tracking state with localStorage persistence
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

  // Persist recently viewed customers to localStorage
  useEffect(() => {
    if (user?.id && recentlyViewedCustomers.size > 0) {
      try {
        const recentArray = Array.from(recentlyViewedCustomers).slice(0, 20); // Keep only last 20
        localStorage.setItem(`recentlyViewed_${user.id}`, JSON.stringify(recentArray));
      } catch (error) {
        console.warn('Failed to persist recently viewed customers:', error);
      }
    }
  }, [recentlyViewedCustomers, user?.id]);

  // Fetch customers on component mount and when modal opens
  useEffect(() => {
    if (user?.id) {
      fetchCustomers();
    }
  }, [user?.id]);

  // Auto-refresh when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCustomers();
    }
  }, [isOpen, user?.id]);

  // Debounced search effect
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Filter and sort customers based on debounced search query and recently viewed
  useEffect(() => {
    let processedCustomers = [...customers];

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      processedCustomers = processedCustomers.filter(customer =>
        customer.customer_name?.toLowerCase().includes(query) ||
        customer.customer_email?.toLowerCase().includes(query) ||
        customer.customer_phone?.toLowerCase().includes(query) ||
        customer.customer_address?.toLowerCase().includes(query)
      );
    }

    // Apply recently viewed sorting - recently viewed customers appear first
    processedCustomers.sort((a, b) => {
      const aRecentlyViewed = recentlyViewedCustomers.has(a.customer_name || '');
      const bRecentlyViewed = recentlyViewedCustomers.has(b.customer_name || '');
      
      if (aRecentlyViewed && !bRecentlyViewed) return -1;
      if (!aRecentlyViewed && bRecentlyViewed) return 1;
      
      // If both or neither recently viewed, maintain original order (database sorting)
      return 0;
    });
    
    setFilteredCustomers(processedCustomers);
    setSearchResultCount(processedCustomers.length);
  }, [customers, debouncedSearchQuery, recentlyViewedCustomers]);

  const fetchCustomers = async (isRefresh = false) => {
    if (!user?.id || !user?.company_id) return;

    if (isRefresh) {
      setIsRefreshing(true);
      hapticFeedback.impact('light');
    } else {
      setIsLoading(true);
    }

    try {
      if (useNewSystem) {
        // Phase 3: Use new CustomerRepository
        const customerFilters: CustomerSearchFilters = {
          ...filters,
          searchQuery: debouncedSearchQuery || undefined,
          limit: 100,
          sort_by: 'created_at', // Use customers table column (not metrics)
          sort_order: 'desc'
        };

        const { customers: customerProfiles, error } = await customerRepo.getCustomers(
          user.company_id,
          customerFilters
        );

        if (error) {
          console.error('Error fetching customers (new system):', error);
          hapticFeedback.notification('error');
          return;
        }

        // Convert CustomerProfile to Customer interface for backward compatibility
        const formattedCustomers: Customer[] = customerProfiles.map(profile => ({
          id: profile.id,
          session_id: profile.id || '', // Use customer ID as session fallback
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
        // Legacy: Use old customerService
        const { customers: customerData, error } = await customerService.getCustomerList(
          user.id,
          { limit: 100 }
        );

        if (error) {
          console.error('Error fetching customers (legacy):', error);
          hapticFeedback.notification('error');
          return;
        }

        // Convert CustomerSummary to Customer interface
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
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (isRefresh) {
        hapticFeedback.notification('error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
      // Phase 3: Open CustomerDetailModal
      setSelectedCustomer(customer);
      setShowDetailModal(true);

      // Update recently viewed
      if (customer.customer_name) {
        setRecentlyViewedCustomers(prev => new Set([customer.customer_name!, ...Array.from(prev)]));
      }
    } else if (onLoadCustomer && customer.customer_name && user?.id) {
      // Legacy: Load customer context and conversation history
      try {
        // Track customer interaction for smart ordering
        await customerService.trackCustomerInteraction(
          user.id,
          customer.customer_name,
          customer.session_id,
          'load'
        );

        // Update recently viewed customers for immediate UI feedback
        setRecentlyViewedCustomers(prev => new Set([customer.customer_name!, ...Array.from(prev)]));

        // Load customer context using the correct API
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
        return;
      }

      // Track edit interaction for smart ordering
      if (editData.customer_name) {
        setRecentlyViewedCustomers(prev => new Set([editData.customer_name, ...Array.from(prev)]));
      }

      // Update local state
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

      // Refresh customer list to get updated ordering
      await fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      hapticFeedback.notification('error');
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

  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-overlay-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
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
            <h2 className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
              Customers
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search and Controls Section */}
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
              <div className="flex items-center justify-between mb-4">
                {isLoading && (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2" 
                         style={{ borderColor: visualConfig.colors.primary }}></div>
                    <span className="ml-3 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                      Loading customers...
                    </span>
                  </div>
                )}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={fetchCustomers}
              className="p-2 rounded-lg transition-colors duration-200"
              style={{ 
                backgroundColor: 'transparent',
                color: visualConfig.colors.text.secondary
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Icons.RefreshCw className="h-5 w-5" />
            </button>

            {/* Edit Mode Toggle */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-2 rounded-lg transition-colors duration-200 ${isEditMode ? 'opacity-100' : 'opacity-60'}`}
              style={{ 
                backgroundColor: isEditMode ? visualConfig.colors.primary + '20' : 'transparent',
                color: isEditMode ? visualConfig.colors.primary : visualConfig.colors.text.secondary
              }}
            >
              <Icons.Edit3 className="h-5 w-5" />
            </button>
          </div>
        </div>

              {/* Search Input */}
              <div className="relative">
                <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                             style={{ color: visualConfig.colors.text.secondary }} />
                <input
                  type="text"
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
                    fontSize: isMobile ? '16px' : '14px' // Prevent iOS zoom
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = visualConfig.colors.primary;
                    e.target.style.boxShadow = `0 0 0 3px ${visualConfig.colors.primary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = searchQuery ? visualConfig.colors.primary : (theme === 'light' ? '#d1d5db' : '#4b5563');
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      hapticFeedback.selection();
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 rounded-full transition-colors duration-200"
                    style={{
                      width: `${touchTargetSize.minSize}px`,
                      height: `${touchTargetSize.minSize}px`,
                      backgroundColor: 'transparent',
                      color: visualConfig.colors.text.secondary
                    }}
                    onTouchStart={() => hapticFeedback.selection()}
                  >
                    <Icons.X className="h-4 w-4 mx-auto" />
                  </button>
                )}
              </div>
            </div>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
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
          <div className="text-center py-12">
            <Icons.Users className="mx-auto h-12 w-12 mb-4" 
                        style={{ color: visualConfig.colors.text.secondary }} />
            <p className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
              {customers.length === 0 ? 'No customers found' : 'No matching customers'}
            </p>
            <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
              {customers.length === 0 
                ? 'Start a conversation to see customer data here'
                : 'Try adjusting your search query'
              }
            </p>
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
          
          {/* Edit Modal */}
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
          </div>
        </div>
      </div>
    </>
  );
};

// Customer Card Component
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

  // Check if customer matches search query
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
    <div
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
      onTouchStart={(e) => {
        if (!isEditMode) {
          longPressDetector.onTouchStart(e.nativeEvent, () => {
            hapticFeedback.impact('medium');
            // Could trigger context menu here
          });
        }
        swipeDetector.onTouchStart(e.nativeEvent);
        setIsPressed(true);
      }}
      onTouchMove={(e) => {
        longPressDetector.onTouchMove(e.nativeEvent);
        // Reset pressed state if moving significantly
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
            // Could trigger edit mode here
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
              <div className="w-2 h-2 rounded-full" 
                   style={{ backgroundColor: isRecentlyViewed ? visualConfig.colors.primary : visualConfig.colors.text.secondary + '40' }} />
              {isRecentlyViewed && (
                <div className="flex items-center gap-1">
                  <Icons.Clock className="h-3 w-3" style={{ color: visualConfig.colors.primary }} />
                  <span className="text-xs font-medium" style={{ color: visualConfig.colors.primary }}>Recently viewed</span>
                </div>
              )}
            </>
          )}
        </div>
        {isEditMode && (
          <div className="flex items-center gap-1">
            <Icons.Edit3 className="h-4 w-4" style={{ color: visualConfig.colors.primary }} />
            <span className="text-xs" style={{ color: visualConfig.colors.primary }}>Tap to edit</span>
          </div>
        )}
        {!isEditMode && (
          <div className="flex items-center gap-1">
            <Icons.MessageCircle className="h-4 w-4" style={{ color: visualConfig.colors.text.secondary }} />
            <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>Tap to load</span>
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
            <Icons.MapPin className="h-3 w-3 flex-shrink-0" style={{ color: visualConfig.colors.text.secondary }} />
            <span style={{ color: visualConfig.colors.text.secondary }}>{customer.customer_address}</span>
          </div>
        )}
        
        {customer.customer_email && (
          <div className="flex items-center gap-2">
            <Icons.Mail className="h-3 w-3 flex-shrink-0" style={{ color: visualConfig.colors.text.secondary }} />
            <span style={{ color: visualConfig.colors.text.secondary }}>{customer.customer_email}</span>
          </div>
        )}
        
        {customer.customer_phone && (
          <div className="flex items-center gap-2">
            <Icons.Phone className="h-3 w-3 flex-shrink-0" style={{ color: visualConfig.colors.text.secondary }} />
            <span style={{ color: visualConfig.colors.text.secondary }}>{customer.customer_phone}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Edit Customer Modal Component
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
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-overlay-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white rounded-lg shadow-xl animate-scale-in"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b"
               style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <h2 className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
              Edit Customer
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Customer Name
              </label>
              <input
                type="text"
                value={editData.customer_name}
                onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary
                }}
                onFocus={(e) => e.target.style.borderColor = visualConfig.colors.primary}
                onBlur={(e) => e.target.style.borderColor = theme === 'light' ? '#d1d5db' : '#4b5563'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Address
              </label>
              <textarea
                value={editData.customer_address}
                onChange={(e) => setEditData({ ...editData, customer_address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary
                }}
                onFocus={(e) => e.target.style.borderColor = visualConfig.colors.primary}
                onBlur={(e) => e.target.style.borderColor = theme === 'light' ? '#d1d5db' : '#4b5563'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Email
              </label>
              <input
                type="email"
                value={editData.customer_email}
                onChange={(e) => setEditData({ ...editData, customer_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary
                }}
                onFocus={(e) => e.target.style.borderColor = visualConfig.colors.primary}
                onBlur={(e) => e.target.style.borderColor = theme === 'light' ? '#d1d5db' : '#4b5563'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={editData.customer_phone}
                onChange={(e) => setEditData({ ...editData, customer_phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary
                }}
                onFocus={(e) => e.target.style.borderColor = visualConfig.colors.primary}
                onBlur={(e) => e.target.style.borderColor = theme === 'light' ? '#d1d5db' : '#4b5563'}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t"
               style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <button
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
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: visualConfig.colors.primary,
                color: visualConfig.colors.text.onPrimary
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
        </div>
      </div>
    </>
  );
};

// Skeleton Customer Card for Loading States
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
    >
      {/* Header with indicator and action hint */}
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
      
      {/* Customer Name */}
      <div 
        className="h-6 rounded skeleton-shimmer mb-3"
        style={{ 
          backgroundColor: visualConfig.colors.text.primary + '20',
          width: `${60 + Math.random() * 30}%`
        }}
      />
      
      {/* Interaction Summary */}
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
      
      {/* Contact Details */}
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