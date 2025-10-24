# Jobs Feature - UI Patterns & User Flow Research

**Research Date:** October 24, 2025  
**Purpose:** Standard UI/UX patterns for job management in service business CRM applications

---

## 3 PRIMARY VIEW PATTERNS

### 1. Kanban Pipeline View (Visual Status Tracking)

**Layout:**
- **Columns** = Job statuses (Quote → Approved → Scheduled → In Progress → Completed → Invoiced)
- **Cards** = Individual jobs with key info visible
- **Drag-drop** between columns = instant status updates

**Card Content:**
- Customer name
- Job number
- Estimated value
- Priority indicator
- Crew assigned (avatar/icon)
- Service type icons

**Interactions:**
- Quick actions on cards: edit, email, view details, add notes
- Hover reveals additional details
- Click card opens detail modal

**Filtering:**
- By crew assigned
- Date range (created, scheduled)
- Priority level
- Customer
- Service type

**Visual Cues:**
- Color-coded priorities (red=urgent, yellow=high, blue=normal)
- Overdue indicators (red border/badge)
- Crew member avatars
- Status-specific column colors

---

#### **Technical Implementation: Kanban View**

**Component Structure:**
```
src/components/jobs/
  JobsKanbanView.tsx          // Main kanban board container
  KanbanColumn.tsx             // Single status column
  JobCard.tsx                  // Job card component
  JobCardQuickActions.tsx      // Card action buttons
```

**Database Queries:**
```typescript
// Primary query - fetch all jobs with relationships
const { data: jobs } = await supabase
  .from('ops_jobs')
  .select(`
    *,
    customer:crm_customers(id, customer_name, customer_email),
    services:ops_job_services(id, service_name, total_price),
    assignments:ops_job_assignments(
      crew_id,
      crew:ops_crews(crew_name, color_code, crew_lead_user_id)
    )
  `)
  .eq('company_id', companyId)
  .order('created_at', { ascending: false });
```

**Status Column Mapping:**
```typescript
// Maps ops_jobs.status enum to UI columns
const KANBAN_COLUMNS = [
  { id: 'quote', label: 'Quote', color: '#94A3B8' },
  { id: 'approved', label: 'Approved', color: '#3B82F6' },
  { id: 'scheduled', label: 'Scheduled', color: '#8B5CF6' },
  { id: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { id: 'completed', label: 'Completed', color: '#10B981' },
  { id: 'invoiced', label: 'Invoiced', color: '#059669' },
] as const;
```

**Drag-Drop Status Update:**
```typescript
// Update ops_jobs.status and create audit event
const handleJobDrop = async (jobId: string, newStatus: JobStatus) => {
  const { error } = await supabase
    .from('ops_jobs')
    .update({
      status: newStatus,
      updated_by_user_id: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .eq('company_id', companyId);

  // Log status change in activity timeline
  await logJobStatusChange(jobId, newStatus);
};
```

**Key Props Pattern:**
```typescript
interface JobCardProps {
  job: Job;
  customer: Customer;
  services: JobService[];
  assignment?: JobAssignment;
  onEdit: (jobId: string) => void;
  onViewDetails: (jobId: string) => void;
}
```

---

### 2. List/Table View (Data-Dense, Sortable)

**Columns:**
- Job Number
- Customer Name
- Status (badge)
- Services (comma-separated or count)
- Estimated Value
- Scheduled Start Date
- Crew Assigned
- Actions (dropdown menu)

**Features:**
- **Column headers**: click to sort ascending/descending
- **Quick filters**: dropdown on each column header
- **Global search bar**: searches across all fields
- **Inline actions**: quick edit, duplicate, delete, status change
- **Multi-select**: checkboxes for bulk operations
- **Saved views**: custom filter/sort combinations
- **Pagination**: 20-50 rows per page with "Load More"

**Column Filtering:**
- Status: multi-select checkboxes
- Date range: calendar picker
- Value: min/max inputs
- Text fields: "contains", "starts with", "equals"

---

#### **Technical Implementation: List/Table View**

**Component Structure:**
```
src/components/jobs/
  JobsTableView.tsx           // Main table container
  JobsTableHeader.tsx         // Sortable column headers
  JobsTableRow.tsx            // Single job row
  JobsTableFilters.tsx        // Filter UI controls
  JobsTableActions.tsx        // Row action dropdown
```

**Database Query with Sorting:**
```typescript
// Dynamic sorting based on column clicked
const { data: jobs } = await supabase
  .from('ops_jobs')
  .select(`
    *,
    customer:crm_customers(customer_name, customer_email),
    services:ops_job_services(service_name, total_price),
    assignments:ops_job_assignments(
      crew:ops_crews(crew_name)
    )
  `)
  .eq('company_id', companyId)
  .order(sortColumn, { ascending: sortDirection === 'asc' })
  .range(offset, offset + limit);
```

**Search Implementation:**
```typescript
// Full-text search across multiple fields
const searchJobs = async (searchTerm: string) => {
  const { data } = await supabase
    .from('ops_jobs')
    .select('*, customer:crm_customers(*)')
    .eq('company_id', companyId)
    .or(`
      job_number.ilike.%${searchTerm}%,
      title.ilike.%${searchTerm}%,
      service_address.ilike.%${searchTerm}%,
      customer.customer_name.ilike.%${searchTerm}%
    `);
  return data;
};
```

