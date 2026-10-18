# Native sidebar entry

This fork names the interface Halfsignal and places it directly below Scheduled
tasks in the Harness sidebar. The package id remains `ds-bot` so existing teams,
sessions and settings keep working.
It registers `sidebar.panellist` at order 20, after Plugins (0) and Scheduled
tasks (10), and uses the platform's `IconAgentPresetOutlineRegular` icon.
Harness renders the row, including its typography, spacing, theme colors,
hover, keyboard focus and collapsed tooltip.

The entry reads Halfsignal Bot in classic Chat mode and Halfsignal Chat in Bot
mode. Selecting it closes the active panel and switches to the other surface.
Both modes retain the native Plugins and Scheduled tasks rows above it. The old
Bot footer Plugins button and its custom layout are removed.

Both modes retain the actual Harness brand row and New Session button. The
plugin does not replace the brand slots or restyle that header, so the official
DeepSeek HARNESS wordmark, glyphs, text, geometry and platform behavior stay the
same when switching modes. Bot and group creation lives at the + beside the Bot
list heading. A native New Session remains a native conversation.

Both modes also retain the original account launcher, avatar, name and menu.
Bot mode delegates the registered native account component through the public
slot API, preserving its hooks, locale and account operations, and changes only
the Settings callback to open Halfsignal settings. Chat mode keeps the original
App settings callback. Hosts without an account launcher use the plugin's
existing fallback. No Harness files or user data are changed by this source
modification.

## Install

In Harness, open Plugins → Add plugin and enter this package address:

```text
github:KouriVar/DeepSeek-Bot#feat/sidebar-bot-entry&path:/ds-bot
```

Alternatively, build a local package with `npm pack` in `ds-bot/`, then enter
the resulting `.tgz` file's absolute path in Add plugin. This replaces the
installed `ds-bot` package. Quit Harness completely and reopen it to load the
new client. The switching entry appears in both modes, above the workspace or
Bot list respectively.

## Validation

- 650 unit tests passed, including native account delegation, callback routing,
  late account registration and restoring the original slot on disposal.
- Generated `client.js` matches its sources.
- Lint completed without errors (existing repository warnings remain).
- In an isolated DSH Web 0.2.0-rc.2 profile, checked the three-row order and
  appearance, expanded and collapsed sidebars, and navigation back to Bot
  mode from Scheduled tasks.
- Light and dark themes, compact Bot rows, native composer layout and Bot settings
  were checked with a local mock model.
- Native Plugins, Scheduled tasks and mode-switch rows use Harness geometry.
  Native account footer geometry is retained in both modes. The input
  placeholder has a 14px left inset.
- Compared header and New Session element bounds before and after switching
  modes: all measured positions and dimensions match.
- Built `ds-bot-0.1.7-halfsignal.3.tgz` and installed it into the existing Desktop
  profile with the official bundled CLI. Bot and session data were retained.
- In the signed-in Desktop app, verified both switching labels, the same avatar
  and account name in both modes, native Plugins and Scheduled tasks in Bot mode,
  and the distinct App settings / Halfsignal settings destinations.
