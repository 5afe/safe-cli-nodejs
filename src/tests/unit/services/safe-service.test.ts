import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SafeService } from '../../../services/safe-service.js'
import { TEST_ADDRESSES, TEST_PRIVATE_KEYS, TEST_CHAINS } from '../../fixtures/index.js'
import { SafeCLIError } from '../../../utils/errors.js'

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
    predictSafeAddress: vi.fn(),
    SafeProvider: {
      init: vi.fn(),
    },
  }
})

vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  createWalletClient: vi.fn(),
  http: vi.fn((url: string) => url),
}))

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(),
}))

// Import mocked modules for assertions
import { predictSafeAddress, SafeProvider } from '@safe-global/protocol-kit'
import { createPublicClient, createWalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

describe('SafeService', () => {
  let service: SafeService
  const testChain = TEST_CHAINS.ethereum

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SafeService(testChain)
  })

  describe('constructor', () => {
    it('should create service without private key', () => {
      const svc = new SafeService(testChain)
      expect(svc).toBeInstanceOf(SafeService)
    })

    it('should create service with private key', () => {
      const svc = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
      expect(svc).toBeInstanceOf(SafeService)
    })

    it('should normalize private key (add 0x prefix)', () => {
      const svc = new SafeService(testChain, TEST_PRIVATE_KEYS.noPrefix)
      expect(svc).toBeInstanceOf(SafeService)
    })
  })

  describe('createPredictedSafe', () => {
    const mockSafeProvider = {
      init: vi.fn(),
    }

    const mockPredictedAddress = TEST_ADDRESSES.safe1

    beforeEach(() => {
      vi.mocked(SafeProvider.init).mockResolvedValue(mockSafeProvider as any)
      vi.mocked(predictSafeAddress).mockResolvedValue(mockPredictedAddress)
    })

    describe('valid cases', () => {
      it('should create predicted safe with single owner', async () => {
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        const result = await service.createPredictedSafe(config)

        expect(result.predictedAddress).toBe(mockPredictedAddress)
        expect(result.safeAccountConfig.owners).toEqual(config.owners)
        expect(result.safeAccountConfig.threshold).toBe(config.threshold)
        expect(result.safeVersion).toBe('1.4.1')
      })

      it('should create predicted safe with multiple owners', async () => {
        const config = {
          owners: [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2, TEST_ADDRESSES.owner3],
          threshold: 2,
        }

        const result = await service.createPredictedSafe(config)

        expect(result.predictedAddress).toBe(mockPredictedAddress)
        expect(result.safeAccountConfig.owners).toEqual(config.owners)
        expect(result.safeAccountConfig.threshold).toBe(config.threshold)
      })

      it('should create predicted safe with custom salt nonce', async () => {
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
          saltNonce: '123',
        }

        const result = await service.createPredictedSafe(config)

        expect(result.predictedAddress).toBe(mockPredictedAddress)
        expect(predictSafeAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            safeDeploymentConfig: expect.objectContaining({
              saltNonce: '123',
            }),
          })
        )
      })

      it('should create predicted safe with threshold equal to owners', async () => {
        const config = {
          owners: [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2],
          threshold: 2,
        }

        const result = await service.createPredictedSafe(config)

        expect(result.safeAccountConfig.threshold).toBe(2)
      })

      it('should call SafeProvider.init with correct chain RPC', async () => {
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await service.createPredictedSafe(config)

        expect(SafeProvider.init).toHaveBeenCalledWith({
          provider: testChain.rpcUrl,
          safeVersion: '1.4.1',
        })
      })

      it('should call predictSafeAddress with correct chainId', async () => {
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await service.createPredictedSafe(config)

        expect(predictSafeAddress).toHaveBeenCalledWith(
          expect.objectContaining({
            chainId: BigInt(testChain.chainId),
          })
        )
      })

      it('should use Safe version 1.4.1', async () => {
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        const result = await service.createPredictedSafe(config)

        expect(result.safeVersion).toBe('1.4.1')
      })
    })

    describe('error handling', () => {
      it('should throw SafeCLIError when SafeProvider.init fails', async () => {
        vi.mocked(SafeProvider.init).mockRejectedValue(new Error('Provider init failed'))

        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await expect(service.createPredictedSafe(config)).rejects.toThrow(SafeCLIError)
        await expect(service.createPredictedSafe(config)).rejects.toThrow(
          'Failed to create predicted Safe'
        )
      })

      it('should throw SafeCLIError when predictSafeAddress fails', async () => {
        vi.mocked(predictSafeAddress).mockRejectedValue(new Error('Prediction failed'))

        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await expect(service.createPredictedSafe(config)).rejects.toThrow(SafeCLIError)
      })

      it('should include original error message in thrown error', async () => {
        vi.mocked(SafeProvider.init).mockRejectedValue(new Error('RPC connection failed'))

        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await expect(service.createPredictedSafe(config)).rejects.toThrow('RPC connection failed')
      })

      it('should handle unknown error types', async () => {
        vi.mocked(SafeProvider.init).mockRejectedValue('string error')

        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await expect(service.createPredictedSafe(config)).rejects.toThrow('Unknown error')
      })
    })
  })

  describe('deploySafe', () => {
    const mockProtocolKit = {
      createSafeDeploymentTransaction: vi.fn(),
      getAddress: vi.fn(),
    }

    const mockWalletClient = {
      sendTransaction: vi.fn(),
    }

    const mockPublicClient = {
      waitForTransactionReceipt: vi.fn(),
    }

    const mockAccount = {
      address: TEST_ADDRESSES.owner1,
    }

    beforeEach(() => {
      vi.mocked(privateKeyToAccount).mockReturnValue(mockAccount as any)
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
      vi.mocked(createWalletClient).mockReturnValue(mockWalletClient as any)
      vi.mocked(createPublicClient).mockReturnValue(mockPublicClient as any)

      mockProtocolKit.createSafeDeploymentTransaction.mockResolvedValue({
        to: TEST_ADDRESSES.safe1,
        value: '0',
        data: '0x123456',
      })
      mockWalletClient.sendTransaction.mockResolvedValue('0xtxhash')
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({} as any)
      mockProtocolKit.getAddress.mockResolvedValue(TEST_ADDRESSES.safe1)
    })

    describe('valid cases', () => {
      it('should deploy safe with private key', async () => {
        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        const address = await serviceWithKey.deploySafe(config)

        expect(address).toBe(TEST_ADDRESSES.safe1)
        expect(privateKeyToAccount).toHaveBeenCalledWith(TEST_PRIVATE_KEYS.owner1)
      })

      it('should deploy safe with multiple owners', async () => {
        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2],
          threshold: 2,
        }

        const address = await serviceWithKey.deploySafe(config)

        expect(address).toBe(TEST_ADDRESSES.safe1)
      })

      it('should deploy safe with custom salt nonce', async () => {
        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
          saltNonce: '456',
        }

        await serviceWithKey.deploySafe(config)

        expect(mockSafeInit).toHaveBeenCalledWith(
          expect.objectContaining({
            predictedSafe: expect.objectContaining({
              safeDeploymentConfig: expect.objectContaining({
                saltNonce: '456',
              }),
            }),
          })
        )
      })

      it('should initialize Safe SDK with correct parameters', async () => {
        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await serviceWithKey.deploySafe(config)

        expect(mockSafeInit).toHaveBeenCalledWith({
          provider: testChain.rpcUrl,
          signer: TEST_PRIVATE_KEYS.owner1,
          predictedSafe: {
            safeAccountConfig: {
              owners: config.owners,
              threshold: config.threshold,
            },
            safeDeploymentConfig: {
              safeVersion: '1.4.1',
              saltNonce: undefined,
            },
          },
        })
      })

      it('should send deployment transaction with correct parameters', async () => {
        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await serviceWithKey.deploySafe(config)

        expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
          to: TEST_ADDRESSES.safe1,
          value: BigInt('0'),
          data: '0x123456',
        })
      })

      it('should wait for transaction confirmation', async () => {
        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await serviceWithKey.deploySafe(config)

        expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
          hash: '0xtxhash',
        })
      })

      it('should return deployed safe address', async () => {
        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        const address = await serviceWithKey.deploySafe(config)

        expect(mockProtocolKit.getAddress).toHaveBeenCalled()
        expect(address).toBe(TEST_ADDRESSES.safe1)
      })
    })

    describe('error handling', () => {
      it('should throw error when private key not provided', async () => {
        const serviceWithoutKey = new SafeService(testChain) // No private key
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await expect(serviceWithoutKey.deploySafe(config)).rejects.toThrow('Private key required')
      })

      it('should throw SafeCLIError when Safe SDK init fails', async () => {
        mockSafeInit.mockRejectedValue(new Error('SDK init failed'))

        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await expect(serviceWithKey.deploySafe(config)).rejects.toThrow(SafeCLIError)
        await expect(serviceWithKey.deploySafe(config)).rejects.toThrow('Failed to deploy Safe')
      })

      it('should throw SafeCLIError when transaction fails', async () => {
        mockWalletClient.sendTransaction.mockRejectedValue(new Error('Transaction failed'))

        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await expect(serviceWithKey.deploySafe(config)).rejects.toThrow(SafeCLIError)
      })

      it('should throw SafeCLIError when waiting for receipt fails', async () => {
        mockPublicClient.waitForTransactionReceipt.mockRejectedValue(new Error('Receipt failed'))

        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await expect(serviceWithKey.deploySafe(config)).rejects.toThrow(SafeCLIError)
      })

      it('should include original error message', async () => {
        mockWalletClient.sendTransaction.mockRejectedValue(new Error('Insufficient funds'))

        const serviceWithKey = new SafeService(testChain, TEST_PRIVATE_KEYS.owner1)
        const config = {
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
        }

        await expect(serviceWithKey.deploySafe(config)).rejects.toThrow('Insufficient funds')
      })
    })
  })

  describe('getSafeInfo', () => {
    const mockPublicClient = {
      getBytecode: vi.fn(),
      getBalance: vi.fn(),
    }

    const mockProtocolKit = {
      getOwners: vi.fn(),
      getThreshold: vi.fn(),
      getNonce: vi.fn(),
      getContractVersion: vi.fn(),
    }

    beforeEach(() => {
      vi.mocked(createPublicClient).mockReturnValue(mockPublicClient as any)
      mockSafeInit.mockResolvedValue(mockProtocolKit as any)
    })

    describe('deployed safe', () => {
      beforeEach(() => {
        mockPublicClient.getBytecode.mockResolvedValue('0x123456')
        mockPublicClient.getBalance.mockResolvedValue(BigInt('1000000000000000000'))
        mockProtocolKit.getOwners.mockResolvedValue([TEST_ADDRESSES.owner1])
        mockProtocolKit.getThreshold.mockResolvedValue(1)
        mockProtocolKit.getNonce.mockResolvedValue(0)
        mockProtocolKit.getContractVersion.mockResolvedValue('1.4.1')
      })

      it('should get info for deployed safe', async () => {
        const info = await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(info).toEqual({
          address: TEST_ADDRESSES.safe1,
          owners: [TEST_ADDRESSES.owner1],
          threshold: 1,
          nonce: 0n,
          version: '1.4.1',
          isDeployed: true,
          balance: BigInt('1000000000000000000'),
        })
      })

      it('should check if safe is deployed', async () => {
        await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(mockPublicClient.getBytecode).toHaveBeenCalledWith({
          address: TEST_ADDRESSES.safe1,
        })
      })

      it('should initialize Safe SDK for deployed safe', async () => {
        await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(mockSafeInit).toHaveBeenCalledWith({
          provider: testChain.rpcUrl,
          safeAddress: TEST_ADDRESSES.safe1,
        })
      })

      it('should get all safe properties', async () => {
        await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(mockProtocolKit.getOwners).toHaveBeenCalled()
        expect(mockProtocolKit.getThreshold).toHaveBeenCalled()
        expect(mockProtocolKit.getNonce).toHaveBeenCalled()
        expect(mockProtocolKit.getContractVersion).toHaveBeenCalled()
      })

      it('should get safe balance', async () => {
        await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(mockPublicClient.getBalance).toHaveBeenCalledWith({
          address: TEST_ADDRESSES.safe1,
        })
      })

      it('should handle safe with multiple owners', async () => {
        mockProtocolKit.getOwners.mockResolvedValue([
          TEST_ADDRESSES.owner1,
          TEST_ADDRESSES.owner2,
          TEST_ADDRESSES.owner3,
        ])
        mockProtocolKit.getThreshold.mockResolvedValue(2)

        const info = await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(info.owners).toHaveLength(3)
        expect(info.threshold).toBe(2)
      })

      it('should handle safe with zero balance', async () => {
        mockPublicClient.getBalance.mockResolvedValue(BigInt('0'))

        const info = await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(info.balance).toBe(BigInt('0'))
      })

      it('should convert nonce to bigint', async () => {
        mockProtocolKit.getNonce.mockResolvedValue(5)

        const info = await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(info.nonce).toBe(5n)
        expect(typeof info.nonce).toBe('bigint')
      })
    })

    describe('undeployed safe', () => {
      beforeEach(() => {
        mockPublicClient.getBytecode.mockResolvedValue('0x')
      })

      it('should return empty info for undeployed safe', async () => {
        const info = await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(info).toEqual({
          address: TEST_ADDRESSES.safe1,
          owners: [],
          threshold: 0,
          nonce: 0n,
          version: 'unknown',
          isDeployed: false,
        })
      })

      it('should not call Safe SDK for undeployed safe', async () => {
        await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(mockSafeInit).not.toHaveBeenCalled()
      })

      it('should handle null bytecode', async () => {
        mockPublicClient.getBytecode.mockResolvedValue(null)

        const info = await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(info.isDeployed).toBe(false)
      })

      it('should handle undefined bytecode', async () => {
        mockPublicClient.getBytecode.mockResolvedValue(undefined)

        const info = await service.getSafeInfo(TEST_ADDRESSES.safe1)

        expect(info.isDeployed).toBe(false)
      })
    })

    describe('error handling', () => {
      it('should throw SafeCLIError when getBytecode fails', async () => {
        mockPublicClient.getBytecode.mockRejectedValue(new Error('RPC error'))

        await expect(service.getSafeInfo(TEST_ADDRESSES.safe1)).rejects.toThrow(SafeCLIError)
        await expect(service.getSafeInfo(TEST_ADDRESSES.safe1)).rejects.toThrow(
          'Failed to get Safe info'
        )
      })

      it('should throw SafeCLIError when Safe SDK fails', async () => {
        mockPublicClient.getBytecode.mockResolvedValue('0x123456')
        mockSafeInit.mockRejectedValue(new Error('SDK error'))

        await expect(service.getSafeInfo(TEST_ADDRESSES.safe1)).rejects.toThrow(SafeCLIError)
      })

      it('should include original error message', async () => {
        mockPublicClient.getBytecode.mockRejectedValue(new Error('Network timeout'))

        await expect(service.getSafeInfo(TEST_ADDRESSES.safe1)).rejects.toThrow('Network timeout')
      })

      it('should handle unknown error types', async () => {
        mockPublicClient.getBytecode.mockRejectedValue('string error')

        await expect(service.getSafeInfo(TEST_ADDRESSES.safe1)).rejects.toThrow('Unknown error')
      })
    })
  })
})
