# Job Creation Wizard - Test Setup Guide

Complete guide for setting up and running the comprehensive test suite.

## 📦 Installation

### 1. Install Test Dependencies

```bash
npm install --save-dev \
  @testing-library/react@^14.0.0 \
  @testing-library/jest-dom@^6.0.0 \
  @testing-library/user-event@^14.0.0 \
  @testing-library/react-hooks@^8.0.1 \
  jest@^29.5.0 \
  jest-environment-jsdom@^29.5.0 \
  ts-jest@^29.1.0 \
  @types/jest@^29.5.0 \
  jest-axe@^8.0.0 \
  msw@^1.2.1 \
  @playwright/test@^1.40.0 \
  identity-obj-proxy@^3.0.0
```

### 2. Update package.json Scripts

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:a11y": "jest --testPathPattern=a11y",
    "test:performance": "jest --testPathPattern=performance",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:update-snapshots": "jest --updateSnapshot"
  }
}
```

## 🛠️ Configuration Files

The test suite includes the following configuration files:

### Created Files:

1. **`jest.config.js`** - Jest test runner configuration
2. **`playwright.config.ts`** - Playwright E2E test configuration
3. **`src/__tests__/setup/jest.setup.ts`** - Jest global setup
4. **`src/__tests__/setup/msw.setup.ts`** - MSW server setup
5. **`src/__tests__/__mocks__/handlers.ts`** - API mock handlers
6. **`src/__tests__/__mocks__/mockData.ts`** - Mock data factories
7. **`src/__tests__/utils/test-utils.tsx`** - Custom test utilities

## 🚀 Quick Start

### 1. Verify Installation

```bash
# Check Jest is installed
npx jest --version

# Check Playwright is installed
npx playwright --version
```

### 2. Install Playwright Browsers

```bash
npx playwright install
```

### 3. Run Your First Test

```bash
# Run all tests
npm test

# Run specific test file
npm test useJobCreationWizard.test

# Run tests in watch mode
npm run test:watch
```

## 📁 File Structure

```
pricing-tool-crm-wrap/
├── jest.config.js                          ✅ Created
├── playwright.config.ts                    ✅ Created
├── TEST_SETUP_GUIDE.md                     ✅ Created (this file)
├── src/
│   ├── __tests__/
│   │   ├── README.md                       ✅ Created
│   │   ├── setup/
│   │   │   ├── jest.setup.ts              ✅ Created
│   │   │   └── msw.setup.ts               ✅ Created
│   │   ├── __mocks__/
│   │   │   ├── handlers.ts                ✅ Created
│   │   │   ├── mockData.ts                ✅ Created
│   │   │   └── fileMock.js                ✅ Created
│   │   ├── utils/
│   │   │   └── test-utils.tsx             ✅ Created
│   │   ├── unit/
│   │   │   ├── hooks/
│   │   │   │   └── useJobCreationWizard.test.ts  ✅ Created
│   │   │   ├── components/
│   │   │   │   ├── steps/                 📝 To create
│   │   │   │   └── ui/                    📝 To create
│   │   │   ├── services/                  📝 To create
│   │   │   └── validation/                📝 To create
│   │   ├── integration/                   📝 To create
│   │   ├── e2e/                           📝 To create
│   │   ├── a11y/                          📝 To create
│   │   └── performance/                   📝 To create
```

## ✅ What's Included

### Completed Test Infrastructure:

1. **Jest Configuration**
   - TypeScript support via ts-jest
   - jsdom test environment
   - Coverage reporting (80%+ threshold)
   - Module path mapping
   - CSS/image mocking

2. **Playwright Configuration**
   - Multi-browser testing (Chrome, Firefox, Safari)
   - Mobile device emulation
   - Screenshot/video on failure
   - CI/CD optimizations

3. **MSW Setup**
   - Supabase API mocking
   - Request/response interception
   - Configurable handlers

4. **Mock Data Factories**
   - Customer factories
   - Job factories
   - Service factories
   - Complete wizard data generators

5. **Test Utilities**
   - Custom render with providers
   - Mock Supabase client
   - Async helpers
   - Form value extractors

6. **Comprehensive Hook Tests**
   - useJobCreationWizard - 50+ test cases
   - State management testing
   - Validation testing
   - LocalStorage persistence testing

## 📝 Creating Additional Tests

### Component Test Template

Create a new test file in `src/__tests__/unit/components/steps/`:

```typescript
/**
 * Unit Tests: CustomerSelectionStep
 */

import { render, screen, fireEvent, waitFor } from '@tests/utils/test-utils';
import { CustomerSelectionStep } from '@components/jobs/wizard/CustomerSelectionStep';
import { createMockCustomer } from '@tests/__mocks__/mockData';

describe('CustomerSelectionStep', () => {
  const mockProps = {
    customers: [createMockCustomer(), createMockCustomer()],
    selectedCustomer: null,
    onSelectCustomer: jest.fn(),
    onCreateCustomer: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render customer list', () => {
    const { getAllByTestId } = render(<CustomerSelectionStep {...mockProps} />);

    const customerCards = getAllByTestId('customer-card');
    expect(customerCards).toHaveLength(2);
  });

  it('should call onSelectCustomer when customer is clicked', () => {
    const { getByText } = render(<CustomerSelectionStep {...mockProps} />);

    fireEvent.click(getByText(mockProps.customers[0].customer_name));

    expect(mockProps.onSelectCustomer).toHaveBeenCalledWith(mockProps.customers[0]);
  });

  it('should filter customers based on search query', async () => {
    const { getByPlaceholderText, getAllByTestId } = render(
      <CustomerSelectionStep {...mockProps} />
    );

    const searchInput = getByPlaceholderText('Search customers...');
    fireEvent.change(searchInput, { target: { value: 'Sarah' } });

    await waitFor(() => {
      const visibleCards = getAllByTestId('customer-card');
      expect(visibleCards.length).toBeLessThan(2);
    });
  });
});
```

### Integration Test Template

Create a new test file in `src/__tests__/integration/`:

```typescript
/**
 * Integration Tests: Full Wizard Flow
 */

