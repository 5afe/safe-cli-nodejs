/**
 * Standard exit codes for the Safe CLI
 * Used for automation and CI/CD to detect specific error conditions
 */
export const ExitCode = {
  /** Command completed successfully */
  SUCCESS: 0,

  /** General error (catch-all) */
  ERROR: 1,

  /** Invalid arguments or validation error */
  INVALID_ARGS: 2,

  /** Authentication failure (wrong password, unauthorized) */
  AUTH_FAILURE: 3,

  /** Insufficient signatures for transaction execution */
  INSUFFICIENT_SIGNATURES: 4,

  /** Network or RPC error */
  NETWORK_ERROR: 5,

  /** Configuration error */
  CONFIG_ERROR: 6,

  /** Wallet not found or not active */
  WALLET_ERROR: 7,

  /** Safe account not found */
  SAFE_NOT_FOUND: 8,

  /** Transaction not found */
  TX_NOT_FOUND: 9,

  /** Operation cancelled by user */
  CANCELLED: 10,
} as const

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode]

/**
 * Exit the process with a specific exit code
 * @param code Exit code to use
 */
export function exit(code: ExitCode): never {
  process.exit(code)
}
