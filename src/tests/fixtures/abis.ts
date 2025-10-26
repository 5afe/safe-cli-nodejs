import type { Abi } from 'viem'

/**
 * Mock ABIs for testing contract interactions
 */

/**
 * Simple ERC20 Token ABI
 */
export const ERC20_ABI: Abi = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string', name: '' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8', name: '' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool', name: '' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'spender' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool', name: '' }],
  },
  {
    type: 'function',
    name: 'transferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'bool', name: '' }],
  },
]

/**
 * Simple contract with various parameter types for testing
 */
export const TEST_CONTRACT_ABI: Abi = [
  {
    type: 'function',
    name: 'simpleFunction',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'functionWithAddress',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address', name: 'addr' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'functionWithUint',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256', name: 'value' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'functionWithBool',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'bool', name: 'flag' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'functionWithString',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'string', name: 'text' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'functionWithBytes',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'bytes', name: 'data' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'functionWithArray',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256[]', name: 'values' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'functionWithMultipleParams',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'addr' },
      { type: 'uint256', name: 'amount' },
      { type: 'string', name: 'message' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'payableFunction',
    stateMutability: 'payable',
    inputs: [{ type: 'uint256', name: 'value' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'viewFunction',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'addr' }],
    outputs: [{ type: 'uint256', name: '' }],
  },
  {
    type: 'function',
    name: 'pureFunction',
    stateMutability: 'pure',
    inputs: [
      { type: 'uint256', name: 'a' },
      { type: 'uint256', name: 'b' },
    ],
    outputs: [{ type: 'uint256', name: '' }],
  },
]

/**
 * EIP-1967 Proxy ABI
 */
export const PROXY_ABI: Abi = [
  {
    type: 'function',
    name: 'implementation',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address', name: '' }],
  },
  {
    type: 'function',
    name: 'upgradeTo',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address', name: 'newImplementation' }],
    outputs: [],
  },
]

/**
 * Mock Etherscan API response
 */
export function createEtherscanABIResponse(abi: Abi, contractName = 'TestContract') {
  return {
    status: '1',
    message: 'OK',
    result: [
      {
        SourceCode: JSON.stringify({ language: 'Solidity', sources: {} }),
        ABI: JSON.stringify(abi),
        ContractName: contractName,
        CompilerVersion: 'v0.8.20+commit.a1b79de6',
        OptimizationUsed: '1',
        Runs: '200',
        ConstructorArguments: '',
        EVMVersion: 'Default',
        Library: '',
        LicenseType: 'MIT',
        Proxy: '0',
        Implementation: '',
        SwarmSource: '',
      },
    ],
  }
}

/**
 * Mock Etherscan API response for proxy contract
 */
export function createEtherscanProxyResponse(proxyAbi: Abi, implementationAddress: string) {
  return {
    status: '1',
    message: 'OK',
    result: [
      {
        SourceCode: JSON.stringify({ language: 'Solidity', sources: {} }),
        ABI: JSON.stringify(proxyAbi),
        ContractName: 'Proxy',
        CompilerVersion: 'v0.8.20+commit.a1b79de6',
        OptimizationUsed: '1',
        Runs: '200',
        ConstructorArguments: '',
        EVMVersion: 'Default',
        Library: '',
        LicenseType: 'MIT',
        Proxy: '1',
        Implementation: implementationAddress,
        SwarmSource: '',
      },
    ],
  }
}

/**
 * Mock Sourcify API response
 */
export function createSourcifyResponse(abi: Abi, contractName = 'TestContract') {
  return {
    output: {
      abi,
      devdoc: {},
      userdoc: {},
    },
    settings: {
      compilationTarget: {
        'contracts/TestContract.sol': contractName,
      },
    },
  }
}

/**
 * Empty ABI for testing edge cases
 */
export const EMPTY_ABI: Abi = []

/**
 * Helper function to get state-changing functions from ABI
 */
export function getStateChangingFunctions(abi: Abi): Abi {
  return abi.filter(
    (item) =>
      item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure'
  )
}

/**
 * Helper function to get view functions from ABI
 */
export function getViewFunctions(abi: Abi): Abi {
  return abi.filter(
    (item) =>
      item.type === 'function' &&
      (item.stateMutability === 'view' || item.stateMutability === 'pure')
  )
}
