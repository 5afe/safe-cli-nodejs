import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportTransaction } from '../export.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as transactionStoreModule from '../../../storage/transaction-store.js'
import * as p from '@clack/prompts'
import * as fs from 'fs'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('../../../storage/transaction-store.js')
vi.mock('@clack/prompts')
vi.mock('fs')

describe('exportTransaction', () => {
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

  it('should export transaction to stdout', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue({
        safeTxHash: '0xabc123',
        safeAddress: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        metadata: {
          to: '0x9876543210987654321098765432109876543210',
          value: '1000',
          data: '0x',
          operation: 0,
          safeTxGas: '0',
          baseGas: '0',
          gasPrice: '0',
          gasToken: '0x0000000000000000000000000000000000000000',
          refundReceiver: '0x0000000000000000000000000000000000000000',
          nonce: 5,
        },
        signatures: [{ signer: '0xowner1', signature: '0xsig1', signedAt: new Date() }],
        createdBy: '0xowner1',
        createdAt: new Date().toISOString(),
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    await exportTransaction('0xabc123')

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('0xabc123'))).toBe(true)
  })

  it('should export transaction to file', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue({
        safeTxHash: '0xabc123',
        safeAddress: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        metadata: {
          to: '0x9876543210987654321098765432109876543210',
          value: '1000',
          data: '0x',
          operation: 0,
          safeTxGas: '0',
          baseGas: '0',
          gasPrice: '0',
          gasToken: '0x0000000000000000000000000000000000000000',
          refundReceiver: '0x0000000000000000000000000000000000000000',
          nonce: 5,
        },
        signatures: [],
        createdBy: '0xowner1',
        createdAt: new Date().toISOString(),
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    vi.mocked(fs.writeFileSync).mockImplementation(() => {})

    await exportTransaction('0xabc123', '/tmp/tx.json')

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/tmp/tx.json',
      expect.stringContaining('0xabc123'),
      'utf-8'
    )
  })

  it('should handle transaction not found', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue(null),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    await expect(exportTransaction('0xnonexistent')).rejects.toThrow('Transaction not found')
  })

  it('should prompt for transaction selection when none provided', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
    }

    const mockTransactionStore = {
      getAllTransactions: vi.fn().mockReturnValue([
        {
          safeTxHash: '0xabc123',
          safeAddress: '0x1234567890123456789012345678901234567890',
          chainId: '1',
          metadata: { to: '0x9876', value: '0' },
          signatures: [],
          createdAt: new Date().toISOString(),
        },
      ]),
      getTransaction: vi.fn().mockReturnValue({
        safeTxHash: '0xabc123',
        safeAddress: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        metadata: {
          to: '0x9876543210987654321098765432109876543210',
          value: '1000',
          data: '0x',
          operation: 0,
          safeTxGas: '0',
          baseGas: '0',
          gasPrice: '0',
          gasToken: '0x0000000000000000000000000000000000000000',
          refundReceiver: '0x0000000000000000000000000000000000000000',
          nonce: 5,
        },
        signatures: [],
        createdBy: '0xowner1',
        createdAt: new Date().toISOString(),
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    vi.mocked(p.select).mockResolvedValue('0xabc123')

    await exportTransaction()

    expect(p.select).toHaveBeenCalled()
    expect(mockTransactionStore.getAllTransactions).toHaveBeenCalled()
  })

  it('should handle no transactions', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
    }

    const mockTransactionStore = {
      getAllTransactions: vi.fn().mockReturnValue([]),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    await exportTransaction()

    expect(p.log.error).toHaveBeenCalledWith('No transactions found')
    expect(p.outro).toHaveBeenCalledWith('Nothing to export')
  })
})