import { render, screen, fireEvent, waitFor } from '@tests/utils/test-utils';
import { JobCreationWizard } from '@components/jobs/JobCreationWizard';
import { server } from '@tests/__mocks__/handlers';
import { rest } from 'msw';

describe('Job Creation Wizard - Full Flow Integration', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    companyId: 'company-1',
    userId: 'user-1'
  };

  it('should complete full wizard flow and create job', async () => {
    const { getByText, getByLabelText, getByRole } = render(
      <JobCreationWizard {...mockProps} />
    );

    // Step 1: Select customer
    const customerCard = getByText('Sarah Johnson');
    fireEvent.click(customerCard);
    fireEvent.click(getByText('Next'));

    // Step 2: Enter job details
    fireEvent.change(getByLabelText('Job Title'), {
      target: { value: 'Backyard Patio Installation' }
    });
    fireEvent.change(getByLabelText('Service Address'), {
      target: { value: '123 Main St' }
    });
    fireEvent.click(getByText('Next'));

    // Step 3: Add services
    fireEvent.click(getByText('Manual Entry'));
    fireEvent.change(getByLabelText('Service Name'), {
      target: { value: 'Paver Patio' }
    });
    fireEvent.change(getByLabelText('Quantity'), {
      target: { value: '360' }
    });
    fireEvent.change(getByLabelText('Unit Price'), {
      target: { value: '85' }
    });
    fireEvent.click(getByText('Add Service'));
    fireEvent.click(getByText('Next'));

    // Step 4: Review
    expect(getByText('Estimated Total: $30,600')).toBeInTheDocument();
    fireEvent.click(getByText('Save as Quote'));

    // Verify job creation
    await waitFor(() => {
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });
});
```

### E2E Test Template

Create a new test file in `src/__tests__/e2e/`:

```typescript
/**
 * E2E Tests: Job Wizard Happy Path
 */

import { test, expect } from '@playwright/test';

test.describe('Job Creation Wizard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to jobs page
    await page.goto('http://localhost:5173/jobs');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should create new job successfully', async ({ page }) => {
    // Open wizard
    await page.click('text=Create Job');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Step 1: Customer selection
    await page.fill('[placeholder="Search customers..."]', 'Sarah');
    await page.click('text=Sarah Johnson');
    await page.click('text=Next');

    // Step 2: Job details
    await page.fill('[name="title"]', 'E2E Test Patio');
    await page.selectOption('[name="priority"]', 'normal');
    await page.click('text=Next');

    // Step 3: Services
    await page.click('text=Manual Entry');
    await page.fill('[name="serviceName"]', 'Paver Patio');
    await page.fill('[name="quantity"]', '360');
    await page.fill('[name="unitPrice"]', '85');
    await page.click('text=Add Service');
    await page.click('text=Next');

    // Step 4: Review
    await expect(page.locator('text=Estimated Total')).toBeVisible();
    await page.click('text=Save as Quote');

    // Verify success
    await expect(page.locator('text=Job created successfully')).toBeVisible({
      timeout: 10000
    });
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('text=Create Job');

    // Try to advance without selecting customer
    await page.click('text=Next');

    // Verify error message
    await expect(page.locator('text=Please select a customer')).toBeVisible();
  });
});
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Module Not Found Errors

**Problem**: `Cannot find module '@testing-library/react'`

**Solution**:
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

#### 2. TypeScript Errors in Tests

**Problem**: TypeScript cannot find test types

**Solution**: Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["jest", "@testing-library/jest-dom", "node"]
  }
}
```

#### 3. MSW Warnings

**Problem**: "Cannot find module 'msw' or its corresponding type declarations"

**Solution**:
```bash
npm install --save-dev msw @types/node
```

#### 4. Playwright Install Fails

**Problem**: Playwright browsers not installing

**Solution**:
```bash
# Install browsers with dependencies
npx playwright install --with-deps

# Or install specific browser
npx playwright install chromium
```

#### 5. Jest Coverage Not Generating

**Problem**: Coverage report empty or missing

**Solution**:
```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with coverage
npm test -- --coverage --verbose
```

## 📊 Viewing Test Results

### Coverage Report

After running `npm run test:coverage`, open the HTML report:

```bash
# macOS
open coverage/index.html

# Windows
start coverage/index.html

# Linux
xdg-open coverage/index.html
```

### Playwright Report

After running E2E tests:

```bash
npx playwright show-report
```

## 🎯 Next Steps

1. **Create remaining component tests** in `src/__tests__/unit/components/`
2. **Add integration tests** for external service integrations
3. **Write E2E test scenarios** for critical user paths
4. **Add accessibility tests** for all wizard steps
5. **Implement performance benchmarks**

## 📚 Additional Resources

- **Jest Best Practices**: https://jestjs.io/docs/getting-started
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Playwright Docs**: https://playwright.dev/docs/intro
- **MSW Documentation**: https://mswjs.io/docs/
- **jest-axe Guide**: https://github.com/nickcolley/jest-axe

## 🤝 Need Help?

- Review test examples in `src/__tests__/unit/hooks/useJobCreationWizard.test.ts`
- Check `src/__tests__/README.md` for comprehensive documentation
- Consult mock data factories in `src/__tests__/__mocks__/mockData.ts`

---

**Setup Status**: ✅ Core Infrastructure Complete
**Next Phase**: Component and Integration Test Creation
**Estimated Completion**: 2-3 hours for full test suite
