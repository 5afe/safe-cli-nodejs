import { describe, it, expect, vi } from 'vitest'
import { TxBuilderParser } from '../../../services/tx-builder-parser.js'
import type { TxBuilderFormat, TxBuilderTransaction } from '../../../services/tx-builder-parser.js'
import { SafeCLIError } from '../../../utils/errors.js'
import type { Address } from 'viem'
import { TEST_ADDRESSES } from '../../fixtures/index.js'

// Mock viem
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    encodeFunctionData: vi.fn(() => '0x1234abcd'),
  }
})

describe('TxBuilderParser', () => {
  const validTxBuilderData: TxBuilderFormat = {
    version: '1.0',
    chainId: '1',
    createdAt: Date.now(),
    meta: {
      name: 'Test Batch',
      description: 'Test description',
      txBuilderVersion: '1.0.0',
      createdFromSafeAddress: TEST_ADDRESSES.safe1,
      createdFromOwnerAddress: TEST_ADDRESSES.owner1,
    },
    transactions: [
      {
        to: TEST_ADDRESSES.owner2,
        value: '1000000000000000000', // 1 ETH
        data: '0x',
      },
    ],
  }

  describe('isTxBuilderFormat', () => {
    it('should return true for valid Transaction Builder format', () => {
      expect(TxBuilderParser.isTxBuilderFormat(validTxBuilderData)).toBe(true)
    })

    it('should return false for null', () => {
      expect(TxBuilderParser.isTxBuilderFormat(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(TxBuilderParser.isTxBuilderFormat(undefined)).toBe(false)
    })

    it('should return false for string', () => {
      expect(TxBuilderParser.isTxBuilderFormat('not an object')).toBe(false)
    })

    it('should return false for missing version', () => {
      const data = { ...validTxBuilderData }
      delete (data as any).version
      expect(TxBuilderParser.isTxBuilderFormat(data)).toBe(false)
    })

    it('should return false for missing chainId', () => {
      const data = { ...validTxBuilderData }
      delete (data as any).chainId
      expect(TxBuilderParser.isTxBuilderFormat(data)).toBe(false)
    })

    it('should return false for missing meta', () => {
      const data = { ...validTxBuilderData }
      delete (data as any).meta
      expect(TxBuilderParser.isTxBuilderFormat(data)).toBe(false)
    })

    it('should return false for null meta', () => {
      const data = { ...validTxBuilderData, meta: null }
      expect(TxBuilderParser.isTxBuilderFormat(data)).toBe(false)
    })

    it('should return false for missing transactions', () => {
      const data = { ...validTxBuilderData }
      delete (data as any).transactions
      expect(TxBuilderParser.isTxBuilderFormat(data)).toBe(false)
    })

    it('should return false for non-array transactions', () => {
      const data = { ...validTxBuilderData, transactions: 'not an array' }
      expect(TxBuilderParser.isTxBuilderFormat(data)).toBe(false)
    })

    it('should return false for missing createdFromSafeAddress in meta', () => {
      const data = {
        ...validTxBuilderData,
        meta: { name: 'Test' },
      }
      expect(TxBuilderParser.isTxBuilderFormat(data)).toBe(false)
    })
  })

  describe('validate', () => {
    it('should not throw for valid data', () => {
      expect(() => TxBuilderParser.validate(validTxBuilderData)).not.toThrow()
    })

    it('should throw for invalid format', () => {
      expect(() => TxBuilderParser.validate({})).toThrow(SafeCLIError)
      expect(() => TxBuilderParser.validate({})).toThrow('missing required fields')
    })

    it('should throw for missing Safe address', () => {
      const data = {
        ...validTxBuilderData,
        meta: { ...validTxBuilderData.meta, createdFromSafeAddress: '' as Address },
      }
      expect(() => TxBuilderParser.validate(data)).toThrow(SafeCLIError)
      expect(() => TxBuilderParser.validate(data)).toThrow('missing Safe address')
    })

    it('should throw for empty transactions array', () => {
      const data = {
        ...validTxBuilderData,
        transactions: [],
      }
      expect(() => TxBuilderParser.validate(data)).toThrow(SafeCLIError)
      expect(() => TxBuilderParser.validate(data)).toThrow('no transactions found')
    })

    it('should throw for transaction missing to address', () => {
      const data = {
        ...validTxBuilderData,
        transactions: [{ value: '0' } as any],
      }
      expect(() => TxBuilderParser.validate(data)).toThrow(SafeCLIError)
      expect(() => TxBuilderParser.validate(data)).toThrow("missing 'to' address")
    })

    it('should throw for transaction missing both data and contractMethod', () => {
      const data = {
        ...validTxBuilderData,
        transactions: [{ to: TEST_ADDRESSES.owner1, value: '0' }],
      }
      expect(() => TxBuilderParser.validate(data)).toThrow(SafeCLIError)
      expect(() => TxBuilderParser.validate(data)).toThrow(
        "missing both 'data' and 'contractMethod'"
      )
    })

    it('should not throw for transaction with data', () => {
      const data = {
        ...validTxBuilderData,
        transactions: [{ to: TEST_ADDRESSES.owner1, value: '0', data: '0x' }],
      }
      expect(() => TxBuilderParser.validate(data)).not.toThrow()
    })

    it('should not throw for transaction with contractMethod', () => {
      const data = {
        ...validTxBuilderData,
        transactions: [
          {
            to: TEST_ADDRESSES.owner1,
            value: '0',
            contractMethod: {
              name: 'transfer',
              inputs: [],
              payable: false,
            },
            contractInputsValues: {},
          },
        ],
      }
      expect(() => TxBuilderParser.validate(data)).not.toThrow()
    })
  })

  describe('parseTransaction', () => {
    it('should parse transaction with direct data', () => {
      const tx: TxBuilderTransaction = {
        to: TEST_ADDRESSES.owner1,
        value: '1000000000000000000',
        data: '0xabcdef',
      }

      const result = TxBuilderParser.parseTransaction(tx)

      expect(result.to).toBe(TEST_ADDRESSES.owner1)
      expect(result.value).toBe('1000000000000000000')
      expect(result.data).toBe('0xabcdef')
      expect(result.operation).toBe(0)
    })

    it('should add 0x prefix to data without it', () => {
      const tx: TxBuilderTransaction = {
        to: TEST_ADDRESSES.owner1,
        value: '0',
        data: 'abcdef',
      }

      const result = TxBuilderParser.parseTransaction(tx)

      expect(result.data).toBe('0xabcdef')
    })

    it('should handle null data', () => {
      const tx: TxBuilderTransaction = {
        to: TEST_ADDRESSES.owner1,
        value: '0',
        data: null,
      }

      const result = TxBuilderParser.parseTransaction(tx)

      expect(result.data).toBe('0x')
    })

    it('should default value to 0 if not provided', () => {
      const tx: TxBuilderTransaction = {
        to: TEST_ADDRESSES.owner1,
        value: '',
        data: '0x',
      }

      const result = TxBuilderParser.parseTransaction(tx)

      expect(result.value).toBe('0')
    })

    it('should encode contractMethod if provided', () => {
      const tx: TxBuilderTransaction = {
        to: TEST_ADDRESSES.owner1,
        value: '0',
        contractMethod: {
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address', internalType: 'address' },
            { name: 'amount', type: 'uint256', internalType: 'uint256' },
          ],
          payable: false,
        },
        contractInputsValues: {
          to: TEST_ADDRESSES.owner2,
          amount: '1000',
        },
      }

      const result = TxBuilderParser.parseTransaction(tx)

      expect(result.data).toBe('0x1234abcd')
    })

    it('should default to empty data if no data or contractMethod', () => {
      const tx: TxBuilderTransaction = {
        to: TEST_ADDRESSES.owner1,
        value: '0',
      }

      const result = TxBuilderParser.parseTransaction(tx)

      expect(result.data).toBe('0x')
    })
  })

  describe('parseValue (private method via parseTransaction)', () => {
    describe('address type', () => {
      it('should accept valid address', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'addr', type: 'address', internalType: 'address' }],
            payable: false,
          },
          contractInputsValues: {
            addr: TEST_ADDRESSES.owner2,
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should throw for invalid address', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'addr', type: 'address', internalType: 'address' }],
            payable: false,
          },
          contractInputsValues: {
            addr: 'not-an-address',
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).toThrow(SafeCLIError)
      })
    })

    describe('boolean type', () => {
      it('should accept boolean true', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'flag', type: 'bool', internalType: 'bool' }],
            payable: false,
          },
          contractInputsValues: {
            flag: true,
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should accept boolean false', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'flag', type: 'bool', internalType: 'bool' }],
            payable: false,
          },
          contractInputsValues: {
            flag: false,
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should accept string "true"', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'flag', type: 'bool', internalType: 'bool' }],
            payable: false,
          },
          contractInputsValues: {
            flag: 'true',
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should accept string "false"', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'flag', type: 'bool', internalType: 'bool' }],
            payable: false,
          },
          contractInputsValues: {
            flag: 'false',
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should throw for invalid boolean', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'flag', type: 'bool', internalType: 'bool' }],
            payable: false,
          },
          contractInputsValues: {
            flag: 'maybe',
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).toThrow(SafeCLIError)
      })
    })

    describe('integer types', () => {
      it('should accept number for uint', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
            payable: false,
          },
          contractInputsValues: {
            amount: 123,
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should accept string for uint', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
            payable: false,
          },
          contractInputsValues: {
            amount: '123',
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should accept bigint', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
            payable: false,
          },
          contractInputsValues: {
            amount: 123n,
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should accept negative number for int', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'value', type: 'int256', internalType: 'int256' }],
            payable: false,
          },
          contractInputsValues: {
            value: -123,
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })
    })

    describe('string type', () => {
      it('should accept string', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'text', type: 'string', internalType: 'string' }],
            payable: false,
          },
          contractInputsValues: {
            text: 'hello world',
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should convert number to string', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'text', type: 'string', internalType: 'string' }],
            payable: false,
          },
          contractInputsValues: {
            text: 123,
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })
    })

    describe('bytes types', () => {
      it('should accept bytes with 0x prefix', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'data', type: 'bytes', internalType: 'bytes' }],
            payable: false,
          },
          contractInputsValues: {
            data: '0x1234',
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should add 0x prefix if missing', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'data', type: 'bytes32', internalType: 'bytes32' }],
            payable: false,
          },
          contractInputsValues: {
            data: '1234',
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should throw for non-string bytes', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'data', type: 'bytes', internalType: 'bytes' }],
            payable: false,
          },
          contractInputsValues: {
            data: 123,
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).toThrow(SafeCLIError)
      })
    })

    describe('array types', () => {
      it('should accept array of addresses', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'addresses', type: 'address[]', internalType: 'address[]' }],
            payable: false,
          },
          contractInputsValues: {
            addresses: [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2],
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should accept array of strings', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'names', type: 'string[]', internalType: 'string[]' }],
            payable: false,
          },
          contractInputsValues: {
            names: ['alice', 'bob', 'charlie'],
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })

      it('should throw for non-array value with array type', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' }],
            payable: false,
          },
          contractInputsValues: {
            amounts: 'not an array',
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).toThrow(SafeCLIError)
      })
    })

    describe('tuple types', () => {
      it('should pass through tuple values', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'data', type: 'tuple', internalType: 'struct Data' }],
            payable: false,
          },
          contractInputsValues: {
            data: { field1: 'value1', field2: 123 },
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })
    })

    describe('null/undefined values', () => {
      it('should throw for null value', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'value', type: 'uint256', internalType: 'uint256' }],
            payable: false,
          },
          contractInputsValues: {
            value: null,
          },
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).toThrow(SafeCLIError)
      })

      it('should throw for missing parameter value', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '0',
          contractMethod: {
            name: 'test',
            inputs: [{ name: 'value', type: 'uint256', internalType: 'uint256' }],
            payable: false,
          },
          contractInputsValues: {},
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).toThrow(SafeCLIError)
        expect(() => TxBuilderParser.parseTransaction(tx)).toThrow('Missing value for parameter')
      })
    })

    describe('payable functions', () => {
      it('should handle payable contract method', () => {
        const tx: TxBuilderTransaction = {
          to: TEST_ADDRESSES.owner1,
          value: '1000000000000000000',
          contractMethod: {
            name: 'deposit',
            inputs: [],
            payable: true,
          },
          contractInputsValues: {},
        }

        expect(() => TxBuilderParser.parseTransaction(tx)).not.toThrow()
      })
    })
  })

  describe('parse', () => {
    it('should parse complete Transaction Builder JSON', () => {
      const result = TxBuilderParser.parse(validTxBuilderData)

      expect(result.chainId).toBe('1')
      expect(result.safeAddress).toBe(TEST_ADDRESSES.safe1)
      expect(result.createdBy).toBe(TEST_ADDRESSES.owner1)
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].to).toBe(TEST_ADDRESSES.owner2)
      expect(result.meta.name).toBe('Test Batch')
      expect(result.meta.description).toBe('Test description')
      expect(result.meta.version).toBe('1.0')
    })

    it('should handle missing optional createdBy', () => {
      const data = {
        ...validTxBuilderData,
        meta: {
          ...validTxBuilderData.meta,
          createdFromOwnerAddress: undefined,
        },
      }

      const result = TxBuilderParser.parse(data)

      expect(result.createdBy).toBeUndefined()
    })

    it('should handle missing optional meta fields', () => {
      const data = {
        ...validTxBuilderData,
        meta: {
          createdFromSafeAddress: TEST_ADDRESSES.safe1,
        },
      }

      const result = TxBuilderParser.parse(data)

      expect(result.meta.name).toBeUndefined()
      expect(result.meta.description).toBeUndefined()
    })

    it('should parse multiple transactions', () => {
      const data = {
        ...validTxBuilderData,
        transactions: [
          { to: TEST_ADDRESSES.owner1, value: '0', data: '0x' },
          { to: TEST_ADDRESSES.owner2, value: '1000', data: '0xabcd' },
          { to: TEST_ADDRESSES.owner3, value: '2000', data: '0xdcba' },
        ],
      }

      const result = TxBuilderParser.parse(data)

      expect(result.transactions).toHaveLength(3)
      expect(result.transactions[0].to).toBe(TEST_ADDRESSES.owner1)
      expect(result.transactions[1].to).toBe(TEST_ADDRESSES.owner2)
      expect(result.transactions[2].to).toBe(TEST_ADDRESSES.owner3)
    })

    it('should throw for invalid data', () => {
      expect(() => TxBuilderParser.parse({} as any)).toThrow(SafeCLIError)
    })

    it('should convert timestamp to Date', () => {
      const timestamp = 1234567890000
      const data = {
        ...validTxBuilderData,
        createdAt: timestamp,
      }

      const result = TxBuilderParser.parse(data)

      expect(result.createdAt.getTime()).toBe(timestamp)
    })
  })
})
