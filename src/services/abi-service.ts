import type { Address } from 'viem'
import type { ChainConfig } from '../types/config.js'
import { SafeCLIError } from '../utils/errors.js'

export interface ABIFunction {
  type: 'function'
  name: string
  inputs: Array<{
    name: string
    type: string
    internalType?: string
  }>
  outputs?: Array<{
    name: string
    type: string
    internalType?: string
  }>
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
}

export type ABI = Array<ABIFunction | any>

/**
 * Service for fetching contract ABIs from various sources
 */
export class ABIService {
  private chain: ChainConfig

  constructor(chain: ChainConfig) {
    this.chain = chain
  }

  /**
   * Fetch ABI for a contract address
   * Tries Etherscan first, then falls back to Sourcify
   */
  async fetchABI(address: Address): Promise<ABI> {
    // Try Etherscan first
    try {
      const abi = await this.fetchFromEtherscan(address)
      if (abi) return abi
    } catch (error) {
      // Silently continue to Sourcify
    }

    // Try Sourcify as fallback
    try {
      const abi = await this.fetchFromSourcify(address)
      if (abi) return abi
    } catch (error) {
      // Both failed
    }

    throw new SafeCLIError(
      `Could not fetch ABI for ${address}. Contract may not be verified on Etherscan or Sourcify.`
    )
  }

  /**
   * Fetch ABI from Etherscan-compatible API
   */
  private async fetchFromEtherscan(address: Address): Promise<ABI | null> {
    const explorerUrl = this.chain.explorer

    if (!explorerUrl) {
      return null
    }

    // Convert explorer URL to API URL
    // https://etherscan.io -> https://api.etherscan.io/api
    // https://sepolia.etherscan.io -> https://api-sepolia.etherscan.io/api
    const apiUrl = explorerUrl
      .replace('https://', 'https://api.')
      .replace('https://api.', 'https://api-')
      .replace('etherscan.io', 'etherscan.io/api')
      .replace('https://api-https://api-', 'https://api-')

    // Note: Using without API key (limited rate)
    const url = `${apiUrl}?module=contract&action=getabi&address=${address}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === '1' && data.result) {
      return JSON.parse(data.result)
    }

    return null
  }

  /**
   * Fetch ABI from Sourcify
   */
  private async fetchFromSourcify(address: Address): Promise<ABI | null> {
    const chainId = this.chain.chainId

    // Try full match first
    try {
      const url = `https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/metadata.json`
      const response = await fetch(url)

      if (response.ok) {
        const metadata = await response.json()
        if (metadata.output?.abi) {
          return metadata.output.abi
        }
      }
    } catch (error) {
      // Try partial match
    }

    // Try partial match
    try {
      const url = `https://repo.sourcify.dev/contracts/partial_match/${chainId}/${address}/metadata.json`
      const response = await fetch(url)

      if (response.ok) {
        const metadata = await response.json()
        if (metadata.output?.abi) {
          return metadata.output.abi
        }
      }
    } catch (error) {
      // Failed
    }

    return null
  }

  /**
   * Parse ABI and extract callable functions
   */
  extractFunctions(abi: ABI): ABIFunction[] {
    return abi
      .filter(
        (item): item is ABIFunction =>
          item.type === 'function' &&
          (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable')
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Extract view/pure functions (read-only)
   */
  extractViewFunctions(abi: ABI): ABIFunction[] {
    return abi
      .filter(
        (item): item is ABIFunction =>
          item.type === 'function' &&
          (item.stateMutability === 'view' || item.stateMutability === 'pure')
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Format function signature for display
   */
  formatFunctionSignature(func: ABIFunction): string {
    const params = func.inputs.map((input) => {
      const name = input.name || '_'
      return `${input.type} ${name}`
    }).join(', ')

    return `${func.name}(${params})`
  }
}
