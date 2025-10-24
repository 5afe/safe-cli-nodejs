import { Command } from 'commander'
import pc from 'picocolors'
import { initConfig } from './commands/config/init.js'
import { showConfig } from './commands/config/show.js'
import { addChain, listChains, removeChain } from './commands/config/chains.js'
import { editChains } from './commands/config/edit.js'
import { importWallet } from './commands/wallet/import.js'
import { listWallets } from './commands/wallet/list.js'
import { useWallet } from './commands/wallet/use.js'
import { removeWallet } from './commands/wallet/remove.js'
import { createSafe } from './commands/account/create.js'
import { deploySafe } from './commands/account/deploy.js'
import { openSafe } from './commands/account/open.js'
import { listSafes } from './commands/account/list.js'
import { showSafeInfo } from './commands/account/info.js'
import { createTransaction } from './commands/tx/create.js'
import { signTransaction } from './commands/tx/sign.js'
import { executeTransaction } from './commands/tx/execute.js'
import { listTransactions } from './commands/tx/list.js'
import { handleError } from './utils/errors.js'

const program = new Command()

program
  .name('safe')
  .description('Modern CLI for Safe Smart Account management')
  .version('0.1.0')

// Config commands
const config = program
  .command('config')
  .description('Manage CLI configuration')

config
  .command('init')
  .description('Initialize Safe CLI configuration')
  .action(async () => {
    try {
      await initConfig()
    } catch (error) {
      handleError(error)
    }
  })

config
  .command('show')
  .description('Display current configuration')
  .action(async () => {
    try {
      await showConfig()
    } catch (error) {
      handleError(error)
    }
  })

// Config chains commands
const chains = config
  .command('chains')
  .description('Manage chain configurations')

chains
  .command('list')
  .description('List all configured chains')
  .action(async () => {
    try {
      await listChains()
    } catch (error) {
      handleError(error)
    }
  })

chains
  .command('add')
  .description('Add a new chain configuration')
  .action(async () => {
    try {
      await addChain()
    } catch (error) {
      handleError(error)
    }
  })

chains
  .command('remove')
  .description('Remove a chain configuration')
  .action(async () => {
    try {
      await removeChain()
    } catch (error) {
      handleError(error)
    }
  })

chains
  .command('edit')
  .description('Edit chain configurations in text editor')
  .action(async () => {
    try {
      await editChains()
    } catch (error) {
      handleError(error)
    }
  })

// Wallet commands
const wallet = program
  .command('wallet')
  .description('Manage wallets and signers')

wallet
  .command('import')
  .description('Import a wallet using a private key')
  .action(async () => {
    try {
      await importWallet()
    } catch (error) {
      handleError(error)
    }
  })

wallet
  .command('list')
  .description('List all imported wallets')
  .action(async () => {
    try {
      await listWallets()
    } catch (error) {
      handleError(error)
    }
  })

wallet
  .command('use')
  .alias('switch')
  .description('Switch active wallet')
  .action(async () => {
    try {
      await useWallet()
    } catch (error) {
      handleError(error)
    }
  })

wallet
  .command('remove')
  .alias('delete')
  .description('Remove a wallet')
  .action(async () => {
    try {
      await removeWallet()
    } catch (error) {
      handleError(error)
    }
  })

// Account commands
const account = program
  .command('account')
  .description('Manage Safe accounts')

account
  .command('create')
  .description('Create a new Safe account')
  .action(async () => {
    try {
      await createSafe()
    } catch (error) {
      handleError(error)
    }
  })

account
  .command('deploy [safeId]')
  .description('Deploy a Safe to the blockchain')
  .action(async (safeId?: string) => {
    try {
      await deploySafe(safeId)
    } catch (error) {
      handleError(error)
    }
  })

account
  .command('open')
  .description('Open an existing Safe')
  .action(async () => {
    try {
      await openSafe()
    } catch (error) {
      handleError(error)
    }
  })

account
  .command('list')
  .description('List all Safe accounts')
  .action(async () => {
    try {
      await listSafes()
    } catch (error) {
      handleError(error)
    }
  })

account
  .command('info [safeId]')
  .description('Display Safe information')
  .action(async (safeId?: string) => {
    try {
      await showSafeInfo(safeId)
    } catch (error) {
      handleError(error)
    }
  })

// Transaction commands
const tx = program
  .command('tx')
  .description('Manage Safe transactions')

tx
  .command('create')
  .description('Create a new transaction')
  .action(async () => {
    try {
      await createTransaction()
    } catch (error) {
      handleError(error)
    }
  })

tx
  .command('sign [txId]')
  .description('Sign a pending transaction')
  .action(async (txId?: string) => {
    try {
      await signTransaction(txId)
    } catch (error) {
      handleError(error)
    }
  })

tx
  .command('execute [txId]')
  .alias('exec')
  .description('Execute a signed transaction')
  .action(async (txId?: string) => {
    try {
      await executeTransaction(txId)
    } catch (error) {
      handleError(error)
    }
  })

tx
  .command('list')
  .description('List transactions')
  .action(async () => {
    try {
      await listTransactions()
    } catch (error) {
      handleError(error)
    }
  })

// Show welcome message if no command provided
if (process.argv.length === 2) {
  console.log('')
  console.log(pc.bold(pc.cyan('🔐 Safe CLI')))
  console.log('')
  console.log('Modern CLI for Safe Smart Account management')
  console.log('')
  console.log(pc.bold('Getting Started:'))
  console.log(`  ${pc.cyan('safe config init')}     Initialize configuration`)
  console.log(`  ${pc.cyan('safe wallet import')}   Import a wallet`)
  console.log(`  ${pc.cyan('safe account create')}  Create a Safe`)
  console.log(`  ${pc.cyan('safe tx create')}       Create a transaction`)
  console.log(`  ${pc.cyan('safe --help')}          Show all commands`)
  console.log('')
  console.log(pc.dim('For more information, visit: https://github.com/safe-global/safe-cli'))
  console.log('')
  process.exit(0)
}

export { program }
