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
const Safe = (SafeSDK as any).default

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

      return {
        address: safeAddress,
        owners: owners as Address[],
        threshold,
        nonce: BigInt(nonce),
        version,
        isDeployed: true,
        balance,
      }
    } catch (error) {
      throw new SafeCLIError(
        `Failed to get Safe info: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
