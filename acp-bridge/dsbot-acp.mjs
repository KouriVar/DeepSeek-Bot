#!/usr/bin/env node
// ACP (Agent Client Protocol) over stdio, bridging one codync Bot to one DS Bot.
//
// codync drives its Bots through ACP: newline-delimited JSON-RPC on stdin/stdout
// (host/src/agent/acp.rs). This script answers that protocol, relays each prompt to a
// DS Bot running inside a DeepSeek Harness (the `ds-bot` plugin), and turns the Bot's
// streamed reply back into `session/update` notifications.
//
// Written for Node 22+ (built-in fetch). No dependencies.
//
//   node dsbot-acp.mjs --bot <bot id or name>
//
// Environment:
//   DSBOT_URL             HTTP root of the dsh instance that runs the Bot (required)
//   DSBOT_LOGIN_FILE      file (mode 600) with the one-time login URL, or a cookie
//                         line already extracted from it (required)
//   DSBOT_DEBUG           1 to log the relay's own decisions on stderr
//   DSBOT_TURN_TIMEOUT_MS give up on a turn after this long (default 600000)
//   DSBOT_POLL_MS         how often to ask the team for work state (default 1000)
//
// stdout carries ACP JSON-RPC only; everything human-readable goes to stderr.

import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DEFAULT_TURN_TIMEOUT_MS = 10 * 60 * 1000
const DEFAULT_POLL_MS = 1000
const PROTOCOL_VERSION = 1

// ---------------------------------------------------------------- configuration

export function readConfig(argv = process.argv.slice(2), env = process.env) {
  let botArg
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--bot') botArg = argv[i + 1]
    else if (arg.startsWith('--bot=')) botArg = arg.slice('--bot='.length)
  }
  const url = env.DSBOT_URL?.trim()
  return {
    botArg: botArg?.trim() || env.DSBOT_BOT?.trim(),
    url: url ? url.replace(/\/+$/, '') : undefined,
    loginFile: env.DSBOT_LOGIN_FILE?.trim(),
    debug: env.DSBOT_DEBUG === '1',
    turnTimeoutMs: Number(env.DSBOT_TURN_TIMEOUT_MS) || DEFAULT_TURN_TIMEOUT_MS,
    pollMs: Number(env.DSBOT_POLL_MS) || DEFAULT_POLL_MS,
  }
}

// The login file holds a credential. Refuse to run when anyone but its owner can read
// it: it may be written by hand or by a wrapper script, so check it on every start.
export function assertLoginFile(path) {
  let stat
  try {
    stat = statSync(path)
  } catch {
    throw new Error(`DSBOT_LOGIN_FILE does not exist: ${path}`)
  }
  if (!stat.isFile()) throw new Error(`DSBOT_LOGIN_FILE is not a file: ${path}`)
  const mode = stat.mode & 0o777
  if ((mode & 0o400) === 0 || (mode & 0o077) !== 0) {
    throw new Error(`DSBOT_LOGIN_FILE must be readable by its owner only (chmod 600): ${path} has mode ${mode.toString(8)}`)
  }
  return stat
}

// The file holds either the one-time login URL dsh prints at startup, or a cookie line
// already extracted from it (useful when the URL is no longer available).
export async function readCookie(loginFile, { debug = false } = {}) {
  assertLoginFile(loginFile)
  const body = readFileSync(loginFile, 'utf8').trim()
  if (body === '') throw new Error('DSBOT_LOGIN_FILE is empty')
  if (!/^https?:\/\//i.test(body)) {
    if (debug) log('using the cookie line from DSBOT_LOGIN_FILE')
    return body.split('\n')[0].trim()
  }
  // One GET with redirect: 'manual' sets the session cookie. The URL is never logged.
  const response = await fetch(body, { redirect: 'manual' })
  const cookies = (response.headers.getSetCookie?.() ?? []).map(cookie => cookie.split(';')[0].trim()).filter(Boolean)
  if (cookies.length === 0) throw new Error(`the login URL set no cookie (HTTP ${response.status})`)
  if (debug) log(`login accepted (HTTP ${response.status}, ${cookies.length} cookie)`)
  return cookies.join('; ')
}

// ---------------------------------------------------------------- DS Bot client

