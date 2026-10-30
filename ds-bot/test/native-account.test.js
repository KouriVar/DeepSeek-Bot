import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/client/native-account.js', import.meta.url))],
  bundle: true, format: 'cjs', platform: 'node', write: false,
  external: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'],
})
const module = { exports: {} }
runInNewContext(bundle.outputFiles[0].text, {
  module, exports: module.exports,
  require: name => (name === 'react' ? { createContext: (value) => ({ value }), useContext: context => context.value,
    useCallback: fn => fn, useSyncExternalStore: (_, getSnapshot) => getSnapshot(),
    useMemo: make => make(), useId: () => 'dv-id',
    createElement: (type, props) => ({ type, props }), useEffect() {} } : {}),
})
const { NativeAccountLauncher, installNativeAccount } = module.exports

function registry() {
  const entries = []
  const listeners = new Set()
  const notify = () => { for (const listener of [...listeners]) listener() }
  return {
    entries: () => entries,
    inject: (_name, install) => install(),
    subscribe: (_name, listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    register(options, component) {
      const entry = { component, options, inject: options.inject, locale: options.locale, store: options.store }
      entries.push(entry)
      notify()
      return () => { entries.splice(entries.indexOf(entry), 1); notify() }
    },
  }
}

test('the native account renderer keeps its identity and operations; Settings opens Bot settings', () => {
  const NativeLauncher = () => null
  const slots = registry()
  const accountHooks = { account: { getSnapshot: () => ({ name: 'Demo', avatar: 'demo-avatar' }) } }
  const signOut = () => {}
  slots.register({ name: 'settings.launcher', locale: 'settings.account', inject: () => ({ hooks: accountHooks, signOut }) }, NativeLauncher)
  const opened = []
  const stop = installNativeAccount({ slots }, { openSettings: page => opened.push(page) }, () => ({}))
  const wrapped = slots.entries().find(entry => entry.component === NativeAccountLauncher)
  assert.ok(wrapped)
  assert.equal(wrapped.locale, 'settings.account')
  const nativeOpenSettings = () => opened.push('app')
  const props = { ...wrapped.inject(), openSettings: nativeOpenSettings, wide: true }
  const node = NativeAccountLauncher(props)
  assert.equal(node.type, NativeLauncher)
  assert.equal(node.props.hooks, accountHooks)
  assert.equal(node.props.signOut, signOut)
  node.props.openSettings()
  assert.deepEqual(opened, ['general'])
  assert.equal(props.openSettings, nativeOpenSettings)
  stop()
  assert.equal(slots.entries().length, 1)
  assert.equal(slots.entries()[0].component, NativeLauncher)
})

test('a later native launcher replaces the fallback once and remains after Bot mode exits', () => {
  const slots = registry()
  const stop = installNativeAccount({ slots }, { openSettings() {} }, () => ({}))
  assert.equal(slots.entries().length, 1)
  const NativeLauncher = () => null
  slots.register({ name: 'settings.launcher', locale: 'settings.account', inject: () => ({}) }, NativeLauncher)
  assert.equal(slots.entries().length, 2)
  const wrapper = slots.entries().find(entry => entry.component === NativeAccountLauncher)
  assert.equal(wrapper.inject().NativeLauncher, NativeLauncher)
  stop()
  assert.equal(slots.entries().length, 1)
  assert.equal(slots.entries()[0].component, NativeLauncher)
})
