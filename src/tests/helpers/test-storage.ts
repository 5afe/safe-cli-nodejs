import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * CRITICAL: Test-safe storage helper
 *
 * This module ensures tests NEVER touch user's actual config files.
 * All tests MUST use isolated temporary directories.
 */

interface TestStorageContext {
  configDir: string
  dataDir: string
  cleanup: () => void
}

/**
 * Create isolated storage directories for testing
 * ALWAYS call cleanup() in afterEach to remove test data
 */
export function createTestStorage(prefix: string = 'safe-cli-test'): TestStorageContext {
  const configDir = mkdtempSync(join(tmpdir(), `${prefix}-config-`))
  const dataDir = mkdtempSync(join(tmpdir(), `${prefix}-data-`))

  // Verify we're in a temporary directory (safety check)
  if (!configDir.includes(tmpdir()) || !dataDir.includes(tmpdir())) {
    throw new Error('CRITICAL: Test storage must be in temp directory!')
  }

  const cleanup = () => {
    try {
      if (existsSync(configDir)) {
        rmSync(configDir, { recursive: true, force: true })
      }
      if (existsSync(dataDir)) {
        rmSync(dataDir, { recursive: true, force: true })
      }
    } catch (error) {
      console.warn('Failed to cleanup test directories:', error)
    }
  }

  return { configDir, dataDir, cleanup }
}

/**
 * DEPRECATED: Do NOT use this function
 * Backup user config before running tests that might delete data
 *
 * @deprecated This approach is dangerous. Use createTestStorage() instead.
 */
export function backupUserConfig(): string {
  throw new Error(
    'backupUserConfig is deprecated and unsafe. ' +
      'Use createTestStorage() to create isolated test directories instead.'
  )
}

/**
 * Guard against accidental production config modification
 */
export function enforceTestEnvironment(): void {
  // Check if we're in a test environment
  if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    throw new Error(
      'CRITICAL: Storage operations require NODE_ENV=test or VITEST environment. ' +
        'Never run tests without proper environment variables!'
    )
  }

  // Ensure XDG directories are set to temp directories (if set at all)
  const xdgConfig = process.env.XDG_CONFIG_HOME
  const xdgData = process.env.XDG_DATA_HOME

  if (xdgConfig && !xdgConfig.includes(tmpdir()) && !xdgConfig.includes('/tmp')) {
    throw new Error(`CRITICAL: XDG_CONFIG_HOME must point to temp directory, got: ${xdgConfig}`)
  }

  if (xdgData && !xdgData.includes(tmpdir()) && !xdgData.includes('/tmp')) {
    throw new Error(`CRITICAL: XDG_DATA_HOME must point to temp directory, got: ${xdgData}`)
  }
}

/**
 * Helper to safely cleanup test wallets/safes/transactions
 * ONLY use this with test storage created by createTestStorage()
 */
export function safeCleanupTestData(
  context: TestStorageContext,
  stores: {
    walletStorage?: { getAllWallets: () => unknown[]; removeWallet: (id: string) => void }
    safeStorage?: {
      getAllSafes: () => unknown[]
      removeSafe: (chainId: string, address: string) => void
    }
    transactionStore?: {
      getAllTransactions: () => unknown[]
      removeTransaction: (hash: string) => void
    }
    configStore?: { getAllChains: () => Record<string, unknown>; deleteChain: (id: string) => void }
  }
): void {
  // Verify we're working with test directories
  if (!context.configDir.includes(tmpdir())) {
    throw new Error('CRITICAL: Can only cleanup test storage, not production config!')
  }

  // Now safe to cleanup
  try {
    if (stores.walletStorage) {
      const wallets = stores.walletStorage.getAllWallets() as Array<{ id: string }>
      wallets.forEach((wallet) => {
        try {
          stores.walletStorage!.removeWallet(wallet.id)
        } catch {
          // Ignore
        }
      })
    }

    if (stores.safeStorage) {
      const safes = stores.safeStorage.getAllSafes() as Array<{ chainId: string; address: string }>
      safes.forEach((safe) => {
        try {
          stores.safeStorage!.removeSafe(safe.chainId, safe.address)
        } catch {
          // Ignore
        }
      })
    }

    if (stores.transactionStore) {
      const txs = stores.transactionStore.getAllTransactions() as Array<{ safeTxHash: string }>
      txs.forEach((tx) => {
        try {
          stores.transactionStore!.removeTransaction(tx.safeTxHash)
        } catch {
          // Ignore
        }
      })
    }

    if (stores.configStore) {
      const chainIds = Object.keys(stores.configStore.getAllChains())
      chainIds.forEach((chainId) => {
        try {
          stores.configStore!.deleteChain(chainId)
        } catch {
          // Ignore
        }
      })
    }
  } catch (error) {
    console.warn('Error during test cleanup:', error)
  }
}
