import { vi } from 'vitest'
import type { Address, PublicClient, WalletClient } from 'viem'
import { TEST_ADDRESSES, TEST_CHAINS } from '../fixtures/index.js'

/**
 * Factory functions for creating mock objects used in tests
 */

/**
 * Create a mock viem PublicClient
 */
export function createMockPublicClient(overrides?: Partial<PublicClient>): PublicClient {
  return {
    // Chain info
    chain: {
      id: 1,
      name: 'Ethereum',
      network: 'mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://eth.llamarpc.com'] },
        public: { http: ['https://eth.llamarpc.com'] },
      },
    },

    // RPC methods
    getCode: vi.fn().mockResolvedValue('0x'),
    getStorageAt: vi.fn().mockResolvedValue('0x' + '0'.repeat(64)),
    getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')), // 1 ETH
    getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000000)),
    getGasPrice: vi.fn().mockResolvedValue(BigInt('1000000000')), // 1 gwei
    getTransaction: vi.fn().mockResolvedValue(null),
    getTransactionReceipt: vi.fn().mockResolvedValue(null),
    getTransactionCount: vi.fn().mockResolvedValue(0),
    estimateGas: vi.fn().mockResolvedValue(BigInt(21000)),
    call: vi.fn().mockResolvedValue('0x'),
    readContract: vi.fn().mockResolvedValue(null),
    simulateContract: vi.fn().mockResolvedValue({ result: null, request: {} }),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: 'success',
      transactionHash: '0x' + '1'.repeat(64),
      blockNumber: BigInt(1000000),
      blockHash: '0x' + '2'.repeat(64),
      gasUsed: BigInt(21000),
      effectiveGasPrice: BigInt('1000000000'),
    }),

    ...overrides,
  } as unknown as PublicClient
}

/**
 * Create a mock viem WalletClient
 */
export function createMockWalletClient(overrides?: Partial<WalletClient>): WalletClient {
  return {
    account: {
      address: TEST_ADDRESSES.owner1,
      type: 'local',
    },
    chain: {
      id: 1,
      name: 'Ethereum',
      network: 'mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://eth.llamarpc.com'] },
        public: { http: ['https://eth.llamarpc.com'] },
      },
    },

    // Wallet methods
    signMessage: vi.fn().mockResolvedValue('0x' + '1'.repeat(130)),
    signTypedData: vi.fn().mockResolvedValue('0x' + '1'.repeat(130)),
    sendTransaction: vi.fn().mockResolvedValue('0x' + '1'.repeat(64)),
    writeContract: vi.fn().mockResolvedValue('0x' + '1'.repeat(64)),

    ...overrides,
  } as unknown as WalletClient
}

/**
 * Create a mock Safe Protocol Kit (SafeSDK)
 */
export function createMockSafeSDK(safeAddress: Address = TEST_ADDRESSES.safe1) {
  return {
    getAddress: vi.fn().mockResolvedValue(safeAddress),
    getOwners: vi.fn().mockResolvedValue([TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2]),
    getThreshold: vi.fn().mockResolvedValue(1),
    getNonce: vi.fn().mockResolvedValue(0),
    getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
    getContractVersion: vi.fn().mockResolvedValue('1.4.1'),
    getChainId: vi.fn().mockResolvedValue(BigInt(1)),
    isModuleEnabled: vi.fn().mockResolvedValue(false),
    isOwner: vi.fn().mockResolvedValue(true),

    // Transaction methods
    createTransaction: vi.fn().mockResolvedValue({
      data: {
        to: TEST_ADDRESSES.recipient1,
        value: '1000000000000000000',
        data: '0x',
        operation: 0,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: TEST_ADDRESSES.zeroAddress,
        refundReceiver: TEST_ADDRESSES.zeroAddress,
        nonce: 0,
      },
    }),
    signTransaction: vi.fn().mockResolvedValue({
      data: {},
      signatures: new Map([
        [TEST_ADDRESSES.owner1, { signer: TEST_ADDRESSES.owner1, data: '0x' + '1'.repeat(130) }],
      ]),
    }),
    executeTransaction: vi.fn().mockResolvedValue({
      hash: '0x' + '1'.repeat(64),
    }),
    getTransactionHash: vi.fn().mockResolvedValue('0x' + '1'.repeat(64)),

    // Owner management
    createAddOwnerTx: vi.fn().mockResolvedValue({
      data: {
        to: safeAddress,
        value: '0',
        data: '0x',
      },
    }),
    createRemoveOwnerTx: vi.fn().mockResolvedValue({
      data: {
        to: safeAddress,
        value: '0',
        data: '0x',
      },
    }),
    createChangeThresholdTx: vi.fn().mockResolvedValue({
      data: {
        to: safeAddress,
        value: '0',
        data: '0x',
      },
    }),
  }
}

