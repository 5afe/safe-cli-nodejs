import { createPublicClient, http, type Address } from 'viem'
import type { ChainConfig } from '../types/config.js'
import { SafeCLIError } from '../utils/errors.js'

// EIP-1967 storage slots
const EIP1967_IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
const EIP1967_BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'

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

  /**
   * Detect if contract is a proxy and get implementation address
   * Supports EIP-1967 (most common proxy standard)
   */
  async getImplementationAddress(proxyAddress: Address): Promise<Address | null> {
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

      // Try EIP-1967 implementation slot
      const implementationData = await client.getStorageAt({
        address: proxyAddress,
        slot: EIP1967_IMPLEMENTATION_SLOT as `0x${string}`,
      })

      if (implementationData && implementationData !== '0x' + '0'.repeat(64)) {
        // Extract address from storage (last 20 bytes)
        const implementationAddress = ('0x' + implementationData.slice(-40)) as Address

        // Verify it's a valid contract
        const isValidContract = await this.isContract(implementationAddress)
        if (isValidContract) {
          return implementationAddress
        }
      }

      // Try EIP-1967 beacon slot
      const beaconData = await client.getStorageAt({
        address: proxyAddress,
        slot: EIP1967_BEACON_SLOT as `0x${string}`,
      })

      if (beaconData && beaconData !== '0x' + '0'.repeat(64)) {
        const beaconAddress = ('0x' + beaconData.slice(-40)) as Address

        // Beacon proxies have an implementation() function
        try {
          const implData = await client.readContract({
            address: beaconAddress,
            abi: [{
              type: 'function',
              name: 'implementation',
              inputs: [],
              outputs: [{ type: 'address' }],
              stateMutability: 'view',
            }],
            functionName: 'implementation',
          })

          if (implData) {
            return implData as Address
          }
        } catch {
          // Not a beacon proxy
        }
      }

      return null
    } catch (error) {
      // Not a proxy or error reading storage
      return null
    }
  }
}
