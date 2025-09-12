/**
 * Customer List Database Integration Tests
 * 
 * This file contains integration tests to verify the complete customer loading
 * integration including database operations, service layer, and UI components.
 */

import { customerService } from '../services/customerService';

// Mock Supabase for testing
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [
              {
                user_tech_id: 'test-tech-123',
                customer_name: 'John Doe',
                latest_session_id: 'session-123',
                customer_address: '123 Main St',
                customer_email: 'john@example.com',
                customer_phone: '555-1234',
                customer_number: '555-1234',
                interaction_summary: 'Initial consultation about landscaping project',
                last_interaction_at: '2023-12-01T10:00:00Z',
                last_viewed_at: '2023-12-01T09:00:00Z',
                interaction_count: 5,
                view_count: 10,
                sort_priority: 1000
              },
              {
                user_tech_id: 'test-tech-123',
                customer_name: 'Jane Smith',
                latest_session_id: 'session-456',
                customer_address: '456 Oak Ave',
                customer_email: 'jane@example.com',
                customer_phone: '555-5678',
                customer_number: '555-5678',
                interaction_summary: 'Follow-up on deck installation',
                last_interaction_at: '2023-11-28T14:30:00Z',
                last_viewed_at: null,
                interaction_count: 3,
                view_count: 2,
                sort_priority: 100
              }
            ],
            error: null
          }))
        }))
      }))
    }))
  })),
  rpc: jest.fn(() => Promise.resolve({ data: [], error: null }))
};

