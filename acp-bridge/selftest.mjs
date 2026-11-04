#!/usr/bin/env node
// Self-test for the ACP bridge against a throwaway dsh + mock model.
//
// It checks the parts that can break silently — the login file guard and the codync
// wrapper stripping — then speaks ACP to acp-bridge/dsbot-acp.mjs over stdio exactly like
// codync does: initialize → session/new → session/prompt, and prints every
// `session/update` plus the final stopReason.
//
//   DSH_HOME=~/.dsh-bridge-test DEEPSEEK_BASE_URL=http://127.0.0.1:8797/v1 ...
//   DSBOT_URL=http://127.0.0.1:3097 \
//   DSBOT_LOGIN_FILE=~/.dsh-bridge-test/login-url.txt \
//   node acp-bridge/selftest.mjs [--bot <id or name>] [--text <prompt>]
//
// Exits non-zero when the round did not come back with at least one text chunk and a
// stopReason of end_turn.

import { spawn } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertLoginFile, makeClient, readCookie, readConfig, stripCodyncWrappers } from './dsbot-acp.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const BRIDGE = join(HERE, 'dsbot-acp.mjs')
const TIMEOUT_MS = 120_000

const args = process.argv.slice(2)
const flag = name => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}
const wanted = flag('--bot')
const promptText = flag('--text') ?? '你好，这是一次桥接自测。'

const failures = []
const ok = (what, detail = '') => console.log(`  ✅ ${what}${detail ? ` — ${detail}` : ''}`)
const bad = (what, detail = '') => {
  failures.push(what)
  console.log(`  ❌ ${what}${detail ? ` — ${detail}` : ''}`)
}

// ---------------------------------------------------------------- static checks

console.log('\n[1/3] 本地检查')
try {
  assertLoginFile(process.env.DSBOT_LOGIN_FILE)
  ok('DSBOT_LOGIN_FILE 权限是仅本人可读')
} catch (error) {
  bad('DSBOT_LOGIN_FILE 权限检查', error.message)
}

const dirty = mkdtempSync(join(tmpdir(), 'dsbot-acp-selftest-'))
try {
  const loose = join(dirty, 'loose.txt')
  writeFileSync(loose, 'http://127.0.0.1:1/?token=not-a-real-token\n')
  // The caller's umask may already drop the group and other bits.
  chmodSync(loose, 0o644)
  try {
    assertLoginFile(loose)
    bad('权限检查应当拒绝 644 的文件', '它接受了')
  } catch (error) {
    if (/chmod 600/.test(error.message)) ok('权限检查拒绝 644 的文件')
    else bad('权限检查拒绝 644 的文件', error.message)
  }
} finally {
  rmSync(dirty, { recursive: true, force: true })
}

const wrapped = [
  '<memory_update>',
  'Your memory changed. This is all of it now.',
  '</memory_update>',
  '',
  '<bot-profile>',
  'You are a bot named Coe. Memory: …',
  '</bot-profile>',
  '',
  '帮我看一下今天的邮件。',
  '',
  '[Codync: send_file(path, name?) shares any regular file up to 100 MiB as a downloadable card. Use it instead of sending a local path.]',
  '[Codync: for a report, plan, tracker or dashboard the user will come back to, write one self-contained HTML file and publish_artifact(path, title) instead of a long message.]',
].join('\n')
const stripped = stripCodyncWrappers(wrapped)
if (stripped === '帮我看一下今天的邮件。') ok('剥离 codync 包装（memory_update / bot-profile / [Codync: …]）')
else bad('剥离 codync 包装', `得到的是 ${JSON.stringify(stripped)}`)

const withProfileUpdate = stripCodyncWrappers(
  '问题在这里。\n\n<agent_profile_update>\nidentity changed\n</agent_profile_update>\n',
)
if (withProfileUpdate === '问题在这里。') ok('剥离后置的 agent_profile_update')
else bad('剥离 agent_profile_update', JSON.stringify(withProfileUpdate))

// ---------------------------------------------------------------- ACP client

class AcpClient {
  constructor(child) {
    this.child = child
    this.nextId = 1
    this.pending = new Map()
    this.updates = []
    let buffer = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', chunk => {
      buffer += chunk
      let cut
      while ((cut = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, cut).trim()
        buffer = buffer.slice(cut + 1)
        if (line === '') continue
        let message
        try {
          message = JSON.parse(line)
        } catch {
          console.log(`  （桥的 stdout 出现非 JSON 行：${line.slice(0, 80)}）`)
          continue
        }
        if (message.id !== undefined && this.pending.has(message.id)) {
          const { resolve, reject } = this.pending.get(message.id)
          this.pending.delete(message.id)
          if (message.error) reject(new Error(`${message.error.code}: ${message.error.message}`))
          else resolve(message.result)
        } else if (message.method === 'session/update') {
          this.updates.push(message.params)
        }
      }
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', chunk => process.stderr.write(chunk))
  }

