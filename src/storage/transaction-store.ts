import Conf from 'conf'
import { tmpdir } from 'os'
import type { Address } from 'viem'
import type {
  StoredTransaction,
  TransactionMetadata,
  TransactionSignature,
} from '../types/transaction.js'
import { TransactionStatus } from '../types/transaction.js'
import { SafeCLIError } from '../utils/errors.js'

interface TransactionStoreSchema {
  transactions: Record<string, StoredTransaction>
}

export class TransactionStore {
  private store: Conf<TransactionStoreSchema>

  constructor(options?: { cwd?: string; projectName?: string }) {
    // SAFETY: Prevent test mode from touching production config
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      if (options?.cwd) {
        const tmp = tmpdir()
        const isTempDir =
          options.cwd.includes(tmp) ||
          options.cwd.includes('/tmp') ||
          options.cwd.includes('\\Temp')
        if (!isTempDir) {
          throw new Error(
            'CRITICAL SAFETY CHECK: Test mode requires cwd to be in temp directory! ' +
              `Got: ${options.cwd}. Use createTestStorage() from src/tests/helpers/test-storage.ts`
          )
        }
      }
    }

    this.store = new Conf<TransactionStoreSchema>({
      projectName: options?.projectName || 'safe-cli',
      configName: 'transactions',
      cwd: options?.cwd,
      defaults: {
        transactions: {},
      },
    })
  }

  createTransaction(
    safeTxHash: string,
    safeAddress: Address,
    chainId: string,
    metadata: TransactionMetadata,
    createdBy: Address
  ): StoredTransaction {
    const transaction: StoredTransaction = {
      safeTxHash,
      safeAddress,
      chainId,
      status: TransactionStatus.PENDING,
      metadata,
      signatures: [],
      createdBy,
      createdAt: new Date().toISOString(),
    }

    const transactions = this.store.get('transactions')
    transactions[safeTxHash] = transaction
    this.store.set('transactions', transactions)

    return transaction
  }

  private normalizeTransaction(tx: StoredTransaction): StoredTransaction {
    // Ensure signatures array is initialized
    if (!tx.signatures) {
      tx.signatures = []
    }
    return tx
  }

  getTransaction(safeTxHash: string): StoredTransaction | undefined {
    const transactions = this.store.get('transactions')
    const tx = transactions[safeTxHash]
    return tx ? this.normalizeTransaction(tx) : undefined
  }

  getTransactionsBySafe(safeAddress: Address, chainId?: string): StoredTransaction[] {
    const transactions = this.store.get('transactions')
    return Object.values(transactions)
      .filter(
        (tx) =>
          tx.safeAddress.toLowerCase() === safeAddress.toLowerCase() &&
          (!chainId || tx.chainId === chainId)
      )
      .map((tx) => this.normalizeTransaction(tx))
  }

  getAllTransactions(): StoredTransaction[] {
    const transactions = this.store.get('transactions')
    return Object.values(transactions).map((tx) => this.normalizeTransaction(tx))
  }

  addSignature(safeTxHash: string, signature: TransactionSignature): void {
    const transactions = this.store.get('transactions')
    const transaction = transactions[safeTxHash]

    if (!transaction) {
      throw new SafeCLIError(`Transaction ${safeTxHash} not found`)
    }

    // Initialize signatures array if it's null or undefined
    if (!transaction.signatures) {
      transaction.signatures = []
    }

    // Check if this signer has already signed
    const existingSignatureIndex = transaction.signatures.findIndex(
      (sig) => sig.signer.toLowerCase() === signature.signer.toLowerCase()
    )

    if (existingSignatureIndex >= 0) {
      // Replace existing signature
      transaction.signatures[existingSignatureIndex] = signature
    } else {
      // Add new signature
      transaction.signatures.push(signature)
    }

    transactions[safeTxHash] = transaction
    this.store.set('transactions', transactions)
  }

  updateStatus(safeTxHash: string, status: TransactionStatus, txHash?: string): void {
    const transactions = this.store.get('transactions')
    const transaction = transactions[safeTxHash]

    if (!transaction) {
      throw new SafeCLIError(`Transaction ${safeTxHash} not found`)
    }

    transaction.status = status
    if (status === 'executed') {
      transaction.executedAt = new Date().toISOString()
      if (txHash) {
        transaction.txHash = txHash
      }
    }

    transactions[safeTxHash] = transaction
    this.store.set('transactions', transactions)
  }

  deleteTransaction(safeTxHash: string): void {
    const transactions = this.store.get('transactions')
    delete transactions[safeTxHash]
    this.store.set('transactions', transactions)
  }

  getStorePath(): string {
    return this.store.path
  }
}

// Singleton instance
let transactionStore: TransactionStore | undefined

export function getTransactionStore(): TransactionStore {
  if (!transactionStore) {
    transactionStore = new TransactionStore()
  }
  return transactionStore
}
