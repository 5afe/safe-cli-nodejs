import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initConfig } from '../init.js'
import * as configStoreModule from '../../../storage/config-store.js'
import * as p from '@clack/prompts'
import { mockConsole } from '../../../test/helpers/mocks.js'

vi.mock('../../../storage/config-store.js')
vi.mock('@clack/prompts')

describe('initConfig', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleMock = mockConsole()

    // Mock prompts
    vi.mocked(p.intro).mockImplementation(() => {})
    vi.mocked(p.outro).mockImplementation(() => {})
    vi.mocked(p.confirm).mockResolvedValue(true)
    vi.mocked(p.spinner).mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
      message: vi.fn(),
    } as any)
  })

  afterEach(() => {
    consoleMock.restore()
  })

  it('should initialize config with default chains', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({}),
      setPreference: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)

    await initConfig()

    expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('Initialize'))
    expect(mockConfigStore.setPreference).toHaveBeenCalled()
    expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('Ready'))
  })

  it('should run initialization wizard with existing chains', async () => {
    const mockConfigStore = {
      getAllChains: vi.fn().mockReturnValue({
        '1': { chainId: '1', name: 'Ethereum' },
      }),
      setPreference: vi.fn(),
    }

    vi.mocked(configStoreModule.getConfigStore).mockReturnValue(mockConfigStore as any)

    await initConfig()

    expect(p.intro).toHaveBeenCalled()
    expect(mockConfigStore.setPreference).toHaveBeenCalled()
    const logs = consoleMock.getLogs()
    expect(logs.some((log) => log.includes('Welcome to Safe CLI'))).toBe(true)
  })
})
