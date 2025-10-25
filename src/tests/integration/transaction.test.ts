import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { TransactionStore } from '../../storage/transaction-store.js'
import { SafeAccountStorage } from '../../storage/safe-store.js'
import { WalletStorageService } from '../../storage/wallet-store.js'
import { ConfigStore } from '../../storage/config-store.js'
import { TransactionStatus } from '../../types/transaction.js'
import {
  createTempDir,
  cleanupTempDir,
  TEST_PRIVATE_KEY,
  TEST_PASSWORD,
  TEST_ADDRESS,
  TEST_SAFE_ADDRESS,
  TEST_CHAIN,
  TEST_SAFE_TX_HASH,
} from './test-helpers.js'
import type { Address } from 'viem'

describe('Transaction Integration Tests', () => {
  let tempDir: string
  let transactionStore: TransactionStore
  let safeStorage: SafeAccountStorage
  let walletStorage: WalletStorageService
  let configStore: ConfigStore

  beforeEach(() => {
    tempDir = createTempDir()
    transactionStore = new TransactionStore(tempDir)
    safeStorage = new SafeAccountStorage(tempDir)
    walletStorage = new WalletStorageService(tempDir)
    configStore = new ConfigStore(tempDir)

    // Setup test data
    walletStorage.setPassword(TEST_PASSWORD)
    walletStorage.importWallet(TEST_PRIVATE_KEY, 'Test Wallet')
    walletStorage.setActiveWallet(TEST_ADDRESS)
    configStore.addChain(TEST_CHAIN)
    safeStorage.addSafe({
      address: TEST_SAFE_ADDRESS,
      chainId: TEST_CHAIN.chainId,
      owners: [TEST_ADDRESS],
      threshold: 1,
      name: 'Test Safe',
    })
  })

  afterEach(() => {
    cleanupTempDir(tempDir)
  })

  describe('Transaction Creation and Retrieval', () => {
    it('should create and retrieve transaction', () => {
      transactionStore.createTransaction(
        TEST_SAFE_TX_HASH,
        TEST_SAFE_ADDRESS,
        TEST_CHAIN.chainId,
        {
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
          value: '1000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )

      const tx = transactionStore.getTransaction(TEST_SAFE_TX_HASH)
      expect(tx).not.toBeNull()
      expect(tx?.safeTxHash).toBe(TEST_SAFE_TX_HASH)
      expect(tx?.safeAddress).toBe(TEST_SAFE_ADDRESS)
      expect(tx?.status).toBe(TransactionStatus.PENDING)
    })

    it('should get all transactions', () => {
      transactionStore.createTransaction(
        TEST_SAFE_TX_HASH,
        TEST_SAFE_ADDRESS,
        TEST_CHAIN.chainId,
        {
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
          value: '1000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )

      transactionStore.createTransaction(
        '0x' + '2'.repeat(64),
        TEST_SAFE_ADDRESS,
        TEST_CHAIN.chainId,
        {
          to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
          value: '2000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )

      const transactions = transactionStore.getAllTransactions()
      expect(transactions).toHaveLength(2)
    })

    it('should return null for non-existent transaction', () => {
      const tx = transactionStore.getTransaction('0x' + '9'.repeat(64))
      expect(tx).toBeNull()
    })

    it('should return empty array when no transactions exist', () => {
      const transactions = transactionStore.getAllTransactions()
      expect(transactions).toHaveLength(0)
    })
  })

  describe('Transaction Filtering', () => {
    beforeEach(() => {
      const anotherSafe = '0x9999999999999999999999999999999999999999' as Address

      transactionStore.createTransaction(
        TEST_SAFE_TX_HASH,
        TEST_SAFE_ADDRESS,
        TEST_CHAIN.chainId,
        {
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
          value: '1000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )

      transactionStore.createTransaction(
        '0x' + '2'.repeat(64),
        anotherSafe,
        TEST_CHAIN.chainId,
        {
          to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
          value: '2000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )

      transactionStore.createTransaction(
        '0x' + '3'.repeat(64),
        TEST_SAFE_ADDRESS,
        '137', // Different chain
        {
          to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
          value: '3000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )
    })

    it('should filter transactions by Safe address', () => {
      const safeTxs = transactionStore.getTransactionsBySafe(TEST_SAFE_ADDRESS)
      expect(safeTxs).toHaveLength(2)
      expect(safeTxs.every((tx) => tx.safeAddress === TEST_SAFE_ADDRESS)).toBe(true)
    })

    it('should filter transactions by Safe and chain', () => {
      const safeTxs = transactionStore.getTransactionsBySafe(TEST_SAFE_ADDRESS, TEST_CHAIN.chainId)
      expect(safeTxs).toHaveLength(1)
      expect(safeTxs[0].chainId).toBe(TEST_CHAIN.chainId)
    })
  })

  describe('Transaction Signatures', () => {
    beforeEach(() => {
      transactionStore.createTransaction(
        TEST_SAFE_TX_HASH,
        TEST_SAFE_ADDRESS,
        TEST_CHAIN.chainId,
        {
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
          value: '1000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )
    })

    it('should add signature to transaction', () => {
      transactionStore.addSignature(TEST_SAFE_TX_HASH, {
        signer: TEST_ADDRESS,
        signature: '0x' + '1'.repeat(130),
        signedAt: new Date(),
      })

      const tx = transactionStore.getTransaction(TEST_SAFE_TX_HASH)
      expect(tx?.signatures).toHaveLength(1)
      expect(tx?.signatures[0].signer).toBe(TEST_ADDRESS)
    })

    it('should add multiple signatures', () => {
      transactionStore.addSignature(TEST_SAFE_TX_HASH, {
        signer: TEST_ADDRESS,
        signature: '0x' + '1'.repeat(130),
        signedAt: new Date(),
      })

      transactionStore.addSignature(TEST_SAFE_TX_HASH, {
        signer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
        signature: '0x' + '2'.repeat(130),
        signedAt: new Date(),
      })

      const tx = transactionStore.getTransaction(TEST_SAFE_TX_HASH)
      expect(tx?.signatures).toHaveLength(2)
    })

    it('should not duplicate signatures from same signer', () => {
      transactionStore.addSignature(TEST_SAFE_TX_HASH, {
        signer: TEST_ADDRESS,
        signature: '0x' + '1'.repeat(130),
        signedAt: new Date(),
      })

      transactionStore.addSignature(TEST_SAFE_TX_HASH, {
        signer: TEST_ADDRESS,
        signature: '0x' + '2'.repeat(130),
        signedAt: new Date(),
      })

      const tx = transactionStore.getTransaction(TEST_SAFE_TX_HASH)
      expect(tx?.signatures).toHaveLength(1)
      // Should keep the latest signature
      expect(tx?.signatures[0].signature).toBe('0x' + '2'.repeat(130))
    })
  })

  describe('Transaction Status Management', () => {
    beforeEach(() => {
      transactionStore.createTransaction(
        TEST_SAFE_TX_HASH,
        TEST_SAFE_ADDRESS,
        TEST_CHAIN.chainId,
        {
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
          value: '1000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )
    })

    it('should update transaction status', () => {
      transactionStore.updateTransactionStatus(TEST_SAFE_TX_HASH, TransactionStatus.SIGNED)

      const tx = transactionStore.getTransaction(TEST_SAFE_TX_HASH)
      expect(tx?.status).toBe(TransactionStatus.SIGNED)
    })

    it('should update transaction status to executed', () => {
      transactionStore.updateTransactionStatus(TEST_SAFE_TX_HASH, TransactionStatus.EXECUTED)

      const tx = transactionStore.getTransaction(TEST_SAFE_TX_HASH)
      expect(tx?.status).toBe(TransactionStatus.EXECUTED)
      expect(tx?.executedAt).toBeDefined()
    })

    it('should mark transaction as rejected', () => {
      transactionStore.updateTransactionStatus(TEST_SAFE_TX_HASH, TransactionStatus.REJECTED)

      const tx = transactionStore.getTransaction(TEST_SAFE_TX_HASH)
      expect(tx?.status).toBe(TransactionStatus.REJECTED)
    })

    it('should set execution transaction hash', () => {
      const onChainTxHash = '0x' + 'a'.repeat(64)
      transactionStore.setExecutionTxHash(TEST_SAFE_TX_HASH, onChainTxHash)

      const tx = transactionStore.getTransaction(TEST_SAFE_TX_HASH)
      expect(tx?.txHash).toBe(onChainTxHash)
    })
  })

  describe('Transaction Removal', () => {
    it('should remove transaction', () => {
      transactionStore.createTransaction(
        TEST_SAFE_TX_HASH,
        TEST_SAFE_ADDRESS,
        TEST_CHAIN.chainId,
        {
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
          value: '1000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )

      transactionStore.removeTransaction(TEST_SAFE_TX_HASH)

      const tx = transactionStore.getTransaction(TEST_SAFE_TX_HASH)
      expect(tx).toBeNull()
    })

    it('should not error when removing non-existent transaction', () => {
      expect(() => {
        transactionStore.removeTransaction('0x' + '9'.repeat(64))
      }).not.toThrow()
    })
  })

  describe('Transaction Persistence', () => {
    it('should persist transaction across instances', () => {
      transactionStore.createTransaction(
        TEST_SAFE_TX_HASH,
        TEST_SAFE_ADDRESS,
        TEST_CHAIN.chainId,
        {
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
          value: '1000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )

      // Create new instance with same directory
      const newTransactionStore = new TransactionStore(tempDir)
      const tx = newTransactionStore.getTransaction(TEST_SAFE_TX_HASH)

      expect(tx).not.toBeNull()
      expect(tx?.safeTxHash).toBe(TEST_SAFE_TX_HASH)
    })

    it('should persist signatures across instances', () => {
      transactionStore.createTransaction(
        TEST_SAFE_TX_HASH,
        TEST_SAFE_ADDRESS,
        TEST_CHAIN.chainId,
        {
          to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
          value: '1000000000000000000',
          data: '0x',
        },
        TEST_ADDRESS
      )

      transactionStore.addSignature(TEST_SAFE_TX_HASH, {
        signer: TEST_ADDRESS,
        signature: '0x' + '1'.repeat(130),
        signedAt: new Date(),
      })

      // Create new instance with same directory
      const newTransactionStore = new TransactionStore(tempDir)
      const tx = newTransactionStore.getTransaction(TEST_SAFE_TX_HASH)

      expect(tx?.signatures).toHaveLength(1)
    })
  })
})
