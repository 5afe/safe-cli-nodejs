import { afterEach, beforeEach } from 'vitest'
import { restoreGlobalMocks, setupGlobalMocks } from './factories.js'

/**
 * Common test setup and teardown
 */

/**
 * Setup function to run before each test
 * Use this in your test files with: beforeEach(setupTest)
 */
export function setupTest() {
  setupGlobalMocks()
}

/**
 * Teardown function to run after each test
 * Use this in your test files with: afterEach(teardownTest)
 */
export function teardownTest() {
  restoreGlobalMocks()
}

/**
 * Auto-setup for all tests (optional)
 * Import this file in your test setup to automatically
 * apply setup/teardown to all tests
 */
export function autoSetup() {
  beforeEach(setupTest)
  afterEach(teardownTest)
}

/**
 * Clean up test storage (for integration tests)
 * This should be called in beforeEach/afterEach of integration tests
 * that interact with file storage
 */
export async function cleanTestStorage() {
  // Storage cleanup will be implemented when needed
  // This is a placeholder for future storage cleanup logic
}

/**
 * Wait for a condition to be true (useful for async tests)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number
    interval?: number
  } = {}
): Promise<void> {
  const timeout = options.timeout || 5000
  const interval = options.interval || 100
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Sleep for specified milliseconds (use sparingly in tests)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
