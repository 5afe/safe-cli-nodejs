import Conf from 'conf'
import { randomUUID } from 'crypto'
import type { Address } from 'viem'
import type {
  StoredTransaction,
  TransactionMetadata,
  TransactionSignature,
  TransactionStatus,
} from '../types/transaction.js'
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
    safeAddress: Address,
    chainId: string,
    metadata: TransactionMetadata,
    createdBy: Address
  ): StoredTransaction {
    const id = randomUUID()
    const transaction: StoredTransaction = {
      id,
      safeAddress,
      chainId,
      status: 'pending',
      metadata,
      signatures: [],
      createdBy,
      createdAt: new Date(),
    }

    const transactions = this.store.get('transactions')
    transactions[id] = transaction
    this.store.set('transactions', transactions)

    return transaction
  }

  getTransaction(id: string): StoredTransaction | undefined {
    const transactions = this.store.get('transactions')
    return transactions[id]
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

  addSignature(id: string, signature: TransactionSignature): void {
    const transactions = this.store.get('transactions')
    const transaction = transactions[id]

    if (!transaction) {
      throw new SafeCLIError(`Transaction ${id} not found`)
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

    transactions[id] = transaction
    this.store.set('transactions', transactions)
  }

  updateStatus(id: string, status: TransactionStatus, txHash?: string): void {
    const transactions = this.store.get('transactions')
    const transaction = transactions[id]

    if (!transaction) {
      throw new SafeCLIError(`Transaction ${id} not found`)
    }

    transaction.status = status
    if (status === 'executed') {
      transaction.executedAt = new Date()
      if (txHash) {
        transaction.txHash = txHash
      }
    }

    transactions[id] = transaction
    this.store.set('transactions', transactions)
  }

  setSafeTxHash(id: string, safeTxHash: string): void {
    const transactions = this.store.get('transactions')
    const transaction = transactions[id]

    if (!transaction) {
      throw new SafeCLIError(`Transaction ${id} not found`)
    }

    transaction.safeTxHash = safeTxHash
    transactions[id] = transaction
    this.store.set('transactions', transactions)
  }

  deleteTransaction(id: string): void {
    const transactions = this.store.get('transactions')
    delete transactions[id]
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
