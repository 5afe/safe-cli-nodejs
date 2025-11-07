import { describe, it, expect } from 'vitest'
import {
  parseOwnersArgument,
  parseJsonArgument,
  parseAddressArgument,
  parseFunctionCall,
  parseNumericArgument,
  parseChainArgument,
} from '../../../utils/argument-parser.js'
import { TEST_ADDRESSES } from '../../fixtures/index.js'
import { writeFileSync, unlinkSync } from 'fs'
import { resolve } from 'path'

describe('argument-parser', () => {
  describe('parseOwnersArgument', () => {
    it('should parse JSON array of addresses', () => {
      const input = `["${TEST_ADDRESSES.owner1}", "${TEST_ADDRESSES.owner2}"]`
      const result = parseOwnersArgument(input)
      expect(result).toEqual([TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2])
    })

    it('should parse comma-separated addresses', () => {
      const input = `${TEST_ADDRESSES.owner1},${TEST_ADDRESSES.owner2}`
      const result = parseOwnersArgument(input)
      expect(result).toEqual([TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2])
    })

    it('should parse comma-separated addresses with spaces', () => {
      const input = `${TEST_ADDRESSES.owner1} , ${TEST_ADDRESSES.owner2}`
      const result = parseOwnersArgument(input)
      expect(result).toEqual([TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2])
    })

    it('should throw on invalid JSON', () => {
      expect(() => parseOwnersArgument('[invalid json')).toThrow('Invalid JSON array')
    })

    it('should throw on non-array JSON', () => {
      expect(() => parseOwnersArgument('{"not": "array"}')).toThrow('Invalid address')
    })

    it('should throw on invalid address in JSON array', () => {
      expect(() => parseOwnersArgument('["0xinvalid"]')).toThrow('Invalid address')
    })

    it('should throw on invalid address in comma-separated list', () => {
      expect(() => parseOwnersArgument('0xinvalid,0xalsobad')).toThrow('Invalid address')
    })

    it('should throw on empty string', () => {
      expect(() => parseOwnersArgument('')).toThrow('No owners provided')
    })

    it('should filter out empty addresses from comma-separated list', () => {
      const input = `${TEST_ADDRESSES.owner1},,${TEST_ADDRESSES.owner2}`
      const result = parseOwnersArgument(input)
      expect(result).toEqual([TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2])
    })
  })

  describe('parseJsonArgument', () => {
    it('should parse JSON string', () => {
      const input = '{"key": "value", "number": 42}'
      const result = parseJsonArgument(input)
      expect(result).toEqual({ key: 'value', number: 42 })
    })

    it('should parse JSON array', () => {
      const input = '[1, 2, 3]'
      const result = parseJsonArgument(input)
      expect(result).toEqual([1, 2, 3])
    })

    it('should throw on invalid JSON', () => {
      expect(() => parseJsonArgument('{invalid}')).toThrow('Invalid JSON')
    })

    it('should read JSON from file with @ prefix', () => {
      const testFile = resolve('/tmp/test-json.json')
      const testData = { test: 'data', value: 123 }
      writeFileSync(testFile, JSON.stringify(testData))

      try {
        const result = parseJsonArgument(`@${testFile}`)
        expect(result).toEqual(testData)
      } finally {
        unlinkSync(testFile)
      }
    })

    it('should throw on non-existent file', () => {
      expect(() => parseJsonArgument('@/nonexistent/file.json')).toThrow('Failed to read JSON')
    })

    it('should throw on invalid JSON in file', () => {
      const testFile = resolve('/tmp/test-invalid.json')
      writeFileSync(testFile, '{invalid json}')

      try {
        expect(() => parseJsonArgument(`@${testFile}`)).toThrow('Failed to read JSON')
      } finally {
        unlinkSync(testFile)
      }
    })
  })

  describe('parseAddressArgument', () => {
    it('should parse plain address', () => {
      const result = parseAddressArgument(TEST_ADDRESSES.owner1)
      expect(result).toEqual({
        address: TEST_ADDRESSES.owner1,
      })
    })

    it('should parse EIP-3770 format address', () => {
      const input = `eth:${TEST_ADDRESSES.owner1}`
      const result = parseAddressArgument(input)
      expect(result).toEqual({
        shortName: 'eth',
        address: TEST_ADDRESSES.owner1,
      })
    })

    it('should parse EIP-3770 format with spaces', () => {
      const input = `eth :${TEST_ADDRESSES.owner1}`
      const result = parseAddressArgument(input)
      expect(result).toEqual({
        shortName: 'eth',
        address: TEST_ADDRESSES.owner1,
      })
    })

    it('should throw on invalid plain address', () => {
      expect(() => parseAddressArgument('0xinvalid')).toThrow('Invalid address')
    })

    it('should throw on invalid EIP-3770 address', () => {
      expect(() => parseAddressArgument('eth:0xinvalid')).toThrow('Invalid address')
    })
  })

  describe('parseFunctionCall', () => {
    it('should parse function signature with arguments', () => {
      const signature = 'transfer(address,uint256)'
      const args = '["0x1234567890123456789012345678901234567890", "1000000000000000000"]'
      const result = parseFunctionCall(signature, args)
      expect(result).toEqual({
        signature,
        args: ['0x1234567890123456789012345678901234567890', '1000000000000000000'],
      })
    })

    it('should parse function signature without arguments', () => {
      const signature = 'balanceOf(address)'
      const result = parseFunctionCall(signature)
      expect(result).toEqual({
        signature,
        args: [],
      })
    })

    it('should parse function signature with empty args string', () => {
      const signature = 'transfer(address,uint256)'
      const result = parseFunctionCall(signature, undefined)
      expect(result).toEqual({
        signature,
        args: [],
      })
    })

    it('should throw on invalid JSON args', () => {
      const signature = 'transfer(address,uint256)'
      expect(() => parseFunctionCall(signature, '{invalid}')).toThrow('Invalid function arguments')
    })

    it('should throw on non-array args', () => {
      const signature = 'transfer(address,uint256)'
      expect(() => parseFunctionCall(signature, '{"not": "array"}')).toThrow(
        'Function arguments must be an array'
      )
    })
  })

  describe('parseNumericArgument', () => {
    it('should parse integer string', () => {
      const result = parseNumericArgument('1234567890')
      expect(result).toBe(1234567890n)
    })

    it('should parse zero', () => {
      const result = parseNumericArgument('0')
      expect(result).toBe(0n)
    })

    it('should parse large number', () => {
      const result = parseNumericArgument('1000000000000000000')
      expect(result).toBe(1000000000000000000n)
    })

    it('should throw on decimal when not allowed', () => {
      expect(() => parseNumericArgument('123.45', false)).toThrow('Decimal values not allowed')
    })

    it('should parse decimal when allowed', () => {
      const result = parseNumericArgument('123.45', true)
      expect(result).toBe(123450000000000000000n)
    })

    it('should parse decimal with trailing zeros', () => {
      const result = parseNumericArgument('1.5', true)
      expect(result).toBe(1500000000000000000n)
    })

    it('should handle decimal with many digits', () => {
      const result = parseNumericArgument('1.123456789012345678', true)
      expect(result).toBe(1123456789012345678n)
    })

    it('should truncate decimals beyond 18 digits', () => {
      const result = parseNumericArgument('1.123456789012345678999', true)
      expect(result).toBe(1123456789012345678n)
    })

    it('should throw on invalid numeric value', () => {
      expect(() => parseNumericArgument('abc')).toThrow('Invalid numeric value')
    })

    it('should handle whitespace', () => {
      const result = parseNumericArgument('  123  ')
      expect(result).toBe(123n)
    })
  })

  describe('parseChainArgument', () => {
    it('should parse numeric chain ID', () => {
      const result = parseChainArgument('1')
      expect(result).toBe('1')
    })

    it('should parse large numeric chain ID', () => {
      const result = parseChainArgument('11155111')
      expect(result).toBe('11155111')
    })

    it('should pass through chain short name', () => {
      const result = parseChainArgument('eth')
      expect(result).toBe('eth')
    })

    it('should pass through chain short name with hyphen', () => {
      const result = parseChainArgument('arbitrum-one')
      expect(result).toBe('arbitrum-one')
    })

    it('should pass through alphanumeric short names', () => {
      const result = parseChainArgument('base2')
      expect(result).toBe('base2')
    })
  })
})
