export class SafeCLIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SafeCLIError'
  }
}

export class ValidationError extends SafeCLIError {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ConfigError extends SafeCLIError {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export class WalletError extends SafeCLIError {
  constructor(message: string) {
    super(message)
    this.name = 'WalletError'
  }
}

export function handleError(error: unknown): never {
  if (error instanceof SafeCLIError) {
    console.error(`Error: ${error.message}`)
  } else if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`)
  } else {
    console.error('An unexpected error occurred')
  }
  process.exit(1)
}
