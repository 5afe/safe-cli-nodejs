import Conf from 'conf'
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

  constructor() {
    this.store = new Conf<TransactionStoreSchema>({
      projectName: 'safe-cli-nodejs',
      configName: 'transactions',
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
      createdAt: new Date(),
    }

    const transactions = this.store.get('transactions')
    transactions[safeTxHash] = transaction
    this.store.set('transactions', transactions)

    return transaction
  }

  getTransaction(safeTxHash: string): StoredTransaction | undefined {
    const transactions = this.store.get('transactions')
    return transactions[safeTxHash]
  }

  getTransactionsBySafe(safeAddress: Address, chainId?: string): StoredTransaction[] {
    const transactions = this.store.get('transactions')
    return Object.values(transactions).filter(
      (tx) =>
        tx.safeAddress.toLowerCase() === safeAddress.toLowerCase() &&
        (!chainId || tx.chainId === chainId)
    )
  }

  getAllTransactions(): StoredTransaction[] {
    const transactions = this.store.get('transactions')
    return Object.values(transactions)
  }

  addSignature(safeTxHash: string, signature: TransactionSignature): void {
    const transactions = this.store.get('transactions')
    const transaction = transactions[safeTxHash]

    if (!transaction) {
      throw new SafeCLIError(`Transaction ${safeTxHash} not found`)
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
      transaction.executedAt = new Date()
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
