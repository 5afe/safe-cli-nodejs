import * as p from '@clack/prompts'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { SafeTransactionServiceAPI } from '../../services/api-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'
import type { TransactionMetadata } from '../../types/transaction.js'
import { renderScreen } from '../../ui/render.js'
import { TransactionPullSuccessScreen, type TransactionPullResult } from '../../ui/screens/index.js'

interface APITransaction {
  safeTxHash: string
  to: string
  value: string
  data: string
  operation: 0 | 1
  safeTxGas?: string
  baseGas?: string
  gasPrice?: string
  gasToken?: string
  refundReceiver?: string
  nonce: number
  proposer?: string
  confirmations?: Array<{
    owner: string
    signature: string
    submissionDate: string
  }>
}

export async function pullTransactions(account?: string) {
  p.intro('Pull Transactions from Safe API')

  try {
    const configStore = getConfigStore()
    const safeStorage = getSafeStorage()
    const transactionStore = getTransactionStore()
    const chains = configStore.getAllChains()

    // Get Safe
    let chainId: string
    let address: Address

    if (account) {
      // Parse EIP-3770 address
      try {
        const parsed = parseSafeAddress(account, chains)
        chainId = parsed.chainId
        address = parsed.address
      } catch (error) {
        p.log.error(error instanceof Error ? error.message : 'Invalid account')
        p.cancel('Operation cancelled')
        return
      }
    } else {
      // Show interactive selection
      const safes = safeStorage.getAllSafes().filter((s) => s.deployed)
      if (safes.length === 0) {
        p.log.error('No deployed Safes found')
        p.cancel('Use "safe account deploy" to deploy a Safe first')
        return
      }

      const selected = await p.select({
        message: 'Select Safe to pull transactions for:',
        options: safes.map((s) => {
          const chain = configStore.getChain(s.chainId)
          const eip3770 = formatSafeAddress(s.address as Address, s.chainId, chains)
          return {
            value: `${s.chainId}:${s.address}`,
            label: `${s.name} (${eip3770})`,
            hint: chain?.name || s.chainId,
          }
        }),
      })

      if (p.isCancel(selected)) {
        p.cancel('Operation cancelled')
        return
      }

      const [selectedChainId, selectedAddress] = (selected as string).split(':')
      chainId = selectedChainId
      address = selectedAddress as Address
    }

    const safe = safeStorage.getSafe(chainId, address)
    if (!safe) {
      p.log.error(`Safe not found: ${address} on chain ${chainId}`)
      p.cancel('Operation cancelled')
      return
    }

    if (!safe.deployed) {
      p.log.error('Safe must be deployed to pull transactions')
      p.cancel('Operation cancelled')
      return
    }

    // Get chain
    const chain = configStore.getChain(chainId)
    if (!chain) {
      p.log.error(`Chain ${chainId} not found in configuration`)
      p.outro('Failed')
      return
    }

    if (!chain.transactionServiceUrl) {
      p.log.error(`Transaction Service not configured for ${chain.name}`)
      p.outro('Not available')
      return
    }

    const spinner = p.spinner()
    spinner.start('Fetching transactions from Safe Transaction Service...')

    try {
      const apiKey = configStore.getPreferences().safeApiKey
      const apiService = new SafeTransactionServiceAPI(chain, apiKey)

      // Get pending transactions
      const remoteTxs = await apiService.getPendingTransactions(address)

      if (remoteTxs.length === 0) {
        spinner.stop('No pending transactions found')
        p.outro('Up to date')
        return
      }

      spinner.stop(`Found ${remoteTxs.length} pending transaction(s)`)

      let imported = 0
      let updated = 0
      let skipped = 0
      const results: TransactionPullResult[] = []

      for (const remoteTxRaw of remoteTxs) {
        const remoteTx = remoteTxRaw as unknown as APITransaction
        const safeTxHash = remoteTx.safeTxHash
        const localTx = transactionStore.getTransaction(safeTxHash)

        // Convert remote transaction to our metadata format
        const metadata: TransactionMetadata = {
          to: remoteTx.to as Address,
          value: remoteTx.value,
          data: remoteTx.data as `0x${string}`,
          operation: remoteTx.operation,
          safeTxGas: remoteTx.safeTxGas,
          baseGas: remoteTx.baseGas,
          gasPrice: remoteTx.gasPrice,
          gasToken: remoteTx.gasToken as Address,
          refundReceiver: remoteTx.refundReceiver as Address,
          nonce: remoteTx.nonce,
        }

        if (!localTx) {
          // Create new local transaction
          const createdBy = remoteTx.proposer || remoteTx.confirmations?.[0]?.owner || address

          transactionStore.createTransaction(
            safeTxHash,
            address,
            chainId,
            metadata,
            createdBy as Address
          )

          // Add signatures
          for (const confirmation of remoteTx.confirmations || []) {
            transactionStore.addSignature(safeTxHash, {
              signer: confirmation.owner as Address,
              signature: confirmation.signature,
              signedAt: new Date(confirmation.submissionDate).toISOString(),
            })
          }

          results.push({
            safeTxHash,
            status: 'imported',
            signatureCount: remoteTx.confirmations?.length || 0,
          })
          imported++
        } else {
          // Merge signatures
          const localSigners = new Set(
            (localTx.signatures || []).map((sig) => sig.signer.toLowerCase())
          )

          const newSignatures = (
            (remoteTx.confirmations as Array<{
              owner: string
              signature: string
              submissionDate: string
            }>) || []
          ).filter((conf) => !localSigners.has(conf.owner.toLowerCase()))

          if (newSignatures.length > 0) {
            for (const confirmation of newSignatures) {
              transactionStore.addSignature(safeTxHash, {
                signer: confirmation.owner as Address,
                signature: confirmation.signature,
                signedAt: new Date(confirmation.submissionDate).toISOString(),
              })
            }

            results.push({
              safeTxHash,
              status: 'updated',
              signatureCount: newSignatures.length,
            })
            updated++
          } else {
            results.push({
              safeTxHash,
              status: 'skipped',
              signatureCount: 0,
            })
            skipped++
          }
        }
      }

      // Get EIP-3770 address for display
      const eip3770 = formatSafeAddress(address, chainId, chains)

      await renderScreen(TransactionPullSuccessScreen, {
        safeEip3770: eip3770,
        transactions: results,
        imported,
        updated,
        skipped,
      })
    } catch (error) {
      spinner.stop('Failed')
      throw error
    }
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
