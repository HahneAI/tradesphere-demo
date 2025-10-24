/**
 * End-to-End Tests: Job Creation Wizard
 *
 * Playwright tests for complete user workflows through the wizard
 * Tests real browser interactions and full application integration
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Job Creation Wizard - E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Navigate to jobs page
    await page.goto('/jobs');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Open wizard
    await page.click('button:has-text("Create Job"), button:has-text("New Job")');

    // Verify wizard modal is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test.describe('Happy Path - Complete Flow', () => {
    test('should create job as quote successfully', async () => {
      // ===== STEP 1: Customer Selection =====
      await test.step('Select customer', async () => {
        // Verify we're on Step 1
        await expect(page.locator('text=Customer')).toHaveClass(/active/);

        // Search for customer
        await page.fill('[placeholder*="Search"]', 'Sarah');

        // Wait for search results
        await page.waitForTimeout(500); // Debounce

        // Click on customer card
        await page.click('text=Sarah Johnson');

        // Verify customer is selected
        await expect(page.locator('[data-testid="selected-customer"]')).toContainText('Sarah Johnson');

        // Click Next
        await page.click('button:has-text("Next")');
      });

      // ===== STEP 2: Job Details =====
      await test.step('Enter job details', async () => {
        // Verify we're on Step 2
        await expect(page.locator('text=Details')).toHaveClass(/active/);

        // Fill job title
        await page.fill('[name="title"]', 'Backyard Paver Patio Installation');

        // Fill description
        await page.fill('[name="description"]', '360 sq ft paver patio with herringbone pattern');

        // Verify address was auto-populated from customer
        const address = await page.inputValue('[name="service_address"]');
        expect(address).toBeTruthy();

        // Select priority
        await page.selectOption('[name="priority"]', '5');

        // Select requested start date
        await page.fill('[name="requested_start_date"]', '2025-02-01');

        // Click Next
        await page.click('button:has-text("Next")');
      });

      // ===== STEP 3: Services =====
      await test.step('Add services', async () => {
        // Verify we're on Step 3
        await expect(page.locator('text=Services')).toHaveClass(/active/);

        // Click Manual Entry tab
        await page.click('button:has-text("Manual Entry")');

        // Fill service details
        await page.fill('[name="serviceName"]', 'Paver Patio Installation');
        await page.fill('[name="serviceDescription"]', '360 sq ft with herringbone pattern');
        await page.fill('[name="quantity"]', '360');
        await page.fill('[name="unitPrice"]', '85.00');

        // Click Add Service
        await page.click('button:has-text("Add Service")');

        // Verify service appears in table
        await expect(page.locator('table tbody tr')).toHaveCount(1);

        // Verify estimated total
        await expect(page.locator('[data-testid="estimated-total"]')).toContainText('$30,600');

        // Click Next
        await page.click('button:has-text("Next")');
      });

      // ===== STEP 4: Review =====
      await test.step('Review and confirm', async () => {
        // Verify we're on Step 4
        await expect(page.locator('text=Review')).toHaveClass(/active/);

        // Verify customer summary
        await expect(page.locator('[data-testid="customer-summary"]')).toContainText('Sarah Johnson');

        // Verify job summary
        await expect(page.locator('[data-testid="job-summary"]')).toContainText('Backyard Paver Patio');

        // Verify services summary
        await expect(page.locator('[data-testid="services-summary"]')).toContainText('Paver Patio Installation');
        await expect(page.locator('[data-testid="services-summary"]')).toContainText('$30,600');

        // Verify Save as Quote is selected by default
        const saveAsQuoteButton = page.locator('button:has-text("Save as Quote")');
        await expect(saveAsQuoteButton).toBeVisible();

        // Click Save as Quote
        await page.click('button:has-text("Save as Quote")');
      });

      // ===== VERIFY SUCCESS =====
      await test.step('Verify job created', async () => {
        // Wait for success message
        await expect(page.locator('text=Job created successfully')).toBeVisible({ timeout: 10000 });

        // Verify modal closes
        await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

        // Verify job appears in list
        await expect(page.locator('text=Backyard Paver Patio')).toBeVisible();
        await expect(page.locator('text=JOB-2025-')).toBeVisible();
      });
    });

    test('should create job with scheduling', async () => {
      // Navigate through Steps 1-4 quickly
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');

      await page.fill('[name="title"]', 'Scheduled Job');
      await page.fill('[name="service_address"]', '123 Main St');
      await page.click('button:has-text("Next")');

      await page.click('button:has-text("Manual Entry")');
      await page.fill('[name="serviceName"]', 'Test Service');
      await page.fill('[name="quantity"]', '1');
      await page.fill('[name="unitPrice"]', '1000');
      await page.click('button:has-text("Add Service")');
      await page.click('button:has-text("Next")');

      // Step 4: Click "Schedule Job" instead of "Save as Quote"
      await page.click('button:has-text("Schedule Job")');

      // ===== STEP 5: Schedule & Assign =====
      await test.step('Schedule crew assignment', async () => {
        // Verify we're on Step 5
        await expect(page.locator('text=Schedule')).toHaveClass(/active/);

        // Select crew
        await page.selectOption('[name="crew_id"]', 'crew-1');

        // Set scheduled dates
        await page.fill('[name="scheduled_start"]', '2025-02-01T08:00');
        await page.fill('[name="scheduled_end"]', '2025-02-05T17:00');

        // Fill estimated hours
        await page.fill('[name="estimated_hours"]', '32');

        // Fill work description
        await page.fill('[name="work_description"]', 'Complete patio installation');

        // Create job
        await page.click('button:has-text("Create Job")');

        // Wait for success
        await expect(page.locator('text=Job created successfully')).toBeVisible({ timeout: 10000 });
      });
    });
  });

  test.describe('Validation Tests', () => {
    test('should validate Step 1 - customer required', async () => {
      // Try to advance without selecting customer
      await page.click('button:has-text("Next")');

      // Should remain on Step 1
      await expect(page.locator('text=Customer')).toHaveClass(/active/);

      // Verify error message
      await expect(page.locator('text=Please select a customer')).toBeVisible();
    });

    test('should validate Step 2 - required fields', async () => {
      // Select customer and advance
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');

      // Clear auto-populated address
      await page.fill('[name="service_address"]', '');

      // Try to advance
      await page.click('button:has-text("Next")');

      // Should show validation errors
      await expect(page.locator('text=Job title is required')).toBeVisible();
      await expect(page.locator('text=Service address is required')).toBeVisible();
    });

    test('should validate Step 3 - services required', async () => {
      // Navigate to Step 3
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');

      await page.fill('[name="title"]', 'Test Job');
      await page.fill('[name="service_address"]', '123 Main St');
      await page.click('button:has-text("Next")');

      // Try to advance without adding services
      await page.click('button:has-text("Next")');

      // Should show error
      await expect(page.locator('text=At least one service is required')).toBeVisible();
    });

    test('should validate service fields', async () => {
      // Navigate to Step 3
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');
      await page.fill('[name="title"]', 'Test Job');
      await page.click('button:has-text("Next")');

      // Click Manual Entry
      await page.click('button:has-text("Manual Entry")');

      // Try to add service with invalid data
      await page.fill('[name="serviceName"]', ''); // Empty name
      await page.fill('[name="quantity"]', '-5'); // Negative quantity
      await page.fill('[name="unitPrice"]', '-100'); // Negative price

      await page.click('button:has-text("Add Service")');

      // Verify validation errors
      await expect(page.locator('text=Service name is required')).toBeVisible();
    });
  });

  test.describe('Navigation Tests', () => {
    test('should navigate backward through steps', async () => {
      // Navigate to Step 3
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');

      await page.fill('[name="title"]', 'Test Job');
      await page.click('button:has-text("Next")');

      // Now on Step 3
      await expect(page.locator('text=Services')).toHaveClass(/active/);

      // Click Back
      await page.click('button:has-text("Back")');

      // Should be on Step 2
      await expect(page.locator('text=Details')).toHaveClass(/active/);

      // Verify data persisted
      await expect(page.locator('[name="title"]')).toHaveValue('Test Job');

      // Click Back again
      await page.click('button:has-text("Back")');

      // Should be on Step 1
      await expect(page.locator('text=Customer')).toHaveClass(/active/);
    });

    test('should jump to specific step via progress indicator', async () => {
      // Complete steps to enable navigation
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');

      await page.fill('[name="title"]', 'Test Job');
      await page.click('button:has-text("Next")');

      // Now on Step 3, click Step 1 in progress indicator
      await page.click('[data-testid="step-indicator-1"]');

      // Should be on Step 1
      await expect(page.locator('text=Customer')).toHaveClass(/active/);
    });

    test('should preserve data when navigating back and forth', async () => {
      // Fill Step 1
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');

      // Fill Step 2
      await page.fill('[name="title"]', 'Persistent Data Test');
      await page.fill('[name="description"]', 'Testing data persistence');
      await page.click('button:has-text("Next")');

      // Go back to Step 1
      await page.click('button:has-text("Back")');
      await page.click('button:has-text("Back")');

      // Verify Step 1 data
      await expect(page.locator('[data-testid="selected-customer"]')).toContainText('Sarah Johnson');

      // Go forward to Step 2
      await page.click('button:has-text("Next")');

      // Verify Step 2 data persisted
      await expect(page.locator('[name="title"]')).toHaveValue('Persistent Data Test');
      await expect(page.locator('[name="description"]')).toHaveValue('Testing data persistence');
    });
  });

  test.describe('Service Management', () => {
    test('should add multiple services', async () => {
      // Navigate to Step 3
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');
      await page.fill('[name="title"]', 'Multi-Service Job');
      await page.click('button:has-text("Next")');

      // Add first service
      await page.click('button:has-text("Manual Entry")');
      await page.fill('[name="serviceName"]', 'Service 1');
      await page.fill('[name="quantity"]', '1');
      await page.fill('[name="unitPrice"]', '1000');
      await page.click('button:has-text("Add Service")');

      // Add second service
      await page.fill('[name="serviceName"]', 'Service 2');
      await page.fill('[name="quantity"]', '2');
      await page.fill('[name="unitPrice"]', '500');
      await page.click('button:has-text("Add Service")');

      // Verify both services in table
      await expect(page.locator('table tbody tr')).toHaveCount(2);

      // Verify total calculation
      await expect(page.locator('[data-testid="estimated-total"]')).toContainText('$2,000');
    });

    test('should remove service', async () => {
      // Navigate to Step 3 and add service
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');
      await page.fill('[name="title"]', 'Remove Service Test');
      await page.click('button:has-text("Next")');

      await page.click('button:has-text("Manual Entry")');
      await page.fill('[name="serviceName"]', 'To Be Removed');
      await page.fill('[name="quantity"]', '1');
      await page.fill('[name="unitPrice"]', '500');
      await page.click('button:has-text("Add Service")');

      // Verify service added
      await expect(page.locator('table tbody tr')).toHaveCount(1);

      // Click remove button
      await page.click('[data-testid="remove-service-0"]');

      // Verify service removed
      await expect(page.locator('table tbody tr')).toHaveCount(0);
      await expect(page.locator('[data-testid="estimated-total"]')).toContainText('$0');
    });

    test('should edit service', async () => {
      // Navigate to Step 3 and add service
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');
      await page.fill('[name="title"]', 'Edit Service Test');
      await page.click('button:has-text("Next")');

      await page.click('button:has-text("Manual Entry")');
      await page.fill('[name="serviceName"]', 'Original Service');
      await page.fill('[name="quantity"]', '1');
      await page.fill('[name="unitPrice"]', '1000');
      await page.click('button:has-text("Add Service")');

      // Click edit button
      await page.click('[data-testid="edit-service-0"]');

      // Modify fields
      await page.fill('[name="serviceName"]', 'Updated Service');
      await page.fill('[name="unitPrice"]', '1500');

      // Save changes
      await page.click('button:has-text("Save Changes")');

      // Verify updates
      await expect(page.locator('table tbody')).toContainText('Updated Service');
      await expect(page.locator('[data-testid="estimated-total"]')).toContainText('$1,500');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network error by intercepting request
      await page.route('**/rest/v1/ops_jobs', route => {
        route.abort('failed');
      });

      // Complete wizard flow
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');

      await page.fill('[name="title"]', 'Network Error Test');
      await page.click('button:has-text("Next")');

      await page.click('button:has-text("Manual Entry")');
      await page.fill('[name="serviceName"]', 'Test Service');
      await page.fill('[name="quantity"]', '1');
      await page.fill('[name="unitPrice"]', '1000');
      await page.click('button:has-text("Add Service")');
      await page.click('button:has-text("Next")');

      await page.click('button:has-text("Save as Quote")');

      // Verify error message
      await expect(page.locator('text=Failed to create job')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Please try again')).toBeVisible();
    });

    test('should handle validation errors from server', async () => {
      // Intercept and return validation error
      await page.route('**/rest/v1/ops_jobs', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({
            error: 'Validation failed',
            details: 'Invalid job data'
          })
        });
      });

      // Complete wizard and submit
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');
      await page.fill('[name="title"]', 'Validation Error Test');
      await page.click('button:has-text("Next")');

      await page.click('button:has-text("Manual Entry")');
      await page.fill('[name="serviceName"]', 'Test');
      await page.fill('[name="quantity"]', '1');
      await page.fill('[name="unitPrice"]', '100');
      await page.click('button:has-text("Add Service")');
      await page.click('button:has-text("Next")');

      await page.click('button:has-text("Save as Quote")');

      // Verify error displayed
      await expect(page.locator('text=Validation failed')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async () => {
      // Tab to first focusable element
      await page.keyboard.press('Tab');

      // Should focus on search input
      const searchInput = page.locator('[placeholder*="Search"]');
      await expect(searchInput).toBeFocused();

      // Tab through customer cards
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="customer-card-0"]')).toBeFocused();

      // Press Enter to select
      await page.keyboard.press('Enter');

      // Tab to Next button and press Enter
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
      }
      await page.keyboard.press('Enter');

      // Should advance to Step 2
      await expect(page.locator('text=Details')).toHaveClass(/active/);
    });

    test('should have proper ARIA labels', async () => {
      // Verify dialog has accessible name
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toHaveAttribute('aria-label', /create.*job/i);

      // Verify progress indicator
      const progressBar = page.locator('[role="progressbar"]');
      await expect(progressBar).toBeVisible();

      // Verify form fields have labels
      await page.click('text=Sarah Johnson');
      await page.click('button:has-text("Next")');

      const titleInput = page.locator('[name="title"]');
      await expect(titleInput).toHaveAttribute('aria-label');
    });
  });
});
