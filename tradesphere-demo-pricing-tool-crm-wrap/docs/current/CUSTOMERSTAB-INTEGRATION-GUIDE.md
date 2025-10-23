# CustomersTab.tsx Integration Guide

This guide shows how to integrate Phase 3D components into the existing CustomersTab.tsx without breaking existing functionality.

---

## Integration Strategy

### Phase 1: Add New Imports (Top of File)

```typescript
// Add these imports after existing imports
import { customerRepository } from '../services/CustomerRepository';
import { CustomerProfile, CustomerWithMetrics, CustomerSearchFilters, CustomerListItem } from '../types/customer';
import LifecycleBadge from './customers/LifecycleBadge';
import SourceBadge from './customers/SourceBadge';
import TagChip from './customers/TagChip';
import CustomerMetrics from './customers/CustomerMetrics';
import CustomerFilterPanel from './customers/CustomerFilterPanel';
import CustomerDetailModal from './customers/CustomerDetailModal';
import CustomerCreateWizard from './customers/CustomerCreateWizard';
```

### Phase 2: Update Interface

```typescript
// Replace the current Customer interface with CustomerListItem
// Remove the old Customer interface (lines 19-27)
// Import CustomerListItem from types instead

// Update CustomersTabProps to accept company_id
interface CustomersTabProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCustomer?: (customer: CustomerListItem, messages: Message[]) => void;
  companyId?: string; // ADD THIS
}
```

### Phase 3: Add New State Variables

```typescript
// Add after existing useState declarations (around line 62)

// Feature flags
const [useNewSystem, setUseNewSystem] = useState(true); // Set to false for gradual rollout

// New modals
const [showFilterPanel, setShowFilterPanel] = useState(false);
const [showDetailModal, setShowDetailModal] = useState(false);
const [showCreateWizard, setShowCreateWizard] = useState(false);
const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<CustomerWithMetrics | null>(null);

// Filters
const [filters, setFilters] = useState<CustomerSearchFilters>({
  searchQuery: '',
  lifecycle_stage: undefined,
  tags: undefined,
  source: undefined,
  has_email: undefined,
  has_phone: undefined,
  has_address: undefined,
  date_range: undefined,
  limit: 50,
  offset: 0,
  sort_by: 'last_interaction_at',
  sort_order: 'desc'
});

// All tags for filter panel
const [allTags, setAllTags] = useState<string[]>([]);
```

### Phase 4: Update fetchCustomers Function

```typescript
// Replace the existing fetchCustomers function (lines 149-196)

const fetchCustomers = async (isRefresh = false) => {
  if (!user?.id) return;

  if (isRefresh) {
    setIsRefreshing(true);
    hapticFeedback.impact('light');
  } else {
    setIsLoading(true);
  }

  try {
    if (useNewSystem && companyId) {
      // NEW SYSTEM: Use CustomerRepository
      const { items, total, hasMore } = await customerRepository.getCustomers(companyId, {
        ...filters,
        searchQuery: debouncedSearchQuery || filters.searchQuery
      });

      setCustomers(items as any); // Type cast for compatibility
      setSearchResultCount(items.length);

      // Extract all tags for filter panel
      const tags = new Set<string>();
      items.forEach(customer => {
        customer.tags?.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags));

      if (isRefresh) {
        hapticFeedback.notification('success');
      }
    } else {
      // OLD SYSTEM: Use customerService (backward compatibility)
      const { customers: customerData, error } = await customerService.getCustomerList(
        user.id,
        { limit: 100 }
      );

      if (error) {
        console.error('Error fetching customers:', error);
        hapticFeedback.notification('error');
        return;
      }

      // Convert CustomerSummary to Customer interface
      const formattedCustomers: any[] = customerData.map(customer => ({
        session_id: customer.latest_session_id,
        id: customer.latest_session_id, // Add ID for compatibility
        customer_name: customer.customer_name,
        customer_address: customer.customer_address,
        customer_email: customer.customer_email,
        customer_phone: customer.customer_phone,
        interaction_summary: customer.interaction_summary,
        created_at: customer.last_interaction_at,
        // Add new fields with defaults
        lifecycle_stage: 'prospect',
        tags: [],
        source: 'chat',
        total_conversations: 1,
        view_count: customer.view_count || 0,
        last_interaction_at: customer.last_interaction_at
      }));

      setCustomers(formattedCustomers);

      if (isRefresh) {
        hapticFeedback.notification('success');
      }
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
```

