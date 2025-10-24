import Conf from 'conf'
import { SafeStoreSchema, type SafeAccount, type SafeStore } from '../types/safe.js'
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

  constructor() {
    this.store = new Conf<SafeStore>({
      projectName: 'safe-cli',
      configName: 'safes',
      defaults: {
        safes: {},
      },
    })

    // Migrate old UUID-based keys to chainId:address format
    this.migrateOldKeys()
  }

  /**
   * Migrate old UUID-based keys to new chainId:address format
   * This handles Safes created before the EIP-3770 refactoring
   */
  private migrateOldKeys(): void {
    const safes = this.store.get('safes', {})
    const safesToMigrate: Array<[string, SafeAccount]> = []

    // Find Safes that need migration (UUID keys instead of chainId:address)
    for (const [key, safe] of Object.entries(safes)) {
      // Old keys are UUIDs (32 hex chars), new keys are "chainId:address" format
      const isOldKey = /^[a-f0-9]{32}$/.test(key)
      if (isOldKey) {
        safesToMigrate.push([key, safe as SafeAccount])
      }
    }

    // Migrate each Safe to the new key format
    if (safesToMigrate.length > 0) {
      for (const [oldKey, safe] of safesToMigrate) {
        const newKey = getSafeKey(safe.chainId, safe.address)

        // Copy to new key
        this.store.set(`safes.${newKey}`, safe)

        // Remove old key
        this.store.delete(`safes.${oldKey}`)
      }

      // Update activeSafe if it was using an old key
      const activeSafe = this.store.get('activeSafe')
      if (activeSafe && /^[a-f0-9]{32}$/.test(activeSafe)) {
        // Find the migrated Safe and update activeSafe to new key
        const migratedSafe = safesToMigrate.find(([oldKey]) => oldKey === activeSafe)
        if (migratedSafe) {
          const newKey = getSafeKey(migratedSafe[1].chainId, migratedSafe[1].address)
          this.store.set('activeSafe', newKey)
        }
      }
    }
  }

  // Create a new Safe record
  createSafe(safe: Omit<SafeAccount, 'createdAt'>): SafeAccount {
    const key = getSafeKey(safe.chainId, safe.address)

    // Check if already exists
    if (this.store.get(`safes.${key}`)) {
      throw new SafeCLIError(
        `Safe already exists: ${safe.address} on chain ${safe.chainId}`
      )
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
      throw new SafeCLIError(
        `Safe not found: ${address} on chain ${chainId}`
      )
    }

    const updated = { ...safe, ...updates }
    this.store.set(`safes.${key}`, updated)
  }

  // Remove Safe
  removeSafe(chainId: string, address: string): void {
    const key = getSafeKey(chainId, address)
    const safes = this.store.get('safes', {})

    if (!safes[key]) {
      throw new SafeCLIError(
        `Safe not found: ${address} on chain ${chainId}`
      )
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

  // Get active Safe
  getActiveSafe(): SafeAccount | undefined {
    const activeSafeKey = this.store.get('activeSafe')
    if (!activeSafeKey) return undefined

    // Parse the key to get chainId and address
    const [chainId, address] = activeSafeKey.split(':')
    return this.getSafe(chainId, address)
  }

  // Set active Safe
  setActiveSafe(chainId: string, address: string): void {
    const key = getSafeKey(chainId, address)

    // Verify the Safe exists
    if (!this.safeExists(chainId, address)) {
      throw new SafeCLIError(
        `Cannot set active Safe: ${address} on chain ${chainId} not found`
      )
    }

    this.store.set('activeSafe', key)
  }

  // Clear active Safe
  clearActiveSafe(): void {
    this.store.delete('activeSafe')
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
