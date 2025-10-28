import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { getConfigStore } from '../../storage/config-store.js'
import { getValidationService } from '../../services/validation-service.js'
import { logError } from '../../ui/messages.js'
import { renderScreen } from '../../ui/render.js'
import { WalletImportSuccessScreen } from '../../ui/screens/index.js'
import { promptPassword, checkCancelled } from '../../utils/command-helpers.js'

export async function importWallet() {
  p.intro('Import Wallet')

  const walletStorage = getWalletStorage()
  const validator = getValidationService()

  // Get password for encryption
  const password = await promptPassword(true)
  if (!password) return

  walletStorage.setPassword(password)

  // Get private key
  const privateKey = await p.password({
    message: 'Enter your private key:',
    validate: (value) => validator.validatePrivateKey(value),
  })

  if (!checkCancelled(privateKey)) return

  // Get wallet name
  const name = await p.text({
    message: 'Give this wallet a name:',
    placeholder: 'my-wallet',
    validate: (value) => validator.validateRequired(value, 'Wallet name'),
  })

  if (p.isCancel(name)) {
    p.cancel('Operation cancelled')
    return
  }

  const spinner = p.spinner()
  spinner.start('Importing wallet...')

  try {
    const wallet = await walletStorage.importWallet(
      name as string,
      privateKey as string,
      password as string
    )
    spinner.stop('Wallet imported successfully')

    // Get default chain for balance check
    const configStore = getConfigStore()
    const defaultChain = configStore.getDefaultChain()

    await renderScreen(WalletImportSuccessScreen, {
      name: wallet.name,
      address: wallet.address as Address,
      chain: defaultChain,
    })
  } catch (error) {
    spinner.stop('Failed to import wallet')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
