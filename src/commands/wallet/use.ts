import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { shortenAddress } from '../../utils/ethereum.js'
import { logError } from '../../ui/messages.js'
import { renderScreen } from '../../ui/render.js'
import { WalletUseSuccessScreen } from '../../ui/screens/index.js'

export async function useWallet() {
  p.intro(pc.bgCyan(pc.black(' Switch Wallet ')))

  const walletStorage = getWalletStorage()
  const wallets = walletStorage.getAllWallets()

  if (wallets.length === 0) {
    logError('No wallets found')
    p.cancel('Use "safe wallet import" to import a wallet first')
    return
  }

  const currentActive = walletStorage.getActiveWallet()

  const walletId = await p.select({
    message: 'Select wallet to use:',
    options: wallets.map((wallet) => ({
      value: wallet.id,
      label: `${wallet.name} (${shortenAddress(wallet.address)})${
        currentActive?.id === wallet.id ? ' [current]' : ''
      }`,
    })),
  })

  if (p.isCancel(walletId)) {
    p.cancel('Operation cancelled')
    return
  }

  try {
    walletStorage.setActiveWallet(walletId as string)
    const wallet = walletStorage.getWallet(walletId as string)!

    await renderScreen(WalletUseSuccessScreen, {
      name: wallet.name,
      address: wallet.address as Address,
    })
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
