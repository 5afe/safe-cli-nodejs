import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getPassword, validatePasswordSecurity, ENV_VARS } from '../../../utils/password-handler.js'
import * as p from '@clack/prompts'
import { writeFileSync, unlinkSync } from 'fs'
import { resolve } from 'path'

// Mock modules
vi.mock('@clack/prompts')
vi.mock('../../../utils/command-helpers.js', () => ({
  isNonInteractiveMode: vi.fn(() => false),
}))

describe('password-handler', () => {
  let originalArgv: string[]
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    vi.clearAllMocks()
    originalArgv = process.argv
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.argv = originalArgv
    process.env = originalEnv
  })

  describe('getPassword', () => {
    it('should prioritize environment variable password', async () => {
      process.env.TEST_PASSWORD = 'env-password'

      const result = await getPassword({
        passwordEnv: 'TEST_PASSWORD',
        password: 'cli-password',
      })

      expect(result).toBe('env-password')
    })

    it('should fall back to prompt when env var not found', async () => {
      vi.mocked(p.log.warn).mockImplementation(() => {})
      vi.mocked(p.password).mockResolvedValue('prompt-password')
      vi.mocked(p.isCancel).mockReturnValue(false)

      const result = await getPassword({
        passwordEnv: 'NON_EXISTENT_VAR',
      })

      expect(result).toBe('prompt-password')
      expect(p.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Environment variable NON_EXISTENT_VAR not found')
      )
    })

    it('should read password from file', async () => {
      const testFile = resolve('/tmp/test-password.txt')
      writeFileSync(testFile, 'file-password\n')

      try {
        const result = await getPassword({
          passwordFile: testFile,
        })

        expect(result).toBe('file-password')
      } finally {
        unlinkSync(testFile)
      }
    })

    it('should trim whitespace from file password', async () => {
      const testFile = resolve('/tmp/test-password-whitespace.txt')
      writeFileSync(testFile, '  file-password  \n\n')

      try {
        const result = await getPassword({
          passwordFile: testFile,
        })

        expect(result).toBe('file-password')
      } finally {
        unlinkSync(testFile)
      }
    })

    it('should return null on file read error', async () => {
      vi.mocked(p.log.error).mockImplementation(() => {})

      const result = await getPassword({
        passwordFile: '/nonexistent/file.txt',
      })

      expect(result).toBeNull()
      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to read password'))
    })

    it('should use CLI flag password and show warning', async () => {
      process.argv = ['node', 'script.js', '--password', 'cli-password']
      vi.mocked(p.log.warn).mockImplementation(() => {})

      const result = await getPassword({
        password: 'cli-password',
      })

      expect(result).toBe('cli-password')
      expect(p.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Password provided via CLI argument')
      )
    })

    it('should use CLI flag password without warning when not in argv', async () => {
      process.argv = ['node', 'script.js']
      vi.mocked(p.log.warn).mockImplementation(() => {})

      const result = await getPassword({
        password: 'cli-password',
      })

      expect(result).toBe('cli-password')
      expect(p.log.warn).not.toHaveBeenCalled()
    })

    it('should prompt for password in interactive mode', async () => {
      const { isNonInteractiveMode } = await import('../../../utils/command-helpers.js')
      vi.mocked(isNonInteractiveMode).mockReturnValue(false)
      vi.mocked(p.password).mockResolvedValue('prompt-password')
      vi.mocked(p.isCancel).mockReturnValue(false)

      const result = await getPassword({})

      expect(result).toBe('prompt-password')
      expect(p.password).toHaveBeenCalledWith({
        message: 'Enter wallet password',
      })
    })

    it('should use custom prompt message', async () => {
      const { isNonInteractiveMode } = await import('../../../utils/command-helpers.js')
      vi.mocked(isNonInteractiveMode).mockReturnValue(false)
      vi.mocked(p.password).mockResolvedValue('password')
      vi.mocked(p.isCancel).mockReturnValue(false)

      await getPassword({}, 'Custom password prompt')

      expect(p.password).toHaveBeenCalledWith({
        message: 'Custom password prompt',
      })
    })

    it('should return null when prompt is cancelled', async () => {
      const { isNonInteractiveMode } = await import('../../../utils/command-helpers.js')
      vi.mocked(isNonInteractiveMode).mockReturnValue(false)
      const cancelSymbol = Symbol('cancel')
      vi.mocked(p.password).mockResolvedValue(cancelSymbol)
      vi.mocked(p.isCancel).mockReturnValue(true)

      const result = await getPassword({})

      expect(result).toBeNull()
    })

    it('should return null in non-interactive mode without prompt', async () => {
      const { isNonInteractiveMode } = await import('../../../utils/command-helpers.js')
      vi.mocked(isNonInteractiveMode).mockReturnValue(true)

      const result = await getPassword({})

      expect(result).toBeNull()
      expect(p.password).not.toHaveBeenCalled()
    })

    it('should prioritize env over file over CLI', async () => {
      process.env.TEST_PASSWORD = 'env-password'
      const testFile = resolve('/tmp/test-priority.txt')
      writeFileSync(testFile, 'file-password')

      try {
        const result = await getPassword({
          passwordEnv: 'TEST_PASSWORD',
          passwordFile: testFile,
          password: 'cli-password',
        })

        expect(result).toBe('env-password')
      } finally {
        unlinkSync(testFile)
      }
    })

    it('should prioritize file over CLI when env not set', async () => {
      const testFile = resolve('/tmp/test-priority2.txt')
      writeFileSync(testFile, 'file-password')

      try {
        const result = await getPassword({
          passwordFile: testFile,
          password: 'cli-password',
        })

        expect(result).toBe('file-password')
      } finally {
        unlinkSync(testFile)
      }
    })
  })

  describe('validatePasswordSecurity', () => {
    it('should show warning when password in CLI args with --password flag', () => {
      process.argv = ['node', 'script.js', '--password', 'test']
      vi.mocked(p.log.warn).mockImplementation(() => {})

      validatePasswordSecurity({ password: 'test' })

      expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining('SECURITY WARNING'))
      expect(p.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Password provided via CLI argument')
      )
    })

    it('should show warning when password in CLI args with -p flag', () => {
      process.argv = ['node', 'script.js', '-p', 'test']
      vi.mocked(p.log.warn).mockImplementation(() => {})

      validatePasswordSecurity({ password: 'test' })

      expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining('SECURITY WARNING'))
    })

    it('should not show warning when password not in CLI args', () => {
      process.argv = ['node', 'script.js']
      vi.mocked(p.log.warn).mockImplementation(() => {})

      validatePasswordSecurity({ password: 'test' })

      expect(p.log.warn).not.toHaveBeenCalled()
    })

    it('should not show warning when no password provided', () => {
      process.argv = ['node', 'script.js', '--password', 'test']
      vi.mocked(p.log.warn).mockImplementation(() => {})

      validatePasswordSecurity({})

      expect(p.log.warn).not.toHaveBeenCalled()
    })
  })

  describe('ENV_VARS', () => {
    it('should export standard environment variable names', () => {
      expect(ENV_VARS.WALLET_PASSWORD).toBe('SAFE_WALLET_PASSWORD')
      expect(ENV_VARS.ACTIVE_WALLET).toBe('SAFE_ACTIVE_WALLET')
      expect(ENV_VARS.CONFIG_DIR).toBe('SAFE_CONFIG_DIR')
      expect(ENV_VARS.OUTPUT_FORMAT).toBe('SAFE_OUTPUT_FORMAT')
      expect(ENV_VARS.SAFE_API_KEY).toBe('SAFE_API_KEY')
      expect(ENV_VARS.ETHERSCAN_API_KEY).toBe('ETHERSCAN_API_KEY')
    })
  })
})
