import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigStore } from '../../storage/config-store.js'
import { SafeAccountStorage } from '../../storage/safe-store.js'
import { TransactionStore } from '../../storage/transaction-store.js'
import { createTestStorage } from '../helpers/test-storage.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import type { Address } from 'viem'

/**
 * Integration tests to verify commands don't crash when chains aren't configured
 *
 * This tests the critical scenario where:
 * 1. A user has Safes in storage
 * 2. Chains are removed or not configured
 * 3. Commands should gracefully handle missing chain configs
 */
describe('Commands with empty chains configuration', () => {
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

  describe('formatSafeAddress with empty chains', () => {
    it('should use fallback format when chains are empty', () => {
      const address: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const chainId = '1'
      const emptyChains = {}

      const result = formatSafeAddress(address, chainId, emptyChains)

      expect(result).toBe(`chain:1:${address}`)
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

    it('should format Safe addresses with fallback when chains are empty', () => {
      const safeAddress: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const chainId = '1'

      safeStorage.createSafe({
        name: 'Test Safe',
        address: safeAddress,
        chainId,
        deployed: true,
      })

      // Remove all chains
      const chains = configStore.getAllChains()
      Object.keys(chains).forEach((id) => {
        configStore.deleteChain(id)
      })

      const emptyChains = configStore.getAllChains()
      expect(Object.keys(emptyChains)).toHaveLength(0)

      // Should format with fallback
      const formatted = formatSafeAddress(safeAddress, chainId, emptyChains)
      expect(formatted).toBe(`chain:1:${safeAddress}`)
    })

    it('should list all Safes even when their chains are missing', () => {
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

      // Remove all chains
      const chains = configStore.getAllChains()
      Object.keys(chains).forEach((id) => {
        configStore.deleteChain(id)
      })

      // Should still list all Safes
      const allSafes = safeStorage.getAllSafes()
      expect(allSafes).toHaveLength(2)

      // Should be able to format both addresses with fallback
      const emptyChains = configStore.getAllChains()
      const formatted1 = formatSafeAddress(safe1, '1', emptyChains)
      const formatted2 = formatSafeAddress(safe2, '137', emptyChains)

      expect(formatted1).toBe(`chain:1:${safe1}`)
      expect(formatted2).toBe(`chain:137:${safe2}`)
    })
  })

  describe('Transaction operations with no chains configured', () => {
    it('should list transactions when chains are missing', () => {
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

      // Remove all chains
      const chains = configStore.getAllChains()
      Object.keys(chains).forEach((id) => {
        configStore.deleteChain(id)
      })

      // Should still list transactions
      const allTransactions = transactionStore.getAllTransactions()
      expect(allTransactions).toHaveLength(1)
      expect(allTransactions[0].chainId).toBe(chainId)

      // Should format Safe address with fallback
      const emptyChains = configStore.getAllChains()
      const formatted = formatSafeAddress(safeAddress, chainId, emptyChains)
      expect(formatted).toBe(`chain:1:${safeAddress}`)
    })
  })

  describe('Edge cases', () => {
    it('should handle getAllChains returning empty object', () => {
      const chains = configStore.getAllChains()
      Object.keys(chains).forEach((id) => {
        configStore.deleteChain(id)
      })

      const emptyChains = configStore.getAllChains()
      expect(emptyChains).toEqual({})
      expect(Object.keys(emptyChains)).toHaveLength(0)

      // Should not throw when formatting addresses
      const address: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      expect(() => {
        formatSafeAddress(address, '1', emptyChains)
      }).not.toThrow()
    })

    it('should handle partially configured chains', () => {
      // Remove all chains except one
      const chains = configStore.getAllChains()
      const chainIds = Object.keys(chains)

      // Keep only the first chain
      for (let i = 1; i < chainIds.length; i++) {
        configStore.deleteChain(chainIds[i])
      }

      const remainingChains = configStore.getAllChains()
      expect(Object.keys(remainingChains)).toHaveLength(1)

      // Should use fallback for missing chain
      const address: Address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      const formatted = formatSafeAddress(address, '999999', remainingChains)
      expect(formatted).toBe(`chain:999999:${address}`)

      // Should use proper format for existing chain
      const existingChainId = Object.keys(remainingChains)[0]
      const formatted2 = formatSafeAddress(address, existingChainId, remainingChains)
      expect(formatted2).toContain(':')
      expect(formatted2).toContain(address)
    })
  })
})
