import * as p from '@clack/prompts'
import { getConfigStore } from '../../storage/config-store.js'
import { DEFAULT_CHAINS } from '../../constants/chains.js'
import { renderScreen } from '../../ui/render.js'
import { ConfigInitSuccessScreen } from '../../ui/screens/index.js'

export async function initConfig() {
  p.intro(' Initialize Safe CLI ')

  const configStore = getConfigStore()

  p.log.info('Welcome to Safe CLI!')
  p.log.info('This wizard will help you set up your configuration.')
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
      p.log.warning('This will replace all existing chain configurations with defaults')
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
    p.log.step(`Loaded ${Object.keys(DEFAULT_CHAINS).length} default chains`)
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
      p.log.step('All configurations cleared')
    }
  }

  // Ask about Safe API key
  console.log('')
  p.log.info('Some chains require an API key for the Safe Transaction Service.')
  p.log.info('You can get one from https://dashboard.safe.global/')
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
        return undefined
      },
    })

    if (p.isCancel(apiKey)) {
      p.cancel('Operation cancelled')
      return
    }

    configStore.setPreference('safeApiKey', apiKey as string)
    p.log.success('Safe API key saved')
  }

  // Ask about staging mode
  console.log('')
  p.log.info('Safe Transaction Service has production and staging environments.')
  p.log.info('Staging uses staging.5afe.dev instead of safe.global')
  console.log('')

  const useStaging = await p.confirm({
    message: 'Use staging Safe Transaction Service API?',
    initialValue: false,
  })

  if (p.isCancel(useStaging)) {
    p.cancel('Operation cancelled')
    return
  }

  configStore.setStagingMode(useStaging as boolean)
  p.log.success(`Safe API environment: ${useStaging ? 'staging.5afe.dev' : 'safe.global'}`)

  // Ask about Etherscan API key
  console.log('')
  p.log.info(
    'An Etherscan API key is required for fetching contract ABIs and detecting proxy contracts.'
  )
  p.log.info('Get a free key from https://etherscan.io/myapikey')
  console.log('')

  const needsEtherscanKey = await p.confirm({
    message: 'Do you have an Etherscan API key?',
    initialValue: false,
  })

  if (p.isCancel(needsEtherscanKey)) {
    p.cancel('Operation cancelled')
    return
  }

  if (needsEtherscanKey) {
    const etherscanKey = await p.text({
      message: 'Enter your Etherscan API key:',
      placeholder: 'ABC123...',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'API key cannot be empty'
        }
        return undefined
      },
    })

    if (p.isCancel(etherscanKey)) {
      p.cancel('Operation cancelled')
      return
    }

    configStore.setPreference('etherscanApiKey', etherscanKey as string)
    p.log.success('Etherscan API key saved')
  }

  // Display success screen with next steps
  await renderScreen(ConfigInitSuccessScreen, {})
}
