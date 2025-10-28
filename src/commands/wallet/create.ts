import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { getConfigStore } from '../../storage/config-store.js'
import { getValidationService } from '../../services/validation-service.js'
import { logError } from '../../ui/messages.js'
import { renderScreen } from '../../ui/render.js'
import { WalletImportSuccessScreen } from '../../ui/screens/index.js'
import { promptPassword } from '../../utils/command-helpers.js'
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

/**
 * Creates a new wallet with a randomly generated private key.
 * Displays security warnings, generates key, requires backup verification,
 * and stores the wallet encrypted.
 */
export async function createWallet() {
  p.intro('Create New Wallet')

  const validator = getValidationService()

  // Step 1: Show security warnings
  const acceptedWarnings = await showSecurityWarnings()
  if (!acceptedWarnings) {
    p.cancel('Operation cancelled')
    return
  }

  // Step 2: Get password for encryption
  const password = await promptPassword(true)
  if (!password) return

  const walletStorage = getWalletStorage()
  walletStorage.setPassword(password)

  // Step 3: Get wallet name
  const name = await p.text({
    message: 'Give this wallet a name:',
    placeholder: 'my-wallet',
    validate: (value) => validator.validateRequired(value, 'Wallet name'),
  })

  if (p.isCancel(name)) {
    p.cancel('Operation cancelled')
    return
  }

  // Step 4: Generate private key
  const spinner = p.spinner()
  spinner.start('Generating secure private key...')

  let privateKey: `0x${string}`
  try {
    privateKey = generatePrivateKey()
    spinner.stop('Private key generated successfully')
  } catch (error) {
    spinner.stop('Failed to generate private key')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }

  // Step 5: Display private key
  displayPrivateKey(privateKey)

  // Step 6: Verify backup
  const backupConfirmed = await verifyBackup(privateKey)
  if (!backupConfirmed) {
    p.cancel('Operation cancelled - wallet was not saved')
    return
  }

  // Step 7: Store wallet
  spinner.start('Storing wallet...')

  try {
    const wallet = await walletStorage.importWallet(name as string, privateKey, password as string)
    spinner.stop('Wallet created successfully')

    // Get default chain for balance check
    const configStore = getConfigStore()
    const defaultChain = configStore.getDefaultChain()

    await renderScreen(WalletImportSuccessScreen, {
      name: wallet.name,
      address: wallet.address as Address,
      chain: defaultChain,
    })
  } catch (error) {
    spinner.stop('Failed to create wallet')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
