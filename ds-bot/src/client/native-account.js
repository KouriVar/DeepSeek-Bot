import { createElement as h, useEffect } from 'react'
import { AccountLauncher, holdHarnessNavigation } from './sidebar.js'
import { freePriority } from './surface.js'

// Delegate the original slot component with its own hooks, locale and account
// operations intact. Only its Settings navigation changes in the Bot surface.
export function NativeAccountLauncher({ NativeLauncher, openBotSettings, ...props }) {
  useEffect(() => holdHarnessNavigation(props), [props.openSettings, props.openOnboarding])
  return h(NativeLauncher, { ...props, openSettings: openBotSettings })
}

export function installNativeAccount(ctx, actions, face) {
  return ctx.slots.inject('settings.launcher', () => {
    let current
    let installed = false
    let updating = false
    let release = () => {}
    const sync = () => {
      if (updating) return
      const entries = ctx.slots.entries('settings.launcher')
      const original = entries.filter(entry => entry.component !== NativeAccountLauncher && entry.component !== AccountLauncher)
        .sort((a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0))[0]
      if (installed && original === current) return
      updating = true
      try {
        current = original
        installed = true
        release()
        const options = { name: 'settings.launcher', priority: freePriority(ctx.slots.entries('settings.launcher'), { priority: -100 }) }
        release = ctx.slots.register(original ? {
          ...options,
          ...(original.locale ? { locale: original.locale } : {}),
          ...(original.store ? { store: original.store } : {}),
          ...(original.children ? { children: original.children } : {}),
          inject: (...args) => ({ ...original.inject?.(...args), NativeLauncher: original.component, openBotSettings: () => actions.openSettings('general') }),
        } : { ...options, inject: face }, original ? NativeAccountLauncher : AccountLauncher)
      } finally { updating = false }
    }
    const off = ctx.slots.subscribe('settings.launcher', sync)
    sync()
    return () => { off(); release() }
  })
}
