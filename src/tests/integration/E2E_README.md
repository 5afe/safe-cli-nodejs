# E2E Flow Test

This comprehensive end-to-end test validates the complete Safe CLI workflow on Sepolia testnet.

## Test Flow

The test performs the following steps:

1. **Initialize Config** - Set up Sepolia chain configuration
2. **Import Wallet** - Import the test wallet with private key
3. **Create Safe** - Create a predicted Safe account (1-of-1 multisig)
4. **Deploy Safe** - Deploy the Safe to Sepolia blockchain
5. **Create Transaction** - Create a simple ETH transfer transaction (0.001 ETH)
6. **Sign Transaction** - Sign the transaction with the owner's private key
7. **Export Transaction** - Export the signed transaction to a JSON file
8. **Import Transaction** - Clear and re-import the transaction from the JSON file
9. **Execute Transaction** - Execute the signed transaction on-chain

## Prerequisites

- **Sepolia ETH**: The test wallet must be funded with Sepolia ETH
- **Test Wallet**:
  - Expected Address: `0x2d5961897847A30559a26Db99789BEEc7AeEd75e` (derived from private key)
  - Private Key: **MUST** be provided via `TEST_WALLET_PK` environment variable
  - ⚠️ The test will be **skipped** if `TEST_WALLET_PK` is not set

## Running the Test

### Local Development

```bash
# Set the private key environment variable (use the actual funded wallet)
export TEST_WALLET_PK="0x..."

# Run the e2e test
npm test -- e2e-flow.test.ts
```

**Note:** The test will be automatically skipped if `TEST_WALLET_PK` is not set.

### CI/CD (GitHub Actions)

A dedicated workflow is configured at `.github/workflows/e2e.yml`.

**Setup Instructions:** See [`.github/workflows/E2E_SETUP.md`](../../../.github/workflows/E2E_SETUP.md)

**Quick Setup:**
1. Add `TEST_WALLET_PK` secret in GitHub repository settings
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
