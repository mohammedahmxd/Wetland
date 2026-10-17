import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {identityFromEmail,resolveEmailPolicy,providerAllowed,publicAuthConfig,contentSecurityPolicy} from './public/auth-policy.js';
import{initialState,createRequest,transition,compose,SOURCE_DOCS,evaluations,claimTask,submitTask,acceptTask,reportIssue,publishUpdate,rollback}from'./public/model.js';
let s=initialState();
const p=createRequest(s,{title:'A new tool',problem:'Recurring task',success:'Evidence-linked output'});
assert.equal(p.status,'Requested');s.role='contributor';assert.throws(()=>transition(s,p.id,'Scoped'));
s.role='admin';transition(s,p.id,'Scoped');
s.role='contributor';assert.throws(()=>transition(s,p.id,'Building'));
s.onboarded=true;transition(s,p.id,'Building');assert.throws(()=>transition(s,p.id,'Review'));
p.submission='A documented implementation with test evidence';transition(s,p.id,'Review');
s.role='admin';assert.throws(()=>transition(s,p.id,'Pilot'));
p.evals=evaluations(p);p.checks={scope:true,data:true,owner:true,quality:true};transition(s,p.id,'Pilot');transition(s,p.id,'Live');
assert.equal(p.status,'Live');assert.equal(p.releases.length,1);
let r=compose(SOURCE_DOCS);assert(r.conflict);assert(r.gaps.length>=2);assert.equal(compose([SOURCE_DOCS[0]]).conflict,false);assert.throws(()=>compose([]));assert(evaluations(s.projects[0]).every(x=>x.pass));
s.role='admin';let t=reportIssue(s,'report','Date conflict','Synthetic reproduction of a date issue');assert.equal(t.status,'Triage');
s.role='contributor';assert.throws(()=>claimTask(s,t.id));t.status='Open';claimTask(s,t.id);submitTask(s,t.id,'Added a clearer conflict message and regression coverage.');
s.role='admin';acceptTask(s,t.id);const tool=s.projects[0];assert.equal(tool.candidate.version,'1.0.1');assert.throws(()=>publishUpdate(s,tool.id));tool.candidate.evals=evaluations(tool);tool.candidate.checks={scope:true,data:true,owner:true,quality:true};publishUpdate(s,tool.id);assert.equal(tool.version,'1.0.1');assert.equal(t.status,'Closed');assert.equal(s.points,50);
rollback(s,tool.id,'Restore prior release for review');assert.equal(tool.version,'1.0.0');assert.equal(tool.previous,null);assert.throws(()=>rollback(s,tool.id,'No version available'));
transition(s,tool.id,'Retired');assert.equal(tool.status,'Retired');assert.throws(()=>transition(s,tool.id,'Live'));
console.log('PASS: request-to-release gates, roles, onboarding, evidence extraction, conflict detection, maintenance-to-release, recognition, rollback and retirement.');
const demo=resolveEmailPolicy({profile:'demo'});
assert.deepEqual([...demo.domains],['wateraidflow.org']);
assert.equal(identityFromEmail('flow-demo@wateraidflow.org',true,demo.domains).email,'flow-demo@wateraidflow.org');
assert.throws(()=>identityFromEmail('flow-demo@wateraidflow.org',false,demo.domains));
assert.throws(()=>identityFromEmail('person@wateraid.org',true,demo.domains));
assert.throws(()=>identityFromEmail('person@evil.wateraidflow.org',true,demo.domains));
assert.throws(()=>identityFromEmail('person@wateraidflow.org.evil.com',true,demo.domains));
assert.equal(providerAllowed('demo','password'),true);
assert.equal(providerAllowed('demo','google.com'),true);
assert.equal(providerAllowed('production','password'),false);
assert.equal(providerAllowed('production','google.com'),true);
assert.throws(()=>resolveEmailPolicy({profile:'demo',domains:'wateraid.org'}));
assert.equal(resolveEmailPolicy({}),null);
const cfg=publicAuthConfig({AUTH_PROFILE:'demo',FIREBASE_API_KEY:'test-key',FIREBASE_AUTH_DOMAIN:'wateraid-flow.firebaseapp.com',FIREBASE_PROJECT_ID:'wateraid-flow',AUTH_SIGNING_SECRET:'do-not-publish'});
assert.equal(cfg.firebase.apiKey,'test-key');
assert.equal(cfg.passwordSignIn,true);
assert.equal(cfg.demoUser,'flow-demo@wateraidflow.org');
assert.equal(JSON.stringify(cfg).includes('do-not-publish'),false);
assert.equal(publicAuthConfig({AUTH_PROFILE:'production',FIREBASE_API_KEY:'k',FIREBASE_AUTH_DOMAIN:'wateraid-flow.firebaseapp.com',FIREBASE_PROJECT_ID:'wateraid-flow'}).passwordSignIn,false);
assert.equal(publicAuthConfig({AUTH_PROFILE:'demo',FIREBASE_API_KEY:'k',FIREBASE_AUTH_DOMAIN:'not a host',FIREBASE_PROJECT_ID:'wateraid-flow'}).firebase,null);
const csp=contentSecurityPolicy({FIREBASE_AUTH_DOMAIN:'wateraid-flow.firebaseapp.com'});
assert.match(csp,/identitytoolkit\.googleapis\.com/);
assert.match(csp,/accounts\.google\.com/);
assert.doesNotMatch(contentSecurityPolicy({FIREBASE_AUTH_DOMAIN:'https://evil.example/csp'}),/evil\.example/);
const port=38123;
const child=spawn(process.execPath,['server.mjs'],{cwd:fileURLToPath(new URL('.',import.meta.url)),env:{...process.env,PORT:String(port),AUTH_PROFILE:'demo',FIREBASE_API_KEY:'test-key',FIREBASE_AUTH_DOMAIN:'wateraid-flow.firebaseapp.com',FIREBASE_PROJECT_ID:'wateraid-flow',AUTH_SIGNING_SECRET:'do-not-publish'},stdio:'ignore'});
try{
  let body,status,policy;
  for(let i=0;i<30;i++){
    try{
      const res=await fetch('http://127.0.0.1:'+port+'/auth/config');
      status=res.status;body=await res.json();policy=res.headers.get('content-type');
      break;
    }catch{await new Promise(r=>setTimeout(r,50))}
  }
  assert.equal(status,200);
  assert.match(policy,/application\/json/);
  assert.equal(body.firebase.apiKey,'test-key');
  assert.equal(JSON.stringify(body).includes('do-not-publish'),false);
  const page=await fetch('http://127.0.0.1:'+port+'/');
  assert.match(page.headers.get('content-security-policy'),/https:\/\/www\.gstatic\.com/);
  const health=await fetch('http://127.0.0.1:'+port+'/healthz');
  assert.equal(await health.text(),'ok');
}finally{child.kill('SIGTERM')}
console.log('PASS: dashboard sign-in audience, public config, and Firebase content security policy.');

