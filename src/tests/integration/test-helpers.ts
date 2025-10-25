import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Address } from 'viem'

/**
 * Creates a temporary directory for test isolation
 */
export function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'safe-cli-test-'))
}

/**
 * Cleans up temporary directory
 */
export function cleanupTempDir(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Test private key (DO NOT USE IN PRODUCTION)
 */
export const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

/**
 * Test addresses
 */
export const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address
export const TEST_SAFE_ADDRESS = '0x1234567890123456789012345678901234567890' as Address

/**
 * Test chain configuration
 */
export const TEST_CHAIN = {
  chainId: '1',
  name: 'Ethereum Mainnet',
  shortName: 'eth',
  rpcUrl: 'https://eth.llamarpc.com',
  transactionServiceUrl: 'https://safe-transaction-mainnet.safe.global',
  explorerUrl: 'https://etherscan.io',
}

/**
 * Mock Safe transaction hash
 */
export const TEST_SAFE_TX_HASH = '0x' + '1'.repeat(64)

/**
 * Test password
 */
export const TEST_PASSWORD = 'testpassword123'
