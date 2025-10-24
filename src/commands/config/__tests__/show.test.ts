import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { showConfig } from '../show.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('@clack/prompts')

describe('showConfig', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleMock = mockConsole()

    vi.mocked(p.intro).mockImplementation(() => {})
    vi.mocked(p.outro).mockImplementation(() => {})
  })

  afterEach(() => {
    consoleMock.restore()
  })

  it('should display configuration with chains', async () => {
    const mockConfigStore = {
      getConfig: vi.fn().mockReturnValue({
        chains: {
          '1': {
            chainId: '1',
            name: 'Ethereum',
            rpcUrl: 'https://eth.llamarpc.com',
            currency: 'ETH',
            explorer: 'https://etherscan.io',
          },
          '11155111': {
            chainId: '11155111',
            name: 'Sepolia',
            rpcUrl: 'https://rpc.sepolia.org',
            currency: 'ETH',
          },
        },
        preferences: {
          autoUpdate: true,
        },
        defaults: {},
      }),
      getAllChains: vi.fn().mockReturnValue({
        '1': {
          chainId: '1',
          name: 'Ethereum',
          rpcUrl: 'https://eth.llamarpc.com',
          currency: 'ETH',
          explorer: 'https://etherscan.io',
        },
        '11155111': {
          chainId: '11155111',
          name: 'Sepolia',
          rpcUrl: 'https://rpc.sepolia.org',
          currency: 'ETH',
        },
      }),
      getPreferences: vi.fn().mockReturnValue({
        autoUpdate: true,
      }),
      getConfigPath: vi.fn().mockReturnValue('/mock/config/path'),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)

    await showConfig()

    expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('Configuration'))

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Ethereum'))).toBe(true)
    expect(logs.some((log) => log.includes('Sepolia'))).toBe(true)
    expect(logs.some((log) => log.includes('Auto-Update'))).toBe(true)
  })

  it('should handle empty configuration', async () => {
    const mockConfigStore = {
      getConfig: vi.fn().mockReturnValue({
        chains: {},
        preferences: {
          autoUpdate: true,
        },
        defaults: {},
      }),
      getAllChains: vi.fn().mockReturnValue({}),
      getPreferences: vi.fn().mockReturnValue({
        autoUpdate: true,
      }),
      getConfigPath: vi.fn().mockReturnValue('/mock/config/path'),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)

    await showConfig()

    expect(p.intro).toHaveBeenCalled()
    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('No chains'))).toBe(true)
  })
})
