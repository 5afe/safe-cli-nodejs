import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { SafeTransactionServiceAPI } from '../../services/api-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'
import type { TransactionMetadata } from '../../types/transaction.js'

export async function syncTransactions(account?: string) {
  p.intro(pc.bgCyan(pc.black(' Sync Transactions with Safe API ')))

  try {
    const configStore = getConfigStore()
    const safeStorage = getSafeStorage()
    const walletStorage = getWalletStorage()
    const transactionStore = getTransactionStore()
    const chains = configStore.getAllChains()

    const activeWallet = walletStorage.getActiveWallet()
    if (!activeWallet) {
      p.log.error('No active wallet set. Please import a wallet first.')
      p.outro('Setup required')
      return
    }

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
        message: 'Select Safe to sync:',
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
      p.log.error('Safe must be deployed to sync transactions')
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

    const apiService = new SafeTransactionServiceAPI(chain)

    // Step 1: Pull remote transactions
    console.log('')
    console.log(pc.bold('Step 1: Pulling transactions from Safe API...'))
    console.log('')

    const spinner = p.spinner()
    spinner.start('Fetching remote transactions...')

    let pullImported = 0
    let pullUpdated = 0

    try {
      const remoteTxs = await apiService.getPendingTransactions(address)
      spinner.stop(`Found ${remoteTxs.length} pending transaction(s)`)

      for (const remoteTx of remoteTxs) {
        const safeTxHash = remoteTx.safeTxHash
        const localTx = transactionStore.getTransaction(safeTxHash)

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
          const createdBy = remoteTx.proposer || remoteTx.confirmations?.[0]?.owner || address

          transactionStore.createTransaction(
            safeTxHash,
            address,
            chainId,
            metadata,
            createdBy as Address
          )

          for (const confirmation of remoteTx.confirmations || []) {
            transactionStore.addSignature(safeTxHash, {
              signer: confirmation.owner as Address,
              signature: confirmation.signature,
              signedAt: new Date(confirmation.submissionDate),
            })
          }

          console.log(`  ${pc.green('↓')} Pulled ${safeTxHash.slice(0, 10)}...`)
          pullImported++
        } else {
          const localSigners = new Set(localTx.signatures.map((sig) => sig.signer.toLowerCase()))
          const newSignatures = (remoteTx.confirmations || []).filter(
            (conf: any) => !localSigners.has(conf.owner.toLowerCase())
          )

          if (newSignatures.length > 0) {
            for (const confirmation of newSignatures) {
              transactionStore.addSignature(safeTxHash, {
                signer: confirmation.owner as Address,
                signature: confirmation.signature,
                signedAt: new Date(confirmation.submissionDate),
              })
            }

            console.log(`  ${pc.cyan('↓')} Updated ${safeTxHash.slice(0, 10)}... (+${newSignatures.length} sigs)`)
            pullUpdated++
          }
        }
      }

      if (pullImported === 0 && pullUpdated === 0) {
        console.log(`  ${pc.dim('No new transactions to pull')}`)
      }
    } catch (error) {
      spinner.stop('Pull failed')
      throw error
    }

    // Step 2: Push local transactions
    console.log('')
    console.log(pc.bold('Step 2: Pushing local transactions to Safe API...'))
    console.log('')

    spinner.start('Finding local transactions to push...')

    let pushProposed = 0
    let pushUpdated = 0

    try {
      const localTxs = transactionStore
        .getAllTransactions()
        .filter(
          (tx) =>
            tx.chainId === chainId &&
            tx.safeAddress.toLowerCase() === address.toLowerCase() &&
            (tx.status === 'pending' || tx.status === 'signed')
        )

      spinner.stop(`Found ${localTxs.length} local transaction(s)`)

      for (const localTx of localTxs) {
        // Check if active wallet has signed
        const walletSignature = localTx.signatures.find(
          (sig) => sig.signer.toLowerCase() === activeWallet.address.toLowerCase()
        )

        if (!walletSignature) {
          console.log(`  ${pc.dim('−')} Skipped ${localTx.safeTxHash.slice(0, 10)}... (not signed by active wallet)`)
          continue
        }

        // Check if exists on service
        const existingTx = await apiService.getTransaction(localTx.safeTxHash)

        if (existingTx) {
          // Push new signatures
          const remoteSignatures = existingTx.confirmations || []
          const remoteSigners = new Set(
            remoteSignatures.map((conf: any) => conf.owner.toLowerCase())
          )

          const newSignatures = localTx.signatures.filter(
            (sig) => !remoteSigners.has(sig.signer.toLowerCase())
          )

          if (newSignatures.length > 0) {
            for (const sig of newSignatures) {
              await apiService.confirmTransaction(localTx.safeTxHash, sig.signature)
            }
            console.log(`  ${pc.cyan('↑')} Pushed ${localTx.safeTxHash.slice(0, 10)}... (+${newSignatures.length} sigs)`)
            pushUpdated++
          } else {
            console.log(`  ${pc.dim('−')} Skipped ${localTx.safeTxHash.slice(0, 10)}... (already synced)`)
          }
        } else {
          // Propose transaction
          await apiService.proposeTransaction(
            localTx.safeAddress as Address,
            localTx.safeTxHash,
            localTx.metadata,
            walletSignature.signature,
            activeWallet.address as Address
          )

          // Add additional signatures
          const additionalSignatures = localTx.signatures.filter(
            (sig) => sig.signer.toLowerCase() !== activeWallet.address.toLowerCase()
          )

          for (const sig of additionalSignatures) {
            await apiService.confirmTransaction(localTx.safeTxHash, sig.signature)
          }

          console.log(`  ${pc.green('↑')} Proposed ${localTx.safeTxHash.slice(0, 10)}...`)
          pushProposed++
        }
      }

      if (pushProposed === 0 && pushUpdated === 0) {
        console.log(`  ${pc.dim('No new transactions to push')}`)
      }
    } catch (error) {
      spinner.stop('Push failed')
      throw error
    }

    // Summary
    console.log('')
    console.log(pc.bold('Sync Summary:'))
    console.log(`  ${pc.green(`↓ Pulled: ${pullImported} new, ${pullUpdated} updated`)}`)
    console.log(`  ${pc.green(`↑ Pushed: ${pushProposed} new, ${pushUpdated} updated`)}`)
    console.log('')

    p.outro(pc.green('Sync complete'))
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
