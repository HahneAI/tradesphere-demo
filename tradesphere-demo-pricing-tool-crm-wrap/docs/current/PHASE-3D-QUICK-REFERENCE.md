# Phase 3D Quick Reference Card

**For Developers**: Fast reference for Phase 3D customer management components

---

## Component Import Guide

```typescript
// Small UI Components
import LifecycleBadge from './customers/LifecycleBadge';
import SourceBadge from './customers/SourceBadge';
import TagChip from './customers/TagChip';
import CustomerMetrics from './customers/CustomerMetrics';

// Complex Components
import CustomerFilterPanel from './customers/CustomerFilterPanel';
import CustomerDetailModal from './customers/CustomerDetailModal';
import CustomerCreateWizard from './customers/CustomerCreateWizard';

// Types
import {
  CustomerProfile,
  CustomerWithMetrics,
  CustomerSearchFilters,
  CustomerListItem,
  CreateCustomerInput,
  UpdateCustomerInput
} from '../types/customer';

// Services
import { customerRepository } from '../services/CustomerRepository';
```

---

## Component Usage Examples

### LifecycleBadge
```tsx
<LifecycleBadge stage="prospect" size="md" showIcon={true} />
<LifecycleBadge stage="lead" size="sm" showIcon={false} />
```

### SourceBadge
```tsx
<SourceBadge source="chat" size="md" showLabel={true} />
<SourceBadge source="manual" size="sm" showLabel={false} />
```

### TagChip
```tsx
<TagChip label="VIP" removable={true} onRemove={() => removeTag('VIP')} />
<TagChip label="Commercial" removable={false} color="#3b82f6" />
```

### CustomerMetrics
```tsx
<CustomerMetrics
  totalConversations={5}
  totalViews={12}
  lastInteractionAt="2025-10-11T10:30:00Z"
  viewCount={12}
  layout="horizontal"
/>
```

### CustomerFilterPanel
```tsx
<CustomerFilterPanel
  filters={filters}
  onFiltersChange={setFilters}
  onClose={() => setShowFilterPanel(false)}
  allTags={['VIP', 'Commercial', 'Residential']}
  isOpen={showFilterPanel}
/>
```

### CustomerDetailModal
```tsx
<CustomerDetailModal
  customer={customer}
  isOpen={showDetailModal}
  onClose={() => setShowDetailModal(false)}
  onUpdate={async (updates) => {
    await customerRepository.updateCustomer(customer.id, updates);
  }}
  onDelete={async (customerId) => {
    await customerRepository.softDeleteCustomer(customerId);
  }}
  conversations={[]} // Optional
  events={[]} // Optional
/>
```

### CustomerCreateWizard
```tsx
<CustomerCreateWizard
  isOpen={showCreateWizard}
  onClose={() => setShowCreateWizard(false)}
  onCreate={(newCustomer) => {
    setCustomers(prev => [newCustomer, ...prev]);
  }}
  companyId={companyId}
  userId={userId}
  userName={userName}
/>
```

---

## CustomerRepository API

### Get Customers (with filters)
```typescript
const { items, total, hasMore } = await customerRepository.getCustomers(companyId, {
  searchQuery: 'john',
  lifecycle_stage: ['prospect', 'lead'],
  tags: ['VIP'],
  source: ['chat', 'manual'],
  has_email: true,
  has_phone: true,
  date_range: { start: '2025-01-01', end: '2025-12-31' },
  sort_by: 'last_interaction_at',
  sort_order: 'desc',
  limit: 50,
  offset: 0
});
```

### Get Customer by ID
```typescript
const customer = await customerRepository.getCustomerById(customerId);
```

### Create Customer
```typescript
const customer = await customerRepository.createCustomer({
  company_id: companyId,
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  customer_phone: '555-1234',
  customer_address: '123 Main St',
  customer_notes: 'VIP customer',
  lifecycle_stage: 'prospect',
  tags: ['VIP', 'Commercial'],
  source: 'manual',
  created_by_user_id: userId,
  created_by_user_name: userName
});
```

