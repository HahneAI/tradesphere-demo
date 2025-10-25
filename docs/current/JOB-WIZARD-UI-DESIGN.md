# Job Creation Wizard - UI/UX Design Specification

## Overview
A 5-step progressive wizard for creating jobs in TradeSphere CRM. Designed for intuitive use across desktop, tablet, and mobile devices with accessibility-first principles.

---

## 1. WIZARD CONTAINER & LAYOUT

### Desktop (1024px+)
```
┌──────────────────────────────────────────────────────────┐
│ [×]                                                      │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Progress Indicator (see section 2)                 │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │                                                    │  │
│ │         STEP CONTENT (Scrollable)                  │  │
│ │                                                    │  │
│ │                                                    │  │
│ │                                                    │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [← Back]                           [Next →]   [Cancel]  │
└──────────────────────────────────────────────────────────┘
```

**Technical Specs:**
```tsx
// Container Classes
className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"

// Modal Classes
className="relative w-full max-w-[900px] h-[90vh] max-h-[800px] bg-white dark:bg-gray-900
           rounded-xl shadow-2xl overflow-hidden flex flex-col"

// Close Button
className="absolute top-4 right-4 z-10 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800
           hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center
           justify-center group"
```

### Tablet (768-1023px)
```tsx
// Container adjusts to full width with margins
className="w-full mx-4 h-[90vh] max-h-[800px]"

// Button sizes increase
className="h-12 px-6 text-base" // Instead of h-10 px-4 text-sm
```

### Mobile (<768px)
```tsx
// Full screen takeover
className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col"

// No rounded corners, no backdrop
// Progress sticky at top
// Buttons sticky at bottom
className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t
           border-gray-200 dark:border-gray-700 p-4 flex gap-3"
```

**Swipe Gesture Support:**
```tsx
// Using react-swipeable or custom touch handlers
onSwipedLeft={() => canGoNext && handleNext()}
onSwipedRight={() => canGoBack && handleBack()}
```

---

## 2. PROGRESS INDICATOR

### Desktop/Tablet Design
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   [✓]─────●─────○─────○─────○                                      │
│    1      2     3     4     5                                       │
│ Customer Details Services Review Schedule                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Visual States:**

