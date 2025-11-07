import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCommandContext } from '../../../utils/command-context.js'

// Mock storage modules
vi.mock('../../../storage/config-store.js', () => ({
  getConfigStore: vi.fn(() => ({
    getAllChains: vi.fn(() => ({
      '1': { chainId: '1', name: 'Ethereum' },
      '11155111': { chainId: '11155111', name: 'Sepolia' },
    })),
    getChain: vi.fn(),
  })),
}))

vi.mock('../../../storage/safe-store.js', () => ({
  getSafeStorage: vi.fn(() => ({
    getAllSafes: vi.fn(() => []),
    getSafe: vi.fn(),
  })),
}))

vi.mock('../../../storage/wallet-store.js', () => ({
  getWalletStorage: vi.fn(() => ({
    getActiveWallet: vi.fn(),
    getAllWallets: vi.fn(() => []),
  })),
}))

vi.mock('../../../storage/transaction-store.js', () => ({
  getTransactionStore: vi.fn(() => ({
    getAllTransactions: vi.fn(() => []),
    getTransaction: vi.fn(),
  })),
}))

vi.mock('../../../services/validation-service.js', () => ({
  getValidationService: vi.fn(() => ({
    validateAddress: vi.fn(),
    validatePrivateKey: vi.fn(),
  })),
}))

describe('command-context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCommandContext', () => {
    it('should create context with all required services', () => {
      const context = createCommandContext()

      expect(context).toHaveProperty('configStore')
      expect(context).toHaveProperty('safeStorage')
      expect(context).toHaveProperty('walletStorage')
      expect(context).toHaveProperty('transactionStore')
      expect(context).toHaveProperty('validator')
      expect(context).toHaveProperty('chains')
    })

    it('should initialize configStore', () => {
      const context = createCommandContext()

      expect(context.configStore).toBeDefined()
      expect(context.configStore.getAllChains).toBeDefined()
    })

    it('should initialize safeStorage', () => {
      const context = createCommandContext()

      expect(context.safeStorage).toBeDefined()
      expect(context.safeStorage.getAllSafes).toBeDefined()
    })

    it('should initialize walletStorage', () => {
      const context = createCommandContext()

      expect(context.walletStorage).toBeDefined()
      expect(context.walletStorage.getActiveWallet).toBeDefined()
    })

    it('should initialize transactionStore', () => {
      const context = createCommandContext()

      expect(context.transactionStore).toBeDefined()
      expect(context.transactionStore.getAllTransactions).toBeDefined()
    })

    it('should initialize validator', () => {
      const context = createCommandContext()

      expect(context.validator).toBeDefined()
      expect(context.validator.validateAddress).toBeDefined()
    })

    it('should populate chains from configStore', () => {
      const context = createCommandContext()

      expect(context.chains).toBeDefined()
      expect(context.chains).toHaveProperty('1')
      expect(context.chains).toHaveProperty('11155111')
      expect(context.chains['1'].name).toBe('Ethereum')
      expect(context.chains['11155111'].name).toBe('Sepolia')
    })

    it('should call getAllChains on configStore', async () => {
      const { getConfigStore } = await import('../../../storage/config-store.js')
      const mockConfigStore = {
        getAllChains: vi.fn(() => ({ '1': { chainId: '1' } })),
      }
      vi.mocked(getConfigStore).mockReturnValue(mockConfigStore as any)

      createCommandContext()

      expect(mockConfigStore.getAllChains).toHaveBeenCalled()
    })

    it('should return new instance each time', () => {
      const context1 = createCommandContext()
      const context2 = createCommandContext()

      // While the underlying singleton stores are the same,
      // the context object itself should be different
      expect(context1).not.toBe(context2)
    })
  })
})
