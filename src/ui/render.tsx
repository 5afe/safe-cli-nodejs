import { render } from 'ink'
import React from 'react'

/**
 * Check if we're running in REPL mode
 */
function isReplMode(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).__SAFE_CLI_REPL_MODE__ === true
}

/**
 * Renders an Ink component and returns a promise that resolves when the component unmounts.
 * This utility bridges between command functions and Ink's reactive rendering.
 *
 * Behavior:
 * - In REPL mode: Uses onExit callback and timeout to prevent hanging
 * - In normal mode: Lets Ink handle the lifecycle naturally (as before REPL PR)
 *
 * @param Component - The React component to render
 * @param props - Props to pass to the component
 * @returns A promise that resolves when the component unmounts
 *
 * @example
 * ```typescript
 * await renderScreen(WalletListScreen, { userName: 'Alice' })
 * ```
 */
export function renderScreen<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  props: T
): Promise<void> {
  const replMode = isReplMode()

  return new Promise((resolve) => {
    let exitCalled = false

    // Create onExit callback that screens can call when they're done
    const onExit = () => {
      if (exitCalled) return
      exitCalled = true

      // In REPL mode, manually unmount to avoid process.exit
      // In normal mode, just resolve and let things happen naturally
      if (replMode) {
        setTimeout(() => {
          unmount()
          resolve()
        }, 10)
      } else {
        resolve()
      }
    }

    // Pass onExit to component
    const componentProps = { ...props, onExit } as T

    const { unmount } = render(<Component {...componentProps} />)

    // Only use safety timeout in REPL mode
    if (replMode) {
      // Set a safety timeout to auto-unmount if screen doesn't call onExit
      // This only triggers for catastrophic failures (infinite loops, crashes, etc.)
      // All screens properly track their async operations and call onExit() when done
      // 2 minutes allows for slow RPC endpoints and multiple concurrent requests
      setTimeout(() => {
        if (!exitCalled) {
          onExit()
        }
      }, 120000)
    }
  })
}

/**
 * Renders an Ink component synchronously without waiting for exit.
 * Useful for long-running displays or when you need to control unmounting manually.
 *
 * @param Component - The React component to render
 * @param props - Props to pass to the component
 * @returns An object with unmount and waitUntilExit functions
 *
 * @example
 * ```typescript
 * const { unmount } = renderScreenSync(LoadingSpinner, { message: 'Processing...' })
 * // ... do work ...
 * unmount()
 * ```
 */
export function renderScreenSync<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  props: T
) {
  return render(<Component {...props} />)
}
