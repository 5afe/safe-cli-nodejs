import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ensureActiveWallet,
  ensureChainConfigured,
  handleCommandError,
  checkCancelled,
  promptPassword,
  output,
  outputSuccess,
  outputError,
  isNonInteractiveMode,
} from '../../../utils/command-helpers.js'
import { SafeCLIError } from '../../../utils/errors.js'
import * as p from '@clack/prompts'
import type { WalletStorageService } from '../../../storage/wallet-store.js'
import type { ConfigStore } from '../../../storage/config-store.js'
import type { Wallet } from '../../../types/wallet.js'
import type { ChainConfig } from '../../../types/config.js'
import { TEST_ADDRESSES } from '../../fixtures/index.js'

// Mock modules
vi.mock('@clack/prompts')
vi.mock('../../../services/validation-service.js', () => ({
  getValidationService: () => ({
    validatePassword: (value: string, minLength: number) => {
      if (value.length < minLength) {
        return `Password must be at least ${minLength} characters`
      }
      return undefined
    },
    validatePasswordConfirmation: (value: string, password: string) => {
      if (value !== password) {
        return 'Passwords do not match'
      }
      return undefined
    },
  }),
}))
vi.mock('../../../types/global-options.js', () => ({
  isJsonMode: vi.fn(() => false),
  isQuietMode: vi.fn(() => false),
}))

