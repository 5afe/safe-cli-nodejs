import { renderScreen } from '../../ui/render.js'
import { ConfigShowScreen } from '../../ui/screens/index.js'

/**
 * Displays the current CLI configuration.
 *
 * Migration: Phase 4 - Tier 1 command
 * - Old: 55 lines of imperative console.log with manual formatting
 * - New: Declarative Ink rendering (3 lines)
 *
 * Benefits:
 * - Structured layout with KeyValue components
 * - Consistent styling and spacing
 * - Proper component composition (chains, defaults, API config)
 * - API key obfuscation handled in component
 * - Much cleaner code (55 → 3 lines = 95% reduction!)
 */
export async function showConfig() {
  await renderScreen(ConfigShowScreen, {})
}
