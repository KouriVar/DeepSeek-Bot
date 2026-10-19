import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { installNativeNewSession } from '../src/client/native-sidebar.js'

const { JSDOM } = createRequire(new URL('../dev/harness/package.json', import.meta.url))('jsdom')

function sidebar() {
  const dom = new JSDOM('<button class="shell_newSession"><span>New session</span></button><button class="shell_panelRow">Plugins</button>')
  const calls = [], root = dom.window.document
  root.querySelector('.shell_newSession').addEventListener('click', () => calls.push('native session'))
  root.querySelector('.shell_panelRow').addEventListener('click', () => calls.push('plugins'))
  const activate = selector => root.querySelector(selector).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  const actions = { selectPanel: panel => calls.push(panel), openNewChat: mode => calls.push(mode) }
  return { root, calls, activate, actions }
}

test('the existing New Session button opens the Bot recipient picker, including clicks on its content', () => {
  const { root, calls, activate, actions } = sidebar()
  const stop = installNativeNewSession(actions, root)
  activate('.shell_newSession span')
  assert.deepEqual(calls, [null, 'new'])
  activate('.shell_panelRow')
  assert.deepEqual(calls, [null, 'new', 'plugins'])
  stop()
  activate('.shell_newSession')
  assert.deepEqual(calls, [null, 'new', 'plugins', 'native session'])
})

test('repeated Bot/Chat switches remove previous handlers and keep keyboard-style activation usable', () => {
  const { root, calls, activate, actions } = sidebar()
  for (let index = 0; index < 3; index += 1) {
    const stop = installNativeNewSession(actions, root)
    activate('.shell_newSession')
    stop()
  }
  assert.deepEqual(calls, [null, 'new', null, 'new', null, 'new'])
  activate('.shell_newSession')
  assert.equal(calls.at(-1), 'native session')
})
