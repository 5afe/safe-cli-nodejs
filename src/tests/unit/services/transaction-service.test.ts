import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TransactionService } from '../../../services/transaction-service.js'
import { TEST_ADDRESSES, TEST_PRIVATE_KEYS, TEST_CHAINS } from '../../fixtures/index.js'
import { SafeCLIError } from '../../../utils/errors.js'
import type { TransactionMetadata } from '../../../types/transaction.js'

// Mock Safe SDK init function using vi.hoisted() to ensure it's available during hoisting
const { mockSafeInit } = vi.hoisted(() => ({
  mockSafeInit: vi.fn(),
}))

// Mock dependencies
vi.mock('@safe-global/protocol-kit', () => {
  return {
    default: {
      default: {
        init: mockSafeInit,
      },
    },
  }
})

vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn((url: string) => url),
}))

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(),
}))

// Import mocked modules for assertions
import { createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

describe('TransactionService', () => {
  let service: TransactionService
  const testChain = TEST_CHAINS.ethereum

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TransactionService(testChain)
  })

  describe('constructor', () => {
    it('should create service without private key', () => {
      const svc = new TransactionService(testChain)
      expect(svc).toBeInstanceOf(TransactionService)
    })

    it('should create service with private key', () => {
      const svc = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)
      expect(svc).toBeInstanceOf(TransactionService)
    })

    it('should normalize private key (add 0x prefix)', () => {
      const svc = new TransactionService(testChain, TEST_PRIVATE_KEYS.noPrefix)
      expect(svc).toBeInstanceOf(TransactionService)
    })
  })

  describe('createTransaction', () => {
    const mockProtocolKit = {
      createTransaction: vi.fn(),
      getTransactionHash: vi.fn(),
    }

    const mockTransaction = {
      data: {
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
      },
    }

    beforeEach(() => {
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      mockProtocolKit.createTransaction.mockResolvedValue(mockTransaction)
      mockProtocolKit.getTransactionHash.mockResolvedValue('0xtxhash123')
    })

    describe('valid cases', () => {
      it('should create a basic transaction', async () => {
        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
        }

        const result = await service.createTransaction(TEST_ADDRESSES.safe1, txData)

        expect(result.safeTxHash).toBe('0xtxhash123')
        expect(result.metadata.to).toBe(TEST_ADDRESSES.safe2)
        expect(result.metadata.value).toBe('100')
        expect(result.metadata.data).toBe('0xabcd')
      })

      it('should initialize Safe SDK with correct parameters', async () => {
        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
        }

        await service.createTransaction(TEST_ADDRESSES.safe1, txData)

        expect(mockSafeInit).toHaveBeenCalledWith({
          provider: testChain.rpcUrl,
          safeAddress: TEST_ADDRESSES.safe1,
        })
      })

      it('should create transaction with operation parameter', async () => {
        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
          operation: 1 as const,
        }

        await service.createTransaction(TEST_ADDRESSES.safe1, txData)

        expect(mockProtocolKit.createTransaction).toHaveBeenCalledWith({
          transactions: [
            {
              to: TEST_ADDRESSES.safe2,
              value: '100',
              data: '0xabcd',
              operation: 1,
            },
          ],
          options: undefined,
        })
      })

      it('should create transaction with custom nonce', async () => {
        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
          nonce: 10,
        }

        await service.createTransaction(TEST_ADDRESSES.safe1, txData)

        expect(mockProtocolKit.createTransaction).toHaveBeenCalledWith({
          transactions: [
            {
              to: TEST_ADDRESSES.safe2,
              value: '100',
              data: '0xabcd',
              operation: undefined,
            },
          ],
          options: { nonce: 10 },
        })
      })

      it('should create transaction without nonce (use current)', async () => {
        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
        }

        await service.createTransaction(TEST_ADDRESSES.safe1, txData)

        expect(mockProtocolKit.createTransaction).toHaveBeenCalledWith({
          transactions: [
            {
              to: TEST_ADDRESSES.safe2,
              value: '100',
              data: '0xabcd',
              operation: undefined,
            },
          ],
          options: undefined,
        })
      })

      it('should include all metadata fields in result', async () => {
        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
        }

        const result = await service.createTransaction(TEST_ADDRESSES.safe1, txData)

        expect(result.metadata).toEqual({
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd',
          operation: undefined,
          nonce: 5,
          safeTxGas: '100000',
          baseGas: '50000',
          gasPrice: '1000000000',
          gasToken: TEST_ADDRESSES.owner1,
          refundReceiver: TEST_ADDRESSES.owner2,
        })
      })

      it('should call getTransactionHash', async () => {
        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
        }

        await service.createTransaction(TEST_ADDRESSES.safe1, txData)

        expect(mockProtocolKit.getTransactionHash).toHaveBeenCalledWith(mockTransaction)
      })
    })

    describe('error handling', () => {
      it('should throw SafeCLIError when Safe SDK init fails', async () => {
        mockSafeInit.mockRejectedValue(new Error('SDK init failed'))

        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
        }

        await expect(service.createTransaction(TEST_ADDRESSES.safe1, txData)).rejects.toThrow(
          SafeCLIError
        )
        await expect(service.createTransaction(TEST_ADDRESSES.safe1, txData)).rejects.toThrow(
          'Failed to create transaction'
        )
      })

      it('should throw SafeCLIError when createTransaction fails', async () => {
        mockProtocolKit.createTransaction.mockRejectedValue(
          new Error('Transaction creation failed')
        )

        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
        }

        await expect(service.createTransaction(TEST_ADDRESSES.safe1, txData)).rejects.toThrow(
          SafeCLIError
        )
      })

      it('should include original error message', async () => {
        mockProtocolKit.createTransaction.mockRejectedValue(new Error('Insufficient funds'))

        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
        }

        await expect(service.createTransaction(TEST_ADDRESSES.safe1, txData)).rejects.toThrow(
          'Insufficient funds'
        )
      })

      it('should handle unknown error types', async () => {
        mockProtocolKit.createTransaction.mockRejectedValue('string error')

        const txData = {
          to: TEST_ADDRESSES.safe2,
          value: '100',
          data: '0xabcd' as `0x${string}`,
        }

        await expect(service.createTransaction(TEST_ADDRESSES.safe1, txData)).rejects.toThrow(
          'Unknown error'
        )
      })
    })
  })

  describe('signTransaction', () => {
    const mockProtocolKit = {
      createTransaction: vi.fn(),
      signTransaction: vi.fn(),
    }

    const mockAccount = {
      address: TEST_ADDRESSES.owner1,
    }

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

    const mockTransaction = {
      data: metadata,
    }

    const mockSignedTransaction = {
      signatures: new Map([[TEST_ADDRESSES.owner1.toLowerCase(), { data: '0xsignature123' }]]),
    }

    beforeEach(() => {
      vi.mocked(privateKeyToAccount).mockReturnValue(mockAccount as any)
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      mockProtocolKit.createTransaction.mockResolvedValue(mockTransaction)
      mockProtocolKit.signTransaction.mockResolvedValue(mockSignedTransaction as any)
    })

    describe('valid cases', () => {
      it('should sign transaction with private key', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        const signature = await serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)

        expect(signature).toBe('0xsignature123')
        expect(privateKeyToAccount).toHaveBeenCalledWith(TEST_PRIVATE_KEYS.owner1)
      })

      it('should initialize Safe SDK with signer', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)

        expect(mockSafeInit).toHaveBeenCalledWith({
          provider: testChain.rpcUrl,
          signer: TEST_PRIVATE_KEYS.owner1,
          safeAddress: TEST_ADDRESSES.safe1,
        })
      })

      it('should recreate transaction with metadata nonce', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)

        expect(mockProtocolKit.createTransaction).toHaveBeenCalledWith({
          transactions: [
            {
              to: metadata.to,
              value: metadata.value,
              data: metadata.data,
              operation: metadata.operation,
            },
          ],
          options: {
            nonce: metadata.nonce,
          },
        })
      })

      it('should handle metadata with missing optional fields', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)
        const minimalMetadata: TransactionMetadata = {
          to: TEST_ADDRESSES.safe2,
          nonce: 5,
          safeTxGas: '100000',
          baseGas: '50000',
          gasPrice: '1000000000',
          gasToken: TEST_ADDRESSES.owner1,
          refundReceiver: TEST_ADDRESSES.owner2,
        }

        await serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, minimalMetadata)

        expect(mockProtocolKit.createTransaction).toHaveBeenCalledWith({
          transactions: [
            {
              to: minimalMetadata.to,
              value: '0',
              data: '0x',
              operation: 0,
            },
          ],
          options: {
            nonce: minimalMetadata.nonce,
          },
        })
      })

      it('should call signTransaction on protocol kit', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)

        expect(mockProtocolKit.signTransaction).toHaveBeenCalledWith(mockTransaction)
      })

      it('should extract signature for current signer', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        const signature = await serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)

        expect(signature).toBe('0xsignature123')
      })
    })

    describe('error handling', () => {
      it('should throw error when private key not provided', async () => {
        const serviceWithoutKey = new TransactionService(testChain)

        await expect(
          serviceWithoutKey.signTransaction(TEST_ADDRESSES.safe1, metadata)
        ).rejects.toThrow('Private key required')
      })

      it('should throw SafeCLIError when Safe SDK init fails', async () => {
        mockSafeInit.mockRejectedValue(new Error('SDK init failed'))
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await expect(
          serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)
        ).rejects.toThrow(SafeCLIError)
        await expect(
          serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)
        ).rejects.toThrow('Failed to sign transaction')
      })

      it('should throw SafeCLIError when signature not found', async () => {
        mockProtocolKit.signTransaction.mockResolvedValue({ signatures: new Map() } as any)
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await expect(
          serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)
        ).rejects.toThrow('Failed to get signature from signed transaction')
      })

      it('should include original error message', async () => {
        mockProtocolKit.signTransaction.mockRejectedValue(new Error('Signing failed'))
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await expect(
          serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)
        ).rejects.toThrow('Signing failed')
      })

      it('should handle unknown error types', async () => {
        mockProtocolKit.signTransaction.mockRejectedValue('string error')
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await expect(
          serviceWithKey.signTransaction(TEST_ADDRESSES.safe1, metadata)
        ).rejects.toThrow('Unknown error')
      })
    })
  })

  describe('executeTransaction', () => {
    const mockProtocolKit = {
      createTransaction: vi.fn(),
      executeTransaction: vi.fn(),
    }

    const mockPublicClient = {
      waitForTransactionReceipt: vi.fn(),
    }

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

    const mockTransaction = {
      data: metadata,
      addSignature: vi.fn(),
    }

    const signatures = [
      { signer: TEST_ADDRESSES.owner1, signature: '0xsig1' },
      { signer: TEST_ADDRESSES.owner2, signature: '0xsig2' },
    ]

    beforeEach(() => {
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      mockProtocolKit.createTransaction.mockResolvedValue(mockTransaction)
      mockProtocolKit.executeTransaction.mockResolvedValue({ hash: '0xtxhash' })
      vi.mocked(createPublicClient).mockReturnValue(mockPublicClient as any)
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        transactionHash: '0xtxhash',
      } as any)
    })

    describe('valid cases', () => {
      it('should execute transaction with signatures', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        const txHash = await serviceWithKey.executeTransaction(
          TEST_ADDRESSES.safe1,
          metadata,
          signatures
        )

        expect(txHash).toBe('0xtxhash')
      })

      it('should initialize Safe SDK with signer', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)

        expect(mockSafeInit).toHaveBeenCalledWith({
          provider: testChain.rpcUrl,
          signer: TEST_PRIVATE_KEYS.owner1,
          safeAddress: TEST_ADDRESSES.safe1,
        })
      })

      it('should recreate transaction with metadata nonce', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)

        expect(mockProtocolKit.createTransaction).toHaveBeenCalledWith({
          transactions: [
            {
              to: metadata.to,
              value: metadata.value,
              data: metadata.data,
              operation: metadata.operation,
            },
          ],
          options: {
            nonce: metadata.nonce,
          },
        })
      })

      it('should add all signatures to transaction', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)

        expect(mockTransaction.addSignature).toHaveBeenCalledTimes(2)
        expect(mockTransaction.addSignature).toHaveBeenCalledWith({
          signer: TEST_ADDRESSES.owner1,
          data: '0xsig1',
        })
        expect(mockTransaction.addSignature).toHaveBeenCalledWith({
          signer: TEST_ADDRESSES.owner2,
          data: '0xsig2',
        })
      })

      it('should execute transaction on protocol kit', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)

        expect(mockProtocolKit.executeTransaction).toHaveBeenCalledWith(mockTransaction)
      })

      it('should wait for transaction confirmation', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)

        expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
          hash: '0xtxhash',
        })
      })

      it('should handle single signature', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)
        const singleSig = [{ signer: TEST_ADDRESSES.owner1, signature: '0xsig1' }]

        await serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, singleSig)

        expect(mockTransaction.addSignature).toHaveBeenCalledTimes(1)
      })

      it('should handle metadata with missing optional fields', async () => {
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)
        const minimalMetadata: TransactionMetadata = {
          to: TEST_ADDRESSES.safe2,
          nonce: 5,
          safeTxGas: '100000',
          baseGas: '50000',
          gasPrice: '1000000000',
          gasToken: TEST_ADDRESSES.owner1,
          refundReceiver: TEST_ADDRESSES.owner2,
        }

        await serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, minimalMetadata, signatures)

        expect(mockProtocolKit.createTransaction).toHaveBeenCalledWith({
          transactions: [
            {
              to: minimalMetadata.to,
              value: '0',
              data: '0x',
              operation: 0,
            },
          ],
          options: {
            nonce: minimalMetadata.nonce,
          },
        })
      })
    })

    describe('error handling', () => {
      it('should throw error when private key not provided', async () => {
        const serviceWithoutKey = new TransactionService(testChain)

        await expect(
          serviceWithoutKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)
        ).rejects.toThrow('Private key required')
      })

      it('should throw SafeCLIError when Safe SDK init fails', async () => {
        mockSafeInit.mockRejectedValue(new Error('SDK init failed'))
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await expect(
          serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)
        ).rejects.toThrow(SafeCLIError)
        await expect(
          serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)
        ).rejects.toThrow('Failed to execute transaction')
      })

      it('should throw SafeCLIError when execution fails', async () => {
        mockProtocolKit.executeTransaction.mockRejectedValue(new Error('Execution failed'))
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await expect(
          serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)
        ).rejects.toThrow(SafeCLIError)
      })

      it('should include original error message', async () => {
        mockProtocolKit.executeTransaction.mockRejectedValue(new Error('Insufficient gas'))
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await expect(
          serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)
        ).rejects.toThrow('Insufficient gas')
      })

      it('should handle unknown error types', async () => {
        mockProtocolKit.executeTransaction.mockRejectedValue('string error')
        const serviceWithKey = new TransactionService(testChain, TEST_PRIVATE_KEYS.owner1)

        await expect(
          serviceWithKey.executeTransaction(TEST_ADDRESSES.safe1, metadata, signatures)
        ).rejects.toThrow('Unknown error')
      })
    })
  })

  describe('getThreshold', () => {
    const mockProtocolKit = {
      getThreshold: vi.fn(),
    }

    beforeEach(() => {
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      mockProtocolKit.getThreshold.mockResolvedValue(2)
    })

    it('should get Safe threshold', async () => {
      const threshold = await service.getThreshold(TEST_ADDRESSES.safe1)

      expect(threshold).toBe(2)
    })

    it('should initialize Safe SDK', async () => {
      await service.getThreshold(TEST_ADDRESSES.safe1)

      expect(mockSafeInit).toHaveBeenCalledWith({
        provider: testChain.rpcUrl,
        safeAddress: TEST_ADDRESSES.safe1,
      })
    })

    it('should call getThreshold on protocol kit', async () => {
      await service.getThreshold(TEST_ADDRESSES.safe1)

      expect(mockProtocolKit.getThreshold).toHaveBeenCalled()
    })

    it('should throw SafeCLIError when SDK init fails', async () => {
      mockSafeInit.mockRejectedValue(new Error('SDK init failed'))

      await expect(service.getThreshold(TEST_ADDRESSES.safe1)).rejects.toThrow(SafeCLIError)
      await expect(service.getThreshold(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Failed to get Safe threshold'
      )
    })

    it('should include original error message', async () => {
      mockProtocolKit.getThreshold.mockRejectedValue(new Error('RPC error'))

      await expect(service.getThreshold(TEST_ADDRESSES.safe1)).rejects.toThrow('RPC error')
    })
  })

  describe('getOwners', () => {
    const mockProtocolKit = {
      getOwners: vi.fn(),
    }

    beforeEach(() => {
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      mockProtocolKit.getOwners.mockResolvedValue([TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2])
    })

    it('should get Safe owners', async () => {
      const owners = await service.getOwners(TEST_ADDRESSES.safe1)

      expect(owners).toEqual([TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2])
    })

    it('should initialize Safe SDK', async () => {
      await service.getOwners(TEST_ADDRESSES.safe1)

      expect(mockSafeInit).toHaveBeenCalledWith({
        provider: testChain.rpcUrl,
        safeAddress: TEST_ADDRESSES.safe1,
      })
    })

    it('should call getOwners on protocol kit', async () => {
      await service.getOwners(TEST_ADDRESSES.safe1)

      expect(mockProtocolKit.getOwners).toHaveBeenCalled()
    })

    it('should throw SafeCLIError when SDK init fails', async () => {
      mockSafeInit.mockRejectedValue(new Error('SDK init failed'))

      await expect(service.getOwners(TEST_ADDRESSES.safe1)).rejects.toThrow(SafeCLIError)
      await expect(service.getOwners(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Failed to get Safe owners'
      )
    })

    it('should include original error message', async () => {
      mockProtocolKit.getOwners.mockRejectedValue(new Error('RPC error'))

      await expect(service.getOwners(TEST_ADDRESSES.safe1)).rejects.toThrow('RPC error')
    })
  })

  describe('getNonce', () => {
    const mockProtocolKit = {
      getNonce: vi.fn(),
    }

    beforeEach(() => {
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      mockProtocolKit.getNonce.mockResolvedValue(10)
    })

    it('should get Safe nonce', async () => {
      const nonce = await service.getNonce(TEST_ADDRESSES.safe1)

      expect(nonce).toBe(10)
    })

    it('should initialize Safe SDK', async () => {
      await service.getNonce(TEST_ADDRESSES.safe1)

      expect(mockSafeInit).toHaveBeenCalledWith({
        provider: testChain.rpcUrl,
        safeAddress: TEST_ADDRESSES.safe1,
      })
    })

    it('should call getNonce on protocol kit', async () => {
      await service.getNonce(TEST_ADDRESSES.safe1)

      expect(mockProtocolKit.getNonce).toHaveBeenCalled()
    })

    it('should throw SafeCLIError when SDK init fails', async () => {
      mockSafeInit.mockRejectedValue(new Error('SDK init failed'))

      await expect(service.getNonce(TEST_ADDRESSES.safe1)).rejects.toThrow(SafeCLIError)
      await expect(service.getNonce(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Failed to get Safe nonce'
      )
    })

    it('should include original error message', async () => {
      mockProtocolKit.getNonce.mockRejectedValue(new Error('RPC error'))

      await expect(service.getNonce(TEST_ADDRESSES.safe1)).rejects.toThrow('RPC error')
    })
  })

  describe('createAddOwnerTransaction', () => {
    const mockProtocolKit = {
      createAddOwnerTx: vi.fn(),
      getTransactionHash: vi.fn(),
    }

    const mockTransaction = {
      data: {
        to: TEST_ADDRESSES.safe1,
        value: '0',
        data: '0xabcd',
        operation: 0,
        nonce: 5,
        safeTxGas: '100000',
        baseGas: '50000',
        gasPrice: '1000000000',
        gasToken: TEST_ADDRESSES.owner1,
        refundReceiver: TEST_ADDRESSES.owner2,
      },
    }

    beforeEach(() => {
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      mockProtocolKit.createAddOwnerTx.mockResolvedValue(mockTransaction)
      mockProtocolKit.getTransactionHash.mockResolvedValue('0xtxhash123')
    })

    it('should create add owner transaction', async () => {
      const result = await service.createAddOwnerTransaction(
        TEST_ADDRESSES.safe1,
        TEST_ADDRESSES.owner3,
        3
      )

      expect(result.safeTxHash).toBe('0xtxhash123')
      expect(result.metadata.to).toBe(TEST_ADDRESSES.safe1)
    })

    it('should initialize Safe SDK', async () => {
      await service.createAddOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 3)

      expect(mockSafeInit).toHaveBeenCalledWith({
        provider: testChain.rpcUrl,
        safeAddress: TEST_ADDRESSES.safe1,
      })
    })

    it('should call createAddOwnerTx with correct parameters', async () => {
      await service.createAddOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 3)

      expect(mockProtocolKit.createAddOwnerTx).toHaveBeenCalledWith({
        ownerAddress: TEST_ADDRESSES.owner3,
        threshold: 3,
      })
    })

    it('should return transaction metadata', async () => {
      const result = await service.createAddOwnerTransaction(
        TEST_ADDRESSES.safe1,
        TEST_ADDRESSES.owner3,
        3
      )

      expect(result.metadata).toEqual({
        to: TEST_ADDRESSES.safe1,
        value: '0',
        data: '0xabcd',
        operation: 0,
        nonce: 5,
        safeTxGas: '100000',
        baseGas: '50000',
        gasPrice: '1000000000',
        gasToken: TEST_ADDRESSES.owner1,
        refundReceiver: TEST_ADDRESSES.owner2,
      })
    })

    it('should call getTransactionHash', async () => {
      await service.createAddOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 3)

      expect(mockProtocolKit.getTransactionHash).toHaveBeenCalledWith(mockTransaction)
    })

    it('should throw SafeCLIError when SDK init fails', async () => {
      mockSafeInit.mockRejectedValue(new Error('SDK init failed'))

      await expect(
        service.createAddOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 3)
      ).rejects.toThrow(SafeCLIError)
      await expect(
        service.createAddOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 3)
      ).rejects.toThrow('Failed to create add owner transaction')
    })

    it('should include original error message', async () => {
      mockProtocolKit.createAddOwnerTx.mockRejectedValue(new Error('Invalid threshold'))

      await expect(
        service.createAddOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 3)
      ).rejects.toThrow('Invalid threshold')
    })

    it('should handle unknown error types', async () => {
      mockProtocolKit.createAddOwnerTx.mockRejectedValue('string error')

      await expect(
        service.createAddOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 3)
      ).rejects.toThrow('Unknown error')
    })
  })

  describe('createRemoveOwnerTransaction', () => {
    const mockProtocolKit = {
      createRemoveOwnerTx: vi.fn(),
      getTransactionHash: vi.fn(),
    }

    const mockTransaction = {
      data: {
        to: TEST_ADDRESSES.safe1,
        value: '0',
        data: '0xabcd',
        operation: 0,
        nonce: 5,
        safeTxGas: '100000',
        baseGas: '50000',
        gasPrice: '1000000000',
        gasToken: TEST_ADDRESSES.owner1,
        refundReceiver: TEST_ADDRESSES.owner2,
      },
    }

    beforeEach(() => {
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      mockProtocolKit.createRemoveOwnerTx.mockResolvedValue(mockTransaction)
      mockProtocolKit.getTransactionHash.mockResolvedValue('0xtxhash123')
    })

    it('should create remove owner transaction', async () => {
      const result = await service.createRemoveOwnerTransaction(
        TEST_ADDRESSES.safe1,
        TEST_ADDRESSES.owner3,
        1
      )

      expect(result.safeTxHash).toBe('0xtxhash123')
      expect(result.metadata.to).toBe(TEST_ADDRESSES.safe1)
    })

    it('should initialize Safe SDK', async () => {
      await service.createRemoveOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 1)

      expect(mockSafeInit).toHaveBeenCalledWith({
        provider: testChain.rpcUrl,
        safeAddress: TEST_ADDRESSES.safe1,
      })
    })

    it('should call createRemoveOwnerTx with correct parameters', async () => {
      await service.createRemoveOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 1)

      expect(mockProtocolKit.createRemoveOwnerTx).toHaveBeenCalledWith({
        ownerAddress: TEST_ADDRESSES.owner3,
        threshold: 1,
      })
    })

    it('should return transaction metadata', async () => {
      const result = await service.createRemoveOwnerTransaction(
        TEST_ADDRESSES.safe1,
        TEST_ADDRESSES.owner3,
        1
      )

      expect(result.metadata).toEqual({
        to: TEST_ADDRESSES.safe1,
        value: '0',
        data: '0xabcd',
        operation: 0,
        nonce: 5,
        safeTxGas: '100000',
        baseGas: '50000',
        gasPrice: '1000000000',
        gasToken: TEST_ADDRESSES.owner1,
        refundReceiver: TEST_ADDRESSES.owner2,
      })
    })

    it('should call getTransactionHash', async () => {
      await service.createRemoveOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 1)

      expect(mockProtocolKit.getTransactionHash).toHaveBeenCalledWith(mockTransaction)
    })

    it('should throw SafeCLIError when SDK init fails', async () => {
      mockSafeInit.mockRejectedValue(new Error('SDK init failed'))

      await expect(
        service.createRemoveOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 1)
      ).rejects.toThrow(SafeCLIError)
      await expect(
        service.createRemoveOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 1)
      ).rejects.toThrow('Failed to create remove owner transaction')
    })

    it('should include original error message', async () => {
      mockProtocolKit.createRemoveOwnerTx.mockRejectedValue(new Error('Invalid owner'))

      await expect(
        service.createRemoveOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 1)
      ).rejects.toThrow('Invalid owner')
    })

    it('should handle unknown error types', async () => {
      mockProtocolKit.createRemoveOwnerTx.mockRejectedValue('string error')

      await expect(
        service.createRemoveOwnerTransaction(TEST_ADDRESSES.safe1, TEST_ADDRESSES.owner3, 1)
      ).rejects.toThrow('Unknown error')
    })
  })

  describe('createChangeThresholdTransaction', () => {
    const mockProtocolKit = {
      createChangeThresholdTx: vi.fn(),
      getTransactionHash: vi.fn(),
    }

    const mockTransaction = {
      data: {
        to: TEST_ADDRESSES.safe1,
        value: '0',
        data: '0xabcd',
        operation: 0,
        nonce: 5,
        safeTxGas: '100000',
        baseGas: '50000',
        gasPrice: '1000000000',
        gasToken: TEST_ADDRESSES.owner1,
        refundReceiver: TEST_ADDRESSES.owner2,
      },
    }

    beforeEach(() => {
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      mockProtocolKit.createChangeThresholdTx.mockResolvedValue(mockTransaction)
      mockProtocolKit.getTransactionHash.mockResolvedValue('0xtxhash123')
    })

    it('should create change threshold transaction', async () => {
      const result = await service.createChangeThresholdTransaction(TEST_ADDRESSES.safe1, 2)

      expect(result.safeTxHash).toBe('0xtxhash123')
      expect(result.metadata.to).toBe(TEST_ADDRESSES.safe1)
    })

    it('should initialize Safe SDK', async () => {
      await service.createChangeThresholdTransaction(TEST_ADDRESSES.safe1, 2)

      expect(mockSafeInit).toHaveBeenCalledWith({
        provider: testChain.rpcUrl,
        safeAddress: TEST_ADDRESSES.safe1,
      })
    })

    it('should call createChangeThresholdTx with correct threshold', async () => {
      await service.createChangeThresholdTransaction(TEST_ADDRESSES.safe1, 2)

      expect(mockProtocolKit.createChangeThresholdTx).toHaveBeenCalledWith(2)
    })

    it('should return transaction metadata', async () => {
      const result = await service.createChangeThresholdTransaction(TEST_ADDRESSES.safe1, 2)

      expect(result.metadata).toEqual({
        to: TEST_ADDRESSES.safe1,
        value: '0',
        data: '0xabcd',
        operation: 0,
        nonce: 5,
        safeTxGas: '100000',
        baseGas: '50000',
        gasPrice: '1000000000',
        gasToken: TEST_ADDRESSES.owner1,
        refundReceiver: TEST_ADDRESSES.owner2,
      })
    })

    it('should call getTransactionHash', async () => {
      await service.createChangeThresholdTransaction(TEST_ADDRESSES.safe1, 2)

      expect(mockProtocolKit.getTransactionHash).toHaveBeenCalledWith(mockTransaction)
    })

    it('should throw SafeCLIError when SDK init fails', async () => {
      mockSafeInit.mockRejectedValue(new Error('SDK init failed'))

      await expect(
        service.createChangeThresholdTransaction(TEST_ADDRESSES.safe1, 2)
      ).rejects.toThrow(SafeCLIError)
      await expect(
        service.createChangeThresholdTransaction(TEST_ADDRESSES.safe1, 2)
      ).rejects.toThrow('Failed to create change threshold transaction')
    })

    it('should include original error message', async () => {
      mockProtocolKit.createChangeThresholdTx.mockRejectedValue(new Error('Invalid threshold'))

      await expect(
        service.createChangeThresholdTransaction(TEST_ADDRESSES.safe1, 2)
      ).rejects.toThrow('Invalid threshold')
    })

    it('should handle unknown error types', async () => {
      mockProtocolKit.createChangeThresholdTx.mockRejectedValue('string error')

      await expect(
        service.createChangeThresholdTransaction(TEST_ADDRESSES.safe1, 2)
      ).rejects.toThrow('Unknown error')
    })
  })
})
