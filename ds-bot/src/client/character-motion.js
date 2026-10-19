// Independent motion layers keep a glance, breath and reaction from replacing
// each other. WAAPI runs the continuous movement without React frame updates.
export function randomStream(seed) {
  let value = seed || 1
  return () => {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5
    return (value >>> 0) / 4294967296
  }
}

export function bodyFrames(state, small = false) {
  const quiet = state === 'sleeping'
  const reading = ['working', 'searching', 'sending'].includes(state)
  const attention = ['alert', 'done'].includes(state)
  const lift = small ? 3 : 6
  if (reading) return [
    { transform: 'translateY(0) scale(1.025,.975) rotate(-2deg)', offset: 0 },
    { transform: `translateY(-${lift}%) scale(.98,1.025) rotate(2deg)`, offset: .24 },
    { transform: 'translateY(0) scale(1.035,.965) rotate(0)', offset: .46 },
    { transform: `translateY(-${lift * .4}%) scale(.99,1.01) rotate(-1deg)`, offset: .68 },
    { transform: 'translateY(0) scale(1.025,.975) rotate(-2deg)', offset: 1 },
  ]
  if (attention) return [
    { transform: 'translateY(0) scale(1)', offset: 0 },
    { transform: 'translateY(0) scale(1.08,.92)', offset: .08 },
    { transform: `translateY(-${lift * 2}%) scale(.96,1.04) rotate(-4deg)`, offset: .2 },
    { transform: 'translateY(0) scale(1.06,.94)', offset: .34 },
    { transform: `translateY(-${lift}%) scale(.98,1.02) rotate(3deg)`, offset: .44 },
    { transform: 'translateY(0) scale(1)', offset: .6 },
    { transform: 'translateY(0) scale(1)', offset: 1 },
  ]
  return [
    { transform: 'translateY(0) scale(1) rotate(0)' },
    { transform: `translateY(-${quiet ? 1.2 : .7}%) scale(${quiet ? '.98,1.035' : '.99,1.018'}) rotate(${quiet ? 1.5 : .6}deg)` },
    { transform: 'translateY(0) scale(1) rotate(0)' },
  ]
}