### Phase 5: Add New Handler Functions

```typescript
// Add these new functions after handleSaveCustomer (around line 290)

const handleDeleteCustomer = async (customerId: string) => {
  if (!confirm('Are you sure you want to delete this customer? This action can be undone by an administrator.')) {
    return;
  }

  try {
    await customerRepository.softDeleteCustomer(customerId);

    // Remove from UI (RLS will filter out deleted customers)
    setCustomers(prev => prev.filter(c => c.id !== customerId));

    hapticFeedback.notification('success');
  } catch (error) {
    console.error('Failed to delete customer:', error);
    hapticFeedback.notification('error');
    alert(`Failed to delete customer: ${error.message}`);
  }
};

const handleViewCustomerDetail = async (customer: any) => {
  try {
    hapticFeedback.selection();

    if (useNewSystem && customer.id) {
      // Fetch full customer details
      const fullCustomer = await customerRepository.getCustomerById(customer.id);
      setSelectedCustomerForDetail(fullCustomer);
      setShowDetailModal(true);
    } else {
      // Old system: just show edit modal
      setSelectedCustomer(customer);
      setEditData({
        customer_name: customer.customer_name || '',
        customer_address: customer.customer_address || '',
        customer_email: customer.customer_email || '',
        customer_phone: customer.customer_phone || ''
      });
      setShowEditModal(true);
    }
  } catch (error) {
    console.error('Error loading customer details:', error);
    hapticFeedback.notification('error');
  }
};

const handleUpdateCustomer = async (updates: any) => {
  if (!selectedCustomerForDetail) return;

  try {
    await customerRepository.updateCustomer(selectedCustomerForDetail.id, updates);

    // Update local state
    setCustomers(prev => prev.map(c =>
      c.id === selectedCustomerForDetail.id
        ? { ...c, ...updates }
        : c
    ));

    hapticFeedback.notification('success');

    // Refresh customer details
    const updated = await customerRepository.getCustomerById(selectedCustomerForDetail.id);
    setSelectedCustomerForDetail(updated);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

const handleCreateCustomer = (newCustomer: CustomerProfile) => {
  // Add to list
  setCustomers(prev => [newCustomer as any, ...prev]);
  hapticFeedback.notification('success');
};
```

### Phase 6: Update Header Section

```typescript
// Replace the header controls section (around line 342-378)

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
    {/* Filter Button */}
    {useNewSystem && (
      <button
        onClick={() => {
          setShowFilterPanel(true);
          hapticFeedback.selection();
        }}
        className="p-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
        style={{
          backgroundColor: (filters.lifecycle_stage?.length || filters.tags?.length || filters.source?.length)
            ? visualConfig.colors.primary + '20'
            : 'transparent',
          color: (filters.lifecycle_stage?.length || filters.tags?.length || filters.source?.length)
            ? visualConfig.colors.primary
            : visualConfig.colors.text.secondary
        }}
        title="Filter customers"
      >
        <Icons.Filter className="h-5 w-5" />
        {(filters.lifecycle_stage?.length || filters.tags?.length || filters.source?.length) && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: visualConfig.colors.primary,
                  color: visualConfig.colors.text.onPrimary
                }}>
            {(filters.lifecycle_stage?.length || 0) + (filters.tags?.length || 0) + (filters.source?.length || 0)}
          </span>
        )}
      </button>
    )}

    {/* Create Customer Button */}
    {useNewSystem && companyId && (
      <button
        onClick={() => {
          setShowCreateWizard(true);
          hapticFeedback.selection();
        }}
        className="p-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
        style={{
          backgroundColor: visualConfig.colors.primary,
          color: visualConfig.colors.text.onPrimary
        }}
        title="Create new customer"
      >
        <Icons.Plus className="h-5 w-5" />
        {!isMobile && <span className="text-sm font-medium">Create</span>}
      </button>
    )}

    {/* Refresh Button */}
    <button
      onClick={() => fetchCustomers(true)}
      className="p-2 rounded-lg transition-colors duration-200"
      style={{
        backgroundColor: 'transparent',
        color: visualConfig.colors.text.secondary
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      title="Refresh customer list"
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
      title={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
    >
      <Icons.Edit3 className="h-5 w-5" />
    </button>
  </div>
</div>
```

