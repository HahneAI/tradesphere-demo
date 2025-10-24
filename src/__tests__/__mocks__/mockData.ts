/**
 * Mock Data Factories
 *
 * Factory functions for generating test data
 * Provides realistic mock data for customers, jobs, services, etc.
 */

import type { CustomerProfile } from '../../types/customer';
import type { Job, JobService, CreateJobInput, CreateJobServiceInput } from '../../types/crm';
import type { ServiceLineItem, JobDetailsData, ScheduleData } from '../../types/job-wizard';

// ===== MOCK CUSTOMERS =====

export const mockCustomers: CustomerProfile[] = [
  {
    id: 'customer-1',
    company_id: 'company-1',
    customer_name: 'Sarah Johnson',
    customer_email: 'sarah.johnson@example.com',
    customer_phone: '(555) 123-4567',
    customer_address: '123 Main St, Springfield, IL 62701',
    customer_notes: 'Prefers morning appointments',
    status: 'active',
    lifecycle_stage: 'customer',
    tags: ['residential', 'patio'],
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    created_by_user_id: 'user-1',
    created_by_user_name: 'John Doe'
  },
  {
    id: 'customer-2',
    company_id: 'company-1',
    customer_name: 'Mike Thompson',
    customer_email: 'mike.t@example.com',
    customer_phone: '(555) 234-5678',
    customer_address: '456 Oak Ave, Springfield, IL 62702',
    customer_notes: null,
    status: 'active',
    lifecycle_stage: 'lead',
    tags: ['commercial'],
    created_at: '2025-01-10T14:30:00Z',
    updated_at: '2025-01-10T14:30:00Z',
    created_by_user_id: 'user-1',
    created_by_user_name: 'John Doe'
  },
  {
    id: 'customer-3',
    company_id: 'company-1',
    customer_name: 'Emily Davis',
    customer_email: 'emily.davis@example.com',
    customer_phone: '(555) 345-6789',
    customer_address: '789 Elm St, Springfield, IL 62703',
    customer_notes: 'Large backyard project',
    status: 'active',
    lifecycle_stage: 'prospect',
    tags: ['residential', 'patio', 'driveway'],
    created_at: '2025-01-20T09:15:00Z',
    updated_at: '2025-01-20T09:15:00Z',
    created_by_user_id: 'user-1',
    created_by_user_name: 'John Doe'
  }
];

// ===== MOCK JOBS =====

export const mockJobs: Job[] = [
  {
    id: 'job-1',
    company_id: 'company-1',
    customer_id: 'customer-1',
    job_number: 'JOB-2025-0001',
    title: 'Backyard Paver Patio',
    description: '360 sq ft paver patio installation with herringbone pattern',
    status: 'quote',
    service_address: '123 Main St',
    service_city: 'Springfield',
    service_state: 'IL',
    service_zip: '62701',
    service_location_notes: 'Access through side gate',
    requested_start_date: '2025-02-01',
    scheduled_start_date: null,
    scheduled_end_date: null,
    estimated_total: 30600.00,
    labor_cost: 12000.00,
    material_cost: 15000.00,
    actual_total: null,
    quote_valid_until: '2025-02-15',
    priority: 5,
    tags: ['patio', 'residential'],
    metadata: { created_via: 'wizard' },
    created_at: '2025-01-22T10:00:00Z',
    updated_at: '2025-01-22T10:00:00Z',
    created_by_user_id: 'user-1',
    created_by_user_name: 'John Doe'
  }
];

// ===== MOCK JOB SERVICES =====

export const mockJobServices: JobService[] = [
  {
    id: 'service-1',
    job_id: 'job-1',
    service_config_id: 'config-1',
    service_name: 'Paver Patio Installation',
    service_description: '360 sq ft herringbone pattern patio',
    quantity: 1,
    unit_price: 85.00,
    total_price: 30600.00,
    calculation_data: {
      tier1Results: {
        baseHours: 24,
        adjustedHours: 28,
        totalManHours: 32,
        totalDays: 4,
        breakdown: ['Excavation: 8 hours', 'Base prep: 12 hours', 'Paver install: 12 hours']
      },
      tier2Results: {
        laborCost: 12000,
        materialCostBase: 14000,
        materialWasteCost: 1000,
        totalMaterialCost: 15000,
        equipmentCost: 2000,
        obstacleCost: 0,
        subtotal: 29000,
        profit: 1600,
        total: 30600,
        pricePerSqft: 85
      },
      sqft: 360
    },
    pricing_variables: {
      paverPatio: {
        siteAccess: {
          accessDifficulty: 'standard',
          obstacleRemoval: 'none'
        },
        materials: {
          paverStyle: 'herringbone',
          cuttingComplexity: 'standard',
          useMaterialsDatabase: true
        },
        labor: {
          teamSize: 'standard'
        },
        complexity: {
          overallComplexity: 5
        }
      }
    },
    notes: null,
    metadata: { source: 'quick-calculator' },
    created_at: '2025-01-22T10:00:00Z',
    updated_at: '2025-01-22T10:00:00Z',
    added_by_user_id: 'user-1'
  }
];

// ===== MOCK CREWS =====

