import type { Wallet } from '../types/wallet.js'
import { getWalletStorage } from '../storage/wallet-store.js'

/**
 * REPL session state management
 * Tracks the current context: active wallet
 */
export class ReplSession {
  private _activeWallet: Wallet | null = null
  private _commandHistory: string[] = []

  constructor() {
    this.loadContext()
  }

  /**
   * Load context from storage
   */
  private loadContext(): void {
    const walletStorage = getWalletStorage()

    // Load active wallet
    this._activeWallet = walletStorage.getActiveWallet()
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
    if (this._activeWallet) {
      return `[\x1b[36m${this._activeWallet.name}\x1b[0m] \x1b[32msafe>\x1b[0m ` // Cyan wallet name, green prompt
    }
    return '\x1b[32msafe>\x1b[0m ' // Just green prompt
  }
}