assert.deepEqual(Object.keys((await import('./public/model.js')).ROLES),['admin','contributor']);

const regression=initialState();
const review=createRequest(regression,{title:'Re-review',problem:'Check revised evidence',success:'New review required'});
transition(regression,review.id,'Scoped');regression.role='contributor';regression.onboarded=true;
transition(regression,review.id,'Building');review.submission='Initial synthetic implementation evidence';transition(regression,review.id,'Review');regression.role='admin';
review.evals=[];review.checks={scope:true,data:true,owner:true,quality:true};
assert.throws(()=>transition(regression,review.id,'Pilot'),/evaluation/);
review.evals=evaluations(review);transition(regression,review.id,'Building');
assert.equal(review.evals,null);assert.deepEqual(review.checks,{});
regression.role='contributor';review.submission='Revised synthetic implementation evidence';transition(regression,review.id,'Review');regression.role='admin';
assert.throws(()=>transition(regression,review.id,'Pilot'),/evaluation/);
const candidate=regression.projects[0];candidate.candidate={version:'1.0.1',notes:'Regression',evals:[],checks:{scope:true,data:true,owner:true,quality:true}};
assert.throws(()=>publishUpdate(regression,candidate.id),/evaluations/);
console.log('PASS: revised evidence resets approval and empty evaluation lists cannot authorize releases.');

const admin=initialState();
assert.equal(admin.onboarded,false);
const adminProject=createRequest(admin,{title:'Admin workflow',problem:'Complete work without switching roles',success:'Admin can claim, submit and review'});
transition(admin,adminProject.id,'Scoped');transition(admin,adminProject.id,'Building');
adminProject.submission='Admin-authored implementation and test evidence';transition(admin,adminProject.id,'Review');
assert.throws(()=>transition(admin,adminProject.id,'Pilot'),/evaluation/);
adminProject.evals=evaluations(adminProject);adminProject.checks={scope:true,data:true,owner:true,quality:true};
transition(admin,adminProject.id,'Pilot');transition(admin,adminProject.id,'Live');
claimTask(admin,'task-docs');assert.equal(admin.tasks[0].assignee,'Maya Chen');
submitTask(admin,'task-docs','Admin documentation improvement with synthetic verification evidence.');
acceptTask(admin,'task-docs');assert.equal(admin.tasks[0].status,'Closed');
admin.role='contributor';assert.throws(()=>createRequest(admin,{title:'Restricted',problem:'Test',success:'Test'}));
console.log('PASS: Admin can perform contributor workflows without switching roles; Contributor permissions and review gates remain enforced.');
