# Wizard Design Pattern - Quick Reference

**Purpose:** Build multi-step wizards using the Job Creation Wizard architecture
**Pattern:** Custom hook + Modal container + Step components + Smart navigation
**Last Updated:** 2025-10-24

---

## When to Use Wizards

Use a wizard for:
- Multi-step data collection (3+ steps)
- Complex forms requiring validation between stages
- Workflows where user needs to see progress
- Processes that benefit from localStorage persistence

Skip wizards for:
- Simple forms (1-2 fields)
- Linear processes without branching
- Quick actions requiring immediate feedback

---

## Quick Start Checklist

```
[ ] 1. Define wizard steps (3-5 recommended)
[ ] 2. Create state management hook (extend useJobCreationWizard)
[ ] 3. Build step validation functions
[ ] 4. Create step components
[ ] 5. Build container with progress indicator + navigation
[ ] 6. Add localStorage persistence
[ ] 7. Implement final submission handler
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  WizardContainer (Modal)                        │
│  ┌───────────────────────────────────────────┐  │
│  │ ProgressIndicator (Desktop/Mobile)        │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ Step Content (conditional render)         │  │
│  │  - Step 1: CustomerSelectionStep          │  │
│  │  - Step 2: DetailsStep                    │  │
│  │  - Step 3: ConfigurationStep              │  │
│  │  - Step 4: ReviewStep                     │  │
│  │  - Step 5: ScheduleStep (optional)        │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ WizardNavigation (Back/Next/Special)      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         ↕
   useCustomWizard (state + validation + navigation)
```

---

## Core Pattern: Custom Hook

**File:** `src/hooks/useCustomWizard.ts`

### Minimal Template

```typescript
import { useState, useCallback, useMemo } from 'react';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface WizardState {
  currentStep: WizardStep;
  step1Data: any; // Replace with specific type
  step2Data: any;
  step3Data: any;
  step4Data: any;
  step5Data: any | null; // Optional step
  isCompleted: boolean;
  errors: Record<string, string>;
}

export interface WizardConfig {
  companyId: string;
  userId: string;
  enableLocalStorage?: boolean;
  storageKey?: string;
  validateOnStepChange?: boolean;
}

const createInitialState = (): WizardState => ({
  currentStep: 1,
  step1Data: null,
  step2Data: null,
  step3Data: null,
  step4Data: null,
  step5Data: null,
  isCompleted: false,
  errors: {}
});

// Validation functions
const validateStep1 = (state: WizardState) => {
  const errors: Record<string, string> = {};
  if (!state.step1Data) errors.step1 = 'Step 1 data required';
  return { isValid: Object.keys(errors).length === 0, errors };
};

const validateStep2 = (state: WizardState) => {
  const errors: Record<string, string> = {};
  if (!state.step2Data) errors.step2 = 'Step 2 data required';
  return { isValid: Object.keys(errors).length === 0, errors };
};

const validateStep = (step: WizardStep, state: WizardState) => {
  switch (step) {
    case 1: return validateStep1(state);
    case 2: return validateStep2(state);
    case 3: return { isValid: true, errors: {} }; // Add validation
    case 4: return { isValid: true, errors: {} }; // Review - always valid
    case 5: return { isValid: true, errors: {} }; // Optional
    default: return { isValid: false, errors: { general: 'Invalid step' } };
  }
};

export const useCustomWizard = (config: WizardConfig) => {
  const [state, setState] = useState<WizardState>(createInitialState);

  const canGoNext = useMemo(() => {
    const validation = validateStep(state.currentStep, state);
    return validation.isValid;
  }, [state]);

  const goToStep = useCallback((step: WizardStep, skipValidation = false) => {
    if (step < 1 || step > 5) return;

    if (!skipValidation && step > state.currentStep) {
      const validation = validateStep(state.currentStep, state);
      if (!validation.isValid) {
        setState(prev => ({ ...prev, errors: validation.errors }));
        return;
      }
    }

    setState(prev => ({ ...prev, currentStep: step, errors: {} }));
  }, [state]);

  const nextStep = useCallback(() => {
    if (state.currentStep < 5) {
      goToStep((state.currentStep + 1) as WizardStep);
    }
  }, [state.currentStep, goToStep]);

  const prevStep = useCallback(() => {
    if (state.currentStep > 1) {
      goToStep((state.currentStep - 1) as WizardStep);
    }
  }, [state.currentStep, goToStep]);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    currentStep: state.currentStep,
    canGoNext,
    canGoBack: state.currentStep > 1,
    isFirstStep: state.currentStep === 1,
    isLastStep: state.currentStep === 5,
    goToStep,
    nextStep,
    prevStep,
    reset,
    errors: state.errors,
  };
};
```

