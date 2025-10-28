import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { SafeAccountStorage } from '../../storage/safe-store.js'
import { TEST_ADDRESS, TEST_SAFE_ADDRESS, TEST_CHAIN } from './test-helpers.js'
import type { Address } from 'viem'
import { createTestStorage } from '../helpers/test-storage.js'

describe('Account Integration Tests', () => {
  let safeStorage: SafeAccountStorage
  let testStorage: ReturnType<typeof createTestStorage>

  beforeEach(() => {
    // Create isolated test storage - NEVER touches user's actual config!
    testStorage = createTestStorage('account-integration')
    safeStorage = new SafeAccountStorage({ cwd: testStorage.configDir })
  })

  afterEach(() => {
    // Cleanup test directories
    testStorage.cleanup()
  })

  describe('Safe Storage Operations', () => {
    it('should create and retrieve Safe by address and chain', () => {
      safeStorage.createSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Test Safe',
      })

      const safe = safeStorage.getSafe(TEST_CHAIN.chainId, TEST_SAFE_ADDRESS)
      expect(safe).toBeDefined()
      expect(safe?.address).toBe(TEST_SAFE_ADDRESS)
      expect(safe?.name).toBe('Test Safe')
    })

    it('should update Safe information', () => {
      safeStorage.createSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Original Name',
      })

      safeStorage.updateSafe(TEST_CHAIN.chainId, TEST_SAFE_ADDRESS, {
        name: 'Updated Name',
      })

      const safe = safeStorage.getSafe(TEST_CHAIN.chainId, TEST_SAFE_ADDRESS)
      expect(safe?.name).toBe('Updated Name')
    })

    it('should remove Safe account', () => {
      safeStorage.createSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Test Safe',
      })

      safeStorage.removeSafe(TEST_CHAIN.chainId, TEST_SAFE_ADDRESS)

      const safe = safeStorage.getSafe(TEST_CHAIN.chainId, TEST_SAFE_ADDRESS)
      expect(safe).toBeUndefined()
    })

    it('should get all Safes for a chain', () => {
      safeStorage.createSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Safe 1',
      })

      safeStorage.createSafe({
        address: '0x2234567890123456789012345678901234567890' as Address,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Safe 2',
      })

      const safes = safeStorage.getSafesByChain(TEST_CHAIN.chainId)
      expect(safes.length).toBeGreaterThanOrEqual(2)
    })

    it('should get all Safes across all chains', () => {
      safeStorage.createSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: '1',
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Mainnet Safe',
      })

      safeStorage.createSafe({
        address: '0x2234567890123456789012345678901234567890' as Address,
        chainId: '137',
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Polygon Safe',
      })

      const allSafes = safeStorage.getAllSafes()
      expect(allSafes.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter Safes by chain', () => {
      safeStorage.createSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: '1',
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Mainnet Safe',
      })

      safeStorage.createSafe({
        address: '0x2234567890123456789012345678901234567890' as Address,
        chainId: '137',
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Polygon Safe',
      })

      const mainnetSafes = safeStorage.getSafesByChain('1')
      expect(mainnetSafes.length).toBeGreaterThanOrEqual(1)
      expect(mainnetSafes.some((s) => s.name === 'Mainnet Safe')).toBe(true)
    })

    it('should store multi-sig Safe with multiple owners', () => {
      const owners = [
        TEST_ADDRESS,
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
      ]

      safeStorage.createSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners,
        threshold: 2,
        name: 'Multi-sig Safe',
      })

      const safe = safeStorage.getSafe(TEST_CHAIN.chainId, TEST_SAFE_ADDRESS)
      expect(safe?.owners).toHaveLength(3)
      expect(safe?.threshold).toBe(2)
    })

    it('should return empty array when no Safes exist', () => {
      const safes = safeStorage.getAllSafes()
      expect(safes).toHaveLength(0)
    })

    it('should return undefined for non-existent Safe', () => {
      const safe = safeStorage.getSafe(
        TEST_CHAIN.chainId,
        '0x9999999999999999999999999999999999999999' as Address
      )
      expect(safe).toBeUndefined()
    })

    it('should check if Safe exists', () => {
      safeStorage.createSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Test Safe',
      })

      expect(safeStorage.safeExists(TEST_CHAIN.chainId, TEST_SAFE_ADDRESS)).toBe(true)
      expect(
        safeStorage.safeExists(TEST_CHAIN.chainId, '0x9999999999999999999999999999999999999999')
      ).toBe(false)
    })
  })

  describe('Safe Configuration Persistence', () => {
    it('should persist Safe across instances', () => {
      safeStorage.createSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Test Safe',
      })

      // Create new instance pointing to same test directory
      const newSafeStorage = new SafeAccountStorage({ cwd: testStorage.configDir })
      const safe = newSafeStorage.getSafe(TEST_CHAIN.chainId, TEST_SAFE_ADDRESS)

      expect(safe).toBeDefined()
      expect(safe?.name).toBe('Test Safe')

      // Cleanup
      newSafeStorage.removeSafe(TEST_CHAIN.chainId, TEST_SAFE_ADDRESS)
    })
  })
})
