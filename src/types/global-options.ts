/**
 * Global CLI options available to all commands
 */
export interface GlobalOptions {
  /** Output format: json or text (default) */
  json?: boolean

  /** Suppress interactive UI elements */
  quiet?: boolean

  /** Wallet password (less secure, for testing only) */
  password?: string

  /** Path to file containing password */
  passwordFile?: string

  /** Disable colored output */
  noColor?: boolean
}

/**
 * Singleton to store global options set via CLI flags
 * This allows commands to access global options without prop drilling
 */
class GlobalOptionsStore {
  private options: GlobalOptions = {}

  setOptions(options: GlobalOptions): void {
    this.options = { ...options }

    // Apply no-color setting
    if (options.noColor) {
      process.env.NO_COLOR = '1'
    }

    // Apply JSON output format
    if (options.json) {
      process.env.SAFE_OUTPUT_FORMAT = 'json'
    }
  }

  getOptions(): Readonly<GlobalOptions> {
    return { ...this.options }
  }

  isJsonMode(): boolean {
    return this.options.json === true || process.env.SAFE_OUTPUT_FORMAT === 'json'
  }

  isQuietMode(): boolean {
    return this.options.quiet === true
  }

  getPassword(): string | undefined {
    return this.options.password
  }

  getPasswordFile(): string | undefined {
    return this.options.passwordFile
  }
}

// Singleton instance
const globalOptionsStore = new GlobalOptionsStore()

export function setGlobalOptions(options: GlobalOptions): void {
  globalOptionsStore.setOptions(options)
}

export function getGlobalOptions(): Readonly<GlobalOptions> {
  return globalOptionsStore.getOptions()
}

export function isJsonMode(): boolean {
  return globalOptionsStore.isJsonMode()
}

export function isQuietMode(): boolean {
  return globalOptionsStore.isQuietMode()
}
