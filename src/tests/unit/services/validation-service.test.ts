import { describe, it, expect, beforeEach } from 'vitest'
import { ValidationService } from '../../../services/validation-service.js'
import { ValidationError } from '../../../utils/errors.js'
import { TEST_ADDRESSES, TEST_PRIVATE_KEYS } from '../../fixtures/index.js'

describe('ValidationService', () => {
  let service: ValidationService

  beforeEach(() => {
    service = new ValidationService()
  })

  describe('validateAddress / assertAddress', () => {
    describe('valid addresses', () => {
      it('should accept valid checksummed addresses', () => {
        const result = service.validateAddress(TEST_ADDRESSES.owner1)
        expect(result).toBeUndefined()
      })

      it('should accept valid lowercase addresses', () => {
        const lowercase = TEST_ADDRESSES.owner1.toLowerCase()
        const result = service.validateAddress(lowercase)
        expect(result).toBeUndefined()
      })

      it('should reject all-uppercase addresses (invalid checksum)', () => {
        // Viem's isAddress() validates checksum, all-uppercase fails checksum validation
        const uppercase = TEST_ADDRESSES.owner1.toUpperCase()
        const result = service.validateAddress(uppercase)
        expect(result).toBe('Invalid Ethereum address')
      })

      it('should reject incorrectly mixed case addresses (invalid checksum)', () => {
        // This has wrong checksum mixing - should fail
        const mixedCase = '0xF39fD6e51AaD88f6f4Ce6AB8827279CfFFB92266'
        const result = service.validateAddress(mixedCase)
        expect(result).toBe('Invalid Ethereum address')
      })

      it('should accept zero address', () => {
        const result = service.validateAddress(TEST_ADDRESSES.zeroAddress)
        expect(result).toBeUndefined()
      })
    })

    describe('invalid addresses', () => {
      it('should reject address without 0x prefix', () => {
        const result = service.validateAddress(TEST_ADDRESSES.noPrefix)
        expect(result).toBe('Invalid Ethereum address')
      })

      it('should reject address shorter than 42 characters', () => {
        const result = service.validateAddress(TEST_ADDRESSES.invalidShort)
        expect(result).toBe('Invalid Ethereum address')
      })

      it('should reject address longer than 42 characters', () => {
        const result = service.validateAddress(TEST_ADDRESSES.invalidLong)
        expect(result).toBe('Invalid Ethereum address')
      })

      it('should reject address with invalid characters', () => {
        const result = service.validateAddress(TEST_ADDRESSES.invalidChars)
        expect(result).toBe('Invalid Ethereum address')
      })

      it('should reject empty string', () => {
        const result = service.validateAddress('')
        expect(result).toBe('Address is required')
      })

      it('should reject null', () => {
        const result = service.validateAddress(null)
        expect(result).toBe('Address is required')
      })

      it('should reject undefined', () => {
        const result = service.validateAddress(undefined)
        expect(result).toBe('Address is required')
      })

      it('should reject non-string values', () => {
        const result = service.validateAddress(12345)
        expect(result).toBe('Address is required')
      })

      it('should reject object', () => {
        const result = service.validateAddress({ address: TEST_ADDRESSES.owner1 })
        expect(result).toBe('Address is required')
      })
    })

    describe('assertAddress', () => {
      it('should return checksummed address for valid input', () => {
        const lowercase = TEST_ADDRESSES.owner1.toLowerCase()
        const result = service.assertAddress(lowercase)
        expect(result).toBe(TEST_ADDRESSES.owner1)
      })

      it('should preserve checksummed address for valid checksummed input', () => {
        const result = service.assertAddress(TEST_ADDRESSES.owner1)
        expect(result).toBe(TEST_ADDRESSES.owner1)
      })

      it('should throw ValidationError for invalid address', () => {
        expect(() => service.assertAddress(TEST_ADDRESSES.invalidShort)).toThrow(ValidationError)
      })

      it('should throw ValidationError with field name', () => {
        expect(() => service.assertAddress(TEST_ADDRESSES.invalidShort, 'Owner Address')).toThrow(
          'Owner Address: Invalid Ethereum address'
        )
      })

      it('should throw ValidationError for empty string', () => {
        expect(() => service.assertAddress('')).toThrow('Address: Address is required')
      })

      it('should use default field name "Address"', () => {
        expect(() => service.assertAddress(TEST_ADDRESSES.invalidChars)).toThrow(
          'Address: Invalid Ethereum address'
        )
      })

      it('should throw for uppercase address (invalid checksum)', () => {
        const uppercase = TEST_ADDRESSES.owner1.toUpperCase()
        expect(() => service.assertAddress(uppercase)).toThrow(ValidationError)
      })

      it('should throw for incorrectly mixed case (invalid checksum)', () => {
        const mixedCase = '0xF39fD6e51AaD88f6f4Ce6AB8827279CfFFB92266'
        expect(() => service.assertAddress(mixedCase)).toThrow(ValidationError)
      })
    })
  })

  describe('validatePrivateKey / assertPrivateKey', () => {
    describe('valid private keys', () => {
      it('should accept private key with 0x prefix', () => {
        const result = service.validatePrivateKey(TEST_PRIVATE_KEYS.owner1)
        expect(result).toBeUndefined()
      })

      it('should accept private key without 0x prefix', () => {
        const result = service.validatePrivateKey(TEST_PRIVATE_KEYS.noPrefix)
        expect(result).toBeUndefined()
      })

      it('should accept 64-character hex string', () => {
        const key = '0x' + 'a'.repeat(64)
        const result = service.validatePrivateKey(key)
        expect(result).toBeUndefined()
      })

      it('should accept lowercase hex characters', () => {
        const key = '0x' + 'abcdef0123456789'.repeat(4)
        const result = service.validatePrivateKey(key)
        expect(result).toBeUndefined()
      })

      it('should accept uppercase hex characters', () => {
        const key = '0x' + 'ABCDEF0123456789'.repeat(4)
        const result = service.validatePrivateKey(key)
        expect(result).toBeUndefined()
      })
    })

    describe('invalid private keys', () => {
      it('should reject private key shorter than 64 characters', () => {
        const result = service.validatePrivateKey(TEST_PRIVATE_KEYS.tooShort)
        expect(result).toContain('Invalid private key format')
      })

      it('should reject private key longer than 64 characters', () => {
        const result = service.validatePrivateKey(TEST_PRIVATE_KEYS.tooLong)
        expect(result).toContain('Invalid private key format')
      })

      it('should reject non-hex characters', () => {
        const result = service.validatePrivateKey(TEST_PRIVATE_KEYS.invalid)
        expect(result).toContain('Invalid private key format')
      })

      it('should reject key with invalid hex characters', () => {
        const invalidKey = '0x' + 'g'.repeat(64) // 'g' is not a valid hex character
        const result = service.validatePrivateKey(invalidKey)
        expect(result).toContain('Invalid private key format')
      })

      it('should reject empty string', () => {
        const result = service.validatePrivateKey('')
        expect(result).toBe('Private key is required')
      })

      it('should reject null', () => {
        const result = service.validatePrivateKey(null)
        expect(result).toBe('Private key is required')
      })

      it('should reject undefined', () => {
        const result = service.validatePrivateKey(undefined)
        expect(result).toBe('Private key is required')
      })

      it('should reject non-string values', () => {
        const result = service.validatePrivateKey(12345)
        expect(result).toBe('Private key is required')
      })
    })

    describe('assertPrivateKey', () => {
      it('should return private key with 0x prefix for input with prefix', () => {
        const result = service.assertPrivateKey(TEST_PRIVATE_KEYS.owner1)
        expect(result).toBe(TEST_PRIVATE_KEYS.owner1)
        expect(result.startsWith('0x')).toBe(true)
      })

      it('should add 0x prefix for input without prefix', () => {
        const result = service.assertPrivateKey(TEST_PRIVATE_KEYS.noPrefix)
        expect(result).toBe('0x' + TEST_PRIVATE_KEYS.noPrefix)
        expect(result.startsWith('0x')).toBe(true)
      })

      it('should throw ValidationError for invalid private key', () => {
        expect(() => service.assertPrivateKey(TEST_PRIVATE_KEYS.invalid)).toThrow(ValidationError)
      })

      it('should throw ValidationError with field name', () => {
        expect(() => service.assertPrivateKey(TEST_PRIVATE_KEYS.tooShort, 'Wallet Key')).toThrow(
          'Wallet Key:'
        )
      })

      it('should use default field name "Private key"', () => {
        expect(() => service.assertPrivateKey(TEST_PRIVATE_KEYS.invalid)).toThrow('Private key:')
      })
    })
  })

  describe('validateChainId / assertChainId', () => {
    describe('valid chain IDs', () => {
      it('should accept positive integer as string', () => {
        const result = service.validateChainId('1')
        expect(result).toBeUndefined()
      })

      it('should accept large chain ID', () => {
        const result = service.validateChainId('11155111')
        expect(result).toBeUndefined()
      })

      it('should accept chain ID "137" (Polygon)', () => {
        const result = service.validateChainId('137')
        expect(result).toBeUndefined()
      })

      it('should accept chain ID "42161" (Arbitrum)', () => {
        const result = service.validateChainId('42161')
        expect(result).toBeUndefined()
      })
    })

    describe('invalid chain IDs', () => {
      it('should reject zero', () => {
        const result = service.validateChainId('0')
        expect(result).toBe('Chain ID must be a positive integer')
      })

      it('should reject negative numbers', () => {
        const result = service.validateChainId('-1')
        expect(result).toBe('Chain ID must be a positive integer')
      })

      it('should reject non-numeric string', () => {
        const result = service.validateChainId('abc')
        expect(result).toBe('Chain ID must be a positive integer')
      })

      it('should accept decimal strings (parseInt ignores fractional part)', () => {
        // parseInt('1.5') === 1, so this is technically valid
        const result = service.validateChainId('1.5')
        expect(result).toBeUndefined()
      })

      it('should reject empty string', () => {
        const result = service.validateChainId('')
        expect(result).toBe('Chain ID is required')
      })

      it('should reject null', () => {
        const result = service.validateChainId(null)
        expect(result).toBe('Chain ID is required')
      })

      it('should reject undefined', () => {
        const result = service.validateChainId(undefined)
        expect(result).toBe('Chain ID is required')
      })

      it('should reject non-string values', () => {
        const result = service.validateChainId(123)
        expect(result).toBe('Chain ID is required')
      })
    })

    describe('assertChainId', () => {
      it('should not throw for valid chain ID', () => {
        expect(() => service.assertChainId('1')).not.toThrow()
      })

      it('should throw ValidationError for invalid chain ID', () => {
        expect(() => service.assertChainId('0')).toThrow(ValidationError)
      })

      it('should throw ValidationError with field name', () => {
        expect(() => service.assertChainId('abc', 'Network ID')).toThrow('Network ID:')
      })

      it('should use default field name "Chain ID"', () => {
        expect(() => service.assertChainId('-1')).toThrow('Chain ID:')
      })
    })
  })

  describe('validateUrl / assertUrl', () => {
    describe('valid URLs', () => {
      it('should accept valid HTTP URL', () => {
        const result = service.validateUrl('http://example.com')
        expect(result).toBeUndefined()
      })

      it('should accept valid HTTPS URL', () => {
        const result = service.validateUrl('https://example.com')
        expect(result).toBeUndefined()
      })

      it('should accept URL with path', () => {
        const result = service.validateUrl('https://example.com/path/to/resource')
        expect(result).toBeUndefined()
      })

      it('should accept URL with query parameters', () => {
        const result = service.validateUrl('https://example.com?key=value')
        expect(result).toBeUndefined()
      })

      it('should accept URL with port', () => {
        const result = service.validateUrl('https://example.com:8080')
        expect(result).toBeUndefined()
      })

      it('should accept localhost URL', () => {
        const result = service.validateUrl('http://localhost:3000')
        expect(result).toBeUndefined()
      })

      it('should accept IP address URL', () => {
        const result = service.validateUrl('http://127.0.0.1:8545')
        expect(result).toBeUndefined()
      })
    })

    describe('invalid URLs', () => {
      it('should reject invalid URL format', () => {
        const result = service.validateUrl('not-a-url')
        expect(result).toBe('Invalid URL format')
      })

      it('should reject URL without protocol', () => {
        const result = service.validateUrl('example.com')
        expect(result).toBe('Invalid URL format')
      })

      it('should reject empty string when required', () => {
        const result = service.validateUrl('')
        expect(result).toBe('URL is required')
      })

      it('should accept empty string when not required', () => {
        const result = service.validateUrl('', false)
        expect(result).toBeUndefined()
      })

      it('should reject null', () => {
        const result = service.validateUrl(null)
        expect(result).toBe('URL is required')
      })

      it('should reject undefined', () => {
        const result = service.validateUrl(undefined)
        expect(result).toBe('URL is required')
      })

      it('should reject non-string values', () => {
        const result = service.validateUrl(12345)
        expect(result).toBe('URL is required')
      })
    })

    describe('assertUrl', () => {
      it('should not throw for valid URL', () => {
        expect(() => service.assertUrl('https://example.com')).not.toThrow()
      })

      it('should throw ValidationError for invalid URL', () => {
        expect(() => service.assertUrl('not-a-url')).toThrow(ValidationError)
      })

      it('should throw ValidationError with field name', () => {
        expect(() => service.assertUrl('invalid', 'RPC URL')).toThrow('RPC URL:')
      })

      it('should use default field name "URL"', () => {
        expect(() => service.assertUrl('invalid')).toThrow('URL:')
      })
    })
  })

  describe('validatePassword', () => {
    it('should accept password with minimum length (default 8)', () => {
      const result = service.validatePassword('password123')
      expect(result).toBeUndefined()
    })

    it('should accept password exactly at minimum length', () => {
      const result = service.validatePassword('12345678')
      expect(result).toBeUndefined()
    })

    it('should accept long password', () => {
      const result = service.validatePassword('a'.repeat(100))
      expect(result).toBeUndefined()
    })

    it('should accept custom minimum length', () => {
      const result = service.validatePassword('abc', 3)
      expect(result).toBeUndefined()
    })

    it('should reject password shorter than minimum', () => {
      const result = service.validatePassword('short')
      expect(result).toBe('Password must be at least 8 characters')
    })

    it('should reject password shorter than custom minimum', () => {
      const result = service.validatePassword('ab', 3)
      expect(result).toBe('Password must be at least 3 characters')
    })

    it('should reject empty string', () => {
      const result = service.validatePassword('')
      expect(result).toBe('Password is required')
    })

    it('should reject null/undefined', () => {
      expect(service.validatePassword(null)).toBe('Password is required')
      expect(service.validatePassword(undefined)).toBe('Password is required')
    })
  })

  describe('validatePasswordConfirmation', () => {
    it('should accept matching passwords', () => {
      const result = service.validatePasswordConfirmation('password123', 'password123')
      expect(result).toBeUndefined()
    })

    it('should accept empty strings if they match', () => {
      const result = service.validatePasswordConfirmation('', '')
      expect(result).toBeUndefined()
    })

    it('should reject non-matching passwords', () => {
      const result = service.validatePasswordConfirmation('password123', 'different')
      expect(result).toBe('Passwords do not match')
    })

    it('should reject when confirmation is empty', () => {
      const result = service.validatePasswordConfirmation('', 'password123')
      expect(result).toBe('Passwords do not match')
    })

    it('should reject null/undefined', () => {
      expect(service.validatePasswordConfirmation(null, 'password')).toBe('Passwords do not match')
      expect(service.validatePasswordConfirmation(undefined, 'password')).toBe(
        'Passwords do not match'
      )
    })
  })

  describe('validateThreshold / assertThreshold', () => {
    describe('validateThreshold', () => {
      it('should accept threshold = 1 (default min)', () => {
        const result = service.validateThreshold('1')
        expect(result).toBeUndefined()
      })

      it('should accept threshold within range', () => {
        const result = service.validateThreshold('2', 1, 5)
        expect(result).toBeUndefined()
      })

      it('should accept threshold at max', () => {
        const result = service.validateThreshold('3', 1, 3)
        expect(result).toBeUndefined()
      })

      it('should reject threshold = 0', () => {
        const result = service.validateThreshold('0')
        expect(result).toBe('Threshold must be at least 1')
      })

      it('should reject threshold below custom min', () => {
        const result = service.validateThreshold('1', 2)
        expect(result).toBe('Threshold must be at least 2')
      })

      it('should reject threshold above max', () => {
        const result = service.validateThreshold('4', 1, 3)
        expect(result).toBe('Threshold cannot exceed 3 (number of owners)')
      })

      it('should reject non-numeric string', () => {
        const result = service.validateThreshold('abc')
        expect(result).toBe('Threshold must be a number')
      })

      it('should reject empty string', () => {
        const result = service.validateThreshold('')
        expect(result).toBe('Threshold is required')
      })

      it('should reject null/undefined', () => {
        expect(service.validateThreshold(null)).toBe('Threshold is required')
        expect(service.validateThreshold(undefined)).toBe('Threshold is required')
      })
    })

    describe('assertThreshold', () => {
      it('should not throw for valid threshold', () => {
        expect(() => service.assertThreshold(2, 1, 5)).not.toThrow()
      })

      it('should throw for threshold below min', () => {
        expect(() => service.assertThreshold(0, 1, 5)).toThrow('Threshold must be at least 1')
      })

      it('should throw for threshold above max', () => {
        expect(() => service.assertThreshold(6, 1, 5)).toThrow('Threshold cannot exceed 5')
      })

      it('should include custom field name in error', () => {
        expect(() => service.assertThreshold(0, 1, 5, 'Safe Threshold')).toThrow(
          'Safe Threshold must be at least 1'
        )
      })
    })
  })

  describe('validateNonce', () => {
    it('should accept undefined (optional)', () => {
      const result = service.validateNonce(undefined)
      expect(result).toBeUndefined()
    })

    it('should accept null (optional)', () => {
      const result = service.validateNonce(null)
      expect(result).toBeUndefined()
    })

    it('should accept zero', () => {
      const result = service.validateNonce('0')
      expect(result).toBeUndefined()
    })

    it('should accept positive nonce', () => {
      const result = service.validateNonce('5')
      expect(result).toBeUndefined()
    })

    it('should accept nonce equal to current nonce', () => {
      const result = service.validateNonce('5', 5)
      expect(result).toBeUndefined()
    })

    it('should accept nonce greater than current nonce', () => {
      const result = service.validateNonce('10', 5)
      expect(result).toBeUndefined()
    })

    it('should reject negative nonce', () => {
      const result = service.validateNonce('-1')
      expect(result).toBe('Nonce must be a non-negative number')
    })

    it('should reject nonce lower than current', () => {
      const result = service.validateNonce('3', 5)
      expect(result).toBe('Nonce cannot be lower than current Safe nonce (5)')
    })

    it('should reject non-numeric string', () => {
      const result = service.validateNonce('abc')
      expect(result).toBe('Nonce must be a non-negative number')
    })
  })

  describe('validateWeiValue', () => {
    it('should accept zero', () => {
      const result = service.validateWeiValue('0')
      expect(result).toBeUndefined()
    })

    it('should accept positive value', () => {
      const result = service.validateWeiValue('1000000000000000000')
      expect(result).toBeUndefined()
    })

    it('should accept very large values', () => {
      const result = service.validateWeiValue('999999999999999999999999999999')
      expect(result).toBeUndefined()
    })

    it('should reject non-numeric string', () => {
      const result = service.validateWeiValue('abc')
      expect(result).toBe('Invalid number')
    })

    it('should reject empty string', () => {
      const result = service.validateWeiValue('')
      expect(result).toBe('Value is required')
    })

    it('should reject null/undefined', () => {
      expect(service.validateWeiValue(null)).toBe('Value is required')
      expect(service.validateWeiValue(undefined)).toBe('Value is required')
    })
  })

  describe('validateHexData', () => {
    it('should accept empty hex (0x)', () => {
      const result = service.validateHexData('0x')
      expect(result).toBeUndefined()
    })

    it('should accept valid hex data', () => {
      const result = service.validateHexData('0x1234abcd')
      expect(result).toBeUndefined()
    })

    it('should accept long hex data', () => {
      const result = service.validateHexData('0x' + 'a'.repeat(1000))
      expect(result).toBeUndefined()
    })

    it('should accept uppercase hex', () => {
      const result = service.validateHexData('0xABCDEF')
      expect(result).toBeUndefined()
    })

    it('should reject hex without 0x prefix', () => {
      const result = service.validateHexData('1234abcd')
      expect(result).toBe('Data must start with 0x')
    })

    it('should reject invalid hex characters', () => {
      const result = service.validateHexData('0xGGGG')
      expect(result).toBe('Data must be valid hex')
    })

    it('should reject empty string', () => {
      const result = service.validateHexData('')
      expect(result).toBe('Data is required (use 0x for empty)')
    })

    it('should reject null/undefined', () => {
      expect(service.validateHexData(null)).toBe('Data is required (use 0x for empty)')
      expect(service.validateHexData(undefined)).toBe('Data is required (use 0x for empty)')
    })
  })

  describe('validateRequired', () => {
    it('should accept non-empty string', () => {
      const result = service.validateRequired('value')
      expect(result).toBeUndefined()
    })

    it('should accept string with spaces', () => {
      const result = service.validateRequired('  value  ')
      expect(result).toBeUndefined()
    })

    it('should reject empty string', () => {
      const result = service.validateRequired('')
      expect(result).toBe('Value is required')
    })

    it('should reject string with only spaces', () => {
      const result = service.validateRequired('   ')
      expect(result).toBe('Value is required')
    })

    it('should reject null/undefined', () => {
      expect(service.validateRequired(null)).toBe('Value is required')
      expect(service.validateRequired(undefined)).toBe('Value is required')
    })

    it('should include custom field name in error', () => {
      const result = service.validateRequired('', 'Name')
      expect(result).toBe('Name is required')
    })
  })

  describe('validateShortName', () => {
    it('should accept lowercase alphanumeric', () => {
      const result = service.validateShortName('eth')
      expect(result).toBeUndefined()
    })

    it('should accept with hyphens', () => {
      const result = service.validateShortName('arbitrum-one')
      expect(result).toBeUndefined()
    })

    it('should accept numbers', () => {
      const result = service.validateShortName('chain123')
      expect(result).toBeUndefined()
    })

    it('should reject uppercase letters', () => {
      const result = service.validateShortName('ETH')
      expect(result).toBe('Short name must be lowercase alphanumeric with hyphens')
    })

    it('should reject special characters', () => {
      const result = service.validateShortName('eth_chain')
      expect(result).toBe('Short name must be lowercase alphanumeric with hyphens')
    })

    it('should reject empty string', () => {
      const result = service.validateShortName('')
      expect(result).toBe('Short name is required')
    })
  })

  describe('validateOwnerAddress', () => {
    const owners = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2]

    it('should accept address in owners list', () => {
      const result = service.validateOwnerAddress(TEST_ADDRESSES.owner1, owners)
      expect(result).toBeUndefined()
    })

    it('should accept lowercase address in owners list', () => {
      const result = service.validateOwnerAddress(TEST_ADDRESSES.owner1.toLowerCase(), owners)
      expect(result).toBeUndefined()
    })

    it('should reject address not in owners list', () => {
      const result = service.validateOwnerAddress(TEST_ADDRESSES.owner3, owners)
      expect(result).toBe('Address is not an owner of this Safe')
    })

    it('should reject invalid address', () => {
      const result = service.validateOwnerAddress(TEST_ADDRESSES.invalidShort, owners)
      expect(result).toBe('Invalid Ethereum address')
    })

    it('should handle empty owners array', () => {
      const result = service.validateOwnerAddress(TEST_ADDRESSES.owner1, [])
      expect(result).toBe('Address is not an owner of this Safe')
    })
  })

  describe('validateNonOwnerAddress', () => {
    const owners = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2]

    it('should accept address not in owners list', () => {
      const result = service.validateNonOwnerAddress(TEST_ADDRESSES.owner3, owners)
      expect(result).toBeUndefined()
    })

    it('should reject address already in owners list', () => {
      const result = service.validateNonOwnerAddress(TEST_ADDRESSES.owner1, owners)
      expect(result).toBe('Address is already an owner of this Safe')
    })

    it('should reject lowercase address already in owners', () => {
      const result = service.validateNonOwnerAddress(TEST_ADDRESSES.owner1.toLowerCase(), owners)
      expect(result).toBe('Address is already an owner of this Safe')
    })

    it('should reject invalid address', () => {
      const result = service.validateNonOwnerAddress(TEST_ADDRESSES.invalidShort, owners)
      expect(result).toBe('Invalid Ethereum address')
    })

    it('should accept any valid address with empty owners array', () => {
      const result = service.validateNonOwnerAddress(TEST_ADDRESSES.owner1, [])
      expect(result).toBeUndefined()
    })
  })

  describe('validateJson / assertJson', () => {
    describe('validateJson', () => {
      it('should accept valid JSON object', () => {
        const result = service.validateJson('{"key": "value"}')
        expect(result).toBeUndefined()
      })

      it('should accept valid JSON array', () => {
        const result = service.validateJson('[1, 2, 3]')
        expect(result).toBeUndefined()
      })

      it('should accept nested JSON', () => {
        const result = service.validateJson('{"nested": {"key": "value"}}')
        expect(result).toBeUndefined()
      })

      it('should accept empty object', () => {
        const result = service.validateJson('{}')
        expect(result).toBeUndefined()
      })

      it('should accept empty array', () => {
        const result = service.validateJson('[]')
        expect(result).toBeUndefined()
      })

      it('should reject invalid JSON', () => {
        const result = service.validateJson('{invalid}')
        expect(result).toBe('Invalid JSON format')
      })

      it('should reject empty string', () => {
        const result = service.validateJson('')
        expect(result).toBe('JSON is required')
      })

      it('should reject null/undefined', () => {
        expect(service.validateJson(null)).toBe('JSON is required')
        expect(service.validateJson(undefined)).toBe('JSON is required')
      })
    })

    describe('assertJson', () => {
      it('should parse and return valid JSON object', () => {
        const result = service.assertJson<{ key: string }>('{"key": "value"}')
        expect(result).toEqual({ key: 'value' })
      })

      it('should parse and return valid JSON array', () => {
        const result = service.assertJson<number[]>('[1, 2, 3]')
        expect(result).toEqual([1, 2, 3])
      })

      it('should throw ValidationError for invalid JSON', () => {
        expect(() => service.assertJson('{invalid}')).toThrow(ValidationError)
      })

      it('should include custom field name in error', () => {
        expect(() => service.assertJson('', 'Transaction Data')).toThrow('Transaction Data:')
      })
    })
  })

  describe('validatePositiveInteger', () => {
    it('should accept positive integer as string', () => {
      const result = service.validatePositiveInteger('5')
      expect(result).toBeUndefined()
    })

    it('should accept positive integer as number', () => {
      const result = service.validatePositiveInteger(5)
      expect(result).toBeUndefined()
    })

    it('should accept 1', () => {
      const result = service.validatePositiveInteger('1')
      expect(result).toBeUndefined()
    })

    it('should reject zero', () => {
      const result = service.validatePositiveInteger('0')
      expect(result).toBe('Value must be a positive integer')
    })

    it('should reject negative number', () => {
      const result = service.validatePositiveInteger('-5')
      expect(result).toBe('Value must be a positive integer')
    })

    it('should accept decimal strings (parseInt truncates)', () => {
      // parseInt('5.5') === 5, Number.isInteger(5) === true
      const result = service.validatePositiveInteger('5.5')
      expect(result).toBeUndefined()
    })

    it('should reject non-numeric string', () => {
      const result = service.validatePositiveInteger('abc')
      expect(result).toBe('Value must be a positive integer')
    })

    it('should reject empty/null/undefined', () => {
      expect(service.validatePositiveInteger('')).toBe('Value is required')
      expect(service.validatePositiveInteger(null)).toBe('Value is required')
      expect(service.validatePositiveInteger(undefined)).toBe('Value is required')
    })

    it('should include custom field name in error', () => {
      const result = service.validatePositiveInteger('0', 'Count')
      expect(result).toBe('Count must be a positive integer')
    })
  })

  describe('validateAddresses / assertAddresses', () => {
    describe('validateAddresses', () => {
      it('should accept array of valid addresses', () => {
        const addresses = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2]
        const result = service.validateAddresses(addresses)
        expect(result).toBeUndefined()
      })

      it('should accept single address in array', () => {
        const addresses = [TEST_ADDRESSES.owner1]
        const result = service.validateAddresses(addresses)
        expect(result).toBeUndefined()
      })

      it('should accept lowercase addresses', () => {
        const addresses = [TEST_ADDRESSES.owner1.toLowerCase(), TEST_ADDRESSES.owner2.toLowerCase()]
        const result = service.validateAddresses(addresses)
        expect(result).toBeUndefined()
      })

      it('should reject empty array', () => {
        const result = service.validateAddresses([])
        expect(result).toBe('At least one address is required')
      })

      it('should reject non-array', () => {
        const result = service.validateAddresses('not-an-array' as any)
        expect(result).toBe('At least one address is required')
      })

      it('should reject array with invalid address', () => {
        const addresses = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.invalidShort]
        const result = service.validateAddresses(addresses)
        expect(result).toContain('Address 2:')
        expect(result).toContain('Invalid Ethereum address')
      })

      it('should reject duplicate addresses (same case)', () => {
        const addresses = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner1]
        const result = service.validateAddresses(addresses)
        expect(result).toBe('Duplicate addresses are not allowed')
      })

      it('should reject duplicate addresses (different case)', () => {
        const addresses = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner1.toLowerCase()]
        const result = service.validateAddresses(addresses)
        expect(result).toBe('Duplicate addresses are not allowed')
      })

      it('should provide indexed error messages', () => {
        const addresses = [TEST_ADDRESSES.owner1, 'invalid', TEST_ADDRESSES.owner2]
        const result = service.validateAddresses(addresses)
        expect(result).toContain('Address 2:')
      })
    })

    describe('assertAddresses', () => {
      it('should return checksummed addresses', () => {
        const addresses = [TEST_ADDRESSES.owner1.toLowerCase(), TEST_ADDRESSES.owner2.toLowerCase()]
        const result = service.assertAddresses(addresses)
        expect(result).toEqual([TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2])
      })

      it('should throw ValidationError for empty array', () => {
        expect(() => service.assertAddresses([])).toThrow(ValidationError)
      })

      it('should throw ValidationError for invalid address in array', () => {
        const addresses = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.invalidShort]
        expect(() => service.assertAddresses(addresses)).toThrow(ValidationError)
      })

      it('should throw ValidationError for duplicate addresses', () => {
        const addresses = [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner1]
        expect(() => service.assertAddresses(addresses)).toThrow(ValidationError)
      })

      it('should include custom field name in error', () => {
        expect(() => service.assertAddresses([], 'Owner List')).toThrow('Owner List:')
      })
    })
  })
})
