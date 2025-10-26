import type { Address } from 'viem'
import type { ChainConfig } from '../types/config.js'
import { SafeCLIError } from '../utils/errors.js'

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new SafeCLIError(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

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
  implementation?: Address // Implementation address if this is a proxy
}

/**
 * Service for fetching contract ABIs from various sources
 */
export class ABIService {
  private chain: ChainConfig
  private etherscanApiKey?: string

  constructor(chain: ChainConfig, etherscanApiKey?: string) {
    this.chain = chain
    this.etherscanApiKey = etherscanApiKey
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
   * Smart ordering:
   * - With API key: Etherscan first (has proxy detection), then Sourcify
   * - Without API key: Sourcify first (free), then Etherscan
   */
  async fetchContractInfo(address: Address): Promise<ContractInfo> {
    // Smart ordering: prefer Etherscan if API key is configured (for proxy detection)
    // Otherwise, try Sourcify first (free, no API key needed)
    const tryEtherscanFirst = !!this.etherscanApiKey

    if (tryEtherscanFirst) {
      // Try Etherscan first (has proxy detection)
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
    } else {
      // Try Sourcify first (free, no API key needed)
      try {
        const info = await this.fetchFromSourcify(address)
        if (info) return info
      } catch (error) {
        // Silently continue to Etherscan
      }

      // Try Etherscan as fallback (will likely fail without API key, but worth trying)
      try {
        const info = await this.fetchFromEtherscan(address)
        if (info) return info
      } catch (error) {
        // Both failed
      }
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

    // Convert explorer URL to API URL (V2)
    // https://etherscan.io -> https://api.etherscan.io/v2/api
    // https://sepolia.etherscan.io -> https://api-sepolia.etherscan.io/v2/api
    const explorerURL = new URL(explorerUrl)
    const hostParts = explorerURL.hostname.split('.')

    let apiUrl: string
    if (hostParts.length === 2) {
      // No subdomain: etherscan.io -> api.etherscan.io
      apiUrl = `https://api.${explorerURL.hostname}/v2/api`
    } else {
      // Has subdomain: sepolia.etherscan.io -> api-sepolia.etherscan.io
      const subdomain = hostParts[0]
      const domain = hostParts.slice(1).join('.')
      apiUrl = `https://api-${subdomain}.${domain}/v2/api`
    }

    // Use getsourcecode to get both ABI and contract name (V2 API requires chainid)
    let requestUrl = `${apiUrl}?chainid=${this.chain.chainId}&module=contract&action=getsourcecode&address=${address}`

    // Add API key if available
    if (this.etherscanApiKey) {
      requestUrl += `&apikey=${this.etherscanApiKey}`
    }

    const response = await fetchWithTimeout(requestUrl)
    const data = (await response.json()) as any

    if (data.status === '1' && data.result && data.result[0]) {
      const contractData = data.result[0] as any

      if (contractData.ABI && contractData.ABI !== 'Contract source code not verified') {
        // Check if this is a proxy contract (Etherscan V2 returns Proxy="1" and Implementation address)
        let implementation: Address | undefined
        if (contractData.Proxy === '1' && contractData.Implementation) {
          implementation = contractData.Implementation as Address
        }

        return {
          abi: JSON.parse(contractData.ABI),
          name: contractData.ContractName || undefined,
          implementation,
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
      const response = await fetchWithTimeout(url)

      if (response.ok) {
        const metadata = (await response.json()) as any
        if (metadata.output?.abi) {
          // Extract contract name from settings.compilationTarget
          let contractName: string | undefined
          if (metadata.settings?.compilationTarget) {
            const targets = Object.values(
              metadata.settings.compilationTarget as Record<string, any>
            )
            if (targets.length > 0) {
              contractName = targets[0] as string
            }
          }

          return {
            abi: metadata.output.abi,
            name: contractName,
          }
        }
      }
    } catch (error) {
      // Try partial match
    }

    // Try partial match
    try {
      const url = `https://repo.sourcify.dev/contracts/partial_match/${chainId}/${address}/metadata.json`
      const response = await fetchWithTimeout(url)

      if (response.ok) {
        const metadata = (await response.json()) as any
        if (metadata.output?.abi) {
          // Extract contract name from settings.compilationTarget
          let contractName: string | undefined
          if (metadata.settings?.compilationTarget) {
            const targets = Object.values(
              metadata.settings.compilationTarget as Record<string, any>
            )
            if (targets.length > 0) {
              contractName = targets[0] as string
            }
          }

          return {
            abi: metadata.output.abi,
            name: contractName,
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
    const params = func.inputs
      .map((input) => {
        const name = input.name || '_'
        return `${input.type} ${name}`
      })
      .join(', ')

    return `${func.name}(${params})`
  }
}
