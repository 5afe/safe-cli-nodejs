# Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to run quality checks before commits.

## What Runs on Pre-commit

### 1. TypeScript Type Check
```bash
npm run typecheck
```
Runs on **all files** to ensure type safety across the entire codebase.

### 2. Prettier (Format)
```bash
prettier --write
```
Runs on **staged `.ts` files only** and automatically formats them.

### 3. ESLint (Lint)
```bash
eslint --fix
```
Runs on **staged `.ts` files only** and automatically fixes linting issues where possible.

## How It Works

1. You stage your changes: `git add .`
2. You attempt to commit: `git commit -m "message"`
3. The pre-commit hook runs automatically:
   - First: Type check runs on entire codebase
   - Then: Prettier and ESLint run on staged files only
4. If all checks pass, the commit proceeds
5. If any check fails, the commit is aborted

## Manual Commands

You can run these checks manually at any time:

```bash
# Type check
npm run typecheck

# Format all files
npm run format

# Check formatting without writing
npm run format:check

# Lint all files
npm run lint

# Lint and auto-fix
npm run lint:fix
```

## Skipping Hooks (Not Recommended)

In rare cases where you need to bypass the hooks:

```bash
git commit -m "message" --no-verify
```

⚠️ **Warning:** Only use `--no-verify` when absolutely necessary, as it skips all quality checks.

## Configuration

### Husky Configuration
- Location: `.husky/`
- Pre-commit hook: `.husky/pre-commit`

### Lint-staged Configuration
- Location: `package.json` under `"lint-staged"` key
- Current configuration:
  ```json
  {
    "lint-staged": {
      "*.ts": [
        "prettier --write",
        "eslint --fix"
      ]
    }
  }
  ```

## Setup for New Contributors

Husky hooks are automatically installed when running:

```bash
npm install
```

This runs the `prepare` script which initializes Husky.

## Troubleshooting

### Hooks Not Running

If hooks aren't running after `npm install`:

```bash
npx husky install
```

### Permission Issues

If you get permission errors:

```bash
chmod +x .husky/pre-commit
```

### Slow Commits

If commits are taking too long:
- TypeScript type checking runs on the entire project (necessary for safety)
- Prettier and ESLint only run on staged files (already optimized)
- Consider using `git commit -v` to see progress

### False Positives

If you believe a lint error is incorrect:
1. Fix the code to satisfy the linter (preferred)
2. Add an inline disable comment with justification:
   ```typescript
   // eslint-disable-next-line rule-name -- Reason for disabling
   ```
3. Update ESLint configuration if the rule doesn't make sense globally

## Benefits

✅ **Consistent Code Style** - All code follows the same formatting rules
✅ **Early Error Detection** - Catch type errors and lint issues before pushing
✅ **Automatic Fixes** - Many issues are auto-fixed during commit
✅ **Better Code Reviews** - No need to discuss formatting in PRs
✅ **Faster CI** - Fewer CI failures due to formatting/linting
