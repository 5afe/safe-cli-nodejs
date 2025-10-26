import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ABIService } from '../../../services/abi-service.js'
import type { ABI, ABIFunction } from '../../../services/abi-service.js'
import { TEST_ADDRESSES, TEST_CHAINS } from '../../fixtures/index.js'
import { SafeCLIError } from '../../../utils/errors.js'

// Mock global fetch
const mockFetch = vi.fn()

describe('ABIService', () => {
  let service: ABIService
  let serviceWithApiKey: ABIService
  const testChain = TEST_CHAINS.ethereum
  const testApiKey = 'test-api-key-123'

  const mockABI: ABI = [
    {
      type: 'function',
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    service = new ABIService(testChain)
    serviceWithApiKey = new ABIService(testChain, testApiKey)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('constructor', () => {
    it('should create service without API key', () => {
      const svc = new ABIService(testChain)
      expect(svc).toBeInstanceOf(ABIService)
    })

    it('should create service with API key', () => {
      const svc = new ABIService(testChain, testApiKey)
      expect(svc).toBeInstanceOf(ABIService)
    })
  })

  describe('fetchABI', () => {
    it('should fetch ABI successfully', async () => {
      // Mock Etherscan success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '1',
          result: [
            {
              ABI: JSON.stringify(mockABI),
              ContractName: 'TestContract',
            },
          ],
        }),
      })

      const abi = await serviceWithApiKey.fetchABI(TEST_ADDRESSES.safe1)

      expect(abi).toEqual(mockABI)
    })

    it('should return ABI from Sourcify when Etherscan fails', async () => {
      // Etherscan fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '0',
          result: [],
        }),
      })

      // Sourcify succeeds (full match)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          output: { abi: mockABI },
          settings: {
            compilationTarget: { 'contracts/Test.sol': 'TestContract' },
          },
        }),
      })

      const abi = await serviceWithApiKey.fetchABI(TEST_ADDRESSES.safe1)

      expect(abi).toEqual(mockABI)
    })

    it('should throw error when all sources fail', async () => {
      // Etherscan fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '0',
        }),
      })

      // Sourcify full match fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      // Sourcify partial match fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(serviceWithApiKey.fetchABI(TEST_ADDRESSES.safe1)).rejects.toThrow(SafeCLIError)
      await expect(serviceWithApiKey.fetchABI(TEST_ADDRESSES.safe1)).rejects.toThrow(
        'Could not fetch ABI'
      )
    })
  })

  describe('fetchContractInfo', () => {
    it('should fetch contract info with Etherscan (with API key)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '1',
          result: [
            {
              ABI: JSON.stringify(mockABI),
              ContractName: 'TestContract',
            },
          ],
        }),
      })

      const info = await serviceWithApiKey.fetchContractInfo(TEST_ADDRESSES.safe1)

      expect(info.abi).toEqual(mockABI)
      expect(info.name).toBe('TestContract')
      expect(info.implementation).toBeUndefined()
    })

    it('should detect proxy contracts', async () => {
      const implAddress = TEST_ADDRESSES.safe2

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '1',
          result: [
            {
              ABI: JSON.stringify(mockABI),
              ContractName: 'Proxy',
              Proxy: '1',
              Implementation: implAddress,
            },
          ],
        }),
      })

      const info = await serviceWithApiKey.fetchContractInfo(TEST_ADDRESSES.safe1)

      expect(info.implementation).toBe(implAddress)
    })

    it('should try Sourcify first when no API key', async () => {
      // Sourcify full match succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          output: { abi: mockABI },
          settings: {
            compilationTarget: { 'contracts/Test.sol': 'TestContract' },
          },
        }),
      })

      const info = await service.fetchContractInfo(TEST_ADDRESSES.safe1)

      expect(info.abi).toEqual(mockABI)
      expect(info.name).toBe('TestContract')
      // Should only call Sourcify, not Etherscan
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch.mock.calls[0][0]).toContain('sourcify')
    })

    it('should try Etherscan first when API key provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '1',
          result: [
            {
              ABI: JSON.stringify(mockABI),
              ContractName: 'TestContract',
            },
          ],
        }),
      })

      await serviceWithApiKey.fetchContractInfo(TEST_ADDRESSES.safe1)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch.mock.calls[0][0]).toContain('etherscan')
      expect(mockFetch.mock.calls[0][0]).toContain(`apikey=${testApiKey}`)
    })

    it('should fallback from Etherscan to Sourcify', async () => {
      // Etherscan fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '0',
        }),
      })

      // Sourcify succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          output: { abi: mockABI },
        }),
      })

      const info = await serviceWithApiKey.fetchContractInfo(TEST_ADDRESSES.safe1)

      expect(info.abi).toEqual(mockABI)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should fallback from Sourcify to Etherscan (no API key)', async () => {
      // Sourcify full match fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      // Sourcify partial match fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      // Etherscan succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '1',
          result: [
            {
              ABI: JSON.stringify(mockABI),
              ContractName: 'TestContract',
            },
          ],
        }),
      })

      const info = await service.fetchContractInfo(TEST_ADDRESSES.safe1)

      expect(info.abi).toEqual(mockABI)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should try partial match when full match fails on Sourcify', async () => {
      // Full match fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      // Partial match succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          output: { abi: mockABI },
        }),
      })

      const info = await service.fetchContractInfo(TEST_ADDRESSES.safe1)

      expect(info.abi).toEqual(mockABI)
      const calls = mockFetch.mock.calls
      expect(calls[0][0]).toContain('full_match')
      expect(calls[1][0]).toContain('partial_match')
    })

    it('should handle not verified contracts gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '1',
          result: [
            {
              ABI: 'Contract source code not verified',
            },
          ],
        }),
      })

      // All Sourcify attempts fail
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      })

      await expect(serviceWithApiKey.fetchContractInfo(TEST_ADDRESSES.safe1)).rejects.toThrow(
        SafeCLIError
      )
    })
  })

  describe('extract Functions', () => {
    it('should extract state-changing functions (nonpayable)', () => {
      const abi: ABI = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
        {
          type: 'function',
          name: 'balanceOf',
          inputs: [],
          outputs: [],
          stateMutability: 'view',
        },
      ]

      const functions = service.extractFunctions(abi)

      expect(functions).toHaveLength(1)
      expect(functions[0].name).toBe('transfer')
    })

    it('should extract payable functions', () => {
      const abi: ABI = [
        {
          type: 'function',
          name: 'deposit',
          inputs: [],
          outputs: [],
          stateMutability: 'payable',
        },
        {
          type: 'function',
          name: 'withdraw',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ]

      const functions = service.extractFunctions(abi)

      expect(functions).toHaveLength(2)
      expect(functions.map((f) => f.name).sort()).toEqual(['deposit', 'withdraw'])
    })

    it('should exclude view and pure functions', () => {
      const abi: ABI = [
        {
          type: 'function',
          name: 'balanceOf',
          inputs: [],
          outputs: [],
          stateMutability: 'view',
        },
        {
          type: 'function',
          name: 'calculate',
          inputs: [],
          outputs: [],
          stateMutability: 'pure',
        },
      ]

      const functions = service.extractFunctions(abi)

      expect(functions).toHaveLength(0)
    })

    it('should exclude non-function items', () => {
      const abi: ABI = [
        {
          type: 'event',
          name: 'Transfer',
          inputs: [],
        },
        {
          type: 'constructor',
          inputs: [],
        },
      ]

      const functions = service.extractFunctions(abi)

      expect(functions).toHaveLength(0)
    })

    it('should handle legacy contracts without stateMutability', () => {
      const abi: ABI = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
          constant: false,
        } as ABIFunction,
        {
          type: 'function',
          name: 'balanceOf',
          inputs: [],
          outputs: [],
          stateMutability: 'view',
          constant: true,
        } as ABIFunction,
      ]

      const functions = service.extractFunctions(abi)

      expect(functions.length).toBeGreaterThanOrEqual(1)
      expect(functions.some((f) => f.name === 'transfer')).toBe(true)
      expect(functions.some((f) => f.name === 'balanceOf')).toBe(false)
    })

    it('should sort functions alphabetically', () => {
      const abi: ABI = [
        {
          type: 'function',
          name: 'zebra',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
        {
          type: 'function',
          name: 'apple',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
        {
          type: 'function',
          name: 'mango',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ]

      const functions = service.extractFunctions(abi)

      expect(functions).toHaveLength(3)
      expect(functions[0].name).toBe('apple')
      expect(functions[1].name).toBe('mango')
      expect(functions[2].name).toBe('zebra')
    })
  })

  describe('extractViewFunctions', () => {
    it('should extract view functions', () => {
      const abi: ABI = [
        {
          type: 'function',
          name: 'balanceOf',
          inputs: [],
          outputs: [],
          stateMutability: 'view',
        },
        {
          type: 'function',
          name: 'transfer',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ]

      const functions = service.extractViewFunctions(abi)

      expect(functions).toHaveLength(1)
      expect(functions[0].name).toBe('balanceOf')
    })

    it('should extract pure functions', () => {
      const abi: ABI = [
        {
          type: 'function',
          name: 'calculate',
          inputs: [],
          outputs: [],
          stateMutability: 'pure',
        },
        {
          type: 'function',
          name: 'getValue',
          inputs: [],
          outputs: [],
          stateMutability: 'view',
        },
      ]

      const functions = service.extractViewFunctions(abi)

      expect(functions).toHaveLength(2)
      expect(functions.map((f) => f.name).sort()).toEqual(['calculate', 'getValue'])
    })

    it('should exclude nonpayable and payable functions', () => {
      const abi: ABI = [
        {
          type: 'function',
          name: 'transfer',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
        {
          type: 'function',
          name: 'deposit',
          inputs: [],
          outputs: [],
          stateMutability: 'payable',
        },
      ]

      const functions = service.extractViewFunctions(abi)

      expect(functions).toHaveLength(0)
    })

    it('should sort functions alphabetically', () => {
      const abi: ABI = [
        {
          type: 'function',
          name: 'zebra',
          inputs: [],
          outputs: [],
          stateMutability: 'view',
        },
        {
          type: 'function',
          name: 'apple',
          inputs: [],
          outputs: [],
          stateMutability: 'pure',
        },
        {
          type: 'function',
          name: 'mango',
          inputs: [],
          outputs: [],
          stateMutability: 'view',
        },
      ]

      const functions = service.extractViewFunctions(abi)

      expect(functions).toHaveLength(3)
      expect(functions[0].name).toBe('apple')
      expect(functions[1].name).toBe('mango')
      expect(functions[2].name).toBe('zebra')
    })
  })

  describe('formatFunctionSignature', () => {
    it('should format function with named inputs', () => {
      const func: ABIFunction = {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      }

      const signature = service.formatFunctionSignature(func)

      expect(signature).toBe('transfer(address to, uint256 amount)')
    })

    it('should format function with unnamed inputs using underscore', () => {
      const func: ABIFunction = {
        type: 'function',
        name: 'approve',
        inputs: [
          { name: '', type: 'address' },
          { name: '', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      }

      const signature = service.formatFunctionSignature(func)

      expect(signature).toBe('approve(address _, uint256 _)')
    })

    it('should format function with no inputs', () => {
      const func: ABIFunction = {
        type: 'function',
        name: 'totalSupply',
        inputs: [],
        outputs: [],
        stateMutability: 'view',
      }

      const signature = service.formatFunctionSignature(func)

      expect(signature).toBe('totalSupply()')
    })

    it('should format function with complex types', () => {
      const func: ABIFunction = {
        type: 'function',
        name: 'complexFunction',
        inputs: [
          { name: 'data', type: 'bytes32' },
          { name: 'values', type: 'uint256[]' },
          { name: 'account', type: 'address' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      }

      const signature = service.formatFunctionSignature(func)

      expect(signature).toBe('complexFunction(bytes32 data, uint256[] values, address account)')
    })

    it('should format function with tuple inputs', () => {
      const func: ABIFunction = {
        type: 'function',
        name: 'updateStruct',
        inputs: [{ name: 'user', type: 'tuple', internalType: 'struct User' }],
        outputs: [],
        stateMutability: 'nonpayable',
      }

      const signature = service.formatFunctionSignature(func)

      expect(signature).toBe('updateStruct(tuple user)')
    })

    it('should format function with mixed named and unnamed inputs', () => {
      const func: ABIFunction = {
        type: 'function',
        name: 'mixedInputs',
        inputs: [
          { name: 'to', type: 'address' },
          { name: '', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      }

      const signature = service.formatFunctionSignature(func)

      expect(signature).toBe('mixedInputs(address to, uint256 _, bytes data)')
    })
  })

  describe('fetchWithTimeout (error handling)', () => {
    it('should handle timeout/abort errors', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const error = new Error('Timeout')
            error.name = 'AbortError'
            reject(error)
          })
      )

      await expect(serviceWithApiKey.fetchContractInfo(TEST_ADDRESSES.safe1)).rejects.toThrow(
        SafeCLIError
      )
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(serviceWithApiKey.fetchContractInfo(TEST_ADDRESSES.safe1)).rejects.toThrow(
        SafeCLIError
      )
    })
  })

  describe('URL construction', () => {
    it('should construct Etherscan API URL for domain without subdomain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '1',
          result: [{ ABI: JSON.stringify(mockABI), ContractName: 'Test' }],
        }),
      })

      await serviceWithApiKey.fetchContractInfo(TEST_ADDRESSES.safe1)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('https://api.etherscan.io/v2/api')
      expect(url).toContain(`chainid=1`)
      expect(url).toContain(`address=${TEST_ADDRESSES.safe1}`)
      expect(url).toContain(`apikey=${testApiKey}`)
    })

    it('should construct Etherscan API URL for domain with subdomain', async () => {
      const sepoliaService = new ABIService(TEST_CHAINS.sepolia, testApiKey)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: '1',
          result: [{ ABI: JSON.stringify(mockABI), ContractName: 'Test' }],
        }),
      })

      await sepoliaService.fetchContractInfo(TEST_ADDRESSES.safe1)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('https://api-sepolia.etherscan.io/v2/api')
    })

    it('should construct Sourcify URL correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          output: { abi: mockABI },
        }),
      })

      await service.fetchContractInfo(TEST_ADDRESSES.safe1)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('https://repo.sourcify.dev/contracts/full_match')
      expect(url).toContain(`/1/${TEST_ADDRESSES.safe1}/metadata.json`)
    })
  })
})
