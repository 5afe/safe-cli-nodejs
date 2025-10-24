import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getConfigStore } from '../../storage/config-store.js'
import { DEFAULT_CHAINS } from '../../constants/chains.js'

export async function initConfig() {
  p.intro(pc.bgCyan(pc.black(' Initialize Safe CLI ')))

  const configStore = getConfigStore()

  console.log('')
  console.log('Welcome to Safe CLI!')
  console.log('This wizard will help you set up your configuration.')
  console.log('')

  // Check if chains already exist
  const existingChains = configStore.getAllChains()
  const hasExistingChains = Object.keys(existingChains).length > 0

  // Ask about default chains
  const useDefaults = await p.confirm({
    message: hasExistingChains
      ? 'Would you like to reset to default chain configurations? (This will overwrite your current chains)'
      : 'Would you like to use the default chain configurations?',
    initialValue: true,
  })

  if (p.isCancel(useDefaults)) {
    p.cancel('Operation cancelled')
    return
  }

  if (useDefaults) {
    // Show warning if overwriting existing chains
    if (hasExistingChains) {
      console.log('')
      console.log(pc.yellow('⚠ This will replace all existing chain configurations with defaults'))
      console.log('')

      const confirm = await p.confirm({
        message: 'Are you sure you want to continue?',
        initialValue: false,
      })

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled')
        return
      }
    }

    // Load default chains
    const spinner = p.spinner()
    spinner.start('Loading default chains...')

    for (const [chainId, chain] of Object.entries(DEFAULT_CHAINS)) {
      configStore.setChain(chainId, chain)
    }

    spinner.stop('Default chains loaded')
    console.log(pc.dim(`Loaded ${Object.keys(DEFAULT_CHAINS).length} default chains`))
  } else {
    const shouldClear = await p.confirm({
      message: 'Remove all existing chain configurations?',
    })

    if (p.isCancel(shouldClear)) {
      p.cancel('Operation cancelled')
      return
    }

    if (shouldClear) {
      configStore.reset()
      console.log(pc.dim('All configurations cleared'))
    }
  }

  // Ask about Safe API key
  console.log('')
  console.log(pc.dim('Some chains require an API key for the Safe Transaction Service.'))
  console.log(pc.dim('You can get one from https://dashboard.safe.global/'))
  console.log('')

  const needsApiKey = await p.confirm({
    message: 'Do you have a Safe Transaction Service API key?',
    initialValue: false,
  })

  if (p.isCancel(needsApiKey)) {
    p.cancel('Operation cancelled')
    return
  }

  if (needsApiKey) {
    const apiKey = await p.text({
      message: 'Enter your Safe API key:',
      placeholder: 'sk_...',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'API key cannot be empty'
        }
      },
    })

    if (p.isCancel(apiKey)) {
      p.cancel('Operation cancelled')
      return
    }

    configStore.setPreference('safeApiKey', apiKey as string)
    console.log(pc.green('✓ API key saved'))
  }

  console.log('')
  console.log(pc.green('✓ Configuration initialized successfully!'))
  console.log('')
  console.log('Next steps:')
  console.log(`  ${pc.cyan('•')} Import a wallet:    ${pc.bold('safe wallet import')}`)
  console.log(`  ${pc.cyan('•')} View configuration: ${pc.bold('safe config show')}`)
  console.log(`  ${pc.cyan('•')} Manage chains:      ${pc.bold('safe config chains list')}`)
  console.log('')

  p.outro(pc.green('Ready to use Safe CLI!'))
}
