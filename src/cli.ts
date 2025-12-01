import { Command } from 'commander'
import { initConfig } from './commands/config/init.js'
import { showConfig } from './commands/config/show.js'
import { addChain, listChains, removeChain } from './commands/config/chains.js'
import { editChains } from './commands/config/edit.js'
import { importWallet } from './commands/wallet/import.js'
import { importLedgerWallet } from './commands/wallet/import-ledger.js'
import { createWallet } from './commands/wallet/create.js'
import { listWallets } from './commands/wallet/list.js'
import { useWallet } from './commands/wallet/use.js'
import { removeWallet } from './commands/wallet/remove.js'
import { createSafe } from './commands/account/create.js'
import { deploySafe } from './commands/account/deploy.js'
import { openSafe } from './commands/account/open.js'
import { listSafes } from './commands/account/list.js'
import { showSafeInfo } from './commands/account/info.js'
import { addOwner } from './commands/account/add-owner.js'
import { removeOwner } from './commands/account/remove-owner.js'
import { changeThreshold } from './commands/account/change-threshold.js'
import { createTransaction } from './commands/tx/create.js'
import { signTransaction } from './commands/tx/sign.js'
import { executeTransaction } from './commands/tx/execute.js'
import { listTransactions } from './commands/tx/list.js'
import { showTransactionStatus } from './commands/tx/status.js'
import { exportTransaction } from './commands/tx/export.js'
import { importTransaction } from './commands/tx/import.js'
import { pushTransaction } from './commands/tx/push.js'
import { pullTransactions } from './commands/tx/pull.js'
import { syncTransactions } from './commands/tx/sync.js'
import { handleError } from './utils/errors.js'
import { setGlobalOptions, type GlobalOptions } from './types/global-options.js'
import { getAISuggestionService } from './services/ai-suggestion-service.js'
import { renderScreen } from './ui/render.js'
import { AISuggestionScreen } from './ui/screens/index.js'

const program = new Command()

program
  .name('safe')
  .description('Modern CLI for Safe Smart Account management')
  .version('0.1.0')
  .option('--json', 'Output in JSON format (machine-readable)')
  .option('--quiet', 'Suppress interactive UI elements')
  .option('--password <password>', 'Wallet password (use with caution, visible in process list)')
  .option('--password-file <path>', 'Path to file containing wallet password')
  .option('--no-color', 'Disable colored output')
  .hook('preAction', (thisCommand) => {
    // Extract global options and store them
    const opts = thisCommand.optsWithGlobals() as GlobalOptions
    setGlobalOptions({
      json: opts.json,
      quiet: opts.quiet,
      password: opts.password,
      passwordFile: opts.passwordFile,
      noColor: opts.noColor,
    })
  })

/**
 * Recursively extracts all commands from a Commander program/command.
 * Returns commands in format like "config init", "wallet list", etc.
 */
function getAvailableCommands(cmd: Command, prefix: string = ''): string[] {
  const commands: string[] = []

  for (const subCmd of cmd.commands) {
    const cmdName = subCmd.name()
    const fullName = prefix ? `${prefix} ${cmdName}` : cmdName
    const usage = subCmd.usage()

    // Add the command with its usage (arguments)
    if (usage) {
      commands.push(`${fullName} ${usage}`)
    } else {
      commands.push(fullName)
    }

    // Recursively get subcommands
    commands.push(...getAvailableCommands(subCmd, fullName))
  }

  return commands
}

/**
 * Adds an unknown command handler with AI suggestions to a command.
 * @param cmd The command to add the handler to
 * @param cmdPath The path to this command (e.g., "tx" or "config chains")
 */