export function makeClient({ url, cookie, reauthenticate, debug = false, pollMs = DEFAULT_POLL_MS }) {
  let cookieValue = cookie

  // A dsh restart mints a new launch token, so the cookie can go stale while the bridge
  // (and the codync Bot it belongs to) keeps running. One re-read of the login file
  // recovers the turn instead of failing it.
  const refresh = async () => {
    if (typeof reauthenticate !== 'function') return false
    cookieValue = await reauthenticate()
    if (debug) log('cookie refreshed from DSBOT_LOGIN_FILE')
    return true
  }

  const post = async (endpoint, payload, signal) => {
    try {
      return await fetch(`${url}/api/bot`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: cookieValue },
        body: JSON.stringify({ endpoint, payload }),
        signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new Error(`DS Bot 没在运行（测试环境）：连不上 ${url}（${error.message}）`)
    }
  }

  const call = async (endpoint, payload = {}, signal) => {
    let response = await post(endpoint, payload, signal)
    if (response.status === 401 && (await refresh().catch(() => false))) {
      response = await post(endpoint, payload, signal)
    }
    if (response.status === 401) throw new Error(`DS Bot 拒绝了这个 cookie（HTTP 401），请重新取一次登录地址：${url}`)
    if (!response.ok) throw new Error(`DS Bot 返回 HTTP ${response.status}（${url}）`)
    const body = await response.json()
    if (!body?.ok) {
      const code = body?.error?.code ?? 'unknown'
      const message = body?.error?.message ?? JSON.stringify(body?.error ?? body)
      const error = new Error(`${code}：${message}`)
      error.dsBot = true
      error.code = code
      throw error
    }
    return body.value
  }

  // One long-lived SSE stream, parsed here so the bridge stays dependency-free.
  const listeners = new Set()
  let closed = false
  let running

  const startFeed = () => {
    if (closed || running) return
    running = (async () => {
      try {
        const response = await fetch(`${url}/api/bot/feed`, {
          headers: { accept: 'text/event-stream', cookie: cookieValue },
        })
        if (response.status === 401) {
          await refresh().catch(() => false)
          throw new Error('feed HTTP 401')
        }
        if (!response.ok || !response.body) throw new Error(`feed HTTP ${response.status}`)
        const decoder = new TextDecoder()
        let buffer = ''
        for await (const chunk of response.body) {
          buffer += decoder.decode(chunk, { stream: true })
          let cut
          while ((cut = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, cut)
            buffer = buffer.slice(cut + 2)
            let event = 'message'
            const data = []
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) event = line.slice(6).trim()
              else if (line.startsWith('data:')) data.push(line.slice(5).trim())
            }
            if (data.length === 0) continue
            let payload
            try {
              payload = JSON.parse(data.join('\n'))
            } catch {
              continue
            }
            for (const listener of listeners) {
              try {
                listener(event, payload)
              } catch (error) {
                if (debug) log(`feed listener failed: ${error.message}`)
              }
            }
          }
        }
      } catch (error) {
        if (!closed && debug) log(`feed closed (${error.message}); reconnecting`)
      } finally {
        running = undefined
        if (!closed) setTimeout(startFeed, 1000).unref?.()
      }
    })()
  }

  const subscribe = listener => {
    listeners.add(listener)
    startFeed()
    return () => listeners.delete(listener)
  }

  const close = () => {
    closed = true
    listeners.clear()
  }

  return { call, subscribe, close, pollMs }
}

// ---------------------------------------------------------------- prompt hygiene

