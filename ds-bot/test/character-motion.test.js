import assert from 'node:assert/strict'
import { test } from 'node:test'
import { installCharacterMotion, randomStream } from '../src/client/character-motion.js'
import { characterMarkup, lookOf } from '../src/client/characters.js'

test('characters keep an expression, validate it, and cache expressions separately', () => {
  const bot = { id: 'a', avatar: { shape: 'soft-square', face: 'wink' }, color: '#69C7B7' }
  assert.equal(lookOf(bot).face, 'wink')
  assert.equal(lookOf({ ...bot, avatar: { face: '<script>' } }).face, undefined)
  const calm = characterMarkup('soft-square', bot.color, 'calm')
  const wink = characterMarkup('soft-square', bot.color, 'wink')
  assert.notEqual(calm, wink)
  assert.equal(characterMarkup('soft-square', bot.color, 'calm'), calm)
  assert.ok(!calm.includes('<script'))
})

test('each character has a repeatable random stream without moving in lockstep', () => {
  const series = seed => { const random = randomStream(seed); return Array.from({ length: 20 }, random) }
  assert.deepEqual(series(123), series(123))
  assert.notDeepEqual(series(123), series(456))
  assert.ok(series(123).every(n => n >= 0 && n < 1))
})

test('motion suspends offscreen and with reduced motion, and disposes every listener and timer', (t) => {
  const timers = new Map(), animations = [], events = new Map(), docEvents = new Map()
  let serial = 0, observer, intersection
  const target = { animate(frames, options) {
    const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true } }
    animations.push(animation)
    return animation
  } }
  const node = {
    dataset: {}, clientWidth: 64,
    querySelector: () => target, querySelectorAll: () => [],
    addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key),
  }
  const media = { matches: false, addEventListener(_key, fn) { this.change = fn }, removeEventListener() { this.change = null } }
  const document = { body: { dataset: { btMotion: 'normal' } }, hidden: false,
    addEventListener: (key, fn) => docEvents.set(key, fn), removeEventListener: key => docEvents.delete(key) }
  const globals = { document, window: { matchMedia: () => media },
    MutationObserver: class { constructor(callback) { this.callback = callback; observer = this } observe() {} disconnect() { this.disconnected = true } },
    IntersectionObserver: class { constructor(callback) { this.callback = callback; intersection = this } observe() {} disconnect() { this.disconnected = true } },
  }
  for (const [key, value] of Object.entries(globals)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key])
  }
  t.mock.method(globalThis, 'setTimeout', fn => { const id = ++serial; timers.set(id, fn); return id })
  t.mock.method(globalThis, 'clearTimeout', id => timers.delete(id))
  const dispose = installCharacterMotion(node, { seed: 12, interactive: true })
  assert.equal(animations.length, 1)
  events.get('click')()
  assert.equal(animations.length, 2)
  intersection.callback([{ isIntersecting: false }])
  assert.ok(animations.every(a => a.cancelled))
  const count = animations.length
  events.get('click')()
  assert.equal(animations.length, count)
  intersection.callback([{ isIntersecting: true }])
  assert.equal(animations.length, count + 1)
  media.matches = true; media.change()
  assert.ok(animations.every(a => a.cancelled))
  dispose()
  assert.equal(timers.size, 0)
  assert.equal(events.size, 0)
  assert.equal(docEvents.size, 0)
  assert.ok(observer.disconnected && intersection.disconnected)
  assert.equal(media.change, null)
  assert.equal(node.dataset.organic, undefined)
})
