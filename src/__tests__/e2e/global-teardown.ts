/**
 * Playwright Global Teardown
 *
 * Runs once after all E2E tests
 * Cleans up test environment, test data, etc.
 */

async function globalTeardown() {
  console.log('\n🧹 Starting Playwright E2E Test Suite Teardown...');

  try {
    // Optional: Clean up test data from database
    // await cleanupTestData();

    // Optional: Remove test user sessions
    // fs.rmSync('playwright/.auth', { recursive: true, force: true });

    console.log('✅ Teardown complete');
  } catch (error) {
    console.error('⚠️  Teardown warning:', error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}

export default globalTeardown;