// codync wraps a prompt when the agent does not take its system prompt at session/new
// (host/src/agent/bot/turn.rs compose()). The bridge declares that capability, but the
// wrappers still have to come off: a Bot must not see another product's framing.
export function stripCodyncWrappers(input) {
  let text = input
  for (let round = 0; round < 4; round += 1) {
    const before = text
    text = text
      .replace(/^\s*<memory_update>[\s\S]*?<\/memory_update>\s*/, '')
      .replace(/^\s*<bot-profile>[\s\S]*?<\/bot-profile>\s*/, '')
      // codync appends this one after the reply it belongs to.
      .replace(/\s*<agent_profile_update>[\s\S]*?<\/agent_profile_update>\s*/g, '\n')
      .replace(/(^|\n)\s*\[Codync:[^\n]*\](?=\s*\n|$)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    if (text === before) break
  }
  return text
}

function promptText(params) {
  const blocks = Array.isArray(params?.prompt) ? params.prompt : []
  return blocks
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
}

// ---------------------------------------------------------------- relay

function log(message) {
  process.stderr.write(`dsbot-acp: ${message}\n`)
}

class Relay {
  constructor({ client, botId, botName, debug, pollMs, turnTimeoutMs }) {
    this.client = client
    this.botId = botId
    this.botName = botName
    this.debug = debug
    this.pollMs = pollMs
    this.turnTimeoutMs = turnTimeoutMs
    this.sessionId = `dsbot-${botId}`
    this.turn = undefined
    this.cancelled = false
  }

  // A turn ends when the Bot is no longer working and nothing is being written. The
  // feed has no "turn over" event, so quiet is judged from `work.bots` plus the stream.
  beginTurn(sendUpdate) {
    let settle
    const done = new Promise(resolve => {
      settle = resolve
    })
    const turn = {
      sendUpdate,
      resolve: settle,
      streams: new Set(),
      sawWork: false,
      sawReply: false,
      lastEventAt: Date.now(),
      startedAt: Date.now(),
      idlePolls: 0,
      ended: false,
      unsubscribe: undefined,
      timer: undefined,
      poller: undefined,
    }
    this.turn = turn
    turn.unsubscribe = this.client.subscribe((event, payload) => this.onEvent(turn, event, payload))
    turn.poller = setInterval(() => this.poll(turn), this.pollMs)
    turn.timer = setTimeout(() => {
      if (turn.ended) return
      turn.sendUpdate(`这轮超过 ${Math.round(this.turnTimeoutMs / 60000)} 分钟没有结束，先停在这里。DS Bot 那边可能还在跑。`)
      this.endTurn(turn, 'end_turn')
    }, this.turnTimeoutMs)
    turn.timer.unref?.()
    return { turn, done }
  }

  onEvent(turn, event, payload) {
    if (turn.ended) return
    if (payload?.botId !== this.botId) return
    turn.lastEventAt = Date.now()
    if (event === 'stream') {
      if (payload.phase === 'start') {
        turn.streams.add(payload.attemptId)
        return
      }
      if (payload.phase === 'end') {
        turn.streams.delete(payload.attemptId)
        turn.idlePolls = 0
        return
      }
      if (typeof payload.text === 'string' && payload.text !== '') {
        turn.sawReply = true
        turn.idlePolls = 0
        turn.sendUpdate(payload.text)
      }
      return
    }
    if (event === 'message') {
      const item = payload.item
      if (item?.kind === 'bot' && typeof item.text === 'string' && item.text !== '') {
        turn.lastMessage = item.text
        turn.sawReply = true
      }
      return
    }
    if (event === 'live' || event === 'revision') turn.idlePolls = 0
  }

  poll(turn) {
    if (turn.ended) return
    this.client
      .call('state', {})
      .then(state => {
        if (turn.ended) return
        const work = state?.work?.bots?.[this.botId]
        if (work !== undefined) {
          turn.sawWork = true
          turn.idlePolls = 0
          if (work.tool !== undefined) {
            // Tools are Phase 2: note them for the operator, do not turn them into events.
            log(`[${this.botName}] 正在用工具：${work.tool}${work.target ? ` → ${work.target}` : ''}`)
          }
          return
        }
        if (turn.streams.size > 0) return
        if (!turn.sawWork && !turn.sawReply) return
        // Nothing is running and nothing is streaming: one more poll covers text still
        // in flight, then the turn is over.
        if (Date.now() - turn.lastEventAt < this.pollMs + 200) return
        turn.idlePolls += 1
        if (turn.idlePolls < 2) return
        this.finish(turn)
      })
      .catch(error => {
        if (turn.ended) return
        log(`取 state 失败：${error.message}`)
        this.endTurn(turn, 'end_turn')
      })
  }

  // Prefer the streamed text. A Bot that answered without streaming (a queued reply, a
  // cached part) still leaves its message in the feed, so fall back to that.
  finish(turn) {
    if (!turn.sawReply && turn.lastMessage) turn.sendUpdate(turn.lastMessage)
    this.endTurn(turn, 'end_turn')
  }

  endTurn(turn, reason) {
    if (turn.ended) return
    turn.ended = true
    clearInterval(turn.poller)
    clearTimeout(turn.timer)
    turn.unsubscribe?.()
    if (this.turn === turn) this.turn = undefined
    turn.resolve(reason)
  }

  async prompt(text) {
    const { turn, done } = this.beginTurn(chunk => this.emitChunk(chunk))
    this.cancelled = false
    if (text === '') {
      turn.sendUpdate('（这条消息里没有文字，DS Bot 只接收纯文字。）')
      this.endTurn(turn, 'end_turn')
      return done
    }
    try {
      // The Bot id is the target: DS Bot's `send` takes the Bot (or a group) as sessionId.
      await this.client.call('send', { sessionId: this.botId, text })
      if (this.debug) log(`[${this.botName}] 已投递 ${text.length} 字`)
    } catch (error) {
      turn.sendUpdate(error.message)
      this.endTurn(turn, 'end_turn')
      return done
    }
    const stop = await done
    return stop
  }

  cancel() {
    this.cancelled = true
    const turn = this.turn
    if (turn === undefined) return
    turn.sendUpdate('（已请求停止。DS Bot 没有“停掉某个 Bot 当前回合”的公开接口，这一轮会在它自己结束时停下。）')
    this.endTurn(turn, 'cancelled')
  }

  emitChunk(text) {
    this.write({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: this.sessionId,
        update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } },
      },
    })
  }

  write(message) {
    process.stdout.write(`${JSON.stringify(message)}\n`)
  }
}

