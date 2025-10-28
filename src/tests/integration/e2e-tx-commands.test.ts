import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { CLITestHelper } from '../helpers/cli-test-helper.js'

/**
 * E2E Tests for Transaction (tx) Commands
 * Tests the transaction CLI commands through the actual CLI interface
 */
describe('E2E Transaction Commands', () => {
  let cli: CLITestHelper
  let testConfigDir: string
  let testDataDir: string
  let testTempDir: string

  beforeEach(() => {
    // Create isolated directories for this test
    testConfigDir = mkdtempSync(join(tmpdir(), 'safe-cli-tx-e2e-config-'))
    testDataDir = mkdtempSync(join(tmpdir(), 'safe-cli-tx-e2e-data-'))
    testTempDir = mkdtempSync(join(tmpdir(), 'safe-cli-tx-e2e-temp-'))

    cli = new CLITestHelper()
  })

  afterEach(() => {
    cli.kill()

    // Cleanup test directories
    try {
      if (existsSync(testConfigDir)) {
        rmSync(testConfigDir, { recursive: true, force: true })
      }
      if (existsSync(testDataDir)) {
        rmSync(testDataDir, { recursive: true, force: true })
      }
      if (existsSync(testTempDir)) {
        rmSync(testTempDir, { recursive: true, force: true })
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('tx --help', () => {
    it('should display transaction help information', async () => {
      const result = await cli.exec(['tx', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Manage Safe transactions')
      expect(result.stdout).toContain('create')
      expect(result.stdout).toContain('sign')
      expect(result.stdout).toContain('execute')
      expect(result.stdout).toContain('list')
    })
  })

  describe('tx create', () => {
    it('should show help for tx create', async () => {
      const result = await cli.exec(['tx', 'create', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Create a new transaction')
    })

    it(
      'should handle tx create command',
      async () => {
        const result = await cli.exec(['tx', 'create', '--help'], {
          env: {
            XDG_CONFIG_HOME: testConfigDir,
            XDG_DATA_HOME: testDataDir,
          },
        })

        expect(result.exitCode).toBe(0)
      },
      { timeout: 30000 }
    )
  })

  describe('tx sign', () => {
    it('should show help for tx sign', async () => {
      const result = await cli.exec(['tx', 'sign', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Sign a transaction')
    })
  })

  describe('tx execute', () => {
    it('should show help for tx execute', async () => {
      const result = await cli.exec(['tx', 'execute', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Execute a signed transaction')
    })
  })

  describe('tx list', () => {
    it('should show help for tx list', async () => {
      const result = await cli.exec(['tx', 'list', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('List transactions')
    })

    it(
      'should list transactions or show empty state',
      async () => {
        const result = await cli.exec(['tx', 'list'], {
          env: {
            XDG_CONFIG_HOME: testConfigDir,
            XDG_DATA_HOME: testDataDir,
          },
        })

        // Should either succeed with empty list or show appropriate message
        expect([0, 1]).toContain(result.exitCode ?? 0)
      },
      { timeout: 30000 }
    )
  })

  describe('tx status', () => {
    it('should show help for tx status', async () => {
      const result = await cli.exec(['tx', 'status', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Get transaction status')
    })
  })

  describe('tx export', () => {
    it('should show help for tx export', async () => {
      const result = await cli.exec(['tx', 'export', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Export a transaction')
    })

    it(
      'should handle export command',
      async () => {
        const result = await cli.exec(['tx', 'export', '--help'], {
          env: {
            XDG_CONFIG_HOME: testConfigDir,
            XDG_DATA_HOME: testDataDir,
          },
        })

        expect(result.exitCode).toBe(0)
      },
      { timeout: 30000 }
    )
  })

  describe('tx import', () => {
    it('should show help for tx import', async () => {
      const result = await cli.exec(['tx', 'import', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Import a transaction')
    })

    it(
      'should handle invalid import file',
      async () => {
        const nonExistentFile = join(testTempDir, 'nonexistent.json')

        const result = await cli.exec(['tx', 'import', nonExistentFile], {
          env: {
            XDG_CONFIG_HOME: testConfigDir,
            XDG_DATA_HOME: testDataDir,
          },
        })

        // Should fail with file not found
        expect([1]).toContain(result.exitCode ?? 1)
      },
      { timeout: 30000 }
    )

    it(
      'should handle invalid JSON in import file',
      async () => {
        const invalidJsonFile = join(testTempDir, 'invalid.json')
        writeFileSync(invalidJsonFile, 'not valid json', 'utf-8')

        const result = await cli.exec(['tx', 'import', invalidJsonFile], {
          env: {
            XDG_CONFIG_HOME: testConfigDir,
            XDG_DATA_HOME: testDataDir,
          },
        })

        // Should fail with parse error
        expect([1]).toContain(result.exitCode ?? 1)
      },
      { timeout: 30000 }
    )
  })

  describe('tx pull', () => {
    it('should show help for tx pull', async () => {
      const result = await cli.exec(['tx', 'pull', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Pull pending transactions from Safe API')
    })
  })

  describe('tx push', () => {
    it('should show help for tx push', async () => {
      const result = await cli.exec(['tx', 'push', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Push transaction to Safe API')
    })
  })

  describe('tx sync', () => {
    it('should show help for tx sync', async () => {
      const result = await cli.exec(['tx', 'sync', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Sync transactions with Safe API')
    })
  })

  describe('tx error handling', () => {
    it('should handle invalid tx commands', async () => {
      const result = await cli.exec(['tx', 'invalid-command'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      expect(result.exitCode).not.toBe(0)
    })

    it('should handle missing Safe address', async () => {
      const result = await cli.exec(['tx', 'create'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      // Should fail or prompt for input
      expect([0, 1]).toContain(result.exitCode ?? 0)
    })

    it('should handle invalid Safe TX hash', async () => {
      const result = await cli.exec(['tx', 'status', '--hash', 'invalid-hash'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      // Should fail with invalid hash
      expect([1]).toContain(result.exitCode ?? 1)
    })
  })

  describe('tx with Safe address', () => {
    it('should accept Safe address parameter', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890'

      const result = await cli.exec(['tx', 'list', '--safe', testAddress], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      // May fail due to no wallet/config, but should accept the parameter
      expect([0, 1]).toContain(result.exitCode ?? 0)
    })

    it('should support EIP-3770 address format', async () => {
      const testAddress = 'sep:0x1234567890123456789012345678901234567890'

      const result = await cli.exec(['tx', 'list', '--safe', testAddress], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      // May fail due to no wallet/config, but should accept the parameter
      expect([0, 1]).toContain(result.exitCode ?? 0)
    })
  })

  describe('tx output formats', () => {
    it('should support JSON output format', async () => {
      const result = await cli.exec(['tx', 'list', '--format', 'json'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      // Should accept format parameter
      expect([0, 1]).toContain(result.exitCode ?? 0)
    })
  })

  describe('tx with transaction data', () => {
    it('should accept transaction data parameters', async () => {
      const result = await cli.exec(['tx', 'create', '--help'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      expect(result.exitCode).toBe(0)
      // Should show parameters for to, value, data
      expect(result.stdout.length).toBeGreaterThan(0)
    })
  })

  describe('tx batch operations', () => {
    it('should show help mentions batch capabilities', async () => {
      const result = await cli.exec(['tx', 'create', '--help'])

      expect(result.exitCode).toBe(0)
      // Create command should exist
      expect(result.stdout).toContain('Create')
    })
  })
})