### Phase 7: Enhance Customer Cards

```typescript
// Update the CustomerCard component (starting around line 501)
// Add these props and rendering logic:

{/* Inside CustomerCard, after customer name */}

{useNewSystem && (
  <>
    {/* Badges Row */}
    <div className="flex items-center gap-2 mb-2">
      <LifecycleBadge stage={customer.lifecycle_stage || 'prospect'} size="sm" />
      <SourceBadge source={customer.source || 'chat'} size="sm" showLabel={false} />
    </div>

    {/* Tags Row */}
    {customer.tags && customer.tags.length > 0 && (
      <div className="flex flex-wrap gap-1 mb-2">
        {customer.tags.map(tag => (
          <TagChip key={tag} label={tag} size="sm" />
        ))}
      </div>
    )}

    {/* Metrics Row */}
    <CustomerMetrics
      totalConversations={customer.total_conversations || 0}
      totalViews={customer.view_count || 0}
      lastInteractionAt={customer.last_interaction_at}
      viewCount={customer.view_count || 0}
      layout="compact"
    />
  </>
)}

{/* Enhanced Actions */}
{!isEditMode && useNewSystem && (
  <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleViewCustomerDetail(customer);
      }}
      className="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
      style={{
        backgroundColor: visualConfig.colors.primary + '10',
        color: visualConfig.colors.primary
      }}
    >
      View Details
    </button>
    {isEditMode && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteCustomer(customer.id);
        }}
        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: '#fee2e2',
          color: '#ef4444'
        }}
      >
        <Icons.Trash2 className="h-4 w-4" />
      </button>
    )}
  </div>
)}
```

### Phase 8: Add Modals at End of Component

```typescript
// Add these modals before the closing tags (around line 492)

{/* Filter Panel */}
{useNewSystem && showFilterPanel && (
  <CustomerFilterPanel
    filters={filters}
    onFiltersChange={(newFilters) => {
      setFilters(newFilters);
      fetchCustomers(); // Refresh with new filters
    }}
    onClose={() => setShowFilterPanel(false)}
    allTags={allTags}
    isOpen={showFilterPanel}
  />
)}

{/* Detail Modal */}
{useNewSystem && showDetailModal && selectedCustomerForDetail && (
  <CustomerDetailModal
    customer={selectedCustomerForDetail}
    isOpen={showDetailModal}
    onClose={() => {
      setShowDetailModal(false);
      setSelectedCustomerForDetail(null);
    }}
    onUpdate={handleUpdateCustomer}
    onDelete={async (customerId) => {
      await handleDeleteCustomer(customerId);
      setShowDetailModal(false);
      setSelectedCustomerForDetail(null);
    }}
    conversations={[]} // TODO: Load from CustomerSyncService
    events={[]} // TODO: Load from CustomerLifecycleService
  />
)}

{/* Create Wizard */}
{useNewSystem && showCreateWizard && companyId && (
  <CustomerCreateWizard
    isOpen={showCreateWizard}
    onClose={() => setShowCreateWizard(false)}
    onCreate={handleCreateCustomer}
    companyId={companyId}
    userId={user?.id || ''}
    userName={user?.name}
  />
)}
```

---

## Testing Checklist

### Feature Flag Testing

1. **Test with useNewSystem = false**
   - [ ] Old customer list loads correctly
   - [ ] Old edit modal works
   - [ ] No new buttons/features visible
   - [ ] No console errors

2. **Test with useNewSystem = true**
   - [ ] New customer list loads from CustomerRepository
   - [ ] Filter panel works
   - [ ] Create wizard works
   - [ ] Detail modal works
   - [ ] Lifecycle badges display
   - [ ] Source badges display
   - [ ] Tags display
   - [ ] Metrics display

