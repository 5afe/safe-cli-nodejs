import type { Address } from 'viem'

export enum TransactionStatus {
  PENDING = 'pending',
  SIGNED = 'signed',
  EXECUTED = 'executed',
  REJECTED = 'rejected',
}

export interface TransactionMetadata {
  to: Address
  value: string
  data: `0x${string}`
  operation?: 0 | 1 // 0 = Call, 1 = DelegateCall
  safeTxGas?: string
  baseGas?: string
  gasPrice?: string
  gasToken?: Address
  refundReceiver?: Address
  nonce?: number
}

export interface TransactionSignature {
  signer: Address
  signature: string
  signedAt: Date
}

export interface StoredTransaction {
  id: string
  safeAddress: Address
  chainId: string
  status: TransactionStatus
  metadata: TransactionMetadata
  signatures: TransactionSignature[]
  createdBy: Address
  createdAt: Date
  executedAt?: Date
  txHash?: string
  safeTxHash?: string
}

export interface CreateTransactionInput {
  safeAddress: Address
  to: Address
  value: string
  data: `0x${string}`
  operation?: 0 | 1
}
