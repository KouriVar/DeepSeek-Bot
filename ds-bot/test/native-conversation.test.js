import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'

const built = await build({
  entryPoints: [fileURLToPath(new URL('../src/client/native-conversation.js', import.meta.url))],
  bundle: true, format: 'cjs', platform: 'node', write: false,
  external: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'],
})
const effects = []
const module = { exports: {} }
runInNewContext(built.outputFiles[0].text, {
  module, exports: module.exports,
  require: name => name === 'react' ? {
    createContext: (value) => ({ value }), useContext: context => context.value,
    useCallback: fn => fn, useSyncExternalStore: (_, getSnapshot) => getSnapshot(),
    useMemo: make => make(), useId: () => 'dv-id',
        createElement: (type, props) => ({ type, props }), useEffect: effect => effects.push(effect),
  } : {},
})
const { coordinationCss, BotToolView, BOT_TOOL_NAMES, NativeTurnProcess, installTurnProcess } = module.exports

test('native views hide only recorded coordination turns, using turn values rather than array indices', () => {
  const css = coordinationCss({ roomsById: {}, exchangeTurns: { bot: [7, 19, 'bad', -1] } }, 'bot')
  assert.match(css, /data-chat-turn="7"/)
  assert.match(css, /data-chat-turn="19"/)
  assert.doesNotMatch(css, /data-chat-turn="[01]"|bad|assistant-step/)
  assert.match(css, /:not\(\[data-chat-flow-kind="turn-trigger"\]\)/)
  assert.equal(coordinationCss({ roomsById: {}, exchangeTurns: {} }, 'other'), '')
})

test('group tool views receive the actual native call block unchanged', () => {
  const block = { kind: 'tool-result', name: 'group_relay', callId: 'r1', content: [{ type: 'text', text: '{"replies":[]}' }] }
  const actions = { roomProgress() {} }
  const node = BotToolView({ phase: 'result', block, actions, sessionId: 'room' })
  assert.equal(node.props.node.data.root, block)
  assert.equal(node.props.actions, actions)
  assert.equal(node.props.sessionId, 'room')
})

test('group replies stay expanded while private chats keep native process controls', () => {
  const NativeNode = () => null
  let opened = 0
  const turnProcess = { foldable: true, open: false, setOpen: value => { if (value) opened++ } }
  const t = () => ''
  effects.length = 0
  const group = NativeTurnProcess({ NativeNode, sessionId: 'room', turnProcess, t, useRoster: pick => pick({ roomsById: { room: {} } }) })
  effects.pop()()
  assert.equal(opened, 1)
  assert.equal(group.type, NativeNode)
  assert.equal(group.props.turnProcess.foldable, false)
  assert.equal(group.props.t, t)
  const solo = NativeTurnProcess({ NativeNode, sessionId: 'bot', turnProcess, useRoster: pick => pick({ roomsById: {} }) })
  effects.pop()()
  assert.equal(opened, 1)
  assert.equal(solo.props.turnProcess, turnProcess)
})

test('the process bridge restores the original renderer when Bot mode exits', () => {
  const original = { component: () => null, options: { key: 'turn-process' }, locale: 'chat' }
  const entries = [original]
  const listeners = new Set()
  const slots = {
    entries: () => entries,
    inject: (_name, install) => install(),
    subscribe: (_name, run) => { listeners.add(run); return () => listeners.delete(run) },
    register(options, component) {
      assert.equal(options.children, undefined)
      const entry = { options, component }
      entries.push(entry)
      for (const run of [...listeners]) run()
      return () => { entries.splice(entries.indexOf(entry), 1); for (const run of [...listeners]) run() }
    },
  }
  const stop = installTurnProcess({ slots }, () => ({ actions: {} }))
  assert.equal(entries.length, 2)
  assert.equal(entries[1].options.inject().NativeNode, original.component)
  stop()
  assert.deepEqual(entries, [original])
  assert.equal(listeners.size, 0)
})

// Widgets must use the Bot renderer even though the native tool tree stays mounted.
test('show_view uses the Bot tool view alongside the existing group tools', () => {
  assert.ok(BOT_TOOL_NAMES.includes('show_view'))
  const block = { kind: 'tool-result', name: 'show_view', callId: 'widget', content: [] }
  assert.equal(BotToolView({ block, sessionId: 'bot' }).props.node.data.root, block)
})
