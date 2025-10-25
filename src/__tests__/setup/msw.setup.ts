/**
 * MSW (Mock Service Worker) Setup
 *
 * Configures API mocking for tests using MSW
 * Intercepts HTTP requests to Supabase and external APIs
 */

import { setupServer } from 'msw/node';
import { handlers } from '../__mocks__/handlers';

// Setup MSW server with default handlers
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Export server for test-specific handler overrides
export { server as mswServer };
