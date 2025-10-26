import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import {
  existsSync,
  unlinkSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmdirSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ConfigStore } from '../../storage/config-store.js'
import { WalletStorageService } from '../../storage/wallet-store.js'
import { SafeStorageService } from '../../storage/safe-store.js'
import { TransactionStore } from '../../storage/transaction-store.js'
import { SafeService } from '../../services/safe-service.js'
import { TransactionService } from '../../services/transaction-service.js'
import { DEFAULT_CHAINS } from '../../constants/chains.js'

/**
 * E2E Test Wallet (ONLY FOR TESTING ON SEPOLIA)
 * This wallet needs to be funded with Sepolia ETH before running the test
 * Private key MUST be provided via TEST_WALLET_PK environment variable
 *
 * Expected wallet address: 0x2d5961897847A30559a26Db99789BEEc7AeEd75e
 */
const E2E_TEST_PASSWORD = 'e2e-test-password-123'
const SEPOLIA_CHAIN_ID = '11155111'

describe('E2E Flow Test', () => {
  // Skip test if TEST_WALLET_PK is not set
  if (!process.env.TEST_WALLET_PK) {
    it.skip('E2E test skipped - TEST_WALLET_PK environment variable not set', () => {})
    return
  }

  const E2E_TEST_PRIVATE_KEY = process.env.TEST_WALLET_PK as `0x${string}`
  const E2E_TEST_ACCOUNT = privateKeyToAccount(E2E_TEST_PRIVATE_KEY)
  const E2E_TEST_ADDRESS = E2E_TEST_ACCOUNT.address

  let configStore: ConfigStore
  let walletStorage: WalletStorageService
  let safeStorage: SafeStorageService
  let transactionStore: TransactionStore
  let tempDir: string

  beforeEach(() => {
    // Initialize stores
    configStore = new ConfigStore()
    walletStorage = new WalletStorageService()
    safeStorage = new SafeStorageService()
    transactionStore = new TransactionStore()

    // Create temp directory for exports
    tempDir = mkdtempSync(join(tmpdir(), 'safe-cli-e2e-'))

    // Clean up any existing data
    cleanupTestData()
  })

  afterEach(() => {
    // Cleanup
    cleanupTestData()

    // Remove temp directory
    try {
      if (existsSync(tempDir)) {
        const files = readdirSync(tempDir)
        files.forEach((file: string) => {
          unlinkSync(join(tempDir, file))
        })
        rmdirSync(tempDir)
      }
    } catch {
      // Ignore cleanup errors
    }
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
    'should complete full E2E flow: init config -> import wallet -> create safe -> deploy -> create tx -> sign -> export -> import -> execute',
    async () => {
      // ============================================
      // 1. Initialize Config with Sepolia chain
      // ============================================
      console.log('\n[E2E] Step 1: Initialize config with Sepolia chain')
      const sepoliaChain = DEFAULT_CHAINS[SEPOLIA_CHAIN_ID]
      expect(sepoliaChain).toBeDefined()
      configStore.setChain(SEPOLIA_CHAIN_ID, sepoliaChain)

      const chain = configStore.getChain(SEPOLIA_CHAIN_ID)
      expect(chain).toBeDefined()
      expect(chain?.name).toBe('Sepolia')
      console.log('[E2E] ✓ Config initialized with Sepolia chain')

      // ============================================
      // 2. Import Wallet
      // ============================================
      console.log('\n[E2E] Step 2: Import wallet')
      walletStorage.setPassword(E2E_TEST_PASSWORD)
      const wallet = await walletStorage.importWallet(
        'E2E Test Wallet',
        E2E_TEST_PRIVATE_KEY,
        E2E_TEST_PASSWORD
      )

      expect(wallet).toBeDefined()
      expect(wallet.address).toBe(E2E_TEST_ADDRESS)
      expect(wallet.name).toBe('E2E Test Wallet')
      console.log(`[E2E] ✓ Wallet imported: ${wallet.address}`)

      // Set as active wallet
      walletStorage.setActiveWallet(wallet.id)
      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).not.toBeNull()
      expect(activeWallet?.address).toBe(E2E_TEST_ADDRESS)

      // ============================================
      // 3. Create Safe (Predicted)
      // ============================================
      console.log('\n[E2E] Step 3: Create predicted Safe account')
      const safeService = new SafeService(sepoliaChain, E2E_TEST_PRIVATE_KEY)

      // Create Safe with single owner (our test wallet) and threshold 1
      const owners = [E2E_TEST_ADDRESS]
      const threshold = 1

      const { predictedAddress } = await safeService.createPredictedSafe({
        owners,
        threshold,
      })

      expect(predictedAddress).toBeDefined()
      console.log(`[E2E] ✓ Safe predicted address: ${predictedAddress}`)

      // Save Safe to storage
      safeStorage.addSafe({
        name: 'E2E Test Safe',
        address: predictedAddress,
        chainId: SEPOLIA_CHAIN_ID,
        owners,
        threshold,
        deployed: false,
        predictedConfig: {
          owners,
          threshold,
        },
      })

      const savedSafe = safeStorage.getSafe(SEPOLIA_CHAIN_ID, predictedAddress)
      expect(savedSafe).toBeDefined()
      expect(savedSafe?.deployed).toBe(false)

      // ============================================
      // 4. Deploy Safe
      // ============================================
      console.log('\n[E2E] Step 4: Deploy Safe to Sepolia')
      console.log('[E2E] NOTE: This requires the test wallet to have Sepolia ETH')

      // Deploy the Safe
      const deployedAddress = await safeService.deploySafe({
        owners,
        threshold,
      })

      expect(deployedAddress).toBeDefined()
      expect(deployedAddress).toBe(predictedAddress)
      console.log(`[E2E] ✓ Safe deployed at: ${deployedAddress}`)

      // Update Safe in storage
      safeStorage.updateSafe(SEPOLIA_CHAIN_ID, deployedAddress, { deployed: true })

      // Verify deployment
      const safeInfo = await safeService.getSafeInfo(deployedAddress)
      expect(safeInfo.isDeployed).toBe(true)
      expect(safeInfo.owners).toEqual(owners)
      expect(safeInfo.threshold).toBe(threshold)
      console.log('[E2E] ✓ Safe deployment verified on-chain')

      // ============================================
      // 5. Create Transaction
      // ============================================
      console.log('\n[E2E] Step 5: Create a test transaction')

      // Create transaction service with private key for signing
      const txService = new TransactionService(sepoliaChain, E2E_TEST_PRIVATE_KEY)

      // Create a simple ETH transfer transaction
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
      expect(txData.metadata).toBeDefined()
      console.log(`[E2E] ✓ Transaction created: ${txData.safeTxHash}`)

      // Save transaction to storage
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
      // 6. Sign Transaction
      // ============================================
      console.log('\n[E2E] Step 6: Sign the transaction')

      const signature = await txService.signTransaction(deployedAddress, txData.metadata)

      expect(signature).toBeDefined()
      console.log('[E2E] ✓ Transaction signed')

      // Update transaction with signature
      const storedTx = transactionStore.getTransaction(txData.safeTxHash)
      expect(storedTx).toBeDefined()

      transactionStore.updateTransaction(txData.safeTxHash, {
        signatures: [
          {
            signer: E2E_TEST_ADDRESS,
            data: signature,
          },
        ],
        status: 'signed',
      })

      const signedTx = transactionStore.getTransaction(txData.safeTxHash)
      expect(signedTx?.status).toBe('signed')
      expect(signedTx?.signatures).toHaveLength(1)

      // ============================================
      // 7. Export Transaction
      // ============================================
      console.log('\n[E2E] Step 7: Export the signed transaction')

      const exportPath = join(tempDir, 'exported-tx.json')
      const exportData = {
        safeTxHash: txData.safeTxHash,
        safe: `sep:${deployedAddress}`,
        chainId: SEPOLIA_CHAIN_ID,
        safeAddress: deployedAddress,
        metadata: signedTx!.metadata,
        signatures: signedTx!.signatures,
        createdBy: E2E_TEST_ADDRESS,
        createdAt: signedTx!.createdAt,
      }

      writeFileSync(exportPath, JSON.stringify(exportData), 'utf-8')
      expect(existsSync(exportPath)).toBe(true)
      console.log(`[E2E] ✓ Transaction exported to: ${exportPath}`)

      // ============================================
      // 8. Import Transaction Again
      // ============================================
      console.log('\n[E2E] Step 8: Clear and re-import the transaction')

      // Remove the transaction from storage
      transactionStore.removeTransaction(txData.safeTxHash)
      expect(transactionStore.getTransaction(txData.safeTxHash)).toBeUndefined()

      // Re-import from file
      const importedData = JSON.parse(readFileSync(exportPath, 'utf-8'))
      expect(importedData.safeTxHash).toBe(txData.safeTxHash)

      transactionStore.addTransaction({
        safeTxHash: importedData.safeTxHash,
        safeAddress: importedData.safeAddress,
        chainId: importedData.chainId,
        status: 'signed',
        metadata: importedData.metadata,
        signatures: importedData.signatures,
        createdBy: importedData.createdBy,
        createdAt: importedData.createdAt,
      })

      const reimportedTx = transactionStore.getTransaction(txData.safeTxHash)
      expect(reimportedTx).toBeDefined()
      expect(reimportedTx?.safeTxHash).toBe(txData.safeTxHash)
      expect(reimportedTx?.signatures).toHaveLength(1)
      console.log('[E2E] ✓ Transaction re-imported successfully')

      // ============================================
      // 9. Execute Transaction
      // ============================================
      console.log('\n[E2E] Step 9: Execute the signed transaction')

      const executionTxHash = await txService.executeTransaction(
        deployedAddress,
        reimportedTx!.metadata,
        reimportedTx!.signatures.map((sig) => ({
          signer: sig.signer,
          signature: sig.data,
        }))
      )

      expect(executionTxHash).toBeDefined()
      console.log(`[E2E] ✓ Transaction executed! Tx hash: ${executionTxHash}`)

      // Update transaction status
      transactionStore.updateTransaction(txData.safeTxHash, {
        status: 'executed',
        executedAt: new Date().toISOString(),
        executionTxHash: executionTxHash,
      })

      const executedTx = transactionStore.getTransaction(txData.safeTxHash)
      expect(executedTx?.status).toBe('executed')
      expect(executedTx?.executionTxHash).toBeDefined()

      console.log('\n[E2E] ✅ Full E2E flow completed successfully!')
      console.log(`[E2E] Safe Address: ${deployedAddress}`)
      console.log(`[E2E] Safe Tx Hash: ${txData.safeTxHash}`)
      console.log(`[E2E] Execution Tx Hash: ${executionTxHash}`)
    },
    {
      // Set long timeout for blockchain operations (5 minutes)
      timeout: 300000,
    }
  )
})
