import SafeSDK from '@safe-global/protocol-kit'
import { createPublicClient, createWalletClient, http, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { ChainConfig } from '../types/config.js'
import type { TransactionMetadata } from '../types/transaction.js'
import { SafeCLIError } from '../utils/errors.js'
import { normalizePrivateKey } from '../utils/validation.js'

// ESM/CommonJS interop: Access the Safe class from the default export
const Safe = (SafeSDK as any).default

export interface SafeTransactionData {
  to: Address
  value: string
  data: `0x${string}`
  operation?: 0 | 1
  safeTxGas?: string
  baseGas?: string
  gasPrice?: string
  gasToken?: Address
  refundReceiver?: Address
  nonce?: number
}

export interface CreatedTransaction {
  safeTxHash: string
  metadata: TransactionMetadata
}

export class TransactionService {
  private chain: ChainConfig
  private privateKey?: `0x${string}`

  constructor(chain: ChainConfig, privateKey?: string) {
    this.chain = chain
    if (privateKey) {
      this.privateKey = normalizePrivateKey(privateKey)
    }
  }

  // Create a transaction (doesn't sign or execute)
  async createTransaction(
    safeAddress: Address,
    txData: SafeTransactionData
  ): Promise<CreatedTransaction> {
    try {
      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        safeAddress,
      })

      const safeTransaction = await protocolKit.createTransaction({
        transactions: [
          {
            to: txData.to,
            value: txData.value,
            data: txData.data,
            operation: txData.operation,
          },
        ],
        // If nonce is provided, use it; otherwise SDK will use current Safe nonce
        options: txData.nonce !== undefined ? { nonce: txData.nonce } : undefined,
      })

      const safeTxHash = await protocolKit.getTransactionHash(safeTransaction)

      return {
        safeTxHash,
        metadata: {
          to: txData.to,
          value: txData.value,
          data: txData.data,
          operation: txData.operation,
          nonce: safeTransaction.data.nonce,
          safeTxGas: safeTransaction.data.safeTxGas,
          baseGas: safeTransaction.data.baseGas,
          gasPrice: safeTransaction.data.gasPrice,
          gasToken: safeTransaction.data.gasToken as Address,
          refundReceiver: safeTransaction.data.refundReceiver as Address,
        },
      }
    } catch (error) {
      throw new SafeCLIError(
        `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Sign a transaction
  async signTransaction(
    safeAddress: Address,
    safeTxHash: string,
    metadata: TransactionMetadata
  ): Promise<string> {
    if (!this.privateKey) {
      throw new SafeCLIError('Private key required to sign transaction')
    }

    try {
      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        signer: this.privateKey,
        safeAddress,
      })

      // Recreate the transaction from metadata with the original nonce
      const safeTransaction = await protocolKit.createTransaction({
        transactions: [
          {
            to: metadata.to,
            value: metadata.value,
            data: metadata.data,
            operation: metadata.operation,
          },
        ],
        // Use the original nonce to ensure we sign the same transaction
        options: {
          nonce: metadata.nonce,
        },
      })

      // Sign the transaction
      const signedTransaction = await protocolKit.signTransaction(safeTransaction)

      // Get the signature for the current signer
      const account = privateKeyToAccount(this.privateKey)
      const signature = signedTransaction.signatures.get(account.address.toLowerCase())

      if (!signature) {
        throw new SafeCLIError('Failed to get signature from signed transaction')
      }

      return signature.data
    } catch (error) {
      throw new SafeCLIError(
        `Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Execute a transaction (requires threshold signatures)
  async executeTransaction(
    safeAddress: Address,
    metadata: TransactionMetadata,
    signatures: Array<{ signer: Address; signature: string }>
  ): Promise<string> {
    if (!this.privateKey) {
      throw new SafeCLIError('Private key required to execute transaction')
    }

    try {
      const account = privateKeyToAccount(this.privateKey)

      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        signer: this.privateKey,
        safeAddress,
      })

      // Recreate the transaction from metadata with the original nonce
      const safeTransaction = await protocolKit.createTransaction({
        transactions: [
          {
            to: metadata.to,
            value: metadata.value,
            data: metadata.data,
            operation: metadata.operation,
          },
        ],
        // Use the original nonce to ensure we execute the same transaction
        options: {
          nonce: metadata.nonce,
        },
      })

      // Add all signatures to the transaction
      for (const sig of signatures) {
        safeTransaction.addSignature({
          signer: sig.signer,
          data: sig.signature,
        } as any)
      }

      // Execute the transaction
      const executeTxResponse = await protocolKit.executeTransaction(safeTransaction)

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

      // Wait for transaction confirmation
      const receipt = await client.waitForTransactionReceipt({
        hash: executeTxResponse.hash as `0x${string}`
      })

      return receipt.transactionHash
    } catch (error) {
      throw new SafeCLIError(
        `Failed to execute transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Get Safe threshold
  async getThreshold(safeAddress: Address): Promise<number> {
    try {
      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        safeAddress,
      })

      return await protocolKit.getThreshold()
    } catch (error) {
      throw new SafeCLIError(
        `Failed to get Safe threshold: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Get Safe owners
  async getOwners(safeAddress: Address): Promise<Address[]> {
    try {
      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        safeAddress,
      })

      const owners = await protocolKit.getOwners()
      return owners as Address[]
    } catch (error) {
      throw new SafeCLIError(
        `Failed to get Safe owners: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Get Safe nonce
  async getNonce(safeAddress: Address): Promise<number> {
    try {
      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        safeAddress,
      })

      return await protocolKit.getNonce()
    } catch (error) {
      throw new SafeCLIError(
        `Failed to get Safe nonce: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Create add owner transaction
  async createAddOwnerTransaction(
    safeAddress: Address,
    ownerAddress: Address,
    threshold: number
  ): Promise<CreatedTransaction> {
    try {
      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        safeAddress,
      })

      const safeTransaction = await protocolKit.createAddOwnerTx({
        ownerAddress,
        threshold,
      })

      const safeTxHash = await protocolKit.getTransactionHash(safeTransaction)

      return {
        safeTxHash,
        metadata: {
          to: safeTransaction.data.to as Address,
          value: safeTransaction.data.value,
          data: safeTransaction.data.data as `0x${string}`,
          operation: safeTransaction.data.operation,
          nonce: safeTransaction.data.nonce,
          safeTxGas: safeTransaction.data.safeTxGas,
          baseGas: safeTransaction.data.baseGas,
          gasPrice: safeTransaction.data.gasPrice,
          gasToken: safeTransaction.data.gasToken as Address,
          refundReceiver: safeTransaction.data.refundReceiver as Address,
        },
      }
    } catch (error) {
      throw new SafeCLIError(
        `Failed to create add owner transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Create remove owner transaction
  async createRemoveOwnerTransaction(
    safeAddress: Address,
    ownerAddress: Address,
    threshold: number
  ): Promise<CreatedTransaction> {
    try {
      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        safeAddress,
      })

      const safeTransaction = await protocolKit.createRemoveOwnerTx({
        ownerAddress,
        threshold,
      })

      const safeTxHash = await protocolKit.getTransactionHash(safeTransaction)

      return {
        safeTxHash,
        metadata: {
          to: safeTransaction.data.to as Address,
          value: safeTransaction.data.value,
          data: safeTransaction.data.data as `0x${string}`,
          operation: safeTransaction.data.operation,
          nonce: safeTransaction.data.nonce,
          safeTxGas: safeTransaction.data.safeTxGas,
          baseGas: safeTransaction.data.baseGas,
          gasPrice: safeTransaction.data.gasPrice,
          gasToken: safeTransaction.data.gasToken as Address,
          refundReceiver: safeTransaction.data.refundReceiver as Address,
        },
      }
    } catch (error) {
      throw new SafeCLIError(
        `Failed to create remove owner transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Create change threshold transaction
  async createChangeThresholdTransaction(
    safeAddress: Address,
    threshold: number
  ): Promise<CreatedTransaction> {
    try {
      const protocolKit = await Safe.init({
        provider: this.chain.rpcUrl,
        safeAddress,
      })

      const safeTransaction = await protocolKit.createChangeThresholdTx(threshold)

      const safeTxHash = await protocolKit.getTransactionHash(safeTransaction)

      return {
        safeTxHash,
        metadata: {
          to: safeTransaction.data.to as Address,
          value: safeTransaction.data.value,
          data: safeTransaction.data.data as `0x${string}`,
          operation: safeTransaction.data.operation,
          nonce: safeTransaction.data.nonce,
          safeTxGas: safeTransaction.data.safeTxGas,
          baseGas: safeTransaction.data.baseGas,
          gasPrice: safeTransaction.data.gasPrice,
          gasToken: safeTransaction.data.gasToken as Address,
          refundReceiver: safeTransaction.data.refundReceiver as Address,
        },
      }
    } catch (error) {
      throw new SafeCLIError(
        `Failed to create change threshold transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
