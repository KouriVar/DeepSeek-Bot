# Native sidebar entry

This fork names the interface Halfsignal and places it directly below Scheduled
tasks in the Harness sidebar. The package id remains `ds-bot` so existing teams,
sessions and settings keep working.
It registers `sidebar.panellist` at order 20, after Plugins (0) and Scheduled
tasks (10), and uses the platform's `IconAgentPresetOutlineRegular` icon.
Harness renders the row, including its typography, spacing, theme colors,
hover, keyboard focus and collapsed tooltip.

Selecting the entry returns to the Conversation and switches to the existing
Bot surface. The old footer button and its custom styles are removed. No
Harness files or user data are changed by this source modification.

Both modes retain the actual Harness brand row and New Session button. The
plugin does not replace the brand slots or restyle that header, so the official
DeepSeek HARNESS wordmark, glyphs, text, geometry and platform behavior stay the
same when switching modes. Bot and group creation lives at the + beside the Bot
list heading. A native New Session remains a native conversation.

## Install

In Harness, open Plugins → Add plugin and enter this package address:

```text
github:KouriVar/DeepSeek-Bot#feat/sidebar-bot-entry&path:/ds-bot
```

Alternatively, build a local package with `npm pack` in `ds-bot/`, then enter
the resulting `.tgz` file's absolute path in Add plugin. This replaces the
installed `ds-bot` package. Quit Harness completely and reopen it to load the
new client. The entry appears in classic Agent mode; Bot mode keeps its
existing team sidebar.

## Validation

- 648 unit tests passed.
- Generated `client.js` matches its sources.
- Lint completed without errors (existing repository warnings remain).
- In an isolated DSH Web 0.2.0-rc.2 profile, checked the three-row order and
  appearance, expanded and collapsed sidebars, and navigation back to Bot
  mode from Scheduled tasks.
- Light and dark themes, compact Bot rows, native composer layout and Bot settings
  were checked with a local mock model.
- Sidebar Bot, Plugins and Settings rows share a 16px icon column, 8px gap and
  36px row height. The Settings launcher's negative margins and excess width are
  neutralized. The input placeholder has a 14px left inset.
- Compared header and New Session element bounds before and after switching
  modes: all measured positions and dimensions match.
- Built `ds-bot-0.1.7-halfsignal.2.tgz` and installed it into the existing Desktop
  profile with the official bundled CLI. Bot and session data were retained.
