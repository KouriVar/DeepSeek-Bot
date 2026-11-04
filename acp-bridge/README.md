# ACP 桥：把 codync 的一个 Bot 接到一个 DS Bot

codync 通过 ACP（stdio 上每行一个 JSON-RPC）驱动每个 Bot 的 agent。这个目录给 codync 一个
最小的 ACP agent，它把一个 codync Bot 的每一轮文字消息转给 DS Bot 团队里的某一个 Bot，再把
那个 Bot 的回答转回 `session/update`。

只做**纯文字**：工具调用、停止按钮、共享记忆、iOS 的三模式界面都不在这里。

## 文件

| 文件 | 作用 |
|---|---|
| `dsbot-acp.mjs` | 桥本体，无第三方依赖（用 Node 内置 `fetch`） |
| `selftest.mjs` | 对一个一次性的 dsh + mock 模型跑一遍 initialize → session/new → session/prompt |
| `run-bridge.sh` | codync 用的启动壳：从仓库外的 600 文件读环境变量，然后 `exec node` |

## 前置：一个一次性的测试环境

**不要**指向真实的 `~/.dsh`、也不要指向 DSH Desktop 正在用的团队。桥和 dsh 用同一个
`DSH_HOME` 时才能看到同一个团队；测试用一个全新的 home。

```sh
# 1) 一个只装 ds-bot 的 web profile。Bundles 与 dev/bench.sh 一致；ds-bot 用 link: 指到本仓库。
H=$HOME/.dsh-bridge-test
mkdir -p "$H/profiles/web/node_modules"
cat > "$H/profiles/web/package.json" <<EOF
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": { "ds-bot": "link:$PWD/ds-bot" },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "ds-bot"] } }
}
EOF
ln -sfn "$PWD/ds-bot" "$H/profiles/web/node_modules/ds-bot"
# ds-bot 自己的依赖（deep-view 等）从仓库里的 ds-bot/node_modules 解析，不需要再装。

# 2) mock 模型（不需要任何 key）
(cd ds-bot && MOCK_PORT=8797 MOCK_LOG="$H/mock.jsonl" node dev/mock-llm.mjs "$H") &

# 3) 拉起测试 dsh。清掉从当前 shell 继承的 DSH_*（尤其 DSH_SESSION_ID / DSH_WEB_URL），
#    否则测试实例会带上你正在用的那个会话的运行时上下文。
env -u DSH_PROFILE -u DSH_PROFILE_DIR -u DSH_SESSION_ID -u DSH_SHELL -u DSH_WEB_URL -u DSH_HOME \
  DSH_HOME="$H" \
  DEEPSEEK_BASE_URL="http://127.0.0.1:8797/v1" DEEPSEEK_API_KEY=mock-key \
  dsh --profile web --no-open --port 3097 > "$H/web.log" 2>&1 &
```

`web.log` 里第一行就是带一次性 token 的登录地址。把它抽出来放进一个**只有本人可读**的文件，
桥只从这个文件取凭证，不认命令行参数、也不打印它：

```sh
umask 077
grep -oE 'http://127\.0\.0\.1:3097/\?token=[^[:space:]]+' "$H/web.log" > "$H/login-url.txt"
chmod 600 "$H/login-url.txt"
```

## 运行

```sh
DSBOT_URL=http://127.0.0.1:3097 \
DSBOT_LOGIN_FILE=$HOME/.dsh-bridge-test/login-url.txt \
node acp-bridge/dsbot-acp.mjs --bot "<Bot 的 id 或名字>"
```

自测（自己找一个 Bot，跑两轮 + 一次未知方法）：

```sh
DSBOT_URL=http://127.0.0.1:3097 \
DSBOT_LOGIN_FILE=$HOME/.dsh-bridge-test/login-url.txt \
node acp-bridge/selftest.mjs            # 想指定 Bot 就加 --bot "<id 或名字>"
```

## 环境变量

| 变量 | 必需 | 说明 |
|---|---|---|
| `DSBOT_URL` | 是 | 跑着 DS Bot 的 dsh 的 HTTP 根，例如 `http://127.0.0.1:9097` |
| `DSBOT_LOGIN_FILE` | 是 | 600 的文件。内容是**登录地址**（桥自己 GET 一次拿 cookie），或**已经抽好的 cookie 行** |
| `DSBOT_DEBUG` | 否 | `1` 时把桥自己的判断打到 stderr（含 Bot 正在用的工具名） |
| `DSBOT_TURN_TIMEOUT_MS` | 否 | 一轮的上限，默认 600000（10 分钟） |
| `DSBOT_POLL_MS` | 否 | 多久问一次 `state`，默认 1000 |
| `DSBOT_BOT` | 否 | 不给 `--bot` 时的替代 |

stdout **只**走 ACP JSON-RPC；人看的日志全在 stderr。

## 在 codync 里挂上（手动步骤）

