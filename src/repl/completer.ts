import type { ReplSession } from './session.js'
import { getWalletStorage } from '../storage/wallet-store.js'
import { getSafeStorage } from '../storage/safe-store.js'

/**
 * Tab completion provider for REPL
 * Provides completions for commands, wallet names, Safe names, etc.
 */
export class ReplCompleter {
  // All available commands (grouped by namespace)
  private commands = [
    // Top-level commands
    'help',
    'exit',
    'clear',
    'status',
    // Config commands
    'config init',
    'config show',
    'config chains list',
    'config chains add',
    'config chains remove',
    'config chains edit',
    // Wallet commands
    'wallet import',
    'wallet import-ledger',
    'wallet create',
    'wallet list',
    'wallet use',
    'wallet switch',
    'wallet remove',
    'wallet delete',
    // Account commands
    'account create',
    'account deploy',
    'account open',
    'account list',
    'account info',
    'account add-owner',
    'account remove-owner',
    'account change-threshold',
    // Transaction commands
    'tx create',
    'tx sign',
    'tx execute',
    'tx exec',
    'tx list',
    'tx status',
    'tx export',
    'tx import',
    'tx push',
    'tx pull',
    'tx sync',
  ]

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_session: ReplSession) {
    // Session parameter accepted but not currently used
    // Will be used for future context-aware completion features
  }

  /**
   * Completer function for readline
   */
  complete(line: string): [string[], string] {
    const trimmedLine = line.trimStart()

    // Get all possible completions
    let completions: string[] = []

    // Check if we're completing a wallet name (after "wallet use/switch/remove/delete")
    if (
      trimmedLine.startsWith('wallet use ') ||
      trimmedLine.startsWith('wallet switch ') ||
      trimmedLine.startsWith('wallet remove ') ||
      trimmedLine.startsWith('wallet delete ')
    ) {
      completions = this.getWalletNames()
    }
    // Check if we're completing a Safe name (after "account deploy/info/...")
    else if (
      trimmedLine.startsWith('account deploy ') ||
      trimmedLine.startsWith('account info ') ||
      trimmedLine.startsWith('account add-owner ') ||
      trimmedLine.startsWith('account remove-owner ') ||
      trimmedLine.startsWith('account change-threshold ') ||
      trimmedLine.startsWith('tx list ')
    ) {
      completions = this.getSafeNames()
    }
    // Otherwise complete commands
    else {
      completions = this.commands
    }

    // Filter completions based on input
    const hits = completions.filter((c) => c.startsWith(trimmedLine))

    // Return the matches and the original line
    return [hits.length > 0 ? hits : completions, trimmedLine]
  }

  /**
   * Get all wallet names for completion
   */
  private getWalletNames(): string[] {
    try {
      const walletStorage = getWalletStorage()
      const wallets = walletStorage.getAllWallets()
      return wallets.map((w) => w.name)
    } catch {
      return []
    }
  }

  /**
   * Get all Safe names for completion
   */
  private getSafeNames(): string[] {
    try {
      const safeStorage = getSafeStorage()
      const safes = safeStorage.getAllSafes()
      return safes.map((s) => s.name)
    } catch {
      return []
    }
  }
}