### Integration Testing

3. **Customer List**
   - [ ] Loads customers from CustomerRepository
   - [ ] Shows lifecycle badges
   - [ ] Shows source badges
   - [ ] Shows tags
   - [ ] Shows metrics
   - [ ] Search still works
   - [ ] Recently viewed still works
   - [ ] Skeleton loading works

4. **Filter Panel**
   - [ ] Opens/closes correctly
   - [ ] Lifecycle filter works
   - [ ] Tags filter works
   - [ ] Source filter works
   - [ ] Contact info filters work
   - [ ] Sort options work
   - [ ] Apply/Clear works
   - [ ] Mobile slide-in works

5. **Customer Detail Modal**
   - [ ] Opens with full customer data
   - [ ] Profile tab shows all fields
   - [ ] Edit mode works
   - [ ] Save changes works
   - [ ] Conversations tab displays (empty state OK)
   - [ ] Quotes tab displays (placeholder OK)
   - [ ] Activity tab displays (empty state OK)
   - [ ] Delete customer works
   - [ ] Mobile full-screen works

6. **Create Customer Wizard**
   - [ ] Step 1: Basic info + validation
   - [ ] Step 1: Duplicate detection works
   - [ ] Step 2: Address input
   - [ ] Step 3: Notes, tags, lifecycle, source
   - [ ] Step 4: Review summary
   - [ ] Create button works
   - [ ] Customer added to list
   - [ ] Mobile navigation works

### Mobile Responsiveness

7. **Touch Gestures**
   - [ ] Swipe gestures still work
   - [ ] Long press still works
   - [ ] Haptic feedback works
   - [ ] Touch targets 44x44px minimum

8. **Layouts**
   - [ ] Filter panel full-screen on mobile
   - [ ] Detail modal full-screen on mobile
   - [ ] Create wizard full-screen on mobile
   - [ ] Customer cards responsive
   - [ ] Badges wrap correctly

### Performance

9. **Performance Metrics**
   - [ ] Customer list loads < 100ms
   - [ ] Filter changes respond < 50ms
   - [ ] Modals open < 200ms
   - [ ] No UI blocking
   - [ ] Smooth 60fps scrolling

---

## Deployment Strategy

### Phase 1: Internal Testing (Week 1)
- Set `useNewSystem = true` for dev environment only
- Test all features thoroughly
- Fix bugs
- Monitor console errors

### Phase 2: Beta Testing (Week 2)
- Set `useNewSystem = true` for beta users (feature flag in user settings)
- Collect feedback
- Monitor performance metrics
- Iterate on UI/UX

### Phase 3: Gradual Rollout (Week 3)
- Enable for 25% of users
- Monitor error rates
- Monitor performance
- Enable for 50% of users
- Enable for 100% of users

### Phase 4: Deprecation (Week 4)
- Remove `useNewSystem` flag
- Remove old code paths
- Remove old customerService methods
- Update documentation

---

## Rollback Plan

If critical issues are discovered:

1. **Immediate Rollback**
   - Set `useNewSystem = false` globally
   - No code changes needed
   - Users revert to old system

2. **Fix and Retry**
   - Fix critical bugs
   - Re-test internally
   - Re-enable gradually

---

## Success Criteria

- [ ] All new components integrate seamlessly
- [ ] No breaking changes to existing functionality
- [ ] Feature flag enables gradual rollout
- [ ] Mobile responsiveness maintained
- [ ] Performance targets met (<100ms list load)
- [ ] Zero console errors
- [ ] Zero data loss
- [ ] User feedback positive

---

## Support & Documentation

### User Documentation
- Create user guide for new features
- Record video tutorials
- Update help center

### Developer Documentation
- Document new component APIs
- Update architecture diagrams
- Document feature flag system
- Document rollback procedures

---

**Integration Complete!**

The enhanced CustomersTab now supports both old and new customer management systems through a feature flag, enabling safe, gradual rollout while maintaining backward compatibility.
