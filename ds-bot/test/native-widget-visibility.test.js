import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'

const requireHarness = createRequire(join(process.env.DSH_HARNESS, 'package.json'))
const { JSDOM } = requireHarness('jsdom')
const bundle = await build({
  entryPoints: ['src/client/styles.js'], bundle: true, format: 'cjs', platform: 'browser', write: false,
  external: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'],
})
const module = { exports: {} }
runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, require: () => ({}) })

// DSH keeps folded roots, bodies and rows mounted with hidden=until-found.
// A widget must remain operable at every level, while ordinary tools still fold.
test('native process folding leaves widgets visible and other tool details folded', () => {
  const { window } = new JSDOM(`<!doctype html><style>[hidden="until-found"]{content-visibility:hidden}</style>
    <div id="widget" data-step-process hidden="until-found"><div data-step-process-body hidden="until-found"><div data-turn-process-hidden hidden="until-found"><div class="bt-view"><button>Send</button></div></div></div></div>
    <div id="handoff" data-step-process hidden="until-found"><div data-step-process-body hidden="until-found"><div data-turn-process-hidden hidden="until-found"><div class="bt-handoff"><button>Take over</button></div></div></div></div>
    <div id="tool" data-step-process hidden="until-found"><div data-step-process-body hidden="until-found"><div data-turn-process-hidden hidden="until-found">Tool output</div></div></div>`)
  const style = window.document.createElement('style')
  style.textContent = module.exports.CONVERSATION_CSS
  window.document.head.append(style)
  for (const element of window.document.querySelectorAll('#widget, #widget [hidden], #handoff, #handoff [hidden]')) {
    assert.equal(window.getComputedStyle(element).contentVisibility, 'visible')
  }
  assert.equal(window.getComputedStyle(window.document.querySelector('#tool')).contentVisibility, 'hidden')
  window.close()
})