**Filter State Pattern:**
```typescript
interface JobsFilter {
  statuses: JobStatus[];
  dateRange: { start: Date; end: Date } | null;
  customerIds: string[];
  crewIds: string[];
  minValue: number | null;
  maxValue: number | null;
  priorities: number[];
}
```

**Bulk Operations:**
```typescript
// Multi-select pattern for bulk status changes
const bulkUpdateStatus = async (jobIds: string[], newStatus: JobStatus) => {
  const { error } = await supabase
    .from('ops_jobs')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .in('id', jobIds)
    .eq('company_id', companyId);
};
```

---

### 3. Calendar/Schedule View (Timeline-Based)

**Layout:**
- **Horizontal axis**: dates/weeks
- **Vertical axis**: crews or jobs
- **Job blocks**: visual blocks showing scheduled work
- **Drag-to-reschedule**: move blocks between dates/crews
- **Resize blocks**: adjust job duration

**Features:**
- Color coding by status, service type, or priority
- Conflict detection (overlapping assignments)
- Crew capacity indicators
- Visual warnings for scheduling conflicts
- Crew utilization percentage

**Note:** *Aligns with your existing crew assignments & job_assignments tables*

---

#### **Technical Implementation: Calendar/Schedule View**

**Component Structure:**
```
src/components/jobs/
  JobsCalendarView.tsx        // Calendar container
  CalendarTimeline.tsx        // Week/month timeline
  CrewRow.tsx                 // Single crew schedule row
  JobBlock.tsx                // Draggable job block
  ConflictIndicator.tsx       // Visual overlap warning
```

**Database Query for Schedule:**
```typescript
// Fetch assignments with crew and job details
const { data: assignments } = await supabase
  .from('ops_job_assignments')
  .select(`
    *,
    job:ops_jobs(
      job_number,
      title,
      status,
      estimated_total,
      customer:crm_customers(customer_name)
    ),
    crew:ops_crews(
      crew_name,
      color_code,
      max_capacity,
      crew_lead:users(name)
    )
  `)
  .gte('scheduled_start', startDate)
  .lte('scheduled_end', endDate)
  .eq('job.company_id', companyId)
  .order('scheduled_start');
```

**Conflict Detection Logic:**
```typescript
// Check for overlapping crew assignments
const detectConflicts = (assignments: JobAssignment[]) => {
  const conflicts: ConflictPair[] = [];

  assignments.forEach((a, i) => {
    assignments.slice(i + 1).forEach((b) => {
      if (
        a.crew_id === b.crew_id &&
        a.scheduled_start < b.scheduled_end &&
        b.scheduled_start < a.scheduled_end
      ) {
        conflicts.push({ assignment1: a, assignment2: b });
      }
    });
  });

  return conflicts;
};
```

**Drag-to-Reschedule Handler:**
```typescript
// Update assignment dates and crew
const handleJobDrag = async (
  assignmentId: string,
  newStart: Date,
  newEnd: Date,
  newCrewId?: string
) => {
  const { error } = await supabase
    .from('ops_job_assignments')
    .update({
      scheduled_start: newStart.toISOString(),
      scheduled_end: newEnd.toISOString(),
      crew_id: newCrewId || undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', assignmentId);

  // Re-check conflicts after update
  await checkConflicts();
};
```

**Crew Capacity Tracking:**
```typescript
// Calculate crew utilization percentage
const getCrewUtilization = (crewId: string, date: Date) => {
  const assignmentsOnDate = assignments.filter(
    a => a.crew_id === crewId && isDateInRange(date, a.scheduled_start, a.scheduled_end)
  );

  const totalHours = assignmentsOnDate.reduce((sum, a) => sum + (a.estimated_hours || 8), 0);
  const capacity = crew.max_capacity * 8; // 8 hours per crew member

  return (totalHours / capacity) * 100;
};
```

---

## JOB CREATION FLOW (Multi-Step Wizard)

### Standard 4-5 Step Pattern

#### **Step 1: Customer Selection**
```
┌─────────────────────────────────────┐
│  Select Customer                    │
├─────────────────────────────────────┤
│  [Search existing customers...]     │
│                                     │
│  Recent Customers:                  │
│  • John Smith - 123 Main St        │
│  • Jane Doe - 456 Oak Ave          │
│                                     │
│  [+ Create New Customer]            │
└─────────────────────────────────────┘
```

**Behavior:**
- Search existing customers (autocomplete)
- "Create New Customer" button triggers customer modal inline
- Customer modal opens without losing job creation progress
- After customer created → auto-selected and advances to Step 2
- Shows customer history (past jobs, lifetime value)

---

**Technical Implementation: Step 1**

**Component:**
```
src/components/jobs/wizard/CustomerSelectionStep.tsx
```

**Customer Search Query:**
```typescript
// Autocomplete search with job history
const searchCustomers = async (term: string) => {
  const { data } = await supabase
    .from('crm_customers')
    .select(`
      *,
      jobs:ops_jobs(count)
    `)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .or(`
      customer_name.ilike.%${term}%,
      customer_email.ilike.%${term}%,
      customer_phone.ilike.%${term}%
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return data;
};
```

**Recent Customers Query:**
```typescript
// Show 5 most recent customers with jobs
const { data: recentCustomers } = await supabase
  .from('crm_customers')
  .select('*, jobs:ops_jobs(created_at)')
  .eq('company_id', companyId)
  .eq('status', 'active')
  .order('jobs.created_at', { ascending: false })
  .limit(5);
