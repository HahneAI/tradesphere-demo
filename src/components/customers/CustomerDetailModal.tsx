/**
 * CustomerDetailModal Component
 *
 * Comprehensive customer profile view with tabs for:
 * - Profile (customer info, lifecycle, tags, metrics)
 * - Conversations (customer conversation summaries)
 * - Quotes (future integration)
 * - Activity (customer events timeline)
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { CustomerWithMetrics, UpdateCustomerInput, CustomerEvent, ConversationSummary } from '../../types/customer';
import { hapticFeedback, getTouchTargetSize, isMobileDevice } from '../../utils/mobile-gestures';
import LifecycleBadge, { LifecycleStage } from './LifecycleBadge';
import SourceBadge from './SourceBadge';
import TagChip from './TagChip';
import CustomerMetrics from './CustomerMetrics';

export interface CustomerDetailModalProps {
  customer: CustomerWithMetrics;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updates: UpdateCustomerInput) => Promise<void>;
  onDelete?: (customerId: string) => Promise<void>;
  conversations?: ConversationSummary[];
  events?: CustomerEvent[];
  isLoading?: boolean;
}

type TabName = 'profile' | 'conversations' | 'quotes' | 'activity';

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  conversations = [],
  events = [],
  isLoading = false
}) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const touchTargetSize = getTouchTargetSize();
  const isMobile = isMobileDevice();

  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editedCustomer, setEditedCustomer] = useState<UpdateCustomerInput>({
    customer_name: customer.customer_name,
    customer_email: customer.customer_email,
    customer_phone: customer.customer_phone,
    customer_address: customer.customer_address,
    customer_notes: customer.customer_notes,
    lifecycle_stage: customer.lifecycle_stage,
    tags: customer.tags || []
  });

  useEffect(() => {
    if (customer) {
      setEditedCustomer({
        customer_name: customer.customer_name,
        customer_email: customer.customer_email,
        customer_phone: customer.customer_phone,
        customer_address: customer.customer_address,
        customer_notes: customer.customer_notes,
        lifecycle_stage: customer.lifecycle_stage,
        tags: customer.tags || []
      });
    }
  }, [customer]);

  const handleSave = async () => {
    if (!onUpdate) return;

    setIsSaving(true);
    hapticFeedback.impact('medium');

    try {
      await onUpdate(editedCustomer);
      setIsEditing(false);
      hapticFeedback.notification('success');
    } catch (error) {
      console.error('Failed to update customer:', error);
      hapticFeedback.notification('error');
      alert('Failed to update customer. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // TODO: [NATIVE-APP] Using window.confirm() for delete confirmation
  // Current: Browser confirm() dialog (blocking, native browser UI)
  // Native React Native: Use Alert.alert() with Cancel/Delete buttons
  // Native iOS: UIAlertController with destructive action style
  // Native Android: AlertDialog with negative/positive buttons
  // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-9
  // MIGRATION RISK: LOW (1 hour - replace with Alert.alert API)
  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${customer.customer_name}? This action can be undone by an administrator.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    hapticFeedback.impact('heavy');

    try {
      await onDelete(customer.id);
      hapticFeedback.notification('success');
      onClose();
    } catch (error) {
      console.error('Failed to delete customer:', error);
      hapticFeedback.notification('error');
      alert('Failed to delete customer. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // TODO: [NATIVE-APP] Using window.prompt() for tag input
  // Current: Browser prompt() dialog (blocking, modal)
  // Native React Native: Use custom TextInput modal or bottom sheet with validation
  // Native iOS: UIAlertController with textField style
  // Native Android: AlertDialog with EditText
  // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-9
  // MIGRATION RISK: LOW (2 hours - create reusable TextInputModal component)
  const handleAddTag = () => {
    const newTag = prompt('Enter tag name:');
    if (newTag?.trim()) {
      const currentTags = editedCustomer.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        setEditedCustomer({ ...editedCustomer, tags: [...currentTags, newTag.trim()] });
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = editedCustomer.tags || [];
    setEditedCustomer({ ...editedCustomer, tags: currentTags.filter(tag => tag !== tagToRemove) });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* TODO: [NATIVE-APP] Fixed position modal with overlay
          Current: position:fixed, z-index layering, onClick for backdrop dismiss
          Native React Native: Use Modal component with transparent={true}
            - <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
            - Modal handles backdrop, animation, and close gestures automatically
            - On iOS: native bottom sheet with pull-down gesture
            - On Android: full-screen modal with back button handling
          Native iOS: presentationStyle .pageSheet or .formSheet for bottom sheet
          Native Android: BottomSheetDialogFragment or Dialog
          See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-9
          MIGRATION RISK: MEDIUM (3 hours - convert to Modal API, test gestures)
      */}
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
          className={`w-full ${
            isMobile ? 'h-full' : 'max-w-4xl h-[85vh]'
          } bg-white rounded-lg shadow-xl animate-scale-in flex flex-col`}
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between p-6 border-b flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                   style={{
                     backgroundColor: visualConfig.colors.primary + '20',
                     color: visualConfig.colors.primary
                   }}>
                {customer.customer_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold truncate" style={{ color: visualConfig.colors.text.primary }}>
                  {customer.customer_name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <LifecycleBadge stage={customer.lifecycle_stage} size="sm" />
                  <SourceBadge source={customer.source} size="sm" showLabel={false} />
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-20 transition-colors flex-shrink-0"
              style={{ color: visualConfig.colors.text.secondary }}
              aria-label="Close modal"
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          {/* TODO: [NATIVE-APP] Tab navigation with role="tablist", aria-selected
              Current: HTML div with border-bottom styling to indicate active tab
              Native React Native: Use @react-navigation/material-top-tabs or custom TabBar
                - MaterialTopTabNavigator with swipeable tabs
                - Custom badge rendering in tabBarBadge prop
              Native iOS: UISegmentedControl or custom tab bar in SwiftUI
              Native Android: TabLayout with ViewPager2 for swipeable tabs
              See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-9
              MIGRATION RISK: MEDIUM (4 hours - integrate tab navigator, handle badge counts)
          */}
          <div
            className="flex items-center gap-1 px-6 border-b flex-shrink-0 overflow-x-auto"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            {[
              { id: 'profile' as TabName, label: 'Profile', icon: 'User' as const },
              { id: 'conversations' as TabName, label: 'Conversations', icon: 'MessageCircle' as const, badge: conversations.length },
              { id: 'quotes' as TabName, label: 'Quotes', icon: 'FileText' as const },
              { id: 'activity' as TabName, label: 'Activity', icon: 'Activity' as const, badge: events.length }
            ].map(tab => {
              const Icon = Icons[tab.icon] as React.ComponentType<{ className?: string }>;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    hapticFeedback.selection();
                  }}
                  className="flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap"
                  style={{
                    color: isActive ? visualConfig.colors.primary : visualConfig.colors.text.secondary,
                    borderBottom: isActive ? `2px solid ${visualConfig.colors.primary}` : '2px solid transparent'
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: visualConfig.colors.primary + '20',
                        color: visualConfig.colors.primary
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: visualConfig.colors.primary }} />
              </div>
            ) : (
              <>
                {activeTab === 'profile' && (
                  <ProfileTab
                    customer={customer}
                    editedCustomer={editedCustomer}
                    setEditedCustomer={setEditedCustomer}
                    isEditing={isEditing}
                    visualConfig={visualConfig}
                    theme={theme}
                    touchTargetSize={touchTargetSize}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                  />
                )}

                {activeTab === 'conversations' && (
                  <ConversationsTab
                    conversations={conversations}
                    visualConfig={visualConfig}
                    theme={theme}
                  />
                )}

                {activeTab === 'quotes' && (
                  <QuotesTab visualConfig={visualConfig} theme={theme} />
                )}

                {activeTab === 'activity' && (
                  <ActivityTab
                    events={events}
                    visualConfig={visualConfig}
                    theme={theme}
                  />
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          {activeTab === 'profile' && (
            <div
              className="flex items-center justify-between gap-3 p-6 border-t flex-shrink-0"
              style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
            >
              <button
                onClick={handleDelete}
                disabled={isDeleting || !onDelete}
                className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  opacity: isDeleting ? 0.5 : 1,
                  minHeight: `${touchTargetSize.recommendedSize}px`
                }}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Icons.Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>

              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{
                        backgroundColor: 'transparent',
                        color: visualConfig.colors.text.secondary,
                        border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`,
                        minHeight: `${touchTargetSize.recommendedSize}px`
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
                        color: visualConfig.colors.text.onPrimary,
                        opacity: isSaving ? 0.5 : 1,
                        minHeight: `${touchTargetSize.recommendedSize}px`
                      }}
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Icons.Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      hapticFeedback.selection();
                    }}
                    className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    style={{
                      backgroundColor: visualConfig.colors.primary,
                      color: visualConfig.colors.text.onPrimary,
                      minHeight: `${touchTargetSize.recommendedSize}px`
                    }}
                  >
                    <Icons.Edit3 className="h-4 w-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Profile Tab Component
const ProfileTab: React.FC<{
  customer: CustomerWithMetrics;
  editedCustomer: UpdateCustomerInput;
  setEditedCustomer: (updates: UpdateCustomerInput) => void;
  isEditing: boolean;
  visualConfig: any;
  theme: string;
  touchTargetSize: any;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}> = ({ customer, editedCustomer, setEditedCustomer, isEditing, visualConfig, theme, touchTargetSize, onAddTag, onRemoveTag }) => (
  <div className="space-y-6">
    {/* Customer Metrics */}
    <div className="p-4 rounded-lg" style={{ backgroundColor: visualConfig.colors.background }}>
      <CustomerMetrics
        totalConversations={customer.total_conversations}
        totalViews={customer.total_views}
        lastInteractionAt={customer.last_interaction_at}
        viewCount={customer.view_count}
        layout="horizontal"
      />
    </div>

    {/* Customer Information */}
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
          Customer Name
        </label>
        <input
          type="text"
          value={editedCustomer.customer_name || ''}
          onChange={(e) => setEditedCustomer({ ...editedCustomer, customer_name: e.target.value })}
          disabled={!isEditing}
          className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
          style={{
            backgroundColor: isEditing ? visualConfig.colors.background : visualConfig.colors.surface,
            borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
            color: visualConfig.colors.text.primary,
            minHeight: `${touchTargetSize.recommendedSize}px`
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
          Email
        </label>
        {/* TODO: [NATIVE-APP] HTML input type="email" for keyboard optimization
            Current: type="email" triggers email keyboard in mobile browsers
            Native React Native: Use <TextInput keyboardType="email-address" autoCapitalize="none" />
            Native iOS: emailAddress keyboard type, disables auto-capitalization
            Native Android: email keyboard variant (@ and . accessible)
            See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-9
            MIGRATION RISK: LOW (1 hour - replace all input types with TextInput props)
        */}
        <input
          type="email"
          value={editedCustomer.customer_email || ''}
          onChange={(e) => setEditedCustomer({ ...editedCustomer, customer_email: e.target.value })}
          disabled={!isEditing}
          className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
          style={{
            backgroundColor: isEditing ? visualConfig.colors.background : visualConfig.colors.surface,
            borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
            color: visualConfig.colors.text.primary,
            minHeight: `${touchTargetSize.recommendedSize}px`
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
          Phone
        </label>
        <input
          type="tel"
          value={editedCustomer.customer_phone || ''}
          onChange={(e) => setEditedCustomer({ ...editedCustomer, customer_phone: e.target.value })}
          disabled={!isEditing}
          className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
          style={{
            backgroundColor: isEditing ? visualConfig.colors.background : visualConfig.colors.surface,
            borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
            color: visualConfig.colors.text.primary,
            minHeight: `${touchTargetSize.recommendedSize}px`
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
          Address
        </label>
        <textarea
          value={editedCustomer.customer_address || ''}
          onChange={(e) => setEditedCustomer({ ...editedCustomer, customer_address: e.target.value })}
          disabled={!isEditing}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none"
          style={{
            backgroundColor: isEditing ? visualConfig.colors.background : visualConfig.colors.surface,
            borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
            color: visualConfig.colors.text.primary
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
          Notes
        </label>
        <textarea
          value={editedCustomer.customer_notes || ''}
          onChange={(e) => setEditedCustomer({ ...editedCustomer, customer_notes: e.target.value })}
          disabled={!isEditing}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none"
          style={{
            backgroundColor: isEditing ? visualConfig.colors.background : visualConfig.colors.surface,
            borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
            color: visualConfig.colors.text.primary
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
          Lifecycle Stage
        </label>
        <select
          value={editedCustomer.lifecycle_stage || 'prospect'}
          onChange={(e) => setEditedCustomer({ ...editedCustomer, lifecycle_stage: e.target.value as LifecycleStage })}
          disabled={!isEditing}
          className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
          style={{
            backgroundColor: isEditing ? visualConfig.colors.background : visualConfig.colors.surface,
            borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
            color: visualConfig.colors.text.primary,
            minHeight: `${touchTargetSize.recommendedSize}px`
          }}
        >
          <option value="prospect">Prospect</option>
          <option value="lead">Lead</option>
          <option value="customer">Customer</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
            Tags
          </label>
          {isEditing && (
            <button
              onClick={onAddTag}
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: visualConfig.colors.primary }}
            >
              <Icons.Plus className="h-3 w-3" />
              Add Tag
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(editedCustomer.tags || []).length > 0 ? (
            (editedCustomer.tags || []).map(tag => (
              <TagChip
                key={tag}
                label={tag}
                removable={isEditing}
                onRemove={() => onRemoveTag(tag)}
              />
            ))
          ) : (
            <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
              No tags
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
        <div>
          <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Created</span>
          <p className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
            {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>
        <div>
          <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Updated</span>
          <p className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
            {new Date(customer.updated_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Conversations Tab Component
const ConversationsTab: React.FC<{
  conversations: ConversationSummary[];
  visualConfig: any;
  theme: string;
}> = ({ conversations, visualConfig, theme }) => (
  <div className="space-y-4">
    {conversations.length > 0 ? (
      conversations.map(conversation => (
        <div
          key={conversation.session_id}
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: visualConfig.colors.background,
            borderColor: theme === 'light' ? '#e5e7eb' : '#374151'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.secondary }}>
              Session {conversation.session_id.slice(0, 8)}
            </span>
            <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
              {new Date(conversation.last_interaction_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm mb-3" style={{ color: visualConfig.colors.text.primary }}>
            {conversation.conversation_summary}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {conversation.topics_discussed.map(topic => (
              <TagChip key={topic} label={topic} size="sm" />
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: visualConfig.colors.text.secondary }}>
            <span>{conversation.interaction_count} interactions</span>
          </div>
        </div>
      ))
    ) : (
      <div className="text-center py-12">
        <Icons.MessageCircle className="mx-auto h-12 w-12 mb-4" style={{ color: visualConfig.colors.text.secondary }} />
        <p className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
          No conversations yet
        </p>
        <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
          Start a conversation with this customer to see it here
        </p>
      </div>
    )}
  </div>
);

// Quotes Tab Component
const QuotesTab: React.FC<{
  visualConfig: any;
  theme: string;
}> = ({ visualConfig }) => (
  <div className="text-center py-12">
    <Icons.FileText className="mx-auto h-12 w-12 mb-4" style={{ color: visualConfig.colors.text.secondary }} />
    <p className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
      No quotes generated yet
    </p>
    <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
      Quote integration coming soon
    </p>
  </div>
);

// Activity Tab Component
const ActivityTab: React.FC<{
  events: CustomerEvent[];
  visualConfig: any;
  theme: string;
}> = ({ events, visualConfig, theme }) => (
  <div className="space-y-4">
    {events.length > 0 ? (
      events.map(event => (
        <div
          key={event.id}
          className="flex gap-3 p-4 rounded-lg border"
          style={{
            backgroundColor: visualConfig.colors.background,
            borderColor: theme === 'light' ? '#e5e7eb' : '#374151'
          }}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
               style={{ backgroundColor: visualConfig.colors.primary + '20', color: visualConfig.colors.primary }}>
            <Icons.Activity className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                {event.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                {new Date(event.created_at).toLocaleDateString()}
              </span>
            </div>
            {event.created_by_user_name && (
              <p className="text-xs mb-2" style={{ color: visualConfig.colors.text.secondary }}>
                by {event.created_by_user_name}
              </p>
            )}
            {event.event_data && Object.keys(event.event_data).length > 0 && (
              <pre className="text-xs p-2 rounded" style={{
                backgroundColor: theme === 'light' ? '#f3f4f6' : '#1f2937',
                color: visualConfig.colors.text.secondary,
                overflow: 'auto'
              }}>
                {JSON.stringify(event.event_data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))
    ) : (
      <div className="text-center py-12">
        <Icons.Activity className="mx-auto h-12 w-12 mb-4" style={{ color: visualConfig.colors.text.secondary }} />
        <p className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
          No activity yet
        </p>
        <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
          Customer activity will appear here as it occurs
        </p>
      </div>
    )}
  </div>
);

export default CustomerDetailModal;
