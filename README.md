# Safe CLI

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

Perfect for developers, power users, and teams who prefer working in the terminal.

---

## ✨ Features

### Core Functionality
- 🔐 **Secure wallet management** - Encrypted private key storage with AES-256-GCM
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

**2. Import a wallet**
```bash
safe wallet import
```
Your private key will be encrypted with a password you choose.

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
| `safe wallet import` | Import a wallet with your private key |
| `safe wallet list` | View all your wallets |
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

# 2. Send some ETH to the predicted address for deployment gas

# 3. Deploy it to the blockchain
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

## ⚙️ Configuration

### Storage Location

Configuration files are stored in:
- **macOS/Linux**: `~/.config/safe-cli/`
- **Windows**: `%APPDATA%\safe-cli\`

### Supported Networks (Default)

- Ethereum Mainnet
- Sepolia Testnet
- Polygon
- Arbitrum One
- Optimism
- Base
- Gnosis Chain
- BNB Smart Chain
- Avalanche C-Chain

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

- **Encryption**: Private keys encrypted with AES-256-GCM
- **Key derivation**: PBKDF2 with 100,000 iterations
- **Local storage**: All data stored locally on your machine
- **No exposure**: Keys never logged or transmitted in plain text

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
│   ├── wallet/        # Wallet management
│   ├── account/       # Safe account operations
│   └── tx/            # Transaction commands
├── services/          # Business logic
│   ├── safe-service.ts
│   ├── transaction-service.ts
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

MIT

---

Made with ❤️ for the Safe community
