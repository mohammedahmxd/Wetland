import {createHmac, timingSafeEqual} from 'node:crypto';

// These signed tokens are workflow receipts, NEVER authentication credentials.
// Payloads are readable, not encrypted: keep context/proofs small and non-sensitive.
// Replay is intentionally allowed for read-only calculations/rendering. Do not use
// this engine for approvals, writes, payments or other single-use actions.
const MAX_PAYLOAD=32768, MAX_TOKEN=44000;
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function fail(message){throw new Error('Workflow: '+message);}
function record(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail(label+' must be an object');
 if(Object.keys(value).length!==keys.length||keys.some(key=>!own(value,key)))fail('invalid '+label+' fields');
}
function jsonCopy(value,maxBytes=MAX_PAYLOAD){
 const seen=new Set();let count=0;
 function inspect(item,depth){
  if(++count>5000||depth>16)fail('payload complexity limit');
  if(item===null||typeof item==='boolean'||typeof item==='string')return;
  if(typeof item==='number'&&Number.isFinite(item))return;
  if(!item||typeof item!=='object'||seen.has(item))fail('payload must be finite JSON');
  if(!Array.isArray(item)&&![Object.prototype,null].includes(Object.getPrototypeOf(item)))fail('payload must be plain JSON');
  seen.add(item);for(const child of Object.values(item))inspect(child,depth+1);seen.delete(item);
 }
 inspect(value,0);const text=JSON.stringify(value);
 if(Buffer.byteLength(text)>maxBytes)fail('payload size limit');return JSON.parse(text);
}
function subjectCheck(subject){if(typeof subject!=='string'||!subject.trim()||subject.length>256)fail('authenticated subject required');}
function b64decode(text){
 if(!/^[A-Za-z0-9_-]+$/.test(text))fail('invalid token encoding');
 const value=Buffer.from(text,'base64url');if(value.toString('base64url')!==text)fail('invalid token encoding');return value;
}
export function createWorkflowEngine({secret,skill,binding={},steps,validateContext,ttlSeconds=900,clock=()=>Date.now()}){
 if((typeof secret!=='string'&&!Buffer.isBuffer(secret))||Buffer.byteLength(secret)<32)fail('MCP_WORKFLOW_SECRET must contain at least 32 bytes; no random instance fallback');
 const key=Buffer.from(secret);
 record(skill,['id','version','digest'],'skill');
 if(!/^[a-z][a-z0-9-]{0,79}$/.test(skill.id)||typeof skill.version!=='string'||!skill.version||skill.version.length>100||!/^[a-f0-9]{64}$/.test(skill.digest))fail('invalid skill identity');
 const identity=jsonCopy(skill),dataBinding=jsonCopy(binding);
 if(!dataBinding||typeof dataBinding!=='object'||Array.isArray(dataBinding))fail('binding must be an object');
 if(!Array.isArray(steps)||!steps.length||steps.length>16||new Set(steps.map(x=>x.id)).size!==steps.length)fail('invalid steps');
 const controlled=steps.map(step=>{
  record(step,['id','run','validateEvidence'],'step');
  if(!/^[a-z][a-z0-9_-]{0,63}$/.test(step.id)||['constructor','prototype'].includes(step.id)||typeof step.run!=='function'||typeof step.validateEvidence!=='function')fail('invalid controlled step');
  return {...step};
 });
 if(typeof validateContext!=='function'||typeof clock!=='function'||!Number.isInteger(ttlSeconds)||ttlSeconds<1||ttlSeconds>3600)fail('invalid configuration');
 function now(){const ms=clock();if(!Number.isFinite(ms))fail('invalid clock');return Math.floor(ms/1000);}
 const mac=body=>createHmac('sha256',key).update(body).digest();
 function sign(state){const payload=Buffer.from(JSON.stringify(jsonCopy(state))).toString('base64url');return payload+'.'+mac(payload).toString('base64url');}
 function view(state,token){return {token,status:state.step===controlled.length?'completed':'active',step:controlled[state.step]?.id??null,completedSteps:controlled.slice(0,state.step).map(x=>x.id),context:jsonCopy(state.context),expiresAt:new Date(state.exp*1000).toISOString()};}
 async function proofCheck(step,proof,state,prior){
  if(await step.validateEvidence(jsonCopy(proof),{context:jsonCopy(state.context),evidence:jsonCopy(prior),subject:state.subject})!==true)fail('server evidence rejected for '+step.id);
 }
 async function read({subject,token}){
  subjectCheck(subject);
  if(typeof token!=='string'||token.length>MAX_TOKEN)fail('invalid token size');
  const parts=token.split('.');if(parts.length!==2)fail('invalid token');
  const signature=b64decode(parts[1]),expected=mac(parts[0]);
  if(signature.length!==expected.length||!timingSafeEqual(signature,expected))fail('invalid token signature');
  const bytes=b64decode(parts[0]);if(bytes.length>MAX_PAYLOAD)fail('payload size limit');
  let state;try{state=JSON.parse(bytes.toString('utf8'));}catch{fail('invalid token JSON');}
  record(state,['v','skill','binding','subject','iat','exp','step','context','evidence'],'token payload');
  jsonCopy(state);record(state.skill,['id','version','digest'],'token skill');
  if(state.v!==1||Object.keys(identity).some(k=>state.skill[k]!==identity[k]))fail('skill version or digest changed');
  if(JSON.stringify(state.binding)!==JSON.stringify(dataBinding))fail('data binding changed');
  if(state.subject!==subject)fail('wrong authenticated subject');
  const time=now();
  if(!Number.isInteger(state.iat)||!Number.isInteger(state.exp)||state.exp<=state.iat||state.exp-state.iat>ttlSeconds||state.iat>time+30)fail('invalid token time');
  if(state.exp<=time)fail('expired token');
  if(!Number.isInteger(state.step)||state.step<0||state.step>controlled.length)fail('invalid token step');
  record(state.evidence,controlled.slice(0,state.step).map(x=>x.id),'evidence');
  const normalized=jsonCopy(await validateContext(jsonCopy(state.context)));
  if(JSON.stringify(normalized)!==JSON.stringify(state.context))fail('context changed');
  const prior={};for(const step of controlled.slice(0,state.step)){await proofCheck(step,state.evidence[step.id],state,prior);prior[step.id]=state.evidence[step.id];}
  if(state.exp<=now())fail('expired token');
  return state;
 }
 return Object.freeze({
  async start(input){
   record(input,['subject','context'],'start arguments');subjectCheck(input.subject);
   const context=jsonCopy(await validateContext(jsonCopy(input.context))),time=now();
   const state={v:1,skill:identity,binding:dataBinding,subject:input.subject,iat:time,exp:time+ttlSeconds,step:0,context,evidence:{}};
   return view(state,sign(state));
  },
  async getStep(input){record(input,['subject','token'],'step arguments');return view(await read(input),input.token);},
  async advance(input){
   record(input,['subject','token'],'advance arguments');const state=await read(input),step=controlled[state.step];
   if(!step)fail('workflow already completed');
   const output=await step.run({context:jsonCopy(state.context),evidence:jsonCopy(state.evidence),subject:state.subject});
   record(output,['evidence','result'],'server output');const proof=jsonCopy(output.evidence);
   await proofCheck(step,proof,state,state.evidence);
   if(state.exp<=now())fail('expired token');
   const next={...state,step:state.step+1,evidence:{...state.evidence,[step.id]:proof}};
   return {...view(next,sign(next)),result:output.result};
  }
 });
}
