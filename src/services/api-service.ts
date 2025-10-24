import SafeApiKit from '@safe-global/api-kit'
import type { Address } from 'viem'
import type { ChainConfig } from '../types/config.js'
import type { TransactionMetadata, TransactionSignature } from '../types/transaction.js'
import { SafeCLIError } from '../utils/errors.js'

/**
 * Service for interacting with Safe Transaction Service API
 */
export class SafeTransactionServiceAPI {
  private apiKit: SafeApiKit
  private chain: ChainConfig

  constructor(chain: ChainConfig, apiKey?: string) {
    if (!chain.transactionServiceUrl) {
      throw new SafeCLIError(
        `Transaction Service not available for ${chain.name}. Please configure transactionServiceUrl in chain config.`
      )
    }

    this.chain = chain
    this.apiKit = new SafeApiKit({
      chainId: BigInt(chain.chainId),
      apiKey,
    })
  }

  /**
   * Push a transaction to the Transaction Service
   */
  async proposeTransaction(
    safeAddress: Address,
    safeTxHash: string,
    metadata: TransactionMetadata,
    signature: string,
    sender: Address
  ): Promise<void> {
    try {
      await this.apiKit.proposeTransaction({
        safeAddress,
        safeTransactionData: {
          to: metadata.to,
          value: metadata.value,
          data: metadata.data,
          operation: metadata.operation,
          safeTxGas: metadata.safeTxGas,
          baseGas: metadata.baseGas,
          gasPrice: metadata.gasPrice,
          gasToken: metadata.gasToken,
          refundReceiver: metadata.refundReceiver,
          nonce: metadata.nonce,
        },
        safeTxHash,
        senderAddress: sender,
        senderSignature: signature,
      })
    } catch (error) {
      throw new SafeCLIError(
        `Failed to propose transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Add a signature to an existing transaction
   */
  async confirmTransaction(safeTxHash: string, signature: string): Promise<void> {
    try {
      await this.apiKit.confirmTransaction(safeTxHash, signature)
    } catch (error) {
      throw new SafeCLIError(
        `Failed to add signature: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get pending transactions for a Safe
   */
  async getPendingTransactions(safeAddress: Address): Promise<any[]> {
    try {
      const result = await this.apiKit.getPendingTransactions(safeAddress)
      return result.results || []
    } catch (error) {
      throw new SafeCLIError(
        `Failed to fetch pending transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get all transactions for a Safe
   */
  async getAllTransactions(safeAddress: Address): Promise<any[]> {
    try {
      const result = await this.apiKit.getAllTransactions(safeAddress)
      return result.results || []
    } catch (error) {
      throw new SafeCLIError(
        `Failed to fetch transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get a specific transaction by safeTxHash
   */
  async getTransaction(safeTxHash: string): Promise<any> {
    try {
      return await this.apiKit.getTransaction(safeTxHash)
    } catch (error) {
      // Transaction not found is expected, return null
      if (error instanceof Error) {
        if (
          error.message.includes('404') ||
          error.message.includes('No MultisigTransaction matches the given query')
        ) {
          return null
        }
      }
      throw new SafeCLIError(
        `Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