---

## Core Pattern: Container Component

**File:** `src/components/custom/CustomWizard.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useCustomWizard, WizardStep } from '../../hooks/useCustomWizard';
import { WizardProgressIndicator } from './wizard/WizardProgressIndicator';
import { WizardNavigation } from './wizard/WizardNavigation';

interface CustomWizardProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  userId: string;
}

export const CustomWizard: React.FC<CustomWizardProps> = ({
  isOpen,
  onClose,
  companyId,
  userId,
}) => {
  const wizard = useCustomWizard({ companyId, userId, enableLocalStorage: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [wizard.currentStep]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Final submission logic
      await submitData(wizard.state);
      wizard.reset();
      onClose();
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-4xl h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">

        {/* Progress Indicator */}
        <WizardProgressIndicator
          currentStep={wizard.currentStep}
          completedSteps={completedSteps}
          onStepClick={wizard.goToStep}
        />

        {/* Step Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {wizard.currentStep === 1 && <Step1 />}
          {wizard.currentStep === 2 && <Step2 />}
          {wizard.currentStep === 3 && <Step3 />}
          {wizard.currentStep === 4 && <Step4 />}
          {wizard.currentStep === 5 && <Step5 />}
        </div>

        {/* Navigation */}
        <WizardNavigation
          currentStep={wizard.currentStep}
          canGoBack={wizard.canGoBack}
          canGoNext={wizard.canGoNext}
          isFirstStep={wizard.isFirstStep}
          isLastStep={wizard.isLastStep}
          isLoading={isSubmitting}
          onBack={wizard.prevStep}
          onNext={wizard.nextStep}
          onCancel={onClose}
          onCreateJob={handleSubmit}
        />
      </div>
    </div>
  );
};
```

---

## Progress Indicator Pattern

**Responsive:** Desktop stepper (horizontal) + Mobile progress bar

```typescript
// Desktop: Clickable stepper with icons
<div className="hidden md:flex items-center justify-between">
  {steps.map((step, i) => (
    <Fragment key={step}>
      <button onClick={() => onStepClick(step)}>
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-200'}
        `}>
          {isCompleted ? <CheckIcon /> : step}
        </div>
        <span>{stepLabels[step]}</span>
      </button>
      {!isLast && <ConnectingLine />}
    </Fragment>
  ))}
</div>

// Mobile: Compact progress bar
<div className="md:hidden">
  <span>Step {current} of {total}</span>
  <div className="h-2 bg-gray-200 rounded-full">
    <div style={{ width: `${(current/total)*100}%` }}
         className="h-full bg-blue-500" />
  </div>
</div>
```

---

## Navigation Pattern

**Context-Aware Buttons:** Different actions per step

```typescript
// Step 1-3: Standard Next/Back
<button onClick={onNext} disabled={!canGoNext}>Next</button>

// Step 4 (Review): Multiple actions
<button onClick={onSaveAsQuote}>Save as Quote</button>
<button onClick={onGenerateInvoice}>Generate Invoice</button>
<button onClick={onScheduleJob}>Schedule Job →</button>

// Step 5 (Optional): Final action
<button onClick={onCreateJob} disabled={!canGoNext}>
  {isLoading ? 'Creating...' : 'Create Job'}
</button>
```

---

## Validation Pattern

### Step-Level Validation

```typescript
const validateStep = (step: WizardStep, state: WizardState) => {
  const errors: Record<string, string> = {};

  switch (step) {
    case 1:
      if (!state.customer) errors.customer = 'Required';
      break;
    case 2:
      if (!state.details.title) errors.title = 'Required';
      if (state.details.priority < 0) errors.priority = 'Invalid range';
      break;
    case 3:
      if (state.services.length === 0) errors.services = 'At least one required';
      state.services.forEach((svc, i) => {
        if (!svc.name) errors[`service_${i}`] = 'Name required';
      });
      break;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
```

### Smart Navigation Rules

```typescript
// Allow backward navigation without validation
const goToStep = (step: WizardStep, skipValidation = false) => {
  const shouldValidate = step > currentStep && !skipValidation;

  if (shouldValidate) {
    const validation = validateStep(currentStep, state);
    if (!validation.isValid) {
      setState(prev => ({ ...prev, errors: validation.errors }));
      return; // Block navigation
    }
  }

  setState(prev => ({ ...prev, currentStep: step, errors: {} }));
};
```

---

## LocalStorage Persistence

```typescript
const STORAGE_KEY = 'wizard-state-${companyId}';

// Auto-save on state change
useEffect(() => {
  if (config.enableLocalStorage && !state.isCompleted) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}, [state]);

// Restore on mount
const [state, setState] = useState<WizardState>(() => {
  if (config.enableLocalStorage) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.isCompleted) return parsed;
    }
  }
  return createInitialState();
});

