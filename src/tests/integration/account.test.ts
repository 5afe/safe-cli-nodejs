import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { SafeAccountStorage } from '../../storage/safe-store.js'
import { WalletStorageService } from '../../storage/wallet-store.js'
import { ConfigStore } from '../../storage/config-store.js'
import {
  createTempDir,
  cleanupTempDir,
  TEST_PRIVATE_KEY,
  TEST_PASSWORD,
  TEST_ADDRESS,
  TEST_SAFE_ADDRESS,
  TEST_CHAIN,
} from './test-helpers.js'
import type { Address } from 'viem'

describe('Account Integration Tests', () => {
  let tempDir: string
  let safeStorage: SafeAccountStorage
  let walletStorage: WalletStorageService
  let configStore: ConfigStore

  beforeEach(() => {
    tempDir = createTempDir()
    safeStorage = new SafeAccountStorage(tempDir)
    walletStorage = new WalletStorageService(tempDir)
    configStore = new ConfigStore(tempDir)

    // Setup test wallet and config
    walletStorage.setPassword(TEST_PASSWORD)
    walletStorage.importWallet(TEST_PRIVATE_KEY, 'Test Wallet')
    walletStorage.setActiveWallet(TEST_ADDRESS)
    configStore.addChain(TEST_CHAIN)
  })

  afterEach(() => {
    cleanupTempDir(tempDir)
  })

  describe('Safe Storage Operations', () => {
    it('should add and retrieve Safe by address and chain', () => {
      safeStorage.addSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Test Safe',
      })

      const safe = safeStorage.getSafe(TEST_SAFE_ADDRESS, TEST_CHAIN.chainId)
      expect(safe).not.toBeNull()
      expect(safe?.address).toBe(TEST_SAFE_ADDRESS)
      expect(safe?.name).toBe('Test Safe')
    })

    it('should update Safe information', () => {
      safeStorage.addSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Original Name',
      })

      safeStorage.addSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Updated Name',
      })

      const safe = safeStorage.getSafe(TEST_SAFE_ADDRESS, TEST_CHAIN.chainId)
      expect(safe?.name).toBe('Updated Name')
    })

    it('should remove Safe account', () => {
      safeStorage.addSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Test Safe',
      })

      safeStorage.removeSafe(TEST_SAFE_ADDRESS, TEST_CHAIN.chainId)

      const safe = safeStorage.getSafe(TEST_SAFE_ADDRESS, TEST_CHAIN.chainId)
      expect(safe).toBeNull()
    })

    it('should get all Safes for a chain', () => {
      safeStorage.addSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Safe 1',
      })

      safeStorage.addSafe({
        address: '0x2234567890123456789012345678901234567890' as Address,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Safe 2',
      })

      const safes = safeStorage.getSafesByChain(TEST_CHAIN.chainId)
      expect(safes).toHaveLength(2)
    })

    it('should get all Safes across all chains', () => {
      safeStorage.addSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: '1',
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Mainnet Safe',
      })

      safeStorage.addSafe({
        address: '0x2234567890123456789012345678901234567890' as Address,
        chainId: '137',
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Polygon Safe',
      })

      const allSafes = safeStorage.getAllSafes()
      expect(allSafes).toHaveLength(2)
    })

    it('should filter Safes by chain', () => {
      safeStorage.addSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: '1',
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Mainnet Safe',
      })

      safeStorage.addSafe({
        address: '0x2234567890123456789012345678901234567890' as Address,
        chainId: '137',
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Polygon Safe',
      })

      const mainnetSafes = safeStorage.getSafesByChain('1')
      expect(mainnetSafes).toHaveLength(1)
      expect(mainnetSafes[0].name).toBe('Mainnet Safe')
    })

    it('should store multi-sig Safe with multiple owners', () => {
      const owners = [
        TEST_ADDRESS,
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
      ]

      safeStorage.addSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners,
        threshold: 2,
        name: 'Multi-sig Safe',
      })

      const safe = safeStorage.getSafe(TEST_SAFE_ADDRESS, TEST_CHAIN.chainId)
      expect(safe?.owners).toHaveLength(3)
      expect(safe?.threshold).toBe(2)
    })

    it('should return empty array when no Safes exist', () => {
      const safes = safeStorage.getAllSafes()
      expect(safes).toHaveLength(0)
    })

    it('should return null for non-existent Safe', () => {
      const safe = safeStorage.getSafe('0x9999999999999999999999999999999999999999' as Address, TEST_CHAIN.chainId)
      expect(safe).toBeNull()
    })
  })

  describe('Safe Configuration Persistence', () => {
    it('should persist Safe across instances', () => {
      safeStorage.addSafe({
        address: TEST_SAFE_ADDRESS,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Test Safe',
      })

      // Create new instance with same directory
      const newSafeStorage = new SafeAccountStorage(tempDir)
      const safe = newSafeStorage.getSafe(TEST_SAFE_ADDRESS, TEST_CHAIN.chainId)

      expect(safe).not.toBeNull()
      expect(safe?.name).toBe('Test Safe')
    })

    it('should handle Safe address case-insensitivity correctly', () => {
      const lowerCase = TEST_SAFE_ADDRESS.toLowerCase() as Address
      safeStorage.addSafe({
        address: lowerCase,
        chainId: TEST_CHAIN.chainId,
        owners: [TEST_ADDRESS],
        threshold: 1,
        name: 'Test Safe',
      })

      const safe = safeStorage.getSafe(TEST_SAFE_ADDRESS, TEST_CHAIN.chainId)
      expect(safe).not.toBeNull()
    })
  })
})
