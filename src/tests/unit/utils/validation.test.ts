import { describe, it, expect } from 'vitest'
import {
  isValidAddress,
  validateAndChecksumAddress,
  isValidPrivateKey,
  isValidChainId,
  isValidUrl,
  normalizePrivateKey,
} from '../../../utils/validation.js'
import { TEST_ADDRESSES, TEST_PRIVATE_KEYS } from '../../fixtures/index.js'

describe('validation utils', () => {
  describe('isValidAddress', () => {
    it('should return true for valid checksummed address', () => {
      expect(isValidAddress(TEST_ADDRESSES.owner1)).toBe(true)
    })

    it('should return true for lowercase address', () => {
      expect(isValidAddress(TEST_ADDRESSES.owner1.toLowerCase())).toBe(true)
    })

    it('should return true for zero address', () => {
      expect(isValidAddress(TEST_ADDRESSES.zeroAddress)).toBe(true)
    })

    it('should return false for uppercase address (invalid checksum)', () => {
      expect(isValidAddress(TEST_ADDRESSES.owner1.toUpperCase())).toBe(false)
    })

    it('should return false for invalid address format', () => {
      expect(isValidAddress(TEST_ADDRESSES.invalidShort)).toBe(false)
    })

    it('should return false for address without 0x prefix', () => {
      expect(isValidAddress(TEST_ADDRESSES.noPrefix)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidAddress('')).toBe(false)
    })
  })

  describe('validateAndChecksumAddress', () => {
    it('should return checksummed address for lowercase input', () => {
      const result = validateAndChecksumAddress(TEST_ADDRESSES.owner1.toLowerCase())
      expect(result).toBe(TEST_ADDRESSES.owner1)
    })

    it('should return checksummed address for valid checksummed input', () => {
      const result = validateAndChecksumAddress(TEST_ADDRESSES.owner1)
      expect(result).toBe(TEST_ADDRESSES.owner1)
    })

    it('should throw for empty string', () => {
      expect(() => validateAndChecksumAddress('')).toThrow('Address is required')
    })

    it('should throw for invalid address', () => {
      expect(() => validateAndChecksumAddress(TEST_ADDRESSES.invalidShort)).toThrow(
        'Invalid Ethereum address'
      )
    })

    it('should throw for uppercase address (invalid checksum)', () => {
      const uppercase = TEST_ADDRESSES.owner1.toUpperCase()
      expect(() => validateAndChecksumAddress(uppercase)).toThrow('Invalid Ethereum address')
    })

    it('should throw for address without 0x prefix', () => {
      expect(() => validateAndChecksumAddress(TEST_ADDRESSES.noPrefix)).toThrow(
        'Invalid Ethereum address'
      )
    })
  })

  describe('isValidPrivateKey', () => {
    it('should return true for valid private key with 0x prefix', () => {
      expect(isValidPrivateKey(TEST_PRIVATE_KEYS.owner1)).toBe(true)
    })

    it('should return true for valid private key without 0x prefix', () => {
      expect(isValidPrivateKey(TEST_PRIVATE_KEYS.noPrefix)).toBe(true)
    })

    it('should return true for 64-character hex', () => {
      const key = '0x' + 'a'.repeat(64)
      expect(isValidPrivateKey(key)).toBe(true)
    })

    it('should return false for too short private key', () => {
      expect(isValidPrivateKey(TEST_PRIVATE_KEYS.tooShort)).toBe(false)
    })

    it('should return false for too long private key', () => {
      expect(isValidPrivateKey(TEST_PRIVATE_KEYS.tooLong)).toBe(false)
    })

    it('should return false for non-hex characters', () => {
      expect(isValidPrivateKey(TEST_PRIVATE_KEYS.invalid)).toBe(false)
    })

    it('should return false for invalid hex in private key', () => {
      const invalidKey = '0x' + 'g'.repeat(64)
      expect(isValidPrivateKey(invalidKey)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidPrivateKey('')).toBe(false)
    })
  })

  describe('isValidChainId', () => {
    it('should return true for positive integer', () => {
      expect(isValidChainId('1')).toBe(true)
    })

    it('should return true for large chain ID', () => {
      expect(isValidChainId('11155111')).toBe(true)
    })

    it('should return true for common chain IDs', () => {
      expect(isValidChainId('137')).toBe(true) // Polygon
      expect(isValidChainId('42161')).toBe(true) // Arbitrum
    })

    it('should return false for zero', () => {
      expect(isValidChainId('0')).toBe(false)
    })

    it('should return false for negative number', () => {
      expect(isValidChainId('-1')).toBe(false)
    })

    it('should return false for non-numeric string', () => {
      expect(isValidChainId('abc')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidChainId('')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should return true for valid HTTP URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true)
    })

    it('should return true for valid HTTPS URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
    })

    it('should return true for URL with path', () => {
      expect(isValidUrl('https://example.com/path')).toBe(true)
    })

    it('should return true for URL with query params', () => {
      expect(isValidUrl('https://example.com?key=value')).toBe(true)
    })

    it('should return true for localhost URL', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true)
    })

    it('should return true for IP address URL', () => {
      expect(isValidUrl('http://127.0.0.1:8545')).toBe(true)
    })

    it('should return false for invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
    })

    it('should return false for URL without protocol', () => {
      expect(isValidUrl('example.com')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidUrl('')).toBe(false)
    })
  })

  describe('normalizePrivateKey', () => {
    it('should preserve 0x prefix when present', () => {
      const result = normalizePrivateKey(TEST_PRIVATE_KEYS.owner1)
      expect(result).toBe(TEST_PRIVATE_KEYS.owner1)
      expect(result.startsWith('0x')).toBe(true)
    })

    it('should add 0x prefix when missing', () => {
      const result = normalizePrivateKey(TEST_PRIVATE_KEYS.noPrefix)
      expect(result).toBe('0x' + TEST_PRIVATE_KEYS.noPrefix)
      expect(result.startsWith('0x')).toBe(true)
    })

    it('should handle empty string (adds 0x prefix)', () => {
      const result = normalizePrivateKey('')
      expect(result).toBe('0x')
    })

    it('should not double-prefix', () => {
      const key = '0xabc123'
      const result = normalizePrivateKey(key)
      expect(result).toBe(key)
      expect(result.match(/^0x/g)).toHaveLength(1)
    })
  })
})
