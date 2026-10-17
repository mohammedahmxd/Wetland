import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createWorkflowEngine} from './workflow.mjs';
const secret='test-only-secret-with-at-least-32-bytes';
const skill={id:'growth-report',version:'1.0.0',digest:'a'.repeat(64)};
const context={start:'2026-07-01',end:'2026-09-30',target:150};
function setup(extra={}){
 let time=1000000,calls=0;
 const options={secret,skill,clock:()=>time,ttlSeconds:60,validateContext:raw=>{
  assert.deepEqual(Object.keys(raw).sort(),['end','start','target']);assert.equal(typeof raw.target,'number');assert.ok(raw.target>0);return raw;
 },steps:[
  {id:'calculate',run:async({context})=>{calls++;return {evidence:{actual:120,target:context.target},result:{actual:120}};},validateEvidence:(p,{context})=>p.actual===120&&p.target===context.target},
  {id:'report',run:async({evidence})=>({evidence:{artifact:'b'.repeat(64),actual:evidence.calculate.actual},result:{url:'https://example.test/report'}}),validateEvidence:(p,{evidence})=>p.artifact==='b'.repeat(64)&&p.actual===evidence.calculate.actual}
 ],...extra};return {engine:createWorkflowEngine(options),options,setTime:x=>time=x,calls:()=>calls};
}
async function started(setupResult){return setupResult.engine.start({subject:'tenant:user',context});}
function resign(token,edit){const state=JSON.parse(Buffer.from(token.split('.')[0],'base64url'));edit(state);const body=Buffer.from(JSON.stringify(state)).toString('base64url');return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');}
test('Server steps advance in order; state works across instances and replay is read-only',async()=>{
 const a=setup(),start=await started(a);assert.equal(start.step,'calculate');
 const first=await a.engine.advance({subject:'tenant:user',token:start.token});assert.equal(first.step,'report');assert.deepEqual(first.result,{actual:120});
 const other=createWorkflowEngine(a.options);assert.equal((await other.getStep({subject:'tenant:user',token:first.token})).step,'report');
 const done=await other.advance({subject:'tenant:user',token:first.token});assert.equal(done.status,'completed');assert.equal(done.step,null);assert.deepEqual(done.completedSteps,['calculate','report']);
 await assert.rejects(other.advance({subject:'tenant:user',token:done.token}),/already completed/);
 const replay=await a.engine.advance({subject:'tenant:user',token:start.token});assert.equal(replay.token,first.token);assert.equal(a.calls(),2);
});
test('Missing/short secrets and invalid configuration fail closed',()=>{
 for(const value of [undefined,'short',123])assert.throws(()=>setup({secret:value}),/SECRET/);
 assert.throws(()=>setup({ttlSeconds:3601}),/configuration/);
 assert.throws(()=>setup({skill:{...skill,digest:'unversioned'}}),/skill/);
});
test('Forged tokens, wrong subjects, wrong versions/digests are rejected',async()=>{
 const s=setup(),start=await started(s),read=token=>s.engine.getStep({subject:'tenant:user',token});
 const [body,sig]=start.token.split('.');await assert.rejects(read(body+'.'+(sig[0]==='A'?'B':'A')+sig.slice(1)),/signature/);
 await assert.rejects(s.engine.getStep({subject:'other-user',token:start.token}),/subject/);
 for(const field of ['id','version','digest']){
  const value=field==='digest'?'b'.repeat(64):'different';const other=setup({skill:{...skill,[field]:value}});
  await assert.rejects(other.engine.getStep({subject:'tenant:user',token:start.token}),/digest changed/);
 }
 await assert.rejects(read('x'.repeat(50000)),/size/);
});
test('Expiry is fixed across steps and enforced during long callbacks',async()=>{
 const s=setup(),start=await started(s);s.setTime(1059000);const next=await s.engine.advance({subject:'tenant:user',token:start.token});assert.equal(next.expiresAt,start.expiresAt);
 s.setTime(1060000);await assert.rejects(s.engine.getStep({subject:'tenant:user',token:next.token}),/expired/);
 const delayed=setup();delayed.options.steps[0].run=async()=>{delayed.setTime(1061000);return {evidence:{actual:120,target:150},result:{}};};
 const engine=createWorkflowEngine(delayed.options),receipt=await engine.start({subject:'tenant:user',context});await assert.rejects(engine.advance({subject:'tenant:user',token:receipt.token}),/expired/);
});
test('Client evidence/approvals cannot be submitted; context is validated and bounded',async()=>{
 const s=setup(),start=await started(s);
 await assert.rejects(s.engine.advance({subject:'tenant:user',token:start.token,approved:true}),/fields/);
 await assert.rejects(s.engine.start({subject:'tenant:user',context:{...context,approved:true}}));
 await assert.rejects(s.engine.start({subject:'',context}),/subject/);
 await assert.rejects(s.engine.start({subject:'tenant:user',context:{...context,target:NaN}}),/finite JSON/);
 const large=setup({validateContext:x=>x});await assert.rejects(large.engine.start({subject:'tenant:user',context:{data:'x'.repeat(33000)}}),/size/);
 const deep={};let cursor=deep;for(let n=0;n<20;n++){cursor.child={};cursor=cursor.child;}await assert.rejects(large.engine.start({subject:'tenant:user',context:deep}),/complexity/);
});
test('Server evidence must pass an explicit validator before issuing a next step',async()=>{
 for(const validateEvidence of [()=>false,()=>undefined]){
  const s=setup({steps:[{id:'check',run:async()=>({evidence:{approved:true},result:{}}),validateEvidence}]});
  await assert.rejects(s.engine.advance({subject:'tenant:user',token:(await started(s)).token}),/evidence rejected/);
 }
});
test('Signed malformed state or changed data context cannot skip steps or invent proof',async()=>{
 const s=setup(),start=await started(s);const read=token=>s.engine.getStep({subject:'tenant:user',token});
 await assert.rejects(read(resign(start.token,x=>x.step=2)),/evidence/);
 await assert.rejects(read(resign(start.token,x=>{x.step=1;x.evidence={calculate:{actual:999,target:150}};})),/evidence rejected/);
 await assert.rejects(read(resign(start.token,x=>x.context.target=-1)));
 await assert.rejects(read(resign(start.token,x=>x.exp=x.iat+3600)),/time/);
 // Even an old valid receipt is rejected when the expected data context policy changes.
 const changed=setup({validateContext:raw=>({...raw,target:200})});await assert.rejects(changed.engine.getStep({subject:'tenant:user',token:start.token}),/context changed/);
});

test('Server package and dataset bindings reject stale receipts across instances',async()=>{
 const binding={packageDigest:'c'.repeat(64),datasetDigest:'d'.repeat(64)};
 const s=setup({binding}),start=await started(s);
 for(const field of Object.keys(binding)){
  const other=setup({binding:{...binding,[field]:'e'.repeat(64)}});
  await assert.rejects(other.engine.getStep({subject:'tenant:user',token:start.token}),/data binding changed/);
 }
 assert.equal((await createWorkflowEngine(s.options).getStep({subject:'tenant:user',token:start.token})).step,'calculate');
});
