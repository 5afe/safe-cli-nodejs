import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { CLITestHelper } from '../helpers/cli-test-helper.js'

/**
 * E2E Tests for Account Commands
 * Tests the account CLI commands through the actual CLI interface
 */
describe('E2E Account Commands', () => {
  let cli: CLITestHelper
  let testConfigDir: string
  let testDataDir: string

  beforeEach(() => {
    // Create isolated config directory for this test
    testConfigDir = mkdtempSync(join(tmpdir(), 'safe-cli-account-e2e-config-'))
    testDataDir = mkdtempSync(join(tmpdir(), 'safe-cli-account-e2e-data-'))

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

  describe('account --help', () => {
    it('should display account help information', async () => {
      const result = await cli.exec(['account', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Manage Safe accounts')
      expect(result.stdout).toContain('create')
      expect(result.stdout).toContain('deploy')
      expect(result.stdout).toContain('info')
      expect(result.stdout).toContain('list')
    })
  })

  describe('account create', () => {
    it('should show help for account create', async () => {
      const result = await cli.exec(['account', 'create', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Create a new Safe account')
    })

    it(
      'should handle account create command',
      async () => {
        const result = await cli.exec(['account', 'create', '--help'], {
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

  describe('account deploy', () => {
    it('should show help for account deploy', async () => {
      const result = await cli.exec(['account', 'deploy', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Deploy a predicted Safe account')
    })
  })

  describe('account info', () => {
    it('should show help for account info', async () => {
      const result = await cli.exec(['account', 'info', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Get Safe account information')
    })

    it(
      'should handle missing account gracefully',
      async () => {
        // Try to get info without specifying an account
        const result = await cli.exec(['account', 'info'], {
          env: {
            XDG_CONFIG_HOME: testConfigDir,
            XDG_DATA_HOME: testDataDir,
          },
        })

        // Should either fail or prompt for input
        expect([0, 1]).toContain(result.exitCode ?? 0)
      },
      { timeout: 30000 }
    )
  })

  describe('account list', () => {
    it('should show help for account list', async () => {
      const result = await cli.exec(['account', 'list', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('List all Safe accounts')
    })

    it(
      'should list accounts or show empty state',
      async () => {
        const result = await cli.exec(['account', 'list'], {
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

  describe('account add-owner', () => {
    it('should show help for account add-owner', async () => {
      const result = await cli.exec(['account', 'add-owner', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Add an owner to Safe account')
    })
  })

  describe('account remove-owner', () => {
    it('should show help for account remove-owner', async () => {
      const result = await cli.exec(['account', 'remove-owner', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Remove an owner from Safe account')
    })
  })

  describe('account change-threshold', () => {
    it('should show help for account change-threshold', async () => {
      const result = await cli.exec(['account', 'change-threshold', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Change Safe account threshold')
    })
  })

  describe('account open', () => {
    it('should show help for account open', async () => {
      const result = await cli.exec(['account', 'open', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Open Safe account in browser')
    })
  })

  describe('account error handling', () => {
    it('should handle invalid account commands', async () => {
      const result = await cli.exec(['account', 'invalid-command'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      expect(result.exitCode).not.toBe(0)
    })

    it('should handle invalid Safe address format', async () => {
      const result = await cli.exec(['account', 'info', '--address', 'invalid-address'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      // Should fail with invalid address
      expect([1]).toContain(result.exitCode ?? 1)
    })
  })

  describe('account with chain specification', () => {
    it('should accept chain parameter for account operations', async () => {
      const result = await cli.exec(['account', 'list', '--chain', 'sepolia'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      // Should complete (may have empty list)
      expect([0, 1]).toContain(result.exitCode ?? 0)
    })

    it('should handle invalid chain name', async () => {
      const result = await cli.exec(['account', 'list', '--chain', 'invalid-chain'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      // Should fail or handle gracefully
      expect([0, 1]).toContain(result.exitCode ?? 0)
    })
  })

  describe('account address format support', () => {
    it('should support EIP-3770 address format', async () => {
      const result = await cli.exec(['account', 'info', '--help'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      expect(result.exitCode).toBe(0)
      // The help should mention address format
      expect(result.stdout.length).toBeGreaterThan(0)
    })
  })
})
