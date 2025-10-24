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

export interface ContractInfo {
  abi: ABI
  name?: string
}

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
    const info = await this.fetchContractInfo(address)
    return info.abi
  }

  /**
   * Fetch contract info (ABI + name) for a contract address
   * Tries Etherscan first, then falls back to Sourcify
   */
  async fetchContractInfo(address: Address): Promise<ContractInfo> {
    // Try Etherscan first
    try {
      const info = await this.fetchFromEtherscan(address)
      if (info) return info
    } catch (error) {
      // Silently continue to Sourcify
    }

    // Try Sourcify as fallback
    try {
      const info = await this.fetchFromSourcify(address)
      if (info) return info
    } catch (error) {
      // Both failed
    }

    throw new SafeCLIError(
      `Could not fetch ABI for ${address}. Contract may not be verified on Etherscan or Sourcify.`
    )
  }

  /**
   * Fetch contract info from Etherscan-compatible API
   */
  private async fetchFromEtherscan(address: Address): Promise<ContractInfo | null> {
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

    // Use getsourcecode to get both ABI and contract name
    const url = `${apiUrl}?module=contract&action=getsourcecode&address=${address}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === '1' && data.result && data.result[0]) {
      const contractData = data.result[0]

      if (contractData.ABI && contractData.ABI !== 'Contract source code not verified') {
        return {
          abi: JSON.parse(contractData.ABI),
          name: contractData.ContractName || undefined
        }
      }
    }

    return null
  }

  /**
   * Fetch contract info from Sourcify
   */
  private async fetchFromSourcify(address: Address): Promise<ContractInfo | null> {
    const chainId = this.chain.chainId

    // Try full match first
    try {
      const url = `https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/metadata.json`
      const response = await fetch(url)

      if (response.ok) {
        const metadata = await response.json()
        if (metadata.output?.abi) {
          // Extract contract name from settings.compilationTarget
          let contractName: string | undefined
          if (metadata.settings?.compilationTarget) {
            const targets = Object.values(metadata.settings.compilationTarget)
            if (targets.length > 0) {
              contractName = targets[0] as string
            }
          }

          return {
            abi: metadata.output.abi,
            name: contractName
          }
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
          // Extract contract name from settings.compilationTarget
          let contractName: string | undefined
          if (metadata.settings?.compilationTarget) {
            const targets = Object.values(metadata.settings.compilationTarget)
            if (targets.length > 0) {
              contractName = targets[0] as string
            }
          }

          return {
            abi: metadata.output.abi,
            name: contractName
          }
        }
      }
    } catch (error) {
      // Failed
    }

    return null
  }

  /**
   * Parse ABI and extract callable functions (state-changing)
   */
  extractFunctions(abi: ABI): ABIFunction[] {
    return abi
      .filter((item): item is ABIFunction => {
        if (item.type !== 'function') return false

        // Include functions that can modify state
        // Exclude view and pure functions (read-only)
        const mutability = item.stateMutability
        if (!mutability) {
          // Old contracts might not have stateMutability
          // Include them if not marked as constant/pure/view
          return !item.constant && item.pure !== true && item.view !== true
        }

        return mutability === 'nonpayable' || mutability === 'payable'
      })
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
