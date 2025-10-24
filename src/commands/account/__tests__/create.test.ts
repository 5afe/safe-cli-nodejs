import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSafe } from '../create.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as safeStorageModule from '../../../storage/safe-store.js'
import * as walletStorageModule from '../../../storage/wallet-store.js'
import * as SafeServiceModule from '../../../services/safe-service.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('../../../storage/safe-store.js')
vi.mock('../../../storage/wallet-store.js')
vi.mock('../../../services/safe-service.js')
vi.mock('@clack/prompts')

describe('createSafe', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleMock = mockConsole()

    vi.mocked(p.intro).mockImplementation(() => {})
    vi.mocked(p.outro).mockImplementation(() => {})
    vi.mocked(p.cancel).mockImplementation(() => {})
    vi.mocked(p.isCancel).mockReturnValue(false)
    vi.mocked(p.spinner).mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
      message: vi.fn(),
    } as any)
  })

  afterEach(() => {
    consoleMock.restore()
  })

  it('should create a Safe successfully', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '11155111': {
          chainId: '11155111',
          name: 'Sepolia',
          rpcUrl: 'https://rpc.sepolia.org',
          currency: 'ETH',
        },
      }),
      getChain: vi.fn().mockReturnValue({
        chainId: '11155111',
        name: 'Sepolia',
        rpcUrl: 'https://rpc.sepolia.org',
        currency: 'ETH',
      }),
    }

    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          name: 'Test Wallet',
          address: '0x1234567890123456789012345678901234567890',
        },
      ]),
      getActiveWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        name: 'Test Wallet',
        address: '0x1234567890123456789012345678901234567890',
      }),
    }

    const mockSafeStore = {
      createSafe: vi.fn().mockReturnValue({
        id: 'safe-1',
        name: 'Test Safe',
        address: '0xabcdef0123456789abcdef0123456789abcdef01',
        chainId: '11155111',
        version: '1.4.1',
        owners: ['0x1234567890123456789012345678901234567890'],
        threshold: 1,
        deployed: false,
      }),
      safeExists: vi.fn().mockReturnValue(false),
    }

    const mockSafeService = {
      createPredictedSafe: vi.fn().mockResolvedValue({
        predictedAddress: '0xabcdef0123456789abcdef0123456789abcdef01',
        safeAccountConfig: {
          owners: ['0x1234567890123456789012345678901234567890'],
          threshold: 1,
        },
        safeVersion: '1.4.1',
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)
    vi.mocked(safeStorageModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(SafeServiceModule.SafeService).mockImplementation(() => mockSafeService as any)

    // Mock user inputs
    vi.mocked(p.text).mockResolvedValueOnce('Test Safe') // name
    vi.mocked(p.select).mockResolvedValueOnce('11155111') // chain
    vi.mocked(p.multiselect).mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']) // owners
    vi.mocked(p.text).mockResolvedValueOnce('1') // threshold

    await createSafe()

    expect(mockSafeService.createPredictedSafe).toHaveBeenCalledWith({
      owners: ['0x1234567890123456789012345678901234567890'],
      threshold: 1,
    })
    expect(mockSafeStore.createSafe).toHaveBeenCalled()
    expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('created'))
  })

  it('should handle user cancellation', async () => {
    vi.mocked(p.text).mockResolvedValueOnce(Symbol.for('cancel') as any)
    vi.mocked(p.isCancel).mockReturnValue(true)

    await createSafe()

    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })

  it('should validate threshold', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '11155111': { chainId: '11155111', name: 'Sepolia' },
      }),
    }

    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          address: '0x1234567890123456789012345678901234567890',
        },
        {
          id: 'wallet-2',
          address: '0x0987654321098765432109876543210987654321',
        },
      ]),
      getActiveWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        address: '0x1234567890123456789012345678901234567890',
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)

    vi.mocked(p.text).mockResolvedValueOnce('Test Safe')
    vi.mocked(p.select).mockResolvedValueOnce('11155111')
    vi.mocked(p.multiselect).mockResolvedValueOnce([
      '0x1234567890123456789012345678901234567890',
      '0x0987654321098765432109876543210987654321',
    ])
    vi.mocked(p.text).mockResolvedValueOnce('5') // Invalid threshold > owners

    await createSafe()

    // The validation should catch invalid threshold
    expect(p.text).toHaveBeenCalledTimes(2) // name and threshold
  })

  it('should handle Safe creation error', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '11155111': { chainId: '11155111', name: 'Sepolia' },
      }),
      getChain: vi.fn().mockReturnValue({
        chainId: '11155111',
        name: 'Sepolia',
        rpcUrl: 'https://rpc.sepolia.org',
      }),
    }

    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        { id: 'wallet-1', address: '0x1234567890123456789012345678901234567890' },
      ]),
      getActiveWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        address: '0x1234567890123456789012345678901234567890',
      }),
    }

    const mockSafeStore = {
      safeExists: vi.fn().mockReturnValue(false),
    }

    const mockSafeService = {
      createPredictedSafe: vi.fn().mockRejectedValue(new Error('Network error')),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)
    vi.mocked(safeStorageModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(SafeServiceModule.SafeService).mockImplementation(() => mockSafeService as any)

    vi.mocked(p.text).mockResolvedValueOnce('Test Safe')
    vi.mocked(p.select).mockResolvedValueOnce('11155111')
    vi.mocked(p.multiselect).mockResolvedValueOnce(['0x1234567890123456789012345678901234567890'])
    vi.mocked(p.text).mockResolvedValueOnce('1')

    // Mock process.exit to prevent test from exiting
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await createSafe()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Network error'))).toBe(true)
    expect(mockExit).toHaveBeenCalledWith(1)

    mockExit.mockRestore()
  })
})
