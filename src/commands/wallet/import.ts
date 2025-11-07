import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { getConfigStore } from '../../storage/config-store.js'
import { getValidationService } from '../../services/validation-service.js'
import { renderScreen } from '../../ui/render.js'
import { WalletImportSuccessScreen } from '../../ui/screens/index.js'
import {
  checkCancelled,
  isNonInteractiveMode,
  outputSuccess,
  outputError,
} from '../../utils/command-helpers.js'
import { getPassword, validatePasswordSecurity } from '../../utils/password-handler.js'
import { getGlobalOptions } from '../../types/global-options.js'
import { ExitCode } from '../../constants/exit-codes.js'

export interface WalletImportOptions {
  privateKey?: string
  name?: string
}

export async function importWallet(options: WalletImportOptions = {}) {
  if (!isNonInteractiveMode()) {
    p.intro('Import Wallet')
  }

  const walletStorage = getWalletStorage()
  const validator = getValidationService()
  const globalOptions = getGlobalOptions()

  // Get password for encryption
  const password = await getPassword(
    {
      password: globalOptions.password,
      passwordFile: globalOptions.passwordFile,
      passwordEnv: 'SAFE_WALLET_PASSWORD',
    },
    'Create a password to encrypt your wallet:'
  )

  if (!password) {
    outputError('Password is required', ExitCode.AUTH_FAILURE)
  }

  // Validate password security if provided via CLI
  if (globalOptions.password) {
    validatePasswordSecurity({ password: globalOptions.password })
  }

  walletStorage.setPassword(password)

  // Get private key
  let privateKey = options.privateKey
  if (!privateKey) {
    const privateKeyInput = await p.password({
      message: 'Enter your private key:',
      validate: (value) => validator.validatePrivateKey(value),
    })

    if (!checkCancelled(privateKeyInput)) return
    privateKey = privateKeyInput as string
  } else {
    // Validate provided private key
    const error = validator.validatePrivateKey(privateKey)
    if (error) {
      outputError(error, ExitCode.INVALID_ARGS)
    }
  }

  // Get wallet name
  let name = options.name
  if (!name) {
    const nameInput = await p.text({
      message: 'Give this wallet a name:',
      placeholder: 'my-wallet',
      validate: (value) => validator.validateRequired(value, 'Wallet name'),
    })

    if (p.isCancel(nameInput)) {
      p.cancel('Operation cancelled')
      return
    }
    name = nameInput as string
  } else {
    // Validate provided name
    const error = validator.validateRequired(name, 'Wallet name')
    if (error) {
      outputError(error, ExitCode.INVALID_ARGS)
    }
  }

  const spinner = !isNonInteractiveMode() ? p.spinner() : null
  spinner?.start('Importing wallet...')

  try {
    const wallet = await walletStorage.importWallet(name, privateKey, password)
    spinner?.stop('Wallet imported successfully')

    // Get default chain for balance check
    const configStore = getConfigStore()
    const defaultChain = configStore.getDefaultChain()

    if (isNonInteractiveMode()) {
      outputSuccess('Wallet imported successfully', {
        name: wallet.name,
        address: wallet.address,
        type: wallet.type,
      })
    } else {
      await renderScreen(WalletImportSuccessScreen, {
        name: wallet.name,
        address: wallet.address as Address,
        chain: defaultChain,
      })
    }
  } catch (error) {
    spinner?.stop('Failed to import wallet')
    const message = error instanceof Error ? error.message : 'Unknown error'
    outputError(message, ExitCode.ERROR)
  }
}
