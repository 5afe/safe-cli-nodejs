import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SafeCLIError,
  ValidationError,
  ConfigError,
  WalletError,
  handleError,
} from '../../../utils/errors.js'

describe('errors utils', () => {
  describe('SafeCLIError', () => {
    it('should create error with message', () => {
      const error = new SafeCLIError('Test error')
      expect(error.message).toBe('Test error')
    })

    it('should have correct name', () => {
      const error = new SafeCLIError('Test error')
      expect(error.name).toBe('SafeCLIError')
    })

    it('should be instance of Error', () => {
      const error = new SafeCLIError('Test error')
      expect(error).toBeInstanceOf(Error)
    })

    it('should be instance of SafeCLIError', () => {
      const error = new SafeCLIError('Test error')
      expect(error).toBeInstanceOf(SafeCLIError)
    })

    it('should capture stack trace', () => {
      const error = new SafeCLIError('Test error')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('SafeCLIError')
    })

    it('should work with throw statement', () => {
      expect(() => {
        throw new SafeCLIError('Test error')
      }).toThrow(SafeCLIError)
    })

    it('should work with try-catch', () => {
      try {
        throw new SafeCLIError('Test error')
      } catch (error) {
        expect(error).toBeInstanceOf(SafeCLIError)
        expect((error as SafeCLIError).message).toBe('Test error')
      }
    })
  })

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Validation failed')
      expect(error.message).toBe('Validation failed')
    })

    it('should have correct name', () => {
      const error = new ValidationError('Validation failed')
      expect(error.name).toBe('ValidationError')
    })

    it('should be instance of Error', () => {
      const error = new ValidationError('Validation failed')
      expect(error).toBeInstanceOf(Error)
    })

    it('should be instance of SafeCLIError', () => {
      const error = new ValidationError('Validation failed')
      expect(error).toBeInstanceOf(SafeCLIError)
    })

    it('should be instance of ValidationError', () => {
      const error = new ValidationError('Validation failed')
      expect(error).toBeInstanceOf(ValidationError)
    })

    it('should distinguish from other error types', () => {
      const error = new ValidationError('Validation failed')
      expect(error).not.toBeInstanceOf(ConfigError)
      expect(error).not.toBeInstanceOf(WalletError)
    })
  })

  describe('ConfigError', () => {
    it('should create error with message', () => {
      const error = new ConfigError('Config error')
      expect(error.message).toBe('Config error')
    })

    it('should have correct name', () => {
      const error = new ConfigError('Config error')
      expect(error.name).toBe('ConfigError')
    })

    it('should be instance of Error', () => {
      const error = new ConfigError('Config error')
      expect(error).toBeInstanceOf(Error)
    })

    it('should be instance of SafeCLIError', () => {
      const error = new ConfigError('Config error')
      expect(error).toBeInstanceOf(SafeCLIError)
    })

    it('should be instance of ConfigError', () => {
      const error = new ConfigError('Config error')
      expect(error).toBeInstanceOf(ConfigError)
    })

    it('should distinguish from other error types', () => {
      const error = new ConfigError('Config error')
      expect(error).not.toBeInstanceOf(ValidationError)
      expect(error).not.toBeInstanceOf(WalletError)
    })
  })

  describe('WalletError', () => {
    it('should create error with message', () => {
      const error = new WalletError('Wallet error')
      expect(error.message).toBe('Wallet error')
    })

    it('should have correct name', () => {
      const error = new WalletError('Wallet error')
      expect(error.name).toBe('WalletError')
    })

    it('should be instance of Error', () => {
      const error = new WalletError('Wallet error')
      expect(error).toBeInstanceOf(Error)
    })

    it('should be instance of SafeCLIError', () => {
      const error = new WalletError('Wallet error')
      expect(error).toBeInstanceOf(SafeCLIError)
    })

    it('should be instance of WalletError', () => {
      const error = new WalletError('Wallet error')
      expect(error).toBeInstanceOf(WalletError)
    })

    it('should distinguish from other error types', () => {
      const error = new WalletError('Wallet error')
      expect(error).not.toBeInstanceOf(ValidationError)
      expect(error).not.toBeInstanceOf(ConfigError)
    })
  })

  describe('handleError', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>
    let processExitSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
      processExitSpy.mockRestore()
    })

    it('should handle SafeCLIError', () => {
      const error = new SafeCLIError('Test error')
      expect(() => handleError(error)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Test error')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle ValidationError', () => {
      const error = new ValidationError('Validation failed')
      expect(() => handleError(error)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Validation failed')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle ConfigError', () => {
      const error = new ConfigError('Config error')
      expect(() => handleError(error)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Config error')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle WalletError', () => {
      const error = new WalletError('Wallet error')
      expect(() => handleError(error)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Wallet error')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle standard Error', () => {
      const error = new Error('Standard error')
      expect(() => handleError(error)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error: Standard error')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle TypeError', () => {
      const error = new TypeError('Type error')
      expect(() => handleError(error)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error: Type error')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle string error', () => {
      expect(() => handleError('String error')).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('An unexpected error occurred')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle number error', () => {
      expect(() => handleError(42)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('An unexpected error occurred')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle null error', () => {
      expect(() => handleError(null)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('An unexpected error occurred')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle undefined error', () => {
      expect(() => handleError(undefined)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledWith('An unexpected error occurred')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should always call process.exit with code 1', () => {
      const errors = [
        new SafeCLIError('Test 1'),
        new ValidationError('Test 2'),
        new Error('Test 3'),
        'Test 4',
      ]

      errors.forEach((error) => {
        processExitSpy.mockClear()
        expect(() => handleError(error)).toThrow('process.exit called')
        expect(processExitSpy).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('error inheritance chain', () => {
    it('should maintain correct inheritance for ValidationError', () => {
      const error = new ValidationError('Test')
      expect(error instanceof ValidationError).toBe(true)
      expect(error instanceof SafeCLIError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('should maintain correct inheritance for ConfigError', () => {
      const error = new ConfigError('Test')
      expect(error instanceof ConfigError).toBe(true)
      expect(error instanceof SafeCLIError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('should maintain correct inheritance for WalletError', () => {
      const error = new WalletError('Test')
      expect(error instanceof WalletError).toBe(true)
      expect(error instanceof SafeCLIError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('should allow catching SafeCLIError for all custom errors', () => {
      const errors = [
        new SafeCLIError('Test 1'),
        new ValidationError('Test 2'),
        new ConfigError('Test 3'),
        new WalletError('Test 4'),
      ]

      errors.forEach((error) => {
        try {
          throw error
        } catch (e) {
          expect(e).toBeInstanceOf(SafeCLIError)
        }
      })
    })

    it('should allow specific error type catching', () => {
      const error = new ValidationError('Test')

      try {
        throw error
      } catch (e) {
        if (e instanceof ValidationError) {
          expect(e.name).toBe('ValidationError')
        } else {
          throw new Error('Should have caught ValidationError')
        }
      }
    })
  })
})
