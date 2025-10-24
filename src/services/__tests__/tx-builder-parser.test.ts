import { describe, it, expect } from 'vitest'
import { TxBuilderParser } from '../tx-builder-parser.js'
import type { TxBuilderFormat } from '../tx-builder-parser.js'

describe('TxBuilderParser', () => {
  const validTxBuilderData: TxBuilderFormat = {
    version: '1.0',
    chainId: '1',
    createdAt: 1761326849944,
    meta: {
      name: 'Test Batch',
      description: 'Test transaction batch',
      txBuilderVersion: '1.18.2',
      createdFromSafeAddress: '0xA77DE01e157f9f57C7c4A326eeE9C4874D0598b6',
      createdFromOwnerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
      checksum: '0x8b5032f716845c8b08bab3d63dbd9ba92e056f3557793cd041e59b84e16aa989',
    },
    transactions: [
      {
        to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        value: '0',
        data: null,
        contractMethod: {
          inputs: [
            {
              internalType: 'address',
              name: 'spender',
              type: 'address',
            },
            {
              internalType: 'uint256',
              name: 'value',
              type: 'uint256',
            },
          ],
          name: 'approve',
          payable: false,
        },
        contractInputsValues: {
          spender: '0x474e5Ded6b5D078163BFB8F6dBa355C3aA5478C8',
          value: '100000000000',
        },
      },
    ],
  }

  describe('isTxBuilderFormat', () => {
    it('should return true for valid Transaction Builder format', () => {
      expect(TxBuilderParser.isTxBuilderFormat(validTxBuilderData)).toBe(true)
    })

    it('should return false for CLI format', () => {
      const cliFormat = {
        safeTxHash: '0xabc123',
        chainId: '1',
        safeAddress: '0x1234567890123456789012345678901234567890',
        metadata: {
          to: '0x9876543210987654321098765432109876543210',
          value: '1000',
          data: '0x',
        },
      }
      expect(TxBuilderParser.isTxBuilderFormat(cliFormat)).toBe(false)
    })

    it('should return false for invalid data', () => {
      expect(TxBuilderParser.isTxBuilderFormat(null)).toBeFalsy()
      expect(TxBuilderParser.isTxBuilderFormat(undefined)).toBeFalsy()
      expect(TxBuilderParser.isTxBuilderFormat('invalid')).toBe(false)
      expect(TxBuilderParser.isTxBuilderFormat({})).toBe(false)
    })
  })

  describe('validate', () => {
    it('should validate correct Transaction Builder format', () => {
      expect(() => TxBuilderParser.validate(validTxBuilderData)).not.toThrow()
    })

    it('should throw for missing required fields', () => {
      const invalidData = { ...validTxBuilderData }
      delete (invalidData as any).version
      expect(() => TxBuilderParser.validate(invalidData)).toThrow('Invalid Transaction Builder format')
    })

    it('should throw for missing Safe address', () => {
      const invalidData = {
        ...validTxBuilderData,
        meta: { ...validTxBuilderData.meta, createdFromSafeAddress: undefined as any },
      }
      expect(() => TxBuilderParser.validate(invalidData)).toThrow('missing Safe address')
    })

    it('should throw for empty transactions array', () => {
      const invalidData = { ...validTxBuilderData, transactions: [] }
      expect(() => TxBuilderParser.validate(invalidData)).toThrow('no transactions found')
    })

    it('should throw for transaction without to address', () => {
      const invalidData = {
        ...validTxBuilderData,
        transactions: [{ ...validTxBuilderData.transactions[0], to: undefined as any }],
      }
      expect(() => TxBuilderParser.validate(invalidData)).toThrow("missing 'to' address")
    })

    it('should throw for transaction without data or contractMethod', () => {
      const invalidData = {
        ...validTxBuilderData,
        transactions: [
          {
            to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            value: '0',
          } as any,
        ],
      }
      expect(() => TxBuilderParser.validate(invalidData)).toThrow(
        "missing both 'data' and 'contractMethod'"
      )
    })
  })

  describe('parseTransaction', () => {
    it('should parse transaction with contractMethod', () => {
      const tx = validTxBuilderData.transactions[0]
      const parsed = TxBuilderParser.parseTransaction(tx)

      expect(parsed.to).toBe(tx.to)
      expect(parsed.value).toBe('0')
      expect(parsed.operation).toBe(0)
      expect(parsed.data).toMatch(/^0x[0-9a-f]+$/)
      expect(parsed.data).not.toBe('0x')
    })

    it('should parse transaction with direct data', () => {
      const tx = {
        to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        value: '1000',
        data: '0x1234abcd',
      }
      const parsed = TxBuilderParser.parseTransaction(tx as any)

      expect(parsed.to).toBe(tx.to)
      expect(parsed.value).toBe('1000')
      expect(parsed.data).toBe('0x1234abcd')
      expect(parsed.operation).toBe(0)
    })

    it('should parse transaction with data without 0x prefix', () => {
      const tx = {
        to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        value: '0',
        data: '1234abcd',
      }
      const parsed = TxBuilderParser.parseTransaction(tx as any)

      expect(parsed.data).toBe('0x1234abcd')
    })

    it('should use empty data when neither data nor contractMethod provided', () => {
      const tx = {
        to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        value: '0',
      }
      const parsed = TxBuilderParser.parseTransaction(tx as any)

      expect(parsed.data).toBe('0x')
    })
  })

  describe('parse', () => {
    it('should parse complete Transaction Builder format', () => {
      const parsed = TxBuilderParser.parse(validTxBuilderData)

      expect(parsed.chainId).toBe('1')
      expect(parsed.safeAddress).toBe('0xA77DE01e157f9f57C7c4A326eeE9C4874D0598b6')
      expect(parsed.createdBy).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2')
      expect(parsed.createdAt).toBeInstanceOf(Date)
      expect(parsed.transactions).toHaveLength(1)
      expect(parsed.meta.name).toBe('Test Batch')
      expect(parsed.meta.description).toBe('Test transaction batch')
      expect(parsed.meta.version).toBe('1.0')
    })

    it('should handle missing optional fields', () => {
      const minimalData = {
        version: '1.0',
        chainId: '1',
        createdAt: Date.now(),
        meta: {
          createdFromSafeAddress: '0xA77DE01e157f9f57C7c4A326eeE9C4874D0598b6',
        },
        transactions: [
          {
            to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            value: '0',
            data: '0x',
          },
        ],
      }

      const parsed = TxBuilderParser.parse(minimalData as any)

      expect(parsed.createdBy).toBeUndefined()
      expect(parsed.meta.name).toBeUndefined()
      expect(parsed.meta.description).toBeUndefined()
    })

    it('should parse multiple transactions', () => {
      const multiTxData = {
        ...validTxBuilderData,
        transactions: [
          validTxBuilderData.transactions[0],
          {
            to: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            value: '0',
            data: '0xabcdef',
          },
        ],
      }

      const parsed = TxBuilderParser.parse(multiTxData as any)

      expect(parsed.transactions).toHaveLength(2)
      expect(parsed.transactions[0].to).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
      expect(parsed.transactions[1].to).toBe('0x6B175474E89094C44Da98b954EedeAC495271d0F')
    })
  })

  describe('encodeContractMethod', () => {
    it('should encode simple function with address and uint256', () => {
      const tx = validTxBuilderData.transactions[0]
      const parsed = TxBuilderParser.parseTransaction(tx)

      // The encoded data should be the approve function selector + encoded parameters
      expect(parsed.data).toMatch(/^0x095ea7b3/) // approve(address,uint256) selector
    })

    it('should handle different parameter types', () => {
      const tx = {
        to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        value: '0',
        contractMethod: {
          inputs: [
            { name: 'enabled', type: 'bool', internalType: 'bool' },
            { name: 'amount', type: 'uint256', internalType: 'uint256' },
            { name: 'data', type: 'bytes', internalType: 'bytes' },
          ],
          name: 'setConfig',
          payable: false,
        },
        contractInputsValues: {
          enabled: true,
          amount: '1000',
          data: '0x1234',
        },
      }

      const parsed = TxBuilderParser.parseTransaction(tx as any)
      expect(parsed.data).toMatch(/^0x[0-9a-f]+$/)
      expect(parsed.data.length).toBeGreaterThan(10)
    })

    it('should throw for missing parameter values', () => {
      const tx = {
        to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        value: '0',
        contractMethod: {
          inputs: [{ name: 'spender', type: 'address', internalType: 'address' }],
          name: 'approve',
          payable: false,
        },
        contractInputsValues: {}, // Missing spender value
      }

      expect(() => TxBuilderParser.parseTransaction(tx as any)).toThrow('Missing value for parameter')
    })
  })
})
