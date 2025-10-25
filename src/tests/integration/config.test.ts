import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { ConfigStore } from '../../storage/config-store.js'
import { TEST_CHAIN } from './test-helpers.js'

describe('Config Integration Tests', () => {
  let configStore: ConfigStore

  beforeEach(() => {
    configStore = new ConfigStore()
    // Clear all chains except defaults
    const chains = configStore.getAllChains()
    Object.keys(chains).forEach((chainId) => {
      configStore.deleteChain(chainId)
    })
  })

  afterEach(() => {
    // Cleanup
    const chains = configStore.getAllChains()
    Object.keys(chains).forEach((chainId) => {
      configStore.deleteChain(chainId)
    })
  })

  describe('Chain Management', () => {
    it('should add and retrieve chain by ID', () => {
      configStore.setChain(TEST_CHAIN.chainId, TEST_CHAIN)

      const chain = configStore.getChain(TEST_CHAIN.chainId)
      expect(chain).not.toBeUndefined()
      expect(chain?.name).toBe(TEST_CHAIN.name)
      expect(chain?.chainId).toBe(TEST_CHAIN.chainId)
    })

    it('should update existing chain', () => {
      configStore.setChain(TEST_CHAIN.chainId, TEST_CHAIN)

      const updatedChain = { ...TEST_CHAIN, name: 'Ethereum Updated' }
      configStore.setChain(TEST_CHAIN.chainId, updatedChain)

      const chain = configStore.getChain(TEST_CHAIN.chainId)
      expect(chain?.name).toBe('Ethereum Updated')
    })

    it('should remove chain by ID', () => {
      configStore.setChain(TEST_CHAIN.chainId, TEST_CHAIN)
      configStore.deleteChain(TEST_CHAIN.chainId)

      const chain = configStore.getChain(TEST_CHAIN.chainId)
      expect(chain).toBeUndefined()
    })

    it('should get all chains', () => {
      configStore.setChain(TEST_CHAIN.chainId, TEST_CHAIN)
      configStore.setChain('137', {
        chainId: '137',
        name: 'Polygon',
        shortName: 'matic',
        rpcUrl: 'https://polygon-rpc.com',
        transactionServiceUrl: 'https://safe-transaction-polygon.safe.global',
        explorerUrl: 'https://polygonscan.com',
      })

      const chains = configStore.getAllChains()
      const chainList = Object.values(chains)
      expect(chainList.length).toBeGreaterThanOrEqual(2)
      expect(chainList.map((c) => c.name)).toContain('Ethereum Mainnet')
      expect(chainList.map((c) => c.name)).toContain('Polygon')
    })

    it('should return empty object when no chains configured', () => {
      const chains = configStore.getAllChains()
      expect(chains).toBeDefined()
      expect(typeof chains).toBe('object')
    })

    it('should store chain details correctly', () => {
      configStore.setChain(TEST_CHAIN.chainId, TEST_CHAIN)

      const chain = configStore.getChain(TEST_CHAIN.chainId)
      expect(chain?.rpcUrl).toBe(TEST_CHAIN.rpcUrl)
      expect(chain?.explorerUrl).toBe(TEST_CHAIN.explorerUrl)
      expect(chain?.transactionServiceUrl).toBe(TEST_CHAIN.transactionServiceUrl)
      expect(chain?.shortName).toBe(TEST_CHAIN.shortName)
    })

    it('should check if chain exists', () => {
      configStore.setChain(TEST_CHAIN.chainId, TEST_CHAIN)

      expect(configStore.chainExists(TEST_CHAIN.chainId)).toBe(true)
      expect(configStore.chainExists('999')).toBe(false)
    })
  })

  describe('Configuration Persistence', () => {
    it('should persist chains across instances', () => {
      configStore.setChain(TEST_CHAIN.chainId, TEST_CHAIN)

      // Create new instance
      const newConfigStore = new ConfigStore()
      const chain = newConfigStore.getChain(TEST_CHAIN.chainId)

      expect(chain).not.toBeUndefined()
      expect(chain?.name).toBe(TEST_CHAIN.name)

      // Cleanup
      newConfigStore.deleteChain(TEST_CHAIN.chainId)
    })
  })
})
