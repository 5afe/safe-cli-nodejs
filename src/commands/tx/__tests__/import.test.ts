import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { importTransaction } from '../import.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as safeStoreModule from '../../../storage/safe-store.js'
import * as transactionStoreModule from '../../../storage/transaction-store.js'
import * as p from '@clack/prompts'
import * as fs from 'fs'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('../../../storage/safe-store.js')
vi.mock('../../../storage/transaction-store.js')
vi.mock('@clack/prompts')
vi.mock('fs')

describe('importTransaction', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  const validTransactionJson = JSON.stringify({
    safeTxHash: '0xabc123',
    safe: 'eth:0x1234567890123456789012345678901234567890',
    chainId: '1',
    safeAddress: '0x1234567890123456789012345678901234567890',
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
    signatures: [
      {
        signer: '0x1111111111111111111111111111111111111111',
        signature: '0xsig1',
        signedAt: new Date(),
      },
    ],
    createdBy: '0x1111111111111111111111111111111111111111',
    createdAt: new Date().toISOString(),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    consoleMock = mockConsole()

    vi.mocked(p.intro).mockImplementation(() => {})
    vi.mocked(p.outro).mockImplementation(() => {})
    vi.mocked(p.isCancel).mockReturnValue(false)
    ;(p as any).log = {
      error: vi.fn(),
      warning: vi.fn(),
    }
  })

  afterEach(() => {
    consoleMock.restore()
  })

  it('should import transaction from JSON string', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
    }

    const mockSafeStore = {
      getSafe: vi.fn().mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        name: 'Test Safe',
        threshold: 2,
      }),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue(null),
      createTransaction: vi.fn(),
      addSignature: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    vi.mocked(p.confirm).mockResolvedValue(true)

    await importTransaction(validTransactionJson)

    expect(mockTransactionStore.createTransaction).toHaveBeenCalledWith(
      '0xabc123',
      '0x1234567890123456789012345678901234567890',
      '1',
      expect.any(Object),
      '0x1111111111111111111111111111111111111111'
    )
    expect(mockTransactionStore.addSignature).toHaveBeenCalled()
    expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('complete'))
  })

  it('should import transaction from file', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
    }

    const mockSafeStore = {
      getSafe: vi.fn().mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        name: 'Test Safe',
        threshold: 2,
      }),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue(null),
      createTransaction: vi.fn(),
      addSignature: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(validTransactionJson)
    vi.mocked(p.confirm).mockResolvedValue(true)

    await importTransaction('/path/to/tx.json')

    expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/tx.json', 'utf-8')
    expect(mockTransactionStore.createTransaction).toHaveBeenCalled()
  })

  it.skip('should handle invalid JSON', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
    }

    const mockSafeStore = {
      getSafe: vi.fn(),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn(),
      createTransaction: vi.fn(),
      addSignature: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    await importTransaction('invalid json')

    expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'))
    expect(p.outro).toHaveBeenCalledWith('Failed')
  })

  it.skip('should handle missing required fields', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
    }

    const mockSafeStore = {
      getSafe: vi.fn(),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn(),
      createTransaction: vi.fn(),
      addSignature: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )

    const invalidJson = JSON.stringify({
      safeTxHash: '0xabc123',
      // Missing other required fields
    })

    await importTransaction(invalidJson)

    expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('missing required fields'))
    expect(p.outro).toHaveBeenCalledWith('Failed')
  })

  it('should merge signatures when transaction exists', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
    }

    const mockSafeStore = {
      getSafe: vi.fn().mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        chainId: '1',
        name: 'Test Safe',
      }),
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue({
        safeTxHash: '0xabc123',
        signatures: [
          { signer: '0x2222222222222222222222222222222222222222', signature: '0xexisting' },
        ],
      }),
      addSignature: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    vi.mocked(p.confirm).mockResolvedValue(true)

    await importTransaction(validTransactionJson)

    // Should add new signature
    expect(mockTransactionStore.addSignature).toHaveBeenCalled()
  })

  it('should prompt when Safe not found locally', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum', shortName: 'eth' },
      }),
    }

    const mockSafeStore = {
      getSafe: vi.fn().mockReturnValue(null), // Safe not found
    }

    const mockTransactionStore = {
      getTransaction: vi.fn().mockReturnValue(null),
      createTransaction: vi.fn(),
      addSignature: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(safeStoreModule.getSafeStorage).mockReturnValue(mockSafeStore as any)
    vi.mocked(transactionStoreModule.getTransactionStore).mockReturnValue(
      mockTransactionStore as any
    )
    vi.mocked(p.confirm).mockResolvedValue(true)

    await importTransaction(validTransactionJson)

    expect(p.log.warning).toHaveBeenCalled()
    expect(p.confirm).toHaveBeenCalled()
    expect(mockTransactionStore.createTransaction).toHaveBeenCalled()
  })
})
