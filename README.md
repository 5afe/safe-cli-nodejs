# 🔐 Safe CLI [![npm version](https://img.shields.io/npm/v/@safe-global/safe-cli.svg)](https://www.npmjs.com/package/@safe-global/safe-cli)

> A modern, interactive command-line tool for managing Safe Smart Accounts

Built on top of the [Safe Core SDK](https://github.com/safe-global/safe-core-sdk), Safe CLI makes it easy to create, manage, and interact with Safe multi-signature wallets directly from your terminal.

---

## Why Safe CLI?

Safe CLI provides a powerful command-line interface for:
- **Creating and managing Safe accounts** without using the web interface
- **Coordinating multi-signature transactions** with your team
- **Interacting with smart contracts** through an intuitive transaction builder
- **Automating Safe operations** in scripts and workflows
- **Managing multiple Safes across different chains** from one place
- **Hardware wallet support** - Use Ledger devices for maximum security

Perfect for developers, power users, and teams who prefer working in the terminal.

---

## ✨ Features

### Core Functionality
- 🔐 **Secure wallet management** - Encrypted private key storage with AES-256-GCM + Ledger hardware wallet support
- ⛓️ **Multi-chain support** - Works with Ethereum, Polygon, Arbitrum, Optimism, Base, and more
- 🎨 **Beautiful interface** - Modern terminal UI with interactive prompts
- 📦 **Safe lifecycle** - Create, deploy, and manage Safe accounts
- 📝 **Transaction handling** - Create, sign, and execute transactions

### Advanced Features
- 🤖 **Smart contract interaction** - Automatic ABI fetching and interactive function builder
- 🔌 **Proxy support** - Detects and handles EIP-1967 proxy contracts
- 👥 **Owner management** - Add/remove owners and change thresholds
- 🔄 **Multi-sig coordination** - Multiple workflows for collecting signatures
- 📥 **Transaction import** - Import from Safe web app's Transaction Builder

---

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g @safe-global/safe-cli

# Or run without installing
npx @safe-global/safe-cli
```

### First-Time Setup

**1. Initialize configuration**
```bash
safe config init
```
This sets up your chain configurations and optional API keys.

**2. Set up a wallet**
```bash
# Option A: Create a new wallet (generates private key)
safe wallet create

# Option B: Import existing private key
safe wallet import

# Option C: Import Ledger hardware wallet (recommended for production)
safe wallet import-ledger
```
Private keys are encrypted with a password. Ledger wallets use your hardware device for signing.

**3. Create your first Safe**
```bash
safe account create
```
Follow the interactive prompts to configure owners and threshold.

**That's it!** You're ready to manage Safe accounts from your terminal.

---

## 📚 Command Reference

### Configuration

| Command | Description |
|---------|-------------|
| `safe config init` | Set up CLI for first use (includes API keys) |
| `safe config show` | View current configuration |
| `safe config chains list` | List configured networks |
| `safe config chains add` | Add a custom network |
| `safe config chains remove` | Remove a network |
| `safe config chains edit` | Edit chains in your text editor |

### Wallets

| Command | Description |
|---------|-------------|
| `safe wallet create` | Create a new wallet with a generated private key |
| `safe wallet import` | Import a wallet with your existing private key |
| `safe wallet import-ledger` | Import a Ledger hardware wallet |
| `safe wallet list` | View all your wallets (shows wallet types) |
| `safe wallet use` | Switch to a different wallet |
| `safe wallet remove` | Delete a wallet |

### Safe Accounts

| Command | Description |
|---------|-------------|
| `safe account create` | Create a new Safe |
| `safe account deploy [address]` | Deploy a predicted Safe to the blockchain |
| `safe account open [address]` | Add an existing Safe to your workspace |
| `safe account list` | View all your Safes |
| `safe account info [address]` | Show Safe details (owners, threshold, balance) |
| `safe account add-owner [address]` | Add a new owner |
| `safe account remove-owner [address]` | Remove an owner |
| `safe account change-threshold [address]` | Change signature threshold |

**💡 Tip:** Most commands support EIP-3770 format (`eth:0x123...`) or will prompt you interactively.

### Transactions

| Command | Description |
|---------|-------------|
| `safe tx create` | Create a new transaction |
| `safe tx sign [txHash]` | Sign a transaction |
| `safe tx execute [txHash]` | Execute a transaction |
| `safe tx list` | View transactions |
| `safe tx status [txHash]` | Check signature progress |
| `safe tx export [txHash]` | Export as JSON for sharing |
| `safe tx import [json]` | Import from JSON |

**Multi-sig Coordination:**

| Command | Description |
|---------|-------------|
| `safe tx push [txHash]` | Upload to Safe Transaction Service |
| `safe tx pull` | Download pending transactions |
| `safe tx sync` | Sync local and remote transactions |

---

## 💡 Common Workflows

### Creating and Deploying a Safe

```bash
# 1. Create a Safe (gets predicted address)
safe account create

# 2. Deploy it to the blockchain
safe account deploy eth:0x742d35Cc...
```

### Sending ETH from a Safe

```bash
# Create and sign a transaction
safe tx create
# → Select your Safe
# → Enter recipient address
# → Enter amount in wei
# → Sign it

# If you're the only signer needed, execute immediately
safe tx execute <txHash>

# Or, share the transaction with other signers (see Multi-sig section)
```

### Interacting with a Smart Contract

```bash
safe tx create
# → Select your Safe
# → Enter contract address

# The CLI automatically:
# ✓ Detects it's a contract
# ✓ Fetches the ABI from Etherscan/Sourcify
# ✓ Shows you all available functions
# ✓ Helps you fill in parameters with validation
# ✓ Encodes the transaction

# Then sign and execute as usual
```

### Multi-sig Coordination

**Option A: Using Safe Transaction Service** (Recommended)

```bash
# Owner 1: Create and push
safe tx create
safe tx sign <txHash>
safe tx push <txHash>

# Owner 2: Pull and sign
safe tx pull
safe tx sign <txHash>
safe tx push <txHash>

# Any owner: Execute when threshold is met
safe tx execute <txHash>
```

**Option B: Offline with JSON Export**

```bash
# Owner 1: Create and export
safe tx create
safe tx sign <txHash>
safe tx export <txHash>
# → Share the JSON with other owners

# Owner 2: Import and sign
safe tx import '{"safeTxHash":"0x..."...}'
safe tx sign <txHash>

# Check progress
safe tx status <txHash>  # Shows "2/3 signatures"

# Execute when ready
safe tx execute <txHash>
```

---

## 🤖 Non-Interactive Usage & Automation

Safe CLI supports non-interactive mode for automation, CI/CD pipelines, and scripting workflows.

### Enabling Non-Interactive Mode

Use the `--json` or `--quiet` global flags:

```bash
# JSON output mode (machine-readable)
safe --json [command]

# Quiet mode (suppresses prompts, minimal output)
safe --quiet [command]
```

### Password Handling for Automation

Commands requiring wallet signatures need passwords. Use these methods (in priority order):

**1. Environment Variable** (Recommended for CI/CD)
```bash
export SAFE_WALLET_PASSWORD="your-secure-password"
safe --json tx sign 0xabc...
```

**2. Password File** (Secure for scripts)
```bash
echo "your-secure-password" > ~/.safe-password
chmod 600 ~/.safe-password
safe --password-file ~/.safe-password tx sign 0xabc...
```

**3. CLI Flag** (⚠️ Insecure - visible in process list)
```bash
safe --password "your-password" tx sign 0xabc...
# Warning: Only use for testing!
```

### Required Arguments

In non-interactive mode, commands require all arguments as flags:

#### Creating a Safe
```bash
safe --json account create \
  --chain-id 1 \
  --owners "0x123...,0x456..." \
  --threshold 2 \
  --name "my-safe" \
  --no-deploy
```

#### Deploying a Safe
```bash
export SAFE_WALLET_PASSWORD="password"
safe --json account deploy eth:0x742d35Cc...
```

#### Signing a Transaction
```bash
export SAFE_WALLET_PASSWORD="password"
safe --json tx sign 0xabc123...
```

#### Executing a Transaction
```bash
export SAFE_WALLET_PASSWORD="password"
safe --json tx execute 0xabc123...
```

#### Getting Safe Info
```bash
safe --json account info eth:0x742d35Cc...
```

#### Listing Transactions
```bash
safe --json tx list eth:0x742d35Cc...
```

### JSON Output Format

All commands in `--json` mode return consistent JSON:

**Success:**
```json
{
  "success": true,
  "message": "Operation completed",
  "data": {
    "safeTxHash": "0x...",
    "address": "0x...",
    ...
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "exitCode": 4
}
```

**Exit Codes:**
- `0` - Success
- `1` - General error
- `2` - Network error
- `3` - Authentication failure
- `4` - Invalid arguments
- `5` - Configuration error
- `6` - Safe not found
- `7` - Wallet error

### Complete CI/CD Example

```bash
#!/bin/bash
set -e  # Exit on error

# Set up environment
export SAFE_WALLET_PASSWORD="${SAFE_PASSWORD}"  # From CI secrets
export SAFE_OUTPUT_FORMAT="json"

# Create a Safe
RESULT=$(safe --json account create \
  --chain-id 11155111 \
  --owners "0x123...,0x456..." \
  --threshold 2 \
  --name "CI-Safe-$(date +%s)" \
  --no-deploy)

# Extract Safe address from JSON
SAFE_ADDRESS=$(echo $RESULT | jq -r '.data.address')
echo "Created Safe: $SAFE_ADDRESS"

# Deploy it
safe --json account deploy sepolia:$SAFE_ADDRESS

# Get Safe info and verify deployment
safe --json account info sepolia:$SAFE_ADDRESS | jq '.data.deployed'
```

### GitHub Actions Example

```yaml
name: Deploy Safe

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Install Safe CLI
        run: npm install -g @safe-global/safe-cli

      - name: Deploy Safe
        env:
          SAFE_WALLET_PASSWORD: ${{ secrets.SAFE_PASSWORD }}
        run: |
          safe --json account deploy sepolia:0x742d35Cc...
```

### Best Practices

1. **Never commit passwords** - Use environment variables or CI secrets
2. **Validate JSON output** - Check `success` field and handle errors
3. **Use exit codes** - Script can check `$?` for command success
4. **Parse with jq** - Extract specific fields from JSON output
5. **Test locally first** - Use `--json` flag to test automation scripts
6. **Use password files with proper permissions** - `chmod 600` for security

### Automation-Friendly Commands

| Command | Non-Interactive Support | Password Required |
|---------|------------------------|-------------------|
| `account create` | ✅ All args required | ❌ |
| `account deploy` | ✅ Address required | ✅ |
| `account info` | ✅ Address required | ❌ |
| `account list` | ✅ No args needed | ❌ |
| `account add-owner` | ✅ Address/owner required | ❌ (creates tx) |
| `tx sign` | ✅ Hash required | ✅ |
| `tx execute` | ✅ Hash required | ✅ |
| `tx list` | ✅ Optional address | ❌ |
| `tx status` | ✅ Hash required | ❌ |
| `tx export` | ✅ Hash required | ❌ |
| `tx import` | ✅ JSON required | ❌ |
| `wallet create` | ✅ All args required | ❌ |
| `wallet import` | ✅ All args required | ❌ |
| `wallet list` | ✅ No args needed | ❌ |

---

## ⚙️ Configuration

### Storage Location

Configuration files are stored in:
- **macOS**: `~/Library/Preferences/safe-cli/`
- **Linux**: `~/.config/safe-cli/`
- **Windows**: `%APPDATA%\safe-cli\`

### Supported Networks (Default)

Pre-configured for 18+ networks including:
- Ethereum, Sepolia (testnet)
- Layer 2s: Arbitrum, Optimism, Base, Polygon, zkSync Era, Polygon zkEVM, Scroll, Linea
- Alternative L1s: BNB Chain, Gnosis Chain, Avalanche, Celo, Aurora
- Emerging chains: Mantle, World Chain, Sonic, Unichain

Add custom networks with `safe config chains add`.

### Optional API Keys

These are optional but recommended for enhanced functionality:

#### Safe Transaction Service API Key

**Get it from:** [Safe Developer Dashboard](https://developer.safe.global)

**Enables:**
- Multi-sig coordination via Safe Transaction Service
- Push/pull transactions
- Integration with Safe web interface

**Without it:** You can still use offline JSON export/import for multi-sig.

#### Etherscan API Key

**Get it from:** [Etherscan](https://etherscan.io/myapikey) (free)

**Enables:**
- Proxy contract detection (EIP-1967)
- Better ABI fetching for proxies
- Automatic ABI merging for proxy + implementation

**Without it:** Uses Sourcify as fallback (still works, but no proxy detection).

**Setup:** Run `safe config init` and follow the prompts, or edit the config file manually.

---

## 🔐 Security

### Private Key Wallets
- **Key generation**: Uses Node.js crypto.randomBytes() for cryptographically secure random generation
- **Encryption**: Private keys encrypted with AES-256-GCM
- **Key derivation**: PBKDF2 with 100,000 iterations
- **Local storage**: All data stored locally on your machine
- **No exposure**: Keys never logged or transmitted in plain text
- **Backup verification**: Confirmation required when creating new wallets

### Hardware Wallets (Ledger)
- **Maximum security**: Private keys never leave the device
- **Physical confirmation**: All transactions require on-device approval
- **Industry standard**: BIP44 derivation paths
- **Secure Element**: Military-grade chip protection

**Recommendation**: Use Ledger hardware wallets for production Safe accounts with significant funds.

---

## 🛠️ For Developers

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Development Setup

```bash
# Clone the repository
git clone https://github.com/5afe/safe-cli-nodejs.git
cd safe-cli-nodejs

# Install dependencies
npm install

# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Run tests
npm test

# Build
npm run build
```

### Project Structure

```
src/
├── commands/           # Command implementations
│   ├── config/        # Configuration commands
│   ├── wallet/        # Wallet management (incl. Ledger)
│   ├── account/       # Safe account operations
│   └── tx/            # Transaction commands
├── services/          # Business logic
│   ├── safe-service.ts
│   ├── transaction-service.ts
│   ├── ledger-service.ts      # Ledger hardware wallet integration
│   ├── abi-service.ts
│   └── validation-service.ts
├── storage/           # Persistent storage
│   ├── config-store.ts
│   ├── wallet-store.ts
│   └── transaction-store.ts
├── ui/                # Terminal UI components (React/Ink)
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

### Tech Stack

- **TypeScript** - Type safety
- **Commander.js** - CLI framework
- **React + Ink** - Terminal UI
- **@clack/prompts** - Interactive prompts
- **Viem** - Ethereum utilities
- **Safe Core SDK** - Safe protocol integration
- **LedgerJS** - Hardware wallet integration
- **Zod** - Runtime validation

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit with a clear message
6. Push and open a Pull Request

Please ensure:
- Tests pass (`npm test`)
- TypeScript compiles (`npm run typecheck`)
- Code is formatted (`npm run format`)

---

## 📖 Additional Resources

- [Safe Documentation](https://docs.safe.global/)
- [Safe Core SDK](https://github.com/safe-global/safe-core-sdk)
- [Safe Website](https://safe.global/)
- [EIP-3770: Chain-specific addresses](https://eips.ethereum.org/EIPS/eip-3770)

---

## 📄 License

LGPL-3.0

---

Made with ❤️ for the Safe community
