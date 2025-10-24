# Running Safe CLI in StackBlitz

This project is configured to run in StackBlitz's WebContainer environment.

## Quick Start Links

**Terminal View (Recommended):**
- Direct link: `https://stackblitz.com/github/5afe/safe-cli-nodejs?view=terminal`
- Or use: `https://stackblitz.com/~/github/5afe/safe-cli-nodejs` (tilde prefix opens terminal)

**Editor View:**
- Standard link: `https://stackblitz.com/github/5afe/safe-cli-nodejs`

## Usage

1. The dependencies will install automatically when you open the project
2. The project will build automatically
3. Use the terminal to run commands with `npm run dev --`:
   ```bash
   npm run dev -- --help
   npm run dev -- config init
   npm run dev -- wallet import
   npm run dev -- account create
   ```

**Note:** In StackBlitz's WebContainer, use `npm run dev --` to run commands. The `--` passes arguments to the CLI.

## Available Commands

See the main README.md for all available commands. Some highlights:

- `safe config init` - Initialize configuration
- `safe wallet import` - Import a wallet
- `safe account create` - Create a new Safe account
- `safe tx create` - Create a transaction

## Notes

- All data is stored in the WebContainer's virtual filesystem
- Configuration is saved in `.config/safe-cli/` within the container
- The CLI works fully interactively in the StackBlitz terminal

## Development

If you want to make changes:

```bash
# Watch mode for development
npm run dev

# Build manually
npm run build

# Run tests
npm test
```
