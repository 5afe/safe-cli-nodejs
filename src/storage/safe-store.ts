import Conf from 'conf'
import { randomBytes } from 'crypto'
import { SafeStoreSchema, type SafeAccount, type SafeStore } from '../types/safe.js'
import { SafeCLIError } from '../utils/errors.js'

export class SafeAccountStorage {
  private store: Conf<SafeStore>

  constructor() {
    this.store = new Conf<SafeStore>({
      projectName: 'safe-cli',
      configName: 'safes',
      defaults: {
        safes: {},
        activeSafe: null,
      },
    })
  }

  // Create a new Safe record
  createSafe(safe: Omit<SafeAccount, 'id' | 'createdAt'>): SafeAccount {
    const safeId = randomBytes(16).toString('hex')
    const newSafe: SafeAccount = {
      ...safe,
      id: safeId,
      createdAt: new Date().toISOString(),
    }

    this.store.set(`safes.${safeId}`, newSafe)

    // Set as active if it's the first Safe
    const existingSafes = this.getAllSafes()
    if (existingSafes.length === 1) {
      this.store.set('activeSafe', safeId)
    }

    return newSafe
  }

  // Get all Safes
  getAllSafes(): SafeAccount[] {
    const safes = this.store.get('safes', {})
    return Object.values(safes)
  }

  // Get Safe by ID
  getSafe(safeId: string): SafeAccount | undefined {
    return this.store.get(`safes.${safeId}`)
  }

  // Get Safe by address and chain
  getSafeByAddress(address: string, chainId: string): SafeAccount | undefined {
    const safes = this.getAllSafes()
    return safes.find(
      (s) => s.address.toLowerCase() === address.toLowerCase() && s.chainId === chainId
    )
  }

  // Get active Safe
  getActiveSafe(): SafeAccount | null {
    const activeId = this.store.get('activeSafe')
    if (!activeId) return null
    return this.getSafe(activeId) || null
  }

  // Set active Safe
  setActiveSafe(safeId: string): void {
    const safe = this.getSafe(safeId)
    if (!safe) {
      throw new SafeCLIError(`Safe ${safeId} not found`)
    }
    this.store.set('activeSafe', safeId)
    this.store.set(`safes.${safeId}.lastUsed`, new Date().toISOString())
  }

  // Update Safe
  updateSafe(safeId: string, updates: Partial<SafeAccount>): void {
    const safe = this.getSafe(safeId)
    if (!safe) {
      throw new SafeCLIError(`Safe ${safeId} not found`)
    }

    const updated = { ...safe, ...updates }
    this.store.set(`safes.${safeId}`, updated)
  }

  // Remove Safe
  removeSafe(safeId: string): void {
    const safes = this.store.get('safes', {})
    delete safes[safeId]
    this.store.set('safes', safes)

    // Update active Safe if necessary
    const activeId = this.store.get('activeSafe')
    if (activeId === safeId) {
      const remainingSafes = Object.keys(safes)
      this.store.set('activeSafe', remainingSafes.length > 0 ? remainingSafes[0] : null)
    }
  }

  // Get Safes by chain
  getSafesByChain(chainId: string): SafeAccount[] {
    return this.getAllSafes().filter((s) => s.chainId === chainId)
  }

  // Check if Safe exists
  safeExists(address: string, chainId: string): boolean {
    return this.getSafeByAddress(address, chainId) !== undefined
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
