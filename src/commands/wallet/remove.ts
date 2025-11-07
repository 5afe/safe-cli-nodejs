import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { shortenAddress } from '../../utils/ethereum.js'
import { renderScreen } from '../../ui/render.js'
import { WalletRemoveSuccessScreen } from '../../ui/screens/index.js'
import { isNonInteractiveMode, outputSuccess, outputError } from '../../utils/command-helpers.js'
import { ExitCode } from '../../constants/exit-codes.js'

export interface WalletRemoveOptions {
  address?: string
  name?: string
  force?: boolean
}

export async function removeWallet(options: WalletRemoveOptions = {}) {
  if (!isNonInteractiveMode()) {
    p.intro(pc.bgCyan(pc.black(' Remove Wallet ')))
  }

  const walletStorage = getWalletStorage()
  const wallets = walletStorage.getAllWallets()

  if (wallets.length === 0) {
    outputError('No wallets found', ExitCode.WALLET_ERROR)
  }

  let walletId: string | undefined
  let wallet: ReturnType<typeof walletStorage.getWallet> | undefined

  // If address or name provided, find the wallet
  if (options.address || options.name) {
    wallet = wallets.find((w) => {
      if (options.address) return w.address.toLowerCase() === options.address.toLowerCase()
      if (options.name) return w.name === options.name
      return false
    })

    if (!wallet) {
      const criteria = options.address ? `address: ${options.address}` : `name: ${options.name}`
      outputError(`Wallet not found with ${criteria}`, ExitCode.WALLET_ERROR)
    }

    walletId = wallet.id
  } else {
    // Interactive mode - prompt user to select
    const selected = await p.select({
      message: 'Select wallet to remove:',
      options: wallets.map((w) => ({
        value: w.id,
        label: `${w.name} (${shortenAddress(w.address)})`,
      })),
    })

    if (p.isCancel(selected)) {
      p.cancel('Operation cancelled')
      return
    }

    walletId = selected as string
    wallet = walletStorage.getWallet(walletId)
  }

  // Confirmation (skip if --force provided)
  if (!options.force && !isNonInteractiveMode()) {
    const confirm = await p.confirm({
      message: `Are you sure you want to remove wallet "${wallet!.name}"? This action cannot be undone.`,
    })

    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Operation cancelled')
      return
    }

    const doubleConfirm = await p.confirm({
      message: pc.red('⚠️  Final confirmation: Remove this wallet permanently?'),
    })

    if (p.isCancel(doubleConfirm) || !doubleConfirm) {
      p.cancel('Operation cancelled')
      return
    }
  }

  try {
    walletStorage.removeWallet(walletId!)

    if (isNonInteractiveMode()) {
      outputSuccess('Wallet removed successfully', {
        name: wallet!.name,
        address: wallet!.address,
      })
    } else {
      await renderScreen(WalletRemoveSuccessScreen, {
        walletName: wallet!.name,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    outputError(message, ExitCode.ERROR)
  }
}
