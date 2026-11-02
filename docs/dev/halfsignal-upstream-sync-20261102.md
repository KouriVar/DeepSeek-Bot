# Halfsignal 0.2.6 upstream synchronization

## Source and release

Merge upstream DS Bot v0.2.6 (`5c514ad`) into the Fork's released line
`v0.2.4-halfsignal.15` (`0bfe40a`), which is also what `main` pointed at on
GitHub. Package version: `0.2.6-halfsignal.16`.

The local clone's `main` was stale at `7344a31`, an ancestor of `0bfe40a`, and
its `origin/main` ref still showed the pre-0.2.4 merge (`43e4687`). Merging
v0.2.6 into that stale tip would have re-merged 0.2.2–0.2.4 and overwritten the
conflict resolutions made for 0.2.4, so this synchronization starts from
`0bfe40a` and `main` fast-forwards to the result. The mobile fix that was only
local (`7344a31`) is already part of that history.

14 files conflicted. For each one the two sides were compared against the
merge base (`f823773`, upstream v0.2.4) first, so a change that was upstream's
own earlier code, later retired upstream, is not mistaken for a Fork change.

## Result

- Keep the native Harness navigation, sidebar, composer, model selection and
  conversation rendering. Do not mount upstream's left column, avatar rail or
  its `LeftColumn`/`TitleToggle`, and do not take upstream's replacements for
  the conversation cells (`AssistantCell`, `ToolCell`, `TurnProcessCell`,
  `UserMessageCell`) or its composer slot removals: the Fork draws the native
  conversation, so those shadows do not apply. Keep `compaction` → `Nothing`
  and the `bot-quote` composer voice slot.
- Keep the native sidebar's ownership of its geometry: `frame` keeps
  `sidebarWidth: 0` and observes the shell's track through `installFrameWatch`;
  `readSidebar`/`sidebarPref` (upstream's own column preference) are not wired.
- Desktop app follows upstream's rename: `app/` is `dsbot` / "DS Bot", with
  `dsbot.desktop`, `executableName: dsbot` and `DS-Bot-*` artifacts, because
  `app/electron-builder.yml` and the legacy-install migration come from
  upstream. The Harness plugin keeps its `ds-bot` package identity, Halfsignal
  description, repository URLs and the `dsh.mobile` entry.
- Group chat keeps the compact rendering: continuation blocks with one header
  per speaker, work cards for started/finished/approval, `time` elements and
  the 24px live `BotMark`. Upstream now keeps `stackReplies` in
  `src/shared/group-replies.js`, so the continuation logic moved there and both
  the live chat and the earlier-parts page use it. Add upstream's new `folder`
  group event. Take upstream's retirement of the relay-limit Continue button
  (`paused` is legacy, and the action no longer exists). The pending row takes
  upstream's `doing`/`phrase` data with the Fork's sizes.
- `resume.js` takes upstream's queued-delivery redesign: `QUEUED_KEPT_MS` and
  `QUEUED_MAX` were upstream's own, and `d1170ae` removed them on purpose
  ("Keep queued deliveries whole"). Only the four `taskExecutionId` fences are
  re-applied: `triggerOf`, `resumeTurn`, the queued filter and
  `reconcileEnded`.
- Adopt upstream's boot-failure hint (`bootFailed` + `bootHint`) in the native
  sidebar, so a team that cannot start says why instead of "Setting up your
  Main Bot…" forever.
- Adopt the `[data-bt-emptied]` empty-seat CSS rules (a slot holding a lone
  text node still reads as `:empty`); keep the Fork's `bt-group-replies` layout
  and folded-tool rules.
- Tests: keep the Fork's native-sidebar and footer coverage; drop upstream's
  footer-grid and left-column drag tests, which cover the column this Fork does
  not mount. `about.test.js` expects the Fork's "Halfsignal app" copy.
- The release workflow keeps the `publish` gate to the upstream repository and
  the `halfsignal-plugin` job, on top of upstream's renamed artifacts and its
  `legacy-release-assets.mjs` step.

## Validation

- DSH 0.2.1-rc.4 harness: complete Bot suite, 1,450 tests; 1,448 passed, two
  skipped, none failed (`--test-concurrency=4`).
- Desktop app unit suite: 232 tests; 231 passed, one platform-specific skip.
- `node scripts/build-client.mjs --check` passed after rebuilding `client.js`
  from `src/client`; `client.js` was not edited by hand.
- `npm run lint`: 41 warnings, no errors. The warnings are upstream's existing
  ones.
- Plugin and desktop frontend builds passed. No desktop installer was installed
  or packaged on the user's computer.
- `npm pack` produces `ds-bot-0.2.6-halfsignal.16.tgz` (731 kB, 79 files).