### Update Customer
```typescript
await customerRepository.updateCustomer(customerId, {
  customer_name: 'Jane Doe',
  lifecycle_stage: 'customer',
  tags: ['VIP', 'Commercial', 'Priority']
});
```

### Soft Delete Customer
```typescript
await customerRepository.softDeleteCustomer(customerId);
```

### Search Customers
```typescript
const customers = await customerRepository.searchCustomers(
  companyId,
  'john doe',
  50 // limit
);
```

### Find by Email/Phone
```typescript
const customer = await customerRepository.findByEmail(companyId, 'john@example.com');
const customer = await customerRepository.findByPhone(companyId, '555-1234');
```

---

## TypeScript Types

### CustomerProfile
```typescript
interface CustomerProfile {
  id: string;
  company_id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_notes?: string | null;
  lifecycle_stage: 'prospect' | 'lead' | 'customer' | 'churned';
  tags?: string[] | null;
  source: 'chat' | 'manual' | 'import';
  status: 'active' | 'inactive' | 'merged' | 'deleted';
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
}
```

### CustomerWithMetrics
```typescript
interface CustomerWithMetrics extends CustomerProfile {
  total_conversations: number;
  total_interactions: number;
  total_views: number;
  last_interaction_at?: string | null;
  view_count: number;
}
```

### CustomerSearchFilters
```typescript
interface CustomerSearchFilters {
  searchQuery?: string;
  lifecycle_stage?: Array<'prospect' | 'lead' | 'customer' | 'churned'>;
  tags?: string[];
  source?: Array<'chat' | 'manual' | 'import'>;
  has_email?: boolean;
  has_phone?: boolean;
  has_address?: boolean;
  date_range?: { start: string; end: string };
  sort_by?: 'name' | 'created_at' | 'last_interaction_at' | 'total_conversations';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

---

## Mobile Support

### Touch Gestures
```typescript
import { hapticFeedback, getTouchTargetSize, isMobileDevice } from '../utils/mobile-gestures';

// Haptic feedback
hapticFeedback.selection(); // Light tap feedback
hapticFeedback.impact('light'); // Light impact
hapticFeedback.impact('medium'); // Medium impact
hapticFeedback.impact('heavy'); // Heavy impact
hapticFeedback.notification('success'); // Success notification
hapticFeedback.notification('error'); // Error notification

// Touch target sizing
const touchTargetSize = getTouchTargetSize();
// { minSize: 44, recommendedSize: 48 }

// Device detection
const isMobile = isMobileDevice();
```

### Responsive Layouts
```tsx
{/* Full-screen on mobile, centered on desktop */}
<div className={`${isMobile ? 'h-full' : 'max-w-4xl max-h-[85vh]'}`}>
  {/* Content */}
</div>
```

---

## Theme Support

```typescript
import { useTheme } from '../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../config/industry';

const { theme } = useTheme(); // 'light' | 'dark'
const visualConfig = getSmartVisualThemeConfig(theme);

