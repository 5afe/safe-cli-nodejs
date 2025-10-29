import SafeApiKit from '@safe-global/api-kit'
import type { Address } from 'viem'
import type { ChainConfig } from '../types/config.js'
import type { TransactionMetadata } from '../types/transaction.js'
import { SafeCLIError } from '../utils/errors.js'
import { convertToStagingUrl } from '../utils/url.js'

/**
 * Service for interacting with Safe Transaction Service API
 */
export class SafeTransactionServiceAPI {
  private apiKit: SafeApiKit

  constructor(chain: ChainConfig, options?: { apiKey?: string; useStaging?: boolean }) {
    if (!chain.transactionServiceUrl) {
      throw new SafeCLIError(
        `Transaction Service not available for ${chain.name}. Please configure transactionServiceUrl in chain config.`
      )
    }

    // Convert to staging URL if staging mode is enabled
    let txServiceUrl = convertToStagingUrl(
      chain.transactionServiceUrl,
      options?.useStaging ?? false
    )

    // SafeApiKit expects the URL to include /api path
    // e.g., https://safe-transaction-mainnet.safe.global/api
    if (!txServiceUrl.endsWith('/api')) {
      txServiceUrl = `${txServiceUrl}/api`
    }

    this.apiKit = new SafeApiKit({
      chainId: BigInt(chain.chainId),
      txServiceUrl,
      apiKey: options?.apiKey,
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
      // The API expects addresses in checksummed format
      // Gas params should be strings, not numbers (matching Safe web UI format)
      const { getAddress } = await import('viem')

      // Validate that required fields are present
      if (metadata.nonce === undefined) {
        throw new SafeCLIError('Transaction nonce is required')
      }

      await this.apiKit.proposeTransaction({
        safeAddress: getAddress(safeAddress),
        safeTransactionData: {
          to: getAddress(metadata.to),
          value: metadata.value,
          data: metadata.data,
          operation: metadata.operation ?? 0,
          safeTxGas: metadata.safeTxGas ?? '0',
          baseGas: metadata.baseGas ?? '0',
          gasPrice: metadata.gasPrice ?? '0',
          gasToken: getAddress(metadata.gasToken ?? '0x0000000000000000000000000000000000000000'),
          refundReceiver: getAddress(
            metadata.refundReceiver ?? '0x0000000000000000000000000000000000000000'
          ),
          nonce: metadata.nonce,
        },
        safeTxHash,
        senderAddress: getAddress(sender),
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
  async getPendingTransactions(safeAddress: Address): Promise<Array<Record<string, unknown>>> {
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
  async getAllTransactions(safeAddress: Address): Promise<Array<Record<string, unknown>>> {
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
  async getTransaction(safeTxHash: string): Promise<Record<string, unknown> | null> {
    try {
      return await this.apiKit.getTransaction(safeTxHash)
    } catch (error) {
      // Transaction not found is expected, return null
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        if (
          errorMessage.includes('404') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('no multisigtransaction matches the given query')
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
