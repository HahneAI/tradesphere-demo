/**
 * MSW Request Handlers
 *
 * Defines mock API handlers for Supabase and external services
 * Used by MSW to intercept and respond to HTTP requests in tests
 */

import { rest } from 'msw';
import {
  mockCustomers,
  mockJobs,
  mockJobServices,
  mockCrews,
  mockJobAssignments
} from './mockData';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mock-supabase.supabase.co';
const BASE_URL = `${SUPABASE_URL}/rest/v1`;

export const handlers = [
  // ===== CUSTOMER ENDPOINTS =====

  // GET customers
  rest.get(`${BASE_URL}/crm_customers`, (req, res, ctx) => {
    const companyId = req.url.searchParams.get('company_id');
    const search = req.url.searchParams.get('customer_name');

    let customers = mockCustomers.filter(c => c.company_id === companyId);

    if (search) {
      customers = customers.filter(c =>
        c.customer_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return res(
      ctx.status(200),
      ctx.json(customers)
    );
  }),

  // GET single customer
  rest.get(`${BASE_URL}/crm_customers/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const customer = mockCustomers.find(c => c.id === id);

    if (!customer) {
      return res(ctx.status(404), ctx.json({ error: 'Customer not found' }));
    }

    return res(ctx.status(200), ctx.json(customer));
  }),

  // POST create customer
  rest.post(`${BASE_URL}/crm_customers`, async (req, res, ctx) => {
    const body = await req.json();

    const newCustomer = {
      id: `customer-${Date.now()}`,
      ...body,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockCustomers.push(newCustomer);

    return res(ctx.status(201), ctx.json([newCustomer]));
  }),

  // ===== JOB ENDPOINTS =====

  // GET jobs
  rest.get(`${BASE_URL}/ops_jobs`, (req, res, ctx) => {
    const companyId = req.url.searchParams.get('company_id');
    let jobs = mockJobs.filter(j => j.company_id === companyId);

    return res(ctx.status(200), ctx.json(jobs));
  }),

  // GET single job
  rest.get(`${BASE_URL}/ops_jobs/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const job = mockJobs.find(j => j.id === id);

    if (!job) {
      return res(ctx.status(404), ctx.json({ error: 'Job not found' }));
    }

    return res(ctx.status(200), ctx.json(job));
  }),

  // POST create job
  rest.post(`${BASE_URL}/ops_jobs`, async (req, res, ctx) => {
    const body = await req.json();

    const newJob = {
      id: `job-${Date.now()}`,
      ...body,
      job_number: `JOB-2025-${String(mockJobs.length + 1).padStart(4, '0')}`,
      status: body.status || 'quote',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockJobs.push(newJob);

    return res(ctx.status(201), ctx.json([newJob]));
  }),

  // PATCH update job
  rest.patch(`${BASE_URL}/ops_jobs/:id`, async (req, res, ctx) => {
    const { id } = req.params;
    const body = await req.json();
    const jobIndex = mockJobs.findIndex(j => j.id === id);

    if (jobIndex === -1) {
      return res(ctx.status(404), ctx.json({ error: 'Job not found' }));
    }

    mockJobs[jobIndex] = {
      ...mockJobs[jobIndex],
      ...body,
      updated_at: new Date().toISOString()
    };

    return res(ctx.status(200), ctx.json([mockJobs[jobIndex]]));
  }),

  // DELETE job
  rest.delete(`${BASE_URL}/ops_jobs/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const jobIndex = mockJobs.findIndex(j => j.id === id);

    if (jobIndex === -1) {
      return res(ctx.status(404), ctx.json({ error: 'Job not found' }));
    }

    mockJobs.splice(jobIndex, 1);

    return res(ctx.status(204));
  }),

  // ===== JOB SERVICES ENDPOINTS =====

  // GET job services
  rest.get(`${BASE_URL}/ops_job_services`, (req, res, ctx) => {
    const jobId = req.url.searchParams.get('job_id');
    const services = mockJobServices.filter(s => s.job_id === jobId);

    return res(ctx.status(200), ctx.json(services));
  }),

  // POST create job services
  rest.post(`${BASE_URL}/ops_job_services`, async (req, res, ctx) => {
    const body = await req.json();
    const services = Array.isArray(body) ? body : [body];

    const newServices = services.map(service => ({
      id: `service-${Date.now()}-${Math.random()}`,
      ...service,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    mockJobServices.push(...newServices);

    return res(ctx.status(201), ctx.json(newServices));
  }),

  // ===== CREW ENDPOINTS =====

  // GET crews
  rest.get(`${BASE_URL}/ops_crews`, (req, res, ctx) => {
    const companyId = req.url.searchParams.get('company_id');
    const crews = mockCrews.filter(c => c.company_id === companyId);

    return res(ctx.status(200), ctx.json(crews));
  }),

  // ===== JOB ASSIGNMENTS ENDPOINTS =====

  // GET job assignments
  rest.get(`${BASE_URL}/ops_job_assignments`, (req, res, ctx) => {
    const crewId = req.url.searchParams.get('crew_id');
    let assignments = mockJobAssignments;

    if (crewId) {
      assignments = assignments.filter(a => a.crew_id === crewId);
    }

    return res(ctx.status(200), ctx.json(assignments));
  }),

  // POST create job assignment
  rest.post(`${BASE_URL}/ops_job_assignments`, async (req, res, ctx) => {
    const body = await req.json();

    const newAssignment = {
      id: `assignment-${Date.now()}`,
      ...body,
      status: 'scheduled',
      completion_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockJobAssignments.push(newAssignment);

    return res(ctx.status(201), ctx.json([newAssignment]));
  }),

  // ===== ERROR SIMULATION HANDLERS =====

  // Simulate network error
  rest.post(`${BASE_URL}/simulate-network-error`, (req, res, ctx) => {
    return res.networkError('Network connection failed');
  }),

  // Simulate server error
  rest.post(`${BASE_URL}/simulate-server-error`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal Server Error' })
    );
  }),

  // Simulate timeout
  rest.post(`${BASE_URL}/simulate-timeout`, (req, res, ctx) => {
    return res(ctx.delay('infinite'));
  })
];
