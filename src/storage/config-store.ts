import Conf from 'conf'
import type { Config, ChainConfig } from '../types/config.js'
import { DEFAULT_CHAINS } from '../constants/chains.js'

export class ConfigStore {
  private store: Conf<Config>

  constructor() {
    this.store = new Conf<Config>({
      projectName: 'safe-cli',
      defaults: {
        version: '0.1.0',
        chains: DEFAULT_CHAINS,
        defaults: {
          safeVersion: '1.4.1',
          signingMethod: 'ETH_SIGN_TYPED_DATA_V4',
          gasStrategy: 'medium',
        },
        preferences: {},
      },
    })
  }

  // Get entire config
  getConfig(): Config {
    return this.store.store
  }

  // Chain management
  getChain(chainId: string): ChainConfig | undefined {
    return this.store.get(`chains.${chainId}`)
  }

  getAllChains(): Record<string, ChainConfig> {
    return this.store.get('chains', {})
  }

  setChain(chainId: string, config: ChainConfig): void {
    this.store.set(`chains.${chainId}`, config)
  }

  deleteChain(chainId: string): void {
    const chains = this.getAllChains()
    delete chains[chainId]
    this.store.set('chains', chains)
  }

  chainExists(chainId: string): boolean {
    return this.getChain(chainId) !== undefined
  }

  /**
   * Get default chain for balance checks and other operations
   * Returns Ethereum mainnet (chainId: '1') by default, or first available chain
   */
  getDefaultChain(): ChainConfig {
    // Try to get Ethereum mainnet first
    const ethMainnet = this.getChain('1')
    if (ethMainnet) {
      return ethMainnet
    }

    // Fallback to first available chain
    const chains = this.getAllChains()
    const firstChainId = Object.keys(chains)[0]
    if (firstChainId) {
      return chains[firstChainId]
    }

    // If no chains configured (shouldn't happen), return a default
    return DEFAULT_CHAINS['1']
  }

  // Defaults
  getDefaults() {
    return this.store.get('defaults')
  }

  setDefault<K extends keyof Config['defaults']>(key: K, value: Config['defaults'][K]): void {
    this.store.set(`defaults.${key}`, value)
  }

  // Preferences
  getPreferences() {
    return this.store.get('preferences')
  }

  setPreference<K extends keyof Config['preferences']>(
    key: K,
    value: Config['preferences'][K]
  ): void {
    this.store.set(`preferences.${key}`, value)
  }

  // Reset to defaults
  reset(): void {
    this.store.clear()
  }

  // Get config file path
  getConfigPath(): string {
    return this.store.path
  }
}

// Singleton instance
let configStore: ConfigStore | null = null

export function getConfigStore(): ConfigStore {
  if (!configStore) {
    configStore = new ConfigStore()
  }
  return configStore
}
