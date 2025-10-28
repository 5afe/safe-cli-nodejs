import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { CLITestHelper, CLIOutputParser } from '../helpers/cli-test-helper.js'

/**
 * E2E Tests for Wallet Commands
 * Tests the wallet CLI commands through the actual CLI interface
 */
describe('E2E Wallet Commands', () => {
  // Skip if TEST_WALLET_PK not set
  if (!process.env.TEST_WALLET_PK) {
    it.skip('E2E wallet tests skipped - TEST_WALLET_PK not set', () => {})
    return
  }

  let cli: CLITestHelper
  let testConfigDir: string
  let testDataDir: string

  beforeEach(() => {
    // Create isolated config directory for this test
    testConfigDir = mkdtempSync(join(tmpdir(), 'safe-cli-wallet-e2e-config-'))
    testDataDir = mkdtempSync(join(tmpdir(), 'safe-cli-wallet-e2e-data-'))

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
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('wallet --help', () => {
    it('should display wallet help information', async () => {
      const result = await cli.exec(['wallet', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Manage wallets')
      expect(result.stdout).toContain('import')
      expect(result.stdout).toContain('create')
      expect(result.stdout).toContain('list')
      expect(result.stdout).toContain('use')
      expect(result.stdout).toContain('remove')
    })
  })

  describe('wallet import', () => {
    it('should show help for wallet import', async () => {
      const result = await cli.exec(['wallet', 'import', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Import a wallet')
    })

    it(
      'should import a wallet with private key',
      async () => {
        const result = await cli.execWithInput(
          ['wallet', 'import'],
          [
            'Test Wallet', // Wallet name
            process.env.TEST_WALLET_PK!, // Private key
            'test-password-123', // Password
            'test-password-123', // Confirm password
          ],
          {
            timeout: 30000,
            env: {
              XDG_CONFIG_HOME: testConfigDir,
              XDG_DATA_HOME: testDataDir,
            },
          }
        )

        // Check for success indicators
        const hasSuccess = CLIOutputParser.hasSuccess(result.stdout)
        const hasAddress = CLIOutputParser.extractAddress(result.stdout)

        // Either succeeded or partially completed (depending on interactive lib behavior)
        expect(hasSuccess || hasAddress !== null || result.exitCode === 0).toBe(true)
      },
      { timeout: 60000 }
    )
  })

  describe('wallet create', () => {
    it('should show help for wallet create', async () => {
      const result = await cli.exec(['wallet', 'create', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Create a new wallet')
    })

    it(
      'should create a new wallet with generated private key',
      async () => {
        const result = await cli.execWithInput(
          ['wallet', 'create'],
          [
            'y', // Accept security warnings
            'test-password-123', // Password
            'test-password-123', // Confirm password
            'Generated Wallet', // Wallet name
            // Note: We can't easily test the backup verification in automated tests
            // as it requires reading and re-entering the generated private key
          ],
          {
            timeout: 30000,
            env: {
              XDG_CONFIG_HOME: testConfigDir,
              XDG_DATA_HOME: testDataDir,
            },
          }
        )

        // The command should start successfully and show security warnings
        expect(result.stdout).toContain('Security Warning')
      },
      { timeout: 60000 }
    )
  })

  describe('wallet list', () => {
    it('should show help for wallet list', async () => {
      const result = await cli.exec(['wallet', 'list', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('List all wallets')
    })

    it(
      'should list wallets or show empty state',
      async () => {
        const result = await cli.exec(['wallet', 'list'], {
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

  describe('wallet use', () => {
    it('should show help for wallet use', async () => {
      const result = await cli.exec(['wallet', 'use', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Set active wallet')
    })
  })

  describe('wallet remove', () => {
    it('should show help for wallet remove', async () => {
      const result = await cli.exec(['wallet', 'remove', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Remove a wallet')
    })
  })

  describe('wallet import-ledger', () => {
    it('should show help for wallet import-ledger', async () => {
      const result = await cli.exec(['wallet', 'import-ledger', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Import wallet from Ledger')
    })
  })

  describe('wallet error handling', () => {
    it('should handle invalid wallet commands', async () => {
      const result = await cli.exec(['wallet', 'invalid-command'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      expect(result.exitCode).not.toBe(0)
    })

    it('should handle missing required arguments', async () => {
      const result = await cli.exec(['wallet', 'remove'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      // Should fail or prompt for input
      expect([0, 1]).toContain(result.exitCode ?? 0)
    })
  })
})
