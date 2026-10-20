// Execution facts only. Projects, tasks, dependencies and results belong to the
// shared task-board service, never to another Bot-side task store.
import { createHash } from 'node:crypto'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SOURCE_KIND } from './constants.js'
import { foldCalls } from './usage.js'

const fail = (code, message) => { throw Object.assign(new Error(message), { code }) }
const active = record => ['reserved', 'queued', 'running', 'switching', 'cancelling', 'unknown'].includes(record.phase)

export function install(rt) {
  const { ctx, state } = rt
  const listeners = new Set(), operations = new Map(), admissions = new Map(), live = new Map(), turns = new Map(), ended = new Map()
  let ready, stopped = false
  const records = () => (state.taskAdmissions ??= {})
  const publish = event => {
    if (stopped) return
    for (const listener of listeners) {
      try { Promise.resolve(listener(structuredClone(event))).catch(error => rt.warn('ds-bot: task observer failed: %s', error)) } catch (error) { rt.warn('ds-bot: task observer failed: %s', error) }
    }
  }
  const ensure = () => ready ??= (async () => {
    await rt.load()
    if (rt.readOnly() !== undefined) return
    let changed = false
    for (const record of Object.values(records())) if (active(record) && record.phase !== 'unknown') {
      record.phase = 'unknown'
      record.interrupted = true
      changed = true
    }
    if (changed) await rt.save()
  })()
  const note = (record, event, extra = {}) => {
    record.updatedAt = Date.now()
    const snapshot = structuredClone(record)
    void rt.save().then(() => publish({ type: event, execution: snapshot, ...extra }))
      .catch(error => rt.warn('ds-bot: task admission not saved: %s', error))
  }
  const owned = (executionId, sessionId) => {
    const record = rt.own(records(), executionId)
    const current = live.get(sessionId)
    return record && record.sessions.includes(sessionId) && current?.id === executionId
      && rt.live.get(sessionId)?.turn === current.turn && record.phase === 'running'
  }
  const listBots = async () => {
    await ensure()
    return Object.values(state.bots).map(bot => ({
      id: bot.id, name: bot.name, role: bot.role ?? '', sessionId: rt.chatOf(bot.id),
      main: rt.isMain(bot.id), waiting: Boolean(bot.kickoff),
      busy: Object.values(records()).some(record => record.botId === bot.id && active(record))
        || [rt.chatOf(bot.id), ...rt.groupSessionsOf(bot.id)].some(id => rt.live.get(id)?.turn !== undefined),
    }))
  }
  const start = async input => {
    await ensure()
    if (rt.readOnly() !== undefined) fail('read_only', rt.readOnly())
    if (typeof input.executionId !== 'string' || !/^[\w-]{1,100}$/.test(input.executionId) || ['__proto__', 'constructor', 'prototype'].includes(input.executionId)
      || typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 100000) fail('invalid', 'Invalid task admission')
    const digest = createHash('sha256').update(input.prompt).digest('hex')
    const previous = rt.own(records(), input.executionId)
    if (previous) {
      if (previous.botId !== input.botId || previous.digest !== digest) fail('conflict', 'Execution ID already names another admission')
      return structuredClone(previous)
    }
    const bot = rt.botOf(input.botId)
    if (!bot || bot.kickoff) fail('bot', 'Choose an available existing Bot and configure its model first')
    if ((await listBots()).find(item => item.id === bot.id)?.busy) fail('bot_busy', 'Bot has active work; wait for its availability event')
    const sessionId = rt.chatOf(bot.id)
    await rt.ensureCapabilities(sessionId)
    const agent = await rt.resolveAgent(sessionId)
    if (agent.status === 'running' || [...(agent.inbox?.nextStep ?? []), ...(agent.inbox?.nextTurn ?? [])].length) fail('bot_busy', 'Bot has queued or running work')
    // Cancellation can arrive while model/capability resolution is awaiting.
    const fenced = rt.own(records(), input.executionId)
    if (fenced) return structuredClone(fenced)
    const record = { id: input.executionId, botId: bot.id, sessionId, sessions: [sessionId], digest, phase: 'reserved', createdAt: Date.now(), usage: {} }
    records()[record.id] = record
    await rt.save()
    try {
      if (record.cancelRequested || record.phase === 'cancelled') return structuredClone(record)
      agent.followup(createUserMessage({ content: [{ type: 'text', text: input.prompt }], source: {
        kind: SOURCE_KIND, form: 'relay', role: 'task', exchangeId: record.id,
        taskExecutionId: record.id, senderName: 'Task Orchestrator',
      } }))
      await ctx.sessions.flush(agent.session)
      if (record.phase === 'reserved') record.phase = 'queued'
      await rt.save()
      return structuredClone(record)
    } catch (error) {
      record.phase = 'unknown'
      await rt.save()
      throw Object.assign(new Error('Task admission is uncertain; inspect before retrying'), { code: 'unknown', cause: error })
    }
  }
  const startTask = input => {
    const previous = operations.get(input.executionId)
    const signature = typeof input.prompt === 'string' ? createHash('sha256').update(input.prompt).digest('hex') : ''
    if (previous) {
      if (previous.botId !== input.botId || previous.signature !== signature) return Promise.reject(Object.assign(new Error('Concurrent execution ID names another admission'), { code: 'conflict' }))
      return previous.job
    }
    const before = admissions.get(input.botId) ?? Promise.resolve()
    const job = before.catch(() => {}).then(() => start(input)).finally(() => {
      operations.delete(input.executionId)
      if (admissions.get(input.botId) === job) admissions.delete(input.botId)
    })
    admissions.set(input.botId, job)
    operations.set(input.executionId, { job, botId: input.botId, signature })
    return job
  }
  const cancelTask = async executionId => {
    await ensure()
    if (typeof executionId !== 'string' || !/^[\w-]{1,100}$/.test(executionId) || ['__proto__', 'constructor', 'prototype'].includes(executionId)) fail('invalid', 'Invalid execution ID')
    let record = rt.own(records(), executionId)
    if (!record) {
      records()[executionId] = { id: executionId, phase: 'cancelled', sessions: [], cancelRequested: true, createdAt: Date.now(), usage: {} }
      await rt.save()
      return { cancelled: true, admitted: false }
    }
    record.cancelRequested = true
    await rt.save()
    for (const sessionId of record.sessions) {
      const agent = await rt.resolveAgent(sessionId).catch(() => undefined)
      if (!agent) { if (active(record)) fail('isolation', 'Cannot inspect the admitted Session safely'); continue }
      for (const message of [...(agent.inbox?.nextStep ?? []), ...(agent.inbox?.nextTurn ?? [])]) {
        if (message.source?.taskExecutionId === executionId) agent.inbox.remove(message.id)
      }
      if (owned(executionId, sessionId)) {
        let finish
        const done = new Promise(resolve => { finish = resolve })
        ended.set(executionId, finish)
        record.cancelRequested = true
        await rt.save()
        try {
          agent.cancel({ kind: 'hook', reason: 'task-orchestrator/cancelled' })
          if (agent.status === 'running') {
            let timer
            try {
              const settled = await Promise.race([done.then(() => true), new Promise(resolve => { timer = setTimeout(() => resolve(false), 10000) })])
              if (!settled) fail('isolation', 'Cancellation has not yet settled; retain the execution fence')
            } finally { clearTimeout(timer) }
          }
        } finally { ended.delete(executionId) }
      }
      else if ((agent.status === 'running' || [...(rt.switchJobs?.() ?? [])].some(job => job.botId === record.botId)) && active(record)) fail('isolation', 'Current turn cannot be proven to belong to this task')
      await ctx.sessions.flush(agent.session)
    }
    record.phase = 'cancelled'
    note(record, 'cancelled')
    return { cancelled: true, admitted: true }
  }
  const facade = Object.freeze({
    version: 1, capabilities: ['admission-idempotency', 'exact-cancel', 'session-lineage', 'settlement-usage'],
    listBots, startTask, cancelTask,
    async getExecution(id) { await ensure(); return structuredClone(rt.own(records(), id) ?? null) },
    actorOf(sessionId) { const botId = rt.selfOf(sessionId); return { kind: botId ? 'bot' : 'ai', id: sessionId, ...(botId ? { bot_id: botId, main: rt.isMain(botId) } : {}) } },
    ownsExecution: owned,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  })
  rt.taskBridge = facade
  rt.guardTaskDelegation = exec => {
    const source = rt.live.get(exec.agent?.id)?.info
    const binding = live.get(exec.agent?.id)
    if (source?.taskExecutionId || binding && rt.live.get(exec.agent?.id)?.turn === binding.turn) fail('task_scope', 'For orchestrated work, request assistance through taskboard_request_assistance so dependencies and budgets remain shared')
  }
  ctx.on('session/event', (session, event) => {
    const source = event.data?.source
    const previous = live.get(session.id)
    if (event.type === 'user/message' && previous && (!source?.kind || source.kind === 'user' || source.kind === SOURCE_KIND) && source?.taskExecutionId !== previous.id) {
      const record = rt.own(records(), previous.id)
      if (record?.phase === 'running') {
        record.phase = 'unknown'
        note(record, 'interrupted', { reason: 'foreign_input' })
      }
    }
    if (event.type === 'user/message' && source?.taskExecutionId) {
      const record = rt.own(records(), source.taskExecutionId)
      if (!record || record.botId !== rt.selfOf(session.id) || ['cancelled', 'settled', 'failed'].includes(record.phase)) return
      if (!record.sessions.includes(session.id)) record.sessions.push(session.id)
      record.sessionId = session.id
      record.phase = 'running'
      const binding = { id: record.id, turn: rt.live.get(session.id)?.turn ?? event.data.turn }
      record.turns ??= {}
      record.turns[session.id] = binding.turn
      live.set(session.id, binding)
      turns.set(`${session.id}:${binding.turn}`, binding)
      if (turns.size > 2000) turns.delete(turns.keys().next().value)
      note(record, 'started')
    }
    const current = event.data?.turn !== undefined ? turns.get(`${session.id}:${event.data.turn}`) ?? live.get(session.id) : live.get(session.id)
    const record = current && rt.own(records(), current.id)
    if (!record || event.data?.turn !== undefined && current.turn !== event.data.turn) return
    if (['request/header', 'request/context', 'llm/retry-started', 'assistant/message', 'assistant/attempt'].includes(event.type)) {
      record.usageState ??= {}
      const folded = foldCalls([event], record.usageState[session.id])
      record.usageState[session.id] = folded.state
      for (const row of folded.rows) {
        const key = `${session.id}:${row.key}`
        const tokens = row.input + row.cacheRead + row.cacheWrite + row.output
        const previous = record.usage[key] ?? 0
        if (tokens > previous) { record.usage[key] = tokens; note(record, 'usage', { tokens: tokens - previous, usageKey: key }) }
      }
    }
    if (event.type === 'turn/end' && record.phase === 'running') {
      ended.get(record.id)?.()
      live.delete(session.id)
      const switching = [...(rt.switchJobs?.() ?? [])].some(job => job.botId === record.botId)
      record.phase = record.cancelRequested ? 'cancelled' : switching ? 'switching' : event.data?.reason?.kind === 'completed' ? 'settled' : 'unknown'
      note(record, switching ? 'switching' : 'ended', { reason: event.data?.reason?.kind ?? 'unknown' })
    }
  })
  ctx.on('agent/status', ({ agent }) => { if (rt.selfOf(agent?.id)) publish({ type: 'availability' }) })
  ctx.on('agent/pre-step', ({ agent }, next) => {
    const source = rt.live.get(agent?.id)?.info
    const binding = live.get(agent?.id)
    const executionId = source?.taskExecutionId ?? (binding?.turn === rt.live.get(agent?.id)?.turn ? binding?.id : undefined)
    if (!executionId) return next()
    const record = rt.own(records(), executionId)
    const engine = ctx.get?.('taskOrchestrator')
    if (!record || record.cancelRequested || ['cancelled', 'unknown'].includes(record.phase) || engine?.canContinue?.(record.id) === false || !engine) return { kind: 'reject' }
    return next()
  }, { prepend: true })
  ctx.tools.guard(exec => {
    const binding = live.get(exec.agent?.id)
    if (!binding || binding.turn !== rt.live.get(exec.agent?.id)?.turn) return undefined
    if (['subagent', 'create_agent', 'spawn_agent', 'parallel'].includes(exec.name)) return 'Use taskboard_request_assistance for orchestrated delegation so task budgets, cancellation and dependencies stay shared.'
    return undefined
  })
  ctx.effect(() => ctx.provide?.('botTaskRuntime', facade), 'ds-bot: task runtime bridge')
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'bot-task-collaboration', order: 646, interpolate: false,
    text: context => {
      const botId = rt.selfOf(context?.agent?.id)
      if (!botId || ctx.get?.('taskOrchestrator')?.version !== 1) return ''
      return '## Shared task collaboration\nUse taskboard_list_teams to find teams you belong to. For a simple request use only the necessary Bot. For a complex team goal the leader can call taskboard_plan_tasks with a small DAG, matching existing member capabilities. Task data and dependencies belong to the shared task board. Use taskboard_request_assistance for help during an orchestrated task. Submit structured results with taskboard_complete_task; never treat ordinary reply text as a completion receipt or forge user acceptance. Do not enable automation or increase budgets yourself.'
    },
  }), 'ds-bot: task collaboration instructions')
  ctx.effect(() => () => { stopped = true; listeners.clear() }, 'ds-bot: task bridge lifecycle')
}
