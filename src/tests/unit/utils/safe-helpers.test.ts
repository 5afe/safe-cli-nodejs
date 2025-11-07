import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  selectDeployedSafe,
  fetchSafeOwnersAndThreshold,
  ensureWalletIsOwner,
  parseAddressInput,
  selectTransaction,
} from '../../../utils/safe-helpers.js'
import * as p from '@clack/prompts'
import type { SafeAccountStorage } from '../../../storage/safe-store.js'
import type { ConfigStore } from '../../../storage/config-store.js'
import type { TransactionStore } from '../../../storage/transaction-store.js'
import type { SafeAccount } from '../../../types/safe.js'
import type { ChainConfig } from '../../../types/config.js'
import type { Wallet } from '../../../types/wallet.js'
import type { StoredTransaction } from '../../../types/transaction.js'
import { TEST_ADDRESSES, TEST_CHAINS } from '../../fixtures/index.js'
import type { Address } from 'viem'

// Mock modules
vi.mock('@clack/prompts')
vi.mock('../../../services/transaction-service.js')

describe('safe-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('selectDeployedSafe', () => {
    it('should return selected safe when available', async () => {
      const mockSafe: SafeAccount = {
        name: 'My Safe',
        address: TEST_ADDRESSES.safe1,
        chainId: '1',
        deployed: true,
        threshold: 1,
        owners: [TEST_ADDRESSES.owner1],
      }

      const mockStorage = {
        getAllSafes: vi.fn(() => [mockSafe]),
      } as unknown as SafeAccountStorage

      const mockConfigStore = {
        getChain: vi.fn(() => TEST_CHAINS.ethereum),
      } as unknown as ConfigStore

      const chains = { '1': TEST_CHAINS.ethereum }

      vi.mocked(p.select).mockResolvedValue(`1:${TEST_ADDRESSES.safe1}`)
      vi.mocked(p.isCancel).mockReturnValue(false)

      const result = await selectDeployedSafe(mockStorage, mockConfigStore, chains)
      expect(result).toEqual({
        chainId: '1',
        address: TEST_ADDRESSES.safe1,
      })
      expect(p.select).toHaveBeenCalled()
    })

    it('should return null when no deployed safes found', async () => {
      const mockStorage = {
        getAllSafes: vi.fn(() => []),
      } as unknown as SafeAccountStorage

      const mockConfigStore = {} as ConfigStore
      const chains = {}

      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.cancel).mockImplementation(() => {})

      const result = await selectDeployedSafe(mockStorage, mockConfigStore, chains)
      expect(result).toBeNull()
      expect(p.log.error).toHaveBeenCalledWith('No deployed Safes found')
      expect(p.cancel).toHaveBeenCalled()
    })

    it('should return null when selection is cancelled', async () => {
      const mockSafe: SafeAccount = {
        name: 'My Safe',
        address: TEST_ADDRESSES.safe1,
        chainId: '1',
        deployed: true,
        threshold: 1,
        owners: [TEST_ADDRESSES.owner1],
      }

      const mockStorage = {
        getAllSafes: vi.fn(() => [mockSafe]),
      } as unknown as SafeAccountStorage

      const mockConfigStore = {
        getChain: vi.fn(() => TEST_CHAINS.ethereum),
      } as unknown as ConfigStore

      const chains = { '1': TEST_CHAINS.ethereum }

      const cancelSymbol = Symbol('cancel')
      vi.mocked(p.select).mockResolvedValue(cancelSymbol)
      vi.mocked(p.isCancel).mockReturnValue(true)
      vi.mocked(p.cancel).mockImplementation(() => {})

      const result = await selectDeployedSafe(mockStorage, mockConfigStore, chains)
      expect(result).toBeNull()
      expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
    })

    it('should filter out non-deployed safes', async () => {
      const deployedSafe: SafeAccount = {
        name: 'Deployed Safe',
        address: TEST_ADDRESSES.safe1,
        chainId: '1',
        deployed: true,
        threshold: 1,
        owners: [TEST_ADDRESSES.owner1],
      }

      const nonDeployedSafe: SafeAccount = {
        name: 'Not Deployed',
        address: TEST_ADDRESSES.owner2,
        chainId: '1',
        deployed: false,
        threshold: 1,
        owners: [TEST_ADDRESSES.owner1],
      }

      const mockStorage = {
        getAllSafes: vi.fn(() => [deployedSafe, nonDeployedSafe]),
      } as unknown as SafeAccountStorage

      const mockConfigStore = {
        getChain: vi.fn(() => TEST_CHAINS.ethereum),
      } as unknown as ConfigStore

      const chains = { '1': TEST_CHAINS.ethereum }

      vi.mocked(p.select).mockResolvedValue(`1:${TEST_ADDRESSES.safe1}`)
      vi.mocked(p.isCancel).mockReturnValue(false)

      await selectDeployedSafe(mockStorage, mockConfigStore, chains)

      // Verify only deployed safe is in options
      const selectCall = vi.mocked(p.select).mock.calls[0][0]
      expect(selectCall.options).toHaveLength(1)
      expect(selectCall.options[0].label).toContain('Deployed Safe')
    })
  })

  describe('fetchSafeOwnersAndThreshold', () => {
    it('should return owners and threshold on success', async () => {
      const mockChain: ChainConfig = TEST_CHAINS.ethereum
      const mockOwners = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2]
      const mockThreshold = 2

      const mockSpinner = {
        start: vi.fn(),
        stop: vi.fn(),
      }
      vi.mocked(p.spinner).mockReturnValue(mockSpinner as any)

      const { TransactionService } = await import('../../../services/transaction-service.js')
      vi.mocked(TransactionService).mockImplementation(
        () =>
          ({
            getOwners: vi.fn().mockResolvedValue(mockOwners),
            getThreshold: vi.fn().mockResolvedValue(mockThreshold),
          }) as any
      )

      const result = await fetchSafeOwnersAndThreshold(mockChain, TEST_ADDRESSES.safe1)
      expect(result).toEqual({ owners: mockOwners, threshold: mockThreshold })
      expect(mockSpinner.start).toHaveBeenCalled()
      expect(mockSpinner.stop).toHaveBeenCalledWith('Safe information fetched')
    })

    it('should return null and log error on failure', async () => {
      const mockChain: ChainConfig = TEST_CHAINS.ethereum

      const mockSpinner = {
        start: vi.fn(),
        stop: vi.fn(),
      }
      vi.mocked(p.spinner).mockReturnValue(mockSpinner as any)
      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})

      const { TransactionService } = await import('../../../services/transaction-service.js')
      vi.mocked(TransactionService).mockImplementation(
        () =>
          ({
            getOwners: vi.fn().mockRejectedValue(new Error('Network error')),
            getThreshold: vi.fn().mockResolvedValue(1),
          }) as any
      )

      const result = await fetchSafeOwnersAndThreshold(mockChain, TEST_ADDRESSES.safe1)
      expect(result).toBeNull()
      expect(mockSpinner.stop).toHaveBeenCalledWith('Failed to fetch Safe information')
      expect(p.log.error).toHaveBeenCalled()
      expect(p.outro).toHaveBeenCalledWith('Failed')
    })
  })

  describe('ensureWalletIsOwner', () => {
    it('should return true when wallet is an owner', () => {
      const wallet: Wallet = {
        name: 'test-wallet',
        address: TEST_ADDRESSES.owner1,
        encryptedPrivateKey: 'encrypted',
        type: 'private-key',
      }
      const owners = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2]

      const result = ensureWalletIsOwner(wallet, owners)
      expect(result).toBe(true)
    })

    it('should handle case-insensitive address comparison', () => {
      const wallet: Wallet = {
        name: 'test-wallet',
        address: TEST_ADDRESSES.owner1.toUpperCase() as Address,
        encryptedPrivateKey: 'encrypted',
        type: 'private-key',
      }
      const owners = [TEST_ADDRESSES.owner1.toLowerCase() as Address, TEST_ADDRESSES.owner2]

      const result = ensureWalletIsOwner(wallet, owners)
      expect(result).toBe(true)
    })

    it('should return false and log error when wallet is not an owner', () => {
      const wallet: Wallet = {
        name: 'test-wallet',
        address: TEST_ADDRESSES.safe1,
        encryptedPrivateKey: 'encrypted',
        type: 'private-key',
      }
      const owners = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2]

      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})

      const result = ensureWalletIsOwner(wallet, owners)
      expect(result).toBe(false)
      expect(p.log.error).toHaveBeenCalledWith('Active wallet is not an owner of this Safe')
      expect(p.outro).toHaveBeenCalledWith('Failed')
    })
  })

  describe('parseAddressInput', () => {
    it('should parse valid EIP-3770 address', () => {
      const chains = { '1': TEST_CHAINS.ethereum }
      const input = `eth:${TEST_ADDRESSES.safe1}`

      const result = parseAddressInput(input, chains)
      expect(result).toEqual({
        chainId: '1',
        address: TEST_ADDRESSES.safe1,
      })
    })

    it('should return null and log error on invalid address', () => {
      const chains = { '1': TEST_CHAINS.ethereum }
      const input = 'invalid:0xinvalid'

      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.cancel).mockImplementation(() => {})

      const result = parseAddressInput(input, chains)
      expect(result).toBeNull()
      expect(p.log.error).toHaveBeenCalled()
      expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
    })
  })

  describe('selectTransaction', () => {
    it('should return selected transaction hash', async () => {
      const mockTx: StoredTransaction = {
        safeTxHash: '0xabc123',
        chainId: '1',
        safeAddress: TEST_ADDRESSES.safe1,
        status: 'pending',
        metadata: {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          data: '0x',
          operation: 0,
          nonce: 0,
        },
        signatures: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const mockTxStore = {
        getAllTransactions: vi.fn(() => [mockTx]),
      } as unknown as TransactionStore

      const mockSafeStorage = {
        getSafe: vi.fn(() => ({
          name: 'My Safe',
          address: TEST_ADDRESSES.safe1,
          chainId: '1',
        })),
      } as unknown as SafeAccountStorage

      const mockConfigStore = {
        getAllChains: vi.fn(() => ({ '1': TEST_CHAINS.ethereum })),
      } as unknown as ConfigStore

      vi.mocked(p.select).mockResolvedValue('0xabc123')
      vi.mocked(p.isCancel).mockReturnValue(false)

      const result = await selectTransaction(mockTxStore, mockSafeStorage, mockConfigStore)
      expect(result).toBe('0xabc123')
    })

    it('should filter transactions by status', async () => {
      const pendingTx: StoredTransaction = {
        safeTxHash: '0xpending',
        chainId: '1',
        safeAddress: TEST_ADDRESSES.safe1,
        status: 'pending',
        metadata: {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          data: '0x',
          operation: 0,
          nonce: 0,
        },
        signatures: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const executedTx: StoredTransaction = {
        ...pendingTx,
        safeTxHash: '0xexecuted',
        status: 'executed',
      }

      const mockTxStore = {
        getAllTransactions: vi.fn(() => [pendingTx, executedTx]),
      } as unknown as TransactionStore

      const mockSafeStorage = {
        getSafe: vi.fn(() => ({
          name: 'My Safe',
          address: TEST_ADDRESSES.safe1,
          chainId: '1',
        })),
      } as unknown as SafeAccountStorage

      const mockConfigStore = {
        getAllChains: vi.fn(() => ({ '1': TEST_CHAINS.ethereum })),
      } as unknown as ConfigStore

      vi.mocked(p.select).mockResolvedValue('0xpending')
      vi.mocked(p.isCancel).mockReturnValue(false)

      await selectTransaction(mockTxStore, mockSafeStorage, mockConfigStore, ['pending'])

      const selectCall = vi.mocked(p.select).mock.calls[0][0]
      expect(selectCall.options).toHaveLength(1)
      expect(selectCall.options[0].value).toBe('0xpending')
    })

    it('should return null when no transactions found', async () => {
      const mockTxStore = {
        getAllTransactions: vi.fn(() => []),
      } as unknown as TransactionStore

      const mockSafeStorage = {} as SafeAccountStorage
      const mockConfigStore = {} as ConfigStore

      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})

      const result = await selectTransaction(mockTxStore, mockSafeStorage, mockConfigStore)
      expect(result).toBeNull()
      expect(p.log.error).toHaveBeenCalledWith('No transactions found')
    })

    it('should return null when selection is cancelled', async () => {
      const mockTx: StoredTransaction = {
        safeTxHash: '0xabc123',
        chainId: '1',
        safeAddress: TEST_ADDRESSES.safe1,
        status: 'pending',
        metadata: {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          data: '0x',
          operation: 0,
          nonce: 0,
        },
        signatures: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const mockTxStore = {
        getAllTransactions: vi.fn(() => [mockTx]),
      } as unknown as TransactionStore

      const mockSafeStorage = {
        getSafe: vi.fn(() => ({ name: 'My Safe' })),
      } as unknown as SafeAccountStorage

      const mockConfigStore = {
        getAllChains: vi.fn(() => ({ '1': TEST_CHAINS.ethereum })),
      } as unknown as ConfigStore

      const cancelSymbol = Symbol('cancel')
      vi.mocked(p.select).mockResolvedValue(cancelSymbol)
      vi.mocked(p.isCancel).mockReturnValue(true)
      vi.mocked(p.cancel).mockImplementation(() => {})

      const result = await selectTransaction(mockTxStore, mockSafeStorage, mockConfigStore)
      expect(result).toBeNull()
    })

    it('should use custom message', async () => {
      const mockTx: StoredTransaction = {
        safeTxHash: '0xabc123',
        chainId: '1',
        safeAddress: TEST_ADDRESSES.safe1,
        status: 'pending',
        metadata: {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          data: '0x',
          operation: 0,
          nonce: 0,
        },
        signatures: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const mockTxStore = {
        getAllTransactions: vi.fn(() => [mockTx]),
      } as unknown as TransactionStore

      const mockSafeStorage = {
        getSafe: vi.fn(() => ({ name: 'My Safe' })),
      } as unknown as SafeAccountStorage

      const mockConfigStore = {
        getAllChains: vi.fn(() => ({ '1': TEST_CHAINS.ethereum })),
      } as unknown as ConfigStore

      vi.mocked(p.select).mockResolvedValue('0xabc123')
      vi.mocked(p.isCancel).mockReturnValue(false)

      await selectTransaction(
        mockTxStore,
        mockSafeStorage,
        mockConfigStore,
        undefined,
        'Custom select message'
      )

      const selectCall = vi.mocked(p.select).mock.calls[0][0]
      expect(selectCall.message).toBe('Custom select message')
    })
  })
})
