import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ConfigStore } from '../../storage/config-store.js'
import { WalletStorageService } from '../../storage/wallet-store.js'
import { SafeStorageService } from '../../storage/safe-store.js'
import { TransactionStore } from '../../storage/transaction-store.js'
import { SafeService } from '../../services/safe-service.js'
import { TransactionService } from '../../services/transaction-service.js'
import { ContractService } from '../../services/contract-service.js'
import { ABIService } from '../../services/abi-service.js'
import { TransactionBuilder } from '../../services/transaction-builder.js'
import { DEFAULT_CHAINS } from '../../constants/chains.js'

/**
 * E2E Test for Transaction Builder
 * Tests ABI fetching, contract interaction, and transaction building
 * Requires TEST_WALLET_PK and ETHERSCAN_API_KEY environment variables
 */
const E2E_TEST_PASSWORD = 'e2e-test-password-123'
const SEPOLIA_CHAIN_ID = '11155111'

// DAI token on Sepolia testnet
const DAI_SEPOLIA = '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6' as Address
const APPROVAL_AMOUNT = '100' // 100 DAI

describe('E2E Transaction Builder Test', () => {
  // Skip test if required environment variables are not set
  if (!process.env.TEST_WALLET_PK || !process.env.ETHERSCAN_API_KEY) {
    it.skip('E2E test skipped - TEST_WALLET_PK or ETHERSCAN_API_KEY not set', () => {})
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
    'should fetch ABI from Etherscan and build ERC20 approval transaction',
    async () => {
      console.log('\n[E2E] Transaction Builder Test - ERC20 Approval')

      // ============================================
      // 1. Setup
      // ============================================
      console.log('\n[E2E] Step 1: Setup configuration and wallet')
      const sepoliaChain = DEFAULT_CHAINS[SEPOLIA_CHAIN_ID]
      configStore.setChain(SEPOLIA_CHAIN_ID, sepoliaChain)
      configStore.setPreference('etherscanApiKey', process.env.ETHERSCAN_API_KEY!)

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
      // 3. Fetch Contract ABI from Etherscan
      // ============================================
      console.log('\n[E2E] Step 3: Fetch DAI contract ABI from Etherscan')
      const contractService = new ContractService(sepoliaChain)

      const abi = await contractService.getContractABI(DAI_SEPOLIA)
      expect(abi).toBeDefined()
      expect(Array.isArray(abi)).toBe(true)
      expect(abi.length).toBeGreaterThan(0)
      console.log(`[E2E] ✓ Fetched ABI with ${abi.length} functions/events`)

      // ============================================
      // 4. Parse ABI and Find Approve Function
      // ============================================
      console.log('\n[E2E] Step 4: Parse ABI and find approve function')
      const abiService = new ABIService(abi)
      const functions = abiService.getFunctions()

      const approveFunction = functions.find((fn) => fn.name === 'approve')
      expect(approveFunction).toBeDefined()
      expect(approveFunction?.inputs).toHaveLength(2) // spender, amount
      console.log('[E2E] ✓ Found approve function in ABI')
      console.log(
        `[E2E]   Inputs: ${approveFunction?.inputs.map((i) => `${i.name}:${i.type}`).join(', ')}`
      )

      // ============================================
      // 5. Build Approval Transaction
      // ============================================
      console.log('\n[E2E] Step 5: Build ERC20 approval transaction')
      const transactionBuilder = new TransactionBuilder(abi, SEPOLIA_CHAIN_ID, DEFAULT_CHAINS)

      // Build the transaction data for approving 100 DAI to the Safe itself
      // (This is safe since we control the Safe)
      const approvalData = await transactionBuilder.buildTransaction(approveFunction!, {
        spender: deployedAddress, // Approve the Safe to spend tokens
        amount: APPROVAL_AMOUNT,
      })

      expect(approvalData).toBeDefined()
      expect(approvalData.to).toBe(DAI_SEPOLIA)
      expect(approvalData.data).toBeDefined()
      expect(approvalData.data.startsWith('0x')).toBe(true)
      console.log('[E2E] ✓ Built approval transaction')
      console.log(`[E2E]   To: ${approvalData.to}`)
      console.log(`[E2E]   Data: ${approvalData.data.slice(0, 20)}...`)

      // ============================================
      // 6. Create Safe Transaction
      // ============================================
      console.log('\n[E2E] Step 6: Create Safe transaction for approval')
      const txService = new TransactionService(sepoliaChain, E2E_TEST_PRIVATE_KEY)

      const txData = await txService.createTransaction(deployedAddress, {
        to: approvalData.to,
        value: approvalData.value || '0',
        data: approvalData.data,
        operation: 0, // CALL
      })

      expect(txData).toBeDefined()
      expect(txData.safeTxHash).toBeDefined()
      expect(txData.metadata).toBeDefined()
      console.log(`[E2E] ✓ Transaction created: ${txData.safeTxHash}`)

      // ============================================
      // 7. Sign and Execute Transaction
      // ============================================
      console.log('\n[E2E] Step 7: Sign and execute transaction')

      const signature = await txService.signTransaction(deployedAddress, txData.metadata)
      expect(signature).toBeDefined()
      console.log('[E2E] ✓ Transaction signed')

      // Note: We won't execute this transaction as it requires the Safe to have DAI
      // This test validates the transaction building pipeline, not actual execution
      console.log('[E2E] ℹ Skipping execution (requires Safe to hold DAI tokens)')

      console.log('\n[E2E] ✅ Transaction Builder E2E test completed successfully!')
      console.log(`[E2E] Safe Address: ${deployedAddress}`)
      console.log(`[E2E] Token Address: ${DAI_SEPOLIA}`)
      console.log(`[E2E] Safe Tx Hash: ${txData.safeTxHash}`)
    },
    {
      // Set long timeout for blockchain operations (10 minutes)
      timeout: 600000,
    }
  )
})
