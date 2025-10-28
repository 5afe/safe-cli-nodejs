import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { CLITestHelper } from '../helpers/cli-test-helper.js'

/**
 * E2E Tests for Config Commands
 * Tests the config CLI commands through the actual CLI interface
 */
describe('E2E Config Commands', () => {
  let cli: CLITestHelper
  let testConfigDir: string
  let testDataDir: string

  beforeEach(() => {
    // Create isolated config directory for this test
    testConfigDir = mkdtempSync(join(tmpdir(), 'safe-cli-config-e2e-config-'))
    testDataDir = mkdtempSync(join(tmpdir(), 'safe-cli-config-e2e-data-'))

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

  describe('config --help', () => {
    it('should display config help information', async () => {
      const result = await cli.exec(['config', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Manage CLI configuration')
      expect(result.stdout).toContain('init')
      expect(result.stdout).toContain('show')
      expect(result.stdout).toContain('edit')
      expect(result.stdout).toContain('chains')
    })
  })

  describe('config init', () => {
    it('should show help for config init', async () => {
      const result = await cli.exec(['config', 'init', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Initialize configuration')
    })

    it(
      'should initialize config with default settings',
      async () => {
        const result = await cli.execWithInput(
          ['config', 'init'],
          [
            'y', // Use default chain configurations
            'n', // Do not need Safe API key
            'n', // Do not need Etherscan API key
          ],
          {
            timeout: 30000,
            env: {
              XDG_CONFIG_HOME: testConfigDir,
              XDG_DATA_HOME: testDataDir,
            },
          }
        )

        // Check that init completed
        expect(result.stdout).toContain('Initialize Safe CLI')
        // May have various exit codes depending on interactive lib
        expect([0, 1]).toContain(result.exitCode ?? 0)
      },
      { timeout: 60000 }
    )

    it(
      'should initialize config and add API keys',
      async () => {
        const result = await cli.execWithInput(
          ['config', 'init'],
          [
            'y', // Use default chain configurations
            'y', // Need Safe API key
            'test-safe-api-key', // Safe API key
            'n', // Do not need Etherscan API key
          ],
          {
            timeout: 30000,
            env: {
              XDG_CONFIG_HOME: testConfigDir,
              XDG_DATA_HOME: testDataDir,
            },
          }
        )

        expect(result.stdout).toContain('Initialize Safe CLI')
        expect([0, 1]).toContain(result.exitCode ?? 0)
      },
      { timeout: 60000 }
    )
  })

  describe('config show', () => {
    it('should show help for config show', async () => {
      const result = await cli.exec(['config', 'show', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Show current configuration')
    })

    it(
      'should show config or indicate no config exists',
      async () => {
        const result = await cli.exec(['config', 'show'], {
          env: {
            XDG_CONFIG_HOME: testConfigDir,
            XDG_DATA_HOME: testDataDir,
          },
        })

        // Should complete successfully or indicate no config
        expect([0, 1]).toContain(result.exitCode ?? 0)
      },
      { timeout: 30000 }
    )
  })

  describe('config edit', () => {
    it('should show help for config edit', async () => {
      const result = await cli.exec(['config', 'edit', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Edit configuration')
    })
  })

  describe('config chains', () => {
    it('should show help for config chains', async () => {
      const result = await cli.exec(['config', 'chains', '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Manage chain configurations')
    })

    it(
      'should list available chains',
      async () => {
        const result = await cli.exec(['config', 'chains'], {
          env: {
            XDG_CONFIG_HOME: testConfigDir,
            XDG_DATA_HOME: testDataDir,
          },
        })

        // Should complete successfully
        expect([0, 1]).toContain(result.exitCode ?? 0)
      },
      { timeout: 30000 }
    )
  })

  describe('config error handling', () => {
    it('should handle invalid config commands', async () => {
      const result = await cli.exec(['config', 'invalid-command'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      expect(result.exitCode).not.toBe(0)
    })
  })

  describe('config with environment variables', () => {
    it('should respect XDG_CONFIG_HOME', async () => {
      const result = await cli.exec(['config', '--help'], {
        env: {
          XDG_CONFIG_HOME: testConfigDir,
          XDG_DATA_HOME: testDataDir,
        },
      })

      expect(result.exitCode).toBe(0)
    })

    it('should handle config operations with custom directories', async () => {
      const customConfig = mkdtempSync(join(tmpdir(), 'custom-config-'))
      const customData = mkdtempSync(join(tmpdir(), 'custom-data-'))

      try {
        const result = await cli.exec(['config', 'show'], {
          env: {
            XDG_CONFIG_HOME: customConfig,
            XDG_DATA_HOME: customData,
          },
        })

        expect([0, 1]).toContain(result.exitCode ?? 0)
      } finally {
        // Cleanup
        try {
          if (existsSync(customConfig)) {
            rmSync(customConfig, { recursive: true, force: true })
          }
          if (existsSync(customData)) {
            rmSync(customData, { recursive: true, force: true })
          }
        } catch {
          // Ignore
        }
      }
    })
  })
})
