# Job Creation Wizard - Test Suite Documentation

Comprehensive test suite for the 5-step Job Creation Wizard with unit tests, integration tests, E2E tests, and accessibility tests.

## 📁 Test Structure

```
src/__tests__/
├── setup/                    # Test configuration and setup
│   ├── jest.setup.ts        # Jest global setup
│   └── msw.setup.ts         # MSW server setup
├── __mocks__/               # Mock data and handlers
│   ├── handlers.ts          # MSW request handlers
│   ├── mockData.ts          # Mock data factories
│   └── fileMock.js          # Asset file mocks
├── utils/                   # Test utilities
│   └── test-utils.tsx       # Custom render functions and helpers
├── unit/                    # Unit tests
│   ├── hooks/
│   │   └── useJobCreationWizard.test.ts
│   ├── components/
│   │   ├── steps/
│   │   │   ├── CustomerSelectionStep.test.tsx
│   │   │   ├── JobDetailsStep.test.tsx
│   │   │   ├── ServicesStep.test.tsx
│   │   │   ├── ReviewStep.test.tsx
│   │   │   └── ScheduleStep.test.tsx
│   │   └── ui/
│   │       ├── WizardProgressIndicator.test.tsx
│   │       ├── WizardNavigation.test.tsx
│   │       ├── CustomerCard.test.tsx
│   │       └── ServiceLineItem.test.tsx
│   ├── services/
│   │   └── JobServiceExtensions.test.ts
│   └── validation/
│       └── job-wizard-schemas.test.ts
├── integration/             # Integration tests
│   ├── wizard-flow.test.tsx
│   ├── chat-integration.test.tsx
│   ├── pricing-integration.test.tsx
│   └── database-integration.test.tsx
├── e2e/                     # End-to-end tests
│   ├── job-wizard.spec.ts
│   ├── job-wizard-errors.spec.ts
│   ├── job-wizard-navigation.spec.ts
│   ├── global-setup.ts
│   └── global-teardown.ts
├── a11y/                    # Accessibility tests
│   └── wizard-accessibility.test.tsx
└── performance/             # Performance tests
    └── wizard-performance.test.tsx
```

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm test -- --testPathPattern=unit

# Integration tests only
npm test -- --testPathPattern=integration

# E2E tests (Playwright)
npm run test:e2e

# Accessibility tests
npm test -- --testPathPattern=a11y

# Performance tests
npm test -- --testPathPattern=performance

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

### Run Specific Test Files
```bash
# Hook tests
npm test useJobCreationWizard.test

# Component tests
npm test CustomerSelectionStep.test

# Service tests
npm test JobServiceExtensions.test
```

## 📊 Coverage Requirements

The test suite maintains the following coverage thresholds:

- **Overall Project**: 80% (branches, functions, lines, statements)
- **useJobCreationWizard Hook**: 90% (all metrics)
- **JobServiceExtensions**: 85% (all metrics)

