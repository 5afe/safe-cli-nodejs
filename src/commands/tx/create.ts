import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { ContractService } from '../../services/contract-service.js'
import { ABIService, type ABI, type ABIFunction } from '../../services/abi-service.js'
import { TransactionBuilder } from '../../services/transaction-builder.js'
import { getValidationService } from '../../services/validation-service.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { renderScreen } from '../../ui/render.js'
import { TransactionCreateSuccessScreen } from '../../ui/screens/index.js'
import {
  ensureActiveWallet,
  ensureChainConfigured,
  checkCancelled,
  handleCommandError,
} from '../../utils/command-helpers.js'
import { ensureWalletIsOwner } from '../../utils/safe-helpers.js'

export async function createTransaction() {
  p.intro('Create Safe Transaction')

  try {
    const safeStorage = getSafeStorage()
    const configStore = getConfigStore()
    const walletStorage = getWalletStorage()
    const transactionStore = getTransactionStore()
    const validator = getValidationService()

    const activeWallet = ensureActiveWallet(walletStorage)
    if (!activeWallet) return

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

    if (!checkCancelled(safeKey)) return

    const [chainId, address] = safeKey.split(':')
    const safe = safeStorage.getSafe(chainId, address as Address)
    if (!safe) {
      p.log.error('Safe not found')
      p.outro('Failed')
      return
    }

    // Get chain
    const chain = ensureChainConfigured(chainId, configStore)
    if (!chain) return

    // Fetch live owners from blockchain
    const spinner = p.spinner()
    spinner.start('Fetching Safe information from blockchain...')

    let owners: Address[]
    try {
      const txService = new TransactionService(chain)
      owners = await txService.getOwners(address as Address)
      spinner.stop('Safe information fetched')
    } catch (error) {
      spinner.stop('Failed to fetch Safe information')
      p.log.error(
        error instanceof Error ? error.message : 'Failed to fetch Safe data from blockchain'
      )
      p.outro('Failed')
      return
    }

    // Check if wallet is an owner
    if (!ensureWalletIsOwner(activeWallet, owners)) return

    // Get transaction details
    const toInput = await p.text({
      message: 'To address (supports EIP-3770 format: shortName:address)',
      placeholder: '0x... or eth:0x...',
      validate: (value) => validator.validateAddressWithChain(value, chainId, chains),
    })

    if (!checkCancelled(toInput)) return

    // Checksum the address (strips EIP-3770 prefix if present)
    const to = validator.assertAddressWithChain(toInput as string, chainId, chains, 'To address')

    // Check if address is a contract
    const contractService = new ContractService(chain)
    let isContract = false
    let value = '0'
    let data: `0x${string}` = '0x'

    const spinner2 = p.spinner()
    spinner2.start('Checking if address is a contract...')

    try {
      isContract = await contractService.isContract(to)
      spinner2.stop(isContract ? 'Contract detected' : 'EOA (regular address)')
    } catch {
      spinner2.stop('Failed to check contract')
      p.log.warning('Could not determine if address is a contract, falling back to manual input')
    }

    // If contract, try to fetch ABI and use transaction builder
    if (isContract) {
      console.log('')
      console.log('Attempting to fetch contract ABI...')

      const config = configStore.getConfig()
      const etherscanApiKey = config.preferences?.etherscanApiKey

      // Inform user about ABI source based on API key availability
      if (!etherscanApiKey) {
        console.log('  Using Sourcify for ABI (free, no API key required)')
        console.log('  Note: Proxy contract detection requires an Etherscan API key')
      }

      const abiService = new ABIService(chain, etherscanApiKey)
      let abi: ABI | null = null
      let contractName: string | undefined

      try {
        const contractInfo = await abiService.fetchContractInfo(to)
        abi = contractInfo.abi
        contractName = contractInfo.name
        const implementationAddress = contractInfo.implementation

        // Check if Etherscan detected this as a proxy
        if (implementationAddress) {
          console.log(`✓ Proxy detected! Implementation: ${implementationAddress}`)

          if (contractName) {
            console.log(`✓ Proxy ABI found: ${contractName}`)
          } else {
            console.log('✓ Proxy ABI found!')
          }
        } else {
          if (contractName) {
            console.log(`✓ Contract ABI found: ${contractName}`)
          } else {
            console.log('✓ Contract ABI found!')
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
              console.log(`✓ Implementation ABI found: ${implInfo.name}`)
            } else {
              console.log('✓ Implementation ABI found!')
            }

            // Merge ABIs (implementation functions + proxy functions)
            // Filter out duplicates by function signature
            const combinedAbi = [...implAbi]
            const existingSignatures = new Set(
              (implAbi.filter((item) => item.type === 'function') as ABIFunction[]).map(
                (item) => `${item.name}(${item.inputs?.map((i) => i.type).join(',') || ''})`
              )
            )

            for (const item of abi) {
              if (item.type === 'function') {
                const funcItem = item as ABIFunction
                const sig = `${funcItem.name}(${funcItem.inputs?.map((i) => i.type).join(',') || ''})`
                if (!existingSignatures.has(sig)) {
                  combinedAbi.push(item)
                }
              } else {
                // Include events, errors, etc.
                combinedAbi.push(item)
              }
            }

            abi = combinedAbi
            console.log(`  Combined: ${abi.length} items total`)
          } catch {
            console.log('⚠ Could not fetch implementation ABI, using proxy ABI only')
            console.log(`  Found ${abi.length} items in proxy ABI`)
          }
        } else {
          console.log(`  Found ${abi.length} items in ABI`)
        }
      } catch {
        console.log('⚠ Could not fetch ABI')
        console.log('  Contract may not be verified. Falling back to manual input.')
      }

      // If ABI found, offer transaction builder
      if (abi) {
        const functions = abiService.extractFunctions(abi)

        console.log('')
        if (functions.length > 0) {
          console.log(`✓ Found ${functions.length} writable function(s)`)

          const useBuilder = await p.confirm({
            message: 'Use transaction builder to interact with contract?',
            initialValue: true,
          })

          if (!checkCancelled(useBuilder)) return

          if (useBuilder) {
            // Show function selector with pagination
            // Use function signature as unique identifier to handle overloaded functions
            const selectedFuncSig = await p.select({
              message: 'Select function to call:',
              options: functions.map((func) => {
                const signature = `${func.name}(${func.inputs?.map((i) => i.type).join(',') || ''})`
                return {
                  value: signature,
                  label: abiService.formatFunctionSignature(func),
                  hint: func.stateMutability === 'payable' ? 'payable' : undefined,
                }
              }),
              maxItems: 15, // Limit visible items for pagination
            })

            if (!checkCancelled(selectedFuncSig)) return

            const func = functions.find((f) => {
              const sig = `${f.name}(${f.inputs?.map((i) => i.type).join(',') || ''})`
              return sig === selectedFuncSig
            })
            if (!func) {
              p.log.error('Function not found')
              p.outro('Failed')
              return
            }

            // Build transaction using interactive builder
            const builder = new TransactionBuilder(abi, chainId, chains)
            const result = await builder.buildFunctionCall(func)

            value = result.value
            data = result.data
          }
        } else {
          console.log('⚠ No writable functions found in ABI')
          console.log('  Contract may only have view/pure functions')
          console.log('  Falling back to manual input')
        }
      }
    }

    // Manual input if not using transaction builder
    if (data === '0x') {
      value = (await p.text({
        message: 'Value in wei (0 for token transfer)',
        placeholder: '0',
        initialValue: '0',
        validate: (val) => validator.validateWeiValue(val),
      })) as string

      if (!checkCancelled(value)) return

      data = (await p.text({
        message: 'Transaction data (hex)',
        placeholder: '0x',
        initialValue: '0x',
        validate: (val) => validator.validateHexData(val),
      })) as `0x${string}`

      if (!checkCancelled(data)) return
    }

    const operation = (await p.select({
      message: 'Operation type',
      options: [
        { value: 0, label: 'Call', hint: 'Standard transaction call' },
        { value: 1, label: 'DelegateCall', hint: 'Delegate call (advanced)' },
      ],
      initialValue: 0,
    })) as number as 0 | 1

    if (!checkCancelled(operation)) return

    // Get current Safe nonce for recommendation
    const txService = new TransactionService(chain)
    let currentNonce: number
    try {
      currentNonce = await txService.getNonce(safe.address as Address)
    } catch (error) {
      p.log.error(
        `Failed to get Safe nonce: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      p.outro('Failed')
      return
    }

    // Ask for nonce (optional, with recommended value)
    const nonceInput = (await p.text({
      message: 'Transaction nonce (leave empty for default)',
      placeholder: `${currentNonce} (recommended: current nonce)`,
      validate: (value) => validator.validateNonce(value, currentNonce),
    })) as string

    if (!checkCancelled(nonceInput)) return

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

    createSpinner.stop()

    // Show transaction hash
    console.log('')
    console.log('✓ Transaction created successfully!')
    console.log('')
    console.log(`  Safe TX Hash: ${createdTx.safeTxHash}`)
    console.log('')

    // Offer to sign the transaction
    const shouldSign = await p.confirm({
      message: 'Would you like to sign this transaction now?',
      initialValue: true,
    })

    if (!p.isCancel(shouldSign) && shouldSign) {
      console.log('')
      const { signTransaction } = await import('./sign.js')
      await signTransaction(createdTx.safeTxHash)
    } else {
      // Show full success screen with next steps
      await renderScreen(TransactionCreateSuccessScreen, {
        safeTxHash: createdTx.safeTxHash,
      })
    }
  } catch (error) {
    handleCommandError(error)
  }
}