describe('command-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ensureActiveWallet', () => {
    it('should return wallet when active wallet exists', () => {
      const mockWallet: Wallet = {
        name: 'test-wallet',
        address: TEST_ADDRESSES.owner1,
        encryptedPrivateKey: 'encrypted',
        type: 'private-key',
      }
      const mockStorage = {
        getActiveWallet: vi.fn(() => mockWallet),
      } as unknown as WalletStorageService

      const result = ensureActiveWallet(mockStorage)
      expect(result).toEqual(mockWallet)
      expect(mockStorage.getActiveWallet).toHaveBeenCalled()
    })

    it('should return null and log error when no active wallet', () => {
      const mockStorage = {
        getActiveWallet: vi.fn(() => null),
      } as unknown as WalletStorageService

      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})

      const result = ensureActiveWallet(mockStorage)
      expect(result).toBeNull()
      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('No active wallet'))
      expect(p.outro).toHaveBeenCalledWith('Setup required')
    })
  })

  describe('ensureChainConfigured', () => {
    it('should return chain config when chain exists', () => {
      const mockChain: ChainConfig = {
        name: 'Ethereum',
        shortName: 'eth',
        chainId: '1',
        rpc: 'https://eth.llamarpc.com',
        explorer: 'https://etherscan.io',
        color: 'blue',
      }
      const mockConfigStore = {
        getChain: vi.fn(() => mockChain),
      } as unknown as ConfigStore

      const result = ensureChainConfigured('1', mockConfigStore)
      expect(result).toEqual(mockChain)
      expect(mockConfigStore.getChain).toHaveBeenCalledWith('1')
    })

    it('should return null and log error when chain not found', () => {
      const mockConfigStore = {
        getChain: vi.fn(() => null),
      } as unknown as ConfigStore

      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})

      const result = ensureChainConfigured('999', mockConfigStore)
      expect(result).toBeNull()
      expect(p.log.error).toHaveBeenCalledWith('Chain 999 not found in configuration')
      expect(p.outro).toHaveBeenCalledWith('Failed')
    })
  })

  describe('handleCommandError', () => {
    it('should handle SafeCLIError', () => {
      const error = new SafeCLIError('Test error message')
      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})

      handleCommandError(error)
      expect(p.log.error).toHaveBeenCalledWith('Test error message')
      expect(p.outro).toHaveBeenCalledWith('Failed')
    })

    it('should handle generic Error', () => {
      const error = new Error('Generic error')
      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})

      handleCommandError(error)
      expect(p.log.error).toHaveBeenCalledWith('Unexpected error: Generic error')
      expect(p.outro).toHaveBeenCalledWith('Failed')
    })

    it('should handle unknown error type', () => {
      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})

      handleCommandError('string error')
      expect(p.log.error).toHaveBeenCalledWith('Unexpected error: Unknown error')
      expect(p.outro).toHaveBeenCalledWith('Failed')
    })

    it('should use custom outro message', () => {
      const error = new SafeCLIError('Test error')
      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})

      handleCommandError(error, 'Custom outro')
      expect(p.outro).toHaveBeenCalledWith('Custom outro')
    })
  })

  describe('checkCancelled', () => {
    it('should return true for non-symbol values', () => {
      expect(checkCancelled('string')).toBe(true)
      expect(checkCancelled(123)).toBe(true)
      expect(checkCancelled({ key: 'value' })).toBe(true)
    })

    it('should return false for cancelled symbol and call p.cancel', () => {
      const cancelSymbol = Symbol('cancel')
      vi.mocked(p.isCancel).mockReturnValue(true)
      vi.mocked(p.cancel).mockImplementation(() => {})

      const result = checkCancelled(cancelSymbol)
      expect(result).toBe(false)
      expect(p.cancel).toHaveBeenCalledWith('Operation cancelled')
    })
  })

  describe('promptPassword', () => {
    it('should prompt for password without confirmation when not creating', async () => {
      vi.mocked(p.password).mockResolvedValue('password123')
      vi.mocked(p.isCancel).mockReturnValue(false)

      const result = await promptPassword(false)
      expect(result).toBe('password123')
      expect(p.password).toHaveBeenCalledTimes(1)
    })

    it('should prompt for password with confirmation when creating', async () => {
      vi.mocked(p.password)
        .mockResolvedValueOnce('password123')
        .mockResolvedValueOnce('password123')
      vi.mocked(p.isCancel).mockReturnValue(false)

      const result = await promptPassword(true)
      expect(result).toBe('password123')
      expect(p.password).toHaveBeenCalledTimes(2)
    })

    it('should return null if password prompt is cancelled', async () => {
      const cancelSymbol = Symbol('cancel')
      vi.mocked(p.password).mockResolvedValue(cancelSymbol)
      vi.mocked(p.isCancel).mockReturnValue(true)
      vi.mocked(p.cancel).mockImplementation(() => {})

      const result = await promptPassword(false)
      expect(result).toBeNull()
    })

    it('should return null if confirmation prompt is cancelled', async () => {
      const cancelSymbol = Symbol('cancel')
      vi.mocked(p.password).mockResolvedValueOnce('password123').mockResolvedValueOnce(cancelSymbol)
      vi.mocked(p.isCancel).mockReturnValueOnce(false).mockReturnValueOnce(true)
      vi.mocked(p.cancel).mockImplementation(() => {})

      const result = await promptPassword(true)
      expect(result).toBeNull()
    })

    it('should use custom message', async () => {
      vi.mocked(p.password).mockResolvedValue('password123')
      vi.mocked(p.isCancel).mockReturnValue(false)

      await promptPassword(false, 'Custom message', 10)
      expect(p.password).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom message',
        })
      )
    })
  })

  describe('output', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    it('should output JSON in JSON mode', async () => {
      const { isJsonMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(true)

      const data = { key: 'value' }
      output(data)
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2))
    })

    it('should use text formatter when provided and not in JSON mode', async () => {
      const { isJsonMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(false)

      const data = { key: 'value' }
      const formatter = (d: unknown) => `Formatted: ${JSON.stringify(d)}`
      output(data, formatter)
      expect(consoleLogSpy).toHaveBeenCalledWith('Formatted: {"key":"value"}')
    })

    it('should output JSON when no formatter provided and not in JSON mode', async () => {
      const { isJsonMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(false)

      const data = { key: 'value' }
      output(data)
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2))
    })
  })

  describe('outputSuccess', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})
    })

    it('should output JSON in JSON mode', async () => {
      const { isJsonMode, isQuietMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(true)
      vi.mocked(isQuietMode).mockReturnValue(false)

      outputSuccess('Success message', { extra: 'data' })
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true, message: 'Success message', extra: 'data' }, null, 2)
      )
    })

    it('should use p.outro in text mode', async () => {
      const { isJsonMode, isQuietMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(false)
      vi.mocked(isQuietMode).mockReturnValue(false)

      outputSuccess('Success message')
      expect(p.outro).toHaveBeenCalledWith('Success message')
    })

    it('should not output in quiet mode', async () => {
      const { isJsonMode, isQuietMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(false)
      vi.mocked(isQuietMode).mockReturnValue(true)

      outputSuccess('Success message')
      expect(p.outro).not.toHaveBeenCalled()
    })
  })

  describe('outputError', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>
    let processExitSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      vi.mocked(p.log.error).mockImplementation(() => {})
      vi.mocked(p.outro).mockImplementation(() => {})
    })

    it('should output JSON in JSON mode and exit', async () => {
      const { isJsonMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(true)

      outputError('Error message', 1)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: false, error: 'Error message', exitCode: 1 }, null, 2)
      )
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should use p.log.error in text mode and exit', async () => {
      const { isJsonMode, isQuietMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(false)
      vi.mocked(isQuietMode).mockReturnValue(false)

      outputError('Error message', 2)
      expect(p.log.error).toHaveBeenCalledWith('Error message')
      expect(p.outro).toHaveBeenCalledWith('Failed')
      expect(processExitSpy).toHaveBeenCalledWith(2)
    })

    it('should not call p.outro in quiet mode', async () => {
      const { isJsonMode, isQuietMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(false)
      vi.mocked(isQuietMode).mockReturnValue(true)

      outputError('Error message')
      expect(p.outro).not.toHaveBeenCalled()
      expect(processExitSpy).toHaveBeenCalled()
    })
  })

  describe('isNonInteractiveMode', () => {
    it('should return true when in JSON mode', async () => {
      const { isJsonMode, isQuietMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(true)
      vi.mocked(isQuietMode).mockReturnValue(false)

      expect(isNonInteractiveMode()).toBe(true)
    })

    it('should return true when in quiet mode', async () => {
      const { isJsonMode, isQuietMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(false)
      vi.mocked(isQuietMode).mockReturnValue(true)

      expect(isNonInteractiveMode()).toBe(true)
    })

    it('should return false in interactive mode', async () => {
      const { isJsonMode, isQuietMode } = await import('../../../types/global-options.js')
      vi.mocked(isJsonMode).mockReturnValue(false)
      vi.mocked(isQuietMode).mockReturnValue(false)

      expect(isNonInteractiveMode()).toBe(false)
    })
  })
})