```

**Wizard State Pattern:**
```typescript
interface JobWizardState {
  step: 1 | 2 | 3 | 4 | 5;
  customer: Customer | null;
  jobDetails: Partial<Job>;
  services: JobService[];
  schedule?: JobAssignment;
}
```

**Customer Creation Integration:**
```typescript
// Uses existing customerManagementService
import { createCustomer } from '@/services/customerManagementService';

const handleCreateCustomer = async (customerData) => {
  const newCustomer = await createCustomer(supabase, {
    company_id: companyId,
    created_by_user_id: userId,
    ...customerData
  });

  // Auto-select and advance to Step 2
  setWizardState({ ...state, customer: newCustomer, step: 2 });
};
```

---

#### **Step 2: Job Details**
```
┌─────────────────────────────────────┐
│  Job Information                    │
├─────────────────────────────────────┤
│  Job Title: [Auto-generated or     │
│              manual input]          │
│                                     │
│  Service Address:                   │
│  [Pre-filled from customer, edit-  │
│   able]                            │
│                                     │
│  City: [____] State: [__] Zip: [_] │
│                                     │
│  Description:                       │
│  [Text area for notes]             │
│                                     │
│  Priority: ( ) Low (•) Normal      │
│            ( ) High ( ) Urgent     │
│                                     │
│  Requested Start: [Calendar picker]│
└─────────────────────────────────────┘
```

**Auto-population:**
- Job number: auto-generated (JOB-2025-001)
- Service address: pre-filled from customer
- Contact info: inherited from customer

---

**Technical Implementation: Step 2**

**Component:**
```
src/components/jobs/wizard/JobDetailsStep.tsx
```

**Auto-generate Job Number:**
```typescript
// Generate sequential job number
const generateJobNumber = async (companyId: string) => {
  const year = new Date().getFullYear();
  const prefix = `JOB-${year}-`;

  const { count } = await supabase
    .from('ops_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .like('job_number', `${prefix}%`);

  const nextNumber = (count || 0) + 1;
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};
```

**Pre-populate Address from Customer:**
```typescript
// Auto-fill service address when customer selected
useEffect(() => {
  if (wizardState.customer) {
    setJobDetails({
      ...jobDetails,
      service_address: wizardState.customer.customer_address,
      // Parse address into components if needed
      service_city: extractCity(wizardState.customer.customer_address),
      service_state: extractState(wizardState.customer.customer_address),
      service_zip: extractZip(wizardState.customer.customer_address)
    });
  }
}, [wizardState.customer]);
```

**Form Validation:**
```typescript
const validateJobDetails = (details: Partial<Job>): boolean => {
  return !!(
    details.title &&
    details.service_address &&
    details.priority !== undefined
  );
};
```

**Priority Mapping:**
```typescript
// Map UI labels to database integer values
const PRIORITY_LEVELS = [
  { label: 'Low', value: 0, color: '#94A3B8' },
  { label: 'Normal', value: 5, color: '#3B82F6' },
  { label: 'High', value: 8, color: '#F59E0B' },
  { label: 'Urgent', value: 10, color: '#EF4444' }
] as const;
```

---

#### **Step 3: Services & Pricing**
```
┌─────────────────────────────────────┐
│  Add Services                       │
├─────────────────────────────────────┤
│  Choose Input Method:               │
│  [Use AI Chat] [Quick Calculator]   │
│                                     │
│  Selected Services:                 │
│  ┌──────────────────────────────┐  │
│  │ Service    Qty  Price   Total│  │
│  ├──────────────────────────────┤  │
│  │ Paver Patio 360  $85/sf $30.6k│ │
│  │ Excavation  50   $150   $7.5k│  │
│  └──────────────────────────────┘  │
│                                     │
│  Estimated Total: $38,100           │
│  [+ Add Service Manually]           │
└─────────────────────────────────────┘
```

**Two Input Options:**

**Option A: AI Chat Interface**
- Button opens embedded chat UI
- Conversational quote building
- Results auto-populate service line items
- "Complete & Continue" returns to wizard

**Option B: Quick Calculator**
- Manual service dropdown selection
- Quantity inputs
- Real-time price calculations
- Add/remove services

**Service Line Items Table:**
- Service name (with description tooltip)
- Quantity input
- Unit price (auto-calculated)
- Line total
- Remove button per row
- Real-time total updates

---

**Technical Implementation: Step 3**

**Component:**
```
src/components/jobs/wizard/ServicesStep.tsx
```

**Integration with Existing Chat Interface:**
```typescript
// Embed ChatInterface component from existing system
import { ChatInterface } from '@/components/ChatInterface';

const handleChatComplete = (chatResults: any) => {
  // Extract services from AI chat session
  const services = chatResults.services.map(svc => ({
    service_config_id: svc.serviceConfigId,
    service_name: svc.serviceName,
    service_description: svc.description,
    quantity: svc.quantity,
    unit_price: svc.unitPrice,
    total_price: svc.totalPrice,
    calculation_data: svc.calculationData,
    pricing_variables: svc.pricingVariables
  }));

  // Update wizard state
  setWizardState({ ...state, services, step: 4 });
};

// Render chat in modal/embedded mode
{showChat && (
  <ChatInterface
    mode="embedded"
    customerId={wizardState.customer.id}
    onComplete={handleChatComplete}
    onCancel={() => setShowChat(false)}
  />
)}
```

**Integration with Quick Calculator:**
```typescript
// Use existing MasterPricingEngine
import { MasterPricingEngine } from '@/pricing-system/core/calculations/master-pricing-engine';

const handleCalculatorAdd = async (serviceName: string, variables: any) => {
  const result = await MasterPricingEngine.calculateService({
    serviceName,
    companyId,
    variables,
    includeBreakdown: true
  });

  const newService: JobService = {
    service_config_id: result.serviceConfigId,
    service_name: serviceName,
    quantity: result.quantity,
    unit_price: result.unitPrice,
    total_price: result.totalPrice,
    calculation_data: result.breakdown,
    pricing_variables: variables,
    added_by_user_id: userId
  };

  setWizardState({
    ...state,
    services: [...state.services, newService]
  });
};
```

**Service Line Items Management:**
```typescript
// Real-time total calculation
const estimatedTotal = useMemo(() => {
  return wizardState.services.reduce(
    (sum, svc) => sum + svc.total_price,
    0
  );
}, [wizardState.services]);

// Remove service from list
const handleRemoveService = (index: number) => {
  setWizardState({
    ...state,
    services: state.services.filter((_, i) => i !== index)
  });
};

// Update service quantity
const handleQuantityChange = (index: number, newQty: number) => {
  const updated = [...state.services];
  updated[index].quantity = newQty;
  updated[index].total_price = updated[index].unit_price * newQty;
  setWizardState({ ...state, services: updated });
};
```

**Link to Service Configs:**
```typescript
// Fetch available services for dropdown
const { data: serviceConfigs } = await supabase
  .from('svc_pricing_configs')
  .select('id, service_name, variables_config')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('service_name');
```

---

#### **Step 4: Review & Create**
```
┌─────────────────────────────────────┐
│  Review Job Details                 │
├─────────────────────────────────────┤
│  Customer: John Smith               │
│  Address: 123 Main St, City, ST    │
│  Priority: Normal                   │
│                                     │
│  Services:                          │
│  • Paver Patio (360 sf) - $30,600  │
│  • Excavation (50 hrs) - $7,500    │
│                                     │
│  Total Estimate: $38,100            │
│                                     │
│  [← Back]  [Save as Quote]          │
│            [Schedule Job →]         │
└─────────────────────────────────────┘
```

**Actions:**
- "Save as Quote" = creates job with status="quote"
- "Schedule Job" = advances to Step 5
- "Send to Customer" = generates PDF + email modal

---

**Technical Implementation: Step 4**

**Component:**
```
src/components/jobs/wizard/ReviewStep.tsx
```

**Create Job in Database:**
```typescript
const createJob = async (saveAsQuote: boolean) => {
  const jobNumber = await generateJobNumber(companyId);

  // 1. Create job record
  const { data: job, error: jobError } = await supabase
    .from('ops_jobs')
    .insert({
      company_id: companyId,
      customer_id: wizardState.customer.id,
      job_number: jobNumber,
      title: wizardState.jobDetails.title,
      description: wizardState.jobDetails.description,
      status: saveAsQuote ? 'quote' : 'approved',
      service_address: wizardState.jobDetails.service_address,
      service_city: wizardState.jobDetails.service_city,
      service_state: wizardState.jobDetails.service_state,
      service_zip: wizardState.jobDetails.service_zip,
      requested_start_date: wizardState.jobDetails.requested_start_date,
      priority: wizardState.jobDetails.priority,
      estimated_total: wizardState.services.reduce((sum, s) => sum + s.total_price, 0),
      created_by_user_id: userId,
      quote_valid_until: addDays(new Date(), 30) // 30 days from now
    })
    .select()
    .single();

  // 2. Insert service line items
  const serviceInserts = wizardState.services.map(svc => ({
    job_id: job.id,
    service_config_id: svc.service_config_id,
    service_name: svc.service_name,
    service_description: svc.service_description,
    quantity: svc.quantity,
    unit_price: svc.unit_price,
    total_price: svc.total_price,
    calculation_data: svc.calculation_data,
    pricing_variables: svc.pricing_variables,
    added_by_user_id: userId
  }));

  await supabase.from('ops_job_services').insert(serviceInserts);

  return job;
};
```

**Advance to Scheduling (Step 5):**
```typescript
const handleScheduleJob = async () => {
  const job = await createJob(false); // status='approved'
  setWizardState({ ...state, jobId: job.id, step: 5 });
};
```

---

#### **Step 5: Schedule & Assign (Optional)**
```
┌─────────────────────────────────────┐
│  Schedule Job                       │
├─────────────────────────────────────┤
│  Assign Crew:                       │
│  [Select crew dropdown...]          │
│                                     │
│  Scheduled Dates:                   │
│  Start: [Calendar picker]           │
│  End:   [Calendar picker]           │
│                                     │
│  Estimated Hours: [__]              │
│                                     │
│  ⚠ Conflict Check:                  │
│  Crew Alpha has 2 jobs on 1/25     │
│                                     │
│  [← Back]  [Create Job]             │
└─────────────────────────────────────┘
```

**Features:**
- Crew dropdown with availability indicators
- Calendar picker with conflict warnings
- Estimated hours calculation
- Creates job + assignment records simultaneously
- Conflict detection before commit

---

**Technical Implementation: Step 5**

**Component:**
```
src/components/jobs/wizard/ScheduleStep.tsx
```

**Load Available Crews:**
```typescript
const { data: crews } = await supabase
  .from('ops_crews')
  .select(`
    *,
    crew_lead:users(name),
    members:ops_crew_members(count)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('crew_name');
```

**Check Conflicts Before Scheduling:**
```typescript
const checkSchedulingConflicts = async (
  crewId: string,
  startDate: Date,
  endDate: Date
) => {
  const { data: conflicts } = await supabase
    .from('ops_job_assignments')
    .select(`
      id,
      job:ops_jobs(job_number, title)
    `)
    .eq('crew_id', crewId)
    .or(`
      and(scheduled_start.lte.${endDate.toISOString()},scheduled_end.gte.${startDate.toISOString()})
    `);

  return conflicts || [];
};
```

**Create Assignment:**
```typescript
const createAssignment = async () => {
  // Update job status to 'scheduled'
  await supabase
    .from('ops_jobs')
    .update({
      status: 'scheduled',
      scheduled_start_date: wizardState.schedule.startDate,
      scheduled_end_date: wizardState.schedule.endDate,
      updated_by_user_id: userId
    })
    .eq('id', wizardState.jobId);

  // Create assignment record
  const { error } = await supabase
    .from('ops_job_assignments')
    .insert({
      job_id: wizardState.jobId,
      crew_id: wizardState.schedule.crewId,
      scheduled_start: wizardState.schedule.startDate,
      scheduled_end: wizardState.schedule.endDate,
      estimated_hours: wizardState.schedule.estimatedHours,
      status: 'scheduled',
      assigned_by_user_id: userId
    });
};
```

**Estimate Hours from Services:**
```typescript
// Calculate estimated hours based on service labor requirements
const estimateHours = (services: JobService[]) => {
  return services.reduce((total, svc) => {
    const laborHours = svc.calculation_data?.laborHours || 0;
    return total + laborHours;
  }, 0);
};
```

---

### Progress Indicator
```
1. Customer  2. Details  3. Services  4. Review  5. Schedule
   [✓]    →    [✓]    →    [●]    →    [ ]    →    [ ]
```

**Visual Design:**
- Horizontal stepper at top of modal
- Completed steps = green checkmarks
- Current step = highlighted/bold
- Future steps = grayed out/disabled
- Can click back to previous completed steps

---

## JOB DETAIL VIEW (Modal or Side Panel)

### Header Section
```
┌─────────────────────────────────────────────────┐
│  JOB-2025-001          [Quote] [Edit] [⋮ More] │
│  John Smith - 123 Main St                       │
│  Created: Jan 15, 2025 | Updated: Jan 20, 2025 │
└─────────────────────────────────────────────────┘
```

**Header Elements:**
- Job number + Status badge (color-coded)
- Customer name (clickable → customer profile)
- Timestamps
- Quick action buttons

---

#### **Technical Implementation: Job Detail View**

**Component Structure:**
```
src/components/jobs/
  JobDetailModal.tsx          // Modal container
  JobDetailHeader.tsx         // Header with actions
  JobDetailTabs.tsx           // Tab navigation
  tabs/
    OverviewTab.tsx
    ServicesTab.tsx
    NotesTab.tsx
    ScheduleTab.tsx
    ActivityTab.tsx
    DocumentsTab.tsx
```

**Load Job with All Relationships:**
```typescript
const { data: jobDetail } = await supabase
  .from('ops_jobs')
  .select(`
    *,
    customer:crm_customers(*),
    services:ops_job_services(
      *,
      service_config:svc_pricing_configs(service_name)
    ),
    assignments:ops_job_assignments(
      *,
      crew:ops_crews(crew_name, color_code),
      assigned_by:users(name)
    ),
    notes:ops_job_notes(
      *,
      created_by:users(name)
    ),
    created_by:users(name),
    updated_by:users(name)
  `)
  .eq('id', jobId)
  .single();
```

---

### Tab Navigation
```
[Overview] [Services] [Notes] [Schedule] [Activity] [Documents]
```

#### **Tab 1: Overview**
- Job title & description
- Service address with map link
- Priority level
- Requested start date
- Quote valid until date
- Key metrics (days since created, response time)

#### **Tab 2: Services**
- Service line items table
- Quantity, unit price, total per service
- Subtotal, tax (if applicable), grand total
- Edit services button
- Add service button

#### **Tab 3: Notes**
- Timeline feed of all notes (newest first)
- Manual notes + AI-generated insights
- Filter: All / Manual / AI / Internal / Customer-facing
- Note types: general, customer_communication, schedule_change, ai_insight
- Add note quick input at top

**Technical: Notes Tab**
```typescript
// Add note to job
const addJobNote = async (noteData: {
  subject: string;
  content: string;
  note_type: string;
  is_internal: boolean;
}) => {
  const { error } = await supabase
    .from('ops_job_notes')
    .insert({
      job_id: jobId,
      ...noteData,
      created_by_user_id: userId
    });
};

// Load notes with user info
const { data: notes } = await supabase
  .from('ops_job_notes')
  .select('*, created_by:users(name, user_icon)')
  .eq('job_id', jobId)
  .order('created_at', { ascending: false });
```

#### **Tab 4: Schedule**
- Assigned crew (with avatar/name)
- Scheduled start/end dates
- Estimated hours vs actual hours
- Completion percentage
- Reassign crew button
- Edit dates button

#### **Tab 5: Activity**
- Audit log timeline
- All status changes, edits, emails sent
- User who made change + timestamp
- Before/after values for edits
- System-generated events

#### **Tab 6: Documents**
- Quote PDF (generated)
- Invoice PDF (when invoiced)
- Photos uploaded
- Attachments
- Generate document buttons

---

### Side Actions Panel
```
┌─────────────────────┐
│ Actions             │
├─────────────────────┤
│ Change Status ▼     │
│ [Assign Crew]       │
│ [Send Quote]        │
│ [Send Invoice]      │
│ [Convert to Job]    │
│ [Add Note]          │
│ [Print]             │
│ [Duplicate]         │
│ [Delete]            │
└─────────────────────┘
```

---

## KEY INTERACTION PATTERNS

### Create Job Button Placement

**Primary Location:** Top-right of jobs list view
```
[Jobs Dashboard]                    [+ Create Job]
```

**Secondary:** Empty state when no jobs exist
```
         No jobs yet
    Start by creating your first job
         [Create Job]
```

**Tertiary:** Customer detail modal
```
Customer: John Smith
Past Jobs: 3 completed
[Create Job for John Smith]
```

---

### Customer Linking Priority Flow
```
Job Creation Starts
       ↓
Step 1: Select Customer
       ↓
Customer doesn't exist?
       ↓
[Create New Customer] clicked
       ↓
Customer modal opens inline
(Job wizard stays in background)
       ↓
Customer created & saved
       ↓
Auto-selected in job wizard
       ↓
Advance to Step 2 (Job Details)
```

**Key Principle:** Customer selection is ALWAYS first step - no orphan jobs without customers.

---

### AI Chat Integration Pattern
```
Job Creation → Step 3 (Services)
       ↓
[Use AI Chat] button clicked
       ↓
Chat interface opens (embedded or modal)
       ↓
User: "360 sq ft paver patio, excavation needed"
       ↓
AI processes, asks qualifying questions
       ↓
AI generates pricing breakdown
       ↓
User confirms quote
       ↓
Services auto-populate in line items table
       ↓
Return to Step 3 with completed services
       ↓
Continue to Step 4 (Review)
```

**Alternative:** "Switch to Quick Calculator" button always visible in chat interface.

---

### Status Workflow & Validation

**Status Progression:**
```
Quote → Approved → Scheduled → In Progress → Completed → Invoiced
```

**Validation Rules:**
- Can't mark "Scheduled" without start date
- Can't mark "In Progress" without crew assignment
- Can't mark "Completed" without actual end date
- Can't mark "Invoiced" without invoice number

**Status Change Triggers:**
- Auto-emails sent on certain transitions (quote→approved = confirmation email)
- Audit log entry created
- Related records updated (crew notifications)
- Visual confirmation dialogs for destructive actions (cancel job)

---

#### **Technical Implementation: Status Management**

**Status Enum (Database):**
```sql
CREATE TYPE job_status AS ENUM (
  'quote',
  'approved',
  'scheduled',
  'in_progress',
  'completed',
  'invoiced',
  'cancelled'
);
```

**Status Validation Logic:**
```typescript
const validateStatusChange = (
  currentStatus: JobStatus,
  newStatus: JobStatus,
  job: Job
): { valid: boolean; error?: string } => {

  if (newStatus === 'scheduled' && !job.scheduled_start_date) {
    return { valid: false, error: 'Cannot schedule job without start date' };
  }

  if (newStatus === 'in_progress') {
    const hasAssignment = job.assignments?.length > 0;
    if (!hasAssignment) {
      return { valid: false, error: 'Cannot start job without crew assignment' };
    }
  }

  if (newStatus === 'completed' && !job.actual_end_date) {
    return { valid: false, error: 'Cannot complete job without actual end date' };
  }

  if (newStatus === 'invoiced' && !job.invoice_number) {
    return { valid: false, error: 'Cannot invoice job without invoice number' };
  }

  return { valid: true };
};
```

**Change Status with Audit Trail:**
```typescript
const changeJobStatus = async (
  jobId: string,
  newStatus: JobStatus,
  reason?: string
) => {
  // Update job status
  const { error } = await supabase
    .from('ops_jobs')
    .update({
      status: newStatus,
      updated_by_user_id: userId,
      updated_at: new Date().toISOString(),
      // Auto-set timestamps based on status
      ...(newStatus === 'approved' && { quote_approved_at: new Date().toISOString() }),
      ...(newStatus === 'in_progress' && { actual_start_date: new Date().toISOString() }),
      ...(newStatus === 'completed' && { actual_end_date: new Date().toISOString() }),
      ...(newStatus === 'invoiced' && { invoiced_at: new Date().toISOString() })
    })
    .eq('id', jobId);

  // Log status change in notes
  await supabase.from('ops_job_notes').insert({
    job_id: jobId,
    note_type: 'status_change',
    subject: `Status changed to ${newStatus}`,
    content: reason || `Job status updated to ${newStatus}`,
    is_ai_generated: false,
    is_internal: true,
    created_by_user_id: userId
  });
};
```

**Status Badge Component:**
```typescript
const STATUS_COLORS = {
  quote: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  approved: { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' },
  scheduled: { bg: '#EDE9FE', text: '#6D28D9', border: '#8B5CF6' },
  in_progress: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  completed: { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
  invoiced: { bg: '#D1FAE5', text: '#047857', border: '#059669' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' }
} as const;
```

---

## FILTERING & SEARCH PATTERNS

### Common Filter Options

**Status Filter (Multi-select checkboxes)**
```
☑ Quote
☑ Approved
☑ Scheduled
☐ In Progress
☐ Completed
☐ Invoiced
☐ Cancelled
```

**Date Range Filter**
```
Filter by:  [Created Date ▼]
From: [01/01/2025]  To: [01/31/2025]
```

**Customer Filter (Autocomplete)**
```
Customer: [Search customers...]
          • John Smith (3 jobs)
          • Jane Doe (1 job)
```

**Other Filters:**
- Crew assigned (multi-select)
- Priority level (low/normal/high/urgent)
- Service types included (checkboxes)
- Value range (min $_____ max $_____)

---

### Saved Filter Views

**System Views (Pre-configured):**
- All Jobs
- My Active Jobs (assigned to me)
- Pending Quotes (status=quote)
- This Week's Schedule (scheduled this week)
- Overdue Jobs (past due date)
- High Priority (priority>=high)

**Custom Views (User-created):**
- User can create custom filter combinations
- Save with name: "My Overdue High Priority"
- Shareable with team members
- Set as personal default view

**View Selector:**
```
Current View: [All Jobs ▼]
              • My Active Jobs
              • Pending Quotes
              • This Week's Schedule
              • Overdue Jobs
              ─────────────────
              • Create New View
              • Manage Views
```

---

### Global Search Bar

**Search Behavior:**
```
[🔍 Search jobs, customers, addresses...]
```

- Searches across multiple fields simultaneously
- Job number, customer name, service address, job title
- Real-time results as user types (debounced)
- Highlights matching text in results
- Can combine search with filters

**Search Operators:**
- Default: contains anywhere in field
- "quoted text" = exact phrase match
- -excluded = exclude results with term

---

## MOBILE CONSIDERATIONS

### Kanban View on Mobile
- **Horizontal scroll** for status columns
- **Vertical scroll** within each column for cards
- **Swipe left/right** between columns
- **Pinch to collapse** column to see more columns at once
- Cards show condensed info (customer name, value, due date)

### List View on Mobile
- **Table converts to cards** (stacked vertically)
- Each card shows: job #, customer, status badge, value, date
- **Tap to expand** card for more details
- **Swipe left** on card reveals quick actions (edit, delete)
- **Pull down** to refresh list

### Filters on Mobile
- **Collapsible drawer** from top or side
- Simplified filter options (most common only)
- **Apply/Clear buttons** at bottom of drawer
- Active filter count badge on filter icon

### Job Creation on Mobile
- **Streamlined to 3 steps** (vs 5 on desktop)
  1. Customer + Job Details (combined)
  2. Services & Pricing
  3. Review & Create
- **Full-screen modal** instead of centered modal
- Larger touch targets (buttons 44px minimum)
- **Voice input** for addresses and descriptions
- **Camera integration** for site photos

### Quick Actions
- **Swipe gestures** on cards
  - Swipe right: Edit
  - Swipe left: Delete/Archive
  - Long press: More options menu
- **Floating action button** for Create Job (bottom-right corner)

---

## DATABASE ALIGNMENT

Your current schema **perfectly supports** these UI patterns:

**Tables Used:**
- `ops_jobs` → All job data
- `ops_job_services` → Service line items
- `crm_customers` → Customer linking
- `ops_crews` → Crew assignments
- `ops_job_assignments` → Scheduling
- `ops_job_notes` → Notes timeline

**Key Relationships:**
- Job → Customer (FK: customer_id)
- Job → Services (1:many via job_services)
- Job → Crew Assignment (1:many via job_assignments)
- Job → Notes (1:many via job_notes)

**Status Enum Alignment:**
Your `job_status` enum matches industry standard:
```sql
'quote' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'invoiced' | 'cancelled'
```

---

## NEXT STEPS - IMPLEMENTATION PRIORITIES

### Phase 1: Core Job Management

**1. Jobs List View** (table with filters, search, sort)
- **Files**: `src/components/jobs/JobsTableView.tsx`, `JobsTableFilters.tsx`
- **Service Layer**: `src/services/jobService.ts` (new file)
- **Database**: Query `ops_jobs` with joins to `crm_customers`, `ops_job_services`, `ops_job_assignments`
- **State Management**: Local state or new `useJobsStore` hook
- **Key Functions**:
  - `fetchJobs(filters, sort, pagination)`
  - `searchJobs(searchTerm)`
  - `applyFilters(filterState)`

**2. Create Job Wizard** (5-step flow with customer linking)
- **Files**:
  - `src/components/jobs/JobCreationWizard.tsx` (container)
  - `src/components/jobs/wizard/CustomerSelectionStep.tsx`
  - `src/components/jobs/wizard/JobDetailsStep.tsx`
  - `src/components/jobs/wizard/ServicesStep.tsx`
  - `src/components/jobs/wizard/ReviewStep.tsx`
  - `src/components/jobs/wizard/ScheduleStep.tsx`
- **Integration Points**:
  - Reuse `ChatInterface` component from existing system
  - Reuse `MasterPricingEngine` for Quick Calculator
  - Reuse `customerManagementService` for customer creation
- **Key Functions**:
  - `generateJobNumber(companyId)` → Returns `JOB-2025-001`
  - `createJob(wizardState)` → Inserts into `ops_jobs` + `ops_job_services`
  - `createAssignment(jobId, schedule)` → Inserts into `ops_job_assignments`

**3. Job Detail Modal** (overview + services tabs minimum)
- **Files**: `src/components/jobs/JobDetailModal.tsx`, `tabs/OverviewTab.tsx`, `tabs/ServicesTab.tsx`
- **Database**: Single query with all joins (customer, services, assignments, notes)
- **Tab Components**:
  - Overview: Job info display
  - Services: Editable line items table
  - Notes: Timeline with add note input (uses `ops_job_notes`)
  - Schedule: Assignment display and edit
  - Activity: Audit trail (from `ops_job_notes` with `note_type='status_change'`)

**4. Status Management** (dropdown with validation)
- **Component**: `src/components/jobs/StatusDropdown.tsx`
- **Validation**: `validateStatusChange()` function
- **Side Effects**: Auto-set timestamps, create audit notes, update assignments
- **Integration**: Used in Kanban cards, table rows, detail modal header

---

### Phase 2: Pipeline & Scheduling

**5. Kanban Board View** (drag-drop status changes)
- **Files**: `src/components/jobs/JobsKanbanView.tsx`, `KanbanColumn.tsx`, `JobCard.tsx`
- **Library**: `@dnd-kit/core` for drag-drop
- **Database**: Group jobs by status, update on drop
- **Real-time**: Optional Supabase realtime subscription for multi-user updates

**6. Schedule/Calendar View** (crew assignments)
- **Files**: `src/components/jobs/JobsCalendarView.tsx`, `CalendarTimeline.tsx`
- **Database**: Query `ops_job_assignments` with date range filter
- **Conflict Detection**: `detectConflicts(assignments)` function
- **Drag Operations**: Update `scheduled_start` and `scheduled_end` in `ops_job_assignments`

**7. Saved Filter Views** (custom user views)
- **Storage**: JSON in `users.metadata` or new `user_preferences` table
- **UI**: Dropdown selector in table/kanban header
- **Functionality**: Save/load filter state, set default view

---

### Phase 3: Advanced Features

**8. Bulk Operations** (multi-select jobs)
- **Component**: Checkbox column in table, bulk action toolbar
- **Operations**: Bulk status change, bulk assign crew, bulk delete
- **Database**: Use `.in('id', selectedIds)` for batch updates

**9. Document Generation** (quote/invoice PDFs)
- **Library**: `@react-pdf/renderer` or `puppeteer` server-side
- **Templates**: `src/templates/QuotePDF.tsx`, `InvoicePDF.tsx`
- **Data**: Pull from `ops_jobs` + `ops_job_services` + `crm_customers`
- **Storage**: Upload to Supabase Storage, reference in `ops_jobs.metadata`

**10. Mobile Optimization** (responsive design)
- **Breakpoints**: Tailwind responsive classes
- **Mobile Components**: Swap table to cards on small screens
- **Touch Gestures**: Swipe actions, pull-to-refresh
- **Mobile Wizard**: Condense 5 steps to 3 for mobile flow

---

### Technical Prerequisites

**Type Definitions** (create first):
```typescript
// src/types/jobs.ts
interface Job {
  id: string;
  company_id: string;
  customer_id: string;
  job_number: string;
  title: string;
  status: JobStatus;
  estimated_total: number;
  // ... all ops_jobs fields
}

interface JobService {
  id: string;
  job_id: string;
  service_config_id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  // ... all ops_job_services fields
}

interface JobAssignment {
  id: string;
  job_id: string;
  crew_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: AssignmentStatus;
  // ... all ops_job_assignments fields
}
```

**Service Layer** (create `src/services/jobService.ts`):
```typescript
// Centralized job operations
export const jobService = {
  fetchJobs: (filters) => { /* ... */ },
  createJob: (jobData) => { /* ... */ },
  updateJob: (jobId, updates) => { /* ... */ },
  deleteJob: (jobId) => { /* ... */ },
  changeStatus: (jobId, newStatus) => { /* ... */ },
  addNote: (jobId, note) => { /* ... */ },
  createAssignment: (assignment) => { /* ... */ }
};
```

**RLS Policies** (verify in Supabase):
- Ensure `ops_jobs`, `ops_job_services`, `ops_job_assignments`, `ops_job_notes` have proper company isolation
- All tables should have SELECT/INSERT/UPDATE/DELETE policies checking `company_id`

---

**Document Version:** 2.0
**Last Updated:** October 24, 2025
**Source:** Industry research + TradeSphere database schema analysis + Technical implementation specifications

---

## DOCUMENT CHANGE LOG

**Version 2.0** (October 24, 2025)
- Added technical implementation sections to all major features
- Integrated database schema connections (ops_jobs, ops_job_services, ops_job_assignments, ops_job_notes)
- Added component structure recommendations for all views
- Included TypeScript query patterns and service layer integration
- Documented integration points with existing Chat Interface and Quick Calculator
- Added validation logic, status management, and conflict detection code patterns
- Expanded implementation priorities with file paths and key functions

**Version 1.0** (October 24, 2025)
- Initial UI/UX patterns documentation
- Database alignment analysis
- Industry standard workflows and best practices