# Unified task orchestration (incremental upgrade)

> Historical v13 design. Retired in v0.2.1-halfsignal.14 at the user’s request; the Bot plugin no longer publishes the board bridge. The companion repository and stored tasks are untouched.

## Source audit

The Bot host's module wiring, state migrations, delivery, turns, handoff tree,
restart journal, groups, identity prompts, tools, permissions, approvals, parts,
usage ledger, capability library and HTTP/SSE channel were inspected alongside
existing regression tests. The board's entire host/core/tool/adapter code,
SQLite v1 migration, browser action/data flow and tests were inspected at
`../dsh-task-board` (v0.3.0). No production DSH data was read for this audit.

Reuse: Bot identities and real Sessions, capabilities/model/permission setup,
message sources and turn events, inbox removal and exact turn cancellation,
part forwarding, usage settlement; board projects/tasks/executions/events,
SQLite transactions, revisions, user acceptance rules and existing interfaces.

Gaps: independent Team configuration, DAG planning, event-driven scheduling,
structured handoffs/review revisions, versioned host bridge and task-level
execution identity/cancellation. Existing `state.works` is transient message
handoff bookkeeping, not a durable project/task database. It stays unchanged.

## Ownership and compatibility

The existing board SQLite database is the ONLY task database. Team and task
orchestration extend its core service. Bot publishes a narrow `botTaskRuntime`
Cordis service; board publishes `taskOrchestrator`. Neither plugin creates a
second task store. Without the board, ordinary Bot use is unchanged; without
the bridge, board manual management remains available and automation fails closed.

Bot keeps only a durable admission journal (execution ID, actual Session/turn,
phase and usage dedup keys) in the existing locked state file. It holds no
project tasks, dependencies, team configuration or result database.

The board's existing six-column UI remains byte-for-byte unchanged. Managed
tasks have one canonical `task_state` including failed/cancelled/paused. Legacy
`status`/`column_id` are deterministic compatibility projections, not separate
state machines: those three states project to blocked. Existing tasks retain
manual workflow behavior. New automated teams require explicit user opt-in;
Bot tools cannot turn on automation or relax policy. User acceptance criteria
remain user-owned. Automatic review never fabricates approval.

## Execution and recovery

Leader plans a DAG through tools backed by the same service. A single scheduler
reacts to committed task events and real Bot availability/settlement events.
Assignments use current stable Bot IDs and configured capabilities/rules; names
and roles are never hard-coded. Dependencies unlock only after acceptance.

Reserve in SQLite before admission; persist admission before a real followup.
Execution IDs deduplicate both sides. An uncertain send/restart is blocked for
inspection, not automatically replayed. Ordinary Bot recovery is unchanged;
orchestrated turns are excluded from its automatic resends. Cancellation removes
only a matching queued message or cancels a proven matching turn. Late receipts
must match the active execution and Session lineage and cannot resurrect tasks.

Structured results and review revisions remain in existing execution/task rows.
Token usage is derived from DSH's real attempt settlements; budget checks gate
new dispatches and cancel a proven task turn when exhausted. This is not a
prepaid hard limit on a model request already in flight.

## Migration and rollback

Board schema v2 adds Team storage only; existing records receive additive JSON
fields on opt-in. WAL checkpoint + a before-v2 database backup precede migration.
Older board versions refuse newer schemas. Roll back by stopping the host,
restoring that backup and reinstalling saved packages. New Bot fields are
additive and ignored by older versions; never modify identities/memory/models.

## Verification

Run both existing suites, targeted bridge/store/orchestrator race and permission
tests, and isolated real DSH host scenarios with local mock models. Verify no
client UI/style source diffs. Report protocol tests separately from unverified
production model decisions; no real team messages or dangerous actions in tests.

## Octop reference audit

Read TeamManager, TeamJobTracker and TeamService at TencentCloud/Octop commit
`dd9dce470844c25d59effb50615bb3c667ea25cd` using primary GitHub source.
[TeamManager](https://github.com/TencentCloud/Octop/blob/dd9dce470844c25d59effb50615bb3c667ea25cd/src/octop/infra/agents/teams/team_manager.py)
coordinates prepared member Sessions, fan-in and inbox host wakeups. Its
TeamJobTracker explicitly keeps job IDs/counts only in memory; its HITL cancellation
is not a durable whole-task execution fence. Do not port its internal runtime
patching, lose in-flight locks on restart, or equate cancelling an approval future
with stopping member work. No source code copied or runtime dependency added.

Reuse the concepts of bounded result handoff and one host fan-in wakeup, implemented
through the existing shared board execution journal. A completed plan reserves a
leader aggregation execution once. Async assistance persists child work and releases
the caller's physical slot before resuming with accepted child results. This avoids
single-slot deadlock without adding synchronous model waits or another runtime.

Existing per-Bot and per-group Sessions remain isolated. Task executions still use
their Bot's private Session and normal part handoffs; they are not clean-room per-task
Sessions. Task handoff input is bounded; existing private history remains visible to
that Bot. This limitation is deliberate to avoid changing the Session topology and
expanding the upgrade scope.

## Implemented files and validation

New Bot module: `ds-bot/src/host/task-bridge.js`; small integration changes in
index/tools/resume. Existing host capability and permission implementations are
reused. New module is before feed/channel so the ordinary live-feed listener remains
last. Regression tests that select the parts middleware now identify it explicitly,
instead of assuming it is the last added pre-step hook.

The companion board adds core teams/orchestrator modules, schema v2 Team storage,
shared service/tool routing and durable commit-event subscriptions. See
`../dsh-task-board/docs/ORCHESTRATION.md` and `ORCHESTRATION-TESTS.md` there for API,
state projection, migration/rollback, evidence and limits.

Isolated real DSH protocol verification includes native Session result/review tools,
DAG branches and joins, one leader aggregation, rejection/rework, exact running-turn
cancellation, one-slot assistance/continuation and crash/restart without model resends.
The original Bot smoke completed all 41 steps including private/group communication,
parts, delegation and MCP/Skills. Both generated clients and client/style sources
remain unchanged. Production teams/models were not exercised.

Budget counters cover attributable task Session settlements, not a hard prepaid cap
on in-flight requests or separately metered compaction/memory-review helpers.
