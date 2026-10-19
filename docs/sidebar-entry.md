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

Version `0.1.7-halfsignal.8` uses 24px circular sender avatars, including uploaded
photos and generated characters. The sender name and role remain on the header
row, with the body aligned to the avatar's left edge. Header-to-body spacing is
12px; paragraphs, stacked content and work notices use a 16px rhythm. Adjacent
messages from different members have 32px separation. Group reply blocks have
16px outer flow margins so they do not inherit the native tool list's compact
6px spacing. Native body line height and normal tool-list spacing stay in place.

Validation: 655 tests, lint and generated-client check passed. In the isolated
dark-theme group, browser bounds confirm 24px square circular avatars, a 12px
header/body gap and 32px separation between members. Installed through the
Desktop plugin CLI and visually checked the existing light-theme group's long
reply, uploaded photo, tool metadata and work notice.

## Upstream integration (2026-10-19)

Version `0.1.7-halfsignal.9` merges upstream `dev` through `d6fc7cb` while
retaining the Halfsignal surface. The upstream changes include member posts to
their groups, posts appearing during running rounds, input preservation during
part switches, serialized permission saves, thinking-level tools, style
ownership, usage cursors and state-write retries. The standalone app also gains
its upstream provider, import, packaging and update work; Harness Desktop still
runs this fork as a plugin.

Conflict resolution combines the upstream timer and run-stat additions with the
existing voice action, native navigation and message presentation. The four
native integration modules and the sidebar/theme customizations are unchanged
from `005d7d4`; group headers retain 24px circular avatars and the agreed spacing.
The generated client is rebuilt from source rather than resolving its bundled
conflict by choosing either side. The pre-merge version is retained at commit `005d7d4` and on a backup branch.

Validation: plugin tests passed (734 passed, 2 skipped), all 25 standalone-app
tests passed, lint and the generated-client check passed, and the isolated
mock-backed host smoke passed all 41 steps. Browser checks confirm Chat/Bot
round-trip navigation, retained 24px round avatars and body alignment, a 12px
header/body gap and correctly owned style tags. The tracked-source scan reports
zero required fixes.

## Companion characters and group reading layout

Version `0.1.7-halfsignal.11` adds five front-facing geometric companions, ten
pastel colors and six expressions to the existing avatar editor. Original
characters and uploaded photos remain available. New Bots start on the companion
palette; existing identities are not migrated. Expression choices are validated
on the host and survive creation, editing and duplication.

The character preview supports idle, work, attention, news, rest and lookout
states without launching work. Body, gaze, blinks and reactions move separately;
clicks and keyboard activation produce a short reaction. Per-character random
streams stagger blinks and small gestures. Motion pauses offscreen, respects the
system's reduced-motion setting and releases animations, timers and listeners on
unmount. Sidebar rows show the Bot's avatar and role again.

Group messages use a 24px avatar column, a 12px gutter, a sender/role/time header
and a body aligned under the sender. Paragraph spacing stays on the native
rhythm. Repeated coordinator process labels are hidden only in groups; actual
tool views and the native trajectory remain available. Work and approval events
become small cards opening the Bot's chat or the group's approval details.

Visual and interaction reference: [Kuvo Code Bots](https://www.kuvo.run/code/docs/bots/).
This is an independent implementation for the Harness plugin, using its existing
SVG renderer and theme tokens. No Kuvo source code, graphics or runtime is
included or relicensed. Its native implementation was read as a reference; its
noncommercial license does not become part of this Apache-licensed fork.

Validation: 739 plugin tests passed (2 skipped), all 25 standalone-app tests
passed, lint and generated-client checks passed, and all 41 isolated host smoke
steps passed. Browser checks cover state, shape, color and expression changes,
click reactions, keyboard support, and an actual Bot creation followed by a page
reload confirming its saved shape, color and expression. Group bounds confirm
24px avatars and shared sender/body x coordinates. Captured the running work
animation and reviewed a contact sheet against the supplied character reference.

Installed `0.1.7-halfsignal.11` through the official desktop-profile plugin CLI.
The real macOS App confirms the revised group layout, deduplicated sidebar role
labels, and the companion editor with shape, color and work-state controls.
Existing team identities and conversations were preserved; no production Bot was
created or messaged during validation.
