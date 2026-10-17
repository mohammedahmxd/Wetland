import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.env.AUTH_MODE='demo';process.env.DEMO_AUTH_ENABLED='true';
if(!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to a disposable test PostgreSQL database');
const {pool}=await import('../src/db.js');
const {migrate}=await import('../src/migrate.js');
const {createApp}=await import('../src/app.js');
const {createVerifier}=await import('../src/auth.js');
const {report,evaluate}=await import('../src/report.js');
const app=createApp(),org=randomUUID(),otherOrg=randomUUID();
const base=`/api/orgs/${org}`;
before(async()=>{
  await migrate();
  for(const id of [org,otherOrg]) {
    await pool.query('INSERT INTO organizations(id,name) VALUES($1,$2)',[id,'Isolated test organisation']);
    for(const role of ['staff','contributor','maintainer','approver']) await pool.query('INSERT INTO members VALUES($1,$2,$3)',[id,`demo-${role}`,role]);
    await pool.query('INSERT INTO members VALUES($1,$2,$3)',[id,'demo-backup','maintainer']);
  }
});
after(async()=>{await app.close();await pool.end();});
async function call(method:any,path:string,role:string|undefined,body?:any) {
  const response=await app.inject({method,url:path,headers:role?{authorization:`Bearer demo-${role}`}:{},payload:body});
  return {status:response.statusCode,body:response.json()};
}
test('Authentication fails closed and demo mode cannot boot in production',async()=>{
  assert.equal((await call('GET',`${base}/tools`,undefined)).status,401);
  assert.equal((await call('GET',`${base}/tools`,'outsider')).status,403);
  assert.throws(()=>createVerifier({AUTH_MODE:'demo',DEMO_AUTH_ENABLED:'true',NODE_ENV:'production'}));
  assert.throws(()=>createVerifier({AUTH_MODE:'demo',DEMO_AUTH_ENABLED:'true',K_SERVICE:'backend'}));
  assert.throws(()=>createVerifier({}));
});
test('Full lifecycle enforces ownership, isolation, evaluation, approval and concurrency',async()=>{
  const request=await call('POST',`${base}/requests`,'staff',{title:'Report quality',problem:'Definitions differ',acceptanceCriteria:'Flag conflicting evidence'});
  assert.equal(request.status,201);
  assert.equal((await call('GET',`${base}/requests`,'contributor')).status,403);
  const tool=await call('POST',`${base}/tools`,'maintainer',{requestId:request.body.id,name:'Reporting',sponsor:'demo-staff',maintainer:'demo-maintainer',backupMaintainer:'demo-backup',reviewDate:'2027-01-01'});
  assert.equal(tool.status,201,JSON.stringify(tool.body));
  const toolPath=`${base}/tools/${tool.body.id}`;
  assert.equal((await call('GET',`/api/orgs/${otherOrg}/tools/${tool.body.id}`,'maintainer')).status,404);
  const bad=await call('POST',`${toolPath}/versions`,'contributor',{implementation:'kijana-report-v1',releaseLabel:'bad-v1',configuration:{includePartialAsFunctional:true}});
  assert.equal(bad.status,201);
  const failed=await call('POST',`${base}/versions/${bad.body.id}/evaluate`,'maintainer');
  assert.equal(failed.body.passed,false);
  assert.equal((await call('POST',`${base}/versions/${bad.body.id}/approve`,'approver',{evaluationId:failed.body.id,rationale:'Not acceptable'})).status,409);
  assert.equal((await call('POST',`${toolPath}/activate`,'maintainer',{versionId:bad.body.id,expectedActiveVersionId:null,reason:'Bypass'})).status,409);
  const good=await call('POST',`${toolPath}/versions`,'contributor',{implementation:'kijana-report-v1',releaseLabel:'good-v1',configuration:{includePartialAsFunctional:false}});
  assert.equal(good.status,201);
  await assert.rejects(pool.query('UPDATE versions SET digest=$1 WHERE id=$2',['changed',good.body.id]),/immutable/);
  const evaluation=await call('POST',`${base}/versions/${good.body.id}/evaluate`,'maintainer');
  assert.equal(evaluation.body.passed,true);
  assert.equal((await call('POST',`${base}/versions/${good.body.id}/approve`,'contributor',{evaluationId:evaluation.body.id,rationale:'Self approve'})).status,403);
  assert.equal((await call('POST',`${base}/versions/${good.body.id}/approve`,'approver',{evaluationId:failed.body.id,rationale:'Wrong evidence'})).status,409);
  const approval=await call('POST',`${base}/versions/${good.body.id}/approve`,'approver',{evaluationId:evaluation.body.id,rationale:'Pilot accepted'});
  assert.equal(approval.status,201,JSON.stringify(approval.body));
  const activations=await Promise.all([1,2].map(()=>call('POST',`${toolPath}/activate`,'maintainer',{versionId:good.body.id,expectedActiveVersionId:null,reason:'Start pilot'})));
  assert.deepEqual(activations.map(a=>a.status).sort(),[201,409]);
  const output=await call('POST',`${toolPath}/run`,'staff',{cutoff:'2026-06-30',points:['a','b'],visits:[{pointId:'a',date:'2026-06-01',status:'Functional'},{pointId:'b',date:'2026-06-01',status:'Partially functional'}]});
  assert.equal(output.status,200);assert.equal(output.body.functionalPercent,50);assert.equal(output.body.versionId,good.body.id);
  assert.equal(output.body.state,'draft');
  const replacement=await call('POST',`${toolPath}/versions`,'contributor',{implementation:'kijana-report-v1',releaseLabel:'good-v2',configuration:{includePartialAsFunctional:false}});
  const recheck=await call('POST',`${base}/versions/${replacement.body.id}/evaluate`,'maintainer');
  assert.equal((await call('POST',`${base}/versions/${replacement.body.id}/approve`,'approver',{evaluationId:recheck.body.id,rationale:'Replacement accepted'})).status,201);
  assert.equal((await call('POST',`${toolPath}/activate`,'maintainer',{versionId:replacement.body.id,expectedActiveVersionId:good.body.id,reason:'Upgrade'})).status,201);
  const rollback=await call('POST',`${toolPath}/activate`,'backup',{versionId:good.body.id,expectedActiveVersionId:replacement.body.id,reason:'Restore previous approved release'});
  assert.equal(rollback.status,201);assert.equal(rollback.body.activeVersionId,good.body.id);
  assert.equal((await call('POST',`${toolPath}/run`,'contributor',{cutoff:'2026-06-30',points:['a'],visits:[]})).status,403);
  const events=await call('GET',`${base}/audit`,'approver');
  assert.ok(events.body.some((e:any)=>e.action==='tool.executed'));
  await assert.rejects(pool.query('DELETE FROM audit_events WHERE organization_id=$1',[org]),/immutable/);
});
test('Metric handling retains unknowns, missing records and conflicting observations',()=>{
  const r=report({cutoff:'2026-06-30',points:['a','a','b','c'],visits:[{pointId:'a',date:'2026-05-01',status:'Functional'},{pointId:'a',date:'2026-06-01',status:'NF'},{pointId:'b',date:'2026-06-01',status:'unrecognised'}]},{includePartialAsFunctional:false});
  assert.equal(r.denominator,3);assert.equal(r.duplicatePointIds,1);assert.equal(r.counts.failed,1);assert.equal(r.counts.unknown,1);assert.equal(r.counts.missing,1);
  assert.equal(evaluate({includePartialAsFunctional:false}).passed,true);
  assert.equal(evaluate({includePartialAsFunctional:true}).passed,false);
});
