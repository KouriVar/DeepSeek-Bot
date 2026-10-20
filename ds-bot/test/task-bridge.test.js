import test from 'node:test'
import assert from 'node:assert/strict'
import { install } from '../src/host/task-bridge.js'
import { fakeContext } from './fake-ctx.js'

const tick = () => new Promise(resolve=>setImmediate(resolve))
function fixture(t, admissions = {}) {
  const ctx=fakeContext({services:{taskOrchestrator:{version:1,canContinue:()=>true}}})
  const agents=new Map(),messages=[],events=[],warnings=[]
  const state={bots:{a:{id:'a',name:'A'},b:{id:'b',name:'B'}},taskAdmissions:admissions}
  let seq=0,saves=0,failSave=false
  const rt={ctx,state,live:new Map(),load:async()=>{},readOnly:()=>undefined,
    save:async()=>{saves++;if(failSave)throw new Error('disk failed')},warn:(...x)=>warnings.push(x),
    own:(v,k)=>Object.hasOwn(v,k)?v[k]:undefined,botOf:id=>state.bots[id],chatOf:id=>`s-${id}`,
    groupSessionsOf:()=>[],isMain:id=>id==='a',selfOf:id=>id.startsWith('s-')?id.slice(2):undefined,
    ensureCapabilities:async()=>{},switchJobs:()=>[],resolveAgent:async id=>{
      if(!agents.has(id)){
        const list=[]
        const agent={id,status:'idle',session:{id},inbox:{nextTurn:list,nextStep:[],remove:id=>{const at=list.findIndex(x=>x.id===id);if(at>=0)list.splice(at,1)}},
          followup(message){message.id??=`message-${++seq}`;list.push(message);messages.push({session:id,message,saves})},
          cancel(){agent.status='idle';emit(id,{type:'turn/end',data:{turn:rt.live.get(id)?.turn,reason:{kind:'hook'}}});rt.live.delete(id)},
        };agents.set(id,agent)
      }
      return agents.get(id)
    },
  }
  ctx.sessions={flush:async()=>{}}
  const emit=(id,event)=>{for(const fn of ctx.listeners.get('session/event')??[])fn({id},event)}
  install(rt);rt.taskBridge.subscribe(e=>events.push(e));t.after(()=>ctx.dispose())
  const start=async(bot='a',id='exec-1')=>rt.taskBridge.startTask({executionId:id,botId:bot,prompt:'Task assignment'})
  const run=async(bot='a',id='exec-1',turn=1)=>{
    const agent=await rt.resolveAgent(`s-${bot}`),message=agent.inbox.nextTurn.find(m=>m.source?.taskExecutionId===id)
    assert.ok(message);agent.inbox.remove(message.id);agent.status='running'
    rt.live.set(agent.id,{turn,info:message.source});emit(agent.id,{type:'user/message',data:{turn,source:message.source}})
    return agent
  }
  return{rt,ctx,state,agents,messages,events,warnings,emit,start,run,setFailSave:v=>{failSave=v}}
}
test('task admission persists before dispatch; replay is idempotent and same Bot starts are serialized',async t=>{
  const f=fixture(t)
  const first=await f.start();assert.equal(first.phase,'queued');assert.ok(f.messages[0].saves>0)
  assert.deepEqual(await f.start(),first);assert.equal(f.messages.length,1)
  await assert.rejects(()=>f.rt.taskBridge.startTask({executionId:'exec-1',botId:'a',prompt:'changed'}),{code:'conflict'})
  const both=await Promise.allSettled([f.start('b','exec-2'),f.start('b','exec-3')])
  assert.equal(both.filter(x=>x.status==='fulfilled').length,1);assert.equal(both.find(x=>x.status==='rejected').reason.code,'bot_busy')
})
test('admission journal failure never sends a model request; reserved prototype keys rejected',async t=>{
  const f=fixture(t);f.setFailSave(true);await assert.rejects(()=>f.start(),/disk failed/);assert.equal(f.messages.length,0)
  f.setFailSave(false);await assert.rejects(()=>f.start('b','__proto__'),{code:'invalid'});assert.equal(Object.getPrototypeOf(f.state.taskAdmissions),Object.prototype)
})
test('exact cancellation removes only task queue messages and cannot cancel a subsequent user turn',async t=>{
  const f=fixture(t);await f.start();const agent=await f.rt.resolveAgent('s-a')
  agent.inbox.nextTurn.push({id:'user',source:{kind:'user'}})
  await f.rt.taskBridge.cancelTask('exec-1');assert.deepEqual(agent.inbox.nextTurn.map(m=>m.id),['user'])
  await f.start('b','exec-2');const b=await f.run('b','exec-2')
  f.rt.live.set('s-b',{turn:2,info:{kind:'user'}})
  let cancelled=false;b.cancel=()=>{cancelled=true}
  await assert.rejects(()=>f.rt.taskBridge.cancelTask('exec-2'),{code:'isolation'});assert.equal(cancelled,false)
})
test('running cancellation waits for matching turn settlement and rejects later pre-step',async t=>{
  const f=fixture(t);await f.start();await f.run();assert.equal(f.rt.taskBridge.ownsExecution('exec-1','s-a'),true)
  await f.rt.taskBridge.cancelTask('exec-1');assert.equal((await f.rt.taskBridge.getExecution('exec-1')).phase,'cancelled')
  const guard=f.ctx.listeners.get('agent/pre-step')[0]
  f.rt.live.set('s-a',{turn:1,info:{taskExecutionId:'exec-1'}})
  assert.deepEqual(guard({agent:{id:'s-a'}},()=>({allowed:true})),{kind:'reject'})
})
test('usage reuses real settlement fold, counts retry attempts once and accepts late settlement of the same turn',async t=>{
  const f=fixture(t);await f.start();await f.run()
  const message=(turn,step,input,output)=>({type:'assistant/message',data:{turn,step,usage:{inputTokens:input,outputTokens:output}}})
  f.emit('s-a',message(1,1,10,2));f.emit('s-a',message(1,1,10,2))
  f.emit('s-a',{type:'llm/retry-started',data:{turn:1,step:1}});f.emit('s-a',message(1,1,11,3))
  f.emit('s-a',{type:'turn/end',data:{turn:1,reason:{kind:'completed'}}});f.rt.live.delete('s-a')
  f.emit('s-a',message(1,1,11,5));f.emit('s-a',message(99,1,1000,1000));await tick()
  const e=await f.rt.taskBridge.getExecution('exec-1');assert.equal(e.phase,'settled');assert.deepEqual(Object.values(e.usage),[12,16])
  assert.equal(f.events.filter(e=>e.type==='usage').reduce((n,e)=>n+e.tokens,0),28)
})
test('plugin reload fences unresolved admissions; missing orchestrator rejects managed turns only',async t=>{
  const f=fixture(t,{'old':{id:'old',botId:'a',phase:'running',sessions:['s-a'],usage:{}}})
  assert.equal((await f.rt.taskBridge.getExecution('old')).phase,'unknown')
  await assert.rejects(()=>f.start(),{code:'bot_busy'})
  const guard=f.ctx.listeners.get('agent/pre-step')[0]
  assert.equal(guard({agent:{id:'s-b'}},()=>true),true)
  f.rt.live.set('s-b',{turn:2,info:{taskExecutionId:'unknown'}})
  assert.deepEqual(guard({agent:{id:'s-b'}},()=>true),{kind:'reject'})
})
test('direct Bot delegation guard applies only to orchestrated turn; private and group chats unchanged',async t=>{
  const f=fixture(t);assert.doesNotThrow(()=>f.rt.guardTaskDelegation({agent:{id:'s-a'}}))
  await f.start();await f.run();assert.throws(()=>f.rt.guardTaskDelegation({agent:{id:'s-a'}}),{code:'task_scope'})
  assert.deepEqual(f.rt.taskBridge.actorOf('s-a'),{kind:'bot',id:'s-a',bot_id:'a',main:true})
})

