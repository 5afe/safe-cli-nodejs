import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { shortenAddress } from '../../utils/ethereum.js'
import { logError } from '../../ui/messages.js'
import { renderScreen } from '../../ui/render.js'
import { WalletRemoveSuccessScreen } from '../../ui/screens/index.js'

export async function removeWallet() {
  p.intro(pc.bgCyan(pc.black(' Remove Wallet ')))

  const walletStorage = getWalletStorage()
  const wallets = walletStorage.getAllWallets()

  if (wallets.length === 0) {
    logError('No wallets found')
    p.cancel('Operation cancelled')
    return
  }

  const walletId = await p.select({
    message: 'Select wallet to remove:',
    options: wallets.map((wallet) => ({
      value: wallet.id,
      label: `${wallet.name} (${shortenAddress(wallet.address)})`,
    })),
  })

  if (p.isCancel(walletId)) {
    p.cancel('Operation cancelled')
    return
  }

  const wallet = walletStorage.getWallet(walletId as string)!

  const confirm = await p.confirm({
    message: `Are you sure you want to remove wallet "${wallet.name}"? This action cannot be undone.`,
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

  try {
    walletStorage.removeWallet(walletId as string)

    await renderScreen(WalletRemoveSuccessScreen, {
      walletName: wallet.name,
    })
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
