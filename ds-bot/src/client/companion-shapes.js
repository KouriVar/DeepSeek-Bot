import { COMPANION_SHINE } from './inks.js'
// Front-facing companions built from simple geometric silhouettes. These paths and
// faces are original; the existing dimensional characters remain available.
export { COMPANION_COLORS } from './inks.js'
const flower = () => {
  const points = Array.from({ length: 64 }, (_, i) => {
    const a = i * Math.PI / 32, r = 37 + 3 * Math.cos(a * 8)
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]
  })
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('') + 'Z'
}
const eyes = [[41, 51, 5.5, 12, 0], [59, 51, 5.5, 12, 0]]
export const COMPANIONS = {
  'soft-round': { label: 'Orb', path: 'M90 50A40 40 0 1 1 10 50A40 40 0 1 1 90 50Z' },
  'soft-square': { label: 'Pebble', path: 'M35 10H65Q90 10 90 35V65Q90 90 65 90H35Q10 90 10 65V35Q10 10 35 10Z' },
  'soft-drop': { label: 'Sprout', path: 'M39 15Q50 -1 61 15L88 65Q100 88 74 89H26Q0 88 12 65Z' },
  'soft-gem': { label: 'Prism', path: 'M41 12Q50 3 59 12L88 41Q97 50 88 59L59 88Q50 97 41 88L12 59Q3 50 12 41Z' },
  'soft-flower': { label: 'Bloom', path: flower() },
}
for (const shape of Object.values(COMPANIONS)) Object.assign(shape, { size: 100, layers: '', eyes, companion: true })
export const COMPANION_SHAPES = Object.keys(COMPANIONS)

export function companionFace(face = 'calm') {
  const eye = (x, width = 5.5, height = 12) => `<ellipse class="bt-eye" cx="${x}" cy="51" rx="${width / 2}" ry="${height / 2}"/>`
  const smile = x => `<path class="bt-eye" d="M${x - 4} 52Q${x} 45 ${x + 4} 52" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
  let normal
  if (face === 'cheerful') normal = smile(41) + smile(59)
  else if (face === 'sleepy') normal = '<path class="bt-eye" d="M37 51L45 52M55 52L63 51" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
  else if (face === 'wink') normal = eye(41) + smile(59)
  else if (face === 'curious') normal = eye(41, 5.5, 9) + eye(59, 6.5, 16)
  else if (face === 'bright') normal = eye(41, 10, 11) + eye(59, 10, 11) + `<g fill="${COMPANION_SHINE}" opacity=".85"><circle cx="40" cy="49" r="1.7"/><circle cx="58" cy="49" r="1.7"/></g>`
  else normal = eye(41) + eye(59)
  return `<g class="bt-gaze"><g class="bt-eyes"><g class="bt-face-normal">${normal}</g><g class="bt-face-smile" opacity="0">${smile(41)}${smile(59)}</g></g></g>`
}
