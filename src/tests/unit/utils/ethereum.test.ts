import { describe, it, expect } from 'vitest'
import {
  checksumAddress,
  shortenAddress,
  formatEther,
  parseEther,
} from '../../../utils/ethereum.js'
import { TEST_ADDRESSES } from '../../fixtures/index.js'

describe('ethereum utils', () => {
  describe('checksumAddress', () => {
    it('should return checksummed address for lowercase input', () => {
      const result = checksumAddress(TEST_ADDRESSES.owner1.toLowerCase())
      expect(result).toBe(TEST_ADDRESSES.owner1)
    })

    it('should return checksummed address for valid checksummed input', () => {
      const result = checksumAddress(TEST_ADDRESSES.owner1)
      expect(result).toBe(TEST_ADDRESSES.owner1)
    })

    it('should checksum zero address', () => {
      const result = checksumAddress(TEST_ADDRESSES.zeroAddress)
      expect(result).toBe(TEST_ADDRESSES.zeroAddress)
    })

    it('should throw for invalid address', () => {
      expect(() => checksumAddress(TEST_ADDRESSES.invalidShort)).toThrow()
    })
  })

  describe('shortenAddress', () => {
    it('should shorten address with default 4 characters', () => {
      const result = shortenAddress(TEST_ADDRESSES.owner1)
      expect(result).toBe('0xf39F...2266')
    })

    it('should shorten address with custom character count', () => {
      const result = shortenAddress(TEST_ADDRESSES.owner1, 6)
      expect(result).toBe('0xf39Fd6...b92266')
    })

    it('should shorten address with 2 characters', () => {
      const result = shortenAddress(TEST_ADDRESSES.owner1, 2)
      expect(result).toBe('0xf3...66')
    })

    it('should handle lowercase address input', () => {
      const result = shortenAddress(TEST_ADDRESSES.owner1.toLowerCase())
      expect(result).toBe('0xf39F...2266')
    })

    it('should include ellipsis in result', () => {
      const result = shortenAddress(TEST_ADDRESSES.owner1)
      expect(result).toContain('...')
    })

    it('should preserve 0x prefix', () => {
      const result = shortenAddress(TEST_ADDRESSES.owner1)
      expect(result.startsWith('0x')).toBe(true)
    })

    it('should throw for invalid address', () => {
      expect(() => shortenAddress(TEST_ADDRESSES.invalidShort)).toThrow()
    })
  })

  describe('formatEther', () => {
    it('should format 1 ETH (18 decimals)', () => {
      const result = formatEther(BigInt('1000000000000000000'))
      expect(result).toBe('1.0000')
    })

    it('should format 0.5 ETH', () => {
      const result = formatEther(BigInt('500000000000000000'))
      expect(result).toBe('0.5000')
    })

    it('should format 0 ETH', () => {
      const result = formatEther(BigInt('0'))
      expect(result).toBe('0.0000')
    })

    it('should format large amounts', () => {
      const result = formatEther(BigInt('123456000000000000000'))
      expect(result).toBe('123.4560')
    })

    it('should respect custom decimals', () => {
      const result = formatEther(BigInt('1000000000000000000'), 2)
      expect(result).toBe('1.00')
    })

    it('should respect custom decimals (6)', () => {
      const result = formatEther(BigInt('1234567890000000000'), 6)
      expect(result).toBe('1.234568')
    })

    it('should format small amounts', () => {
      const result = formatEther(BigInt('1000000000000000'))
      expect(result).toBe('0.0010')
    })

    it('should handle very small amounts', () => {
      const result = formatEther(BigInt('1'))
      expect(result).toBe('0.0000')
    })

    it('should format fractional ETH', () => {
      const result = formatEther(BigInt('123456789012345678'))
      expect(result).toBe('0.1235')
    })
  })

  describe('parseEther', () => {
    it('should parse 1 ETH', () => {
      const result = parseEther('1')
      expect(result).toBe(BigInt('1000000000000000000'))
    })

    it('should parse 0.5 ETH', () => {
      const result = parseEther('0.5')
      expect(result).toBe(BigInt('500000000000000000'))
    })

    it('should parse 0 ETH', () => {
      const result = parseEther('0')
      expect(result).toBe(BigInt('0'))
    })

    it('should parse large amounts', () => {
      const result = parseEther('123.456')
      expect(result).toBe(BigInt('123456000000000000000'))
    })

    it('should parse integer without decimal', () => {
      const result = parseEther('10')
      expect(result).toBe(BigInt('10000000000000000000'))
    })

    it('should parse value with many decimal places', () => {
      const result = parseEther('1.123456789012345678')
      expect(result).toBe(BigInt('1123456789012345678'))
    })

    it('should truncate beyond 18 decimals', () => {
      const result = parseEther('1.123456789012345678999')
      expect(result).toBe(BigInt('1123456789012345678'))
    })

    it('should parse small amounts', () => {
      const result = parseEther('0.001')
      expect(result).toBe(BigInt('1000000000000000'))
    })

    it('should parse very small amounts', () => {
      const result = parseEther('0.000000000000000001')
      expect(result).toBe(BigInt('1'))
    })

    it('should handle empty string before decimal', () => {
      const result = parseEther('.5')
      expect(result).toBe(BigInt('500000000000000000'))
    })

    it('should handle trailing decimal point', () => {
      const result = parseEther('1.')
      expect(result).toBe(BigInt('1000000000000000000'))
    })
  })

  describe('formatEther and parseEther round-trip', () => {
    it('should round-trip 1 ETH', () => {
      const original = BigInt('1000000000000000000')
      const formatted = formatEther(original)
      const parsed = parseEther(formatted)
      expect(parsed).toBe(original)
    })

    it('should round-trip 0.5 ETH', () => {
      const original = BigInt('500000000000000000')
      const formatted = formatEther(original)
      const parsed = parseEther(formatted)
      expect(parsed).toBe(original)
    })

    it('should round-trip large amounts', () => {
      const original = BigInt('123456000000000000000')
      const formatted = formatEther(original)
      const parsed = parseEther(formatted)
      expect(parsed).toBe(original)
    })
  })
})