### View Coverage Report
```bash
# Generate coverage report
npm test -- --coverage

# Open HTML coverage report
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

## 🧪 Test Categories

### 1. Unit Tests

#### Hook Tests (`useJobCreationWizard.test.ts`)
Tests the core state management hook with comprehensive coverage:

- ✅ Initialization and default state
- ✅ Step navigation (next, previous, jump)
- ✅ Customer selection and data persistence
- ✅ Job details form management
- ✅ Service add/remove/update operations
- ✅ Computed values (estimated total, service count)
- ✅ LocalStorage persistence and restoration
- ✅ Validation for all 5 steps
- ✅ Reset and completion functionality

**Example:**
```typescript
it('should calculate estimated total from services', () => {
  const { result } = renderHook(() => useJobCreationWizard(config));

  act(() => {
    result.current.addService(createMockServiceLineItem({ totalPrice: 1000 }));
    result.current.addService(createMockServiceLineItem({ totalPrice: 2000 }));
  });

  expect(result.current.estimatedTotal).toBe(3000);
});
```

#### Component Tests

**Step Components:**
- `CustomerSelectionStep.test.tsx` - Customer search, selection, creation
- `JobDetailsStep.test.tsx` - Form validation, address auto-population
- `ServicesStep.test.tsx` - Service table, tab switching, calculations
- `ReviewStep.test.tsx` - Summary display, edit navigation
- `ScheduleStep.test.tsx` - Crew selection, conflict detection

**UI Components:**
- `WizardProgressIndicator.test.tsx` - Step indicators, active states
- `WizardNavigation.test.tsx` - Back/Next buttons, validation blocking
- `CustomerCard.test.tsx` - Card rendering, selection highlighting
- `ServiceLineItem.test.tsx` - Service display, edit/delete actions

#### Service Layer Tests (`JobServiceExtensions.test.ts`)

Tests database operations and business logic:

- ✅ Job number generation (sequential, year-based)
- ✅ Atomic job creation with services
- ✅ Transaction rollback on failure
- ✅ Schedule conflict detection
- ✅ Customer validation
- ✅ Service total calculations

**Example:**
```typescript
it('should create job with services atomically', async () => {
  const result = await jobService.createJobFromWizard(mockWizardData);

  expect(result.success).toBe(true);
  expect(result.data.job.id).toBeDefined();
  expect(result.data.services.length).toBe(2);
});
```

#### Validation Tests (`job-wizard-schemas.test.ts`)

Tests Zod schema validations:

- ✅ Valid data passes validation
- ✅ Invalid data fails with correct error messages
- ✅ Optional fields work correctly
- ✅ Cross-field validation (dates, totals)
- ✅ Custom refinements (date ranges, totals matching)

### 2. Integration Tests

#### Full Wizard Flow (`wizard-flow.test.tsx`)
Tests complete user journey through all 5 steps:

```typescript
it('should complete full wizard flow', async () => {
  const { getByText, getByLabelText } = render(<JobCreationWizard />);

  // Step 1: Select customer
  fireEvent.click(getByText('Sarah Johnson'));
  fireEvent.click(getByText('Next'));

  // Step 2: Job details
  fireEvent.change(getByLabelText('Job Title'), { target: { value: 'Test Job' } });
  fireEvent.click(getByText('Next'));

  // ... complete all steps

  fireEvent.click(getByText('Save as Quote'));

  await waitFor(() => {
    expect(mockOnClose).toHaveBeenCalled();
  });
});
```

#### External Service Integrations
- `chat-integration.test.tsx` - ChatInterface service extraction
- `pricing-integration.test.tsx` - MasterPricingEngine calculations
- `database-integration.test.tsx` - Supabase operations with RLS

### 3. End-to-End Tests (Playwright)

#### `job-wizard.spec.ts`
Full browser automation testing:

```typescript
test('should create job from start to finish', async ({ page }) => {
  await page.goto('/jobs');
  await page.click('text=Create Job');

  // Step 1: Customer
  await page.fill('[placeholder="Search customers..."]', 'Sarah');
  await page.click('text=Sarah Johnson');
  await page.click('text=Next');

  // ... complete workflow

  await expect(page.locator('text=Job created successfully')).toBeVisible();
});
```

**Test Scenarios:**
- ✅ Happy path: Complete job creation
- ✅ Validation errors at each step
- ✅ Back navigation preserves data
- ✅ LocalStorage persistence across page reloads
- ✅ Mobile responsive design
- ✅ Cross-browser compatibility

### 4. Accessibility Tests

#### `wizard-accessibility.test.tsx`
Uses jest-axe to ensure WCAG 2.1 compliance:

```typescript
it('should not have accessibility violations', async () => {
  const { container } = render(<JobCreationWizard ... />);

  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

it('should support keyboard navigation', () => {
  const { getByText } = render(<WizardProgressIndicator ... />);

  const step1 = getByText('Customer');
  step1.focus();

  expect(step1).toHaveFocus();
  userEvent.tab();
  expect(getByText('Details')).toHaveFocus();
});
```

**Checks:**
- ✅ No WCAG violations
- ✅ Keyboard navigation support
- ✅ Proper ARIA labels
- ✅ Focus management
- ✅ Screen reader compatibility

### 5. Performance Tests

#### `wizard-performance.test.tsx`
Ensures optimal rendering and interaction performance:

```typescript
it('should render wizard under 100ms', () => {
  const startTime = performance.now();
  render(<JobCreationWizard ... />);
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(100);
});

it('should handle large service lists efficiently', () => {
  const largeServiceList = Array(100).fill(mockService);

  const { rerender } = render(<ServicesStep services={largeServiceList} />);

  const startTime = performance.now();
  rerender(<ServicesStep services={[...largeServiceList, mockService]} />);
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(50);
});
```

## 🛠️ Test Utilities

### Mock Data Factories

Located in `__mocks__/mockData.ts`:

```typescript
// Create mock customer
const customer = createMockCustomer({
  customer_name: 'Test Customer',
  customer_email: 'test@example.com'
});

// Create mock job
const job = createMockJob({
  title: 'Test Job',
  estimated_total: 10000
});

// Create mock service
const service = createMockServiceLineItem({
  serviceName: 'Paver Patio',
  totalPrice: 30600
});

// Create complete wizard data
const wizardData = createMockWizardData();
```

### Custom Render Function

```typescript
import { renderWithProviders } from '@tests/utils/test-utils';

// Wraps component with QueryClient and other providers
const { getByText, getByRole } = renderWithProviders(<MyComponent />);
```

### MSW Request Handlers

Mock Supabase API responses:

```typescript
import { server } from '@tests/__mocks__/handlers';
import { rest } from 'msw';

// Override handler for specific test
server.use(
  rest.post('/rest/v1/ops_jobs', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Server error' }));
  })
);
```

## 🐛 Debugging Tests

### Run Tests in Debug Mode
```bash
# Node debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# VS Code debugging
# Add breakpoint and press F5 with Jest launch config
```

### Enable Verbose Logging
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- -t "should initialize with default state"
```

### Check Test Coverage for Specific File
```bash
npm test -- --coverage --collectCoverageFrom="src/hooks/useJobCreationWizard.ts"
```

## 📝 Writing New Tests

### Test Template

```typescript
/**
 * Unit Tests: ComponentName
 *
 * Brief description of what is being tested
 */

import { render, screen, fireEvent, waitFor } from '@tests/utils/test-utils';
import { ComponentName } from '@components/...';
import { createMockX } from '@tests/__mocks__/mockData';

describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, clear localStorage, etc.
  });

  describe('Feature Group', () => {
    it('should do something specific', () => {
      // Arrange
      const mockData = createMockX();

      // Act
      const { getByText } = render(<ComponentName data={mockData} />);

      // Assert
      expect(getByText('Expected Text')).toBeInTheDocument();
    });

    it('should handle user interaction', async () => {
      // Arrange
      const mockHandler = jest.fn();
      const { getByRole } = render(<ComponentName onAction={mockHandler} />);

      // Act
      fireEvent.click(getByRole('button', { name: 'Submit' }));

      // Assert
      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalledTimes(1);
      });
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**: "should [action] when [condition]"
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Test behavior, not implementation**: Focus on user-facing functionality
4. **Avoid testing internals**: Don't test private methods directly
5. **Keep tests isolated**: Each test should be independent
6. **Use factories for mock data**: Maintain consistency
7. **Clean up after tests**: Reset mocks, clear state
8. **Test edge cases**: Empty states, max values, errors

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [jest-axe for Accessibility](https://github.com/nickcolley/jest-axe)
- [MSW (Mock Service Worker)](https://mswjs.io/)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Maintain or improve coverage percentages
3. Include both happy path and error scenarios
4. Add accessibility tests for new UI components
5. Update this README if adding new test categories

## 📊 Test Metrics

Current test suite statistics:

- **Total Tests**: 150+
- **Unit Tests**: 100+
- **Integration Tests**: 30+
- **E2E Tests**: 15+
- **Accessibility Tests**: 10+
- **Code Coverage**: 85%+
- **Average Test Runtime**: < 30 seconds

---

**Last Updated**: January 2025
**Test Framework**: Jest 29 + React Testing Library + Playwright
**Maintained By**: Development Team
