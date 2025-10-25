import { render } from 'ink'
import React from 'react'

/**
 * Renders an Ink component and returns a promise that resolves when the component unmounts.
 * This utility bridges between command functions and Ink's reactive rendering.
 *
 * @param Component - The React component to render
 * @param props - Props to pass to the component
 * @returns A promise that resolves when the component unmounts
 *
 * @example
 * ```typescript
 * await renderScreen(WelcomeScreen, { userName: 'Alice' })
 * ```
 */
export function renderScreen<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  props: T
): Promise<void> {
  return new Promise((resolve) => {
    const { unmount, waitUntilExit } = render(<Component {...props} />)

    waitUntilExit().then(() => {
      unmount()
      resolve()
    })
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
