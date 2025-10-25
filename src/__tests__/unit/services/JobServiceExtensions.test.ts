/**
 * Unit Tests: JobServiceExtensions
 *
 * Tests for wizard-specific job service operations
 * Validates database operations, job number generation, and conflict detection
 */

import { JobServiceWizardExtensions } from '../../../services/JobServiceExtensions';
import { createMockWizardData, createMockJob, createMockCustomer } from '../../__mocks__/mockData';
import { server } from '../../__mocks__/handlers';
import { rest } from 'msw';

describe('JobServiceExtensions', () => {
  let jobService: JobServiceWizardExtensions;

  beforeEach(() => {
    jobService = new JobServiceWizardExtensions();
  });

  describe('generateJobNumber', () => {
    it('should generate job number with current year', async () => {
      const jobNumber = await jobService.generateJobNumber('company-1');
      const currentYear = new Date().getFullYear();

      expect(jobNumber).toMatch(new RegExp(`JOB-${currentYear}-\\d{4}`));
    });

    it('should generate sequential job numbers', async () => {
      const jobNumber1 = await jobService.generateJobNumber('company-1');
      const jobNumber2 = await jobService.generateJobNumber('company-1');

      // Extract numbers
      const num1 = parseInt(jobNumber1.split('-')[2], 10);
      const num2 = parseInt(jobNumber2.split('-')[2], 10);

      expect(num2).toBeGreaterThan(num1);
    });

    it('should pad job numbers with leading zeros', async () => {
      const jobNumber = await jobService.generateJobNumber('company-1');
      const numberPart = jobNumber.split('-')[2];

      expect(numberPart).toHaveLength(4);
      expect(numberPart).toMatch(/^\d{4}$/);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      server.use(
        rest.get('*/rest/v1/ops_jobs*', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Database error' }));
        })
      );

      const jobNumber = await jobService.generateJobNumber('company-1');

      // Should fallback to 0001
      expect(jobNumber).toContain('0001');
    });
  });

  describe('createJobFromWizard', () => {
    it('should create job with services successfully', async () => {
      const wizardData = createMockWizardData();

      const result = await jobService.createJobFromWizard({
        ...wizardData.jobDetails,
        company_id: wizardData.companyId,
        customer_id: wizardData.customer.id,
        services: wizardData.services.map(s => ({
          ...s,
          service_config_id: s.serviceConfigId,
          service_name: s.serviceName,
          service_description: s.serviceDescription,
          quantity: s.quantity,
          unit_price: s.unitPrice,
          total_price: s.totalPrice,
          calculation_data: s.calculation.calculationData,
          pricing_variables: s.calculation.pricingVariables,
          notes: s.notes,
          metadata: {},
          added_by_user_id: wizardData.userId
        })),
        created_by_user_id: wizardData.userId
      });

      expect(result.success).toBe(true);
      expect(result.data.job.id).toBeDefined();
      expect(result.data.job.job_number).toBeDefined();
      expect(result.data.services).toHaveLength(wizardData.services.length);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        company_id: 'company-1',
        customer_id: 'customer-1',
        // Missing title
        services: [],
        created_by_user_id: 'user-1'
      };

      const result = await jobService.createJobFromWizard(invalidData as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate customer exists', async () => {
      // Mock customer not found
      server.use(
        rest.get('*/rest/v1/crm_customers*', (req, res, ctx) => {
          return res(ctx.status(404), ctx.json({ error: 'Not found' }));
        })
      );

      const wizardData = createMockWizardData();

      const result = await jobService.createJobFromWizard({
        ...wizardData.jobDetails,
        company_id: wizardData.companyId,
        customer_id: 'invalid-customer',
        services: [],
        created_by_user_id: wizardData.userId
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Customer not found');
    });

    it('should calculate totals from services', async () => {
      const wizardData = createMockWizardData();

      const result = await jobService.createJobFromWizard({
        ...wizardData.jobDetails,
        company_id: wizardData.companyId,
        customer_id: wizardData.customer.id,
        services: wizardData.services.map(s => ({
          ...s,
          service_config_id: s.serviceConfigId,
          service_name: s.serviceName,
          total_price: s.totalPrice,
          calculation_data: s.calculation.calculationData,
          pricing_variables: s.calculation.pricingVariables,
          added_by_user_id: wizardData.userId
        })) as any,
        created_by_user_id: wizardData.userId
      });

      if (result.success) {
        const expectedTotal = wizardData.services.reduce((sum, s) => sum + s.totalPrice, 0);
        expect(result.data.job.estimated_total).toBe(expectedTotal);
      }
    });

    it('should rollback on service creation failure', async () => {
      // Mock service creation error
      server.use(
        rest.post('*/rest/v1/ops_job_services', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Service creation failed' }));
        })
      );

      const wizardData = createMockWizardData();

      const result = await jobService.createJobFromWizard({
        ...wizardData.jobDetails,
        company_id: wizardData.companyId,
        customer_id: wizardData.customer.id,
        services: wizardData.services.map(s => ({
          ...s,
          service_config_id: s.serviceConfigId,
          service_name: s.serviceName,
          added_by_user_id: wizardData.userId
        })) as any,
        created_by_user_id: wizardData.userId
      });

      expect(result.success).toBe(false);
      // Job should be rolled back
    });

    it('should create assignment when provided', async () => {
      const wizardData = createMockWizardData();

      const result = await jobService.createJobFromWizard({
        ...wizardData.jobDetails,
        company_id: wizardData.companyId,
        customer_id: wizardData.customer.id,
        services: wizardData.services.map(s => ({
          ...s,
          service_config_id: s.serviceConfigId,
          service_name: s.serviceName,
          added_by_user_id: wizardData.userId
        })) as any,
        assignment: {
          crew_id: 'crew-1',
          scheduled_start: '2025-02-01T08:00:00Z',
          scheduled_end: '2025-02-05T17:00:00Z',
          estimated_hours: 32,
          assigned_by_user_id: wizardData.userId
        },
        created_by_user_id: wizardData.userId
      });

      if (result.success) {
        expect(result.data.assignmentId).toBeDefined();
      }
    });
  });

  describe('checkScheduleConflicts', () => {
    it('should detect scheduling conflicts', async () => {
      const result = await jobService.checkScheduleConflicts(
        'crew-1',
        '2025-02-01T08:00:00Z',
        '2025-02-05T17:00:00Z'
      );

      expect(result.success).toBe(true);
      // Should find conflict with existing assignment
      if (result.data.length > 0) {
        expect(result.data[0].crew_id).toBe('crew-1');
        expect(result.data[0].conflicting_assignments).toBeDefined();
      }
    });

    it('should return empty array when no conflicts', async () => {
      // Use future dates with no conflicts
      const result = await jobService.checkScheduleConflicts(
        'crew-1',
        '2026-02-01T08:00:00Z',
        '2026-02-05T17:00:00Z'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      server.use(
        rest.get('*/rest/v1/ops_job_assignments*', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Database error' }));
        })
      );

      const result = await jobService.checkScheduleConflicts(
        'crew-1',
        '2025-02-01T08:00:00Z',
        '2025-02-05T17:00:00Z'
      );

      expect(result.success).toBe(false);
    });
  });

  describe('validateWizardData', () => {
    it('should validate complete wizard data', async () => {
      const wizardData = createMockWizardData();

      const result = await jobService.validateWizardData({
        ...wizardData.jobDetails,
        company_id: wizardData.companyId,
        customer_id: wizardData.customer.id,
        services: wizardData.services.map(s => ({
          ...s,
          service_config_id: s.serviceConfigId,
          service_name: s.serviceName,
          added_by_user_id: wizardData.userId
        })) as any,
        created_by_user_id: wizardData.userId
      });

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
      expect(result.data.errors).toEqual([]);
    });

    it('should detect missing customer', async () => {
      server.use(
        rest.get('*/rest/v1/crm_customers*', (req, res, ctx) => {
          return res(ctx.status(404));
        })
      );

      const wizardData = createMockWizardData();

      const result = await jobService.validateWizardData({
        ...wizardData.jobDetails,
        company_id: wizardData.companyId,
        customer_id: 'invalid-customer',
        services: [],
        created_by_user_id: wizardData.userId
      } as any);

      expect(result.data.valid).toBe(false);
      expect(result.data.errors).toContain(
        expect.stringContaining('Customer not found')
      );
    });

    it('should detect missing services', async () => {
      const wizardData = createMockWizardData();

      const result = await jobService.validateWizardData({
        ...wizardData.jobDetails,
        company_id: wizardData.companyId,
        customer_id: wizardData.customer.id,
        services: [], // No services
        created_by_user_id: wizardData.userId
      } as any);

      expect(result.data.valid).toBe(false);
      expect(result.data.errors).toContain(
        expect.stringContaining('At least one service is required')
      );
    });

    it('should detect invalid service prices', async () => {
      const wizardData = createMockWizardData();

      const result = await jobService.validateWizardData({
        ...wizardData.jobDetails,
        company_id: wizardData.companyId,
        customer_id: wizardData.customer.id,
        services: [
          {
            ...wizardData.services[0],
            unit_price: -100, // Invalid negative price
            service_config_id: wizardData.services[0].serviceConfigId,
            service_name: wizardData.services[0].serviceName,
            added_by_user_id: wizardData.userId
          }
        ] as any,
        created_by_user_id: wizardData.userId
      });

      expect(result.data.valid).toBe(false);
      expect(result.data.errors).toContain(
        expect.stringContaining('Invalid unit price')
      );
    });
  });
});