export const mockCrews = [
  {
    id: 'crew-1',
    company_id: 'company-1',
    crew_name: 'Alpha Team',
    crew_code: 'ALPHA',
    color_code: '#3B82F6',
    is_active: true,
    crew_lead_user_id: 'user-2',
    crew_size: 4,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'crew-2',
    company_id: 'company-1',
    crew_name: 'Bravo Team',
    crew_code: 'BRAVO',
    color_code: '#10B981',
    is_active: true,
    crew_lead_user_id: 'user-3',
    crew_size: 3,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

// ===== MOCK JOB ASSIGNMENTS =====

export const mockJobAssignments = [
  {
    id: 'assignment-1',
    job_id: 'job-1',
    crew_id: 'crew-1',
    scheduled_start: '2025-02-01T08:00:00Z',
    scheduled_end: '2025-02-05T17:00:00Z',
    status: 'scheduled',
    assignment_notes: 'First major project of the month',
    work_description: 'Complete paver patio installation',
    estimated_hours: 32,
    actual_hours: null,
    completion_percentage: 0,
    metadata: {},
    created_at: '2025-01-22T10:00:00Z',
    updated_at: '2025-01-22T10:00:00Z',
    assigned_by_user_id: 'user-1'
  }
];

// ===== FACTORY FUNCTIONS =====

/**
 * Create mock customer with optional overrides
 */
export const createMockCustomer = (overrides: Partial<CustomerProfile> = {}): CustomerProfile => {
  return {
    id: `customer-${Date.now()}-${Math.random()}`,
    company_id: 'company-1',
    customer_name: 'Test Customer',
    customer_email: 'test@example.com',
    customer_phone: '(555) 000-0000',
    customer_address: '123 Test St, Test City, TS 12345',
    customer_notes: null,
    status: 'active',
    lifecycle_stage: 'lead',
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by_user_id: 'user-1',
    created_by_user_name: 'Test User',
    ...overrides
  };
};

/**
 * Create mock job with optional overrides
 */
export const createMockJob = (overrides: Partial<Job> = {}): Job => {
  return {
    id: `job-${Date.now()}-${Math.random()}`,
    company_id: 'company-1',
    customer_id: 'customer-1',
    job_number: `JOB-2025-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
    title: 'Test Job',
    description: 'Test job description',
    status: 'quote',
    service_address: '123 Test St',
    service_city: 'Test City',
    service_state: 'TS',
    service_zip: '12345',
    service_location_notes: null,
    requested_start_date: null,
    scheduled_start_date: null,
    scheduled_end_date: null,
    estimated_total: 10000.00,
    labor_cost: 4000.00,
    material_cost: 5000.00,
    actual_total: null,
    quote_valid_until: null,
    priority: 5,
    tags: [],
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by_user_id: 'user-1',
    created_by_user_name: 'Test User',
    ...overrides
  };
};

/**
 * Create mock service line item
 */
export const createMockServiceLineItem = (overrides: Partial<ServiceLineItem> = {}): ServiceLineItem => {
  return {
    tempId: `temp-${Date.now()}-${Math.random()}`,
    serviceConfigId: 'config-1',
    serviceName: 'Test Service',
    serviceDescription: 'Test service description',
    quantity: 1,
    unitPrice: 100.00,
    totalPrice: 100.00,
    source: 'manual',
    calculation: {
      calculationMethod: 'manual-entry',
      calculationData: {
        tier2Results: {
          laborCost: 40,
          materialCostBase: 50,
          materialWasteCost: 5,
          totalMaterialCost: 55,
          equipmentCost: 5,
          obstacleCost: 0,
          subtotal: 100,
          profit: 0,
          total: 100,
          pricePerSqft: 10
        }
      },
      pricingVariables: {},
      squareFootage: 10,
      laborHours: 1,
      laborCost: 40,
      materialCost: 55,
      confidence: 1.0,
      calculatedAt: new Date().toISOString()
    },
    notes: null,
    isOptional: false,
    displayOrder: 0,
    ...overrides
  };
};

/**
 * Create mock job details data
 */
export const createMockJobDetails = (overrides: Partial<JobDetailsData> = {}): JobDetailsData => {
  return {
    title: 'Test Job',
    description: 'Test job description',
    priority: 'normal',
    priorityNumeric: 5,
    location: {
      serviceAddress: '123 Test St',
      serviceCity: 'Test City',
      serviceState: 'TS',
      serviceZip: '12345',
      locationNotes: null,
      useCustomerAddress: false,
      coordinates: null
    },
    scheduling: {
      requestedStartDate: null,
      scheduledStartDate: null,
      scheduledEndDate: null,
      quoteValidUntil: null,
      schedulingNotes: null,
      estimatedDurationDays: null
    },
    tags: [],
    customFields: {},
    ...overrides
  };
};

/**
 * Create mock schedule data
 */
export const createMockScheduleData = (overrides: Partial<ScheduleData> = {}): ScheduleData => {
  return {
    scheduleNow: false,
    crewAssignments: [],
    schedulingNotes: null,
    ...overrides
  };
};

/**
 * Create complete mock wizard data
 */
export const createMockWizardData = () => {
  return {
    companyId: 'company-1',
    userId: 'user-1',
    customer: createMockCustomer(),
    jobDetails: createMockJobDetails(),
    services: [createMockServiceLineItem()],
    schedule: null
  };
};
