import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { importWallet } from '../import.js'
import * as walletStorageModule from '../../../storage/wallet-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/wallet-store.js')
vi.mock('@clack/prompts')

describe('importWallet', () => {
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

  it('should import wallet successfully', async () => {
    const mockWalletStorage = {
      importWallet: vi.fn().mockReturnValue({
        id: 'wallet-1',
        name: 'Test Wallet',
        address: '0x1234567890123456789012345678901234567890',
      }),
      getAllWallets: vi.fn().mockReturnValue([]),
      setPassword: vi.fn(),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStorage as any)

    vi.mocked(p.password).mockResolvedValueOnce('test-password') // password
    vi.mocked(p.password).mockResolvedValueOnce('test-password') // confirm password
    vi.mocked(p.password).mockResolvedValueOnce('0'.repeat(64)) // private key
    vi.mocked(p.text).mockResolvedValueOnce('Test Wallet') // name

    await importWallet()

    expect(mockWalletStorage.setPassword).toHaveBeenCalledWith('test-password')
    expect(mockWalletStorage.importWallet).toHaveBeenCalledWith(
      'Test Wallet',
      '0'.repeat(64)
    )
    expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('imported'))
  })

  it('should handle password mismatch', async () => {
    const mockWalletStorage = {
      setPassword: vi.fn(),
    }

    vi.mocked(walletStorageModule.getWalletStorage).mockReturnValue(mockWalletStorage as any)

    vi.mocked(p.password).mockResolvedValueOnce('password1')
    vi.mocked(p.password).mockResolvedValueOnce('password2')

    await importWallet()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('do not match'))).toBe(true)
    expect(p.cancel).toHaveBeenCalled()
  })

  it('should handle user cancellation', async () => {
    vi.mocked(p.password).mockResolvedValueOnce(Symbol.for('cancel') as any)
    vi.mocked(p.isCancel).mockReturnValue(true)

    await importWallet()

    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })
})
