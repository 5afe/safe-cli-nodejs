import * as p from '@clack/prompts'
import type { Wallet } from '../types/wallet.js'
import type { WalletStorageService } from '../storage/wallet-store.js'
import type { ConfigStore } from '../storage/config-store.js'
import type { ChainConfig } from '../types/config.js'
import { getValidationService } from '../services/validation-service.js'
import { SafeCLIError } from './errors.js'

/**
 * Ensures an active wallet exists, exits with error if not found.
 * @returns The active wallet, or null if none exists (with error logged)
 */
export function ensureActiveWallet(walletStorage: WalletStorageService): Wallet | null {
  const wallet = walletStorage.getActiveWallet()
  if (!wallet) {
    p.log.error('No active wallet set. Please import a wallet first.')
    p.outro('Setup required')
    return null
  }
  return wallet
}

/**
 * Validates that a chain exists in configuration.
 * @returns The chain config, or null if not found (with error logged)
 */
export function ensureChainConfigured(
  chainId: string,
  configStore: ConfigStore
): ChainConfig | null {
  const chain = configStore.getChain(chainId)
  if (!chain) {
    p.log.error(`Chain ${chainId} not found in configuration`)
    p.outro('Failed')
    return null
  }
  return chain
}

/**
 * Unified error handler for commands.
 * Handles SafeCLIError and generic errors consistently.
 */
export function handleCommandError(error: unknown, outro: string = 'Failed'): void {
  if (error instanceof SafeCLIError) {
    p.log.error(error.message)
  } else {
    p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  p.outro(outro)
}

/**
 * Checks if a prompt was cancelled and handles it consistently.
 * @returns true if value is valid, false if cancelled (with cancellation message logged)
 */
export function checkCancelled<T>(value: T | symbol): value is T {
  if (p.isCancel(value)) {
    p.cancel('Operation cancelled')
    return false
  }
  return true
}

/**
 * Prompts for a password with validation and confirmation.
 * Handles cancellation and mismatch errors automatically.
 * @param isCreating - Whether this is creating a new password (requires confirmation)
 * @param message - Custom message for the password prompt
 * @param minLength - Minimum password length (default: 8)
 * @returns The password, or null if cancelled
 */
export async function promptPassword(
  isCreating: boolean = false,
  message: string = 'Enter wallet password',
  minLength: number = 8
): Promise<string | null> {
  const validator = getValidationService()

  const password = await p.password({
    message: isCreating ? 'Create a password to encrypt your wallet:' : message,
    validate: (value) => validator.validatePassword(value, minLength),
  })

  if (!checkCancelled(password)) return null

  if (isCreating) {
    const confirmPassword = await p.password({
      message: 'Confirm password:',
      validate: (value) => validator.validatePasswordConfirmation(value, password as string),
    })

    if (!checkCancelled(confirmPassword)) return null
  }

  return password as string
}