test('cancellation before admission leaves a durable fence, including the capability-resolution race',async t=>{
  const f=fixture(t)
  await f.rt.taskBridge.cancelTask('not-admitted')
  await assert.rejects(()=>f.start('a','not-admitted'),{code:'conflict'})
  assert.equal(f.messages.length,0)
  let release, entered
  const arrived=new Promise(resolve=>{entered=resolve})
  f.rt.ensureCapabilities=async()=>{entered();await new Promise(resolve=>{release=resolve})}
  const start=f.start('b','pending-admission')
  await arrived
  await f.rt.taskBridge.cancelTask('pending-admission')
  release();await start
  assert.equal(f.messages.length,0);assert.equal((await f.rt.taskBridge.getExecution('pending-admission')).phase,'cancelled')
})
test('foreign input fences the task without allowing a later user turn to be cancelled as that task',async t=>{
  const f=fixture(t);await f.start();await f.run()
  f.emit('s-a',{type:'user/message',data:{turn:1,source:{kind:'user'}}});await tick()
  assert.equal((await f.rt.taskBridge.getExecution('exec-1')).phase,'unknown')
  assert.ok(f.events.some(e=>e.type==='interrupted'))
  const guard=f.ctx.listeners.get('agent/pre-step')[0]
  assert.deepEqual(guard({agent:{id:'s-a'}},()=>true),{kind:'reject'})
  f.rt.live.set('s-a',{turn:2,info:{kind:'user'}})
  assert.equal(guard({agent:{id:'s-a'}},()=>true),true)
})
test('native subagent creation is fenced only inside managed task turns',async t=>{
  const f=fixture(t),guard=f.ctx.guards.at(-1)
  assert.equal(guard({name:'subagent',agent:{id:'s-a'}}),undefined)
  await f.start();await f.run()
  assert.match(guard({name:'subagent',agent:{id:'s-a'}}),/taskboard_request_assistance/)
  assert.equal(guard({name:'read_file',agent:{id:'s-a'}}),undefined)
})

