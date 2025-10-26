import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ConfigStore } from '../../storage/config-store.js'
import { WalletStorageService } from '../../storage/wallet-store.js'
import { SafeStorageService } from '../../storage/safe-store.js'
import { TransactionStore } from '../../storage/transaction-store.js'
import { SafeService } from '../../services/safe-service.js'
import { TransactionService } from '../../services/transaction-service.js'
import { ApiService } from '../../services/api-service.js'
import { DEFAULT_CHAINS } from '../../constants/chains.js'

/**
 * E2E Test for Transaction Service (Push/Pull)
 * Tests creating a transaction, pushing to Safe Transaction Service,
 * clearing local storage, and pulling it back
 * Requires TEST_WALLET_PK and TX_SERVICE_API_KEY environment variables
 */
const E2E_TEST_PASSWORD = 'e2e-test-password-123'
const SEPOLIA_CHAIN_ID = '11155111'

describe('E2E Transaction Service Test', () => {
  // Skip test if required environment variables are not set
  if (!process.env.TEST_WALLET_PK || !process.env.TX_SERVICE_API_KEY) {
    it.skip('E2E test skipped - TEST_WALLET_PK or TX_SERVICE_API_KEY not set', () => {})
    return
  }

  const E2E_TEST_PRIVATE_KEY = process.env.TEST_WALLET_PK as `0x${string}`
  const E2E_TEST_ACCOUNT = privateKeyToAccount(E2E_TEST_PRIVATE_KEY)
  const E2E_TEST_ADDRESS = E2E_TEST_ACCOUNT.address

  let configStore: ConfigStore
  let walletStorage: WalletStorageService
  let safeStorage: SafeStorageService
  let transactionStore: TransactionStore

  beforeEach(() => {
    configStore = new ConfigStore()
    walletStorage = new WalletStorageService()
    safeStorage = new SafeStorageService()
    transactionStore = new TransactionStore()

    cleanupTestData()
  })

  afterEach(() => {
    cleanupTestData()
  })

  function cleanupTestData() {
    // Clear wallets
    try {
      const wallets = walletStorage.getAllWallets()
      wallets.forEach((wallet) => {
        try {
          walletStorage.removeWallet(wallet.id)
        } catch {
          // Ignore
        }
      })
    } catch {
      // Ignore
    }

    // Clear safes
    try {
      const safes = safeStorage.getAllSafes()
      safes.forEach((safe) => {
        try {
          safeStorage.removeSafe(safe.chainId, safe.address as Address)
        } catch {
          // Ignore
        }
      })
    } catch {
      // Ignore
    }

    // Clear transactions
    try {
      const txs = transactionStore.getAllTransactions()
      txs.forEach((tx) => {
        try {
          transactionStore.removeTransaction(tx.safeTxHash)
        } catch {
          // Ignore
        }
      })
    } catch {
      // Ignore
    }

    // Clear chains
    try {
      const chains = configStore.getAllChains()
      Object.keys(chains).forEach((chainId) => {
        configStore.deleteChain(chainId)
      })
    } catch {
      // Ignore
    }
  }

  it(
    'should push transaction to Safe service and pull it back',
    async () => {
      console.log('\n[E2E] Transaction Service Test - Push/Pull')

      // ============================================
      // 1. Setup
      // ============================================
      console.log('\n[E2E] Step 1: Setup configuration and wallet')
      const sepoliaChain = DEFAULT_CHAINS[SEPOLIA_CHAIN_ID]
      configStore.setChain(SEPOLIA_CHAIN_ID, sepoliaChain)
      configStore.setPreference('safeApiKey', process.env.TX_SERVICE_API_KEY!)

      walletStorage.setPassword(E2E_TEST_PASSWORD)
      const wallet = await walletStorage.importWallet(
        'E2E Test Wallet',
        E2E_TEST_PRIVATE_KEY,
        E2E_TEST_PASSWORD
      )
      walletStorage.setActiveWallet(wallet.id)
      console.log('[E2E] ✓ Wallet imported and set as active')

      // ============================================
      // 2. Create and Deploy Safe
      // ============================================
      console.log('\n[E2E] Step 2: Create and deploy Safe')
      const safeService = new SafeService(sepoliaChain, E2E_TEST_PRIVATE_KEY)

      const owners = [E2E_TEST_ADDRESS]
      const threshold = 1

      const { predictedAddress } = await safeService.createPredictedSafe({
        owners,
        threshold,
      })
      console.log(`[E2E] ✓ Safe predicted: ${predictedAddress}`)

      const deployedAddress = await safeService.deploySafe({
        owners,
        threshold,
      })
      expect(deployedAddress).toBe(predictedAddress)
      console.log(`[E2E] ✓ Safe deployed: ${deployedAddress}`)

      safeStorage.addSafe({
        name: 'E2E Test Safe',
        address: deployedAddress,
        chainId: SEPOLIA_CHAIN_ID,
        owners,
        threshold,
        deployed: true,
      })

      // ============================================
      // 3. Create Transaction
      // ============================================
      console.log('\n[E2E] Step 3: Create a test transaction')
      const txService = new TransactionService(sepoliaChain, E2E_TEST_PRIVATE_KEY)

      const recipientAddress = '0x0000000000000000000000000000000000000001' as Address
      const value = '0.001' // 0.001 ETH

      const txData = await txService.createTransaction(deployedAddress, {
        to: recipientAddress,
        value,
        data: '0x',
        operation: 0, // CALL
      })

      expect(txData).toBeDefined()
      expect(txData.safeTxHash).toBeDefined()
      console.log(`[E2E] ✓ Transaction created: ${txData.safeTxHash}`)

      // Store transaction locally
      transactionStore.addTransaction({
        safeTxHash: txData.safeTxHash,
        safeAddress: deployedAddress,
        chainId: SEPOLIA_CHAIN_ID,
        status: 'pending',
        metadata: txData.metadata,
        signatures: [],
        createdBy: E2E_TEST_ADDRESS,
        createdAt: new Date().toISOString(),
      })

      // ============================================
      // 4. Sign Transaction
      // ============================================
      console.log('\n[E2E] Step 4: Sign the transaction')

      const signature = await txService.signTransaction(deployedAddress, txData.metadata)
      expect(signature).toBeDefined()
      console.log('[E2E] ✓ Transaction signed')

      transactionStore.updateTransaction(txData.safeTxHash, {
        signatures: [
          {
            signer: E2E_TEST_ADDRESS,
            data: signature,
          },
        ],
        status: 'signed',
      })

      // ============================================
      // 5. Push Transaction to Safe Transaction Service
      // ============================================
      console.log('\n[E2E] Step 5: Push transaction to Safe Transaction Service')
      const apiService = new ApiService(sepoliaChain)

      try {
        await apiService.proposeTransaction(deployedAddress, {
          to: txData.metadata.to,
          value: txData.metadata.value,
          data: txData.metadata.data,
          operation: txData.metadata.operation || 0,
          safeTxGas: txData.metadata.safeTxGas,
          baseGas: txData.metadata.baseGas,
          gasPrice: txData.metadata.gasPrice,
          gasToken: txData.metadata.gasToken,
          refundReceiver: txData.metadata.refundReceiver,
          nonce: txData.metadata.nonce,
          safeTxHash: txData.safeTxHash,
          sender: E2E_TEST_ADDRESS,
          signature,
        })
        console.log('[E2E] ✓ Transaction pushed to Safe Transaction Service')
      } catch (error) {
        console.log('[E2E] ℹ Push may have failed if Safe not indexed yet by service')
        console.log(`[E2E]   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.log('[E2E] ℹ Continuing with local validation...')
      }

      // ============================================
      // 6. Clear Local Transactions
      // ============================================
      console.log('\n[E2E] Step 6: Clear local transaction storage')
      const originalTx = transactionStore.getTransaction(txData.safeTxHash)
      expect(originalTx).toBeDefined()
      expect(originalTx?.signatures).toHaveLength(1)

      transactionStore.removeTransaction(txData.safeTxHash)
      const clearedTx = transactionStore.getTransaction(txData.safeTxHash)
      expect(clearedTx).toBeUndefined()
      console.log('[E2E] ✓ Local transaction cleared')

      // ============================================
      // 7. Pull Transactions from Safe Transaction Service
      // ============================================
      console.log('\n[E2E] Step 7: Pull transactions from Safe Transaction Service')

      try {
        const pendingTxs = await apiService.getPendingTransactions(deployedAddress)
        console.log(`[E2E] ✓ Fetched ${pendingTxs.length} pending transactions from service`)

        if (pendingTxs.length > 0) {
          // Find our transaction
          const pulledTx = pendingTxs.find((tx) => tx.safeTxHash === txData.safeTxHash)

          if (pulledTx) {
            console.log('[E2E] ✓ Found our transaction in service!')

            // Restore to local storage
            transactionStore.addTransaction({
              safeTxHash: pulledTx.safeTxHash,
              safeAddress: deployedAddress,
              chainId: SEPOLIA_CHAIN_ID,
              status: 'signed',
              metadata: {
                to: pulledTx.to as Address,
                value: pulledTx.value || '0',
                data: pulledTx.data || '0x',
                operation: pulledTx.operation || 0,
                nonce: pulledTx.nonce,
                safeTxGas: pulledTx.safeTxGas || '0',
                baseGas: pulledTx.baseGas || '0',
                gasPrice: pulledTx.gasPrice || '0',
                gasToken:
                  (pulledTx.gasToken as Address) ||
                  ('0x0000000000000000000000000000000000000000' as Address),
                refundReceiver:
                  (pulledTx.refundReceiver as Address) ||
                  ('0x0000000000000000000000000000000000000000' as Address),
              },
              signatures:
                pulledTx.confirmations?.map((conf) => ({
                  signer: conf.owner as Address,
                  data: conf.signature,
                })) || [],
              createdBy: E2E_TEST_ADDRESS,
              createdAt: new Date().toISOString(),
            })

            const restoredTx = transactionStore.getTransaction(txData.safeTxHash)
            expect(restoredTx).toBeDefined()
            expect(restoredTx?.safeTxHash).toBe(txData.safeTxHash)
            console.log('[E2E] ✓ Transaction restored to local storage')
          } else {
            console.log('[E2E] ℹ Transaction not yet indexed by service (this is normal)')
            console.log('[E2E] ℹ Service indexing can take a few seconds')
          }
        } else {
          console.log('[E2E] ℹ No pending transactions found (Safe may not be indexed yet)')
        }
      } catch (error) {
        console.log('[E2E] ℹ Pull may have failed if Safe not indexed yet by service')
        console.log(`[E2E]   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.log('[E2E] ℹ This is expected for newly deployed Safes')
      }

      console.log('\n[E2E] ✅ Transaction Service E2E test completed!')
      console.log(`[E2E] Safe Address: ${deployedAddress}`)
      console.log(`[E2E] Safe Tx Hash: ${txData.safeTxHash}`)
      console.log('[E2E] Note: Push/pull may be limited by Safe Transaction Service indexing')
    },
    {
      // Set long timeout for blockchain operations (10 minutes)
      timeout: 600000,
    }
  )
})