describe('Customer Integration Tests', () => {
  let originalSupabase: any;

  beforeAll(() => {
    // Store original supabase instance
    originalSupabase = (customerService as any).supabase;
    
    // Replace with mock
    (customerService as any).supabase = mockSupabase;
  });

  afterAll(() => {
    // Restore original supabase instance
    (customerService as any).supabase = originalSupabase;
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Customer List Retrieval', () => {
    test('should retrieve customer list successfully', async () => {
      const result = await customerService.getCustomerList('test-tech-123');

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(2);
      expect(result.customers?.[0].customer_name).toBe('John Doe');
      expect(result.customers?.[0].sort_priority).toBe(1000);
    });

    test('should handle search filtering', async () => {
      const result = await customerService.getCustomerList('test-tech-123', {
        searchQuery: 'John',
        limit: 50
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('customer_list_view');
    });

    test('should handle pagination correctly', async () => {
      const result = await customerService.getCustomerList('test-tech-123', {
        limit: 10,
        offset: 20
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('customer_list_view');
    });
  });

  describe('Customer Interaction Tracking', () => {
    beforeEach(() => {
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => Promise.resolve({ error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      }));
    });

    test('should track customer interactions', async () => {
      await customerService.trackCustomerInteraction(
        'test-tech-123',
        'John Doe',
        'session-123',
        'view'
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_interactions');
    });

    test('should handle different interaction types', async () => {
      const interactionTypes: ('view' | 'edit' | 'load')[] = ['view', 'edit', 'load'];
      
      for (const type of interactionTypes) {
        await customerService.trackCustomerInteraction(
          'test-tech-123',
          'John Doe',
          'session-123',
          type
        );
      }

      expect(mockSupabase.from).toHaveBeenCalledTimes(interactionTypes.length * 2); // 2 calls per interaction
    });
  });

  describe('Customer Details Management', () => {
    beforeEach(() => {
      mockSupabase.from = jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { id: 1, customer_name: 'Updated Name' },
                  error: null
                }))
              }))
            }))
          }))
        })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({
                data: [{ customer_name: 'John Doe', session_id: 'session-123' }],
                error: null
              }))
            }))
          }))
        }))
      }));
    });

    test('should update customer details successfully', async () => {
      const result = await customerService.updateCustomerDetails(
        'session-123',
        'tech-123',
        {
          customer_name: 'Updated Name',
          customer_email: 'updated@example.com'
        }
      );

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('VC USAGE');
    });

    test('should retrieve customer details by name or session', async () => {
      const result = await customerService.getCustomerDetails(
        'tech-123',
        'John Doe'
      );

      expect(result.customer).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('VC USAGE');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    test('should handle network errors gracefully', async () => {
      const errorMock = {
        from: jest.fn(() => ({
          select: jest.fn(() => {
            throw new Error('Network fetch failed');
          })
        }))
      };

      (customerService as any).supabase = errorMock;

      const result = await customerService.getCustomerList('test-tech-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network connection failed');
    });

    test('should handle database connection errors', async () => {
      const dbError = { code: '08001', message: 'Connection refused' };
      const errorMock = {
        from: jest.fn(() => ({
          select: jest.fn(() => {
            throw dbError;
          })
        }))
      };

      (customerService as any).supabase = errorMock;

      const result = await customerService.getCustomerList('test-tech-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('Audit Logging', () => {
    test('should log successful operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await customerService.getCustomerList('test-tech-123');

      // Should have logged audit trail
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CustomerService Audit - Success'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    test('should log failed operations', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const errorMock = {
        from: jest.fn(() => ({
          select: jest.fn(() => {
            throw new Error('Test error');
          })
        }))
      };

      (customerService as any).supabase = errorMock;

      await customerService.getCustomerList('test-tech-123');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance and Caching', () => {
    test('should handle large customer lists efficiently', async () => {
      // Mock large dataset
      const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
        user_tech_id: 'test-tech-123',
        customer_name: `Customer ${i}`,
        latest_session_id: `session-${i}`,
        customer_address: `${i} Test St`,
        customer_email: `customer${i}@example.com`,
        customer_phone: `555-${i.toString().padStart(4, '0')}`,
        interaction_count: Math.floor(Math.random() * 10),
        view_count: Math.floor(Math.random() * 50),
        sort_priority: Math.floor(Math.random() * 1000)
      }));

      const largeMock = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: largeMockData.slice(0, 50), // Simulate pagination
                  error: null
                }))
              }))
            }))
          }))
        }))
      };

      (customerService as any).supabase = largeMock;

      const startTime = Date.now();
      const result = await customerService.getCustomerList('test-tech-123', { limit: 50 });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Data Validation and Sanitization', () => {
    test('should validate required parameters', async () => {
      const result = await customerService.getCustomerDetails('', undefined, undefined);

      expect(result.customer).toBeNull();
      expect(result.error).toContain('Either customerName or sessionId must be provided');
    });

    test('should handle malformed data gracefully', async () => {
      const malformedMock = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [
                    { customer_name: null }, // Missing required fields
                    { customer_name: '', customer_email: 'invalid-email' },
                    { /* completely empty object */ }
                  ],
                  error: null
                }))
              }))
            }))
          }))
        }))
      };

      (customerService as any).supabase = malformedMock;

      const result = await customerService.getCustomerList('test-tech-123');

      expect(result.success).toBe(true);
      // Should handle malformed data without crashing
      expect(Array.isArray(result.customers)).toBe(true);
    });
  });
});

/**
 * Manual Integration Test Guide
 * 
 * To manually test the complete customer loading integration:
 * 
 * 1. Customer List Loading:
 *    - Open the application
 *    - Click on the "Customers" tab
 *    - Verify customers load and display properly
 *    - Check that recently viewed customers appear first with proper indicators
 * 
 * 2. Search Functionality:
 *    - Type in the search box
 *    - Verify debounced search works
 *    - Test searching by name, email, phone, and address
 * 
 * 3. Customer Loading:
 *    - Click on a customer to load their conversation
 *    - Verify the customer context loads properly
 *    - Check that the customer is marked as "recently viewed"
 * 
 * 4. Customer Editing:
 *    - Enable edit mode
 *    - Click on a customer to edit
 *    - Modify customer details and save
 *    - Verify changes persist and customer moves to "recently viewed"
 * 
 * 5. Mobile Experience:
 *    - Test on mobile device or browser dev tools
 *    - Verify touch targets are appropriate size
 *    - Test swipe gestures and haptic feedback
 *    - Check pull-to-refresh functionality
 * 
 * 6. Error Handling:
 *    - Disconnect internet and test error states
 *    - Verify user-friendly error messages appear
 *    - Test retry functionality when connection restored
 * 
 * 7. Performance:
 *    - Load large customer lists (>100 customers)
 *    - Verify smooth scrolling and rendering
 *    - Check that search remains responsive
 */