function addUnknownCommandHandler(cmd: Command, cmdPath: string = ''): void {
  cmd.on('command:*', async (operands: string[]) => {
    try {
      const unknownCommand = operands[0]
      const args = operands.slice(1)
      const fullUnknown = cmdPath ? `${cmdPath} ${unknownCommand}` : unknownCommand

      // Show error immediately (use write for instant flush)
      process.stderr.write(`error: unknown command '${fullUnknown}'\n\n`)
      process.stderr.write('Asking AI for suggestions...\n\n')

      // Try to get AI suggestion
      const aiService = getAISuggestionService()
      let suggestion: string | null = null

      try {
        const availableCommands = getAvailableCommands(program)
        suggestion = await aiService.getSuggestion(fullUnknown, args, availableCommands)
      } catch {
        // AI suggestion failed, will show null
      }

      // Render the suggestion
      if (suggestion) {
        await renderScreen(AISuggestionScreen, { suggestion })
      } else {
        console.error(`No AI tools available. Run 'safe --help' to see available commands.`)
      }
    } catch (error) {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : error}`)
    }

    process.exit(1)
  })
}

// Handle unknown commands at root level
addUnknownCommandHandler(program)

// Config commands
const config = program.command('config').description('Manage CLI configuration')
addUnknownCommandHandler(config, 'config')

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
const chains = config.command('chains').description('Manage chain configurations')
addUnknownCommandHandler(chains, 'config chains')

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
const wallet = program.command('wallet').description('Manage wallets and signers')
addUnknownCommandHandler(wallet, 'wallet')

wallet
  .command('import')
  .description('Import a wallet using a private key')
  .option('--private-key <key>', 'Private key to import (use with caution)')
  .option('--name <name>', 'Name for the wallet')
  .action(async (options: { privateKey?: string; name?: string }) => {
    try {
      await importWallet(options)
    } catch (error) {
      handleError(error)
    }
  })

wallet
  .command('import-ledger')
  .description('Import a Ledger hardware wallet')
  .action(async () => {
    try {
      await importLedgerWallet()
    } catch (error) {
      handleError(error)
    }
  })

wallet
  .command('create')
  .description('Create a new wallet with a generated private key')
  .option('--name <name>', 'Name for the wallet')
  .option('--skip-backup-warning', 'Skip backup confirmation (use with caution)')
  .action(async (options: { name?: string; skipBackupWarning?: boolean }) => {
    try {
      await createWallet(options)
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
  .option('--address <address>', 'Wallet address to use')
  .option('--name <name>', 'Wallet name to use')
  .action(async (options: { address?: string; name?: string }) => {
    try {
      await useWallet(options)
    } catch (error) {
      handleError(error)
    }
  })

wallet
  .command('remove')
  .alias('delete')
  .description('Remove a wallet')
  .option('--address <address>', 'Wallet address to remove')
  .option('--name <name>', 'Wallet name to remove')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options: { address?: string; name?: string; force?: boolean }) => {
    try {
      await removeWallet(options)
    } catch (error) {
      handleError(error)
    }
  })

// Account commands
const account = program.command('account').description('Manage Safe accounts')
addUnknownCommandHandler(account, 'account')

account
  .command('create')
  .description('Create a new Safe account')
  .option('--chain-id <chainId>', 'Chain ID to create Safe on')
  .option('--owners <addresses>', 'Comma-separated owner addresses or JSON array')
  .option('--threshold <number>', 'Signature threshold')
  .option('--name <name>', 'Name for the Safe')
  .option('--no-deploy', 'Skip deployment prompt')
  .action(
    async (options?: {
      chainId?: string
      owners?: string
      threshold?: string
      name?: string
      noDeploy?: boolean
    }) => {
      try {
        await createSafe(options)
      } catch (error) {
        handleError(error)
      }
    }
  )

account
  .command('deploy [account]')
  .description('Deploy a Safe to the blockchain (EIP-3770 format: shortName:address)')
  .option('--skip-confirmation', 'Skip deployment confirmation prompt')
  .action(async (account?: string, options?: { skipConfirmation?: boolean }) => {
    try {
      await deploySafe(account, options)
    } catch (error) {
      handleError(error)
    }
  })

account
  .command('open [address]')
  .description('Open an existing Safe (EIP-3770 format: shortName:address)')
  .option('--name <name>', 'Name for the Safe')
  .action(async (address?: string, options?: { name?: string }) => {
    try {
      await openSafe(address, options)
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
  .command('info [account]')
  .description('Display Safe information (EIP-3770 format: shortName:address)')
  .action(async (account?: string) => {
    try {
      await showSafeInfo(account)
    } catch (error) {
      handleError(error)
    }
  })

account
  .command('add-owner [account] [ownerAddress]')
  .description('Add a new owner to a Safe (EIP-3770 format: shortName:address)')
  .option('--threshold <number>', 'New threshold after adding owner')
  .action(async (account?: string, ownerAddress?: string, options?: { threshold?: string }) => {
    try {
      await addOwner(account, ownerAddress, options)
    } catch (error) {
      handleError(error)
    }
  })

account
  .command('remove-owner [account] [ownerAddress]')
  .description('Remove an owner from a Safe (EIP-3770 format: shortName:address)')
  .option('--threshold <number>', 'New threshold after removing owner')
  .action(async (account?: string, ownerAddress?: string, options?: { threshold?: string }) => {
    try {
      await removeOwner(account, ownerAddress, options)
    } catch (error) {
      handleError(error)
    }
  })

account
  .command('change-threshold [account]')
  .description('Change the signature threshold of a Safe (EIP-3770 format: shortName:address)')
  .option('--threshold <number>', 'New threshold value')
  .action(async (account?: string, options?: { threshold?: string }) => {
    try {
      await changeThreshold(account, options)
    } catch (error) {
      handleError(error)
    }
  })

// Transaction commands
const tx = program.command('tx').description('Manage Safe transactions')
addUnknownCommandHandler(tx, 'tx')

tx.command('create')
  .description('Create a new transaction')
  .action(async () => {
    try {
      await createTransaction()
    } catch (error) {
      handleError(error)
    }
  })

tx.command('sign [safeTxHash]')
  .description('Sign a pending transaction (use Safe TX Hash)')
  .action(async (safeTxHash?: string) => {
    try {
      await signTransaction(safeTxHash)
    } catch (error) {
      handleError(error)
    }
  })

tx.command('execute [safeTxHash]')
  .alias('exec')
  .description('Execute a signed transaction (use Safe TX Hash)')
  .action(async (safeTxHash?: string) => {
    try {
      await executeTransaction(safeTxHash)
    } catch (error) {
      handleError(error)
    }
  })

tx.command('list [account]')
  .description('List transactions (optionally filtered by Safe in EIP-3770 format)')
  .action(async (account?: string) => {
    try {
      await listTransactions(account)
    } catch (error) {
      handleError(error)
    }
  })

tx.command('status [safeTxHash]')
  .description('Show transaction status and signature progress')
  .action(async (safeTxHash?: string) => {
    try {
      await showTransactionStatus(safeTxHash)
    } catch (error) {
      handleError(error)
    }
  })

tx.command('export [safeTxHash]')
  .description('Export transaction as JSON for sharing')
  .option('-o, --output <file>', 'Output to file instead of stdout')
  .action(async (safeTxHash?: string, options?: { output?: string }) => {
    try {
      await exportTransaction(safeTxHash, options?.output)
    } catch (error) {
      handleError(error)
    }
  })

tx.command('import [json]')
  .description('Import transaction from JSON string or file')
  .action(async (json?: string) => {
    try {
      await importTransaction(json)
    } catch (error) {
      handleError(error)
    }
  })

tx.command('push [safeTxHash]')
  .description('Push transaction to Safe Transaction Service API')
  .action(async (safeTxHash?: string) => {
    try {
      await pushTransaction(safeTxHash)
    } catch (error) {
      handleError(error)
    }
  })

tx.command('pull [account]')
  .description('Pull transactions from Safe Transaction Service API (EIP-3770 format)')
  .action(async (account?: string) => {
    try {
      await pullTransactions(account)
    } catch (error) {
      handleError(error)
    }
  })

tx.command('sync [account]')
  .description('Sync transactions with Safe Transaction Service API (EIP-3770 format)')
  .action(async (account?: string) => {
    try {
      await syncTransactions(account)
    } catch (error) {
      handleError(error)
    }
  })

// Show welcome message if no command provided
if (process.argv.length === 2) {
  // Migration: Phase 4 - Tier 1 command
  // Old: 14 lines of imperative console.log
  // New: Declarative Ink rendering
  const { renderScreen } = await import('./ui/render.js')
  const { WelcomeScreen } = await import('./ui/screens/index.js')

  await renderScreen(WelcomeScreen, {})
  process.exit(0)
}

export { program }
