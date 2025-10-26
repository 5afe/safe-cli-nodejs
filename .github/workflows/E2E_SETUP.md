# E2E Test Workflow Setup

This document explains how to set up and use the E2E test workflow on GitHub Actions.

## Overview

The E2E test workflow (`e2e.yml`) runs comprehensive end-to-end tests on Sepolia testnet. It's separate from the main CI workflow to avoid running blockchain tests on every PR.

## Setup Instructions

### 1. Add the Private Key Secret

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `TEST_WALLET_PK`
5. Value: `0x7ee18f54486d328745863e4ac29c4cdd3a325f7d53dec0324bfd57df4bfdf2a9`
6. Click **Add secret**

### 2. Fund the Test Wallet

The test wallet must have Sepolia ETH to pay for gas:

- **Wallet Address:** `0x2d5961897847A30559a26Db99789BEEc7AeEd75e`
- **Recommended Balance:** At least 0.1 ETH (for multiple test runs)

**Sepolia Faucets:**
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia

### 3. Enable E2E Tests (Optional)

For scheduled/automatic runs, create a repository variable:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Navigate to the **Variables** tab
3. Click **New repository variable**
4. Name: `E2E_TESTS_ENABLED`
5. Value: `true`
6. Click **Add variable**

**Note:** Manual triggers via workflow_dispatch don't require this variable.

## Running the Tests

### Manual Trigger

1. Go to **Actions** tab in your repository
2. Click on **E2E Tests** workflow in the left sidebar
3. Click **Run workflow** button
4. Select the branch (default: main)
5. Click **Run workflow**

### Automatic Schedule

The workflow runs daily at 2 AM UTC if `E2E_TESTS_ENABLED` is set to `true`.

### On Push to Main (Optional)

Uncomment these lines in `.github/workflows/e2e.yml`:

```yaml
# push:
#   branches: [main]
```

## Workflow Details

### Trigger Events

- **Manual:** Via workflow_dispatch (always available)
- **Schedule:** Daily at 2 AM UTC (requires `E2E_TESTS_ENABLED=true`)
- **Push:** Optional, commented out by default

### Jobs

**e2e-sepolia:**
- Runs on Ubuntu latest
- Uses Node.js 20.x
- Timeout: 10 minutes
- Requires `TEST_WALLET_PK` secret

### Steps

1. Checkout code
2. Setup Node.js with npm cache
3. Install dependencies
4. Type check
5. Build project
6. Run E2E tests with `TEST_WALLET_PK` environment variable
7. Upload artifacts on failure (logs, exported transactions)

## Test Coverage

The E2E test validates the complete Safe CLI workflow:

1. ✅ Initialize config with Sepolia chain
2. ✅ Import wallet with private key
3. ✅ Create predicted Safe account (1-of-1)
4. ✅ Deploy Safe to Sepolia blockchain
5. ✅ Create a transaction (0.001 ETH transfer)
6. ✅ Sign transaction with owner's key
7. ✅ Export transaction to JSON file
8. ✅ Import transaction from JSON file
9. ✅ Execute transaction on-chain

## Monitoring

### Success

Green checkmark in Actions tab indicates all steps passed.

### Failure

- Red X in Actions tab
- Click on the failed run to see logs
- Artifacts (logs, exported JSON) are uploaded for 7 days
- Check the specific step that failed

### Common Issues

**Insufficient Funds:**
- Ensure test wallet has enough Sepolia ETH
- Each run deploys a new Safe and executes a transaction

**Network Issues:**
- Sepolia RPC may be congested
- Retry the workflow
- Check Sepolia network status

**Timeout:**
- Increase timeout in workflow (currently 10 minutes)
- Blockchain operations may take longer during network congestion

## Security Notes

⚠️ **Important Security Considerations:**

1. **Test Wallet Only:** This private key is ONLY for Sepolia testnet
2. **Never Use on Mainnet:** The private key is for testing purposes only
3. **No Real Funds:** Only use Sepolia test ETH, never real funds
4. **Secret Management:** GitHub Secrets are encrypted and not exposed in logs
5. **Limited Access:** Only repository admins can view/edit secrets

## Cost Management

Each E2E test run:
- Deploys a new Safe contract (~0.01-0.02 ETH gas)
- Executes one transaction (~0.001-0.005 ETH gas)
- Total cost per run: ~0.015-0.03 Sepolia ETH

**Recommendations:**
- Monitor wallet balance regularly
- Refill when balance drops below 0.05 ETH
- Disable scheduled runs if not needed (set `E2E_TESTS_ENABLED=false`)

## Maintenance

### Updating the Test Wallet

To use a different wallet:

1. Generate new private key
2. Update `TEST_WALLET_PK` secret in GitHub
3. Update expected address in test file comments
4. Fund new wallet with Sepolia ETH

### Disabling Scheduled Runs

1. Delete the `E2E_TESTS_ENABLED` variable, OR
2. Set `E2E_TESTS_ENABLED=false`

Manual triggers will still work.

### Modifying the Schedule

Edit the cron expression in `e2e.yml`:

```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

**Examples:**
- `'0 */6 * * *'` - Every 6 hours
- `'0 2 * * 1'` - Weekly on Monday at 2 AM
- `'0 2 1 * *'` - Monthly on the 1st at 2 AM

## Troubleshooting

### Test is Skipped

**Cause:** `TEST_WALLET_PK` environment variable not set

**Solution:**
- Verify secret exists in repository settings
- Check secret name is exactly `TEST_WALLET_PK`
- Ensure workflow has access to secrets

### "Insufficient funds for gas * price + value"

**Cause:** Wallet doesn't have enough Sepolia ETH

**Solution:**
- Check wallet balance on Sepolia Etherscan
- Fund wallet using faucets listed above
- Wait for funds to confirm before re-running

### Test Times Out

**Cause:** Blockchain operations taking too long

**Solution:**
- Check Sepolia network status
- Increase timeout in workflow YAML
- Retry the workflow

### Artifact Upload Failed

**Cause:** No matching artifacts found (expected on success)

**Solution:**
- This is normal when tests pass
- Artifacts only upload on failure
- No action needed

## Support

For issues or questions:
- Check test logs in GitHub Actions
- Review test implementation in `src/tests/integration/e2e-flow.test.ts`
- Check E2E test documentation in `src/tests/integration/E2E_README.md`
