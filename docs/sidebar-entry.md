# Native sidebar entry

This fork places DS Bot directly below Scheduled tasks in the Harness sidebar.
It registers `sidebar.panellist` at order 20, after Plugins (0) and Scheduled
tasks (10), and uses the platform's `IconAgentPresetOutlineRegular` icon.
Harness renders the row, including its typography, spacing, theme colors,
hover, keyboard focus and collapsed tooltip.

Selecting the entry returns to the Conversation and switches to the existing
Bot surface. The old footer button and its custom styles are removed. No
Harness files or user data are changed by this source modification.

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
- The user's installed Desktop profile was not modified.
