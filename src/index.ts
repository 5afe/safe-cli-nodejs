import { program } from './cli.js'
import { replCommand } from './commands/repl.js'

// Increase max listeners to accommodate sequential command chaining
// (create → sign → execute, etc.)
process.setMaxListeners(20)

// Launch REPL by default if no command provided
if (process.argv.length === 2) {
  replCommand(program).catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else {
  program.parse(process.argv)
}
