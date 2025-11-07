import * as p from '@clack/prompts'
import { getConfigStore } from '../../storage/config-store.js'
import { DEFAULT_CHAINS } from '../../constants/chains.js'
import { renderScreen } from '../../ui/render.js'
import { ConfigInitSuccessScreen } from '../../ui/screens/index.js'

export async function initConfig() {
  p.intro(' Configure Safe CLI ')

  const configStore = getConfigStore()

  p.log.info('Welcome to Safe CLI!')
  p.log.info('Safe CLI works out-of-the-box with 18 default networks.')
  p.log.info('This wizard helps you customize settings and add API keys.')
  console.log('')

  // Check if custom chains already exist in store
  const customChains = configStore.getConfig().chains || {}
  const hasCustomChains = Object.keys(customChains).length > 0

  if (hasCustomChains) {
    p.log.info(`You have ${Object.keys(customChains).length} custom chain(s) configured.`)
    console.log('')

    const manageChains = await p.confirm({
      message: 'Would you like to reset all custom chains to defaults?',
      initialValue: false,
    })

    if (p.isCancel(manageChains)) {
      p.cancel('Operation cancelled')
      return
    }

    if (manageChains) {
      console.log('')
      p.log.warning('This will remove all custom chain configurations')
      console.log('')

      const confirm = await p.confirm({
        message: 'Are you sure you want to continue?',
        initialValue: false,
      })

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled')
        return
      }

      // Clear custom chains (defaults will still be available)
      configStore.reset()
      p.log.step('Custom chains cleared. Default chains are always available.')
    }
  } else {
    p.log.step(`${Object.keys(DEFAULT_CHAINS).length} default chains are already available`)
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
