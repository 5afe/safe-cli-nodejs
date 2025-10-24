import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { shortenAddress } from '../../utils/ethereum.js'

export async function listWallets() {
  p.intro(pc.bgCyan(pc.black(' Wallets ')))

  const walletStorage = getWalletStorage()
  const wallets = walletStorage.getAllWallets()
  const activeWallet = walletStorage.getActiveWallet()

  if (wallets.length === 0) {
    console.log('')
    console.log(pc.dim('No wallets found'))
    console.log('')
    p.outro('Use "safe wallet import" to import a wallet')
    return
  }

  console.log('')
  for (const wallet of wallets) {
    const isActive = activeWallet?.id === wallet.id
    const marker = isActive ? pc.green('●') : pc.dim('○')
    const label = isActive ? pc.bold(pc.green(wallet.name)) : wallet.name

    console.log(`${marker} ${label}`)
    console.log(`  ${pc.dim('Address:')} ${wallet.address}`)
    console.log(`  ${pc.dim('Short:')}   ${shortenAddress(wallet.address)}`)
    if (wallet.lastUsed) {
      console.log(`  ${pc.dim('Last used:')} ${new Date(wallet.lastUsed).toLocaleString()}`)
    }
    console.log('')
  }

  if (activeWallet) {
    console.log(pc.dim(`Active wallet: ${activeWallet.name}`))
  }

  p.outro(pc.green(`Total: ${wallets.length} wallet(s)`))
}
