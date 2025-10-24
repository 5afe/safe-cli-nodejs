import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { showTransactionStatus } from '../status.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as safeStoreModule from '../../../storage/safe-store.js'
import * as transactionStoreModule from '../../../storage/transaction-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('../../../storage/safe-store.js')
vi.mock('../../../storage/transaction-store.js')
vi.mock('@clack/prompts')

describe('showTransactionStatus', () => {
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

  it('should display transaction status with sufficient signatures', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
      getChain: vi.fn().mockReturnValue({ chainId: '1', name: 'Ethereum' }),
    }

    const mockSafeStore = {
      getSafe: vi.fn().mockReturnValue({
        name: 'Test Safe',
        address: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        threshold: 2,
        owners: ['0xowner1', '0xowner2'],
      }),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue({
        safeTxHash: '0xabc123',
        safeAddress: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        status: 'signed',
        metadata: {
          to: '0x9876543210987654321098765432109876543210',
          value: '1000',
          nonce: 5,
        },
        signatures: [
          { signer: '0xowner1', signature: '0xsig1', signedAt: new Date() },
          { signer: '0xowner2', signature: '0xsig2', signedAt: new Date() },
        ],
        createdAt: new Date().toISOString(),
        createdBy: '0xowner1',
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    await showTransactionStatus('0xabc123')

    expect(p.intro).toHaveBeenCalled()
    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('0xabc123'))).toBe(true)
    expect(logs.some((log) => log.includes('2/2 signatures'))).toBe(true)
    expect(logs.some((log) => log.includes('Ready to execute'))).toBe(true)
  })

  it('should display transaction status with insufficient signatures', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
      getChain: vi.fn().mockReturnValue({ chainId: '1', name: 'Ethereum' }),
    }

    const mockSafeStore = {
      getSafe: vi.fn().mockReturnValue({
        name: 'Test Safe',
        address: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        threshold: 3,
        owners: ['0xowner1', '0xowner2', '0xowner3'],
      }),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue({
        safeTxHash: '0xabc123',
        safeAddress: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        status: 'signed',
        metadata: {
          to: '0x9876543210987654321098765432109876543210',
          value: '1000',
          nonce: 5,
        },
        signatures: [{ signer: '0xowner1', signature: '0xsig1', signedAt: new Date() }],
        createdAt: new Date().toISOString(),
        createdBy: '0xowner1',
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    await showTransactionStatus('0xabc123')

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('1/3 signatures'))).toBe(true)
    expect(logs.some((log) => log.includes('Need 2 more'))).toBe(true)
  })

  it('should handle transaction not found', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
    }

    const mockSafeStore = {
      getSafe: vi.fn().mockReturnValue(null),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue(null),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    await showTransactionStatus('0xnonexistent')

    expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('not found'))
    expect(p.outro).toHaveBeenCalledWith('Failed')
  })

  it('should prompt for transaction selection when none provided', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
      getChain: vi.fn().mockReturnValue({ chainId: '1', name: 'Ethereum' }),
    }

    const mockSafeStore = {
      getSafe: vi.fn().mockReturnValue({
        name: 'Test Safe',
        threshold: 2,
        owners: ['0xowner1'],
      }),
    }

    const mockTransactionStore = {
      getAllTransactions: vi.fn().mockReturnValue([
        {
          safeTxHash: '0xabc123',
          safeAddress: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          status: 'pending',
          metadata: { to: '0x9876', value: '0', nonce: 1 },
          signatures: [],
          createdAt: new Date().toISOString(),
          createdBy: '0xowner1',
        },
      ]),
      getTransaction: vi.fn().mockReturnValue({
        safeTxHash: '0xabc123',
        safeAddress: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        status: 'pending',
        metadata: { to: '0x9876', value: '0', nonce: 1 },
        signatures: [],
        createdAt: new Date().toISOString(),
        createdBy: '0xowner1',
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    vi.mocked(p.select).mockResolvedValue('0xabc123')

    await showTransactionStatus()

    expect(p.select).toHaveBeenCalled()
    expect(mockTransactionStore.getAllTransactions).toHaveBeenCalled()
  })

  it('should handle no transactions', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
    }

    const mockSafeStore = {
      getSafe: vi.fn(),
    }

    const mockTransactionStore = {
      getAllTransactions: vi.fn().mockReturnValue([]),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    await showTransactionStatus()

    expect(p.log.error).toHaveBeenCalledWith('No transactions found')
    expect(p.outro).toHaveBeenCalledWith('Nothing to show')
  })
})