codync 的 `BotConfig.command` 非空时会被直接当成 ACP 进程启动（`host/src/agent/bot/launch.rs`），
且此时 `backend` 不必是已知 harness（`host/src/hub/validate.rs`）。codync 是通过登录 shell
执行这串命令的，所以可以用启动壳：

```sh
# 1) 仓库外的 600 文件，别提交
umask 077; printf 'DSBOT_URL=http://127.0.0.1:9097\nDSBOT_LOGIN_FILE=%s/.dsbot-bridge/login-url.txt\n' "$HOME" > "$HOME/.dsbot-bridge.env"
chmod 600 "$HOME/.dsbot-bridge.env"

# 2) 建一个测试 Bot，command 指向启动壳（用 loopback API，不改现有 Bot）
TOKEN=$(cat ~/.codync/token)
curl -sS -X POST "http://127.0.0.1:19222/api/createBot" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"DS Bot 桥测","command":"'"$PWD"'/acp-bridge/run-bridge.sh --bot <Bot 名字>","cwd":"'"$PWD"'"}'
```

## 设计取舍

**回合结束判定。** DS Bot 的 feed 没有“这一轮结束”事件，只有 `stream` 的 start/text/end、
`live` 和 `message`。桥的做法是：每 `DSBOT_POLL_MS` 取一次 `state`，当 `work.bots[<botId>]`
为空、没有正在进行中的 stream、且已经看到过回答（或有文字在流），再空转两次轮询才认为这一轮
结束，回 `end_turn`。多等这一下是为了接住还在路上的最后一段文字。10 分钟没有任何事件就
`end_turn` 并附一句说明，不挂死。

**回答来源。** 优先用 `stream` 的逐段文字（`agent_message_chunk`）；如果一个 Bot 没有流式输出
（排队回答、读缓存），结束时用 feed 里最后一条 `message`（`item.kind === 'bot'`）补上，避免
出现“有回合结束但没有文字”。

**剥离 codync 的包装。** codync 在 agent 不声明 `sessionCapabilities.systemPrompt` 时会往
prompt 里塞 `<memory_update>`、`<bot-profile>`、末尾的 `<agent_profile_update>` 和
`[Codync: …]` 提示行（`host/src/agent/bot/turn.rs` 的 `compose()`）。桥声明了这个能力，
所以正常情况下不会出现；但仍然无条件剥一遍，免得把别的产品的框套话带给 Bot。

**忽略 `mcpServers` 与 systemPrompt。** DS Bot 用它自己的人设、工具和记忆；codync 传来的
这两样都会让身份重复。

**凭证只从文件来。** `DSBOT_LOGIN_FILE` 每次启动都检查权限，非“仅本人可读”直接拒绝启动
（并把实际 mode 写进 stderr）。文件可以是登录地址，也可以是已经抽好的 cookie 行——
后者在登录地址已经拿不到时有用。

**不收 DS Bot 的工具事件。** `work.bots[<botId>].tool` 出现时只写 stderr，不转成 `tool_call`，
留到 Phase 2。

## 已知限制

- 只处理文字。图片、文件、卡片、`session/request_permission` 都不管；未知方法回 `-32601`。
- `session/cancel` 只让**本地**这一轮以 `cancelled` 结束，不会真的停掉 DS Bot 那边的回合：
  DS Bot 没有“停掉某个 Bot 当前回合”的公开接口（`browser-stop` 会顺带接管浏览器，不能用）。
- Bot 的 id 与 codync 的 sessionId 是固定映射，`session/load` 不重放历史。
- DSH 会给 Bot 的**第一条**用户消息后面接一段运行时上下文（工作目录等），这是 dsh 自己的行为，
  桥不剥它。
- 桥依赖 dsh 的 `POST /api/bot` 与 `GET /api/bot/feed`。dsh 重启后登录地址会换，桥会以
  “DS Bot 拒绝了这个 cookie（HTTP 401）”结束这一轮，需要更新 `DSBOT_LOGIN_FILE` 并重启 Bot 进程。
- DS Bot 团队同一 `DSH_HOME` 只有一个 dsh 是写入者（`bot/state.lock`）。桥只是个 HTTP 客户端，
  自己不是写入者，所以连只读的那一个也能收发，但下指令会被拒（`bot/read-only`）。

## 接真实团队（本轮**没有**执行）

真实团队的 dsh 是 DSH Desktop 里的 host 子进程，登录地址**不落盘**（`authenticatedUrl` 经 IPC
直接交给 Electron）。要接真团队，先决定凭证怎么拿，三种：

1. 让 dsh 在启动时把登录地址写进一个 600 的文件（改 dsh 或加启动参数）；
2. 从 Electron 的 cookie 库取（需要 Keychain 授权）；
3. 让 dsh 以独立 profile 常驻（`alwayson` 之类），它自己的 stdout 里有登录地址。

选定之后：把地址写进 `DSBOT_LOGIN_FILE`，`DSBOT_URL` 指向那个 dsh，`--bot` 指向真实团队里的
某个 Bot，再照上面的“在 codync 里挂上”建 Bot。
