import { renderScreen } from '../../ui/render.js'
import { AccountListScreen } from '../../ui/screens/index.js'

/**
 * Lists all Safe accounts with live on-chain data.
 *
 * Migration: Phase 4 - Tier 1 command
 * - Old: 113 lines of imperative console.log with complex state management
 * - New: Declarative Ink rendering (3 lines)
 *
 * Benefits:
 * - Reactive updates as live data loads (no screen clearing!)
 * - Component handles state management (loading, live data fetching)
 * - Reusable SafeList rendering logic
 * - Consistent styling and formatting
 * - Much cleaner code (113 → 3 lines = 97% reduction!)
 */
export async function listSafes() {
  await renderScreen(AccountListScreen, {})
}
