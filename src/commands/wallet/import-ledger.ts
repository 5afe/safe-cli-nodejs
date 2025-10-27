import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { getConfigStore } from '../../storage/config-store.js'
import {
  LedgerService,
  DERIVATION_PATHS,
  isValidDerivationPath,
} from '../../services/ledger-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { renderScreen } from '../../ui/render.js'
import { WalletImportSuccessScreen } from '../../ui/screens/index.js'

export async function importLedgerWallet() {
  p.intro('Import Ledger Hardware Wallet')

  try {
    const walletStorage = getWalletStorage()

    // Check if device is connected
    p.log.info('Searching for Ledger device...')
    if (!(await LedgerService.isDeviceConnected())) {
      p.log.warn('No Ledger device found')
      p.log.info('Please connect your Ledger device, unlock it, and open the Ethereum app')

      const spinner = p.spinner()
      spinner.start('Waiting for device...')

      try {
        await LedgerService.waitForDevice(60000) // 60 second timeout
        spinner.stop('Device detected!')
      } catch {
        spinner.stop('Timeout')
        p.log.error('Could not detect Ledger device. Please try again.')
        p.outro('Failed')
        return
      }
    }

    // Select derivation path type
    const pathType = (await p.select({
      message: 'Select derivation path',
      options: [
        {
          value: 'ledger-live',
          label: "Ledger Live (m/44'/60'/0'/0/0)",
          hint: 'Default for Ledger Live (recommended)',
        },
        {
          value: 'legacy',
          label: "Legacy MEW (m/44'/60'/0'/0)",
          hint: 'Compatible with MyEtherWallet/MyCrypto',
        },
        {
          value: 'custom',
          label: 'Custom path',
          hint: 'Advanced: specify your own BIP44 path',
        },
      ],
      initialValue: 'ledger-live',
    })) as string

    if (p.isCancel(pathType)) {
      p.cancel('Operation cancelled')
      return
    }

    let derivationPath: string
    let accountIndex = 0

    if (pathType === 'custom') {
      const customPath = (await p.text({
        message: 'Enter custom derivation path',
        placeholder: "44'/60'/0'/0/0",
        validate: (value) => {
          if (!value) return 'Derivation path is required'
          if (!isValidDerivationPath(value)) {
            return "Invalid derivation path format. Expected: m/44'/60'/x'/x/x or 44'/60'/x'/x/x"
          }
          return undefined
        },
      })) as string

      if (p.isCancel(customPath)) {
        p.cancel('Operation cancelled')
        return
      }

      derivationPath = customPath.startsWith('m/') ? customPath : `m/${customPath}`
    } else {
      // Ask for account index
      const indexInput = (await p.text({
        message: 'Enter account index',
        placeholder: '0',
        initialValue: '0',
        validate: (value) => {
          const num = parseInt(value, 10)
          if (isNaN(num) || num < 0 || num > 2147483647) {
            return 'Invalid account index. Must be between 0 and 2147483647'
          }
          return undefined
        },
      })) as string

      if (p.isCancel(indexInput)) {
        p.cancel('Operation cancelled')
        return
      }

      accountIndex = parseInt(indexInput, 10)
      derivationPath =
        pathType === 'ledger-live'
          ? DERIVATION_PATHS.LEDGER_LIVE(accountIndex)
          : DERIVATION_PATHS.LEGACY(accountIndex)

      // Add m/ prefix for display
      derivationPath = `m/${derivationPath}`
    }

    // Connect to Ledger and get address
    const spinner = p.spinner()
    spinner.start('Connecting to Ledger device...')

    let address: string
    try {
      const ledgerService = new LedgerService()
      await ledgerService.connect()

      spinner.message('Fetching address from Ledger...')
      spinner.message('⚠️  Please verify the address on your device')

      address = await ledgerService.getAddress(derivationPath)

      await ledgerService.disconnect()
      spinner.stop('Address retrieved')
    } catch (error) {
      spinner.stop('Failed')
      if (error instanceof SafeCLIError) {
        p.log.error(error.message)
      } else {
        p.log.error(
          `Failed to connect to Ledger: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
      p.log.warn('Make sure your Ledger is connected, unlocked, and the Ethereum app is open')
      p.outro('Failed')
      return
    }

    // Show address to user
    p.log.success(`Address: ${address}`)
    p.log.info(`Derivation path: ${derivationPath}`)
    console.log('')

    // Confirm address
    const confirmAddress = await p.confirm({
      message: 'Does this address match what is shown on your Ledger device?',
      initialValue: true,
    })

    if (!confirmAddress || p.isCancel(confirmAddress)) {
      p.cancel('Import cancelled. Please verify the address on your device.')
      return
    }

    // Get wallet name
    const name = (await p.text({
      message: 'Enter a name for this wallet',
      placeholder: 'My Ledger',
      validate: (value) => {
        if (!value || value.trim().length === 0) return 'Name is required'
        return undefined
      },
    })) as string

    if (p.isCancel(name)) {
      p.cancel('Operation cancelled')
      return
    }

    // Import wallet
    const wallet = await walletStorage.importLedgerWallet(name.trim(), address, derivationPath)

    // Get default chain for balance check
    const configStore = getConfigStore()
    const defaultChain = configStore.getDefaultChain()

    await renderScreen(WalletImportSuccessScreen, {
      name: wallet.name,
      address: wallet.address as Address,
      chain: defaultChain,
    })
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
