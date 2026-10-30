import { createElement as h, useEffect } from 'react'
import { IconAgentPresetOutlineRegular } from './dsh-primitives.js'
import { t } from './i18n.js'
import { ToolCell } from './cells.js'
import { freePriority } from './surface.js'

export const BOT_TOOL_NAMES = ['message_bot', 'stop_bot', 'create_bot', 'update_bot', 'group_relay', 'create_group', 'update_group', 'delete_group', 'post_to_group', 'ask_user', 'request_secret', 'ask_user_question', 'read_group_chat', 'remember', 'forget', 'show_view', 'browser_handoff']

export function BotToolView(props) {
  return h(ToolCell, { ...props, node: { data: { root: props.block } } })
}

// The native message views remain mounted. Only internal team coordination is
// filtered; a group's actual replies are rendered by its group_relay tool view.
export function coordinationCss(roster, sessionId) {
  const hidden = (roster.exchangeTurns?.[sessionId] ?? []).filter(turn => Number.isSafeInteger(turn) && turn >= 0)
  const hiddenCss = hidden.map(turn => `[data-chat-turn="${turn}"]:not([data-chat-flow-kind="turn-trigger"]){display:none!important}`).join('')
  return hiddenCss + (roster.roomsById[sessionId] ? '[data-chat-flow-kind="assistant-step"],[data-chat-flow-kind="turn-process"]{display:none!important}[data-step-process]:has(.bt-group-replies)>div:first-child{display:none}' : '')
}

export function NativeBotDetails({ sessionId, actions, useUi, useRoster }) {
  const open = useUi(state => state.details === sessionId)
  const css = useRoster(roster => coordinationCss(roster, sessionId))
  useEffect(() => {
    actions.beginVisit(sessionId)
    return () => actions.endVisit(sessionId)
  }, [sessionId])
  return h('span', { className: 'bt-native-context' }, h('style', null, css), h('button', {
    type: 'button', className: 'bt-native-details', 'aria-label': t('View conversation details'),
    title: t('View conversation details'), 'aria-expanded': open,
    onClick: () => actions.toggleDetails(sessionId),
  }, h(IconAgentPresetOutlineRegular, { size: 16 })))
}

// Group messages live in a tool result; folding all tools must not hide the
// conversation. Private chats keep the host's normal disclosure behavior.
export function NativeTurnProcess({ NativeNode, useRoster, sessionId, turnProcess, ...props }) {
  const group = useRoster(roster => Boolean(roster.roomsById[sessionId]))
  useEffect(() => {
    if (group && turnProcess?.foldable && !turnProcess.open) turnProcess.setOpen(true)
  }, [group, turnProcess])
  return NativeNode ? h(NativeNode, {
    ...props, sessionId, turnProcess: group && turnProcess ? { ...turnProcess, foldable: false, open: true } : turnProcess,
  }) : null
}

export function installTurnProcess(ctx, face) {
  const name = 'conversation.chat.node'
  let current
  let release = () => {}
  let updating = false
  return ctx.slots.inject(name, () => {
    const sync = () => {
      if (updating) return
      const original = ctx.slots.entries(name).find(entry => entry.options.key === 'turn-process' && entry.component !== NativeTurnProcess)
      if (!original || original === current) return
      updating = true
      try {
        current = original
        release()
        release = ctx.slots.register({
          name, key: 'turn-process', locale: original.locale,
          priority: freePriority(ctx.slots.entries(name), { key: 'turn-process', priority: -100 }),
          inject: (...args) => ({ ...original.inject?.(...args), ...face(), NativeNode: original.component }),
        }, NativeTurnProcess)
      } finally { updating = false }
    }
    const off = ctx.slots.subscribe(name, sync)
    sync()
    return () => { off(); release() }
  })
}
