/**
 * Main UI module exports for Safe CLI.
 * Provides all UI components, screens, hooks, utilities, and theme.
 */

// Core utilities
export { renderScreen, renderScreenSync } from './render.js'

// Theme
export { theme } from './theme.js'
export type { Theme, ThemeColor, ThemeSpacing, ThemeIcon } from './theme.js'

// Components
export * from './components/index.js'

// Screens (will be populated during Phase 4)
export * from './screens/index.js'

// Hooks (will be populated during Phase 3)
export * from './hooks/index.js'
