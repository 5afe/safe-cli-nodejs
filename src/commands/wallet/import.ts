import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { isValidPrivateKey } from '../../utils/validation.js'
import { logError } from '../../ui/messages.js'
import { renderScreen } from '../../ui/render.js'
import { WalletImportSuccessScreen } from '../../ui/screens/index.js'

export async function importWallet() {
  p.intro('Import Wallet')

  const walletStorage = getWalletStorage()

  // Get password for encryption
  const password = await p.password({
    message: 'Create a password to encrypt your wallet:',
    validate: (value) => {
      if (!value) return 'Password is required'
      if (value.length < 8) return 'Password must be at least 8 characters'
      return undefined
    },
  })

  if (p.isCancel(password)) {
    p.cancel('Operation cancelled')
    return
  }

  const confirmPassword = await p.password({
    message: 'Confirm password:',
    validate: (value) => {
      if (value !== password) return 'Passwords do not match'
      return undefined
    },
  })

  if (p.isCancel(confirmPassword)) {
    p.cancel('Operation cancelled')
    return
  }

  walletStorage.setPassword(password as string)

  // Get private key
  const privateKey = await p.password({
    message: 'Enter your private key:',
    validate: (value) => {
      if (!value) return 'Private key is required'
      if (!isValidPrivateKey(value)) {
        return 'Invalid private key format. Must be a 64-character hex string (with or without 0x prefix)'
      }
      return undefined
    },
  })

  if (p.isCancel(privateKey)) {
    p.cancel('Operation cancelled')
    return
  }

  // Get wallet name
  const name = await p.text({
    message: 'Give this wallet a name:',
    placeholder: 'my-wallet',
    validate: (value) => (!value ? 'Wallet name is required' : undefined),
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

    await renderScreen(WalletImportSuccessScreen, {
      name: wallet.name,
      address: wallet.address as Address,
    })
  } catch (error) {
    spinner.stop('Failed to import wallet')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
