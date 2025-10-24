import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listChains, addChain, removeChain } from '../chains.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('@clack/prompts')

describe('listChains', () => {
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

  it('should list all chains', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': {
          chainId: '1',
          name: 'Ethereum',
          shortName: 'eth',
          rpcUrl: 'https://eth.llamarpc.com',
          currency: 'ETH',
          explorer: 'https://etherscan.io',
        },
        '137': {
          chainId: '137',
          name: 'Polygon',
          shortName: 'matic',
          rpcUrl: 'https://polygon-rpc.com',
          currency: 'MATIC',
        },
      }),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)

    await listChains()

    expect(p.intro).toHaveBeenCalled()
    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Ethereum'))).toBe(true)
    expect(logs.some((log) => log.includes('Polygon'))).toBe(true)
  })

  it('should handle no chains configured', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)

    await listChains()

    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('No chains'))).toBe(true)
  })
})

describe('addChain', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleMock = mockConsole()

    vi.mocked(p.intro).mockImplementation(() => {})
    vi.mocked(p.outro).mockImplementation(() => {})
    vi.mocked(p.isCancel).mockReturnValue(false)
    vi.mocked(p.spinner).mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
    } as any)
  })

  afterEach(() => {
    consoleMock.restore()
  })

  it('should add a new chain', async () => {
    const mockConfigStore = {
      chainExists: vi.fn().mockReturnValue(false),
      setChain: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(p.text)
      .mockResolvedValueOnce('999') // chainId
      .mockResolvedValueOnce('Test Chain') // name
      .mockResolvedValueOnce('test') // shortName
      .mockResolvedValueOnce('https://rpc.test.com') // rpcUrl
      .mockResolvedValueOnce('https://explorer.test.com') // explorer
      .mockResolvedValueOnce('TEST') // currency

    await addChain()

    expect(mockConfigStore.setChain).toHaveBeenCalledWith('999', {
      chainId: '999',
      name: 'Test Chain',
      shortName: 'test',
      rpcUrl: 'https://rpc.test.com',
      explorer: 'https://explorer.test.com',
      currency: 'TEST',
    })
  })

  it('should handle cancellation', async () => {
    const mockConfigStore = {
      chainExists: vi.fn(),
      setChain: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(p.text).mockResolvedValue('999')
    vi.mocked(p.isCancel).mockReturnValue(true)

    await addChain()

    expect(mockConfigStore.setChain).not.toHaveBeenCalled()
    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })
})

describe('removeChain', () => {
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

  it('should remove a chain', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': {
          chainId: '1',
          name: 'Ethereum',
          shortName: 'eth',
        },
        '137': {
          chainId: '137',
          name: 'Polygon',
          shortName: 'matic',
        },
      }),
      getChain: vi.fn().mockReturnValue({
        chainId: '137',
        name: 'Polygon',
      }),
      deleteChain: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(p.select).mockResolvedValue('137')
    vi.mocked(p.confirm).mockResolvedValue(true)

    await removeChain()

    expect(mockConfigStore.deleteChain).toHaveBeenCalledWith('137')
    expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('removed'))
  })

  it('should handle no chains', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)

    await removeChain()

    expect(p.log.error).toHaveBeenCalled()
    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })

  it('should handle confirmation decline', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': {
          chainId: '1',
          name: 'Ethereum',
          shortName: 'eth',
        },
      }),
      getChain: vi.fn().mockReturnValue({
        chainId: '1',
        name: 'Ethereum',
      }),
      deleteChain: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)
    vi.mocked(p.select).mockResolvedValue('1')
    vi.mocked(p.confirm).mockResolvedValue(false)

    await removeChain()

    expect(mockConfigStore.deleteChain).not.toHaveBeenCalled()
    expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
  })
})
