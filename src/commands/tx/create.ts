import * as p from '@clack/prompts'
import pc from 'picocolors'
import { isAddress, type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { ContractService } from '../../services/contract-service.js'
import { ABIService } from '../../services/abi-service.js'
import { TransactionBuilder } from '../../services/transaction-builder.js'
import { SafeCLIError } from '../../utils/errors.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { validateAndChecksumAddress } from '../../utils/validation.js'

export async function createTransaction() {
  p.intro('Create Safe Transaction')

  try {
    const safeStorage = getSafeStorage()
    const configStore = getConfigStore()
    const walletStorage = getWalletStorage()
    const transactionStore = getTransactionStore()

    const activeWallet = walletStorage.getActiveWallet()
    if (!activeWallet) {
      p.log.error('No active wallet set. Please import a wallet first.')
      p.outro('Setup required')
      return
    }

    // Get all Safes
    const safes = safeStorage.getAllSafes()
    if (safes.length === 0) {
      p.log.error('No Safes found. Please create a Safe first.')
      p.outro('Setup required')
      return
    }

    const chains = configStore.getAllChains()

    // Select Safe
    const safeKey = (await p.select({
      message: 'Select Safe to create transaction for',
      options: safes.map((safe) => {
        const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)
        const chain = configStore.getChain(safe.chainId)

        return {
          value: `${safe.chainId}:${safe.address}`,
          label: `${safe.name} (${eip3770})`,
          hint: chain?.name || safe.chainId,
        }
      }),
    })) as string

    if (p.isCancel(safeKey)) {
      p.cancel('Operation cancelled')
      return
    }

    const [chainId, address] = safeKey.split(':')
    const safe = safeStorage.getSafe(chainId, address as Address)
    if (!safe) {
      p.log.error('Safe not found')
      p.outro('Failed')
      return
    }

    // Check if wallet is an owner
    if (!safe.owners) {
      p.log.error('Safe owner information not available. Please sync Safe data.')
      p.outro('Failed')
      return
    }

    if (!safe.owners.some((owner) => owner.toLowerCase() === activeWallet.address.toLowerCase())) {
      p.log.error('Active wallet is not an owner of this Safe')
      p.outro('Failed')
      return
    }

    // Get transaction details
    const toInput = await p.text({
      message: 'To address',
      placeholder: '0x...',
      validate: (value) => {
        if (!value) return 'Address is required'
        if (!isAddress(value)) return 'Invalid Ethereum address'
        return undefined
      },
    })

    if (p.isCancel(toInput)) {
      p.cancel('Operation cancelled')
      return
    }

    // Checksum the address immediately
    let to: Address
    try {
      to = validateAndChecksumAddress(toInput as string)
    } catch (error) {
      p.log.error(error instanceof Error ? error.message : 'Invalid address')
      p.outro('Failed')
      return
    }

    // Get chain for contract detection
    const chain = configStore.getChain(safe.chainId)
    if (!chain) {
      p.log.error(`Chain ${safe.chainId} not found in configuration`)
      p.outro('Failed')
      return
    }

    // Check if address is a contract
    const contractService = new ContractService(chain)
    let isContract = false
    let value = '0'
    let data: `0x${string}` = '0x'

    const spinner = p.spinner()
    spinner.start('Checking if address is a contract...')

    try {
      isContract = await contractService.isContract(to)
      spinner.stop(isContract ? 'Contract detected' : 'EOA (regular address)')
    } catch (error) {
      spinner.stop('Failed to check contract')
      p.log.warning('Could not determine if address is a contract, falling back to manual input')
    }

    // If contract, try to fetch ABI and use transaction builder
    if (isContract) {
      console.log('')
      console.log(pc.dim('Attempting to fetch contract ABI...'))

      const config = configStore.getConfig()
      const etherscanApiKey = config.preferences?.etherscanApiKey

      // Inform user about ABI source based on API key availability
      if (!etherscanApiKey) {
        console.log(pc.dim('  Using Sourcify for ABI (free, no API key required)'))
        console.log(pc.dim('  Note: Proxy contract detection requires an Etherscan API key'))
      }

      const abiService = new ABIService(chain, etherscanApiKey)
      let abi: any = null
      let contractName: string | undefined

      try {
        const contractInfo = await abiService.fetchContractInfo(to)
        abi = contractInfo.abi
        contractName = contractInfo.name
        const implementationAddress = contractInfo.implementation

        // Check if Etherscan detected this as a proxy
        if (implementationAddress) {
          console.log(pc.cyan(`✓ Proxy detected! Implementation: ${implementationAddress}`))

          if (contractName) {
            console.log(pc.green(`✓ Proxy ABI found: ${pc.bold(contractName)}`))
          } else {
            console.log(pc.green('✓ Proxy ABI found!'))
          }
        } else {
          if (contractName) {
            console.log(pc.green(`✓ Contract ABI found: ${pc.bold(contractName)}`))
          } else {
            console.log(pc.green('✓ Contract ABI found!'))
          }
        }

        // If proxy, also fetch implementation ABI and merge
        if (implementationAddress) {
          try {
            const implInfo = await abiService.fetchContractInfo(implementationAddress)
            const implAbi = implInfo.abi

            // Use implementation name as the main contract name
            if (implInfo.name) {
              contractName = implInfo.name
              console.log(pc.green(`✓ Implementation ABI found: ${pc.bold(implInfo.name)}`))
            } else {
              console.log(pc.green('✓ Implementation ABI found!'))
            }

            // Merge ABIs (implementation functions + proxy functions)
            // Filter out duplicates by function signature
            const combinedAbi = [...implAbi]
            const existingSignatures = new Set(
              implAbi
                .filter((item: any) => item.type === 'function')
                .map((item: any) => `${item.name}(${item.inputs?.map((i: any) => i.type).join(',') || ''})`)
            )

            for (const item of abi) {
              if (item.type === 'function') {
                const sig = `${item.name}(${item.inputs?.map((i: any) => i.type).join(',') || ''})`
                if (!existingSignatures.has(sig)) {
                  combinedAbi.push(item)
                }
              } else {
                // Include events, errors, etc.
                combinedAbi.push(item)
              }
            }

            abi = combinedAbi
            console.log(pc.dim(`  Combined: ${abi.length} items total`))
          } catch (error) {
            console.log(pc.yellow('⚠ Could not fetch implementation ABI, using proxy ABI only'))
            console.log(pc.dim(`  Found ${abi.length} items in proxy ABI`))
          }
        } else {
          console.log(pc.dim(`  Found ${abi.length} items in ABI`))
        }
      } catch (error) {
        console.log(pc.yellow('⚠ Could not fetch ABI'))
        console.log(pc.dim('  Contract may not be verified. Falling back to manual input.'))
      }

      // If ABI found, offer transaction builder
      if (abi) {
        const functions = abiService.extractFunctions(abi)

        console.log('')
        if (functions.length > 0) {
          console.log(pc.green(`✓ Found ${functions.length} writable function(s)`))

          const useBuilder = await p.confirm({
            message: 'Use transaction builder to interact with contract?',
            initialValue: true,
          })

          if (p.isCancel(useBuilder)) {
            p.cancel('Operation cancelled')
            return
          }

          if (useBuilder) {
            // Show function selector with pagination
            // Use function signature as unique identifier to handle overloaded functions
            const selectedFuncSig = await p.select({
              message: 'Select function to call:',
              options: functions.map((func) => {
                const signature = `${func.name}(${func.inputs?.map((i: any) => i.type).join(',') || ''})`
                return {
                  value: signature,
                  label: abiService.formatFunctionSignature(func),
                  hint: func.stateMutability === 'payable' ? 'payable' : undefined,
                }
              }),
              maxItems: 15, // Limit visible items for pagination
            })

            if (p.isCancel(selectedFuncSig)) {
              p.cancel('Operation cancelled')
              return
            }

            const func = functions.find((f) => {
              const sig = `${f.name}(${f.inputs?.map((i: any) => i.type).join(',') || ''})`
              return sig === selectedFuncSig
            })
            if (!func) {
              p.log.error('Function not found')
              p.outro('Failed')
              return
            }

            // Build transaction using interactive builder
            const builder = new TransactionBuilder(abi)
            const result = await builder.buildFunctionCall(func)

            value = result.value
            data = result.data
          }
        } else {
          console.log(pc.yellow('⚠ No writable functions found in ABI'))
          console.log(pc.dim('  Contract may only have view/pure functions'))
          console.log(pc.dim('  Falling back to manual input'))
        }
      }
    }

    // Manual input if not using transaction builder
    if (data === '0x') {
      value = (await p.text({
        message: 'Value in wei (0 for token transfer)',
        placeholder: '0',
        initialValue: '0',
        validate: (val) => {
          if (!val) return 'Value is required'
          try {
            BigInt(val)
            return undefined
          } catch {
            return 'Invalid number'
          }
        },
      })) as string

      if (p.isCancel(value)) {
        p.cancel('Operation cancelled')
        return
      }

      data = (await p.text({
        message: 'Transaction data (hex)',
        placeholder: '0x',
        initialValue: '0x',
        validate: (val) => {
          if (!val) return 'Data is required (use 0x for empty)'
          if (!val.startsWith('0x')) return 'Data must start with 0x'
          if (val.length > 2 && !/^0x[0-9a-fA-F]*$/.test(val)) {
            return 'Data must be valid hex'
          }
          return undefined
        },
      })) as `0x${string}`

      if (p.isCancel(data)) {
        p.cancel('Operation cancelled')
        return
      }
    }

    const operation = (await p.select({
      message: 'Operation type',
      options: [
        { value: 0, label: 'Call', hint: 'Standard transaction call' },
        { value: 1, label: 'DelegateCall', hint: 'Delegate call (advanced)' },
      ],
      initialValue: 0,
    })) as number as 0 | 1

    if (p.isCancel(operation)) {
      p.cancel('Operation cancelled')
      return
    }

    // Get current Safe nonce for recommendation
    const txService = new TransactionService(chain)
    let currentNonce: number
    try {
      currentNonce = await txService.getNonce(safe.address as Address)
    } catch (error) {
      p.log.error(`Failed to get Safe nonce: ${error instanceof Error ? error.message : 'Unknown error'}`)
      p.outro('Failed')
      return
    }

    // Ask for nonce (optional, with recommended value)
    const nonceInput = (await p.text({
      message: 'Transaction nonce (leave empty for default)',
      placeholder: `${currentNonce} (recommended: current nonce)`,
      validate: (value) => {
        if (!value) return undefined // Empty is OK (will use default)
        const num = parseInt(value, 10)
        if (isNaN(num) || num < 0) return 'Nonce must be a non-negative number'
        if (num < currentNonce) return `Nonce cannot be lower than current Safe nonce (${currentNonce})`
        return undefined
      },
    })) as string

    if (p.isCancel(nonceInput)) {
      p.cancel('Operation cancelled')
      return
    }

    const nonce = nonceInput ? parseInt(nonceInput, 10) : undefined

    // Create transaction
    const createSpinner = p.spinner()
    createSpinner.start('Creating transaction')

    const createdTx = await txService.createTransaction(safe.address as Address, {
      to,
      value,
      data,
      operation,
      nonce,
    })

    // Store transaction with safeTxHash as ID
    transactionStore.createTransaction(
      createdTx.safeTxHash,
      safe.address as Address,
      safe.chainId,
      createdTx.metadata,
      activeWallet.address as Address
    )

    createSpinner.stop('Transaction created')

    console.log('')
    console.log(pc.green('✓ Transaction created successfully!'))
    console.log('')
    console.log(`  ${pc.dim('Safe TX Hash:')} ${createdTx.safeTxHash}`)
    console.log('')
    console.log(pc.bold('To sign this transaction, run:'))
    console.log('')
    console.log(`  ${pc.cyan(`safe tx sign ${createdTx.safeTxHash}`)}`)
    console.log('')

    p.outro('Transaction ready')
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
