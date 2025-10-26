import { spawn, type ChildProcess } from 'child_process'
import { join } from 'path'
import { EventEmitter } from 'events'

export interface CLIResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

export class CLITestHelper extends EventEmitter {
  private process: ChildProcess | null = null
  private stdout = ''
  private stderr = ''
  private cliPath: string

  constructor() {
    super()
    // Path to the built CLI
    this.cliPath = join(process.cwd(), 'dist', 'index.js')
  }

  /**
   * Execute a CLI command
   */
  async exec(
    args: string[],
    options: { timeout?: number; env?: Record<string, string> } = {}
  ): Promise<CLIResult> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 120000 // 2 minutes default

      this.stdout = ''
      this.stderr = ''

      // Merge environment variables
      const env = {
        ...process.env,
        ...options.env,
        // Force non-interactive mode where possible
        CI: 'true',
        NODE_ENV: 'test',
      }

      this.process = spawn('node', [this.cliPath, ...args], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const timeoutId = setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGTERM')
          reject(new Error(`CLI command timed out after ${timeout}ms`))
        }
      }, timeout)

      this.process.stdout?.on('data', (data) => {
        const chunk = data.toString()
        this.stdout += chunk
        this.emit('stdout', chunk)
      })

      this.process.stderr?.on('data', (data) => {
        const chunk = data.toString()
        this.stderr += chunk
        this.emit('stderr', chunk)
      })

      this.process.on('close', (code) => {
        clearTimeout(timeoutId)
        resolve({
          stdout: this.stdout,
          stderr: this.stderr,
          exitCode: code,
        })
      })

      this.process.on('error', (error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
    })
  }

  /**
   * Execute a CLI command with input for interactive prompts
   */
  async execWithInput(
    args: string[],
    inputs: string[],
    options: { timeout?: number; env?: Record<string, string> } = {}
  ): Promise<CLIResult> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 120000

      this.stdout = ''
      this.stderr = ''

      const env = {
        ...process.env,
        ...options.env,
        NODE_ENV: 'test',
      }

      this.process = spawn('node', [this.cliPath, ...args], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const timeoutId = setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGTERM')
          reject(new Error(`CLI command timed out after ${timeout}ms`))
        }
      }, timeout)

      let inputIndex = 0

      this.process.stdout?.on('data', (data) => {
        const chunk = data.toString()
        this.stdout += chunk
        this.emit('stdout', chunk)

        // Auto-respond to prompts
        if (inputIndex < inputs.length) {
          // Small delay to ensure prompt is ready
          setTimeout(() => {
            if (this.process?.stdin && inputIndex < inputs.length) {
              this.process.stdin.write(inputs[inputIndex] + '\n')
              inputIndex++
            }
          }, 100)
        }
      })

      this.process.stderr?.on('data', (data) => {
        const chunk = data.toString()
        this.stderr += chunk
        this.emit('stderr', chunk)
      })

      this.process.on('close', (code) => {
        clearTimeout(timeoutId)
        resolve({
          stdout: this.stdout,
          stderr: this.stderr,
          exitCode: code,
        })
      })

      this.process.on('error', (error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
    })
  }

  /**
   * Kill the process if it's running
   */
  kill(): void {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }
  }

  /**
   * Get the last stdout output
   */
  getStdout(): string {
    return this.stdout
  }

  /**
   * Get the last stderr output
   */
  getStderr(): string {
    return this.stderr
  }
}

/**
 * Helper to parse CLI output for specific values
 */
export class CLIOutputParser {
  static extractAddress(output: string): string | null {
    const match = output.match(/0x[a-fA-F0-9]{40}/)
    return match ? match[0] : null
  }

  static extractSafeTxHash(output: string): string | null {
    const match = output.match(
      /Safe.{0,10}(?:Tx|Transaction).{0,10}Hash.{0,10}(0x[a-fA-F0-9]{64})/i
    )
    return match ? match[1] : null
  }

  static extractTxHash(output: string): string | null {
    const match = output.match(/(?:Transaction|Tx).{0,10}Hash.{0,10}(0x[a-fA-F0-9]{64})/i)
    return match ? match[1] : null
  }

  static hasSuccess(output: string): boolean {
    return /success|✓|✅|completed/i.test(output)
  }

  static hasError(output: string): boolean {
    return /error|✗|❌|failed/i.test(output.toLowerCase())
  }

  static extractJSON(output: string): unknown | null {
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {
      // Ignore parse errors
    }
    return null
  }
}
