import { encodeFunctionData, type Address, type Hex } from 'viem'
import { SafeCLIError } from '../utils/errors.js'

/**
 * Transaction Builder JSON format (from Safe web app)
 * Reference: https://github.com/safe-global/safe-transaction-service
 */
export interface TxBuilderTransaction {
  to: Address
  value: string
  data?: string | null
  contractMethod?: {
    inputs: Array<{
      internalType: string
      name: string
      type: string
    }>
    name: string
    payable: boolean
  }
  contractInputsValues?: Record<string, any>
}

export interface TxBuilderFormat {
  version: string
  chainId: string
  createdAt: number
  meta: {
    name?: string
    description?: string
    txBuilderVersion?: string
    createdFromSafeAddress: Address
    createdFromOwnerAddress?: Address
    checksum?: string
  }
  transactions: TxBuilderTransaction[]
}

/**
 * Parsed transaction ready for CLI import
 */
export interface ParsedTransaction {
  to: Address
  value: string
  data: Hex
  operation: 0 | 1 // Default to Call (0)
}

/**
 * Service for parsing Safe Transaction Builder JSON format
 */
export class TxBuilderParser {
  /**
   * Check if JSON matches Transaction Builder format
   */
  static isTxBuilderFormat(data: any): data is TxBuilderFormat {
    return (
      data &&
      typeof data === 'object' &&
      'version' in data &&
      'chainId' in data &&
      'meta' in data &&
      'transactions' in data &&
      Array.isArray(data.transactions) &&
      typeof data.meta === 'object' &&
      'createdFromSafeAddress' in data.meta
    )
  }

  /**
   * Validate Transaction Builder JSON structure
   */
  static validate(data: any): asserts data is TxBuilderFormat {
    if (!this.isTxBuilderFormat(data)) {
      throw new SafeCLIError('Invalid Transaction Builder format: missing required fields')
    }

    if (!data.meta.createdFromSafeAddress) {
      throw new SafeCLIError('Invalid Transaction Builder format: missing Safe address')
    }

    if (data.transactions.length === 0) {
      throw new SafeCLIError('Invalid Transaction Builder format: no transactions found')
    }

    // Validate each transaction
    for (let i = 0; i < data.transactions.length; i++) {
      const tx = data.transactions[i]
      if (!tx.to) {
        throw new SafeCLIError(`Invalid Transaction Builder format: transaction ${i} missing 'to' address`)
      }

      // Must have either data or contractMethod
      if (!tx.data && !tx.contractMethod) {
        throw new SafeCLIError(
          `Invalid Transaction Builder format: transaction ${i} missing both 'data' and 'contractMethod'`
        )
      }
    }
  }

  /**
   * Parse a single transaction from Transaction Builder format
   */
  static parseTransaction(tx: TxBuilderTransaction): ParsedTransaction {
    let data: Hex

    // If data is provided directly, use it
    if (tx.data && tx.data !== null) {
      data = tx.data.startsWith('0x') ? (tx.data as Hex) : (`0x${tx.data}` as Hex)
    }
    // If contractMethod is provided, encode it
    else if (tx.contractMethod && tx.contractInputsValues) {
      data = this.encodeContractMethod(tx.contractMethod, tx.contractInputsValues)
    }
    // Default to empty data
    else {
      data = '0x' as Hex
    }

    return {
      to: tx.to,
      value: tx.value || '0',
      data,
      operation: 0, // Default to Call
    }
  }

  /**
   * Encode contract method call from Transaction Builder format
   */
  private static encodeContractMethod(
    method: NonNullable<TxBuilderTransaction['contractMethod']>,
    inputValues: Record<string, any>
  ): Hex {
    try {
      // Build ABI for this function
      const abiFunction = {
        type: 'function' as const,
        name: method.name,
        stateMutability: method.payable ? ('payable' as const) : ('nonpayable' as const),
        inputs: method.inputs.map((input) => ({
          name: input.name,
          type: input.type,
          internalType: input.internalType,
        })),
        outputs: [], // Not needed for encoding
      }

      // Extract argument values in correct order
      const args = method.inputs.map((input) => {
        const value = inputValues[input.name]
        if (value === undefined) {
          throw new Error(`Missing value for parameter: ${input.name}`)
        }
        return this.parseValue(value, input.type)
      })

      // Encode the function call
      const encoded = encodeFunctionData({
        abi: [abiFunction],
        functionName: method.name,
        args,
      })

      return encoded
    } catch (error) {
      throw new SafeCLIError(
        `Failed to encode contract method '${method.name}': ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Parse a value based on its Solidity type
   */
  private static parseValue(value: any, type: string): any {
    // If value is already the correct type, return it
    if (value === null || value === undefined) {
      throw new Error('Value cannot be null or undefined')
    }

    // Address
    if (type === 'address') {
      if (typeof value !== 'string' || !value.startsWith('0x')) {
        throw new Error(`Invalid address: ${value}`)
      }
      return value as Address
    }

    // Boolean
    if (type === 'bool') {
      if (typeof value === 'boolean') return value
      if (value === 'true') return true
      if (value === 'false') return false
      throw new Error(`Invalid boolean: ${value}`)
    }

    // Unsigned/signed integers
    if (type.startsWith('uint') || type.startsWith('int')) {
      if (typeof value === 'number') return BigInt(value)
      if (typeof value === 'string') return BigInt(value)
      if (typeof value === 'bigint') return value
      throw new Error(`Invalid integer: ${value}`)
    }

    // String
    if (type === 'string') {
      return String(value)
    }

    // Bytes
    if (type === 'bytes' || type.startsWith('bytes')) {
      if (typeof value !== 'string') {
        throw new Error(`Invalid bytes: ${value}`)
      }
      return value.startsWith('0x') ? value : `0x${value}`
    }

    // Arrays
    if (type.endsWith('[]')) {
      if (!Array.isArray(value)) {
        throw new Error(`Expected array for type ${type}, got: ${typeof value}`)
      }
      const elementType = type.slice(0, -2)
      return value.map((item) => this.parseValue(item, elementType))
    }

    // Tuples (structs) - pass through as-is
    if (type.startsWith('tuple')) {
      return value
    }

    // Default: return as-is
    return value
  }

  /**
   * Parse complete Transaction Builder JSON
   */
  static parse(data: TxBuilderFormat): {
    chainId: string
    safeAddress: Address
    createdBy?: Address
    createdAt: Date
    transactions: ParsedTransaction[]
    meta: {
      name?: string
      description?: string
      version?: string
    }
  } {
    this.validate(data)

    const parsedTransactions = data.transactions.map((tx) => this.parseTransaction(tx))

    return {
      chainId: data.chainId,
      safeAddress: data.meta.createdFromSafeAddress,
      createdBy: data.meta.createdFromOwnerAddress,
      createdAt: new Date(data.createdAt),
      transactions: parsedTransactions,
      meta: {
        name: data.meta.name,
        description: data.meta.description,
        version: data.version,
      },
    }
  }
}
