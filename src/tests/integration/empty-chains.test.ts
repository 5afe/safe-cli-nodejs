import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigStore } from '../../storage/config-store.js'
import { SafeAccountStorage } from '../../storage/safe-store.js'
import { TransactionStore } from '../../storage/transaction-store.js'
import { createTestStorage } from '../helpers/test-storage.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import type { Address } from 'viem'

/**
 * Integration tests to verify commands work with default chains
 *
 * This tests the scenario where:
 * 1. A user has Safes in storage
 * 2. Default chains are always available
 * 3. Commands gracefully use defaults without requiring config init
 */
describe('Commands with default chains configuration', () => {
  let testStorage: ReturnType<typeof createTestStorage>
  let configStore: ConfigStore
  let safeStorage: SafeAccountStorage
  let transactionStore: TransactionStore

  beforeEach(() => {
    testStorage = createTestStorage('empty-chains-test')
    configStore = new ConfigStore({ cwd: testStorage.configDir, projectName: 'test-empty-chains' })
    safeStorage = new SafeAccountStorage({ cwd: testStorage.dataDir })
    transactionStore = new TransactionStore({ cwd: testStorage.dataDir })
  })

  afterEach(() => {
    testStorage.cleanup()
  })

  describe('formatSafeAddress with default chains', () => {
    it('should use EIP-3770 format with default chains', () => {
      const address: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const chainId = '1'
      const chains = configStore.getAllChains()

      const result = formatSafeAddress(address, chainId, chains)

      // Should use EIP-3770 format (eth:0x...) since chain '1' exists in defaults
      expect(result).toBe(`eth:${address}`)
    })

    it('should use fallback format when chain is not found', () => {
      const address: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const chainId = '999999'
      const chains = {
        '1': {
          chainId: '1',
          name: 'Ethereum',
          shortName: 'eth',
          rpcUrl: 'https://eth.drpc.org',
          explorerUrl: 'https://etherscan.io',
          currency: 'ETH',
        },
      }

      const result = formatSafeAddress(address, chainId, chains)

      expect(result).toBe(`chain:999999:${address}`)
    })
  })

  describe('Safe operations with no chains configured', () => {
    it('should allow retrieving Safes when chains are removed', () => {
      // First add a Safe with a chain ID
      const safeAddress: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const chainId = '1'

      safeStorage.createSafe({
        name: 'Test Safe',
        address: safeAddress,
        chainId,
        deployed: true,
      })

      // Remove all chains from config
      const chains = configStore.getAllChains()
      Object.keys(chains).forEach((id) => {
        configStore.deleteChain(id)
      })

      // Should still be able to retrieve the Safe
      const safe = safeStorage.getSafe(chainId, safeAddress)
      expect(safe).toBeDefined()
      expect(safe?.address).toBe(safeAddress)

      // Should be able to get all Safes
      const allSafes = safeStorage.getAllSafes()
      expect(allSafes).toHaveLength(1)
      expect(allSafes[0].address).toBe(safeAddress)
    })

    it('should format Safe addresses with EIP-3770 format using defaults', () => {
      const safeAddress: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const chainId = '1'

      safeStorage.createSafe({
        name: 'Test Safe',
        address: safeAddress,
        chainId,
        deployed: true,
      })

      // Get chains - should always include defaults
      const chains = configStore.getAllChains()
      expect(Object.keys(chains).length).toBeGreaterThan(0)

      // Should format with EIP-3770 (using default chain shortName)
      const formatted = formatSafeAddress(safeAddress, chainId, chains)
      expect(formatted).toBe(`eth:${safeAddress}`)
    })

    it('should list all Safes with proper EIP-3770 formatting', () => {
      // Add multiple Safes with different chains
      const safe1: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const safe2: Address = '0x1234567890123456789012345678901234567890'

      safeStorage.createSafe({
        name: 'Safe 1',
        address: safe1,
        chainId: '1',
        deployed: true,
      })

      safeStorage.createSafe({
        name: 'Safe 2',
        address: safe2,
        chainId: '137',
        deployed: false,
      })

      // Should still list all Safes
      const allSafes = safeStorage.getAllSafes()
      expect(allSafes).toHaveLength(2)

      // Should be able to format both addresses with EIP-3770 using default chains
      const chains = configStore.getAllChains()
      const formatted1 = formatSafeAddress(safe1, '1', chains)
      const formatted2 = formatSafeAddress(safe2, '137', chains)

      expect(formatted1).toBe(`eth:${safe1}`) // Chain 1 = Ethereum
      expect(formatted2).toBe(`matic:${safe2}`) // Chain 137 = Polygon
    })
  })

  describe('Transaction operations with default chains', () => {
    it('should list transactions with proper EIP-3770 formatting', () => {
      const safeAddress: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const chainId = '1'

      // Add a Safe and transaction
      safeStorage.createSafe({
        name: 'Test Safe',
        address: safeAddress,
        chainId,
        deployed: true,
      })

      transactionStore.createTransaction(
        '0xabcd1234',
        safeAddress,
        chainId,
        {
          to: '0x1234567890123456789012345678901234567890' as Address,
          value: '0',
          data: '0x' as `0x${string}`,
          operation: 0,
        },
        '0x9876543210987654321098765432109876543210' as Address
      )

      // Should still list transactions
      const allTransactions = transactionStore.getAllTransactions()
      expect(allTransactions).toHaveLength(1)
      expect(allTransactions[0].chainId).toBe(chainId)

      // Should format Safe address with EIP-3770 using default chains
      const chains = configStore.getAllChains()
      const formatted = formatSafeAddress(safeAddress, chainId, chains)
      expect(formatted).toBe(`eth:${safeAddress}`)
    })
  })

  describe('Edge cases', () => {
    it('should always have default chains available', () => {
      // Even without explicit configuration, default chains should be available
      const chains = configStore.getAllChains()
      expect(Object.keys(chains).length).toBeGreaterThan(0)
      expect(chains['1']).toBeDefined() // Ethereum mainnet
      expect(chains['1'].shortName).toBe('eth')

      // Should not throw when formatting addresses
      const address: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      expect(() => {
        formatSafeAddress(address, '1', chains)
      }).not.toThrow()
    })

    it('should handle unknown chains with fallback format', () => {
      const chains = configStore.getAllChains()

      // Should use fallback for unknown chain
      const address: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const formatted = formatSafeAddress(address, '999999', chains)
      expect(formatted).toBe(`chain:999999:${address}`)

      // Should use EIP-3770 format for known chain
      const formatted2 = formatSafeAddress(address, '1', chains)
      expect(formatted2).toBe(`eth:${address}`)
    })
  })
})
