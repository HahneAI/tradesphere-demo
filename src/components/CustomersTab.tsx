import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSupabase } from '../services/supabase';
import { getSmartVisualThemeConfig } from '../config/industry';

interface Customer {
  session_id: string;
  customer_name: string | null;
  customer_address: string | null;
  customer_email: string | null;
  customer_number: string | null;
  interaction_summary: string | null;
  created_at: string;
}

interface EditCustomerData {
  customer_name: string;
  customer_address: string;
  customer_email: string;
  customer_number: string;
}

interface CustomersTabProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editData, setEditData] = useState<EditCustomerData>({
    customer_name: '',
    customer_address: '',
    customer_email: '',
    customer_number: ''
  });

  const visualConfig = getSmartVisualThemeConfig(theme);

  // Fetch customers on component mount
  useEffect(() => {
    if (user?.tech_uuid) {
      fetchCustomers();
    }
  }, [user?.tech_uuid]);

  // Update filtered customers when customers change
  useEffect(() => {
    setFilteredCustomers(customers);
  }, [customers]);

  const fetchCustomers = async () => {
    if (!user?.tech_uuid) return;

    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('VC USAGE')
        .select('session_id, customer_name, customer_address, customer_email, customer_number, interaction_summary, created_at')
        .eq('tech_id', user.tech_uuid)
        .not('customer_name', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }

      // Remove duplicates based on customer_name and keep most recent
      const uniqueCustomers = data?.reduce((acc: Customer[], current) => {
        const existing = acc.find(c => c.customer_name === current.customer_name);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, []) || [];

      setCustomers(uniqueCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerClick = (customer: Customer) => {
    if (isEditMode) {
      setSelectedCustomer(customer);
      setEditData({
        customer_name: customer.customer_name || '',
        customer_address: customer.customer_address || '',
        customer_email: customer.customer_email || '',
        customer_number: customer.customer_number || ''
      });
      setShowEditModal(true);
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer || !user?.tech_uuid) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('VC USAGE')
        .update({
          customer_name: editData.customer_name,
          customer_address: editData.customer_address,
          customer_email: editData.customer_email,
          customer_number: editData.customer_number
        })
        .eq('session_id', selectedCustomer.session_id)
        .eq('tech_id', user.tech_uuid);

      if (error) {
        console.error('Error updating customer:', error);
        return;
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
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedCustomer(null);
    setEditData({
      customer_name: '',
      customer_address: '',
      customer_email: '',
      customer_number: ''
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
            className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all duration-200"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
              color: visualConfig.colors.text.primary,
              focusRingColor: visualConfig.colors.primary
            }}
            onFocus={(e) => e.target.style.borderColor = visualConfig.colors.primary}
            onBlur={(e) => e.target.style.borderColor = theme === 'light' ? '#d1d5db' : '#4b5563'}
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredCustomers.length === 0 ? (
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
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.session_id}
                customer={customer}
                visualConfig={visualConfig}
                theme={theme}
                isEditMode={isEditMode}
                onClick={() => handleCustomerClick(customer)}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>

            </div>
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
}> = ({ customer, visualConfig, theme, isEditMode, onClick, searchQuery }) => {
  const [isVisible, setIsVisible] = useState(true);

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
      customer.customer_number?.toLowerCase().includes(query) ||
      customer.customer_address?.toLowerCase().includes(query);
    
    setIsVisible(matches);
  }, [searchQuery, customer]);

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
        isEditMode ? 'hover:shadow-lg' : ''
      }`}
      style={{
        backgroundColor: visualConfig.colors.surface,
        borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
        opacity: isVisible ? 1 : 0.3,
        transform: isVisible ? 'translateY(0)' : 'translateY(-10px)'
      }}
      onClick={isEditMode ? onClick : undefined}
      onMouseOver={(e) => {
        if (isEditMode) {
          e.currentTarget.style.borderColor = visualConfig.colors.primary;
        }
      }}
      onMouseOut={(e) => {
        if (isEditMode) {
          e.currentTarget.style.borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
        }
      }}
    >
      {isEditMode && (
        <div className="flex justify-end mb-2">
          <Icons.Edit3 className="h-4 w-4" style={{ color: visualConfig.colors.primary }} />
        </div>
      )}
      
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
        
        {customer.customer_number && (
          <div className="flex items-center gap-2">
            <Icons.Phone className="h-3 w-3 flex-shrink-0" style={{ color: visualConfig.colors.text.secondary }} />
            <span style={{ color: visualConfig.colors.text.secondary }}>{customer.customer_number}</span>
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
                value={editData.customer_number}
                onChange={(e) => setEditData({ ...editData, customer_number: e.target.value })}
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