import repl from 'node:repl'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import type { Command } from 'commander'
import { ReplSession } from './session.js'
import { ReplCompleter } from './completer.js'
import { handleError } from '../utils/errors.js'

/**
 * Split command string into argv array
 * Handles quoted strings properly
 */
function parseCommand(input: string): string[] {
  const args: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) {
    args.push(current)
  }

  return args
}

/**
 * Start the interactive REPL
 */
export async function startRepl(program: Command): Promise<void> {
  // Set global flag to indicate we're in REPL mode
  // This is used by renderScreen to adjust behavior
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).__SAFE_CLI_REPL_MODE__ = true

  // Override process.exit globally for the entire REPL session
  // This prevents any command or library from killing the REPL
  const originalExit = process.exit

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(process as any).exit = ((code?: number) => {
    // Only warn for non-zero exit codes (errors)
    if (code && code !== 0) {
      console.log(`\x1b[33m⚠ Command attempted to exit with code ${code}\x1b[0m`)
    }
    // Don't actually exit - just do nothing
    // This is safer than throwing exceptions which can escape our handlers
  }) as typeof process.exit

  // Initialize session
  const session = new ReplSession()
  const completer = new ReplCompleter(session)

  // Print welcome message
  const pkg = { name: '@safe-global/safe-cli', version: '0.1.0' }
  const cwd = process.cwd()

  console.log('')
  console.log(`  🔐  \x1b[1mSafe CLI\x1b[0m v${pkg.version}`)
  console.log(`      \x1b[2m${cwd}\x1b[0m`)
  console.log('')
  console.log('  \x1b[1mQuick Start:\x1b[0m')
  console.log('    \x1b[36mconfig\x1b[0m init/show         Manage configuration')
  console.log('    \x1b[36mwallet\x1b[0m import/create     Manage wallets')
  console.log('    \x1b[36maccount\x1b[0m create/list      Manage Safe accounts')
  console.log('    \x1b[36mtx\x1b[0m create/sign/exec      Manage transactions')
  console.log('')

  // Print current context
  printContext(session)

  // Print separator before prompt
  console.log('\x1b[2m' + '─'.repeat(process.stdout.columns || 80) + '\x1b[0m')

  // Create REPL server
  const replServer = repl.start({
    prompt: session.getPrompt(),
    eval: async (input, _context, _filename, callback) => {
      const command = input.trim()

      // Skip empty commands
      if (!command || command === '\n') {
        callback(null, undefined)
        return
      }

      // Add to history
      session.addToHistory(command)

      try {
        // Handle special REPL commands
        if (command === 'help') {
          showHelp()
          callback(null, undefined)
          return
        }

        if (command === 'status') {
          printContext(session)
          callback(null, undefined)
          return
        }

        if (command === 'clear') {
          console.clear()
          callback(null, undefined)
          return
        }

        // Parse command into argv
        const argv = parseCommand(command)

        if (argv.length === 0) {
          callback(null, undefined)
          return
        }

        // Execute command through Commander
        await executeCommand(program, argv, session, replServer)

        callback(null, undefined)
      } catch (error) {
        // Show error but don't exit REPL
        handleError(error)
        callback(null, undefined)
      }
    },
    completer: (line: string) => completer.complete(line),
    ignoreUndefined: true,
    preview: false,
  })

  // Set up history file
  const historyFile = path.join(os.homedir(), '.safe-cli-history')
  setupHistory(replServer, historyFile)

  // Define custom REPL commands
  replServer.defineCommand('help', {
    help: 'Show available commands',
    action() {
      showHelp()
      this.displayPrompt()
    },
  })

  replServer.defineCommand('status', {
    help: 'Show current context (wallet, Safe, chain)',
    action() {
      printContext(session)
      this.displayPrompt()
    },
  })

  replServer.defineCommand('clear', {
    help: 'Clear the screen',
    action() {
      console.clear()
      // Reprint header after clear
      const pkg = { name: '@safe-global/safe-cli', version: '0.1.0' }
      const cwd = process.cwd()
      console.log('')
      console.log(`  🔐  \x1b[1mSafe CLI\x1b[0m v${pkg.version}`)
      console.log(`      \x1b[2m${cwd}\x1b[0m`)
      console.log('')
      printContext(session)
      console.log('\x1b[2m' + '─'.repeat(process.stdout.columns || 80) + '\x1b[0m')
      this.displayPrompt()
    },
  })

  // Handle exit
  replServer.on('exit', () => {
    console.log('\n\x1b[36mGoodbye! 👋\x1b[0m\n')
    // Clear REPL mode flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).__SAFE_CLI_REPL_MODE__ = false
    // Restore original process.exit before exiting
    process.exit = originalExit
    process.exit(0)
  })
}

/**
 * Execute a command through Commander.js
 */
