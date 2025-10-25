/**
 * Playwright Global Setup
 *
 * Runs once before all E2E tests
 * Sets up test environment, database seeds, etc.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright E2E Test Suite Setup...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to app
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';
    await page.goto(baseURL);

    // Wait for app to be ready
    await page.waitForLoadState('networkidle');

    // Optional: Seed test data, authenticate, etc.
    console.log('✅ Application is running and ready for tests');

    // Optional: Create test user session
    // const storageState = await page.context().storageState();
    // fs.writeFileSync('playwright/.auth/user.json', JSON.stringify(storageState));

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Playwright setup complete\n');
}

export default globalSetup;
