import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { removeWallet } from '../remove.js'
import * as walletStorageModule from '../../../storage/wallet-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/wallet-store.js')
vi.mock('@clack/prompts')

describe('removeWallet', () => {
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

  it('should remove wallet after double confirmation', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          name: 'Test Wallet',
          address: '0x1234567890123456789012345678901234567890',
        },
      ]),
      getWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        name: 'Test Wallet',
        address: '0x1234567890123456789012345678901234567890',
      }),
      removeWallet: vi.fn(),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)
    vi.mocked(p.select).mockResolvedValue('wallet-1')
    vi.mocked(p.confirm).mockResolvedValue(true)

    await removeWallet()

    expect(mockWalletStore.removeWallet).toHaveBeenCalledWith('wallet-1')
    expect(p.confirm).toHaveBeenCalledTimes(2) // Two confirmations required

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Wallet removed successfully'))).toBe(true)
  })

  it('should handle no wallets', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([]),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)

    await removeWallet()

    expect(p.log.error).toHaveBeenCalled()
    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })

  it('should cancel on first confirmation decline', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          name: 'Test Wallet',
          address: '0x1234567890123456789012345678901234567890',
        },
      ]),
      getWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        name: 'Test Wallet',
        address: '0x1234567890123456789012345678901234567890',
      }),
      removeWallet: vi.fn(),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)
    vi.mocked(p.select).mockResolvedValue('wallet-1')
    vi.mocked(p.confirm).mockResolvedValueOnce(false) // First confirmation declined

    await removeWallet()

    expect(mockWalletStore.removeWallet).not.toHaveBeenCalled()
    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })

  it('should cancel on second confirmation decline', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          name: 'Test Wallet',
          address: '0x1234567890123456789012345678901234567890',
        },
      ]),
      getWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        name: 'Test Wallet',
        address: '0x1234567890123456789012345678901234567890',
      }),
      removeWallet: vi.fn(),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)
    vi.mocked(p.select).mockResolvedValue('wallet-1')
    vi.mocked(p.confirm)
      .mockResolvedValueOnce(true) // First confirmation accepted
      .mockResolvedValueOnce(false) // Second confirmation declined

    await removeWallet()

    expect(mockWalletStore.removeWallet).not.toHaveBeenCalled()
    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })

  it('should handle wallet selection cancellation', async () => {
    const mockWalletStore = {
      getAllWallets: vi.fn().mockReturnValue([
        {
          id: 'wallet-1',
          name: 'Test Wallet',
          address: '0x1234567890123456789012345678901234567890',
        },
      ]),
      removeWallet: vi.fn(),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStore as any)
    vi.mocked(p.select).mockResolvedValue('wallet-1')
    vi.mocked(p.isCancel).mockReturnValue(true)

    await removeWallet()

    expect(mockWalletStore.removeWallet).not.toHaveBeenCalled()
    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })
})
