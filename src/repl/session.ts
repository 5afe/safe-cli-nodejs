import type { ChainConfig } from '../types/config.js'
import type { Wallet } from '../types/wallet.js'
import type { SafeAccount } from '../types/safe.js'
import { getConfigStore } from '../storage/config-store.js'
import { getWalletStorage } from '../storage/wallet-store.js'
import { getSafeStorage } from '../storage/safe-store.js'

/**
 * REPL session state management
 * Tracks the current context: active wallet, Safe account, and chain
 */
export class ReplSession {
  private _activeWallet: Wallet | null = null
  private _activeSafe: SafeAccount | null = null
  private _activeChainId: string | null = null
  private _chains: Record<string, ChainConfig> = {}
  private _commandHistory: string[] = []

  constructor() {
    this.loadContext()
  }

  /**
   * Load context from storage
   */
  private loadContext(): void {
    const configStore = getConfigStore()
    const walletStorage = getWalletStorage()
    const safeStorage = getSafeStorage()

    // Load chains
    this._chains = configStore.getAllChains()

    // Load active wallet
    this._activeWallet = walletStorage.getActiveWallet()

    // Load active Safe - for now, just get the first Safe if any
    // (In the future, we could track active Safe in config)
    const allSafes = safeStorage.getAllSafes()
    if (allSafes.length > 0) {
      this._activeSafe = allSafes[0]
      this._activeChainId = this._activeSafe.chainId
    }
  }

  /**
   * Refresh context from storage (call after commands that modify state)
   */
  refresh(): void {
    this.loadContext()
  }

  /**
   * Get active wallet
   */
  get activeWallet(): Wallet | null {
    return this._activeWallet
  }

  /**
   * Get active Safe account
   */
  get activeSafe(): SafeAccount | null {
    return this._activeSafe
  }

  /**
   * Get active chain ID
   */
  get activeChainId(): string | null {
    return this._activeChainId
  }

  /**
   * Get active chain config
   */
  get activeChain(): ChainConfig | null {
    if (!this._activeChainId) return null
    return this._chains[this._activeChainId] || null
  }

  /**
   * Get all chains
   */
  get chains(): Record<string, ChainConfig> {
    return this._chains
  }

  /**
   * Add command to history
   */
  addToHistory(command: string): void {
    if (command.trim()) {
      this._commandHistory.push(command)
    }
  }

  /**
   * Get command history
   */
  get commandHistory(): string[] {
    return this._commandHistory
  }

  /**
   * Get formatted prompt string
   */
  getPrompt(): string {
    const parts: string[] = []

    if (this._activeWallet) {
      parts.push(`\x1b[36m${this._activeWallet.name}\x1b[0m`) // Cyan
    }

    if (this._activeSafe) {
      const safeName = this._activeSafe.name
      parts.push(`\x1b[35m${safeName}\x1b[0m`) // Magenta
    }

    const chain = this.activeChain
    if (chain) {
      parts.push(`\x1b[33m${chain.name}\x1b[0m`) // Yellow
    }

    const context = parts.length > 0 ? `[${parts.join(' | ')}] ` : ''
    return `${context}\x1b[32msafe>\x1b[0m ` // Green prompt
  }
}
