# Halfsignal 0.2.4 upstream synchronization

## Source and release

Merge upstream DS Bot v0.2.4 (`f823773b07ec6ca29d60b31c31af30218a68000d`)
into local Halfsignal `7344a31b23278376a738490337c54eb686dd6800`.
The local mobile workspace filter commit is included although it was not yet on
the Fork's main branch. The merge retains both histories. Package version:
`0.2.4-halfsignal.15`.

## Result

- Keep native Harness navigation, account launcher, composer, model selection,
  conversation rendering and process controls, compact groups, companion shapes,
  faces and animations. Keep the mobile entry's workspace filter.
- Bring in upstream reliable handoffs, restart reconciliation, request receipts,
  memory recovery, scheduled-task deduplication, screenshot recovery, private Bots,
  Office tools and skills, learned skill/project instruction proposals, avatar
  library, browser handoff cards, side chats and shared Deep View.
- Keep the native sidebar's ownership of its geometry and shortcuts. Do not mount
  upstream's replacement left column or avatar rail. Observe the native column's
  actual width for panel sizing; on a narrow chat, the panel overlays the chat
  instead of collapsing or moving the native sidebar.
- Preserve `avatar.face` validation in the roster. Preserve legacy
  `taskExecutionId` exclusions in normal turn/inbox recovery and extend the same
  fence to the new ended-turn reconciliation path. The retired board bridge stays
  retired.
- Register `browser_handoff` with the native tool-view adapter and keep its card
  visible when native process details fold. Preserve the voice/terminal buttons
  and add the side chat/files menu.
- Fit the companion editor to the details pane; its colors, shapes and faces wrap
  inside that pane. Keep the avatar library and the existing companion picker.
- Keep package URLs and desktop update feeds on KouriVar/DeepSeek-Bot. The Fork's
  release job packs a plugin artifact and never publishes the official npm name.
  The original publisher runs only in the upstream repository.
- Rebuild client.js and office.js; regenerate both lockfiles. Normalize trailing
  whitespace in the generated client, including dependency CSS, in the builder.

## Validation

- DSH 0.2.1-rc.4: complete Bot suite, 1,300 tests; 1,298 passed, two skipped.
- DSH 0.2.1-rc.5: complete Bot suite, same results. Add rc.5 to the CI matrix.
- Limit test-file concurrency to four on this machine; an existing file-retry
  timing assertion flaked under unrestricted concurrency and passed with that
  limit. The release workflow uses the same tested command.
- Generated-client/Office freshness check and oxlint passed. Existing upstream
  lint warnings remain; no lint errors.
- Desktop app unit suite: 210 tests; 209 passed, one platform-specific skip.
- Plugin and desktop frontend builds passed. No desktop installer was installed
  or packaged on the user's computer.
- Full host smoke against npm DSH rc.4 in a fresh isolated home, with the local
  scripted model: all 52 steps passed. Includes private/group chat, view cards,
  delegation, context/parts, memory, work folders, roster changes, MCP and Skills
  isolation. No real account or external model was used.
- Browser verification on that same isolated host: native sidebar/header/composer,
  details, opening Side chat from its menu, private-Bot settings, avatar library
  entry and the custom companion picker. Confirmed the editor stays within the
  320px details pane. No browser console errors were observed in the checked flow.
- Added regression coverage for native panel sizing, browser handoff visibility
  through folded native tools and the retired-task fence on ended-turn recovery.

The smoke host and model processes were stopped after verification. Production
DSH, its linked checkout, profile, data and running process were not changed.
Real provider behavior, real browser sign-ins/payments, Windows/Linux GUIs and
full installed-desktop packaging remain outside local validation.

## Installation and rollback

Use the versioned GitHub plugin source for this Fork:

```text
github:KouriVar/DeepSeek-Bot#v0.2.4-halfsignal.15&path:/ds-bot
```

Versioned GitHub sources let the existing updater discover future releases of
this Fork. `link:` installs do not pull from GitHub; switching such an install to
the GitHub source is a one-time action for the user. A downloaded `.tgz` is also
provided as an alternative, but tarball sources do not offer the same automatic
release discovery.

The current live installation was intentionally left on its existing local
directory link. Before a real update, let Bots finish and preserve a consistent
copy of the team/profile/workspace data. New request receipts, memory transactions
and privacy records mean rollback should restore the matching old data snapshot
as well as the old code. In particular, old code does not enforce private-Bot
protection. Keep the previous linked checkout for rollback; never reset it to
upstream.
