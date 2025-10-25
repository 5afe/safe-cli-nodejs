import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { ConfigStore } from '../../storage/config-store.js'
import { createTempDir, cleanupTempDir, TEST_CHAIN } from './test-helpers.js'

describe('Config Integration Tests', () => {
  let tempDir: string
  let configStore: ConfigStore

  beforeEach(() => {
    tempDir = createTempDir()
    configStore = new ConfigStore(tempDir)
  })

  afterEach(() => {
    cleanupTempDir(tempDir)
  })

  describe('Chain Management', () => {
    it('should add and retrieve chain by ID', () => {
      configStore.addChain(TEST_CHAIN)

      const chain = configStore.getChain(TEST_CHAIN.chainId)
      expect(chain).not.toBeNull()
      expect(chain?.name).toBe(TEST_CHAIN.name)
      expect(chain?.chainId).toBe(TEST_CHAIN.chainId)
    })

    it('should update existing chain', () => {
      configStore.addChain(TEST_CHAIN)

      const updatedChain = { ...TEST_CHAIN, name: 'Ethereum Updated' }
      configStore.addChain(updatedChain)

      const chain = configStore.getChain(TEST_CHAIN.chainId)
      expect(chain?.name).toBe('Ethereum Updated')
    })

    it('should remove chain by ID', () => {
      configStore.addChain(TEST_CHAIN)
      configStore.removeChain(TEST_CHAIN.chainId)

      const chain = configStore.getChain(TEST_CHAIN.chainId)
      expect(chain).toBeNull()
    })

    it('should get all chains', () => {
      configStore.addChain(TEST_CHAIN)
      configStore.addChain({
        chainId: '137',
        name: 'Polygon',
        shortName: 'matic',
        rpcUrl: 'https://polygon-rpc.com',
        transactionServiceUrl: 'https://safe-transaction-polygon.safe.global',
        explorerUrl: 'https://polygonscan.com',
      })

      const chains = configStore.getAllChains()
      expect(chains).toHaveLength(2)
      expect(chains.map((c) => c.name)).toContain('Ethereum Mainnet')
      expect(chains.map((c) => c.name)).toContain('Polygon')
    })

    it('should return empty array when no chains configured', () => {
      const chains = configStore.getAllChains()
      expect(chains).toHaveLength(0)
    })

    it('should store chain details correctly', () => {
      configStore.addChain(TEST_CHAIN)

      const chain = configStore.getChain(TEST_CHAIN.chainId)
      expect(chain?.rpcUrl).toBe(TEST_CHAIN.rpcUrl)
      expect(chain?.explorerUrl).toBe(TEST_CHAIN.explorerUrl)
      expect(chain?.transactionServiceUrl).toBe(TEST_CHAIN.transactionServiceUrl)
      expect(chain?.shortName).toBe(TEST_CHAIN.shortName)
    })
  })

  describe('API Key Management', () => {
    it('should set and retrieve API key', () => {
      const apiKey = 'test-api-key-123'
      configStore.setApiKey(apiKey)

      expect(configStore.getApiKey()).toBe(apiKey)
    })

    it('should update API key', () => {
      configStore.setApiKey('old-key')
      configStore.setApiKey('new-key')

      expect(configStore.getApiKey()).toBe('new-key')
    })

    it('should clear API key', () => {
      configStore.setApiKey('test-key')
      configStore.setApiKey('')

      expect(configStore.getApiKey()).toBe('')
    })

    it('should return empty string for undefined API key', () => {
      expect(configStore.getApiKey()).toBe('')
    })
  })

  describe('Configuration Persistence', () => {
    it('should persist chains across instances', () => {
      configStore.addChain(TEST_CHAIN)

      // Create new instance with same directory
      const newConfigStore = new ConfigStore(tempDir)
      const chain = newConfigStore.getChain(TEST_CHAIN.chainId)

      expect(chain).not.toBeNull()
      expect(chain?.name).toBe(TEST_CHAIN.name)
    })

    it('should persist API key across instances', () => {
      const apiKey = 'persistent-key'
      configStore.setApiKey(apiKey)

      // Create new instance with same directory
      const newConfigStore = new ConfigStore(tempDir)
      expect(newConfigStore.getApiKey()).toBe(apiKey)
    })
  })
})
