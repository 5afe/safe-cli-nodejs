import { startRepl } from '../repl/index.js'
import type { Command } from 'commander'

/**
 * Start interactive REPL mode
 */
export async function replCommand(program: Command): Promise<void> {
  await startRepl(program)
}
