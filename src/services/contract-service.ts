import { createPublicClient, http, type Address } from 'viem'
import type { ChainConfig } from '../types/config.js'
import { SafeCLIError } from '../utils/errors.js'

/**
 * Service for contract-related operations
 */
export class ContractService {
  private chain: ChainConfig

  constructor(chain: ChainConfig) {
    this.chain = chain
  }

  /**
   * Check if an address is a contract
   * Returns true if the address has bytecode
   */
  async isContract(address: Address): Promise<boolean> {
    try {
      const client = createPublicClient({
        chain: {
          id: parseInt(this.chain.chainId),
          name: this.chain.name,
          nativeCurrency: {
            name: this.chain.currency,
            symbol: this.chain.currency,
            decimals: 18,
          },
          rpcUrls: {
            default: { http: [this.chain.rpcUrl] },
            public: { http: [this.chain.rpcUrl] },
          },
        },
        transport: http(this.chain.rpcUrl),
      })

      const code = await client.getBytecode({ address })

      // If code is undefined or '0x', it's not a contract
      return code !== undefined && code !== '0x'
    } catch (error) {
      throw new SafeCLIError(
        `Failed to check contract: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