// Clear on completion
const markCompleted = (jobId: string) => {
  setState(prev => ({ ...prev, isCompleted: true, createdJobId: jobId }));
  localStorage.removeItem(STORAGE_KEY);
};
```

---

## Step Component Pattern

**Each step receives controlled props from container:**

```typescript
interface StepProps {
  data: StepData;
  onUpdate: (updates: Partial<StepData>) => void;
  errors: Record<string, string>;
}

export const Step2: React.FC<StepProps> = ({ data, onUpdate, errors }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Job Details</h2>

      <input
        value={data.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        className={errors.title ? 'border-red-500' : ''}
      />
      {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}

      <select
        value={data.priority}
        onChange={(e) => onUpdate({ priority: Number(e.target.value) })}
      >
        <option value={0}>Low</option>
        <option value={5}>Normal</option>
        <option value={10}>High</option>
      </select>
    </div>
  );
};
```

---

## Best Practices

### DO

- **Keep steps focused:** Each step = one logical task
- **Validate incrementally:** Validate current step before allowing next
- **Auto-populate:** Pre-fill data from previous steps (e.g., customer address → job address)
- **Show progress:** Use visual indicators and step counters
- **Enable backward navigation:** Users should freely move backward
- **Persist state:** Use localStorage for multi-session workflows
- **Clear on completion:** Remove localStorage after successful submission
- **Responsive design:** Desktop stepper + mobile progress bar
- **Smart validation:** Don't block backward navigation with validation

### DON'T

- **Don't validate on backward nav:** Only validate when moving forward
- **Don't skip progress indicators:** Users need to see where they are
- **Don't allow orphan data:** Step 1 should establish required context (e.g., customer)
- **Don't use wizards for simple forms:** 1-2 fields don't need multi-step
- **Don't lose data on errors:** Preserve state when validation fails
- **Don't block all navigation:** Allow jumping to completed/visited steps

---

## Common Pitfalls

### 1. Blocking Backward Navigation

**Problem:**
```typescript
// BAD: Validates even when going backward
const goToStep = (step: WizardStep) => {
  const validation = validateStep(currentStep, state);
  if (!validation.isValid) return; // Blocks backward!
};
```

**Solution:**
```typescript
// GOOD: Only validate forward navigation
const goToStep = (step: WizardStep, skipValidation = false) => {
  const shouldValidate = step > currentStep && !skipValidation;
  if (shouldValidate) {
    const validation = validateStep(currentStep, state);
    if (!validation.isValid) {
      setState(prev => ({ ...prev, errors: validation.errors }));
      return;
    }
  }
  setState(prev => ({ ...prev, currentStep: step, errors: {} }));
};
```

### 2. Not Clearing Errors on Step Change

**Problem:** Old validation errors persist when changing steps

**Solution:**
```typescript
setState(prev => ({
  ...prev,
  currentStep: step,
  errors: {} // Clear errors on navigation
}));
```

### 3. Losing Scroll Position

**Problem:** Content remains scrolled when changing steps

**Solution:**
```typescript
const scrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
}, [currentStep]);
```

### 4. Not Tracking Furthest Reached Step

**Problem:** Users can't jump to visited incomplete steps

**Solution:**
```typescript
const [furthestReached, setFurthestReached] = useState<WizardStep>(1);

useEffect(() => {
  if (currentStep > furthestReached) {
    setFurthestReached(currentStep);
  }
}, [currentStep]);

const isStepClickable = (step: WizardStep) => {
  return completedSteps.includes(step) || step <= furthestReached;
};
```

### 5. Missing Close Confirmation

**Problem:** Users lose progress when accidentally closing

**Solution:**
```typescript
const handleClose = () => {
  if (hasData(wizard.state)) {
    setShowCloseConfirm(true); // Show dialog
  } else {
    wizard.reset();
    onClose();
  }
};
```

---

## Type Safety Pattern

```typescript
// Define step-specific types
export interface Step1Data {
  customer: CustomerProfile | null;
}

export interface Step2Data {
  title: string;
  priority: number;
  address?: string;
}

export interface Step3Data {
  services: ServiceLineItem[];
}

// Wizard state combines all steps
export interface WizardState {
  currentStep: WizardStep;
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: ReviewData;
  step5: ScheduleData | null; // Optional
  errors: Record<string, string>;
}

