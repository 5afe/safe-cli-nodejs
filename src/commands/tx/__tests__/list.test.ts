import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listTransactions } from '../list.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as safeStoreModule from '../../../storage/safe-store.js'
import * as transactionStoreModule from '../../../storage/transaction-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('../../../storage/safe-store.js')
vi.mock('../../../storage/transaction-store.js')
vi.mock('@clack/prompts')

describe('listTransactions', () => {
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

  it('should display all transactions when "all" is selected', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
      getChain: vi.fn().mockReturnValue({ chainId: '1', name: 'Ethereum' }),
    }

    const mockSafeStore = {
      getAllSafes: vi.fn().mockReturnValue([
        {
          address: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          name: 'Test Safe',
          threshold: 2,
        },
      ]),
      getSafe: vi.fn().mockReturnValue({
        name: 'Test Safe',
        threshold: 2,
      }),
    }

    const mockTransactionStore = {
      getAllTransactions: vi.fn().mockReturnValue([
        {
          safeTxHash: '0xabc123',
          safeAddress: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          status: 'pending',
          metadata: {
            to: '0x9876543210987654321098765432109876543210',
            value: '0',
            operation: 0,
          },
          signatures: [],
          createdAt: new Date().toISOString(),
          createdBy: '0x1111111111111111111111111111111111111111',
        },
      ]),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    vi.mocked(p.select).mockResolvedValue('all')

    await listTransactions()

    expect(p.intro).toHaveBeenCalled()
    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('0xabc123'))).toBe(true)
    expect(logs.some((log) => log.includes('PENDING'))).toBe(true)
  })

  it('should filter transactions by selected Safe', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
      getChain: vi.fn().mockReturnValue({ chainId: '1', name: 'Ethereum' }),
    }

    const mockSafeStore = {
      getAllSafes: vi.fn().mockReturnValue([
        {
          address: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          name: 'Safe 1',
          threshold: 2,
        },
        {
          address: '0x0987654321098765432109876543210987654321',
          chainId: '1',
          name: 'Safe 2',
          threshold: 1,
        },
      ]),
      getSafe: vi.fn().mockReturnValue({
        name: 'Safe 1',
        threshold: 2,
      }),
    }

    const mockTransactionStore = {
      getAllTransactions: vi.fn().mockReturnValue([
        {
          safeTxHash: '0xabc123',
          safeAddress: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          status: 'pending',
          metadata: {
            to: '0x9876543210987654321098765432109876543210',
            value: '0',
            operation: 0,
          },
          signatures: [],
          createdAt: new Date().toISOString(),
          createdBy: '0x1111111111111111111111111111111111111111',
        },
        {
          safeTxHash: '0xdef456',
          safeAddress: '0x0987654321098765432109876543210987654321',
          chainId: '1',
          status: 'signed',
          metadata: {
            to: '0x9876543210987654321098765432109876543210',
            value: '0',
            operation: 0,
          },
          signatures: [{ signer: '0x1111', signature: '0x', signedAt: new Date() }],
          createdAt: new Date().toISOString(),
          createdBy: '0x1111111111111111111111111111111111111111',
        },
      ]),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    // Select Safe 1
    vi.mocked(p.select).mockResolvedValue('1:0x1234567890123456789012345678901234567890')

    await listTransactions()

    const logs = consoleMock.getLogs()
    // Should show Safe 1 transaction
    expect(logs.some((log) => log.includes('0xabc123'))).toBe(true)
    // Should NOT show Safe 2 transaction
    expect(logs.some((log) => log.includes('0xdef456'))).toBe(false)
  })

  it('should handle no transactions', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
    }

    const mockSafeStore = {
      getAllSafes: vi.fn().mockReturnValue([]),
    }

    const mockTransactionStore = {
      getAllTransactions: vi.fn().mockReturnValue([]),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    await listTransactions()

    expect(p.log.warning).toHaveBeenCalledWith('No transactions found')
    expect(p.outro).toHaveBeenCalledWith('No transactions')
  })

  it('should handle EIP-3770 account parameter', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
      getChain: vi.fn().mockReturnValue({ chainId: '1', name: 'Ethereum' }),
    }

    const mockSafeStore = {
      getAllSafes: vi.fn().mockReturnValue([]),
      getSafe: vi.fn().mockReturnValue({
        name: 'Test Safe',
        threshold: 2,
      }),
    }

    const mockTransactionStore = {
      getAllTransactions: vi.fn().mockReturnValue([
        {
          safeTxHash: '0xabc123',
          safeAddress: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          status: 'pending',
          metadata: {
            to: '0x9876543210987654321098765432109876543210',
            value: '0',
            operation: 0,
          },
          signatures: [],
          createdAt: new Date().toISOString(),
          createdBy: '0x1111111111111111111111111111111111111111',
        },
      ]),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    // Pass EIP-3770 format directly
    await listTransactions('eth:0x1234567890123456789012345678901234567890')

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('0xabc123'))).toBe(true)
  })

  it('should display transaction summary', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
      getChain: vi.fn().mockReturnValue({ chainId: '1', name: 'Ethereum' }),
    }

    const mockSafeStore = {
      getAllSafes: vi.fn().mockReturnValue([
        {
          address: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          name: 'Test Safe',
          threshold: 2,
        },
      ]),
      getSafe: vi.fn().mockReturnValue({
        name: 'Test Safe',
        threshold: 2,
      }),
    }

    const mockTransactionStore = {
      getAllTransactions: vi.fn().mockReturnValue([
        {
          safeTxHash: '0xabc123',
          safeAddress: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          status: 'pending',
          metadata: { to: '0x9876', value: '0', operation: 0 },
          signatures: [],
          createdAt: new Date().toISOString(),
          createdBy: '0x1111',
        },
        {
          safeTxHash: '0xdef456',
          safeAddress: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          status: 'signed',
          metadata: { to: '0x9876', value: '0', operation: 0 },
          signatures: [{ signer: '0x1111', signature: '0x', signedAt: new Date() }],
          createdAt: new Date().toISOString(),
          createdBy: '0x1111',
        },
        {
          safeTxHash: '0xghi789',
          safeAddress: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          status: 'executed',
          metadata: { to: '0x9876', value: '0', operation: 0 },
          signatures: [],
          createdAt: new Date().toISOString(),
          createdBy: '0x1111',
          executedAt: new Date().toISOString(),
          txHash: '0xexecuted',
        },
      ]),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    vi.mocked(p.select).mockResolvedValue('all')

    await listTransactions()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Summary'))).toBe(true)
    expect(logs.some((log) => log.includes('Pending'))).toBe(true)
    expect(logs.some((log) => log.includes('Signed'))).toBe(true)
    expect(logs.some((log) => log.includes('Executed'))).toBe(true)
  })
})
