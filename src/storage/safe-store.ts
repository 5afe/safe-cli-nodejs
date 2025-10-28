import Conf from 'conf'
import type { SafeAccount, SafeStore } from '../types/safe.js'
import { SafeCLIError } from '../utils/errors.js'

/**
 * Create a storage key from chainId and address
 * Format: "chainId:address" (not EIP-3770 shortName:address)
 */
function getSafeKey(chainId: string, address: string): string {
  return `${chainId}:${address.toLowerCase()}`
}

export class SafeAccountStorage {
  private store: Conf<SafeStore>

  constructor(options?: { cwd?: string; projectName?: string }) {
    this.store = new Conf<SafeStore>({
      projectName: options?.projectName || 'safe-cli',
      configName: 'safes',
      cwd: options?.cwd,
      defaults: {
        safes: {},
      },
    })
  }

  // Create a new Safe record
  createSafe(safe: Omit<SafeAccount, 'createdAt'>): SafeAccount {
    const key = getSafeKey(safe.chainId, safe.address)

    // Check if already exists
    if (this.store.get(`safes.${key}`)) {
      throw new SafeCLIError(`Safe already exists: ${safe.address} on chain ${safe.chainId}`)
    }

    const newSafe: SafeAccount = {
      ...safe,
      createdAt: new Date().toISOString(),
    }

    this.store.set(`safes.${key}`, newSafe)
    return newSafe
  }

  // Get all Safes
  getAllSafes(): SafeAccount[] {
    const safes = this.store.get('safes', {})
    return Object.values(safes)
  }

  // Get Safe by chainId and address
  getSafe(chainId: string, address: string): SafeAccount | undefined {
    const key = getSafeKey(chainId, address)
    return this.store.get(`safes.${key}`)
  }

  // Update Safe
  updateSafe(chainId: string, address: string, updates: Partial<SafeAccount>): void {
    const key = getSafeKey(chainId, address)
    const safe = this.getSafe(chainId, address)

    if (!safe) {
      throw new SafeCLIError(`Safe not found: ${address} on chain ${chainId}`)
    }

    const updated = { ...safe, ...updates }
    this.store.set(`safes.${key}`, updated)
  }

  // Remove Safe
  removeSafe(chainId: string, address: string): void {
    const key = getSafeKey(chainId, address)
    const safes = this.store.get('safes', {})

    if (!safes[key]) {
      throw new SafeCLIError(`Safe not found: ${address} on chain ${chainId}`)
    }

    delete safes[key]
    this.store.set('safes', safes)
  }

  // Get Safes by chain
  getSafesByChain(chainId: string): SafeAccount[] {
    return this.getAllSafes().filter((s) => s.chainId === chainId)
  }

  // Check if Safe exists
  safeExists(chainId: string, address: string): boolean {
    return this.getSafe(chainId, address) !== undefined
  }

  // Get storage path (useful for debugging)
  getStorePath(): string {
    return this.store.path
  }
}

// Singleton instance
let safeStorage: SafeAccountStorage | null = null

export function getSafeStorage(): SafeAccountStorage {
  if (!safeStorage) {
    safeStorage = new SafeAccountStorage()
  }
  return safeStorage
}