// Type-safe step data extraction
export type StepDataType<T extends WizardStep> =
  T extends 1 ? Step1Data :
  T extends 2 ? Step2Data :
  T extends 3 ? Step3Data :
  T extends 4 ? ReviewData :
  T extends 5 ? ScheduleData :
  never;
```

---

## Testing Strategy

```typescript
// Unit test: Hook validation
describe('useCustomWizard', () => {
  it('blocks navigation to step 2 without step 1 data', () => {
    const { result } = renderHook(() => useCustomWizard(config));

    act(() => result.current.nextStep());

    expect(result.current.currentStep).toBe(1); // Still on step 1
    expect(result.current.errors).toHaveProperty('step1');
  });

  it('allows backward navigation without validation', () => {
    const { result } = renderHook(() => useCustomWizard(config));

    // Set to step 3 with incomplete data
    act(() => result.current.goToStep(3, true));
    expect(result.current.currentStep).toBe(3);

    // Go back should work
    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe(2);
  });
});

// E2E test: Full wizard flow
test('completes wizard flow', async () => {
  render(<CustomWizard isOpen={true} />);

  // Step 1
  await userEvent.click(screen.getByText('Select Customer'));
  await userEvent.click(screen.getByText('Next'));

  // Step 2
  await userEvent.type(screen.getByLabelText('Title'), 'Test Job');
  await userEvent.click(screen.getByText('Next'));

  // Step 3
  await userEvent.click(screen.getByText('Add Service'));
  await userEvent.click(screen.getByText('Next'));

  // Step 4
  await userEvent.click(screen.getByText('Create Job'));

  expect(await screen.findByText('Success')).toBeInTheDocument();
});
```

---

## File Structure

```
src/
├── hooks/
│   └── useCustomWizard.ts          # State management + validation
├── components/
│   └── custom/
│       ├── CustomWizard.tsx        # Container component
│       └── wizard/
│           ├── WizardProgressIndicator.tsx
│           ├── WizardNavigation.tsx
│           ├── Step1Component.tsx
│           ├── Step2Component.tsx
│           ├── Step3Component.tsx
│           ├── Step4Component.tsx
│           └── Step5Component.tsx
├── types/
│   └── custom-wizard.ts            # Type definitions
└── services/
    └── customWizardService.ts      # Submission logic
```

---

## Quick Copy-Paste Snippets

### Validation Function Template
```typescript
const validateStepN = (state: WizardState) => {
  const errors: Record<string, string> = {};
  if (!state.stepNData.requiredField) {
    errors.requiredField = 'This field is required';
  }
  return { isValid: Object.keys(errors).length === 0, errors };
};
```

### Update Handler Template
```typescript
const updateStepNData = useCallback((updates: Partial<StepNData>) => {
  setState(prev => ({
    ...prev,
    stepNData: { ...prev.stepNData, ...updates }
  }));
}, []);
```

### Auto-Populate Pattern
```typescript
const setCustomer = useCallback((customer: Customer | null) => {
  setState(prev => {
    const updates: Partial<WizardState> = { customer };

    // Auto-populate related fields
    if (customer && !prev.jobDetails.address) {
      updates.jobDetails = {
        ...prev.jobDetails,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zip: customer.zip,
      };
    }

    return { ...prev, ...updates };
  });
}, []);
```

---

## Performance Optimization

```typescript
// Memoize computed values
const totalPrice = useMemo(() => {
  return state.services.reduce((sum, svc) => sum + svc.price, 0);
}, [state.services]);

// Debounce expensive validations
const debouncedValidation = useMemo(
  () => debounce((data) => validateExpensiveField(data), 500),
  []
);

// Lazy load step components
const Step3 = lazy(() => import('./wizard/Step3Component'));
```

---

## Accessibility Checklist

```typescript
// Progress indicator
<div role="navigation" aria-label="Progress through wizard steps">
  <button aria-current={isCurrent ? 'step' : undefined}>
    Step {n}
  </button>
</div>

// Form inputs
<label htmlFor="title">Job Title</label>
<input id="title" aria-required="true" aria-invalid={!!errors.title} />
{errors.title && <p role="alert" aria-live="polite">{errors.title}</p>}

// Navigation
<button aria-label="Go to previous step" disabled={!canGoBack}>
  Back
</button>
```

---

**End of Document** | Total Lines: 495

For implementation questions, reference:
- `src/hooks/useJobCreationWizard.ts` (full hook implementation)
- `src/components/jobs/JobCreationWizard.tsx` (full container)
- `src/types/job-wizard.ts` (comprehensive types)