| State | Circle | Line | Text |
|-------|--------|------|------|
| Completed | ✓ Green (#10B981) | Green solid | Gray, clickable |
| Current | Blue dot (#3B82F6) | Gray | Blue, bold |
| Future | Gray circle | Gray dashed | Gray |

**Implementation:**
```tsx
// Progress Container
<div className="w-full px-8 py-6 bg-gray-50 dark:bg-gray-800/50 border-b
                border-gray-200 dark:border-gray-700">
  <div className="flex items-center justify-between max-w-4xl mx-auto">
    {steps.map((step, index) => (
      <React.Fragment key={step.id}>
        {/* Step Circle */}
        <button
          onClick={() => index < currentStep && goToStep(index)}
          disabled={index > currentStep}
          className={cn(
            "relative flex flex-col items-center group",
            index < currentStep && "cursor-pointer hover:scale-105 transition-transform"
          )}
        >
          {/* Circle */}
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "font-semibold text-sm transition-all duration-300",
            index < currentStep && "bg-green-500 text-white",
            index === currentStep && "bg-blue-500 text-white ring-4 ring-blue-500/20",
            index > currentStep && "bg-gray-200 dark:bg-gray-700 text-gray-400"
          )}>
            {index < currentStep ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0
                      01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0
                      011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span>{index + 1}</span>
            )}
          </div>

          {/* Label */}
          <span className={cn(
            "mt-2 text-xs font-medium whitespace-nowrap",
            index === currentStep && "text-blue-600 dark:text-blue-400 font-semibold",
            index !== currentStep && "text-gray-600 dark:text-gray-400"
          )}>
            {step.label}
          </span>
        </button>

        {/* Connecting Line */}
        {index < steps.length - 1 && (
          <div className="flex-1 h-0.5 mx-2 relative">
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
            <div
              className={cn(
                "absolute inset-0 transition-all duration-500",
                index < currentStep ? "bg-green-500 w-full" : "bg-transparent w-0"
              )}
            />
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
</div>
```

### Mobile Compact View
```
┌──────────────────────────────────┐
│ Step 2 of 5: Job Details     [×] │
│ ████████░░░░░░░░░░░░░░            │
└──────────────────────────────────┘
```

**Implementation:**
```tsx
// Mobile Progress (shows only on screens < 768px)
<div className="md:hidden sticky top-0 z-10 bg-white dark:bg-gray-900
                border-b border-gray-200 dark:border-gray-700 px-4 py-3">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
      Step {currentStep + 1} of {steps.length}: {steps[currentStep].label}
    </span>
    <button onClick={handleClose} className="w-8 h-8">
      <svg className="w-5 h-5">...</svg>
    </button>
  </div>

  {/* Progress Bar */}
  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
    <div
      className="h-full bg-blue-500 transition-all duration-300 rounded-full"
      style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
    />
  </div>
</div>
```

---

## 3. STEP 1: CUSTOMER SELECTION

### Layout Design
```
┌────────────────────────────────────────────────────────────┐
│  Select Customer                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🔍  Search by name, email, or phone...              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Recent Customers                                          │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  👤  Sarah Johnson                           [→]    │   │
│  │      123 Maple Street, Springfield, IL 62701        │   │
│  │      📧 sarah.j@email.com • 📱 (217) 555-0123      │   │
│  │      📊 2 completed jobs • Last: Dec 2024           │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  👤  Michael Chen                            [→]    │   │
│  │      456 Oak Avenue, Springfield, IL 62702          │   │
│  │      📧 mchen@email.com • 📱 (217) 555-0456        │   │
│  │      📊 1 completed job • Last: Jan 2025            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│                                                            │
│ │        +  Create New Customer                        │  │
│                                                            │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Implementation Code

**Search Bar:**
```tsx
<div className="relative">
  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </div>

  <input
    type="text"
    placeholder="Search by name, email, or phone..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full h-12 pl-12 pr-4 text-sm border border-gray-300 dark:border-gray-600
               rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
               placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               transition-shadow"
    aria-label="Search customers"
  />

  {/* Autocomplete Dropdown (shown when typing) */}
  {searchQuery && filteredCustomers.length > 0 && (
    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border
                    border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64
                    overflow-y-auto">
      {filteredCustomers.map(customer => (
        <button
          key={customer.id}
          onClick={() => selectCustomer(customer)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                     transition-colors border-b border-gray-100 dark:border-gray-700
                     last:border-0"
        >
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {customer.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {customer.email}
          </div>
        </button>
      ))}
    </div>
  )}
</div>
```

**Customer Card (Selected State):**
```tsx
<button
  onClick={() => setSelectedCustomer(customer)}
  className={cn(
    "w-full p-4 rounded-lg border-2 transition-all text-left group",
    "hover:shadow-md hover:scale-[1.01]",
    selectedCustomer?.id === customer.id
      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
  )}
  aria-pressed={selectedCustomer?.id === customer.id}
>
  <div className="flex items-start justify-between">
    <div className="flex items-start gap-3 flex-1">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center
                      justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Name */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {customer.name}
        </h3>

        {/* Address */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {customer.address}
        </p>

        {/* Contact Info */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-500">
          <span className="flex items-center gap-1">
            📧 {customer.email}
          </span>
          <span className="flex items-center gap-1">
            📱 {customer.phone}
          </span>
        </div>

        {/* Job Stats */}
        {customer.jobCount > 0 && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            📊 {customer.jobCount} completed {customer.jobCount === 1 ? 'job' : 'jobs'} •
            Last: {formatDate(customer.lastJobDate)}
          </div>
        )}
      </div>
    </div>

    {/* Arrow Indicator */}
    <div className={cn(
      "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
      selectedCustomer?.id === customer.id
        ? "bg-blue-500 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-400 group-hover:bg-gray-200"
    )}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
</button>
```

**Create New Customer Button:**
```tsx
<button
  onClick={() => setShowCustomerModal(true)}
  className="w-full p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600
             bg-gray-50 dark:bg-gray-800/50 hover:border-blue-400 hover:bg-blue-50
             dark:hover:bg-blue-900/10 transition-all group"
>
  <div className="flex items-center justify-center gap-3">
    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center
                    justify-center group-hover:scale-110 transition-transform">
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none"
           stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 4v16m8-8H4" />
      </svg>
    </div>
    <span className="font-medium text-blue-600 dark:text-blue-400">
      Create New Customer
    </span>
  </div>
</button>
```

**Empty State:**
```tsx
{customers.length === 0 && !isLoading && (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center
                    justify-center mb-4">
      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor"
           viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7
              20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0
              019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0
              11-4 0 2 2 0 014 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
      No customers yet
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
      Create your first customer below to start tracking jobs and building your business.
    </p>
    <button
      onClick={() => setShowCustomerModal(true)}
      className="h-10 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium
                 transition-colors"
    >
      Create First Customer
    </button>
  </div>
)}
```

**Validation Rules:**
- Customer must be selected before proceeding
- "Next" button disabled until customer selected

---

## 4. STEP 2: JOB DETAILS

### Layout Design
```
┌────────────────────────────────────────────────────────────┐
│  Job Information                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  Job Title *                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ e.g., Backyard Paver Patio                          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Service Address *                                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 123 Maple Street                                     │ │
│  └──────────────────────────────────────────────────────┘ │
│  Pre-filled from customer. Edit if different location.     │
│                                                            │
│  ┌──────────────────┐ ┌────────────┐ ┌─────────────────┐ │
│  │ City *           │ │ State *    │ │ ZIP Code *      │ │
│  │ Springfield      │ │ IL      ▼  │ │ 62701           │ │
│  └──────────────────┘ └────────────┘ └─────────────────┘ │
│                                                            │
│  Description                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Provide any additional details about the work...    │ │
│  │                                                      │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│  0 / 500 characters                                        │
│                                                            │
│  Priority *                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │   Low   │ │ Normal  │ │  High   │ │ Urgent  │        │
│  │    ○    │ │    ●    │ │    ○    │ │    ○    │        │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│                                                            │
│  Requested Start Date                                      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📅  02/15/2025                                    ▼  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Implementation Code

**Text Input Pattern:**
```tsx
<div className="space-y-2">
  <label
    htmlFor="jobTitle"
    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
  >
    Job Title <span className="text-red-500">*</span>
  </label>

  <input
    id="jobTitle"
    type="text"
    value={formData.jobTitle}
    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
    onBlur={() => validateField('jobTitle')}
    placeholder="e.g., Backyard Paver Patio"
    className={cn(
      "w-full h-12 px-4 text-sm border rounded-lg transition-all",
      "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
      "placeholder-gray-400 dark:placeholder-gray-500",
      "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      errors.jobTitle
        ? "border-red-500 focus:ring-red-500"
        : "border-gray-300 dark:border-gray-600"
    )}
    aria-invalid={!!errors.jobTitle}
    aria-describedby={errors.jobTitle ? "jobTitle-error" : undefined}
    required
  />

  {errors.jobTitle && (
    <p
      id="jobTitle-error"
      className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
      role="alert"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0
              012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {errors.jobTitle}
    </p>
  )}
</div>
```

**Address Fields (Grid Layout):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-12 gap-4">
  {/* City - 5 columns on desktop */}
  <div className="md:col-span-5 space-y-2">
    <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      City <span className="text-red-500">*</span>
    </label>
    <input
      id="city"
      type="text"
      value={formData.city}
      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
      className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      required
    />
  </div>

  {/* State - 3 columns on desktop */}
  <div className="md:col-span-3 space-y-2">
    <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      State <span className="text-red-500">*</span>
    </label>
    <select
      id="state"
      value={formData.state}
      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
      className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      required
    >
      <option value="">Select</option>
      <option value="AL">AL</option>
      <option value="AK">AK</option>
      {/* ... all US states */}
    </select>
  </div>

  {/* ZIP - 4 columns on desktop */}
  <div className="md:col-span-4 space-y-2">
    <label htmlFor="zip" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      ZIP Code <span className="text-red-500">*</span>
    </label>
    <input
      id="zip"
      type="text"
      value={formData.zip}
      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
      maxLength={5}
      pattern="[0-9]{5}"
      className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      required
    />
  </div>
</div>
```

**Textarea with Character Count:**
```tsx
<div className="space-y-2">
  <label htmlFor="description" className="block text-sm font-medium text-gray-700
                                           dark:text-gray-300">
    Description
  </label>

  <textarea
    id="description"
    value={formData.description}
    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
    placeholder="Provide any additional details about the work..."
    maxLength={500}
    rows={4}
    className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
               placeholder-gray-400 dark:placeholder-gray-500 resize-none
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />

  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
    <span>{formData.description.length} / 500 characters</span>
    {formData.description.length > 450 && (
      <span className="text-orange-600">Approaching limit</span>
    )}
  </div>
</div>
```

**Priority Radio Buttons:**
```tsx
<div className="space-y-3">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    Priority <span className="text-red-500">*</span>
  </label>

  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {[
      { value: 'low', label: 'Low', color: 'gray', ring: 'gray-300' },
      { value: 'normal', label: 'Normal', color: 'blue', ring: 'blue-500' },
      { value: 'high', label: 'High', color: 'orange', ring: 'orange-500' },
      { value: 'urgent', label: 'Urgent', color: 'red', ring: 'red-500' }
    ].map((priority) => (
      <button
        key={priority.value}
        type="button"
        onClick={() => setFormData({ ...formData, priority: priority.value })}
        className={cn(
          "relative h-20 rounded-lg border-2 transition-all",
          "hover:scale-105 active:scale-95",
          formData.priority === priority.value
            ? `border-${priority.color}-500 bg-${priority.color}-50 dark:bg-${priority.color}-900/20`
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
        )}
        role="radio"
        aria-checked={formData.priority === priority.value}
      >
        <div className="flex flex-col items-center justify-center h-full">
          {/* Radio Circle */}
          <div className={cn(
            "w-5 h-5 rounded-full border-2 mb-2 flex items-center justify-center transition-all",
            formData.priority === priority.value
              ? `border-${priority.color}-500 bg-${priority.color}-500`
              : "border-gray-300 dark:border-gray-600"
          )}>
            {formData.priority === priority.value && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>

          {/* Label */}
          <span className={cn(
            "text-sm font-medium",
            formData.priority === priority.value
              ? `text-${priority.color}-700 dark:text-${priority.color}-400`
              : "text-gray-700 dark:text-gray-300"
          )}>
            {priority.label}
          </span>
        </div>
      </button>
    ))}
  </div>
</div>
```

**Date Picker:**
```tsx
<div className="space-y-2">
  <label htmlFor="requestedStart" className="block text-sm font-medium text-gray-700
                                              dark:text-gray-300">
    Requested Start Date
  </label>

  <div className="relative">
    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor"
           viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2
              0 002 2z" />
      </svg>
    </div>

    <input
      id="requestedStart"
      type="date"
      value={formData.requestedStart}
      onChange={(e) => setFormData({ ...formData, requestedStart: e.target.value })}
      min={new Date().toISOString().split('T')[0]} // Today or later
      className="w-full h-12 pl-12 pr-4 text-sm border border-gray-300 dark:border-gray-600
                 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>

  <p className="text-xs text-gray-500 dark:text-gray-400">
    This is when the customer would like work to begin
  </p>
</div>
```

**Validation Rules:**
- Job Title: Required, 3-100 characters
- Address: Required, 5-200 characters
- City: Required, 2-50 characters
- State: Required, must be valid US state
- ZIP: Required, must be 5 digits
- Description: Optional, max 500 characters
- Priority: Required, one selection
- Requested Start: Optional, must be today or future date

---

## 5. STEP 3: SERVICES & PRICING

### Layout Design
```
┌────────────────────────────────────────────────────────────┐
│  Add Services                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  Choose how you'd like to add services:                   │
│                                                            │
│  ┌─────────────┬─────────────┬─────────────┐             │
│  │   AI Chat   │  Calculator │   Manual    │             │
│  └─────────────┴─────────────┴─────────────┘             │
│  ════════════                                              │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 💬  Chat with AI to build your estimate             │ │
│  │                                                      │ │
│  │ [Chat interface component appears here]             │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  Services Added (2)                                        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Service Name       Quantity    Unit Price    Total   │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ Paver Patio        360 sf      $85/sf      $30,600  [×]│
│  │ Includes materials and installation                  │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ Excavation         50 hrs      $150/hr     $7,500   [×]│
│  │ Site prep and grading                                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                          Subtotal:        $38,100.00 │ │
│  │                          Tax (6.5%):       $2,476.50 │ │
│  │                          ━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │                          Total:           $40,576.50 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Implementation Code

**Tab Navigation:**
```tsx
<div className="space-y-6">
  <div>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
      Choose how you'd like to add services:
    </p>

    <div className="flex border-b border-gray-200 dark:border-gray-700" role="tablist">
      {[
        { id: 'ai', label: 'AI Chat', icon: '🤖' },
        { id: 'calculator', label: 'Quick Calculator', icon: '🧮' },
        { id: 'manual', label: 'Manual Entry', icon: '✏️' }
      ].map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-panel`}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            activeTab === tab.id
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          )}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>

          {/* Active Indicator */}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600
                            dark:bg-blue-400" />
          )}
        </button>
      ))}
    </div>
  </div>

  {/* Tab Panels */}
  <div className="min-h-[400px]">
    {/* AI Chat Panel */}
    {activeTab === 'ai' && (
      <div id="ai-panel" role="tabpanel" className="animate-fadeIn">
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200
                        dark:border-blue-800 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center
                            flex-shrink-0">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Chat with AI Assistant
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Describe the work you need to do, and I'll help you build an accurate estimate
                based on your pricing configurations.
              </p>
            </div>
          </div>
        </div>

        {/* Embedded ChatInterface Component */}
        <div className="h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg
                        overflow-hidden">
          <ChatInterface
            mode="job-pricing"
            onServicesGenerated={(services) => addMultipleServices(services)}
            context={{
              customerId: selectedCustomer.id,
              jobType: formData.jobTitle
            }}
          />
        </div>
      </div>
    )}

    {/* Quick Calculator Panel */}
    {activeTab === 'calculator' && (
      <div id="calculator-panel" role="tabpanel" className="animate-fadeIn">
        <QuickCalculator onAddService={addService} />
      </div>
    )}

    {/* Manual Entry Panel */}
    {activeTab === 'manual' && (
      <div id="manual-panel" role="tabpanel" className="animate-fadeIn">
        <ManualServiceEntry onAddService={addService} />
      </div>
    )}
  </div>
