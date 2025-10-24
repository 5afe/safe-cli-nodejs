import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listWallets } from '../list.js'
import * as walletStorageModule from '../../../storage/wallet-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/wallet-store.js')
vi.mock('@clack/prompts')

describe('listWallets', () => {
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

  it('should display list of wallets', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          name: 'Wallet 1',
          address: '0x1234567890123456789012345678901234567890',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'wallet-2',
          name: 'Wallet 2',
          address: '0x0987654321098765432109876543210987654321',
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ]),
      getActiveWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        name: 'Wallet 1',
        address: '0x1234567890123456789012345678901234567890',
      }),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)

    await listWallets()

    expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('Wallets'))

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Wallet 1'))).toBe(true)
    expect(logs.some((log) => log.includes('Wallet 2'))).toBe(true)
    expect(logs.some((log) => log.includes('0x1234'))).toBe(true)
  })

  it('should handle empty wallet list', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([]),
      getActiveWallet: vi.fn().mockReturnValue(null),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)

    await listWallets()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('No wallets'))).toBe(true)
    expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('import'))
  })

  it('should indicate active wallet', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          name: 'Active Wallet',
          address: '0x1234567890123456789012345678901234567890',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ]),
      getActiveWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        name: 'Active Wallet',
        address: '0x1234567890123456789012345678901234567890',
      }),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)

    await listWallets()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Active Wallet'))).toBe(true)
  })
})
