import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWallet } from '../use.js'
import * as walletStorageModule from '../../../storage/wallet-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/wallet-store.js')
vi.mock('@clack/prompts')

describe('useWallet', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleMock = mockConsole()

    vi.mocked(p.intro).mockImplementation(() => {})
    vi.mocked(p.outro).mockImplementation(() => {})
    vi.mocked(p.isCancel).mockReturnValue(false)
  })

  afterEach(() => {
    consoleMock.restore()
  })

  it('should switch to selected wallet', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          name: 'Wallet 1',
          address: '0x1234567890123456789012345678901234567890',
        },
        {
          id: 'wallet-2',
          name: 'Wallet 2',
          address: '0x0987654321098765432109876543210987654321',
        },
      ]),
      getActiveWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        name: 'Wallet 1',
        address: '0x1234567890123456789012345678901234567890',
      }),
      setActiveWallet: vi.fn(),
      getWallet: vi.fn().mockReturnValue({
        id: 'wallet-2',
        name: 'Wallet 2',
        address: '0x0987654321098765432109876543210987654321',
      }),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)
    vi.mocked(p.select).mockResolvedValue('wallet-2')

    await useWallet()

    expect(mockWalletStore.setActiveWallet).toHaveBeenCalledWith('wallet-2')
    expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('Wallet 2'))

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Active wallet changed'))).toBe(true)
    expect(logs.some((log) => log.includes('Wallet 2'))).toBe(true)
  })

  it('should handle no wallets', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([]),
      getActiveWallet: vi.fn().mockReturnValue(null),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)

    await useWallet()

    expect(p.log.error).toHaveBeenCalled()
    expect(p.cancel).toHaveBeenCalledWith(expect.stringContaining('import'))
  })

  it('should handle cancellation', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          name: 'Wallet 1',
          address: '0x1234567890123456789012345678901234567890',
        },
      ]),
      getActiveWallet: vi.fn().mockReturnValue(null),
      setActiveWallet: vi.fn(),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)
    vi.mocked(p.select).mockResolvedValue('wallet-1')
    vi.mocked(p.isCancel).mockReturnValue(true)

    await useWallet()

    expect(mockWalletStore.setActiveWallet).not.toHaveBeenCalled()
    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })
})
