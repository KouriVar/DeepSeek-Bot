import { createElement as h, useEffect } from 'react'
import { IconAgentPresetOutlineRegular, IconNewChatOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'

// The shell owns the row, its label and the collapsed tooltip.
export function BotPanelIcon({ size }) {
  return h(IconAgentPresetOutlineRegular, { size })
}

export function ChatPanelIcon({ size }) {
  return h(IconNewChatOutlineRegular, { size })
}

// Panel selection must finish before changing surfaces; returning to the
// conversation keeps the current Session available to setSurface's home check.
export function BotEntry({ actions, useSurface }) {
  const mode = useSurface(state => state.mode)
  useEffect(() => {
    actions.selectPanel(null)
    actions.setSurface(mode === 'bot' ? 'agent' : 'bot')
  }, [actions])
  return null
}