  request(method, params) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method} 超时（${TIMEOUT_MS}ms）`))
      }, TIMEOUT_MS)
      this.pending.set(id, {
        resolve: value => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: error => {
          clearTimeout(timer)
          reject(error)
        },
      })
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    })
  }

  notify(method, params) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`)
  }

  text() {
    return this.updates
      .filter(update => update?.update?.sessionUpdate === 'agent_message_chunk')
      .map(update => update.update.content?.text ?? '')
      .join('')
  }
}

// ---------------------------------------------------------------- the round

console.log('\n[2/3] 目标 Bot')
const config = readConfig()
if (!config.url) {
  console.error('DSBOT_URL 未设置')
  process.exit(2)
}
if (!config.loginFile) {
  console.error('DSBOT_LOGIN_FILE 未设置')
  process.exit(2)
}
const cookie = await readCookie(config.loginFile)
const client = makeClient({ url: config.url, cookie })
const state = await client.call('state', {})
const bots = state?.bots ?? []
if (bots.length === 0) {
  console.error('测试团队里没有 Bot')
  process.exit(1)
}
const bot = wanted ? bots.find(b => b.id === wanted || b.name === wanted) : bots[0]
if (!bot) {
  console.error(`找不到 Bot：${wanted}；现有：${bots.map(b => b.name).join(', ')}`)
  process.exit(1)
}
ok(`用 Bot「${bot.name}」`, bot.id)

console.log('\n[3/3] ACP 一轮')
const child = spawn(process.execPath, [BRIDGE, '--bot', bot.id], {
  env: { ...process.env, DSBOT_DEBUG: process.env.DSBOT_DEBUG ?? '1' },
  stdio: ['pipe', 'pipe', 'pipe'],
})
const acp = new AcpClient(child)
let exitCode = 0
try {
  const init = await acp.request('initialize', {
    protocolVersion: 1,
    clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
    clientInfo: { name: 'codync', title: 'Codync', version: 'selftest' },
  })
  if (init?.protocolVersion === 1) ok('initialize 回 protocolVersion=1')
  else bad('initialize 的 protocolVersion', JSON.stringify(init?.protocolVersion))
  if (init?.agentCapabilities?.loadSession === true) ok('agentCapabilities.loadSession=true')
  else bad('agentCapabilities.loadSession')
  if (init?.agentCapabilities?.sessionCapabilities?.systemPrompt) ok('声明了 sessionCapabilities.systemPrompt')
  else bad('sessionCapabilities.systemPrompt')
  if (Array.isArray(init?.authMethods)) ok('authMethods 是数组')
  else bad('authMethods')

  const session = await acp.request('session/new', { cwd: process.cwd(), mcpServers: [] })
  if (typeof session?.sessionId === 'string' && session.sessionId !== '') ok('session/new 回了 sessionId', session.sessionId)
  else bad('session/new 的 sessionId', JSON.stringify(session))

  const started = Date.now()
  const result = await acp.request('session/prompt', {
    sessionId: session.sessionId,
    prompt: [{ type: 'text', text: promptText }],
  })
  const elapsed = Date.now() - started
  const reply = acp.text()
  if (reply.trim() !== '') ok('收到 agent_message_chunk', `${reply.length} 字：${JSON.stringify(reply.slice(0, 120))}`)
  else bad('收到 agent_message_chunk', '没有任何文字')
  if (result?.stopReason === 'end_turn') ok('stopReason=end_turn', `${(elapsed / 1000).toFixed(1)}s`)
  else bad('stopReason', JSON.stringify(result?.stopReason))

  // A second round proves the feed is still live and the session is reused.
  acp.updates.length = 0
  const second = await acp.request('session/prompt', {
    sessionId: session.sessionId,
    prompt: [{ type: 'text', text: '第二句，确认还能继续。' }],
  })
  if (acp.text().trim() !== '' && second?.stopReason === 'end_turn') ok('第二轮也通了')
  else bad('第二轮', `text=${JSON.stringify(acp.text().slice(0, 60))} stop=${JSON.stringify(second?.stopReason)}`)

  // An unknown method must be refused, not ignored.
  try {
    await acp.request('session/nonsense', {})
    bad('未知方法应当报错')
  } catch (error) {
    if (/-32601/.test(error.message)) ok('未知方法回 -32601')
    else bad('未知方法的错误码', error.message)
  }
} catch (error) {
  bad('ACP 往返失败', error.message)
} finally {
  child.stdin.end()
  child.kill('SIGTERM')
}

console.log('\n---- 结果 ----')
if (failures.length === 0) {
  console.log('自测通过：文字可以一来一回。')
} else {
  console.log(`自测失败 ${failures.length} 项：${failures.join('；')}`)
  exitCode = 1
}
process.exit(exitCode)
