import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContractService } from '../../../services/contract-service.js'
import { TEST_ADDRESSES, TEST_CHAINS } from '../../fixtures/index.js'
import { SafeCLIError } from '../../../utils/errors.js'
import type { Address } from 'viem'

// Mock dependencies
vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn((url: string) => url),
}))

// Import mocked modules for assertions
import { createPublicClient } from 'viem'

describe('ContractService', () => {
  let service: ContractService
  const testChain = TEST_CHAINS.ethereum

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ContractService(testChain)
  })

  describe('constructor', () => {
    it('should create service with chain config', () => {
      const svc = new ContractService(testChain)
      expect(svc).toBeInstanceOf(ContractService)
    })
  })

  describe('isContract', () => {
    const mockPublicClient = {
      getBytecode: vi.fn(),
    }

    beforeEach(() => {
      vi.mocked(createPublicClient).mockReturnValue(mockPublicClient as any)
    })

    describe('valid cases', () => {
      it('should return true for contract with bytecode', async () => {
        mockPublicClient.getBytecode.mockResolvedValue('0x608060405234801561001057600080fd5b50')

        const result = await service.isContract(TEST_ADDRESSES.safe1)

        expect(result).toBe(true)
      })

      it('should return false for EOA (no bytecode)', async () => {
        mockPublicClient.getBytecode.mockResolvedValue('0x')

        const result = await service.isContract(TEST_ADDRESSES.owner1)

        expect(result).toBe(false)
      })

      it('should return false for undefined bytecode', async () => {
        mockPublicClient.getBytecode.mockResolvedValue(undefined)

        const result = await service.isContract(TEST_ADDRESSES.owner1)

        expect(result).toBe(false)
      })

      it('should call getBytecode with correct address', async () => {
        mockPublicClient.getBytecode.mockResolvedValue('0x608060405234801561001057600080fd5b50')

        await service.isContract(TEST_ADDRESSES.safe1)

        expect(mockPublicClient.getBytecode).toHaveBeenCalledWith({
          address: TEST_ADDRESSES.safe1,
        })
      })

      it('should create public client with correct chain config', async () => {
        mockPublicClient.getBytecode.mockResolvedValue('0x608060405234801561001057600080fd5b50')

        await service.isContract(TEST_ADDRESSES.safe1)

        expect(createPublicClient).toHaveBeenCalledWith({
          chain: {
            id: parseInt(testChain.chainId, 10),
            name: testChain.name,
            nativeCurrency: {
              name: testChain.currency,
              symbol: testChain.currency,
              decimals: 18,
            },
            rpcUrls: {
              default: { http: [testChain.rpcUrl] },
              public: { http: [testChain.rpcUrl] },
            },
          },
          transport: testChain.rpcUrl,
        })
      })

      it('should return true for contract with small bytecode', async () => {
        mockPublicClient.getBytecode.mockResolvedValue('0x60806040')

        const result = await service.isContract(TEST_ADDRESSES.safe1)

        expect(result).toBe(true)
      })

      it('should return true for contract with large bytecode', async () => {
        mockPublicClient.getBytecode.mockResolvedValue('0x' + '60'.repeat(1000))

        const result = await service.isContract(TEST_ADDRESSES.safe1)

        expect(result).toBe(true)
      })
    })

    describe('error handling', () => {
      it('should throw SafeCLIError when getBytecode fails', async () => {
        mockPublicClient.getBytecode.mockRejectedValue(new Error('RPC error'))

        await expect(service.isContract(TEST_ADDRESSES.safe1)).rejects.toThrow(SafeCLIError)
        await expect(service.isContract(TEST_ADDRESSES.safe1)).rejects.toThrow(
          'Failed to check contract'
        )
      })

      it('should include original error message', async () => {
        mockPublicClient.getBytecode.mockRejectedValue(new Error('Network timeout'))

        await expect(service.isContract(TEST_ADDRESSES.safe1)).rejects.toThrow('Network timeout')
      })

      it('should handle unknown error types', async () => {
        mockPublicClient.getBytecode.mockRejectedValue('string error')

        await expect(service.isContract(TEST_ADDRESSES.safe1)).rejects.toThrow('Unknown error')
      })
    })
  })

  describe('getImplementationAddress', () => {
    const mockPublicClient = {
      getStorageAt: vi.fn(),
      getBytecode: vi.fn(),
      readContract: vi.fn(),
    }

    const EIP1967_IMPLEMENTATION_SLOT =
      '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
    const EIP1967_BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'

    beforeEach(() => {
      vi.mocked(createPublicClient).mockReturnValue(mockPublicClient as any)
    })

    describe('EIP-1967 implementation slot', () => {
      it('should detect proxy and return implementation address', async () => {
        // Storage returns implementation address padded to 32 bytes
        const implementationAddress = TEST_ADDRESSES.safe2.toLowerCase()
        const paddedAddress = '0x' + '0'.repeat(24) + implementationAddress.slice(2)

        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_IMPLEMENTATION_SLOT) {
            return paddedAddress as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        mockPublicClient.getBytecode.mockResolvedValue('0x608060405234801561001057600080fd5b50')

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBe(implementationAddress)
      })

      it('should call getStorageAt with implementation slot', async () => {
        const implementationAddress = TEST_ADDRESSES.safe2.toLowerCase()
        const paddedAddress = '0x' + '0'.repeat(24) + implementationAddress.slice(2)

        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_IMPLEMENTATION_SLOT) {
            return paddedAddress as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        mockPublicClient.getBytecode.mockResolvedValue('0x608060405234801561001057600080fd5b50')

        await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(mockPublicClient.getStorageAt).toHaveBeenCalledWith({
          address: TEST_ADDRESSES.safe1,
          slot: EIP1967_IMPLEMENTATION_SLOT,
        })
      })

      it('should verify implementation is a valid contract', async () => {
        const implementationAddress = TEST_ADDRESSES.safe2.toLowerCase()
        const paddedAddress = '0x' + '0'.repeat(24) + implementationAddress.slice(2)

        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_IMPLEMENTATION_SLOT) {
            return paddedAddress as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        mockPublicClient.getBytecode.mockResolvedValue('0x608060405234801561001057600080fd5b50')

        await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(mockPublicClient.getBytecode).toHaveBeenCalledWith({
          address: implementationAddress,
        })
      })

      it('should return null if implementation is not a contract', async () => {
        const implementationAddress = TEST_ADDRESSES.safe2.toLowerCase()
        const paddedAddress = '0x' + '0'.repeat(24) + implementationAddress.slice(2)

        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_IMPLEMENTATION_SLOT) {
            return paddedAddress as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        // Implementation address has no bytecode (not a contract)
        mockPublicClient.getBytecode.mockResolvedValue('0x')

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBeNull()
      })

      it('should handle implementation slot with all zeros', async () => {
        mockPublicClient.getStorageAt.mockResolvedValue(('0x' + '0'.repeat(64)) as `0x${string}`)

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBeNull()
      })
    })

    describe('EIP-1967 beacon slot', () => {
      it('should detect beacon proxy and return implementation', async () => {
        const beaconAddress = TEST_ADDRESSES.safe2.toLowerCase()
        const implementationAddress = TEST_ADDRESSES.owner3

        // No implementation slot, but beacon slot is set
        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_BEACON_SLOT) {
            return ('0x' + '0'.repeat(24) + beaconAddress.slice(2)) as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        mockPublicClient.readContract.mockResolvedValue(implementationAddress)

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBe(implementationAddress)
      })

      it('should call getStorageAt with beacon slot', async () => {
        const beaconAddress = TEST_ADDRESSES.safe2.toLowerCase()

        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_BEACON_SLOT) {
            return ('0x' + '0'.repeat(24) + beaconAddress.slice(2)) as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        mockPublicClient.readContract.mockResolvedValue(TEST_ADDRESSES.owner3)

        await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(mockPublicClient.getStorageAt).toHaveBeenCalledWith({
          address: TEST_ADDRESSES.safe1,
          slot: EIP1967_BEACON_SLOT,
        })
      })

      it('should call readContract on beacon with implementation() function', async () => {
        const beaconAddress = TEST_ADDRESSES.safe2.toLowerCase()

        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_BEACON_SLOT) {
            return ('0x' + '0'.repeat(24) + beaconAddress.slice(2)) as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        mockPublicClient.readContract.mockResolvedValue(TEST_ADDRESSES.owner3)

        await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(mockPublicClient.readContract).toHaveBeenCalledWith({
          address: beaconAddress,
          abi: [
            {
              type: 'function',
              name: 'implementation',
              inputs: [],
              outputs: [{ type: 'address' }],
              stateMutability: 'view',
            },
          ],
          functionName: 'implementation',
        })
      })

      it('should return null if beacon readContract fails', async () => {
        const beaconAddress = TEST_ADDRESSES.safe2.toLowerCase()

        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_BEACON_SLOT) {
            return ('0x' + '0'.repeat(24) + beaconAddress.slice(2)) as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        mockPublicClient.readContract.mockRejectedValue(new Error('Not a beacon'))

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBeNull()
      })

      it('should return null if beacon slot is all zeros', async () => {
        mockPublicClient.getStorageAt.mockResolvedValue(('0x' + '0'.repeat(64)) as `0x${string}`)

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBeNull()
      })
    })

    describe('not a proxy', () => {
      it('should return null when no proxy slots are set', async () => {
        mockPublicClient.getStorageAt.mockResolvedValue(('0x' + '0'.repeat(64)) as `0x${string}`)

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBeNull()
      })

      it('should return null when getStorageAt fails', async () => {
        mockPublicClient.getStorageAt.mockRejectedValue(new Error('RPC error'))

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBeNull()
      })

      it('should return null when storage returns null', async () => {
        mockPublicClient.getStorageAt.mockResolvedValue(null as any)

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBeNull()
      })

      it('should return null when storage returns undefined', async () => {
        mockPublicClient.getStorageAt.mockResolvedValue(undefined as any)

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBeNull()
      })
    })

    describe('edge cases', () => {
      it('should try beacon slot if implementation slot has invalid contract', async () => {
        const invalidImplAddress = TEST_ADDRESSES.safe2.toLowerCase()
        const beaconAddress = TEST_ADDRESSES.owner1.toLowerCase()
        const validImplAddress = TEST_ADDRESSES.owner3

        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_IMPLEMENTATION_SLOT) {
            return ('0x' + '0'.repeat(24) + invalidImplAddress.slice(2)) as `0x${string}`
          }
          if (slot === EIP1967_BEACON_SLOT) {
            return ('0x' + '0'.repeat(24) + beaconAddress.slice(2)) as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        // First getBytecode call for implementation slot returns no bytecode
        mockPublicClient.getBytecode.mockResolvedValue('0x')
        // readContract for beacon returns valid implementation
        mockPublicClient.readContract.mockResolvedValue(validImplAddress)

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBe(validImplAddress)
      })

      it('should extract address correctly from padded storage', async () => {
        const implementationAddress = '0x1234567890123456789012345678901234567890'
        const paddedAddress = '0x' + '0'.repeat(24) + implementationAddress.slice(2)

        mockPublicClient.getStorageAt.mockImplementation(async ({ slot }) => {
          if (slot === EIP1967_IMPLEMENTATION_SLOT) {
            return paddedAddress as `0x${string}`
          }
          return ('0x' + '0'.repeat(64)) as `0x${string}`
        })

        mockPublicClient.getBytecode.mockResolvedValue('0x608060405234801561001057600080fd5b50')

        const result = await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(result).toBe(implementationAddress.toLowerCase())
      })

      it('should create public client with correct chain config', async () => {
        mockPublicClient.getStorageAt.mockResolvedValue(('0x' + '0'.repeat(64)) as `0x${string}`)

        await service.getImplementationAddress(TEST_ADDRESSES.safe1)

        expect(createPublicClient).toHaveBeenCalledWith({
          chain: {
            id: parseInt(testChain.chainId, 10),
            name: testChain.name,
            nativeCurrency: {
              name: testChain.currency,
              symbol: testChain.currency,
              decimals: 18,
            },
            rpcUrls: {
              default: { http: [testChain.rpcUrl] },
              public: { http: [testChain.rpcUrl] },
            },
          },
          transport: testChain.rpcUrl,
        })
      })
    })
  })
})
