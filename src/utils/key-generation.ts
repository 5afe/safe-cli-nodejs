import { randomBytes } from 'crypto'
import { privateKeyToAccount } from 'viem/accounts'
import { isValidPrivateKey, normalizePrivateKey } from './validation.js'
import type { Address } from 'viem'

/**
 * Generates a cryptographically secure random private key.
 * Uses Node.js crypto.randomBytes() for secure random number generation.
 *
 * @returns A valid Ethereum private key with 0x prefix
 * @throws Error if generated key is invalid (should never happen)
 */
export function generatePrivateKey(): `0x${string}` {
  // Generate 32 random bytes (256 bits) using CSPRNG
  const keyBytes = randomBytes(32)

  // Convert to hex string with 0x prefix
  const privateKey = `0x${keyBytes.toString('hex')}` as `0x${string}`

  // Validate the generated key (paranoid check)
  if (!isValidPrivateKey(privateKey)) {
    throw new Error('Generated invalid private key - this should never happen')
  }

  return privateKey
}

/**
 * Derives Ethereum address and account information from a private key.
 *
 * @param privateKey - The private key to derive from
 * @returns Object containing the derived address and account
 * @throws Error if private key is invalid
 */
export function deriveWalletFromPrivateKey(privateKey: string): {
  address: Address
  account: ReturnType<typeof privateKeyToAccount>
} {
  // Validate and normalize the private key
  if (!isValidPrivateKey(privateKey)) {
    throw new Error('Invalid private key format')
  }

  const normalizedKey = normalizePrivateKey(privateKey)

  // Derive the Ethereum account using viem
  const account = privateKeyToAccount(normalizedKey)

  return {
    address: account.address,
    account,
  }
}

/**
 * Generates a unique wallet ID.
 * Uses crypto.randomBytes for uniqueness.
 *
 * @returns A unique wallet identifier
 */
export function generateWalletId(): string {
  return randomBytes(16).toString('hex')
}
