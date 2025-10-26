import type { Address } from 'viem'
import type { TransactionMetadata } from '../../types/transaction.js'
import { TEST_ADDRESSES, TEST_TX_HASHES } from './addresses.js'

/**
 * Mock transaction metadata for testing
 */

/**
 * Simple ETH transfer transaction
 */
export const SIMPLE_TRANSFER: TransactionMetadata = {
  to: TEST_ADDRESSES.recipient1,
  value: '1000000000000000000', // 1 ETH in wei
  data: '0x',
}

/**
 * Zero-value transaction
 */
export const ZERO_VALUE_TX: TransactionMetadata = {
  to: TEST_ADDRESSES.recipient1,
  value: '0',
  data: '0x',
}

/**
 * Contract call transaction (ERC20 transfer)
 */
export const ERC20_TRANSFER: TransactionMetadata = {
  to: TEST_ADDRESSES.erc20Token,
  value: '0',
  data: '0xa9059cbb000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000de0b6b3a7640000', // transfer(address,uint256)
}

/**
 * Transaction with custom gas parameters
 */
export const TX_WITH_GAS: TransactionMetadata = {
  to: TEST_ADDRESSES.recipient1,
  value: '1000000000000000000',
  data: '0x',
  safeTxGas: '100000',
  baseGas: '21000',
  gasPrice: '1000000000',
  gasToken: TEST_ADDRESSES.zeroAddress,
  refundReceiver: TEST_ADDRESSES.zeroAddress,
}

/**
 * Transaction with nonce
 */
export const TX_WITH_NONCE: TransactionMetadata = {
  to: TEST_ADDRESSES.recipient1,
  value: '1000000000000000000',
  data: '0x',
  nonce: 0,
}

/**
 * Safe transaction with signatures
 */
export function createMockSafeTransaction(overrides?: Partial<TransactionMetadata>) {
  return {
    to: TEST_ADDRESSES.recipient1,
    value: '1000000000000000000',
    data: '0x',
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: TEST_ADDRESSES.zeroAddress,
    refundReceiver: TEST_ADDRESSES.zeroAddress,
    nonce: 0,
    ...overrides,
  }
}

/**
 * Transaction Builder JSON format (from Safe web app)
 */
export const TX_BUILDER_JSON = {
  version: '1.0',
  chainId: '1',
  createdAt: Date.now(),
  meta: {
    name: 'Test Transaction',
    description: 'Test transaction from Transaction Builder',
    txBuilderVersion: '1.16.3',
  },
  transactions: [
    {
      to: TEST_ADDRESSES.erc20Token,
      value: '0',
      data: null,
      contractMethod: {
        inputs: [
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
        name: 'transfer',
        payable: false,
      },
      contractInputsValues: {
        to: TEST_ADDRESSES.recipient1,
        amount: '1000000000000000000',
      },
    },
  ],
}

/**
 * Transaction Builder JSON with multiple transactions
 */
export const TX_BUILDER_BATCH_JSON = {
  version: '1.0',
  chainId: '1',
  createdAt: Date.now(),
  meta: {
    name: 'Batch Transaction',
    description: 'Multiple transactions in one batch',
    txBuilderVersion: '1.16.3',
  },
  transactions: [
    {
      to: TEST_ADDRESSES.recipient1,
      value: '1000000000000000000',
      data: '0x',
    },
    {
      to: TEST_ADDRESSES.erc20Token,
      value: '0',
      data: null,
      contractMethod: {
        inputs: [
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
        ],
        name: 'approve',
        payable: false,
      },
      contractInputsValues: {
        spender: TEST_ADDRESSES.recipient2,
        amount: '5000000000000000000',
      },
    },
  ],
}

/**
 * Invalid Transaction Builder JSON (missing required fields)
 */
export const INVALID_TX_BUILDER_JSON = {
  version: '1.0',
  // Missing chainId
  transactions: [
    {
      // Missing 'to' address
      value: '0',
      data: '0x',
    },
  ],
}

/**
 * Mock transaction signatures
 */
export function createMockSignature(signer: Address = TEST_ADDRESSES.owner1) {
  return {
    signer,
    signature: '0x' + '1'.repeat(130),
    signedAt: new Date().toISOString(),
  }
}

/**
 * Mock Safe transaction for storage
 */
export function createMockStoredTransaction(
  safeTxHash: string = TEST_TX_HASHES.tx1,
  safeAddress: Address = TEST_ADDRESSES.safe1,
  chainId = '1'
) {
  return {
    safeTxHash,
    safeAddress,
    chainId,
    to: TEST_ADDRESSES.recipient1,
    value: '1000000000000000000',
    data: '0x',
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: TEST_ADDRESSES.zeroAddress,
    refundReceiver: TEST_ADDRESSES.zeroAddress,
    nonce: 0,
    createdBy: TEST_ADDRESSES.owner1,
    createdAt: new Date().toISOString(),
    signatures: [],
    status: 'pending' as const,
  }
}

/**
 * Mock transaction with multiple signatures
 */
export function createMockSignedTransaction() {
  return {
    ...createMockStoredTransaction(),
    signatures: [
      createMockSignature(TEST_ADDRESSES.owner1),
      createMockSignature(TEST_ADDRESSES.owner2),
    ],
    status: 'signed' as const,
  }
}

/**
 * Mock executed transaction
 */
export function createMockExecutedTransaction() {
  return {
    ...createMockSignedTransaction(),
    txHash: TEST_TX_HASHES.tx1,
    executedAt: new Date().toISOString(),
    status: 'executed' as const,
  }
}

/**
 * Owner management transactions
 */
export const ADD_OWNER_TX: TransactionMetadata = {
  to: TEST_ADDRESSES.safe1, // Safe's own address
  value: '0',
  data: '0x0d582f13000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000000000000000001', // addOwnerWithThreshold
}

export const REMOVE_OWNER_TX: TransactionMetadata = {
  to: TEST_ADDRESSES.safe1,
  value: '0',
  data: '0xf8dc5dd9000000000000000000000000000000000000000000000000000000000000000100000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000000000000000000000000000000000000000000001', // removeOwner
}

export const CHANGE_THRESHOLD_TX: TransactionMetadata = {
  to: TEST_ADDRESSES.safe1,
  value: '0',
  data: '0x694e80c30000000000000000000000000000000000000000000000000000000000000002', // changeThreshold(2)
}

/**
 * Helper to create transaction export JSON
 */
export function createTransactionExportJSON(
  transaction: ReturnType<typeof createMockStoredTransaction>
) {
  return {
    version: '1.0',
    chainId: transaction.chainId,
    safeTxHash: transaction.safeTxHash,
    safeAddress: transaction.safeAddress,
    transaction: {
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
      operation: transaction.operation,
      safeTxGas: transaction.safeTxGas,
      baseGas: transaction.baseGas,
      gasPrice: transaction.gasPrice,
      gasToken: transaction.gasToken,
      refundReceiver: transaction.refundReceiver,
      nonce: transaction.nonce,
    },
    signatures: transaction.signatures,
    createdBy: transaction.createdBy,
    createdAt: transaction.createdAt,
  }
}
