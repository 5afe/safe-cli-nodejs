import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SafeTransactionServiceAPI } from '../../../services/api-service.js'
import { TEST_ADDRESSES, TEST_CHAINS } from '../../fixtures/index.js'
import { SafeCLIError } from '../../../utils/errors.js'
import type { TransactionMetadata } from '../../../types/transaction.js'

// Mock Safe API Kit as a class
class MockSafeApiKit {
  constructor() {
    return {
      proposeTransaction: vi.fn(),
      confirmTransaction: vi.fn(),
      getPendingTransactions: vi.fn(),
      getAllTransactions: vi.fn(),
      getTransaction: vi.fn(),
    }
  }
}

vi.mock('@safe-global/api-kit', () => {
  return {
    default: MockSafeApiKit,
  }
})

// Mock viem for getAddress
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    getAddress: vi.fn((addr: string) => addr),
  }
})

// Import mocked modules
import SafeApiKit from '@safe-global/api-kit'

describe('SafeTransactionServiceAPI', () => {
  let service: SafeTransactionServiceAPI
  const testChain = TEST_CHAINS.ethereum
  const mockApiKit = {
    proposeTransaction: vi.fn(),
    confirmTransaction: vi.fn(),
    getPendingTransactions: vi.fn(),
    getAllTransactions: vi.fn(),
    getTransaction: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SafeTransactionServiceAPI(testChain)
  })

  describe('constructor', () => {
    it('should create service with valid chain config', () => {
      const svc = new SafeTransactionServiceAPI(testChain)
      expect(svc).toBeInstanceOf(SafeTransactionServiceAPI)
    })

    it('should initialize SafeApiKit with correct chainId and txServiceUrl', () => {
      new SafeTransactionServiceAPI(testChain)

      expect(SafeApiKit).toHaveBeenCalledWith({
        chainId: BigInt(testChain.chainId),
        txServiceUrl: testChain.transactionServiceUrl,
        apiKey: undefined,
      })
    })

    it('should initialize SafeApiKit with apiKey when provided', () => {
      const apiKey = 'test-api-key'
      new SafeTransactionServiceAPI(testChain, { apiKey })

      expect(SafeApiKit).toHaveBeenCalledWith({
        chainId: BigInt(testChain.chainId),
        txServiceUrl: testChain.transactionServiceUrl,
        apiKey,
      })
    })

    it('should throw error when transactionServiceUrl is not configured', () => {
      const invalidChain = {
        ...testChain,
        transactionServiceUrl: undefined,
      }

      expect(() => new SafeTransactionServiceAPI(invalidChain as any)).toThrow(SafeCLIError)
      expect(() => new SafeTransactionServiceAPI(invalidChain as any)).toThrow(
        'Transaction Service not available'
      )
    })

    it('should throw error with chain name in message', () => {
      const invalidChain = {
        ...testChain,
        transactionServiceUrl: undefined,
      }

      expect(() => new SafeTransactionServiceAPI(invalidChain as any)).toThrow(testChain.name)
    })

    it('should use staging URL when useStaging is true', () => {
      new SafeTransactionServiceAPI(testChain, { useStaging: true })

      expect(SafeApiKit).toHaveBeenCalledWith({
        chainId: BigInt(testChain.chainId),
        txServiceUrl: testChain.transactionServiceUrl?.replace('.safe.global', '.staging.5afe.dev'),
        apiKey: undefined,
      })
    })

    it('should use production URL when useStaging is false', () => {
      new SafeTransactionServiceAPI(testChain, { useStaging: false })

      expect(SafeApiKit).toHaveBeenCalledWith({
        chainId: BigInt(testChain.chainId),
        txServiceUrl: testChain.transactionServiceUrl,
        apiKey: undefined,
      })
    })
  })

  describe('proposeTransaction', () => {
    const metadata: TransactionMetadata = {
      to: TEST_ADDRESSES.safe2,
      value: '100',
      data: '0xabcd',
      operation: 0,
      nonce: 5,
      safeTxGas: '100000',
      baseGas: '50000',
      gasPrice: '1000000000',
      gasToken: TEST_ADDRESSES.owner1,
      refundReceiver: TEST_ADDRESSES.owner2,
    }

    const safeTxHash = '0xtxhash123'
    const signature = '0xsignature123'

    beforeEach(() => {
      mockApiKit.proposeTransaction.mockResolvedValue(undefined)
    })

    describe('valid cases', () => {
      it('should propose transaction with complete metadata', async () => {
        await service.proposeTransaction(
          TEST_ADDRESSES.safe1,
          safeTxHash,
          metadata,
          signature,
          TEST_ADDRESSES.owner1
        )

        expect(mockApiKit.proposeTransaction).toHaveBeenCalledWith({
          safeAddress: TEST_ADDRESSES.safe1,
          safeTransactionData: {
            to: TEST_ADDRESSES.safe2,
            value: '100',
            data: '0xabcd',
            operation: 0,
            safeTxGas: '100000',
            baseGas: '50000',
            gasPrice: '1000000000',
            gasToken: TEST_ADDRESSES.owner1,
            refundReceiver: TEST_ADDRESSES.owner2,
            nonce: 5,
          },
          safeTxHash,
          senderAddress: TEST_ADDRESSES.owner1,
          senderSignature: signature,
        })
      })

      it('should handle metadata with missing optional fields', async () => {
        const minimalMetadata: TransactionMetadata = {
          to: TEST_ADDRESSES.safe2,
          nonce: 5,
          safeTxGas: '0',
          baseGas: '0',
          gasPrice: '0',
          gasToken: TEST_ADDRESSES.owner1,
          refundReceiver: TEST_ADDRESSES.owner2,
        }

        await service.proposeTransaction(
          TEST_ADDRESSES.safe1,
          safeTxHash,
          minimalMetadata,
          signature,
          TEST_ADDRESSES.owner1
        )

        expect(mockApiKit.proposeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            safeTransactionData: expect.objectContaining({
              to: TEST_ADDRESSES.safe2,
              value: undefined,
              data: undefined,
              operation: 0, // Default value
              nonce: 5,
            }),
          })
        )
      })

      it('should use default operation value of 0 when not provided', async () => {
        const metadataWithoutOp = { ...metadata, operation: undefined }

        await service.proposeTransaction(
          TEST_ADDRESSES.safe1,
          safeTxHash,
          metadataWithoutOp,
          signature,
          TEST_ADDRESSES.owner1
        )

        expect(mockApiKit.proposeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            safeTransactionData: expect.objectContaining({
              operation: 0,
            }),
          })
        )
      })

      it('should use default gas values when not provided', async () => {
        const metadataWithoutGas = {
          to: TEST_ADDRESSES.safe2,
          nonce: 5,
          safeTxGas: '0',
          baseGas: '0',
          gasPrice: '0',
          gasToken: TEST_ADDRESSES.owner1,
          refundReceiver: TEST_ADDRESSES.owner2,
        }

        await service.proposeTransaction(
          TEST_ADDRESSES.safe1,
          safeTxHash,
          metadataWithoutGas,
          signature,
          TEST_ADDRESSES.owner1
        )

        expect(mockApiKit.proposeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            safeTransactionData: expect.objectContaining({
              safeTxGas: '0',
              baseGas: '0',
              gasPrice: '0',
            }),
          })
        )
      })

      it('should use zero address for gasToken when not provided', async () => {
        const metadataWithoutGasToken = {
          to: TEST_ADDRESSES.safe2,
          nonce: 5,
          safeTxGas: '0',
          baseGas: '0',
          gasPrice: '0',
          refundReceiver: TEST_ADDRESSES.owner2,
        } as TransactionMetadata

        await service.proposeTransaction(
          TEST_ADDRESSES.safe1,
          safeTxHash,
          metadataWithoutGasToken,
          signature,
          TEST_ADDRESSES.owner1
        )

        expect(mockApiKit.proposeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            safeTransactionData: expect.objectContaining({
              gasToken: '0x0000000000000000000000000000000000000000',
            }),
          })
        )
      })

      it('should use zero address for refundReceiver when not provided', async () => {
        const metadataWithoutRefund = {
          to: TEST_ADDRESSES.safe2,
          nonce: 5,
          safeTxGas: '0',
          baseGas: '0',
          gasPrice: '0',
          gasToken: TEST_ADDRESSES.owner1,
        } as TransactionMetadata

        await service.proposeTransaction(
          TEST_ADDRESSES.safe1,
          safeTxHash,
          metadataWithoutRefund,
          signature,
          TEST_ADDRESSES.owner1
        )

        expect(mockApiKit.proposeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            safeTransactionData: expect.objectContaining({
              refundReceiver: '0x0000000000000000000000000000000000000000',
            }),
          })
        )
      })
    })

    describe('error handling', () => {
      it('should throw error when nonce is undefined', async () => {
        const metadataWithoutNonce = { ...metadata, nonce: undefined } as any

        await expect(
          service.proposeTransaction(
            TEST_ADDRESSES.safe1,
            safeTxHash,
            metadataWithoutNonce,
            signature,
            TEST_ADDRESSES.owner1
          )
        ).rejects.toThrow('Transaction nonce is required')
      })

      it('should throw SafeCLIError when API call fails', async () => {
        mockApiKit.proposeTransaction.mockRejectedValue(new Error('API error'))

        await expect(
          service.proposeTransaction(
            TEST_ADDRESSES.safe1,
            safeTxHash,
            metadata,
            signature,
            TEST_ADDRESSES.owner1
          )
        ).rejects.toThrow(SafeCLIError)
        await expect(
          service.proposeTransaction(
            TEST_ADDRESSES.safe1,
            safeTxHash,
            metadata,
            signature,
            TEST_ADDRESSES.owner1
          )
        ).rejects.toThrow('Failed to propose transaction')
      })

      it('should include original error message', async () => {
        mockApiKit.proposeTransaction.mockRejectedValue(new Error('Network timeout'))

        await expect(
          service.proposeTransaction(
            TEST_ADDRESSES.safe1,
            safeTxHash,
            metadata,
            signature,
            TEST_ADDRESSES.owner1
          )
        ).rejects.toThrow('Network timeout')
      })

      it('should handle unknown error types', async () => {
        mockApiKit.proposeTransaction.mockRejectedValue('string error')

        await expect(
          service.proposeTransaction(
            TEST_ADDRESSES.safe1,
            safeTxHash,
            metadata,
            signature,
            TEST_ADDRESSES.owner1
          )
        ).rejects.toThrow('Unknown error')
      })
    })
  })

  describe('confirmTransaction', () => {
    const safeTxHash = '0xtxhash123'
    const signature = '0xsignature123'

    beforeEach(() => {
      mockApiKit.confirmTransaction.mockResolvedValue(undefined)
    })

    it('should confirm transaction with signature', async () => {
      await service.confirmTransaction(safeTxHash, signature)

      expect(mockApiKit.confirmTransaction).toHaveBeenCalledWith(safeTxHash, signature)
    })

    it('should throw SafeCLIError when API call fails', async () => {
      mockApiKit.confirmTransaction.mockRejectedValue(new Error('API error'))

      await expect(service.confirmTransaction(safeTxHash, signature)).rejects.toThrow(SafeCLIError)
      await expect(service.confirmTransaction(safeTxHash, signature)).rejects.toThrow(
        'Failed to add signature'
      )
    })

    it('should include original error message', async () => {
      mockApiKit.confirmTransaction.mockRejectedValue(new Error('Invalid signature'))

      await expect(service.confirmTransaction(safeTxHash, signature)).rejects.toThrow(
        'Invalid signature'
      )
    })

    it('should handle unknown error types', async () => {
      mockApiKit.confirmTransaction.mockRejectedValue('string error')

      await expect(service.confirmTransaction(safeTxHash, signature)).rejects.toThrow(
        'Unknown error'
      )
    })
  })

  describe('getPendingTransactions', () => {
    const mockTransactions = [
      { safeTxHash: '0xtx1', nonce: 5 },
      { safeTxHash: '0xtx2', nonce: 6 },
    ]

    beforeEach(() => {
      mockApiKit.getPendingTransactions.mockResolvedValue({ results: mockTransactions })
    })

    it('should return pending transactions', async () => {
      const result = await service.getPendingTransactions(TEST_ADDRESSES.safe1)

      expect(result).toEqual(mockTransactions)
      expect(mockApiKit.getPendingTransactions).toHaveBeenCalledWith(TEST_ADDRESSES.safe1)
    })

    it('should return empty array when no results', async () => {
      mockApiKit.getPendingTransactions.mockResolvedValue({ results: null })

      const result = await service.getPendingTransactions(TEST_ADDRESSES.safe1)

      expect(result).toEqual([])
    })

    it('should return empty array when results undefined', async () => {
      mockApiKit.getPendingTransactions.mockResolvedValue({})

      const result = await service.getPendingTransactions(TEST_ADDRESSES.safe1)

      expect(result).toEqual([])
    })

    it('should throw SafeCLIError when API call fails', async () => {
      mockApiKit.getPendingTransactions.mockRejectedValue(new Error('API error'))

      await expect(service.getPendingTransactions(TEST_ADDRESSES.safe1)).rejects.toThrow(
        SafeCLIError
      )
      await expect(service.getPendingTransactions(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Failed to fetch pending transactions'
      )
    })

    it('should include original error message', async () => {
      mockApiKit.getPendingTransactions.mockRejectedValue(new Error('Network timeout'))

      await expect(service.getPendingTransactions(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Network timeout'
      )
    })

    it('should handle unknown error types', async () => {
      mockApiKit.getPendingTransactions.mockRejectedValue('string error')

      await expect(service.getPendingTransactions(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Unknown error'
      )
    })
  })

  describe('getAllTransactions', () => {
    const mockTransactions = [
      { safeTxHash: '0xtx1', nonce: 5 },
      { safeTxHash: '0xtx2', nonce: 6 },
      { safeTxHash: '0xtx3', nonce: 7 },
    ]

    beforeEach(() => {
      mockApiKit.getAllTransactions.mockResolvedValue({ results: mockTransactions })
    })

    it('should return all transactions', async () => {
      const result = await service.getAllTransactions(TEST_ADDRESSES.safe1)

      expect(result).toEqual(mockTransactions)
      expect(mockApiKit.getAllTransactions).toHaveBeenCalledWith(TEST_ADDRESSES.safe1)
    })

    it('should return empty array when no results', async () => {
      mockApiKit.getAllTransactions.mockResolvedValue({ results: null })

      const result = await service.getAllTransactions(TEST_ADDRESSES.safe1)

      expect(result).toEqual([])
    })

    it('should return empty array when results undefined', async () => {
      mockApiKit.getAllTransactions.mockResolvedValue({})

      const result = await service.getAllTransactions(TEST_ADDRESSES.safe1)

      expect(result).toEqual([])
    })

    it('should throw SafeCLIError when API call fails', async () => {
      mockApiKit.getAllTransactions.mockRejectedValue(new Error('API error'))

      await expect(service.getAllTransactions(TEST_ADDRESSES.safe1)).rejects.toThrow(SafeCLIError)
      await expect(service.getAllTransactions(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Failed to fetch transactions'
      )
    })

    it('should include original error message', async () => {
      mockApiKit.getAllTransactions.mockRejectedValue(new Error('Rate limit exceeded'))

      await expect(service.getAllTransactions(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Rate limit exceeded'
      )
    })

    it('should handle unknown error types', async () => {
      mockApiKit.getAllTransactions.mockRejectedValue('string error')

      await expect(service.getAllTransactions(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Unknown error'
      )
    })
  })

  describe('getTransaction', () => {
    const safeTxHash = '0xtxhash123'
    const mockTransaction = {
      safeTxHash,
      nonce: 5,
      to: TEST_ADDRESSES.safe2,
      value: '100',
    }

    beforeEach(() => {
      mockApiKit.getTransaction.mockResolvedValue(mockTransaction)
    })

    it('should return transaction by hash', async () => {
      const result = await service.getTransaction(safeTxHash)

      expect(result).toEqual(mockTransaction)
      expect(mockApiKit.getTransaction).toHaveBeenCalledWith(safeTxHash)
    })

    it('should return null for 404 error', async () => {
      mockApiKit.getTransaction.mockRejectedValue(new Error('404 Not Found'))

      const result = await service.getTransaction(safeTxHash)

      expect(result).toBeNull()
    })

    it('should return null for "No MultisigTransaction matches" error', async () => {
      mockApiKit.getTransaction.mockRejectedValue(
        new Error('No MultisigTransaction matches the given query')
      )

      const result = await service.getTransaction(safeTxHash)

      expect(result).toBeNull()
    })

    it('should throw SafeCLIError for other errors', async () => {
      mockApiKit.getTransaction.mockRejectedValue(new Error('API error'))

      await expect(service.getTransaction(safeTxHash)).rejects.toThrow(SafeCLIError)
      await expect(service.getTransaction(safeTxHash)).rejects.toThrow(
        'Failed to fetch transaction'
      )
    })

    it('should include original error message for non-404 errors', async () => {
      mockApiKit.getTransaction.mockRejectedValue(new Error('Network timeout'))

      await expect(service.getTransaction(safeTxHash)).rejects.toThrow('Network timeout')
    })

    it('should handle unknown error types', async () => {
      mockApiKit.getTransaction.mockRejectedValue('string error')

      await expect(service.getTransaction(safeTxHash)).rejects.toThrow('Unknown error')
    })
  })
})