/**
 * Create a mock Safe API Kit
 */
export function createMockSafeApiKit() {
  return {
    proposeTransaction: vi.fn().mockResolvedValue(undefined),
    confirmTransaction: vi.fn().mockResolvedValue({ signature: '0x' + '1'.repeat(130) }),
    getTransaction: vi.fn().mockResolvedValue({
      safe: TEST_ADDRESSES.safe1,
      to: TEST_ADDRESSES.recipient1,
      value: '1000000000000000000',
      data: '0x',
      operation: 0,
      safeTxGas: 0,
      baseGas: 0,
      gasPrice: '0',
      gasToken: TEST_ADDRESSES.zeroAddress,
      refundReceiver: TEST_ADDRESSES.zeroAddress,
      nonce: 0,
      safeTxHash: '0x' + '1'.repeat(64),
      confirmations: [],
      confirmationsRequired: 1,
    }),
    getPendingTransactions: vi.fn().mockResolvedValue({
      count: 0,
      results: [],
    }),
    getAllTransactions: vi.fn().mockResolvedValue({
      count: 0,
      results: [],
    }),
    addMessageSignature: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse(
  body: unknown,
  options?: { status?: number; statusText?: string; ok?: boolean }
) {
  return {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    statusText: options?.statusText ?? 'OK',
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    headers: new Headers(),
  } as unknown as Response
}

/**
 * Setup mock fetch for testing HTTP requests
 */
export function setupMockFetch() {
  const mockFetch = vi.fn()
  global.fetch = mockFetch
  return mockFetch
}

/**
 * Create mock Etherscan response for ABI fetch
 */
export function createMockEtherscanResponse(
  abi: unknown[],
  isProxy = false,
  implementationAddress?: string
) {
  return createMockFetchResponse({
    status: '1',
    message: 'OK',
    result: [
      {
        SourceCode: '',
        ABI: JSON.stringify(abi),
        ContractName: 'TestContract',
        CompilerVersion: 'v0.8.20+commit.a1b79de6',
        OptimizationUsed: '1',
        Runs: '200',
        ConstructorArguments: '',
        EVMVersion: 'Default',
        Library: '',
        LicenseType: 'MIT',
        Proxy: isProxy ? '1' : '0',
        Implementation: implementationAddress || '',
        SwarmSource: '',
      },
    ],
  })
}

/**
 * Create mock Sourcify response for ABI fetch
 */
export function createMockSourcifyResponse(abi: unknown[]) {
  return createMockFetchResponse({
    output: {
      abi,
      devdoc: {},
      userdoc: {},
    },
    settings: {
      compilationTarget: {
        'contracts/TestContract.sol': 'TestContract',
      },
    },
  })
}

/**
 * Create a mock Safe with custom configuration
 */
export interface MockSafeOptions {
  address?: Address
  owners?: Address[]
  threshold?: number
  nonce?: number
  balance?: bigint
  chainId?: string
}

export function createMockSafe(options: MockSafeOptions = {}) {
  return {
    address: options.address || TEST_ADDRESSES.safe1,
    owners: options.owners || [TEST_ADDRESSES.owner1],
    threshold: options.threshold || 1,
    nonce: options.nonce || 0,
    balance: options.balance || BigInt('1000000000000000000'),
    chainId: options.chainId || '1',
    version: '1.4.1',
    deployed: true,
  }
}

/**
 * Create a mock wallet for testing
 */
export interface MockWalletOptions {
  id?: string
  name?: string
  address?: Address
  privateKey?: string
  isActive?: boolean
}

export function createMockWallet(options: MockWalletOptions = {}) {
  return {
    id: options.id || 'test-wallet-1',
    name: options.name || 'Test Wallet',
    address: options.address || TEST_ADDRESSES.owner1,
    createdAt: new Date().toISOString(),
    isActive: options.isActive ?? false,
  }
}

/**
 * Create a mock chain config
 */
export function createMockChainConfig(chainId = '1') {
  return TEST_CHAINS.ethereum
}

/**
 * Setup global mocks for tests
 */
export function setupGlobalMocks() {
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }
}

/**
 * Restore global mocks
 */
export function restoreGlobalMocks() {
  vi.restoreAllMocks()
}

/**
 * Create a mock with async delay (for testing loading states)
 */
export function createMockWithDelay<T>(value: T, delay = 100) {
  return vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(value), delay)
      })
  )
}

/**
 * Create a mock that fails after N successful calls
 */
export function createFlakymock<T>(successValue: T, failAfter = 3) {
  let callCount = 0
  return vi.fn().mockImplementation(() => {
    callCount++
    if (callCount > failAfter) {
      return Promise.reject(new Error('Mock failure'))
    }
    return Promise.resolve(successValue)
  })
}
