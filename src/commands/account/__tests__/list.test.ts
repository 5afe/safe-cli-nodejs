import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listSafes } from '../list.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as safeStoreModule from '../../../storage/safe-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('../../../storage/safe-store.js')
vi.mock('@clack/prompts')

describe('listSafes', () => {
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

  it('should display list of Safe accounts', async () => {
    const mockConfigStore = {
      getChain: vi.fn().mockImplementation((chainId: string) => {
        const chains: any = {
          '1': { chainId: '1', name: 'Ethereum' },
          '11155111': { chainId: '11155111', name: 'Sepolia' },
        }
        return chains[chainId]
      }),
    }

    const mockSafeStore = {
      getAllSafes: vi.fn().mockReturnValue([
        {
          id: 'safe-1',
          name: 'My Safe 1',
          address: '0xabcdef0123456789abcdef0123456789abcdef01',
          chainId: '1',
          version: '1.4.1',
          owners: [
            '0x1234567890123456789012345678901234567890',
            '0x0987654321098765432109876543210987654321',
          ],
          threshold: 2,
          deployed: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'safe-2',
          name: 'My Safe 2',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: '11155111',
          version: '1.4.1',
          owners: ['0x1234567890123456789012345678901234567890'],
          threshold: 1,
          deployed: false,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ]),
      getActiveSafe: vi.fn().mockReturnValue({
        id: 'safe-1',
        name: 'My Safe 1',
        address: '0xabcdef0123456789abcdef0123456789abcdef01',
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)

    await listSafes()

    expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('Safe Accounts'))

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('My Safe 1'))).toBe(true)
    expect(logs.some((log) => log.includes('My Safe 2'))).toBe(true)
    expect(logs.some((log) => log.includes('Ethereum'))).toBe(true)
    expect(logs.some((log) => log.includes('Sepolia'))).toBe(true)
    expect(logs.some((log) => log.includes('deployed'))).toBe(true)
    expect(logs.some((log) => log.includes('not deployed'))).toBe(true)
  })

  it('should handle empty Safe list', async () => {
    const mockSafeStore = {
      getAllSafes: vi.fn().mockReturnValue([]),
      getActiveSafe: vi.fn().mockReturnValue(null),
    }

    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)

    await listSafes()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('No Safe accounts'))).toBe(true)
    expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('create'))
  })

  it('should indicate active Safe', async () => {
    const mockConfigStore = {
      getChain: vi.fn().mockReturnValue({ chainId: '1', name: 'Ethereum' }),
    }

    const mockSafeStore = {
      getAllSafes: vi.fn().mockReturnValue([
        {
          id: 'safe-1',
          name: 'Active Safe',
          address: '0xabcdef0123456789abcdef0123456789abcdef01',
          chainId: '1',
          owners: ['0x1234567890123456789012345678901234567890'],
          threshold: 1,
          deployed: true,
        },
        {
          id: 'safe-2',
          name: 'Inactive Safe',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: '1',
          owners: ['0x1234567890123456789012345678901234567890'],
          threshold: 1,
          deployed: true,
        },
      ]),
      getActiveSafe: vi.fn().mockReturnValue({
        id: 'safe-1',
        name: 'Active Safe',
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)

    await listSafes()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Active Safe:'))).toBe(true)
  })

  it('should display threshold information correctly', async () => {
    const mockConfigStore = {
      getChain: vi.fn().mockReturnValue({ chainId: '1', name: 'Ethereum' }),
    }

    const mockSafeStore = {
      getAllSafes: vi.fn().mockReturnValue([
        {
          id: 'safe-1',
          name: 'Multi-sig Safe',
          address: '0xabcdef0123456789abcdef0123456789abcdef01',
          chainId: '1',
          owners: [
            '0x1234567890123456789012345678901234567890',
            '0x0987654321098765432109876543210987654321',
            '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          ],
          threshold: 2,
          deployed: true,
        },
      ]),
      getActiveSafe: vi.fn().mockReturnValue(null),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)

    await listSafes()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('2 / 3'))).toBe(true)
  })
})