</div>
```

**Quick Calculator Component:**
```tsx
function QuickCalculator({ onAddService }) {
  const [formData, setFormData] = useState({
    serviceConfigId: '',
    variables: {}
  });
  const [calculatedPrice, setCalculatedPrice] = useState(null);

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Service
        </label>
        <select
          value={formData.serviceConfigId}
          onChange={(e) => handleServiceSelect(e.target.value)}
          className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600
                     rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">Choose a service...</option>
          <option value="paver-patio">Paver Patio</option>
          <option value="excavation">Excavation</option>
          {/* Loaded from svc_pricing_configs */}
        </select>
      </div>

      {formData.serviceConfigId && (
        <>
          {/* Dynamic fields based on service config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Square Feet
              </label>
              <input
                type="number"
                value={formData.variables.squareFeet || ''}
                onChange={(e) => handleVariableChange('squareFeet', e.target.value)}
                className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600
                           rounded-lg bg-white dark:bg-gray-800"
                placeholder="360"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Material Type
              </label>
              <select
                value={formData.variables.materialType || ''}
                onChange={(e) => handleVariableChange('materialType', e.target.value)}
                className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600
                           rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Select...</option>
                <option value="standard">Standard ($75/sf)</option>
                <option value="premium">Premium ($95/sf)</option>
              </select>
            </div>
          </div>

          {/* Price Preview */}
          {calculatedPrice && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200
                            dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                    Estimated Price
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    ${calculatedPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {formData.variables.squareFeet} sf × ${calculatedPrice /
                    formData.variables.squareFeet}/sf
                  </p>
                </div>

                <button
                  onClick={() => onAddService({
                    name: getServiceName(formData.serviceConfigId),
                    quantity: formData.variables.squareFeet,
                    unit: 'sf',
                    unitPrice: calculatedPrice / formData.variables.squareFeet,
                    total: calculatedPrice,
                    description: `${formData.variables.materialType} material`
                  })}
                  className="h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg
                             font-medium transition-colors"
                >
                  Add Service
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

**Services Table:**
```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
      Services Added ({services.length})
    </h3>

    {services.length > 0 && (
      <button
        onClick={() => setShowBulkActions(true)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        Manage All
      </button>
    )}
  </div>

  {services.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 px-4 border-2
                    border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center
                      justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor"
             viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0
                002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
        No services added yet
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-sm">
        Choose a method above to start adding services to this job estimate
      </p>
    </div>
  ) : (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200
                            dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500
                             dark:text-gray-400 uppercase tracking-wider">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500
                             dark:text-gray-400 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500
                             dark:text-gray-400 uppercase tracking-wider">
                Unit Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500
                             dark:text-gray-400 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {services.map((service, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50
                                         transition-colors">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {service.name}
                    </p>
                    {service.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {service.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {service.quantity.toLocaleString()} {service.unit}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  ${service.unitPrice.toFixed(2)}/{service.unit}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-gray-900
                               dark:text-gray-100">
                  ${service.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => removeService(index)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20
                               text-gray-400 hover:text-red-600 dark:hover:text-red-400
                               transition-colors flex items-center justify-center"
                    aria-label={`Remove ${service.name}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
        {services.map((service, index) => (
          <div key={index} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {service.name}
                </h4>
                {service.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {service.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeService(index)}
                className="ml-3 w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20
                           text-gray-400 hover:text-red-600 flex items-center justify-center"
                aria-label={`Remove ${service.name}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Quantity</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {service.quantity.toLocaleString()} {service.unit}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Unit Price</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  ${service.unitPrice.toFixed(2)}/{service.unit}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subtotal
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  ${service.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* Price Summary */}
  {services.length > 0 && (
    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200
                    dark:border-gray-700">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            ${calculateSubtotal().toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Tax (6.5%)</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            ${calculateTax().toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>

        <div className="pt-3 border-t-2 border-gray-300 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Total Estimate
            </span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${calculateTotal().toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
```

**Validation Rules:**
- At least one service must be added
- Each service must have quantity > 0 and unit price > 0
- "Next" button disabled until at least one service added

---

## 6. STEP 4: REVIEW & CREATE

### Layout Design
```
┌────────────────────────────────────────────────────────────┐
│  Review Job Details                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ✓ Customer Information                           [▼]│ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  👤  Sarah Johnson                                  │ │
│  │  📧  sarah.j@email.com                              │ │
│  │  📱  (217) 555-0123                                 │ │
│  │  📍  123 Maple Street, Springfield, IL 62701       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ✓ Job Details                                    [▼]│ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  📋  Backyard Paver Patio                           │ │
│  │  📍  123 Maple Street, Springfield, IL 62701       │ │
│  │  🚨  Priority: Normal                               │ │
│  │  📅  Requested Start: February 15, 2025            │ │
│  │  📝  "Customer wants permeable pavers for drainage"│ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ✓ Services & Pricing (2 services)               [▼]│ │
│  ├──────────────────────────────────────────────────────┤ │
│  │  • Paver Patio (360 sf × $85/sf)     $30,600.00   │ │
│  │  • Excavation (50 hrs × $150/hr)      $7,500.00   │ │
│  │                                       ━━━━━━━━━━━━  │ │
│  │  Subtotal                             $38,100.00   │ │
│  │  Tax (6.5%)                            $2,476.50   │ │
│  │  Total Estimate                       $40,576.50   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Next Steps                                                │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  📄  Save as Quote                                  │ │
│  │      Create a quote without scheduling              │ │
│  │      [Save as Quote]                                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  🚀  Schedule Job Now                               │ │
│  │      Assign crew and set work dates                 │ │
│  │      [Schedule Job →]                               │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Implementation Code

**Collapsible Section:**
```tsx
function ReviewSection({ title, icon, children, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex items-center
                   justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414
                    0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {icon} {title}
          </span>
        </div>

        <svg
          className={cn(
            "w-5 h-5 text-gray-500 transition-transform",
            isExpanded && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 py-4 bg-white dark:bg-gray-900 animate-slideDown">
          {children}
        </div>
      )}
    </div>
  );
}
```

**Customer Review Section:**
```tsx
<ReviewSection title="Customer Information" icon="👤">
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center
                      justify-center">
        <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
          {selectedCustomer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </span>
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
          {selectedCustomer.name}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Customer ID: #{selectedCustomer.id}
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200
                    dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400">📧</span>
        <span className="text-gray-900 dark:text-gray-100">{selectedCustomer.email}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400">📱</span>
        <span className="text-gray-900 dark:text-gray-100">{selectedCustomer.phone}</span>
      </div>
      <div className="flex items-start gap-2 text-sm sm:col-span-2">
        <span className="text-gray-500 dark:text-gray-400">📍</span>
        <span className="text-gray-900 dark:text-gray-100">{selectedCustomer.address}</span>
      </div>
    </div>

    <button
      onClick={() => goToStep(0)}
      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
    >
      Edit Customer
    </button>
  </div>
</ReviewSection>
```

**Job Details Review:**
```tsx
<ReviewSection title="Job Details" icon="📋">
  <div className="space-y-4">
    <div>
      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Job Title
      </label>
      <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
        {formData.jobTitle}
      </p>
    </div>

    <div>
      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Service Address
      </label>
      <p className="mt-1 text-gray-900 dark:text-gray-100">
        {formData.address}, {formData.city}, {formData.state} {formData.zip}
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Priority
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            formData.priority === 'low' && "bg-gray-400",
            formData.priority === 'normal' && "bg-blue-500",
            formData.priority === 'high' && "bg-orange-500",
            formData.priority === 'urgent' && "bg-red-500"
          )} />
          <span className="text-gray-900 dark:text-gray-100 capitalize font-medium">
            {formData.priority}
          </span>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Requested Start
        </label>
        <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
          {formData.requestedStart
            ? new Date(formData.requestedStart).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })
            : 'Not specified'
          }
        </p>
      </div>
    </div>

    {formData.description && (
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Description
        </label>
        <p className="mt-1 text-gray-900 dark:text-gray-100 text-sm italic">
          "{formData.description}"
        </p>
      </div>
    )}

    <button
      onClick={() => goToStep(1)}
      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
    >
      Edit Job Details
    </button>
  </div>
</ReviewSection>
```

**Services & Pricing Review:**
```tsx
<ReviewSection title={`Services & Pricing (${services.length} ${services.length === 1 ? 'service' : 'services'})`} icon="💰">
  <div className="space-y-4">
    <div className="space-y-2">
      {services.map((service, index) => (
        <div key={index} className="flex items-start justify-between py-2 border-b
                                     border-gray-100 dark:border-gray-800 last:border-0">
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {service.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {service.quantity.toLocaleString()} {service.unit} × ${service.unitPrice.toFixed(2)}/{service.unit}
            </p>
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            ${service.total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      ))}
    </div>

    <div className="pt-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          ${calculateSubtotal().toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Tax (6.5%)</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          ${calculateTax().toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </span>
      </div>

      <div className="pt-2 border-t-2 border-gray-300 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Total Estimate
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${calculateTotal().toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>
      </div>
    </div>

    <button
      onClick={() => goToStep(2)}
      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
    >
      Edit Services
    </button>
  </div>
</ReviewSection>
```

**Action Cards:**
```tsx
<div className="space-y-4">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
    Next Steps
  </h3>

  {/* Save as Quote Option */}
  <button
    onClick={handleSaveAsQuote}
    disabled={isCreating}
    className="w-full p-6 rounded-lg border-2 border-gray-300 dark:border-gray-600
               bg-white dark:bg-gray-800 hover:border-gray-400 hover:bg-gray-50
               dark:hover:bg-gray-800/70 transition-all text-left group
               disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center
                      justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <span className="text-2xl">📄</span>
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Save as Quote
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create a quote that can be sent to the customer. No scheduling required.
        </p>
      </div>
      <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1
                      transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </button>

  {/* Schedule Job Option */}
  <button
    onClick={handleScheduleJob}
    disabled={isCreating}
    className="w-full p-6 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20
               hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-left group
               disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center
                      flex-shrink-0 group-hover:scale-110 transition-transform">
        <span className="text-2xl">🚀</span>
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
          Schedule Job Now
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Assign a crew and set work dates to get started immediately.
        </p>
      </div>
      <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-all"
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </button>
</div>
```

---

## 7. STEP 5: SCHEDULE & ASSIGN (Optional)

### Layout Design
```
┌────────────────────────────────────────────────────────────┐
│  Schedule Job                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  Assign Crew                                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Select a crew...                                  ▼  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Scheduled Dates                                           │
│  ┌──────────────────────────┐ ┌──────────────────────────┐│
│  │ Start Date               │ │ End Date                 ││
│  │ 📅 01/25/2025         ▼  │ │ 📅 01/27/2025         ▼  ││
│  └──────────────────────────┘ └──────────────────────────┘│
│                                                            │
│  Estimated Hours                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 24                                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ⚠ Crew Availability Warning                         │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ Crew Alpha has 2 other jobs scheduled on Jan 25.    │ │
│  │ This may affect completion times.                    │ │
│  │                                                      │ │
│  │ [View Full Schedule]                                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### No Crews Empty State
```
┌────────────────────────────────────────────────────────────┐
│  Schedule Job                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                         ℹ️                           │ │
│  │                                                      │ │
│  │           No Crews Available                         │ │
│  │                                                      │ │
│  │   You haven't created any crews yet. You can still   │ │
│  │   create this job and assign a crew later from the   │ │
│  │   job detail page.                                   │ │
│  │                                                      │ │
│  │   ┌────────────────────┐  ┌─────────────────────┐  │ │
│  │   │ Skip Scheduling    │  │ Create First Crew   │  │ │
│  │   └────────────────────┘  └─────────────────────┘  │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Implementation Code

**Crew Dropdown with Conflict Detection:**
```tsx
<div className="space-y-6">
  {crews.length > 0 ? (
    <>
      <div className="space-y-2">
        <label htmlFor="crew" className="block text-sm font-medium text-gray-700
                                          dark:text-gray-300">
          Assign Crew
        </label>

        <select
          id="crew"
          value={scheduleData.crewId}
          onChange={(e) => handleCrewChange(e.target.value)}
          className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600
                     rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a crew...</option>
          {crews.map(crew => (
            <option key={crew.id} value={crew.id}>
              {crew.name} ({crew.memberCount} {crew.memberCount === 1 ? 'member' : 'members'})
            </option>
          ))}
        </select>

        {scheduleData.crewId && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93
                      17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6
                      11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span>
                {crews.find(c => c.id === scheduleData.crewId)?.name} selected
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700
                                                 dark:text-gray-300">
            Start Date
          </label>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4
                            pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0
                      00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <input
              id="startDate"
              type="date"
              value={scheduleData.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full h-12 pl-12 pr-4 text-sm border border-gray-300
                         dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700
                                               dark:text-gray-300">
            End Date
          </label>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4
                            pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0
                      00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <input
              id="endDate"
              type="date"
              value={scheduleData.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              min={scheduleData.startDate || new Date().toISOString().split('T')[0]}
              className="w-full h-12 pl-12 pr-4 text-sm border border-gray-300
                         dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700
                                                    dark:text-gray-300">
          Estimated Hours
        </label>

        <input
          id="estimatedHours"
          type="number"
          value={scheduleData.estimatedHours}
          onChange={(e) => setScheduleData({
            ...scheduleData,
            estimatedHours: parseInt(e.target.value)
          })}
          min={1}
          placeholder="24"
          className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600
                     rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Conflict Warning */}
      {conflictData && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200
                        dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="currentColor"
                   viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58
                      9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11
                      13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd" />
              </svg>
            </div>

            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Crew Availability Warning
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                {conflictData.crewName} has {conflictData.jobCount} other
                {conflictData.jobCount === 1 ? ' job' : ' jobs'} scheduled on these dates.
                This may affect completion times.
              </p>

              <button
                onClick={() => setShowScheduleModal(true)}
                className="text-sm text-yellow-800 dark:text-yellow-200 underline
                           hover:text-yellow-900 dark:hover:text-yellow-100"
              >
                View Full Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  ) : (
    // Empty State
    <div className="flex flex-col items-center justify-center py-12 px-4 border-2
                    border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
      <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center
                      justify-center mb-4">
        <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none"
             stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0
                00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        No Crews Available
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
        You haven't created any crews yet. You can still create this job and assign a crew
        later from the job detail page.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSkipScheduling}
          className="h-12 px-6 rounded-lg border-2 border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                     hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
        >
          Skip Scheduling
        </button>

        <button
          onClick={handleCreateCrew}
          className="h-12 px-6 rounded-lg bg-blue-500 hover:bg-blue-600 text-white
                     font-medium transition-colors"
        >
          Create First Crew
        </button>
      </div>
    </div>
  )}
</div>
```

---

## 8. WIZARD FOOTER (Action Buttons)

### Layout Design
```
┌────────────────────────────────────────────────────────────┐
│  [← Back]                          [Next →]      [Cancel]  │
└────────────────────────────────────────────────────────────┘
```

### Implementation Code

**Desktop Footer:**
```tsx
<div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t
                border-gray-200 dark:border-gray-700 p-6">
  <div className="flex items-center justify-between gap-4">
    {/* Back Button */}
    <button
      onClick={handleBack}
      disabled={currentStep === 0 || isCreating}
      className="h-12 px-6 rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <div className="flex items-center gap-3">
      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        disabled={isCreating}
        className="h-12 px-6 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900
                   dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800
                   font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>

      {/* Next/Create Button */}
      {currentStep < steps.length - 1 ? (
        <button
          onClick={handleNext}
          disabled={!canProceed() || isCreating}
          className="h-12 px-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white
                     font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <button
          onClick={handleCreateJob}
          disabled={!canProceed() || isCreating}
          className="h-12 px-8 rounded-lg bg-green-500 hover:bg-green-600 text-white
                     font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0
                      0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Creating Job...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414
                      0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd" />
              </svg>
              Create Job
            </>
          )}
        </button>
      )}
    </div>
  </div>
</div>
```

**Mobile Footer (Sticky):**
```tsx
<div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t
                border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3 sm:hidden">
  {/* Primary Action (Full Width) */}
  {currentStep < steps.length - 1 ? (
    <button
      onClick={handleNext}
      disabled={!canProceed() || isCreating}
      className="w-full h-14 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-base
                 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
    >
      Next: {steps[currentStep + 1].label}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  ) : (
    <button
      onClick={handleCreateJob}
      disabled={!canProceed() || isCreating}
      className="w-full h-14 rounded-lg bg-green-500 hover:bg-green-600 text-white text-base
                 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
    >
      {isCreating ? (
        <>
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor"
               viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0
                  0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Creating...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414
                  0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd" />
          </svg>
          Create Job
        </>
      )}
    </button>
  )}

  {/* Secondary Actions */}
  <div className="flex gap-3">
    <button
      onClick={handleBack}
      disabled={currentStep === 0 || isCreating}
      className="flex-1 h-12 rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Back
    </button>

    <button
      onClick={handleCancel}
      disabled={isCreating}
      className="flex-1 h-12 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900
                 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800
                 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Cancel
    </button>
  </div>
</div>
```

---

## 9. ANIMATIONS & TRANSITIONS

### Tailwind Config (Add to tailwind.config.js)
```js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        checkmark: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        slideDown: 'slideDown 0.3s ease-out',
        slideUp: 'slideUp 0.3s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
        shimmer: 'shimmer 2s infinite',
        checkmark: 'checkmark 0.5s ease-out'
      }
    }
  }
}
```

### Step Transitions
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={currentStep}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
  >
    {renderStepContent()}
  </motion.div>
</AnimatePresence>
```

### Loading Skeleton
```tsx
<div className="space-y-4 animate-pulse">
  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
</div>
```

---

## 10. ACCESSIBILITY CHECKLIST (WCAG 2.1 AA)

### Keyboard Navigation
- [ ] Tab order follows logical flow (top to bottom, left to right)
- [ ] All interactive elements focusable (buttons, inputs, links)
- [ ] Enter key activates buttons and selects options
- [ ] Escape key closes modal with confirmation
- [ ] Arrow keys navigate between radio buttons
- [ ] Focus visible with 2px blue outline
- [ ] Focus trap within modal (can't tab outside)

### Screen Reader Support
- [ ] Modal has `role="dialog"` and `aria-modal="true"`
- [ ] Progress indicator has `aria-label="Step 2 of 5"`
- [ ] Form fields have associated `<label>` elements
- [ ] Error messages use `aria-live="polite"` or `aria-describedby`
- [ ] Required fields marked with `aria-required="true"`
- [ ] Disabled buttons have `aria-disabled="true"`
- [ ] Tab panels use `role="tabpanel"` and `aria-labelledby`
- [ ] Status messages announced (e.g., "Job created successfully")

### Color Contrast
- [ ] Text on white background: 4.5:1 minimum
- [ ] Gray text on light gray: 4.5:1 minimum
- [ ] Blue links on white: 4.5:1 minimum
- [ ] Error text (red) on white: 4.5:1 minimum
- [ ] Placeholder text: 4.5:1 minimum

### Touch Targets (Mobile)
- [ ] All buttons minimum 44px × 44px
- [ ] Adequate spacing between tap targets (8px minimum)
- [ ] Swipe gestures optional (buttons still work)

### Form Accessibility
- [ ] Labels positioned above inputs
- [ ] Error messages appear below fields
- [ ] Inline validation on blur, not on keypress
- [ ] Success states clearly indicated
- [ ] Progress saved if user accidentally closes

### Alternative Text
- [ ] Icons have `aria-label` if no visible text
- [ ] Decorative icons use `aria-hidden="true"`
- [ ] Loading spinners have "Loading..." aria-label

---

## 11. ERROR HANDLING & VALIDATION

### Field Validation
```tsx
const validateField = (fieldName: string, value: any): string | null => {
  switch (fieldName) {
    case 'jobTitle':
      if (!value || value.trim().length < 3) {
        return 'Job title must be at least 3 characters';
      }
      if (value.length > 100) {
        return 'Job title cannot exceed 100 characters';
      }
      return null;

    case 'address':
      if (!value || value.trim().length < 5) {
        return 'Please enter a valid address';
      }
      return null;

    case 'zip':
      if (!/^\d{5}$/.test(value)) {
        return 'ZIP code must be 5 digits';
      }
      return null;

    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
      return null;

    default:
      return null;
  }
};
```

### Network Error Handling
```tsx
async function handleCreateJob() {
  setIsCreating(true);
  setError(null);

  try {
    const response = await createJob(jobData);

    // Success State
    setShowSuccess(true);
    setTimeout(() => {
      router.push(`/jobs/${response.id}`);
    }, 2000);

  } catch (error) {
    // Error State
    if (error.code === 'NETWORK_ERROR') {
      setError({
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        action: 'Retry'
      });
    } else if (error.code === 'VALIDATION_ERROR') {
      setError({
        title: 'Validation Error',
        message: error.message,
        action: 'Review'
      });
    } else {
      setError({
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred. Please try again.',
        action: 'Retry'
      });
    }
  } finally {
    setIsCreating(false);
  }
}
```

### Error Banner
```tsx
{error && (
  <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-red-50 dark:bg-red-900/20
                  border-b-2 border-red-500 animate-slideDown" role="alert">
    <div className="flex items-start gap-3 max-w-4xl mx-auto">
      <div className="w-6 h-6 flex-shrink-0">
        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor"
             viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0
                00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293
                1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10
                8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
          {error.title}
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300">
          {error.message}
        </p>
      </div>

      <button
        onClick={() => setError(null)}
        className="w-8 h-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40
                   text-red-600 dark:text-red-400 flex items-center justify-center"
        aria-label="Dismiss error"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
)}
```

### Success State
```tsx
{showSuccess && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50
                  backdrop-blur-sm animate-fadeIn">
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 max-w-md
                    animate-scaleIn">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex
                        items-center justify-center mb-4">
          <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none"
               stroke="currentColor" viewBox="0 0 24 24">
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Job Created Successfully!
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Redirecting to job details...
        </p>

        <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 12. RESPONSIVE BREAKPOINTS

### Tailwind Breakpoint System
```js
// Default Tailwind breakpoints
sm: 640px   // Small tablets
md: 768px   // Tablets
lg: 1024px  // Desktops
xl: 1280px  // Large desktops
2xl: 1536px // Extra large desktops
```

### Responsive Utilities
```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop Content</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">Mobile Content</div>

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">Content</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>

// Responsive text sizes
<h1 className="text-xl md:text-2xl lg:text-3xl">Heading</h1>

// Responsive button sizes
<button className="h-12 md:h-14 px-4 md:px-6 text-sm md:text-base">
  Button
</button>
```

---

## 13. COMPONENT FILE STRUCTURE

```
src/components/JobWizard/
├── JobWizard.tsx                 # Main wizard container
├── JobWizardContext.tsx          # Context for shared state
├── ProgressIndicator.tsx         # Step progress component
├── steps/
│   ├── Step1CustomerSelect.tsx
│   ├── Step2JobDetails.tsx
│   ├── Step3Services.tsx
│   ├── Step4Review.tsx
│   └── Step5Schedule.tsx
├── components/
│   ├── CustomerCard.tsx
│   ├── ServiceCalculator.tsx
│   ├── ManualServiceEntry.tsx
│   ├── ReviewSection.tsx
│   └── ConflictWarning.tsx
├── hooks/
│   ├── useWizardNavigation.ts
│   ├── useFormValidation.ts
│   └── useJobCreation.ts
└── types/
    └── wizard.types.ts
```

---

## 14. IMPLEMENTATION PRIORITY

### Phase 1: Core Structure (Week 1)
1. Wizard container and modal
2. Progress indicator
3. Step navigation
4. Context and state management

### Phase 2: Steps 1-2 (Week 2)
1. Customer selection UI
2. Customer search and filtering
3. Job details form
4. Form validation

### Phase 3: Step 3 Services (Week 2-3)
1. Tab navigation
2. Manual service entry
3. Quick calculator integration
4. AI chat integration
5. Services table

### Phase 4: Steps 4-5 (Week 3)
1. Review sections
2. Schedule and assign
3. Conflict detection
4. Empty states

### Phase 5: Polish (Week 4)
1. Animations and transitions
2. Error handling
3. Loading states
4. Accessibility audit
5. Responsive testing

---

## 15. TESTING CHECKLIST

### Functional Testing
- [ ] Can complete wizard with all required fields
- [ ] Can navigate back and forward between steps
- [ ] Can cancel wizard at any step
- [ ] Can edit previous steps from review
- [ ] Validation prevents progression with errors
- [ ] Success state shows after creation
- [ ] Redirects to job detail after success

### Responsive Testing
- [ ] Desktop (1920px, 1440px, 1024px)
- [ ] Tablet (768px, 834px)
- [ ] Mobile (375px, 414px, 390px)
- [ ] Landscape orientation on mobile/tablet
- [ ] Touch gestures work on mobile

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Accessibility Testing
- [ ] NVDA screen reader (Windows)
- [ ] JAWS screen reader (Windows)
- [ ] VoiceOver (macOS/iOS)
- [ ] Keyboard-only navigation
- [ ] Color contrast with tools (WebAIM, axe DevTools)
- [ ] Focus indicators visible
- [ ] Form errors announced

### Performance Testing
- [ ] Initial load under 2 seconds
- [ ] Step transitions smooth (60fps)
- [ ] No janky scrolling
- [ ] Image optimization
- [ ] Code splitting for AI chat component

---

This comprehensive design specification provides everything needed to implement a production-ready Job Creation Wizard. All components follow accessibility best practices, responsive design principles, and modern UX patterns.
