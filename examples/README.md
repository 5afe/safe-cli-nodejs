# Transaction Builder Import Examples

This directory contains example JSON files in the Safe Transaction Builder format for testing import functionality.

## Example 1: Single Token Approval

File: `example-approve.json`

A simple USDC approval transaction that can be imported into the CLI.

```bash
safe tx import examples/example-approve.json
```

## Example 2: Multiple Transactions

File: `example-batch.json`

A batch of multiple transactions (will be imported separately).

```bash
safe tx import examples/example-batch.json
```

## Creating Your Own

1. Go to https://app.safe.global
2. Create a transaction batch in the Transaction Builder
3. Export as JSON
4. Import into CLI with `safe tx import <file.json>`

## Format Reference

The Transaction Builder format includes:
- `version`: Format version (e.g., "1.0")
- `chainId`: Network ID as string
- `createdAt`: Unix timestamp in milliseconds
- `meta`: Metadata including Safe address, creator, name, description
- `transactions`: Array of transaction objects with:
  - `to`: Target address
  - `value`: Value in wei (as string)
  - `data`: Optional hex-encoded call data
  - `contractMethod`: Optional ABI method definition
  - `contractInputsValues`: Optional decoded parameters

The CLI will automatically:
- Detect the Transaction Builder format
- Parse and encode transaction data
- Prompt for missing fields (nonce, gas parameters)
- Create local transactions ready for signing