export function installCharacterMotion(node, { seed = 1, state = 'idle', interactive = false } = {}) {
  const rng = randomStream(seed)
  const body = node.querySelector('.bt-b') ?? node.querySelector('.bt-mark-img')
  const gesture = node.querySelector('.bt-gesture') ?? body
  const eyes = [...node.querySelectorAll('.bt-eye')]
  const gaze = node.querySelector('.bt-eyes')
  if (!body?.animate) return () => {}
  const animations = new Set()
  const timeouts = new Set()
  let stopped = false, visible = true, noticed = false, clicks = 0
  let motion = document.body.dataset.btMotion ?? 'normal'
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  const allowed = () => !stopped && visible && !document.hidden && !reduce.matches
  const wait = (fn, ms) => {
    const id = setTimeout(() => { timeouts.delete(id); if (!stopped) fn() }, ms)
    timeouts.add(id)
  }
  const play = (target, frames, options) => {
    if (!allowed() || !target) return undefined
    const animation = target.animate(frames, options)
    animations.add(animation)
    animation.onfinish = () => { animations.delete(animation); animation.cancel() }
    return animation
  }
  const blink = () => {
    if (allowed() && !noticed && state !== 'sleeping' && motion !== 'quiet') {
      const shut = () => eyes.forEach(eye => play(eye, [
        { transform: 'scaleY(1)' }, { transform: 'scaleY(.08)', offset: .45 }, { transform: 'scaleY(1)' },
      ], { duration: 190 + rng() * 70, easing: 'ease-in-out' }))
      shut()
      if (rng() > .75) wait(shut, 300)
    }
    wait(blink, 2700 + rng() * 4300)
  }
  const react = (kind = 0) => {
    if (!allowed() || motion === 'quiet') return
    const frames = kind % 3 === 0 ? [
      { transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.09,.91) rotate(-4deg)', offset: .18 },
      { transform: 'translateY(-9%) scale(.96,1.04) rotate(4deg)', offset: .48 }, { transform: 'scale(1.025,.975) rotate(-1deg)', offset: .76 }, { transform: 'scale(1) rotate(0)' },
    ] : kind % 3 === 1 ? [
      { transform: 'rotate(0)' }, { transform: 'rotate(-9deg)', offset: .25 }, { transform: 'rotate(7deg)', offset: .55 }, { transform: 'rotate(-2deg)', offset: .8 }, { transform: 'rotate(0)' },
    ] : [
      { transform: 'scale(1)' }, { transform: 'scale(.95,1.07) translateY(-2%)', offset: .4 }, { transform: 'scale(1.04,.96)', offset: .75 }, { transform: 'scale(1)' },
    ]
    play(gesture, frames, { duration: 650 + rng() * 200, easing: 'cubic-bezier(.22,.7,.32,1)' })
  }
  const fidget = () => {
    if (allowed() && !noticed && motion !== 'quiet' && ['idle', 'watching', 'waiting'].includes(state)) {
      if (rng() < .5) {
        play(gaze, [{ transform: 'translateX(0)' }, { transform: 'translateX(-9%)', offset: .2 }, { transform: 'translateX(-9%)', offset: .48 }, { transform: 'translateX(7%)', offset: .7 }, { transform: 'translateX(0)' }], { duration: 1800, easing: 'ease-in-out' })
      } else react(Math.floor(rng() * 3))
    }
    wait(fidget, (motion === 'lively' ? 4200 : 8500) + rng() * 8000)
  }
  const reset = () => {
    for (const animation of animations) animation.cancel()
    animations.clear()
    motion = document.body.dataset.btMotion ?? 'normal'
    node.dataset.motionPaused = allowed() ? 'false' : 'true'
    if (!allowed() || (motion === 'quiet' && ['idle', 'sleeping', 'watching'].includes(state))) return
    play(body, bodyFrames(state, node.clientWidth <= 28), {
      duration: ['working', 'searching', 'sending'].includes(state) ? 1800 : ['alert', 'done'].includes(state) ? 3000 : 4300 + rng() * 1000,
      iterations: Infinity, easing: 'ease-in-out',
    })
    if (motion !== 'quiet' && ['working', 'searching', 'watching'].includes(state)) {
      play(gaze, [{ transform: 'translateX(-8%)' }, { transform: 'translateX(9%)', offset: .6 }, { transform: 'translateX(9%)', offset: .75 }, { transform: 'translateX(-8%)' }], {
        duration: state === 'watching' ? 7600 : 2100, iterations: Infinity, easing: 'ease-in-out',
      })
    }
  }
  const enter = () => { noticed = true; node.dataset.noticed = ''; react(1) }
  const leave = () => { noticed = false; delete node.dataset.noticed }
  const click = () => { react(clicks++); node.dataset.delighted = ''; wait(() => delete node.dataset.delighted, 1000) }
  const key = event => {
    if (event.target === node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); click() }
  }
  const observer = new MutationObserver(reset)
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-bt-motion'] })
  const intersection = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting !== false
    reset()
  }) : null
  intersection?.observe(node)
  document.addEventListener('visibilitychange', reset)
  reduce.addEventListener('change', reset)
  if (interactive) {
    node.addEventListener('pointerenter', enter); node.addEventListener('pointerleave', leave)
    node.addEventListener('click', click); node.addEventListener('keydown', key)
  }
  node.dataset.organic = ''
  reset(); wait(blink, 800 + rng() * 3000); wait(fidget, 3000 + rng() * 6000)
  return () => {
    stopped = true
    timeouts.forEach(clearTimeout)
    animations.forEach(animation => animation.cancel())
    observer.disconnect(); intersection?.disconnect()
    document.removeEventListener('visibilitychange', reset); reduce.removeEventListener('change', reset)
    node.removeEventListener('pointerenter', enter); node.removeEventListener('pointerleave', leave)
    node.removeEventListener('click', click); node.removeEventListener('keydown', key)
    delete node.dataset.organic; delete node.dataset.motionPaused; delete node.dataset.noticed; delete node.dataset.delighted
  }
}
