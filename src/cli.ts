import { Command } from 'commander'
import pc from 'picocolors'
import { initConfig } from './commands/config/init.js'
import { showConfig } from './commands/config/show.js'
import { addChain, listChains, removeChain } from './commands/config/chains.js'
import { importWallet } from './commands/wallet/import.js'
import { listWallets } from './commands/wallet/list.js'
import { useWallet } from './commands/wallet/use.js'
import { removeWallet } from './commands/wallet/remove.js'
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
  console.log(`  ${pc.cyan('safe --help')}          Show all commands`)
  console.log('')
  console.log(pc.dim('For more information, visit: https://github.com/safe-global/safe-cli'))
  console.log('')
  process.exit(0)
}

export { program }
