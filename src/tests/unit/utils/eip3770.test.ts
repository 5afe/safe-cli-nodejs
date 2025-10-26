import { describe, it, expect } from 'vitest'
import {
  formatEIP3770,
  parseEIP3770,
  isEIP3770,
  getShortNameFromChainId,
  getChainIdFromShortName,
  getChainByShortName,
  formatSafeAddress,
  parseSafeAddress,
} from '../../../utils/eip3770.js'
import { TEST_ADDRESSES, TEST_CHAINS } from '../../fixtures/index.js'
import { SafeCLIError } from '../../../utils/errors.js'
import type { ChainConfig } from '../../../types/config.js'

// Transform TEST_CHAINS to be keyed by chainId as expected by the eip3770 functions
const CHAINS_BY_ID: Record<string, ChainConfig> = Object.values(TEST_CHAINS).reduce(
  (acc, chain) => {
    acc[chain.chainId] = chain
    return acc
  },
  {} as Record<string, ChainConfig>
)

describe('eip3770 utils', () => {
  describe('formatEIP3770', () => {
    it('should format address with shortName', () => {
      const result = formatEIP3770('eth', TEST_ADDRESSES.owner1)
      expect(result).toBe(`eth:${TEST_ADDRESSES.owner1}`)
    })

    it('should format address with different shortName', () => {
      const result = formatEIP3770('matic', TEST_ADDRESSES.safe1)
      expect(result).toBe(`matic:${TEST_ADDRESSES.safe1}`)
    })

    it('should preserve address checksum', () => {
      const result = formatEIP3770('arb1', TEST_ADDRESSES.owner2)
      expect(result).toBe(`arb1:${TEST_ADDRESSES.owner2}`)
      expect(result.split(':')[1]).toBe(TEST_ADDRESSES.owner2)
    })
  })

  describe('parseEIP3770', () => {
    it('should parse valid EIP-3770 address', () => {
      const input = `eth:${TEST_ADDRESSES.owner1}`
      const result = parseEIP3770(input)
      expect(result).toEqual({
        shortName: 'eth',
        address: TEST_ADDRESSES.owner1,
      })
    })

    it('should parse address with different shortName', () => {
      const input = `matic:${TEST_ADDRESSES.safe1}`
      const result = parseEIP3770(input)
      expect(result).toEqual({
        shortName: 'matic',
        address: TEST_ADDRESSES.safe1,
      })
    })

    it('should parse lowercase address and preserve it', () => {
      const lowercase = TEST_ADDRESSES.owner1.toLowerCase()
      const input = `eth:${lowercase}`
      const result = parseEIP3770(input)
      expect(result.shortName).toBe('eth')
      expect(result.address.toLowerCase()).toBe(lowercase)
    })

    it('should throw for missing colon', () => {
      expect(() => parseEIP3770(TEST_ADDRESSES.owner1)).toThrow(SafeCLIError)
      expect(() => parseEIP3770(TEST_ADDRESSES.owner1)).toThrow('Invalid EIP-3770 address format')
    })

    it('should throw for multiple colons', () => {
      const input = `eth:matic:${TEST_ADDRESSES.owner1}`
      expect(() => parseEIP3770(input)).toThrow(SafeCLIError)
      expect(() => parseEIP3770(input)).toThrow('Invalid EIP-3770 address format')
    })

    it('should throw for empty shortName', () => {
      const input = `:${TEST_ADDRESSES.owner1}`
      expect(() => parseEIP3770(input)).toThrow(SafeCLIError)
      expect(() => parseEIP3770(input)).toThrow('shortName cannot be empty')
    })

    it('should throw for whitespace-only shortName', () => {
      const input = `   :${TEST_ADDRESSES.owner1}`
      expect(() => parseEIP3770(input)).toThrow(SafeCLIError)
      expect(() => parseEIP3770(input)).toThrow('shortName cannot be empty')
    })

    it('should throw for invalid address', () => {
      const input = 'eth:0xinvalid'
      expect(() => parseEIP3770(input)).toThrow(SafeCLIError)
      expect(() => parseEIP3770(input)).toThrow('not a valid Ethereum address')
    })

    it('should throw for empty address', () => {
      const input = 'eth:'
      expect(() => parseEIP3770(input)).toThrow(SafeCLIError)
      expect(() => parseEIP3770(input)).toThrow('not a valid Ethereum address')
    })
  })

  describe('isEIP3770', () => {
    it('should return true for valid EIP-3770 format', () => {
      const input = `eth:${TEST_ADDRESSES.owner1}`
      expect(isEIP3770(input)).toBe(true)
    })

    it('should return true for different shortNames', () => {
      expect(isEIP3770(`matic:${TEST_ADDRESSES.safe1}`)).toBe(true)
      expect(isEIP3770(`arb1:${TEST_ADDRESSES.owner2}`)).toBe(true)
    })

    it('should return false for plain address', () => {
      expect(isEIP3770(TEST_ADDRESSES.owner1)).toBe(false)
    })

    it('should return false for invalid format (multiple colons)', () => {
      const input = `eth:matic:${TEST_ADDRESSES.owner1}`
      expect(isEIP3770(input)).toBe(false)
    })

    it('should return false for empty shortName', () => {
      const input = `:${TEST_ADDRESSES.owner1}`
      expect(isEIP3770(input)).toBe(false)
    })

    it('should return false for invalid address', () => {
      expect(isEIP3770('eth:0xinvalid')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isEIP3770('')).toBe(false)
    })
  })

  describe('getShortNameFromChainId', () => {
    it('should return shortName for Ethereum mainnet', () => {
      const result = getShortNameFromChainId('1', CHAINS_BY_ID)
      expect(result).toBe('eth')
    })

    it('should return shortName for Sepolia', () => {
      const result = getShortNameFromChainId('11155111', CHAINS_BY_ID)
      expect(result).toBe('sep')
    })

    it('should return shortName for Polygon', () => {
      const result = getShortNameFromChainId('137', CHAINS_BY_ID)
      expect(result).toBe('matic')
    })

    it('should return shortName for Arbitrum', () => {
      const result = getShortNameFromChainId('42161', CHAINS_BY_ID)
      expect(result).toBe('arb1')
    })

    it('should throw for unknown chainId', () => {
      expect(() => getShortNameFromChainId('999999', CHAINS_BY_ID)).toThrow(SafeCLIError)
      expect(() => getShortNameFromChainId('999999', CHAINS_BY_ID)).toThrow(
        'Chain with ID 999999 not found in configuration'
      )
    })

    it('should throw for empty chainId', () => {
      expect(() => getShortNameFromChainId('', CHAINS_BY_ID)).toThrow(SafeCLIError)
    })
  })

  describe('getChainIdFromShortName', () => {
    it('should return chainId for eth', () => {
      const result = getChainIdFromShortName('eth', CHAINS_BY_ID)
      expect(result).toBe('1')
    })

    it('should return chainId for sep', () => {
      const result = getChainIdFromShortName('sep', CHAINS_BY_ID)
      expect(result).toBe('11155111')
    })

    it('should return chainId for matic', () => {
      const result = getChainIdFromShortName('matic', CHAINS_BY_ID)
      expect(result).toBe('137')
    })

    it('should return chainId for arb1', () => {
      const result = getChainIdFromShortName('arb1', CHAINS_BY_ID)
      expect(result).toBe('42161')
    })

    it('should throw for unknown shortName', () => {
      expect(() => getChainIdFromShortName('unknown', CHAINS_BY_ID)).toThrow(SafeCLIError)
      expect(() => getChainIdFromShortName('unknown', CHAINS_BY_ID)).toThrow(
        'Chain with shortName "unknown" not found in configuration'
      )
    })

    it('should throw for empty shortName', () => {
      expect(() => getChainIdFromShortName('', CHAINS_BY_ID)).toThrow(SafeCLIError)
    })

    it('should be case-sensitive', () => {
      expect(() => getChainIdFromShortName('ETH', CHAINS_BY_ID)).toThrow(SafeCLIError)
      expect(() => getChainIdFromShortName('Eth', CHAINS_BY_ID)).toThrow(SafeCLIError)
    })
  })

  describe('getChainByShortName', () => {
    it('should return chain config for eth', () => {
      const result = getChainByShortName('eth', CHAINS_BY_ID)
      expect(result).toEqual(TEST_CHAINS.ethereum)
      expect(result.chainId).toBe('1')
      expect(result.shortName).toBe('eth')
    })

    it('should return chain config for sep', () => {
      const result = getChainByShortName('sep', CHAINS_BY_ID)
      expect(result).toEqual(TEST_CHAINS.sepolia)
      expect(result.chainId).toBe('11155111')
    })

    it('should return chain config for matic', () => {
      const result = getChainByShortName('matic', CHAINS_BY_ID)
      expect(result).toEqual(TEST_CHAINS.polygon)
      expect(result.chainId).toBe('137')
    })

    it('should return full chain config with all properties', () => {
      const result = getChainByShortName('eth', CHAINS_BY_ID)
      expect(result).toHaveProperty('chainId')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('shortName')
      expect(result).toHaveProperty('rpcUrl')
      expect(result).toHaveProperty('currency')
    })

    it('should throw for unknown shortName', () => {
      expect(() => getChainByShortName('unknown', CHAINS_BY_ID)).toThrow(SafeCLIError)
      expect(() => getChainByShortName('unknown', CHAINS_BY_ID)).toThrow(
        'Chain with shortName "unknown" not found in configuration'
      )
    })

    it('should throw for empty shortName', () => {
      expect(() => getChainByShortName('', CHAINS_BY_ID)).toThrow(SafeCLIError)
    })
  })

  describe('formatSafeAddress', () => {
    it('should format Safe address with chain shortName', () => {
      const result = formatSafeAddress(TEST_ADDRESSES.safe1, '1', CHAINS_BY_ID)
      expect(result).toBe(`eth:${TEST_ADDRESSES.safe1}`)
    })

    it('should format address for Sepolia', () => {
      const result = formatSafeAddress(TEST_ADDRESSES.safe1, '11155111', CHAINS_BY_ID)
      expect(result).toBe(`sep:${TEST_ADDRESSES.safe1}`)
    })

    it('should format address for Polygon', () => {
      const result = formatSafeAddress(TEST_ADDRESSES.safe1, '137', CHAINS_BY_ID)
      expect(result).toBe(`matic:${TEST_ADDRESSES.safe1}`)
    })

    it('should throw for unknown chainId', () => {
      expect(() => formatSafeAddress(TEST_ADDRESSES.safe1, '999999', CHAINS_BY_ID)).toThrow(
        SafeCLIError
      )
    })
  })

  describe('parseSafeAddress', () => {
    describe('EIP-3770 format', () => {
      it('should parse EIP-3770 address and return chainId', () => {
        const input = `eth:${TEST_ADDRESSES.safe1}`
        const result = parseSafeAddress(input, CHAINS_BY_ID)
        expect(result).toEqual({
          chainId: '1',
          address: TEST_ADDRESSES.safe1,
        })
      })

      it('should parse Sepolia EIP-3770 address', () => {
        const input = `sep:${TEST_ADDRESSES.safe1}`
        const result = parseSafeAddress(input, CHAINS_BY_ID)
        expect(result).toEqual({
          chainId: '11155111',
          address: TEST_ADDRESSES.safe1,
        })
      })

      it('should parse Polygon EIP-3770 address', () => {
        const input = `matic:${TEST_ADDRESSES.safe1}`
        const result = parseSafeAddress(input, CHAINS_BY_ID)
        expect(result).toEqual({
          chainId: '137',
          address: TEST_ADDRESSES.safe1,
        })
      })

      it('should work without defaultChainId for EIP-3770', () => {
        const input = `eth:${TEST_ADDRESSES.safe1}`
        const result = parseSafeAddress(input, CHAINS_BY_ID)
        expect(result.chainId).toBe('1')
      })

      it('should throw for unknown shortName in EIP-3770', () => {
        const input = `unknown:${TEST_ADDRESSES.safe1}`
        expect(() => parseSafeAddress(input, CHAINS_BY_ID)).toThrow(SafeCLIError)
        expect(() => parseSafeAddress(input, CHAINS_BY_ID)).toThrow('shortName "unknown" not found')
      })

      it('should throw for invalid address in EIP-3770', () => {
        const input = 'eth:0xinvalid'
        expect(() => parseSafeAddress(input, CHAINS_BY_ID)).toThrow(SafeCLIError)
      })
    })

    describe('plain address format', () => {
      it('should parse plain address with defaultChainId', () => {
        const result = parseSafeAddress(TEST_ADDRESSES.safe1, CHAINS_BY_ID, '1')
        expect(result).toEqual({
          chainId: '1',
          address: TEST_ADDRESSES.safe1,
        })
      })

      it('should parse plain address with different defaultChainId', () => {
        const result = parseSafeAddress(TEST_ADDRESSES.safe1, CHAINS_BY_ID, '11155111')
        expect(result).toEqual({
          chainId: '11155111',
          address: TEST_ADDRESSES.safe1,
        })
      })

      it('should throw for plain address without defaultChainId', () => {
        expect(() => parseSafeAddress(TEST_ADDRESSES.safe1, CHAINS_BY_ID)).toThrow(SafeCLIError)
        expect(() => parseSafeAddress(TEST_ADDRESSES.safe1, CHAINS_BY_ID)).toThrow(
          'Plain address provided without chain context'
        )
      })

      it('should throw for invalid plain address', () => {
        expect(() => parseSafeAddress('0xinvalid', CHAINS_BY_ID, '1')).toThrow(SafeCLIError)
        expect(() => parseSafeAddress('0xinvalid', CHAINS_BY_ID, '1')).toThrow('Invalid address')
      })

      it('should throw for empty address', () => {
        expect(() => parseSafeAddress('', CHAINS_BY_ID, '1')).toThrow(SafeCLIError)
      })
    })

    describe('edge cases', () => {
      it('should prefer EIP-3770 format over defaultChainId', () => {
        // If input has colon, it's treated as EIP-3770 even with defaultChainId
        const input = `sep:${TEST_ADDRESSES.safe1}`
        const result = parseSafeAddress(input, CHAINS_BY_ID, '1')
        expect(result.chainId).toBe('11155111') // sep, not eth (1)
      })

      it('should handle lowercase address in plain format', () => {
        const lowercase = TEST_ADDRESSES.safe1.toLowerCase()
        const result = parseSafeAddress(lowercase, CHAINS_BY_ID, '1')
        expect(result.chainId).toBe('1')
        expect(result.address.toLowerCase()).toBe(lowercase)
      })
    })
  })
})
