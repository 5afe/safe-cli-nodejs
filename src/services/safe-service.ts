import SafeSDK, {
  predictSafeAddress,
  SafeAccountConfig,
  SafeProvider,
} from '@safe-global/protocol-kit'
import { createPublicClient, createWalletClient, http, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { ChainConfig } from '../types/config.js'
import { SafeCLIError } from '../utils/errors.js'
import { normalizePrivateKey } from '../utils/validation.js'

// ESM/CommonJS interop: Access the Safe class from the default export
const Safe = (SafeSDK as unknown as { default: typeof SafeSDK }).default

// Safe contract storage slots (from SafeStorage.sol)
const GUARD_STORAGE_SLOT =
  '0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8' as const
const FALLBACK_HANDLER_STORAGE_SLOT =
  '0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5' as const

// Sentinel address for module linked list
const SENTINEL_MODULES = '0x0000000000000000000000000000000000000001' as const

// EIP-1967 implementation slot for mastercopy detection
const EIP1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc' as const

export interface SafeCreationConfig {
  owners: Address[]
  threshold: number
  saltNonce?: string
}

export interface SafeInfo {
  address: Address
  owners: Address[]
  threshold: number
  nonce: bigint
  version: string
  isDeployed: boolean
  balance?: bigint
  modules?: Address[]
  guard?: Address | null
  fallbackHandler?: Address | null
  masterCopy?: Address | null
}

export class SafeService {
  private chain: ChainConfig
  private privateKey?: `0x${string}`

  constructor(chain: ChainConfig, privateKey?: string) {
    this.chain = chain
    if (privateKey) {
      this.privateKey = normalizePrivateKey(privateKey)
    }
  }

  // Create a predicted Safe (not yet deployed)
  async createPredictedSafe(config: SafeCreationConfig): Promise<{
    predictedAddress: Address
    safeAccountConfig: SafeAccountConfig
    safeVersion: string
  }> {
    try {
      const safeAccountConfig: SafeAccountConfig = {
        owners: config.owners,
        threshold: config.threshold,
      }

      const safeVersion = '1.4.1'

      // Create a SafeProvider instance
      const safeProvider = await SafeProvider.init({
        provider: this.chain.rpcUrl,
        safeVersion,
      })

      // Predict the Safe address
      const predictedAddress = await predictSafeAddress({
        safeProvider,
        chainId: BigInt(this.chain.chainId),
        safeAccountConfig,
        safeDeploymentConfig: {
          safeVersion,
          saltNonce: config.saltNonce,
        },
      })

      return {
        predictedAddress: predictedAddress as Address,
        safeAccountConfig,
        safeVersion,
      }
    } catch (error) {
      throw new SafeCLIError(
        `Failed to create predicted Safe: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Deploy a Safe
  async deploySafe(config: SafeCreationConfig): Promise<Address> {
    if (!this.privateKey) {
      throw new SafeCLIError('Private key required to deploy Safe')
    }

    try {
      const account = privateKeyToAccount(this.privateKey)

      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        signer: this.privateKey,
        predictedSafe: {
          safeAccountConfig: {
            owners: config.owners,
            threshold: config.threshold,
          },
          safeDeploymentConfig: {
            safeVersion: '1.4.1',
            saltNonce: config.saltNonce,
          },
        },
      })

      // Deploy the Safe
      const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction()

      const client = createWalletClient({
        account,
        chain: {
          id: parseInt(this.chain.chainId, 10),
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

      const hash = await client.sendTransaction({
        to: deploymentTransaction.to as Address,
        value: BigInt(deploymentTransaction.value),
        data: deploymentTransaction.data as `0x${string}`,
      })

      // Wait for confirmation
      const publicClient = createPublicClient({
        chain: {
          id: parseInt(this.chain.chainId, 10),
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

      await publicClient.waitForTransactionReceipt({ hash })

      const safeAddress = await protocolKit.getAddress()
      return safeAddress as Address
    } catch (error) {
      throw new SafeCLIError(
        `Failed to deploy Safe: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Helper to create a public client for this chain
  private createPublicClient() {
    return createPublicClient({
      chain: {
        id: parseInt(this.chain.chainId, 10),
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
  }

  // Get enabled modules for a Safe
  private async getModules(safeAddress: Address): Promise<Address[]> {
    try {
      const publicClient = this.createPublicClient()

      // Call getModulesPaginated with sentinel and large page size
      const result = await publicClient.readContract({
        address: safeAddress,
        abi: [
          {
            type: 'function',
            name: 'getModulesPaginated',
            inputs: [
              { type: 'address', name: 'start' },
              { type: 'uint256', name: 'pageSize' },
            ],
            outputs: [
              { type: 'address[]', name: 'array' },
              { type: 'address', name: 'next' },
            ],
            stateMutability: 'view',
          },
        ],
        functionName: 'getModulesPaginated',
        args: [SENTINEL_MODULES, 100n], // Get up to 100 modules
      })

      return (result as [Address[], Address])[0]
    } catch {
      // Safe might not have modules or method not available
      return []
    }
  }

  // Get guard for a Safe
  private async getGuard(safeAddress: Address): Promise<Address | null> {
    try {
      const publicClient = this.createPublicClient()

      // Read from guard storage slot
      const guardData = await publicClient.getStorageAt({
        address: safeAddress,
        slot: GUARD_STORAGE_SLOT,
      })

      if (!guardData || guardData === '0x' + '0'.repeat(64)) {
        return null
      }

      // Extract address from storage (last 20 bytes = 40 hex chars)
      const addressHex = guardData.slice(2) // Remove 0x prefix
      const guardAddress = ('0x' + addressHex.slice(-40)) as Address

      // Check if it's a valid address (not zero address)
      if (guardAddress === '0x0000000000000000000000000000000000000000') {
        return null
      }

      return guardAddress
    } catch {
      return null
    }
  }

  // Get fallback handler for a Safe
  private async getFallbackHandler(safeAddress: Address): Promise<Address | null> {
    try {
      const publicClient = this.createPublicClient()

      // Read from fallback handler storage slot
      const handlerData = await publicClient.getStorageAt({
        address: safeAddress,
        slot: FALLBACK_HANDLER_STORAGE_SLOT,
      })

      if (!handlerData || handlerData === '0x' + '0'.repeat(64)) {
        return null
      }

      // Extract address from storage (last 20 bytes = 40 hex chars)
      const addressHex = handlerData.slice(2) // Remove 0x prefix
      const handlerAddress = ('0x' + addressHex.slice(-40)) as Address

      // Check if it's a valid address (not zero address)
      if (handlerAddress === '0x0000000000000000000000000000000000000000') {
        return null
      }

      return handlerAddress
    } catch {
      return null
    }
  }

  // Get mastercopy (implementation) address for a Safe proxy
  private async getMasterCopy(safeAddress: Address): Promise<Address | null> {
    try {
      const publicClient = this.createPublicClient()

      // Try EIP-1967 implementation slot first
      const implementationData = await publicClient.getStorageAt({
        address: safeAddress,
        slot: EIP1967_IMPLEMENTATION_SLOT,
      })

      if (implementationData && implementationData !== '0x' + '0'.repeat(64)) {
        // Extract address from storage (last 20 bytes = 40 hex chars)
        const addressHex = implementationData.slice(2) // Remove 0x prefix
        const implementationAddress = ('0x' + addressHex.slice(-40)) as Address

        // Check if it's not zero address
        if (implementationAddress !== '0x0000000000000000000000000000000000000000') {
          return implementationAddress
        }
      }

      // If EIP-1967 didn't work, try to call masterCopy() function (older Safes)
      try {
        const masterCopy = await publicClient.readContract({
          address: safeAddress,
          abi: [
            {
              type: 'function',
              name: 'masterCopy',
              inputs: [],
              outputs: [{ type: 'address' }],
              stateMutability: 'view',
            },
          ],
          functionName: 'masterCopy',
        })

        if (masterCopy && masterCopy !== '0x0000000000000000000000000000000000000000') {
          return masterCopy as Address
        }
      } catch {
        // masterCopy() function might not exist
      }

      return null
    } catch {
      return null
    }
  }

  // Get Safe info (works for both deployed and predicted)
  async getSafeInfo(safeAddress: Address): Promise<SafeInfo> {
    try {
      // Check if Safe is deployed
      const publicClient = createPublicClient({
        chain: {
          id: parseInt(this.chain.chainId, 10),
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

      const bytecode = await publicClient.getBytecode({ address: safeAddress })
      const isDeployed = !!bytecode && bytecode !== '0x'

      if (!isDeployed) {
        return {
          address: safeAddress,
          owners: [],
          threshold: 0,
          nonce: 0n,
          version: 'unknown',
          isDeployed: false,
        }
      }

      // Initialize Safe SDK to get info
      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        safeAddress,
      })

      const owners = await protocolKit.getOwners()
      const threshold = await protocolKit.getThreshold()
      const nonce = await protocolKit.getNonce()
      const version = await protocolKit.getContractVersion()
      const balance = await publicClient.getBalance({ address: safeAddress })

      // Get advanced Safe information
      const modules = await this.getModules(safeAddress)
      const guard = await this.getGuard(safeAddress)
      const fallbackHandler = await this.getFallbackHandler(safeAddress)
      const masterCopy = await this.getMasterCopy(safeAddress)

      return {
        address: safeAddress,
        owners: owners as Address[],
        threshold,
        nonce: BigInt(nonce),
        version,
        isDeployed: true,
        balance,
        modules: modules.length > 0 ? modules : undefined,
        guard: guard || undefined,
        fallbackHandler: fallbackHandler || undefined,
        masterCopy: masterCopy || undefined,
      }
    } catch (error) {
      throw new SafeCLIError(
        `Failed to get Safe info: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
