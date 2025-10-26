import type { Address } from 'viem'

/**
 * Test wallet addresses (from Hardhat default accounts)
 * DO NOT USE IN PRODUCTION - These are public test keys
 */

export const TEST_ADDRESSES = {
  // Owner addresses
  owner1: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address,
  owner2: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
  owner3: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
  owner4: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as Address,
  owner5: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65' as Address,

  // Safe addresses
  safe1: '0x1234567890123456789012345678901234567890' as Address,
  safe2: '0x2234567890123456789012345678901234567890' as Address,
  safe3: '0x3234567890123456789012345678901234567890' as Address,

  // Contract addresses
  erc20Token: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
  erc721Token: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address,
  proxyContract: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address,
  implementationContract: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as Address,

  // Generic addresses for testing
  recipient1: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199' as Address,
  recipient2: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0' as Address,
  zeroAddress: '0x0000000000000000000000000000000000000000' as Address,
  deadAddress: '0x000000000000000000000000000000000000dEaD' as Address,

  // Invalid addresses for negative tests
  invalidShort: '0x123',
  invalidLong: '0x12345678901234567890123456789012345678901234',
  invalidChars: '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  noPrefix: 'f39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
}

/**
 * Test private keys (from Hardhat default accounts)
 * DO NOT USE IN PRODUCTION - These are public test keys
 */
export const TEST_PRIVATE_KEYS = {
  owner1: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  owner2: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  owner3: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  owner4: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  owner5: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',

  // Invalid private keys for negative tests
  invalid: 'not-a-private-key',
  tooShort: '0x1234',
  tooLong: '0x' + '1'.repeat(128),
  noPrefix: 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
}

/**
 * Test passwords
 */
export const TEST_PASSWORDS = {
  valid: 'testpassword123',
  strong: 'MyStr0ng!P@ssw0rd#2024',
  weak: '123',
  empty: '',
  long: 'a'.repeat(100),
}

/**
 * Test Safe transaction hashes
 */
export const TEST_TX_HASHES = {
  tx1: ('0x' + '1'.repeat(64)) as `0x${string}`,
  tx2: ('0x' + '2'.repeat(64)) as `0x${string}`,
  tx3: ('0x' + '3'.repeat(64)) as `0x${string}`,
  invalid: '0x123' as `0x${string}`,
}
