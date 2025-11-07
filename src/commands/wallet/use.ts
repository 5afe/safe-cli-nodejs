import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { shortenAddress } from '../../utils/ethereum.js'
import { renderScreen } from '../../ui/render.js'
import { WalletUseSuccessScreen } from '../../ui/screens/index.js'
import { isNonInteractiveMode, outputSuccess, outputError } from '../../utils/command-helpers.js'
import { ExitCode } from '../../constants/exit-codes.js'

export interface WalletUseOptions {
  address?: string
  name?: string
}

export async function useWallet(options: WalletUseOptions = {}) {
  if (!isNonInteractiveMode()) {
    p.intro('Switch Wallet')
  }

  const walletStorage = getWalletStorage()
  const wallets = walletStorage.getAllWallets()

  if (wallets.length === 0) {
    outputError(
      'No wallets found. Use "safe wallet import" to import a wallet first',
      ExitCode.WALLET_ERROR
    )
  }

  let walletId: string | undefined

  // If address or name provided, find the wallet
  if (options.address || options.name) {
    const wallet = wallets.find((w) => {
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
    const currentActive = walletStorage.getActiveWallet()

    const selected = await p.select({
      message: 'Select wallet to use:',
      options: wallets.map((wallet) => ({
        value: wallet.id,
        label: `${wallet.name} (${shortenAddress(wallet.address)})${
          currentActive?.id === wallet.id ? ' [current]' : ''
        }`,
      })),
    })

    if (p.isCancel(selected)) {
      p.cancel('Operation cancelled')
      return
    }

    walletId = selected as string
  }

  try {
    walletStorage.setActiveWallet(walletId)
    const wallet = walletStorage.getWallet(walletId)!

    if (isNonInteractiveMode()) {
      outputSuccess('Wallet switched successfully', {
        name: wallet.name,
        address: wallet.address,
      })
    } else {
      await renderScreen(WalletUseSuccessScreen, {
        name: wallet.name,
        address: wallet.address as Address,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    outputError(message, ExitCode.ERROR)
  }
}
