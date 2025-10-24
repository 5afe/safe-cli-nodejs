import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { showSafeInfo } from '../info.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as safeStoreModule from '../../../storage/safe-store.js'
import * as SafeServiceModule from '../../../services/safe-service.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('../../../storage/safe-store.js')
vi.mock('../../../services/safe-service.js')
vi.mock('@clack/prompts')

describe('showSafeInfo', () => {
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

  it('should display Safe information for deployed Safe', async () => {
    const mockConfigStore = {
      getChain: vi.fn().mockReturnValue({
        chainId: '1',
        name: 'Ethereum',
        currency: 'ETH',
        explorer: 'https://etherscan.io',
        rpcUrl: 'https://eth.llamarpc.com',
      }),
    }

    const mockSafeStore = {
      getActiveSafe: vi.fn().mockReturnValue({
        id: 'safe-1',
        name: 'My Safe',
        address: '0xabcdef0123456789abcdef0123456789abcdef01',
        chainId: '1',
        version: '1.4.1',
        owners: [
          '0x1234567890123456789012345678901234567890',
          '0x0987654321098765432109876543210987654321',
        ],
        threshold: 2,
        deployed: true,
      }),
    }

    const mockSafeService = {
      getSafeInfo: vi.fn().mockResolvedValue({
        address: '0xabcdef0123456789abcdef0123456789abcdef01',
        owners: [
          '0x1234567890123456789012345678901234567890',
          '0x0987654321098765432109876543210987654321',
        ],
        threshold: 2,
        nonce: 5n,
        version: '1.4.1',
        isDeployed: true,
        balance: 1000000000000000000n, // 1 ETH
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(SafeServiceModule.SafeService).mockImplementation(() => mockSafeService as any)

    await showSafeInfo()

    expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('Safe Information'))

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('My Safe'))).toBe(true)
    expect(logs.some((log) => log.includes('0xabcdef'))).toBe(true)
    expect(logs.some((log) => log.includes('Ethereum'))).toBe(true)
    expect(logs.some((log) => log.includes('1.4.1'))).toBe(true)
    expect(logs.some((log) => log.includes('Deployed'))).toBe(true)
    expect(logs.some((log) => log.includes('2 / 2'))).toBe(true)
    expect(logs.some((log) => log.includes('1.0000 ETH'))).toBe(true)
  })

  it('should display Safe information for non-deployed Safe', async () => {
    const mockConfigStore = {
      getChain: vi.fn().mockReturnValue({
        chainId: '11155111',
        name: 'Sepolia',
        currency: 'ETH',
      }),
    }

    const mockSafeStore = {
      getActiveSafe: vi.fn().mockReturnValue({
        id: 'safe-1',
        name: 'Predicted Safe',
        address: '0xabcdef0123456789abcdef0123456789abcdef01',
        chainId: '11155111',
        version: '1.4.1',
        owners: ['0x1234567890123456789012345678901234567890'],
        threshold: 1,
        deployed: false,
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)

    await showSafeInfo()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Predicted Safe'))).toBe(true)
    expect(logs.some((log) => log.includes('Not deployed'))).toBe(true)
  })

  it('should handle Safe not found', async () => {
    const mockSafeStore = {
      getSafe: vi.fn().mockReturnValue(null),
    }

    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)

    await showSafeInfo('non-existent-id')

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('not found'))).toBe(true)
    expect(p.cancel).toHaveBeenCalled()
  })

  it('should prompt to select Safe when multiple exist', async () => {
    const mockSafeStore = {
      getActiveSafe: vi.fn().mockReturnValue(null),
      getAllSafes: vi.fn().mockReturnValue([
        {
          id: 'safe-1',
          name: 'Safe 1',
          address: '0xabcdef0123456789abcdef0123456789abcdef01',
        },
        {
          id: 'safe-2',
          name: 'Safe 2',
          address: '0x1234567890abcdef1234567890abcdef12345678',
        },
      ]),
      getSafe: vi.fn().mockReturnValue({
        id: 'safe-1',
        name: 'Safe 1',
        address: '0xabcdef0123456789abcdef0123456789abcdef01',
        chainId: '1',
        version: '1.4.1',
        owners: ['0x1234567890123456789012345678901234567890'],
        threshold: 1,
        deployed: true,
      }),
    }

    const mockConfigStore = {
      getChain: vi.fn().mockReturnValue({
        chainId: '1',
        name: 'Ethereum',
        currency: 'ETH',
        rpcUrl: 'https://eth.llamarpc.com',
      }),
    }

    const mockSafeService = {
      getSafeInfo: vi.fn().mockResolvedValue({
        nonce: 0n,
        balance: 0n,
      }),
    }

    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(SafeServiceModule.SafeService).mockImplementation(() => mockSafeService as any)
    vi.mocked(p.select).mockResolvedValueOnce('safe-1')

    await showSafeInfo()

    expect(p.select).toHaveBeenCalledWith({
      message: 'Select Safe:',
      options: expect.arrayContaining([
        expect.objectContaining({ value: 'safe-1', label: expect.stringContaining('Safe 1') }),
        expect.objectContaining({ value: 'safe-2', label: expect.stringContaining('Safe 2') }),
      ]),
    })
  })

  it('should handle on-chain data fetch errors gracefully', async () => {
    const mockConfigStore = {
      getChain: vi.fn().mockReturnValue({
        chainId: '1',
        name: 'Ethereum',
        currency: 'ETH',
        rpcUrl: 'https://eth.llamarpc.com',
      }),
    }

    const mockSafeStore = {
      getActiveSafe: vi.fn().mockReturnValue({
        id: 'safe-1',
        name: 'My Safe',
        address: '0xabcdef0123456789abcdef0123456789abcdef01',
        chainId: '1',
        version: '1.4.1',
        owners: ['0x1234567890123456789012345678901234567890'],
        threshold: 1,
        deployed: true,
      }),
    }

    const mockSafeService = {
      getSafeInfo: vi.fn().mockRejectedValue(new Error('Network error')),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(SafeServiceModule.SafeService).mockImplementation(() => mockSafeService as any)

    await showSafeInfo()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Could not fetch on-chain data'))).toBe(true)
  })
})