test('DSH synthetic time-context input is not mistaken for a foreign human instruction',async t=>{
  const f=fixture(t);await f.start();await f.run()
  f.emit('s-a',{type:'user/message',data:{source:{kind:'time-context',form:'snapshot'}}});await tick()
  assert.equal((await f.rt.taskBridge.getExecution('exec-1')).phase,'running')
  assert.equal(f.rt.taskBridge.ownsExecution('exec-1','s-a'),true)
  assert.equal(f.events.some(e=>e.type==='interrupted'),false)
})

test('concurrent same-ID admissions cannot silently replace the original Bot or goal',async t=>{
  const f=fixture(t)
  const first=f.start('a','same-id')
  const second=f.rt.taskBridge.startTask({executionId:'same-id',botId:'b',prompt:'Other goal'})
  await assert.rejects(()=>second,{code:'conflict'});await first
  assert.equal(f.messages.length,1);assert.equal(f.messages[0].session,'s-a')
})
test('a task keeps the same admission identity across ordinary Bot part handoffs',async t=>{
  const f=fixture(t);await f.start();await f.run()
  f.rt.switchJobs=()=>[{botId:'a'}]
  f.emit('s-a',{type:'turn/end',data:{turn:1,reason:{kind:'completed'}}});await tick()
  assert.equal((await f.rt.taskBridge.getExecution('exec-1')).phase,'switching')
  const previous=f.rt.selfOf;f.rt.selfOf=id=>id==='new-part'?'a':previous(id)
  f.rt.live.set('new-part',{turn:1,info:{taskExecutionId:'exec-1'}})
  f.emit('new-part',{type:'user/message',data:{source:{kind:'bot',role:'handoff',taskExecutionId:'exec-1'}}});await tick()
  const record=await f.rt.taskBridge.getExecution('exec-1')
  assert.deepEqual(record.sessions,['s-a','new-part']);assert.equal(record.sessionId,'new-part');assert.equal(record.phase,'running')
  assert.equal(f.rt.taskBridge.ownsExecution('exec-1','new-part'),true)
})