async function executeCommand(
  program: Command,
  argv: string[],
  session: ReplSession,
  replServer: repl.REPLServer
): Promise<void> {
  // Note: process.exit is already overridden globally in startRepl()
  // It's now a no-op so commands can't kill the REPL

  try {
    // Create a fresh instance to avoid state pollution
    const programCopy = program.configureOutput({
      writeOut: (str) => process.stdout.write(str),
      writeErr: (str) => process.stderr.write(str),
    })

    // Suppress Commander's process.exit behavior in REPL mode
    programCopy.exitOverride()

    try {
      await programCopy.parseAsync(argv, { from: 'user' })
    } catch (error) {
      // Handle Commander.Commander errors (like unknown commands)
      if (error instanceof Error) {
        if (error.message.includes('unknown command')) {
          console.log(`\x1b[31m✖\x1b[0m Unknown command: ${argv.join(' ')}`)
          console.log(`Type \x1b[33mhelp\x1b[0m to see available commands`)
        } else if (!error.message.includes('outputHelp')) {
          // Don't re-throw help/version errors (they're handled by Commander)
          throw error
        }
      } else {
        throw error
      }
    }
  } finally {
    // Resume stdin for REPL
    // @clack/prompts pauses stdin when it finishes
    // Paused stdin doesn't keep the Node event loop alive, causing the process to exit
    if (process.stdin.isTTY && !process.stdin.destroyed) {
      // Small delay to ensure @clack/prompts has fully cleaned up
      await new Promise((resolve) => setTimeout(resolve, 50))
      // CRITICAL: Resume stdin so it keeps the event loop alive
      // Note: We don't call setRawMode here - the REPL manages that itself
      process.stdin.resume()
    }

    // Refresh session after command execution
    session.refresh()

    // Print separator before next prompt
    const columns = process.stdout.columns || 80
    console.log('\x1b[2m' + '─'.repeat(columns) + '\x1b[0m')

    // Update prompt with new context
    replServer.setPrompt(session.getPrompt())

    // Force the REPL to redisplay the prompt
    replServer.displayPrompt(true)
  }
}

/**
 * Print current context information
 */
function printContext(session: ReplSession): void {
  console.log('\x1b[1m\x1b[36mCurrent Context:\x1b[0m')

  const wallet = session.activeWallet
  if (wallet) {
    console.log(`  🔑 Wallet: \x1b[36m${wallet.name}\x1b[0m (${wallet.address.slice(0, 10)}...)`)
  } else {
    console.log(`  🔑 Wallet: \x1b[2mnone\x1b[0m`)
  }

  console.log('')
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log('')
  console.log('\x1b[1m\x1b[36mKeyboard Shortcuts\x1b[0m')
  console.log('  Tab             Command completion')
  console.log('  Ctrl+D or .exit Exit REPL')
  console.log('  Ctrl+C          Cancel current input')
  console.log('  ↑ / ↓           Navigate command history')
  console.log('  clear           Clear the screen')
  console.log('')

  console.log('\x1b[1m\x1b[36mAvailable Commands\x1b[0m\n')

  console.log('\x1b[1mREPL Commands:\x1b[0m')
  console.log('  help                   Show this help message')
  console.log('  status                 Show current context (wallet, Safe, chain)')
  console.log('')

  console.log('\x1b[1mConfig Commands:\x1b[0m')
  console.log('  config init            Initialize Safe CLI configuration')
  console.log('  config show            Display current configuration')
  console.log('  config chains list     List all configured chains')
  console.log('  config chains add      Add a new chain configuration')
  console.log('  config chains remove   Remove a chain configuration')
  console.log('')

  console.log('\x1b[1mWallet Commands:\x1b[0m')
  console.log('  wallet import          Import a wallet using a private key')
  console.log('  wallet import-ledger   Import a Ledger hardware wallet')
  console.log('  wallet create          Create a new wallet')
  console.log('  wallet list            List all imported wallets')
  console.log('  wallet use             Switch active wallet')
  console.log('  wallet remove          Remove a wallet')
  console.log('')

  console.log('\x1b[1mAccount Commands:\x1b[0m')
  console.log('  account create         Create a new Safe account')
  console.log('  account deploy         Deploy a Safe to the blockchain')
  console.log('  account open           Open an existing Safe')
  console.log('  account list           List all Safe accounts')
  console.log('  account info           Display Safe information')
  console.log('  account add-owner      Add a new owner to a Safe')
  console.log('  account remove-owner   Remove an owner from a Safe')
  console.log('  account change-threshold Change signature threshold')
  console.log('')

  console.log('\x1b[1mTransaction Commands:\x1b[0m')
  console.log('  tx create              Create a new transaction')
  console.log('  tx sign                Sign a pending transaction')
  console.log('  tx execute             Execute a signed transaction')
  console.log('  tx list                List transactions')
  console.log('  tx status              Show transaction status')
  console.log('  tx export              Export transaction as JSON')
  console.log('  tx import              Import transaction from JSON')
  console.log('  tx push                Push transaction to API')
  console.log('  tx pull                Pull transactions from API')
  console.log('  tx sync                Sync transactions with API')
  console.log('')
}

/**
 * Set up persistent command history
 */
function setupHistory(replServer: repl.REPLServer, historyFile: string): void {
  try {
    // Load existing history
    if (fs.existsSync(historyFile)) {
      const history = fs.readFileSync(historyFile, 'utf-8')
      const lines = history.split('\n').filter((line) => line.trim())

      // Add to REPL history (reverse order because history is LIFO)
      for (let i = lines.length - 1; i >= 0; i--) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(replServer as any).history.push(lines[i])
      }
    }

    // Save history on exit
    replServer.on('exit', () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const history = (replServer as any).history.reverse().join('\n')
        fs.writeFileSync(historyFile, history, 'utf-8')
      } catch {
        // Ignore errors when saving history
      }
    })
  } catch {
    // Ignore errors when loading history
  }
}