// Use colors
visualConfig.colors.primary // Primary color
visualConfig.colors.secondary // Secondary color
visualConfig.colors.background // Background color
visualConfig.colors.surface // Surface color
visualConfig.colors.text.primary // Primary text color
visualConfig.colors.text.secondary // Secondary text color
```

---

## Error Handling

```typescript
try {
  await customerRepository.createCustomer(input);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Validation failed:', error.fields);
  } else if (error instanceof DuplicateError) {
    // Handle duplicate customer
    console.error('Duplicate customer:', error.duplicates);
  } else if (error instanceof NotFoundError) {
    // Handle not found
    console.error('Customer not found');
  } else {
    // Handle generic errors
    console.error('Unexpected error:', error);
  }
}
```

---

## Common Patterns

### Loading States
```tsx
{isLoading ? (
  <SkeletonLoader />
) : customers.length === 0 ? (
  <EmptyState message="No customers found" />
) : (
  <CustomerList customers={customers} />
)}
```

### Optimistic Updates
```tsx
const handleUpdate = async (updates: UpdateCustomerInput) => {
  // Update local state immediately
  setCustomers(prev => prev.map(c =>
    c.id === customerId ? { ...c, ...updates } : c
  ));

  try {
    // Update backend
    await customerRepository.updateCustomer(customerId, updates);
    hapticFeedback.notification('success');
  } catch (error) {
    // Revert on error
    setCustomers(originalCustomers);
    hapticFeedback.notification('error');
  }
};
```

### Debounced Search
```tsx
const debouncedSearch = useCallback(
  debounce((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, 300),
  []
);

useEffect(() => {
  debouncedSearch(searchQuery);
}, [searchQuery]);
```

---

## Feature Flag Pattern

```typescript
const useNewSystem = import.meta.env.VITE_USE_NEW_CUSTOMER_SYSTEM === 'true';

if (useNewSystem) {
  // Use new CustomerRepository
  const { items } = await customerRepository.getCustomers(companyId, filters);
} else {
  // Use old customerService (backward compatible)
  const { customers } = await customerService.getCustomerList(userId, { limit: 100 });
}
```

---

## Testing Examples

### Component Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import LifecycleBadge from './LifecycleBadge';

test('renders prospect badge', () => {
  render(<LifecycleBadge stage="prospect" />);
  expect(screen.getByText('Prospect')).toBeInTheDocument();
});

test('renders with correct color', () => {
  const { container } = render(<LifecycleBadge stage="prospect" />);
  const badge = container.querySelector('span');
  expect(badge).toHaveStyle({ backgroundColor: '#dbeafe' });
});
```

### Integration Tests
```typescript
test('fetches customers from repository', async () => {
  const { findByText } = render(<CustomersTab isOpen={true} companyId="test-company" />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

---

## Performance Tips

1. **Use React.memo for customer cards**
```tsx
const CustomerCard = React.memo(({ customer }) => {
  // Component implementation
});
```

2. **Use useMemo for filtering**
```tsx
const filteredCustomers = useMemo(() => {
  return applyFilters(customers, filters);
}, [customers, filters]);
```

3. **Virtualize long lists (1000+ items)**
```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={customers.length}
  itemSize={120}
>
  {({ index, style }) => (
    <CustomerCard customer={customers[index]} style={style} />
  )}
</FixedSizeList>
```

---

## Common Gotchas

1. **Always filter by company_id**
```typescript
// ❌ BAD
const customers = await customerRepository.getCustomers();

// ✅ GOOD
const customers = await customerRepository.getCustomers(companyId);
```

2. **Use soft delete, not hard delete**
```typescript
// ❌ BAD
await supabase.from('customers').delete().eq('id', customerId);

// ✅ GOOD
await customerRepository.softDeleteCustomer(customerId);
```

3. **Check for duplicates before creating**
```typescript
const existing = await customerRepository.findByEmail(companyId, email);
if (existing) {
  throw new DuplicateError('Customer already exists');
}
```

---

## File Paths Reference

```
src/components/customers/
├── LifecycleBadge.tsx
├── SourceBadge.tsx
├── TagChip.tsx
├── CustomerMetrics.tsx
├── CustomerFilterPanel.tsx
├── CustomerDetailModal.tsx
└── CustomerCreateWizard.tsx

src/services/
├── CustomerRepository.ts
├── CustomerSyncService.ts
├── CustomerLifecycleService.ts
├── CustomerMergeService.ts
└── CustomerEnrichmentService.ts

src/types/
└── customer.ts

Documentation:
├── PHASE-3D-FRONTEND-IMPLEMENTATION.md
├── CUSTOMERSTAB-INTEGRATION-GUIDE.md
├── PHASE-3D-SUMMARY.md
└── PHASE-3D-QUICK-REFERENCE.md (this file)
```

---

## Need Help?

- **Full Implementation Guide**: PHASE-3D-FRONTEND-IMPLEMENTATION.md
- **Integration Instructions**: CUSTOMERSTAB-INTEGRATION-GUIDE.md
- **Project Overview**: PHASE-3D-SUMMARY.md
- **Backend API Reference**: PHASE-3C-API-REFERENCE.md
- **Type Definitions**: src/types/customer.ts

---

**Quick Reference Card - Phase 3D**
**Last Updated**: 2025-10-13
**Version**: 1.0.0
