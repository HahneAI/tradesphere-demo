# Job Creation Wizard - Quick Start Guide

## 1-Minute Integration

### Step 1: Import the Wizard
```tsx
import { JobCreationWizard } from '@/components/jobs/JobCreationWizard';
```

### Step 2: Add State
```tsx
const [showWizard, setShowWizard] = useState(false);
```

### Step 3: Add Button
```tsx
<button onClick={() => setShowWizard(true)}>
  Create Job
</button>
```

### Step 4: Render Wizard
```tsx
<JobCreationWizard
  isOpen={showWizard}
  onClose={() => setShowWizard(false)}
  companyId={companyId}  // From your auth context
  userId={userId}        // From your auth context
/>
```

## Complete Example

```tsx
import React, { useState } from 'react';
import { JobCreationWizard } from '@/components/jobs/JobCreationWizard';
import { useAuth } from '@/hooks/useAuth'; // Your auth hook

export const JobsPage: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);
  const { companyId, userId } = useAuth();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <button
          onClick={() => setShowWizard(true)}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Create Job
        </button>
      </div>

      {/* Your jobs list */}
      <div>
        {/* ... */}
      </div>

      {/* Wizard */}
      <JobCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        companyId={companyId}
        userId={userId}
      />
    </div>
  );
};
```

## Props Reference

```typescript
interface JobCreationWizardProps {
  isOpen: boolean;              // Show/hide wizard
  onClose: () => void;          // Called when closing
  companyId: string;            // Company UUID
  userId: string;               // User UUID
  initialCustomerId?: string;   // Optional: pre-select customer
}
```

## Common Use Cases

### 1. Basic Usage (Most Common)
```tsx
<JobCreationWizard
  isOpen={showWizard}
  onClose={() => setShowWizard(false)}
  companyId={companyId}
  userId={userId}
/>
```

### 2. Pre-select Customer
```tsx
<JobCreationWizard
  isOpen={showWizard}
  onClose={() => setShowWizard(false)}
  companyId={companyId}
  userId={userId}
  initialCustomerId={selectedCustomerId}
/>
```

### 3. With Success Callback
```tsx
const handleClose = () => {
  setShowWizard(false);
  refreshJobsList(); // Refresh your jobs list
};

<JobCreationWizard
  isOpen={showWizard}
  onClose={handleClose}
  companyId={companyId}
  userId={userId}
/>
```

### 4. From Dashboard Quick Action
```tsx
<div className="quick-actions">
  <button
    onClick={() => setShowWizard(true)}
    className="action-card"
  >
    <PlusIcon />
    Create Job
  </button>
</div>

<JobCreationWizard {...props} />
```

## Workflow Steps

1. **Customer**: Search/select/create customer
2. **Details**: Enter job title, address, priority
3. **Services**: Add services (AI/Calculator/Manual)
4. **Review**: Verify all information
5. **Schedule**: Assign crew and dates (optional)

## Key Features

✅ Auto-saves progress to LocalStorage
✅ Validates each step before advancing
✅ Detects schedule conflicts
✅ Responsive (desktop/tablet/mobile)
✅ Dark mode support
✅ Keyboard navigation
✅ Accessible (WCAG 2.1 AA)

## Troubleshooting

### Wizard doesn't open
```tsx
// Check prop is true
<JobCreationWizard isOpen={true} ... />

// Check z-index isn't blocked
className="z-50" // Wizard uses z-50
```

### Missing companyId or userId
```tsx
// Get from auth context
const { companyId, userId } = useAuth();

// Or from session
const companyId = session.user.company_id;
const userId = session.user.id;
```

### Wizard state persists after close
```tsx
// Wizard auto-clears on successful creation
// To manually clear: wizard.reset()
```

## Advanced Configuration

### Customize Validation
```tsx
// Edit: src/hooks/useJobCreationWizard.ts
// Modify validation functions per step
```

### Customize Styling
```tsx
// All components use Tailwind classes
// Override in your global CSS or component level
```

### Add Custom Steps
```tsx
// 1. Add step component in wizard/
// 2. Update useJobCreationWizard hook
// 3. Add case in JobCreationWizard switch
```

## Need Help?

📖 **Full Documentation**: `/src/components/jobs/README.md`
📋 **Examples**: `/src/components/jobs/WIZARD_USAGE_EXAMPLE.tsx`
🏗️ **Architecture**: `/docs/architecture/JOB-WIZARD-ARCHITECTURE.md`
📊 **Types**: `/src/types/job-wizard.ts`

## Quick Tips

💡 LocalStorage saves draft jobs automatically
💡 Press ESC to close wizard (with confirmation)
💡 Click completed steps to edit previous data
💡 Skip scheduling if crews aren't ready
💡 Services calculate totals in real-time

---

That's it! You're ready to use the Job Creation Wizard. 🚀
