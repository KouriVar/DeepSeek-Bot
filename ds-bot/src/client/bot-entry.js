import { createElement as h, useEffect } from 'react'
import { IconAgentPresetOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'

// The shell owns the row, its label and the collapsed tooltip.
export function BotPanelIcon({ size }) {
  return h(IconAgentPresetOutlineRegular, { size })
}

// Panel selection must finish before changing surfaces; returning to the
// conversation keeps the current Session available to setSurface's home check.
export function BotEntry({ actions }) {
  useEffect(() => {
    actions.selectPanel(null)
    actions.setSurface('bot')
  }, [actions])
  return null
}
