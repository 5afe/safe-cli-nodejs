import Conf from 'conf'
import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto'
import { privateKeyToAccount } from 'viem/accounts'
import type { Wallet, WalletStore, PrivateKeyWallet, LedgerWallet } from '../types/wallet.js'
import { WalletError } from '../utils/errors.js'
import { isValidPrivateKey, normalizePrivateKey } from '../utils/validation.js'
import { checksumAddress } from '../utils/ethereum.js'

// Simple encryption for private keys
// Note: For production, consider using OS keychain (keytar/keychain)
class SecureStorage {
  private algorithm = 'aes-256-gcm'
  private keyLength = 32
  private ivLength = 16
  private saltLength = 64
  private tagLength = 16

  private deriveKey(password: string, salt: Buffer): Buffer {
    return pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256')
  }

  encrypt(text: string, password: string): string {
    const salt = randomBytes(this.saltLength)
    const key = this.deriveKey(password, salt)
    const iv = randomBytes(this.ivLength)

    const cipher = createCipheriv(this.algorithm, key, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    const tag = (cipher as unknown as { getAuthTag: () => Buffer }).getAuthTag()

    // Combine salt + iv + tag + encrypted
    const result = Buffer.concat([salt, iv, tag, encrypted])
    return result.toString('base64')
  }

  decrypt(encryptedData: string, password: string): string {
    const buffer = Buffer.from(encryptedData, 'base64')

    const salt = buffer.subarray(0, this.saltLength)
    const iv = buffer.subarray(this.saltLength, this.saltLength + this.ivLength)
    const tag = buffer.subarray(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    )
    const encrypted = buffer.subarray(this.saltLength + this.ivLength + this.tagLength)

    const key = this.deriveKey(password, salt)
    const decipher = createDecipheriv(this.algorithm, key, iv)
    ;(decipher as unknown as { setAuthTag: (tag: Buffer) => void }).setAuthTag(tag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  }
}

export class WalletStorageService {
  private store: Conf<WalletStore>
  private secureStore: Conf<Record<string, string>> // walletId -> encrypted privateKey
  private secureStorage: SecureStorage
  private password: string | null = null

  constructor() {
    this.store = new Conf<WalletStore>({
      projectName: 'safe-cli',
      configName: 'wallets',
      defaults: {
        wallets: {},
        activeWallet: null,
      },
    })

    this.secureStore = new Conf<Record<string, string>>({
      projectName: 'safe-cli',
      configName: 'wallets-secure',
      defaults: {},
    })

    this.secureStorage = new SecureStorage()
  }

  // Set master password for encryption
  setPassword(password: string): void {
    this.password = password
  }

  private ensurePassword(): string {
    if (!this.password) {
      throw new WalletError('Password not set. Please provide a password for wallet encryption.')
    }
    return this.password
  }

  // Import a private key wallet
  async importWallet(
    name: string,
    privateKey: string,
    password?: string
  ): Promise<PrivateKeyWallet> {
    const pwd = password || this.ensurePassword()

    // Validate private key
    const normalizedKey = normalizePrivateKey(privateKey)
    if (!isValidPrivateKey(normalizedKey)) {
      throw new WalletError('Invalid private key format')
    }

    // Derive address from private key
    const account = privateKeyToAccount(normalizedKey)
    const address = checksumAddress(account.address)

    // Check if wallet already exists
    const existingWallets = this.store.get('wallets', {})
    const duplicate = Object.values(existingWallets).find((w) => w.address === address)
    if (duplicate) {
      throw new WalletError(`Wallet with address ${address} already exists as "${duplicate.name}"`)
    }

    // Create wallet metadata
    const walletId = randomBytes(16).toString('hex')
    const wallet: PrivateKeyWallet = {
      type: 'private-key',
      id: walletId,
      name,
      address,
      createdAt: new Date().toISOString(),
    }

    // Encrypt and store private key
    const encrypted = this.secureStorage.encrypt(normalizedKey, pwd)
    this.secureStore.set(walletId, encrypted)

    // Store wallet metadata
    this.store.set(`wallets.${walletId}`, wallet)

    // Set as active if it's the first wallet
    if (Object.keys(existingWallets).length === 0) {
      this.store.set('activeWallet', walletId)
    }

    return wallet
  }

  // Import a Ledger hardware wallet
  async importLedgerWallet(
    name: string,
    address: string,
    derivationPath: string
  ): Promise<LedgerWallet> {
    // Checksum the address
    const checksummedAddress = checksumAddress(address)

    // Check if wallet already exists
    const existingWallets = this.store.get('wallets', {})
    const duplicate = Object.values(existingWallets).find((w) => w.address === checksummedAddress)
    if (duplicate) {
      throw new WalletError(
        `Wallet with address ${checksummedAddress} already exists as "${duplicate.name}"`
      )
    }

    // Create wallet metadata
    const walletId = randomBytes(16).toString('hex')
    const wallet: LedgerWallet = {
      type: 'ledger',
      id: walletId,
      name,
      address: checksummedAddress,
      derivationPath,
      createdAt: new Date().toISOString(),
    }

    // Store wallet metadata (no private key for Ledger)
    this.store.set(`wallets.${walletId}`, wallet)

    // Set as active if it's the first wallet
    if (Object.keys(existingWallets).length === 0) {
      this.store.set('activeWallet', walletId)
    }

    return wallet
  }

  // Get wallet private key (only for private-key wallets)
  getPrivateKey(walletId: string, password?: string): string {
    const wallet = this.getWallet(walletId)
    if (!wallet) {
      throw new WalletError(`Wallet ${walletId} not found`)
    }

    if (wallet.type === 'ledger') {
      throw new WalletError(
        'Cannot get private key for Ledger wallet. Use Ledger device for signing.'
      )
    }

    const pwd = password || this.ensurePassword()

    const encrypted = this.secureStore.get(walletId)
    if (!encrypted) {
      throw new WalletError(`Private key not found for wallet ${walletId}`)
    }

    try {
      return this.secureStorage.decrypt(encrypted, pwd)
    } catch {
      throw new WalletError('Failed to decrypt private key. Incorrect password?')
    }
  }

  // Get all wallets (without private keys)
  getAllWallets(): Wallet[] {
    const wallets = this.store.get('wallets', {})
    return Object.values(wallets)
  }

  // Get wallet by ID
  getWallet(walletId: string): Wallet | undefined {
    return this.store.get(`wallets.${walletId}`)
  }

  // Get active wallet
  getActiveWallet(): Wallet | null {
    const activeId = this.store.get('activeWallet')
    if (!activeId) return null
    return this.getWallet(activeId) || null
  }

  // Set active wallet
  setActiveWallet(walletId: string): void {
    const wallet = this.getWallet(walletId)
    if (!wallet) {
      throw new WalletError(`Wallet ${walletId} not found`)
    }
    this.store.set('activeWallet', walletId)
    this.store.set(`wallets.${walletId}.lastUsed`, new Date().toISOString())
  }

  // Remove wallet
  removeWallet(walletId: string): void {
    const wallets = this.store.get('wallets', {})
    const wallet = wallets[walletId]

    // If wallet doesn't exist, silently return (idempotent operation)
    if (!wallet) {
      return
    }

    delete wallets[walletId]
    this.store.set('wallets', wallets)

    // Remove encrypted private key (only for private-key wallets)
    if (wallet.type === 'private-key') {
      this.secureStore.delete(walletId)
    }

    // Update active wallet if necessary
    const activeId = this.store.get('activeWallet')
    if (activeId === walletId) {
      const remainingWallets = Object.keys(wallets)
      this.store.set('activeWallet', remainingWallets.length > 0 ? remainingWallets[0] : null)
    }
  }

  // Update wallet name
  updateWalletName(walletId: string, newName: string): void {
    const wallet = this.getWallet(walletId)
    if (!wallet) {
      throw new WalletError(`Wallet ${walletId} not found`)
    }
    this.store.set(`wallets.${walletId}.name`, newName)
  }
}

// Singleton instance
let walletStorage: WalletStorageService | null = null

export function getWalletStorage(): WalletStorageService {
  if (!walletStorage) {
    walletStorage = new WalletStorageService()
  }
  return walletStorage
}
