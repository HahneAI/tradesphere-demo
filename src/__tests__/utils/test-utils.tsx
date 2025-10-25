/**
 * Test Utilities
 *
 * Custom render functions, test helpers, and utilities
 * Provides wrapped components with all necessary providers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react-dom/test-utils';

// ===== QUERY CLIENT SETUP =====

/**
 * Create a fresh Query Client for each test
 * Disables retries and caching for predictable test behavior
 */
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false
      },
      mutations: {
        retry: false
      }
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    }
  });
};

// ===== PROVIDERS WRAPPER =====

interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component with all providers needed for testing
 */
const AllProviders: React.FC<AllProvidersProps> = ({ children, queryClient }) => {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

// ===== CUSTOM RENDER FUNCTION =====

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that includes all providers
 *
 * @example
 * const { getByText } = renderWithProviders(<MyComponent />);
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult => {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>
        {children}
      </AllProviders>
    ),
    ...renderOptions
  });
};

// ===== TEST HELPERS =====

/**
 * Wait for a condition to be true
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> => {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
};

/**
 * Simulate user typing with realistic timing
 */
export const typeWithDelay = async (
  element: HTMLElement,
  text: string,
  delayMs = 50
): Promise<void> => {
  const { fireEvent } = await import('@testing-library/react');

  for (const char of text) {
    await act(async () => {
      fireEvent.change(element, {
        target: { value: (element as HTMLInputElement).value + char }
      });
      await new Promise(resolve => setTimeout(resolve, delayMs));
    });
  }
};

/**
 * Mock Supabase client for tests
 */
export const createMockSupabaseClient = () => {
  const mockSelect = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnThis();
  const mockUpdate = jest.fn().mockReturnThis();
  const mockDelete = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  const mockNeq = jest.fn().mockReturnThis();
  const mockLike = jest.fn().mockReturnThis();
  const mockOr = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockReturnThis();
  const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });

  const mockFrom = jest.fn((table: string) => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    neq: mockNeq,
    like: mockLike,
    or: mockOr,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle
  }));

  return {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
        error: null
      })
    },
    mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      neq: mockNeq,
      like: mockLike,
      or: mockOr,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle
    }
  };
};

/**
 * Create mock localStorage
 */
export const createMockLocalStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    getStore: () => ({ ...store })
  };
};

/**
 * Advance timers and flush promises
 */
export const flushPromises = async (): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

/**
 * Create a deferred promise for testing async behavior
 */
export const createDeferred = <T = any>() => {
  let resolve: (value: T) => void;
  let reject: (error: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!
  };
};

/**
 * Create a mock file for upload tests
 */
export const createMockFile = (
  name: string,
  size: number,
  type: string
): File => {
  const blob = new Blob(['a'.repeat(size)], { type });
  return new File([blob], name, { type });
};

/**
 * Get form values from a form element
 */
export const getFormValues = (form: HTMLFormElement): Record<string, any> => {
  const formData = new FormData(form);
  const values: Record<string, any> = {};

  formData.forEach((value, key) => {
    values[key] = value;
  });

  return values;
};

/**
 * Assert that an element is visible and in the document
 */
export const assertElementVisible = (element: HTMLElement | null): void => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

/**
 * Assert that an element has specific attributes
 */
export const assertElementAttributes = (
  element: HTMLElement,
  attributes: Record<string, string>
): void => {
  Object.entries(attributes).forEach(([key, value]) => {
    expect(element).toHaveAttribute(key, value);
  });
};

/**
 * Find element by test ID
 */
export const getByTestId = (container: HTMLElement, testId: string): HTMLElement => {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Unable to find element with data-testid="${testId}"`);
  }
  return element as HTMLElement;
};

/**
 * Suppress console errors/warnings during a test
 */
export const suppressConsole = (
  callback: () => void | Promise<void>,
  methods: Array<'log' | 'warn' | 'error' | 'info'> = ['error', 'warn']
): Promise<void> | void => {
  const originalMethods: Record<string, any> = {};

  methods.forEach(method => {
    originalMethods[method] = console[method];
    console[method] = jest.fn();
  });

  const result = callback();

  const restore = () => {
    methods.forEach(method => {
      console[method] = originalMethods[method];
    });
  };

  if (result instanceof Promise) {
    return result.finally(restore);
  }

  restore();
};

// ===== RE-EXPORTS =====

export * from '@testing-library/react';
export { act } from 'react-dom/test-utils';
export { renderWithProviders as render };
