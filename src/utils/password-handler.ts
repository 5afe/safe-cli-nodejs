import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as p from '@clack/prompts'

export interface PasswordInput {
  /** Password provided via CLI flag (least secure) */
  password?: string
  /** Path to file containing password */
  passwordFile?: string
  /** Environment variable name to read password from */
  passwordEnv?: string
}

/**
 * Get password from various sources with priority:
 * 1. Environment variable (recommended)
 * 2. Password file (secure)
 * 3. CLI flag (less secure, for testing only)
 * 4. Interactive prompt (fallback)
 *
 * @param input Password input options
 * @param promptMessage Custom message for interactive prompt
 * @returns Password string, or null if cancelled
 */
export async function getPassword(
  input: PasswordInput,
  promptMessage = 'Enter wallet password'
): Promise<string | null> {
  // Priority 1: Environment variable (most secure for automation)
  if (input.passwordEnv) {
    const envPassword = process.env[input.passwordEnv]
    if (envPassword) {
      return envPassword
    }
    p.log.warn(`Environment variable ${input.passwordEnv} not found, falling back to prompt`)
  }

  // Priority 2: Password file (secure)
  if (input.passwordFile) {
    try {
      const filePath = resolve(input.passwordFile)
      const password = readFileSync(filePath, 'utf-8').trim()
      if (password) {
        return password
      }
    } catch (error) {
      p.log.error(
        `Failed to read password from file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return null
    }
  }

  // Priority 3: CLI flag (least secure, show warning)
  if (input.password) {
    if (isPasswordInCLIArgs()) {
      p.log.warn(
        '⚠️  WARNING: Password provided via CLI argument is visible in process list and shell history!'
      )
      p.log.warn('   For production, use SAFE_WALLET_PASSWORD environment variable instead.')
    }
    return input.password
  }

  // Priority 4: Interactive prompt (fallback)
  const password = await p.password({
    message: promptMessage,
  })

  if (p.isCancel(password)) {
    return null
  }

  return password as string
}

/**
 * Check if password was passed via CLI arguments
 * This is useful for showing security warnings
 */
function isPasswordInCLIArgs(): boolean {
  const args = process.argv.join(' ')
  return args.includes('--password') || args.includes('-p')
}

/**
 * Validate password environment variable configuration
 * Shows warnings if password is in CLI args
 */
export function validatePasswordSecurity(input: PasswordInput): void {
  if (input.password && isPasswordInCLIArgs()) {
    p.log.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    p.log.warn('⚠️  SECURITY WARNING')
    p.log.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    p.log.warn('Password provided via CLI argument!')
    p.log.warn('This is VISIBLE in:')
    p.log.warn('  • Process list (ps aux)')
    p.log.warn('  • Shell history')
    p.log.warn('  • System logs')
    p.log.warn('')
    p.log.warn('For production, use environment variables instead:')
    p.log.warn('  SAFE_WALLET_PASSWORD="your-password" safe tx sign ...')
    p.log.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }
}

/**
 * Standard environment variable names for Safe CLI
 */
export const ENV_VARS = {
  /** Wallet password */
  WALLET_PASSWORD: 'SAFE_WALLET_PASSWORD',
  /** Active wallet address or name */
  ACTIVE_WALLET: 'SAFE_ACTIVE_WALLET',
  /** Config directory override */
  CONFIG_DIR: 'SAFE_CONFIG_DIR',
  /** Output format (json | text) */
  OUTPUT_FORMAT: 'SAFE_OUTPUT_FORMAT',
  /** Safe Transaction Service API key */
  SAFE_API_KEY: 'SAFE_API_KEY',
  /** Etherscan API key */
  ETHERSCAN_API_KEY: 'ETHERSCAN_API_KEY',
} as const
