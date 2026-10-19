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

## Native conversation surface

Version `0.1.7-halfsignal.4` also retains the official conversation header, Chat /
Trajectory tabs, assistant and user message renderers, tool tree, turn actions,
composer controls and usage dock. It removes the Bot overrides that hid or
restyled those areas. A small native-icon header action still opens Bot / group
details; voice chat remains available in a Bot's details toolbar.

Bot-specific tools register through the public `tool.call.toolview` extension
point. Group replies keep their speaker names, mentions, progress and approval
cards. The native turn-process renderer is delegated without redeclaring its
child slots; group rounds stay open because their actual messages live in tool
results. Recorded private coordination turns are filtered by their turn numbers,
while their attribution remains visible. The server's routing, message delivery,
permissions and group scheduling code are unchanged.

Validation: 654 unit tests passed, generated client check and lint passed. In an
isolated mock-backed Web profile, sent a group message with `@所有人`, verified
both members' replies and reopened the group details panel. Installed the package
into the existing Desktop profile with the official CLI and checked the restored
native controls in Bot mode.

Version `0.1.7-halfsignal.5` aligns group messages with a fixed 24px avatar column
and an 8px gutter. Names, administrator badges and every paragraph share the
same content column, including consecutive messages from one member. Group work
and approval notices align with that column instead of centering in the page.
Names use the active theme's text color; member identity remains in the avatar.
The tool headers and native conversation controls keep their existing geometry.

Validation: 654 tests, lint and generated-client check passed. Browser bounds in
the isolated two-member group show identical name/body x coordinates and 24px
avatars aligned with the name row. Installed the package into Desktop and
checked the existing group's long reply and work notice visually.

## Group typography refinement

Version `0.1.7-halfsignal.6` takes layout cues from the following Mobbin references:

- [Tana chat](https://mobbin.com/screens/d12e7ed6-153a-4ed4-b61e-b3da75bbbfca): a clear sender header above readable long-form replies.
- [hilos conversation](https://mobbin.com/screens/5d4dd59c-c9f9-4085-bc6a-3c90fbcdbccc): avatars establish identity, secondary metadata stays quiet, and contextual actions float above messages.

These are visual references; no third-party graphics or component code are
included in the plugin. The implementation keeps Harness typography and colors,
using 32px avatars with a 12px gutter, 13px semibold sender names, lighter 11px
role metadata and a 24px body line height at the default 14px content size. The
hover toolbar floats above the message instead of requiring a permanent footer
gap. Within one group round, a work notice can separate two messages from the
same sender without repeating its header; a user message or another sender
starts a fresh header. Separate turns and late posts remain distinct.

Validation: 655 tests, lint and generated-client check passed. Checked the dark
mock-backed group and the signed-in Desktop group's long reply in the light
theme, including role text, work notices and the floating hover toolbar. Reviewed
a contact sheet of the reference, current screen and before/after captures.
Installed through the official Desktop plugin CLI.

Version `0.1.7-halfsignal.7` uses a compact 28px avatar beside the sender name
and administrator metadata on one header row. Message content spans the full
width on the next row and starts at the avatar's left edge. Group work notices
use that same outer edge. Existing typography and contextual actions remain.

Validation: 655 tests, lint and generated-client check passed. Browser bounds
confirm a 28px avatar, identical avatar/body x coordinates and a shared header y
coordinate for each sender. Installed and checked the existing Desktop group.
