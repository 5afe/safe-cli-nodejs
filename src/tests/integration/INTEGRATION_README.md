# E2E Flow Test

This comprehensive end-to-end test validates the complete Safe CLI workflow on Sepolia testnet.

## Test Suites

### 1. Full Workflow Test (`e2e-flow.test.ts`)
Complete end-to-end workflow covering all CLI operations:

1. **Initialize Config** - Set up Sepolia chain configuration
2. **Import Wallet** - Import the test wallet with private key
3. **Create Safe** - Create a predicted Safe account (1-of-1 multisig)
4. **Deploy Safe** - Deploy the Safe to Sepolia blockchain
5. **Create Transaction** - Create a simple ETH transfer transaction (0.001 ETH)
6. **Sign Transaction** - Sign the transaction with the owner's private key
7. **Export Transaction** - Export the signed transaction to a JSON file
8. **Import Transaction** - Clear and re-import the transaction from the JSON file
9. **Execute Transaction** - Execute the signed transaction on-chain

### 2. Transaction Builder Test (`e2e-transaction-builder.test.ts`)
Tests ABI fetching and contract interaction:

1. **Setup** - Configure chain and wallet
2. **Deploy Safe** - Create and deploy a Safe
3. **Fetch ABI** - Retrieve contract ABI from Etherscan
4. **Parse ABI** - Find and validate contract functions
5. **Build Transaction** - Create ERC20 approval transaction for DAI
6. **Create Safe Transaction** - Package as Safe transaction
7. **Sign Transaction** - Sign the approval transaction

### 3. Transaction Service Test (`e2e-transaction-service.test.ts`)
Tests Safe Transaction Service push/pull/sync:

1. **Setup** - Configure chain and wallet
2. **Deploy Safe** - Create and deploy a Safe
3. **Create Transaction** - Build a test transaction
4. **Sign Transaction** - Sign locally
5. **Push to Service** - Upload to Safe Transaction Service
6. **Clear Local** - Remove from local storage
7. **Pull from Service** - Retrieve from Safe Transaction Service
8. **Verify Sync** - Confirm transaction restored correctly

## Prerequisites

### Required for All Tests
- **Sepolia ETH**: The test wallet must be funded with Sepolia ETH
- **Test Wallet**:
  - Expected Address: `0x2d5961897847A30559a26Db99789BEEc7AeEd75e` (derived from private key)
  - Private Key: **MUST** be provided via `TEST_WALLET_PK` environment variable
  - ⚠️ Tests will be **skipped** if `TEST_WALLET_PK` is not set

### Additional Requirements by Test Suite
- **Transaction Builder Test** (`e2e-transaction-builder.test.ts`):
  - `ETHERSCAN_API_KEY` - Required for fetching contract ABIs
  - Get free key from https://etherscan.io/myapikey

- **Transaction Service Test** (`e2e-transaction-service.test.ts`):
  - `TX_SERVICE_API_KEY` - Required for Safe Transaction Service API
  - Get key from https://dashboard.safe.global/

## Running the Test

### Local Development

```bash
# Set required environment variables
export TEST_WALLET_PK="0x..."  # Required for all tests

# Optional: For transaction builder test
export ETHERSCAN_API_KEY="ABC123..."

# Optional: For transaction service test
export TX_SERVICE_API_KEY="sk_..."

# Run all E2E tests
npm test -- e2e-*.test.ts

# Or run individual test suites
npm test -- e2e-flow.test.ts              # Full workflow
npm test -- e2e-transaction-builder.test.ts  # ABI/contract interaction
npm test -- e2e-transaction-service.test.ts  # Push/pull/sync
```

**Note:** Tests will be automatically skipped if required environment variables are not set.

### CI/CD (GitHub Actions)

A dedicated workflow is configured at `.github/workflows/e2e.yml`.

**Setup Instructions:** See [`.github/workflows/E2E_SETUP.md`](../../../.github/workflows/E2E_SETUP.md)

**Quick Setup:**
1. Add secrets in GitHub repository settings:
   - `TEST_WALLET_PK` (required for all tests)
   - `ETHERSCAN_API_KEY` (for transaction builder test)
   - `TX_SERVICE_API_KEY` (for transaction service test)
2. Fund the test wallet with Sepolia ETH
3. Manually trigger via Actions tab or enable scheduled runs

The E2E tests are automatically excluded from the main CI workflow.

## Test Configuration

- **Chain**: Sepolia (Chain ID: 11155111)
- **Timeout**: 5 minutes (300 seconds)
- **Safe Configuration**:
  - Owners: 1 (test wallet)
  - Threshold: 1
  - Version: 1.4.1

## Expected Output

When the test runs successfully, you'll see output like:

```
[E2E] Step 1: Initialize config with Sepolia chain
[E2E] ✓ Config initialized with Sepolia chain

[E2E] Step 2: Import wallet
[E2E] ✓ Wallet imported: 0x2d5961897847A30559a26Db99789BEEc7AeEd75e

[E2E] Step 3: Create predicted Safe account
[E2E] ✓ Safe predicted address: 0x...

[E2E] Step 4: Deploy Safe to Sepolia
[E2E] NOTE: This requires the test wallet to have Sepolia ETH
[E2E] ✓ Safe deployed at: 0x...
[E2E] ✓ Safe deployment verified on-chain

[E2E] Step 5: Create a test transaction
[E2E] ✓ Transaction created: 0x...

[E2E] Step 6: Sign the transaction
[E2E] ✓ Transaction signed

[E2E] Step 7: Export the signed transaction
[E2E] ✓ Transaction exported to: /tmp/...

[E2E] Step 8: Clear and re-import the transaction
[E2E] ✓ Transaction re-imported successfully

[E2E] Step 9: Execute the signed transaction
[E2E] ✓ Transaction executed! Tx hash: 0x...

[E2E] ✅ Full E2E flow completed successfully!
```

## Funding the Test Wallet

To fund the test wallet on Sepolia:

1. Visit a Sepolia faucet:
   - https://sepoliafaucet.com/
   - https://www.alchemy.com/faucets/ethereum-sepolia
   - https://cloud.google.com/application/web3/faucet/ethereum/sepolia

2. Enter the wallet address: `0x2d5961897847A30559a26Db99789BEEc7AeEd75e`

3. Request test ETH (at least 0.1 ETH recommended for multiple test runs)

## Troubleshooting

### Test Fails with "Insufficient Funds"
- Ensure the test wallet has enough Sepolia ETH
- Each test run deploys a new Safe and executes a transaction, consuming gas

### Test Times Out
- Sepolia network may be congested
- Increase the timeout in the test configuration
- Check Sepolia RPC endpoint status

### Safe Already Deployed Error
- The test creates a new Safe each time with default salt nonce
- Clear the Safe storage or use a different salt nonce

## Notes

- **DO NOT** use this private key or wallet in production or on mainnet
- The test creates real transactions on Sepolia testnet
- Each test run will consume some Sepolia ETH for gas fees
- The test uses real Safe SDK and blockchain interactions, not mocks
