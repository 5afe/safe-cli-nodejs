import * as p from '@clack/prompts'
import { encodeFunctionData, parseEther, type Address } from 'viem'
import type { ABIFunction, ABI } from './abi-service.js'
import type { ChainConfig } from '../types/config.js'
import { SafeCLIError } from '../utils/errors.js'
import { isEIP3770, parseEIP3770, getChainIdFromShortName } from '../utils/eip3770.js'

export interface TransactionBuilderResult {
  data: `0x${string}`
  value: string
}

/**
 * Service for building contract transaction data interactively
 */
export class TransactionBuilder {
  private abi: ABI
  private chainId: string
  private chains: Record<string, ChainConfig>

  constructor(abi: ABI, chainId: string, chains: Record<string, ChainConfig>) {
    this.abi = abi
    this.chainId = chainId
    this.chains = chains
  }

  /**
   * Build transaction data for a function call
   */
  async buildFunctionCall(func: ABIFunction): Promise<TransactionBuilderResult> {
    const args: unknown[] = []

    // Get value if function is payable
    let value = '0'
    if (func.stateMutability === 'payable') {
      const valueInput = (await p.text({
        message: 'Value to send (in ETH):',
        placeholder: '0',
        initialValue: '0',
        validate: (val) => {
          if (!val) return undefined
          try {
            parseEther(val as string)
            return undefined
          } catch {
            return 'Invalid ETH amount'
          }
        },
      })) as string

      if (p.isCancel(valueInput)) {
        throw new SafeCLIError('Transaction building cancelled')
      }

      // Convert to wei
      value = parseEther(valueInput).toString()
    }

    // Prompt for each parameter
    if (func.inputs.length > 0) {
      console.log('')
      console.log('Function Parameters:')
      console.log('')

      for (const input of func.inputs) {
        const paramValue = await this.promptForParameter(input.name || '_', input.type)
        args.push(paramValue)
      }
    }

    // Encode function data
    try {
      const data = encodeFunctionData({
        abi: this.abi,
        functionName: func.name,
        args,
      })

      return { data, value }
    } catch (error) {
      throw new SafeCLIError(
        `Failed to encode function data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Prompt for a single parameter value
   */
  private async promptForParameter(name: string, type: string): Promise<unknown> {
    const value = await p.text({
      message: `${name} (${type}):`,
      placeholder: this.getPlaceholder(type),
      validate: (val) => {
        if (!val) return 'Value is required'
        return this.validateParameter(val as string, type)
      },
    })

    if (p.isCancel(value)) {
      throw new SafeCLIError('Transaction building cancelled')
    }

    return this.parseParameter(value as string, type)
  }

  /**
   * Get placeholder text for parameter type
   */
  private getPlaceholder(type: string): string {
    if (type === 'address') return '0x... or eth:0x...'
    if (type.startsWith('uint') || type.startsWith('int')) return '123'
    if (type === 'bool') return 'true or false'
    if (type === 'string') return 'your text here'
    if (type === 'bytes' || type.startsWith('bytes')) return '0x...'
    if (type.endsWith('[]')) return 'comma separated values'
    return 'value'
  }

  /**
   * Validate parameter input
   */
  private validateParameter(value: string, type: string): string | undefined {
    try {
      this.parseParameter(value, type)
      return undefined
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid value'
    }
  }

  /**
   * Parse parameter value based on type
   */
  private parseParameter(value: string, type: string): unknown {
    // Address (with EIP-3770 support)
    if (type === 'address') {
      // Check if EIP-3770 format
      if (isEIP3770(value)) {
        try {
          const { shortName, address } = parseEIP3770(value)

          // Resolve the chainId from the shortName
          const chainId = getChainIdFromShortName(shortName, this.chains)

          // Check if it matches the expected chain
          if (chainId !== this.chainId) {
            const expectedChain = this.chains[this.chainId]
            const providedChain = this.chains[chainId]
            const expectedName = expectedChain?.name || this.chainId
            const providedName = providedChain?.name || chainId

            throw new Error(
              `Chain mismatch: address is for ${providedName} (${shortName}:) but current Safe is on ${expectedName}`
            )
          }

          return address
        } catch (error) {
          if (error instanceof Error) {
            throw error
          }
          throw new Error('Invalid EIP-3770 address format')
        }
      }

      // Plain address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
        throw new Error('Invalid address format')
      }
      return value as Address
    }

    // Boolean
    if (type === 'bool') {
      if (value.toLowerCase() === 'true') return true
      if (value.toLowerCase() === 'false') return false
      throw new Error('Must be true or false')
    }

    // Unsigned integers
    if (type.startsWith('uint')) {
      const num = BigInt(value)
      if (num < 0n) throw new Error('Must be positive')
      return num
    }

    // Signed integers
    if (type.startsWith('int')) {
      return BigInt(value)
    }

    // String
    if (type === 'string') {
      return value
    }

    // Bytes
    if (type === 'bytes' || type.startsWith('bytes')) {
      if (!value.startsWith('0x')) {
        throw new Error('Bytes must start with 0x')
      }
      return value as `0x${string}`
    }

    // Arrays
    if (type.endsWith('[]')) {
      const elementType = type.slice(0, -2)
      const elements = value.split(',').map((v) => v.trim())
      return elements.map((el) => this.parseParameter(el, elementType))
    }

    // Default: return as string
    return value
  }
}
