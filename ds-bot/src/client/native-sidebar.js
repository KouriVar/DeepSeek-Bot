// The shell declares its child slots exclusively, so re-registering the whole
// sidebar would displace those owners. Keep its button and intercept only its
// activation during the Bot shell's lifetime; disposal restores native behavior.
export function installNativeNewSession(actions, root = document) {
  const open = event => {
    if (event.defaultPrevented) return
    const button = event.target?.closest?.('button[class*="_newSession"]')
    if (!button || button.disabled) return
    event.preventDefault()
    event.stopImmediatePropagation()
    actions.selectPanel(null)
    actions.openNewChat('new')
  }
  root.addEventListener('click', open, true)
  return () => root.removeEventListener('click', open, true)
}
