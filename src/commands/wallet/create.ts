import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { getConfigStore } from '../../storage/config-store.js'
import { getValidationService } from '../../services/validation-service.js'
import { renderScreen } from '../../ui/render.js'
import { WalletImportSuccessScreen } from '../../ui/screens/index.js'
import { isNonInteractiveMode, outputSuccess, outputError } from '../../utils/command-helpers.js'
import { getPassword, validatePasswordSecurity } from '../../utils/password-handler.js'
import { getGlobalOptions } from '../../types/global-options.js'
import { ExitCode } from '../../constants/exit-codes.js'
import { generatePrivateKey } from '../../utils/key-generation.js'

/**
 * Security warnings displayed before generating a private key.
 */
const SECURITY_WARNINGS = [
  'This command will generate a NEW private key',
  'You are SOLELY responsible for backing it up securely',
  'Loss of your private key = permanent loss of funds',
  'NEVER share your private key with anyone',
  'This CLI stores keys encrypted locally with your password',
]

/**
 * Displays security warnings and gets user confirmation.
 * @returns true if user confirmed, false if cancelled
 */
async function showSecurityWarnings(): Promise<boolean> {
  p.note(SECURITY_WARNINGS.join('\n'), '🔐 Security Warning')

  const confirmed = await p.confirm({
    message: 'Do you understand these risks and wish to continue?',
    initialValue: false,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    return false
  }

  return true
}

/**
 * Displays the generated private key with instructions.
 * @param privateKey - The generated private key
 */
function displayPrivateKey(privateKey: string): void {
  p.note(
    `${privateKey}\n\n` +
      'Write this down and store it in a secure location.\n' +
      'This is the ONLY time it will be displayed in plain text.\n' +
      'Anyone with this key has FULL control of your wallet.',
    '🔑 Your Private Key'
  )
}

/**
 * Verifies that the user has backed up their private key.
 * Requires user to type the last 8 characters of the key.
 *
 * @param privateKey - The private key to verify
 * @returns true if verification succeeded, false if cancelled
 */
async function verifyBackup(privateKey: string): Promise<boolean> {
  const lastChars = privateKey.slice(-8)

  const verify = await p.text({
    message: 'To confirm you have saved it, enter the last 8 characters:',
    placeholder: lastChars,
    validate: (value) => {
      if (!value) return 'Please enter the last 8 characters'
      if (value !== lastChars) return 'Incorrect. Please try again.'
      return undefined
    },
  })

  if (p.isCancel(verify)) {
    return false
  }

  return true
}

export interface WalletCreateOptions {
  name?: string
  skipBackupWarning?: boolean
}

/**
 * Creates a new wallet with a randomly generated private key.
 * Displays security warnings, generates key, requires backup verification,
 * and stores the wallet encrypted.
 */
export async function createWallet(options: WalletCreateOptions = {}) {
  if (!isNonInteractiveMode()) {
    p.intro('Create New Wallet')
  }

  const validator = getValidationService()
  const globalOptions = getGlobalOptions()

  // Step 1: Show security warnings (skip if non-interactive or flag set)
  if (!options.skipBackupWarning && !isNonInteractiveMode()) {
    const acceptedWarnings = await showSecurityWarnings()
    if (!acceptedWarnings) {
      p.cancel('Operation cancelled')
      return
    }
  }

  // Step 2: Get password for encryption
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

  const walletStorage = getWalletStorage()
  walletStorage.setPassword(password)

  // Step 3: Get wallet name
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

  // Step 4: Generate private key
  const spinner = !isNonInteractiveMode() ? p.spinner() : null
  spinner?.start('Generating secure private key...')

  let privateKey: `0x${string}`
  try {
    privateKey = generatePrivateKey()
    spinner?.stop('Private key generated successfully')
  } catch (error) {
    spinner?.stop('Failed to generate private key')
    const message = error instanceof Error ? error.message : 'Unknown error'
    outputError(message, ExitCode.ERROR)
  }

  // Step 5: Display private key (only in interactive mode)
  if (!isNonInteractiveMode()) {
    displayPrivateKey(privateKey)

    // Step 6: Verify backup (only in interactive mode, unless skipped)
    if (!options.skipBackupWarning) {
      const backupConfirmed = await verifyBackup(privateKey)
      if (!backupConfirmed) {
        p.cancel('Operation cancelled - wallet was not saved')
        return
      }
    }
  }

  // Step 7: Store wallet
  spinner?.start('Storing wallet...')

  try {
    const wallet = await walletStorage.importWallet(name, privateKey, password)
    spinner?.stop('Wallet created successfully')

    // Get default chain for balance check
    const configStore = getConfigStore()
    const defaultChain = configStore.getDefaultChain()

    if (isNonInteractiveMode()) {
      outputSuccess('Wallet created successfully', {
        name: wallet.name,
        address: wallet.address,
        type: wallet.type,
        privateKey: privateKey, // Include in automation mode for immediate use
      })
    } else {
      await renderScreen(WalletImportSuccessScreen, {
        name: wallet.name,
        address: wallet.address as Address,
        chain: defaultChain,
      })
    }
  } catch (error) {
    spinner?.stop('Failed to create wallet')
    const message = error instanceof Error ? error.message : 'Unknown error'
    outputError(message, ExitCode.ERROR)
  }
}