// ---------------------------------------------------------------- JSON-RPC loop

function reply(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`)
}

function replyError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`)
}

async function findBot(client, wanted) {
  const state = await client.call('state', {})
  const bots = state?.bots ?? []
  const byId = bots.find(bot => bot.id === wanted)
  if (byId) return byId
  const byName = bots.find(bot => bot.name === wanted)
  if (byName) return byName
  // A Bot's own chat moves on to a fresh part; an older part id still means that Bot.
  const byPart = bots.find(bot => bot.sessionId === wanted || (bot.parts ?? []).includes(wanted))
  if (byPart) return byPart
  const known = bots.map(bot => `${bot.name} (${bot.id})`).join(', ')
  throw new Error(`找不到 DS Bot：${wanted}。这个团队里有：${known || '（空）'}`)
}

async function main() {
  const config = readConfig()
  if (!config.url) throw new Error('DSBOT_URL is not set')
  if (!config.loginFile) throw new Error('DSBOT_LOGIN_FILE is not set')
  if (!config.botArg) throw new Error('--bot <bot id or name> is required')

  const cookie = await readCookie(config.loginFile, { debug: config.debug })
  const client = makeClient({
    url: config.url,
    cookie,
    reauthenticate: () => readCookie(config.loginFile, { debug: config.debug }),
    debug: config.debug,
    pollMs: config.pollMs,
  })
  const bot = await findBot(client, config.botArg)
  const relay = new Relay({
    client,
    botId: bot.id,
    botName: bot.name,
    debug: config.debug,
    pollMs: config.pollMs,
    turnTimeoutMs: config.turnTimeoutMs,
  })
  log(`已连接 ${config.url}，目标 Bot：${bot.name} (${bot.id})`)
  client.subscribe(() => {})

  let buffer = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', chunk => {
    buffer += chunk
    let cut
    while ((cut = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, cut).trim()
      buffer = buffer.slice(cut + 1)
      if (line !== '') void handle(line)
    }
  })
  process.stdin.on('end', () => {
    client.close()
    process.exit(0)
  })

  async function handle(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      replyError(null, -32700, 'parse error')
      return
    }
    const { id, method, params } = message
    const isRequest = id !== undefined && id !== null
    try {
      switch (method) {
        case 'initialize':
          if (isRequest) {
            reply(id, {
              protocolVersion: PROTOCOL_VERSION,
              // systemPrompt: codync puts the Bot's identity and memory into `session/new`
              // instead of prefixing the first message, so a prompt stays clean.
              agentCapabilities: { loadSession: true, sessionCapabilities: { systemPrompt: {} } },
              authMethods: [],
            })
          }
          return
        case 'authenticate':
          if (isRequest) reply(id, {})
          return
        case 'session/new':
          // The DS Bot keeps its own identity, tools and memory: mcpServers and the
          // systemPrompt codync offers are deliberately ignored.
          if (isRequest) reply(id, { sessionId: relay.sessionId })
          return
        case 'session/load':
          if (isRequest) reply(id, { sessionId: relay.sessionId })
          return
        case 'session/prompt': {
          const text = stripCodyncWrappers(promptText(params))
          const stopReason = await relay.prompt(text)
          if (isRequest) reply(id, { stopReason })
          return
        }
        case 'session/cancel':
          relay.cancel()
          if (isRequest) reply(id, {})
          return
        default:
          if (isRequest) replyError(id, -32601, `unknown method: ${method}`)
      }
    } catch (error) {
      log(`处理 ${method} 失败：${error.message}`)
      if (isRequest) replyError(id, -32603, error.message)
    }
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]

if (invokedDirectly) {
  main().catch(error => {
    log(error.message)
    process.exit(1)
  })
}
