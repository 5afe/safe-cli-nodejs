import { spawn } from 'child_process'

interface AITool {
  name: string
  command: string
  args: (prompt: string) => string[]
  available?: boolean
}

interface AddressMapping {
  placeholder: string
  original: string
}

/**
 * Service for getting AI-powered command suggestions when a command is not recognized.
 * Uses cascading fallback through multiple AI CLI tools.
 */
export class AISuggestionService {
  private aiTools: AITool[] = [
    {
      name: 'ollama',
      command: 'ollama',
      args: (prompt: string) => ['run', '__AUTO_DETECT__', '--quiet', prompt],
    },
    {
      name: 'claude',
      command: 'claude',
      args: (prompt: string) => ['--print', '--model', 'haiku', '-o', 'raw=true', prompt],
    },
    {
      name: 'copilot',
      command: 'copilot',
      args: (prompt: string) => ['--prompt', prompt, '--model', 'claude-haiku-4.5'],
    },
  ]

  private ollamaModel: string | null = null

  /**
   * Detects the best available ollama model (prefers 2-5GB models for speed/quality balance).
   */
  private async detectOllamaModel(): Promise<string | null> {
    // Return cached result (empty string means no models available)
    if (this.ollamaModel !== null) {
      return this.ollamaModel || null
    }

    try {
      const output = await this.runCommand('ollama', ['list'], 5000)
      const lines = output.split('\n').slice(1) // Skip header

      // Parse model names and sizes, prefer smaller capable models
      const models: { name: string; sizeGB: number }[] = []
      for (const line of lines) {
        const match = line.match(/^(\S+)\s+\S+\s+([\d.]+)\s*GB/)
        if (match) {
          models.push({ name: match[1], sizeGB: parseFloat(match[2]) })
        }
      }

      if (models.length === 0) {
        this.ollamaModel = ''
        return null
      }

      // Sort by size (prefer 2-5GB models, then larger ones)
      models.sort((a, b) => {
        const aScore = a.sizeGB >= 2 && a.sizeGB <= 5 ? 0 : a.sizeGB < 2 ? 1 : 2
        const bScore = b.sizeGB >= 2 && b.sizeGB <= 5 ? 0 : b.sizeGB < 2 ? 1 : 2
        if (aScore !== bScore) return aScore - bScore
        return a.sizeGB - b.sizeGB
      })

      this.ollamaModel = models[0].name
      return this.ollamaModel
    } catch {
      this.ollamaModel = ''
      return null
    }
  }

  private addressMappings: AddressMapping[] = []
  private placeholderIndex = 0

  /**
   * Masks all 0x addresses in the input with placeholders like 0xAAAA, 0xBBBB, etc.
   */
  maskAddresses(input: string): string {
    this.addressMappings = []
    this.placeholderIndex = 0

    // Match any hex strings starting with 0x (addresses, hashes, tx data, etc.)
    const addressRegex = /0x[a-fA-F0-9]+/g

    return input.replace(addressRegex, (match) => {
      // Check if we already have a mapping for this address
      const existing = this.addressMappings.find((m) => m.original === match)
      if (existing) {
        return existing.placeholder
      }

      const placeholder = this.generatePlaceholder()
      this.addressMappings.push({ placeholder, original: match })
      return placeholder
    })
  }

  /**
   * Unmasks placeholders back to original addresses in the AI response.
   */
  unmaskAddresses(response: string): string {
    let result = response
    for (const mapping of this.addressMappings) {
      // Replace all occurrences of the placeholder (case-insensitive, escaped for safety)
      const escaped = mapping.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'gi')
      result = result.replace(regex, mapping.original)
    }
    return result
  }

  /**
   * Generates a placeholder like 0xAAAA, 0xBBBB, 0xCCCC, etc.
   */
  private generatePlaceholder(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const letter = letters[this.placeholderIndex % letters.length]
    const repeat = Math.floor(this.placeholderIndex / letters.length) + 1
    this.placeholderIndex++
    return `0x${letter.repeat(4 * repeat)}`
  }

  /**
   * Checks if a command exists on the system.
   */
  private async commandExists(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const check = spawn('which', [command], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      check.on('close', (code) => {
        resolve(code === 0)
      })
      check.on('error', () => {
        resolve(false)
      })
    })
  }

  /**
   * Runs a command and returns its output.
   */
  private runCommand(command: string, args: string[], timeoutMs: number = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NO_COLOR: '1' },
      })

      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      const timeout = setTimeout(() => {
        proc.kill('SIGTERM')
        reject(new Error('Command timed out'))
      }, timeoutMs)

      proc.on('close', (code) => {
        clearTimeout(timeout)
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim())
        } else {
          reject(new Error(stderr || `Command exited with code ${code}`))
        }
      })

      proc.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  }

  /**
   * Gets a command suggestion from AI tools using cascading fallback.
   * @param invalidCommand The command that was not recognized
   * @param args The arguments that were passed
   * @param availableCommands List of available commands to help the AI
   * @returns AI suggestion or null if all tools fail
   */
  async getSuggestion(
    invalidCommand: string,
    args: string[],
    availableCommands: string[]
  ): Promise<string | null> {
    const fullCommand = [invalidCommand, ...args].join(' ')
    const maskedCommand = this.maskAddresses(fullCommand)

    const prompt = `CLI "safe" command not recognized: safe ${maskedCommand}

Available: ${availableCommands.join(', ')}

Reply in this exact format (plain text, no markdown/backticks):
Did you mean:
    safe <suggested command here>
<one line explanation>

Keep it to 2-3 lines total.`

    for (const tool of this.aiTools) {
      try {
        const exists = await this.commandExists(tool.command)
        if (!exists) {
          continue
        }

        let toolArgs = tool.args(prompt)

        // Handle ollama model auto-detection
        if (tool.name === 'ollama' && toolArgs.includes('__AUTO_DETECT__')) {
          const model = await this.detectOllamaModel()
          if (!model) {
            continue
          }
          toolArgs = toolArgs.map((arg) => (arg === '__AUTO_DETECT__' ? model : arg))
        }

        // Use 30s timeout (cloud APIs may have cold start latency)
        const response = await this.runCommand(tool.command, toolArgs, 30000)

        if (response) {
          const unmaskedResponse = this.unmaskAddresses(response.trim())
          return unmaskedResponse
        }
      } catch {
        // Tool failed, try next one
        continue
      }
    }

    return null
  }

  /**
   * Gets available AI tools on the system.
   */
  async getAvailableTools(): Promise<string[]> {
    const available: string[] = []
    for (const tool of this.aiTools) {
      if (await this.commandExists(tool.command)) {
        available.push(tool.name)
      }
    }
    return available
  }
}

// Singleton instance
let instance: AISuggestionService | null = null

export function getAISuggestionService(): AISuggestionService {
  if (!instance) {
    instance = new AISuggestionService()
  }
  return instance
}
