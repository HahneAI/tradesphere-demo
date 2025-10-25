# Job Creation Wizard - Implementation Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [State Management](#state-management)
3. [Component Implementation](#component-implementation)
4. [Validation System](#validation-system)
5. [API Integration](#api-integration)
6. [Testing Strategy](#testing-strategy)
7. [Performance Optimization](#performance-optimization)

---

## 1. ARCHITECTURE OVERVIEW

### Component Hierarchy
```
JobWizardModal
├── WizardProvider (Context)
│   ├── ProgressIndicator
│   ├── WizardContent
│   │   ├── Step1CustomerSelect
│   │   │   ├── CustomerSearch
│   │   │   ├── CustomerList
│   │   │   └── CreateCustomerButton
│   │   ├── Step2JobDetails
│   │   │   ├── JobTitleInput
│   │   │   ├── AddressFields
│   │   │   ├── PrioritySelector
│   │   │   └── DatePicker
│   │   ├── Step3Services
│   │   │   ├── TabNavigation
│   │   │   ├── AIChat
│   │   │   ├── QuickCalculator
│   │   │   ├── ManualEntry
│   │   │   └── ServicesTable
│   │   ├── Step4Review
│   │   │   ├── CustomerReview
│   │   │   ├── JobDetailsReview
│   │   │   ├── ServicesReview
│   │   │   └── ActionCards
│   │   └── Step5Schedule
│   │       ├── CrewSelector
│   │       ├── DateRangeSelector
│   │       └── ConflictWarning
│   └── WizardFooter
│       ├── BackButton
│       ├── NextButton
│       └── CancelButton
└── SuccessModal
```

### Technology Stack
- **UI Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS 3.x
- **State Management**: React Context + useReducer
- **Form Validation**: Zod (for schema validation)
- **Animations**: Framer Motion
- **Date Handling**: date-fns
- **HTTP Client**: Existing Supabase client

---

## 2. STATE MANAGEMENT

### Wizard Context Setup

**File: `src/components/JobWizard/context/WizardContext.tsx`**

```tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  jobCount?: number;
  lastJobDate?: string;
}

export interface Service {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface JobFormData {
  // Step 1
  customer: Customer | null;

  // Step 2
  jobTitle: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requestedStartDate: string;

  // Step 3
  services: Service[];
  subtotal: number;
  tax: number;
  total: number;

  // Step 5
  crewId?: string;
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
}

export interface WizardState {
  currentStep: number;
  formData: JobFormData;
  errors: Record<string, string>;
  isCreating: boolean;
  isDirty: boolean;
}

type WizardAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_JOB_DETAILS'; payload: Partial<JobFormData> }
  | { type: 'ADD_SERVICE'; payload: Service }
  | { type: 'REMOVE_SERVICE'; payload: number }
  | { type: 'UPDATE_SERVICES'; payload: Service[] }
  | { type: 'SET_SCHEDULE'; payload: Partial<JobFormData> }
  | { type: 'SET_ERRORS'; payload: Record<string, string> }
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'RESET_WIZARD' };

const initialState: WizardState = {
  currentStep: 0,
  formData: {
    customer: null,
    jobTitle: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    description: '',
    priority: 'normal',
    requestedStartDate: '',
    services: [],
    subtotal: 0,
    tax: 0,
    total: 0,
  },
  errors: {},
  isCreating: false,
  isDirty: false,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, 4) };

    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };

    case 'SET_CUSTOMER':
      return {
        ...state,
        formData: {
          ...state.formData,
          customer: action.payload,
          // Pre-fill address from customer
          address: action.payload.address,
          city: action.payload.city,
          state: action.payload.state,
          zip: action.payload.zip,
        },
        isDirty: true,
      };

    case 'UPDATE_JOB_DETAILS':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
        isDirty: true,
      };

    case 'ADD_SERVICE': {
      const newServices = [...state.formData.services, action.payload];
      const subtotal = newServices.reduce((sum, s) => sum + s.total, 0);
      const tax = subtotal * 0.065; // 6.5% tax
      const total = subtotal + tax;

      return {
        ...state,
        formData: {
          ...state.formData,
          services: newServices,
          subtotal,
          tax,
          total,
        },
        isDirty: true,
      };
    }

    case 'REMOVE_SERVICE': {
      const newServices = state.formData.services.filter(
        (_, index) => index !== action.payload
      );
      const subtotal = newServices.reduce((sum, s) => sum + s.total, 0);
      const tax = subtotal * 0.065;
      const total = subtotal + tax;

      return {
        ...state,
        formData: {
          ...state.formData,
          services: newServices,
          subtotal,
          tax,
          total,
        },
        isDirty: true,
      };
    }

    case 'UPDATE_SERVICES': {
      const subtotal = action.payload.reduce((sum, s) => sum + s.total, 0);
      const tax = subtotal * 0.065;
      const total = subtotal + tax;

      return {
        ...state,
        formData: {
          ...state.formData,
          services: action.payload,
          subtotal,
          tax,
          total,
        },
        isDirty: true,
      };
    }

    case 'SET_SCHEDULE':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
        isDirty: true,
      };

    case 'SET_ERRORS':
      return { ...state, errors: action.payload };

    case 'SET_CREATING':
      return { ...state, isCreating: action.payload };

    case 'RESET_WIZARD':
      return initialState;

    default:
      return state;
  }
}

interface WizardContextValue extends WizardState {
  dispatch: React.Dispatch<WizardAction>;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceed: () => boolean;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const goToStep = (step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const nextStep = () => {
    dispatch({ type: 'NEXT_STEP' });
  };

  const prevStep = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  const canProceed = (): boolean => {
    const { currentStep, formData } = state;

    switch (currentStep) {
      case 0: // Customer Selection
        return formData.customer !== null;

      case 1: // Job Details
        return !!(
          formData.jobTitle &&
          formData.address &&
          formData.city &&
          formData.state &&
          formData.zip &&
          formData.priority
        );

      case 2: // Services
        return formData.services.length > 0;

      case 3: // Review
        return true; // Always can proceed from review

      case 4: // Schedule
        return true; // Schedule is optional

      default:
        return false;
    }
  };

  const value: WizardContextValue = {
    ...state,
    dispatch,
    goToStep,
    nextStep,
    prevStep,
    canProceed,
  };

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}
```

---

## 3. COMPONENT IMPLEMENTATION

### Main Wizard Component

**File: `src/components/JobWizard/JobWizard.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WizardProvider, useWizard } from './context/WizardContext';
import ProgressIndicator from './components/ProgressIndicator';
import WizardFooter from './components/WizardFooter';
import SuccessModal from './components/SuccessModal';

// Step Components
import Step1CustomerSelect from './steps/Step1CustomerSelect';
import Step2JobDetails from './steps/Step2JobDetails';
import Step3Services from './steps/Step3Services';
import Step4Review from './steps/Step4Review';
import Step5Schedule from './steps/Step5Schedule';

interface JobWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { id: 0, label: 'Customer', component: Step1CustomerSelect },
  { id: 1, label: 'Details', component: Step2JobDetails },
  { id: 2, label: 'Services', component: Step3Services },
  { id: 3, label: 'Review', component: Step4Review },
  { id: 4, label: 'Schedule', component: Step5Schedule },
];

function JobWizardContent({ onClose }: { onClose: () => void }) {
  const { currentStep, isDirty } = useWizard();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const CurrentStepComponent = STEPS[currentStep].component;

  const handleClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isDirty]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      >
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[900px] h-[90vh] max-h-[800px] bg-white
                     dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col
                     md:mx-4 mx-0 md:rounded-xl rounded-none md:h-[90vh] h-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wizard-title"
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-lg bg-gray-100
                       dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                       transition-colors flex items-center justify-center group"
            aria-label="Close wizard"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900
                         dark:group-hover:text-gray-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Progress Indicator */}
          <ProgressIndicator steps={STEPS} />

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6 md:p-8"
              >
                <CurrentStepComponent />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <WizardFooter onComplete={() => setShowSuccess(true)} />
        </motion.div>
      </motion.div>

      {/* Close Confirmation Dialog */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50
                        backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Discard Changes?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              You have unsaved changes. Are you sure you want to close the wizard? All
              progress will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="h-10 px-4 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-700 font-medium
                           transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={handleConfirmClose}
                className="h-10 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white
                           font-medium transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && <SuccessModal />}
    </>
  );
}

export default function JobWizard({ isOpen, onClose }: JobWizardProps) {
  if (!isOpen) return null;

  return (
    <WizardProvider>
      <JobWizardContent onClose={onClose} />
    </WizardProvider>
  );
}
```

### Step 1: Customer Selection

**File: `src/components/JobWizard/steps/Step1CustomerSelect.tsx`**

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useWizard } from '../context/WizardContext';
import { supabase } from '@/lib/supabase';
import { Customer } from '../context/WizardContext';
import CustomerCard from '../components/CustomerCard';
import CreateCustomerModal from '../components/CreateCustomerModal';

export default function Step1CustomerSelect() {
  const { formData, dispatch } = useWizard();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleSelectCustomer = (customer: Customer) => {
    dispatch({ type: 'SET_CUSTOMER', payload: customer });
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers([newCustomer, ...customers]);
    dispatch({ type: 'SET_CUSTOMER', payload: newCustomer });
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
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
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 text-sm border border-gray-300 dark:border-gray-600
                     rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     placeholder-gray-500 focus:ring-2 focus:ring-blue-500
                     focus:border-blue-500 transition-shadow"
          aria-label="Search customers"
        />
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {searchQuery ? 'Search Results' : 'Recent Customers'}
          </h3>

          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isSelected={formData.customer?.id === customer.id}
              onSelect={handleSelectCustomer}
            />
          ))}
        </div>
      ) : searchQuery ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No customers found matching "{searchQuery}"
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex
                          items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7
                20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002
                0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2
                2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No customers yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
            Create your first customer below to start tracking jobs and building your
            business.
          </p>
        </div>
      )}

      {/* Create New Customer Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full p-6 rounded-lg border-2 border-dashed border-gray-300
                   dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-400
                   hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex
                          items-center justify-center group-hover:scale-110 transition-transform">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            Create New Customer
          </span>
        </div>
      </button>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <CreateCustomerModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCustomerCreated={handleCustomerCreated}
        />
      )}
    </div>
  );
}
```

---

## 4. VALIDATION SYSTEM

**File: `src/components/JobWizard/hooks/useFormValidation.ts`**

```tsx
import { z } from 'zod';
import { useMemo } from 'react';

// Validation Schemas
const customerSchema = z.object({
  id: z.string().min(1, 'Customer is required'),
  name: z.string().min(1, 'Customer name is required'),
});

const jobDetailsSchema = z.object({
  jobTitle: z
    .string()
    .min(3, 'Job title must be at least 3 characters')
    .max(100, 'Job title cannot exceed 100 characters'),
  address: z.string().min(5, 'Please enter a valid address'),
  city: z.string().min(2, 'Please enter a valid city'),
  state: z.string().length(2, 'Please select a state'),
  zip: z.string().regex(/^\d{5}$/, 'ZIP code must be 5 digits'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  requestedStartDate: z.string().optional(),
});

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be greater than 0'),
});

const servicesSchema = z.array(serviceSchema).min(1, 'At least one service is required');

const scheduleSchema = z
  .object({
    crewId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    estimatedHours: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

export function useFormValidation() {
  const validateStep = useMemo(
    () => (step: number, formData: any): { isValid: boolean; errors: Record<string, string> } => {
      try {
        switch (step) {
          case 0: // Customer
            customerSchema.parse({ id: formData.customer?.id, name: formData.customer?.name });
            return { isValid: true, errors: {} };

          case 1: // Job Details
            jobDetailsSchema.parse({
              jobTitle: formData.jobTitle,
              address: formData.address,
              city: formData.city,
              state: formData.state,
              zip: formData.zip,
              description: formData.description,
              priority: formData.priority,
              requestedStartDate: formData.requestedStartDate,
            });
            return { isValid: true, errors: {} };

          case 2: // Services
            servicesSchema.parse(formData.services);
            return { isValid: true, errors: {} };

          case 3: // Review
            return { isValid: true, errors: {} };

          case 4: // Schedule
            scheduleSchema.parse({
              crewId: formData.crewId,
              startDate: formData.startDate,
              endDate: formData.endDate,
              estimatedHours: formData.estimatedHours,
            });
            return { isValid: true, errors: {} };

          default:
            return { isValid: false, errors: { general: 'Invalid step' } };
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            const path = err.path.join('.');
            errors[path] = err.message;
          });
          return { isValid: false, errors };
        }
        return { isValid: false, errors: { general: 'Validation failed' } };
      }
    },
    []
  );

  const validateField = useMemo(
    () => (fieldName: string, value: any, schema: z.ZodSchema): string | null => {
      try {
        schema.parse(value);
        return null;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.errors[0]?.message || 'Invalid value';
        }
        return 'Validation failed';
      }
    },
    []
  );

  return { validateStep, validateField };
}
```

---

## 5. API INTEGRATION

**File: `src/components/JobWizard/hooks/useJobCreation.ts`**

```tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useWizard } from '../context/WizardContext';
import { useAuth } from '@/hooks/useAuth';

export function useJobCreation() {
  const { formData, dispatch } = useWizard();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const createJob = async (skipScheduling: boolean = false) => {
    try {
      dispatch({ type: 'SET_CREATING', payload: true });
      setError(null);

      // Step 1: Create the job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          customer_id: formData.customer!.id,
          title: formData.jobTitle,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          description: formData.description,
          priority: formData.priority,
          requested_start_date: formData.requestedStartDate || null,
          status: skipScheduling ? 'quote' : 'scheduled',
          subtotal: formData.subtotal,
          tax: formData.tax,
          total: formData.total,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Step 2: Add services
      const servicesData = formData.services.map((service) => ({
        job_id: job.id,
        name: service.name,
        description: service.description,
        quantity: service.quantity,
        unit: service.unit,
        unit_price: service.unitPrice,
        total: service.total,
      }));

      const { error: servicesError } = await supabase
        .from('job_services')
        .insert(servicesData);

      if (servicesError) throw servicesError;

      // Step 3: Add schedule if provided
      if (!skipScheduling && formData.crewId) {
        const { error: scheduleError } = await supabase.from('job_schedules').insert({
          job_id: job.id,
          crew_id: formData.crewId,
          start_date: formData.startDate,
          end_date: formData.endDate,
          estimated_hours: formData.estimatedHours,
        });

        if (scheduleError) throw scheduleError;
      }

      return job;
    } catch (err: any) {
      console.error('Error creating job:', err);
      setError(err.message || 'Failed to create job');
      throw err;
    } finally {
      dispatch({ type: 'SET_CREATING', payload: false });
    }
  };

  return { createJob, error };
}
```

---

## 6. TESTING STRATEGY

### Unit Tests Example

**File: `src/components/JobWizard/__tests__/WizardContext.test.tsx`**

```tsx
import { renderHook, act } from '@testing-library/react';
import { WizardProvider, useWizard } from '../context/WizardContext';
import { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <WizardProvider>{children}</WizardProvider>
);

describe('WizardContext', () => {
  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });

    expect(result.current.currentStep).toBe(0);
    expect(result.current.formData.customer).toBeNull();
    expect(result.current.formData.services).toEqual([]);
  });

  test('updates customer correctly', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });

    const mockCustomer = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    };

    act(() => {
      result.current.dispatch({ type: 'SET_CUSTOMER', payload: mockCustomer });
    });

    expect(result.current.formData.customer).toEqual(mockCustomer);
    expect(result.current.formData.address).toBe('123 Main St');
    expect(result.current.isDirty).toBe(true);
  });

  test('adds service and calculates totals', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });

    const mockService = {
      name: 'Paver Patio',
      quantity: 360,
      unit: 'sf',
      unitPrice: 85,
      total: 30600,
    };

    act(() => {
      result.current.dispatch({ type: 'ADD_SERVICE', payload: mockService });
    });

    expect(result.current.formData.services).toHaveLength(1);
    expect(result.current.formData.subtotal).toBe(30600);
    expect(result.current.formData.tax).toBeCloseTo(1989, 0);
    expect(result.current.formData.total).toBeCloseTo(32589, 0);
  });

  test('canProceed returns false when customer not selected', () => {
    const { result } = renderHook(() => useWizard(), { wrapper });

    expect(result.current.canProceed()).toBe(false);
  });
});
```

---

## 7. PERFORMANCE OPTIMIZATION

### Code Splitting

```tsx
// Lazy load heavy components
const AIChat = lazy(() => import('./components/AIChat'));
const QuickCalculator = lazy(() => import('./components/QuickCalculator'));

// Use with Suspense
<Suspense fallback={<LoadingSkeleton />}>
  <AIChat />
</Suspense>
```

### Memoization

```tsx
// Memoize expensive calculations
const totalEstimate = useMemo(() => {
  return services.reduce((sum, service) => sum + service.total, 0);
}, [services]);

// Memoize filtered lists
const filteredCustomers = useMemo(() => {
  return customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [customers, searchQuery]);
```

### Virtual Scrolling (for large lists)

```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={500}
  itemCount={customers.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <CustomerCard customer={customers[index]} />
    </div>
  )}
</FixedSizeList>
```

---

This implementation guide provides a solid foundation for building the Job Creation Wizard with production-ready code, comprehensive testing, and performance optimization strategies.
