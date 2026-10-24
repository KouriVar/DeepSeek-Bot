# Halfsignal upstream synchronization — 2026-10-24

## Scope and source

Merge released upstream `main` at `1bebe826f74e9a72cabafd3b80602b05af867b38`
(DS Bot v0.2.1) into Halfsignal `b308239`. Unreleased upstream `dev` is not included.
Custom package version: `0.2.1-halfsignal.14`. Verified host: DSH `0.2.1-rc.2`.
The pre-merge source is retained at `backup/halfsignal-before-upstream-20261024`.

The user chose Bot-only functionality, upstream functional additions, and existing
Halfsignal UI/interaction wherever both implementations overlap.

## Conflict decisions

- Preserve native Harness branding, header, new-session button, composer, model
  picker, run statistics, account launcher, Chat/Bot navigation, department search
  geometry and the existing compact group layout.
- Preserve custom character shapes, faces, interactive companion motion, 24px group
  avatars, circular photo crops and continuation headers. Merge upstream photo-failure
  fallback and reply time/duration into them.
- Add upstream `/btw` input trigger, dock and turn-tail cards without replacing
  native assistant messages or transcript controls.
- Add `show_view` to the native tool-view bridge and mount upstream widget styles
  and dock. Native process roots, bodies and rows containing a widget stay visible
  when ordinary tool details fold. Other tools retain normal folding.
- Keep upstream functional changes to group-isolated memory, relay limits/Continue,
  widgets/charts/formulas/HTML sandbox, browser persistence and cookie import,
  account sign-out, secret purpose editing and desktop integration.
- Preserve the existing voice action and add upstream terminal entry in details.
- Keep the normal Harness conversation presentation in preference to upstream's
  floating header, replacement composer and transcript restyling. Upstream rendering
  preferences remain available to Bot-rendered history and auxiliary views; native
  Harness content continues to use its own rendering controls.
- Regenerate client.js and lockfiles. Package links and desktop update feeds point
  to KouriVar's fork. A local tgz or unversioned fork source has no upstream automatic
  plugin replacement offer.
- Route native icons through the existing primitive adapter so both the Harness
  plugin and the standalone app fallback build. Harness still supplies its actual icons.
- Keep both sides' regression tests. Normalize external symlink destinations in the
  upstream move-data test because macOS `/var` resolves to `/private/var`.

## Kanban retirement

Remove Bot's optional `task-bridge` module, registration, collaboration prompt,
delegation guard and dedicated tests. Do not edit the companion Kanban repository,
its task store or any production Harness data. Bot identity, memory, groups, delegation,
models, MCP, Skills and the existing Bot scheduler remain in the original runtime.
Legacy `taskExecutionId` recovery fences stay so interrupted board work is not resumed
or resent as ordinary Bot messages. A regression test verifies this behavior.

## Validation

- Bot unit suite: 951 tests, 949 passed, 2 skipped, zero failures.
- Desktop unit suite: 113 tests, 112 passed, 1 Windows-only test skipped, zero failures.
- Generated client freshness check and oxlint: passed; existing lint warnings remain.
- Plugin client and standalone app frontend builds: passed.
- Full API smoke on a fresh `.dsh-test-upstream-20261024` home, local mock model and
  DSH 0.2.1-rc.2: all 52 steps passed. Includes roster, groups, group memory, card
  answers, handoffs, history, context condensation, work folders, MCP and Skills isolation.
- Browser checks on that same isolated home: native navigation/composer and group
  geometry; `/btw` answer appears on the closed turn; calculator choice changes
  the formula result and Send to Bot settles the card; chart series switching works.
- DOM regression: folded native process ancestors keep widgets visible while
  unrelated tool details remain folded.

Windows/Linux desktop GUIs, production account sign-out, and real browser credential
import were not exercised. Their upstream unit tests passed; no production credentials
or account state were accessed. This synchronization does not replace the user's running
app or its data; the custom tgz is the installation artifact.
