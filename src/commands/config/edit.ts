import * as p from '@clack/prompts'
import { spawn } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getConfigStore } from '../../storage/config-store.js'
import { SafeCLIError } from '../../utils/errors.js'
import { renderScreen } from '../../ui/render.js'
import { ChainEditSuccessScreen } from '../../ui/screens/index.js'

export async function editChains() {
  p.intro('Edit Chain Configurations')

  try {
    const configStore = getConfigStore()
    const chains = configStore.getAllChains()

    // Get editor from environment or default to vim
    const editor = process.env.EDITOR || process.env.VISUAL || 'vim'

    // Create a temporary file
    const tempFile = join(tmpdir(), `safe-chains-${Date.now()}.json`)

    // Write current config to temp file with helpful comments
    const configContent = {
      _comment: 'Edit chain configurations below. Save and exit to apply changes.',
      _format: {
        chainId: 'Chain ID as a string (e.g., "1", "11155111")',
        name: 'Human-readable chain name',
        shortName: 'EIP-3770 short name (e.g., "eth", "sep", "matic")',
        rpcUrl: 'RPC endpoint URL',
        currency: 'Native currency symbol (e.g., "ETH")',
        explorer: '(Optional) Block explorer base URL',
      },
      chains,
    }

    writeFileSync(tempFile, JSON.stringify(configContent, null, 2), 'utf-8')

    console.log(`\nOpening ${editor}...`)
    console.log('Save and exit to apply changes, or exit without saving to cancel.\n')

    // Open editor
    await new Promise<void>((resolve, reject) => {
      const editorProcess = spawn(editor, [tempFile], {
        stdio: 'inherit',
      })

      editorProcess.on('exit', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new SafeCLIError(`Editor exited with code ${code}`))
        }
      })

      editorProcess.on('error', (error) => {
        reject(new SafeCLIError(`Failed to open editor: ${error.message}`))
      })
    })

    // Read the edited file
    const editedContent = readFileSync(tempFile, 'utf-8')
    unlinkSync(tempFile) // Clean up temp file

    // Parse and validate
    let parsedConfig: any
    try {
      parsedConfig = JSON.parse(editedContent)
    } catch (error) {
      throw new SafeCLIError('Invalid JSON format. Changes not saved.')
    }

    if (!parsedConfig.chains || typeof parsedConfig.chains !== 'object') {
      throw new SafeCLIError('Invalid configuration structure. Changes not saved.')
    }

    const newChains = parsedConfig.chains

    // Validate each chain
    for (const [chainId, chain] of Object.entries(newChains)) {
      const c = chain as any

      if (!c.chainId || !c.name || !c.shortName || !c.rpcUrl || !c.currency) {
        throw new SafeCLIError(
          `Invalid chain configuration for ${chainId}: missing required fields (chainId, name, shortName, rpcUrl, currency)`
        )
      }

      if (c.chainId !== chainId) {
        throw new SafeCLIError(
          `Chain ID mismatch: key is ${chainId} but chainId field is ${c.chainId}`
        )
      }

      // Validate shortName format
      if (!/^[a-z0-9-]+$/.test(c.shortName)) {
        throw new SafeCLIError(
          `Invalid shortName for chain ${chainId}: must be lowercase alphanumeric with hyphens`
        )
      }

      // Validate URLs
      if (!c.rpcUrl.startsWith('http://') && !c.rpcUrl.startsWith('https://')) {
        throw new SafeCLIError(
          `Invalid RPC URL for chain ${chainId}: must start with http:// or https://`
        )
      }

      if (c.explorer && !c.explorer.startsWith('http://') && !c.explorer.startsWith('https://')) {
        throw new SafeCLIError(
          `Invalid explorer URL for chain ${chainId}: must start with http:// or https://`
        )
      }
    }

    // Check for changes
    const oldChainsStr = JSON.stringify(chains, null, 2)
    const newChainsStr = JSON.stringify(newChains, null, 2)

    if (oldChainsStr === newChainsStr) {
      p.outro('No changes detected')
      return
    }

    // Show what changed
    const oldChainIds = new Set(Object.keys(chains))
    const newChainIds = new Set(Object.keys(newChains))

    const added = Array.from(newChainIds).filter((id) => !oldChainIds.has(id))
    const removed = Array.from(oldChainIds).filter((id) => !newChainIds.has(id))
    const modified = Array.from(newChainIds).filter(
      (id) => oldChainIds.has(id) && JSON.stringify(chains[id]) !== JSON.stringify(newChains[id])
    )

    const addedNames = added.map((id) => newChains[id].name)
    const removedNames = removed.map((id) => chains[id].name)
    const modifiedNames = modified.map((id) => newChains[id].name)

    const confirm = await p.confirm({
      message: 'Apply these changes?',
      initialValue: true,
    })

    if (!confirm || p.isCancel(confirm)) {
      p.cancel('Changes discarded')
      return
    }

    // Apply changes
    const spinner = p.spinner()
    spinner.start('Saving configuration')

    // Remove deleted chains
    for (const chainId of removed) {
      configStore.deleteChain(chainId)
    }

    // Add/update chains
    for (const [chainId, chain] of Object.entries(newChains)) {
      const c = chain as any
      configStore.setChain(chainId, {
        chainId: c.chainId,
        name: c.name,
        shortName: c.shortName,
        rpcUrl: c.rpcUrl,
        currency: c.currency,
        explorer: c.explorer,
      })
    }

    spinner.stop('Configuration saved')

    await renderScreen(ChainEditSuccessScreen, {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
      addedNames,
      modifiedNames,
      removedNames,
    })
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
