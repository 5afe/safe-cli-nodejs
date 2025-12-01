import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { theme } from '../theme.js'

export interface AISuggestionScreenProps {
  suggestion: string
  onExit?: () => void
}

/**
 * AISuggestionScreen displays AI-powered command suggestions
 * when an unrecognized command is entered.
 */
export function AISuggestionScreen({
  suggestion,
  onExit,
}: AISuggestionScreenProps): React.ReactElement {
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column">
      {suggestion.split('\n').map((line, index) => {
        // Check if this is the indented command line
        if (line.startsWith('    safe ')) {
          return (
            <Box key={index}>
              <Text>    </Text>
              <Text color={theme.colors.primary}>{line.trim()}</Text>
            </Box>
          )
        }
        // Other lines (Did you mean, explanation, etc.)
        return <Text key={index}>{line}</Text>
      })}
    </Box>
  )
}
