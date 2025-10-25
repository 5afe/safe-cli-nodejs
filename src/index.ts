import { program } from './cli.js'

// Increase max listeners to accommodate sequential command chaining
// (create → sign → execute, etc.)
process.setMaxListeners(20)

program.parse(process.argv)
