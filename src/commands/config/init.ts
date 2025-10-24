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

  // Ask about default chains
  const useDefaults = await p.confirm({
    message: 'Would you like to use the default chain configurations?',
    initialValue: true,
  })

  if (p.isCancel(useDefaults)) {
    p.cancel('Operation cancelled')
    return
  }

  if (!useDefaults) {
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

  // Ask about analytics
  const analytics = await p.confirm({
    message: 'Enable anonymous analytics to help improve Safe CLI?',
    initialValue: false,
  })

  if (p.isCancel(analytics)) {
    p.cancel('Operation cancelled')
    return
  }

  configStore.setPreference('analytics', analytics as boolean)

  // Ask about auto-updates
  const autoUpdate = await p.confirm({
    message: 'Enable automatic update notifications?',
    initialValue: true,
  })

  if (p.isCancel(autoUpdate)) {
    p.cancel('Operation cancelled')
    return
  }

  configStore.setPreference('autoUpdate', autoUpdate as boolean)

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
