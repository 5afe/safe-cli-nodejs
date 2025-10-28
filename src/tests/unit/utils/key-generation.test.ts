import { describe, it, expect } from 'vitest'
import { isAddress } from 'viem'
import {
  generatePrivateKey,
  deriveWalletFromPrivateKey,
  generateWalletId,
} from '../../../utils/key-generation.js'
import { isValidPrivateKey } from '../../../utils/validation.js'
import { TEST_PRIVATE_KEYS } from '../../fixtures/index.js'

describe('key-generation utils', () => {
  describe('generatePrivateKey', () => {
    it('should generate a valid private key with 0x prefix', () => {
      const privateKey = generatePrivateKey()
      expect(privateKey).toMatch(/^0x[0-9a-f]{64}$/)
    })

    it('should generate a private key that passes validation', () => {
      const privateKey = generatePrivateKey()
      expect(isValidPrivateKey(privateKey)).toBe(true)
    })

    it('should generate different keys on each call', () => {
      const key1 = generatePrivateKey()
      const key2 = generatePrivateKey()
      const key3 = generatePrivateKey()

      expect(key1).not.toBe(key2)
      expect(key2).not.toBe(key3)
      expect(key1).not.toBe(key3)
    })

    it('should generate keys that derive valid addresses', () => {
      const privateKey = generatePrivateKey()
      const { address } = deriveWalletFromPrivateKey(privateKey)

      expect(isAddress(address)).toBe(true)
    })

    it('should generate 32-byte (256-bit) private keys', () => {
      const privateKey = generatePrivateKey()
      // Remove 0x prefix and check length
      const keyWithoutPrefix = privateKey.slice(2)
      expect(keyWithoutPrefix.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('should generate keys with high entropy', () => {
      // Generate multiple keys and ensure they're not sequential or predictable
      const keys = Array.from({ length: 10 }, () => generatePrivateKey())
      const uniqueKeys = new Set(keys)

      // All keys should be unique
      expect(uniqueKeys.size).toBe(10)

      // Keys should not be sequential
      for (let i = 0; i < keys.length - 1; i++) {
        const key1Int = BigInt(keys[i])
        const key2Int = BigInt(keys[i + 1])
        expect(key2Int - key1Int).not.toBe(1n)
      }
    })
  })

  describe('deriveWalletFromPrivateKey', () => {
    it('should derive a valid address from a private key', () => {
      const { address } = deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.owner1)
      expect(isAddress(address)).toBe(true)
    })

    it('should return both address and account', () => {
      const result = deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.owner1)
      expect(result).toHaveProperty('address')
      expect(result).toHaveProperty('account')
      expect(typeof result.address).toBe('string')
      expect(typeof result.account).toBe('object')
    })

    it('should derive same address for same private key', () => {
      const result1 = deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.owner1)
      const result2 = deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.owner1)
      expect(result1.address).toBe(result2.address)
    })

    it('should derive different addresses for different private keys', () => {
      const result1 = deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.owner1)
      const result2 = deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.owner2)
      expect(result1.address).not.toBe(result2.address)
    })

    it('should handle private key without 0x prefix', () => {
      const { address } = deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.noPrefix)
      expect(isAddress(address)).toBe(true)
    })

    it('should throw for invalid private key', () => {
      expect(() => deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.invalid)).toThrow(
        'Invalid private key format'
      )
    })

    it('should throw for too short private key', () => {
      expect(() => deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.tooShort)).toThrow(
        'Invalid private key format'
      )
    })

    it('should throw for too long private key', () => {
      expect(() => deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.tooLong)).toThrow(
        'Invalid private key format'
      )
    })

    it('should throw for empty string', () => {
      expect(() => deriveWalletFromPrivateKey('')).toThrow('Invalid private key format')
    })

    it('should return checksummed address', () => {
      const { address } = deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.owner1)
      // Checksummed addresses have mixed case
      expect(address).not.toBe(address.toLowerCase())
      expect(address).not.toBe(address.toUpperCase())
    })

    it('should return account with signing capabilities', () => {
      const { account } = deriveWalletFromPrivateKey(TEST_PRIVATE_KEYS.owner1)
      expect(account).toHaveProperty('address')
      expect(account).toHaveProperty('signMessage')
      expect(account).toHaveProperty('signTransaction')
      expect(account).toHaveProperty('signTypedData')
    })
  })

  describe('generateWalletId', () => {
    it('should generate a non-empty wallet ID', () => {
      const id = generateWalletId()
      expect(id).toBeTruthy()
      expect(id.length).toBeGreaterThan(0)
    })

    it('should generate a hex string', () => {
      const id = generateWalletId()
      expect(id).toMatch(/^[0-9a-f]+$/)
    })

    it('should generate 32-character ID (16 bytes)', () => {
      const id = generateWalletId()
      expect(id.length).toBe(32) // 16 bytes = 32 hex chars
    })

    it('should generate different IDs on each call', () => {
      const id1 = generateWalletId()
      const id2 = generateWalletId()
      const id3 = generateWalletId()

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should generate IDs with high entropy', () => {
      const ids = Array.from({ length: 100 }, () => generateWalletId())
      const uniqueIds = new Set(ids)

      // All IDs should be unique
      expect(uniqueIds.size).toBe(100)
    })
  })

  describe('integration tests', () => {
    it('should generate key, derive address, and create valid wallet data', () => {
      const privateKey = generatePrivateKey()
      const { address, account } = deriveWalletFromPrivateKey(privateKey)
      const id = generateWalletId()

      // All components should be valid
      expect(isValidPrivateKey(privateKey)).toBe(true)
      expect(isAddress(address)).toBe(true)
      expect(id.length).toBe(32)

      // Account address should match derived address
      expect(account.address).toBe(address)
    })

    it('should support complete wallet creation flow', () => {
      // Simulate wallet creation
      const walletData = {
        id: generateWalletId(),
        privateKey: generatePrivateKey(),
      }

      const { address } = deriveWalletFromPrivateKey(walletData.privateKey)

      const wallet = {
        type: 'private-key' as const,
        id: walletData.id,
        name: 'test-wallet',
        address,
        createdAt: new Date().toISOString(),
      }

      // Validate wallet structure
      expect(wallet.type).toBe('private-key')
      expect(wallet.id.length).toBe(32)
      expect(isAddress(wallet.address)).toBe(true)
      expect(wallet.name).toBe('test-wallet')
      expect(new Date(wallet.createdAt).getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('security tests', () => {
    it('should use cryptographically secure random generation', () => {
      // Generate many keys and check distribution
      const keys = Array.from({ length: 100 }, () => generatePrivateKey())

      // Check that first byte has good distribution (not all the same)
      const firstBytes = keys.map((key) => key.slice(2, 4))
      const uniqueFirstBytes = new Set(firstBytes)

      // With 100 random samples, we should have reasonable entropy
      // (not perfect, but at least more than 50% unique first bytes)
      expect(uniqueFirstBytes.size).toBeGreaterThan(50)
    })

    it('should never generate zero private key', () => {
      // Generate multiple keys and ensure none are zero
      const keys = Array.from({ length: 100 }, () => generatePrivateKey())
      const zeroKey = '0x' + '0'.repeat(64)

      keys.forEach((key) => {
        expect(key).not.toBe(zeroKey)
        expect(BigInt(key)).toBeGreaterThan(0n)
      })
    })

    it('should generate keys in valid range for secp256k1', () => {
      // secp256k1 private keys must be < n where n is the curve order
      const CURVE_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n

      const keys = Array.from({ length: 10 }, () => generatePrivateKey())

      keys.forEach((key) => {
        const keyInt = BigInt(key)
        expect(keyInt).toBeGreaterThan(0n)
        expect(keyInt).toBeLessThan(CURVE_ORDER)
      })
    })
  })
})
