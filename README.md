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

## 🔑 Wallet Management

### Creating a New Wallet

If you don't have an existing private key, you can generate a new wallet:

```bash
safe wallet create
```

**Security Flow:**

The CLI will guide you through a secure wallet creation process:

1. **Security warnings** - Read and acknowledge the risks
2. **Password setup** - Create a strong password for encryption
3. **Wallet naming** - Give your wallet a memorable name
4. **Key generation** - A cryptographically secure private key is generated
5. **Private key display** - Your key is shown **once** - back it up safely!
6. **Backup verification** - Confirm you've saved it by re-entering the last 8 characters
7. **Encryption** - The key is encrypted and stored locally

**Example:**
```bash
$ safe wallet create

┌  Create New Wallet
│
◆  🔐 Security Warning
│  ⚠️  This command will generate a NEW private key
│  ⚠️  You are SOLELY responsible for backing it up securely
│  ⚠️  Loss of your private key = permanent loss of funds
│  ⚠️  NEVER share your private key with anyone
│  ⚠️  This CLI stores keys encrypted locally with your password
│
◆  Do you understand these risks and wish to continue?
│  Yes
│
◆  Create a password to encrypt your wallets
│  ********
│
◆  Confirm password
│  ********
│
◆  Give this wallet a name
│  My New Wallet
│
◇  Private key generated successfully
│
◆  🔑 Your Private Key
│  0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
│
│  ⚠️  Write this down and store it in a secure location.
│  ⚠️  This is the ONLY time it will be displayed in plain text.
│  ⚠️  Anyone with this key has FULL control of your wallet.
│
◆  To confirm you have saved it, enter the last 8 characters:
│  90abcdef
│
◇  Wallet created successfully
│  Name: My New Wallet
│  Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
│
└  Done!
```

**🔒 Security Best Practices:**

- **Write it down** - Store your private key on paper in a secure location
- **Multiple copies** - Keep backups in different safe locations
- **Never digital** - Don't store in cloud storage, email, or screenshots
- **Use hardware wallets** - For significant funds, use `safe wallet import-ledger` instead
- **Test first** - Try creating a test wallet on testnet (Sepolia) before mainnet

**⚠️ Important Notes:**

- Your private key is encrypted with your password and stored locally
- Without your password, the encrypted key cannot be decrypted
- If you lose your private key, you lose access to your funds permanently
- The CLI cannot recover your private key if lost

### Importing an Existing Wallet

If you already have a private key:

```bash
safe wallet import
```

Follow the prompts to securely import your existing key. It will be encrypted with your password.

---

## 🔐 Hardware Wallet Support

Safe CLI supports **Ledger hardware wallets** for enhanced security. Your private keys never leave the device.

### Prerequisites

1. **Ledger device** (Nano S, Nano S Plus, or Nano X)
2. **Ethereum app installed** on your Ledger
3. **Device firmware** up to date

### Importing a Ledger Wallet

```bash
safe wallet import-ledger
```

The CLI will guide you through:

1. **Device detection** - Connects to your Ledger automatically
2. **Derivation path selection** - Choose your address path:
   - **Ledger Live** (recommended): `m/44'/60'/0'/0/0`
   - **Legacy MEW**: `m/44'/60'/0'/0` (for MyEtherWallet compatibility)
   - **Custom path**: Advanced users can specify their own BIP44 path
3. **Account index** - Select which account to use (0, 1, 2, etc.)
4. **Address verification** - Confirm the address matches your device screen
5. **Wallet naming** - Give your wallet a friendly name

**Example:**
```bash
$ safe wallet import-ledger

┌  Import Ledger Hardware Wallet
│
◇  Device detected!
│
◆  Select derivation path
│  ● Ledger Live (m/44'/60'/0'/0/0) - Default for Ledger Live (recommended)
│  ○ Legacy MEW (m/44'/60'/0'/0) - Compatible with MyEtherWallet/MyCrypto
│  ○ Custom path - Advanced: specify your own BIP44 path
└
◆  Enter account index
│  0
└
◇  Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
│  Derivation path: m/44'/60'/0'/0/0
│
◆  Does this address match what is shown on your Ledger device?
│  Yes
└
◆  Enter a name for this wallet
│  My Ledger
└
◇  Wallet imported successfully!
│  ID: a3f5e8c92d1b...
│  Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
│  Path: m/44'/60'/0'/0/0
│
└  Done!
```

### Using Your Ledger Wallet

Once imported, your Ledger wallet works seamlessly with all Safe CLI commands:

**Signing Transactions:**
```bash
safe tx sign

# The CLI automatically detects your Ledger wallet
# → Connecting to Ledger device...
# → Please confirm transaction on your Ledger device...
# → Transaction signed ✓
```

**Switching Wallets:**
```bash
safe wallet list  # Shows: 🔐 Ledger or 🔑 Private Key
safe wallet use   # Switch between wallets
```

### Multiple Ledger Accounts

You can import multiple accounts from the same Ledger:

```bash
# Import account 0
safe wallet import-ledger
# → Account index: 0
# → Name: "Ledger Account 0"

# Import account 1
safe wallet import-ledger
# → Account index: 1
# → Name: "Ledger Account 1"
```

Each account is tracked separately with its own derivation path.

### Troubleshooting

**"No Ledger device found"**
- Ensure device is connected via USB
- Unlock your Ledger
- Open the **Ethereum app** on the device

**"Failed to connect to Ledger"**
- Close Ledger Live (it locks the device)
- Try a different USB cable/port
- Update Ledger firmware to latest version

**"Transaction signing failed"**
- Make sure you approved the transaction on device
- Check that **Contract data** is enabled in Ethereum app settings
- Verify the device didn't time out (screen went dark)

**Contract Data Setting (Required for Safe):**
1. Open Ethereum app on Ledger
2. Navigate to Settings
3. Enable "Contract data"
4. Exit back to main Ethereum app

### Security Notes

✅ **What's stored locally:**
- Wallet address
- Derivation path
- Wallet name and metadata

❌ **What's NOT stored:**
- Private keys (always on device)
- PIN code
- Recovery phrase

🔒 **Transaction signing:**
- All signatures happen on the device
- You must physically approve each transaction
- Address and transaction details shown on device screen

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

MIT

---

Made with ❤️ for the Safe community
