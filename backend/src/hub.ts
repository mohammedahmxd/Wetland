import type {FastifyInstance} from 'fastify';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {pool,transaction,audit} from './db.js';
const uuid=z.uuid(),text=z.string().trim().min(1).max(12000);
const documentPayload=z.object({heading:text.max(200),body:text}).strict();
const toolPayload=z.object({name:z.string().regex(/^[a-z][a-z0-9_]{2,63}$/),description:text.max(2000),implementation:z.literal('extractive-report-v1'),includeGaps:z.boolean(),documentVersionId:uuid}).strict();
const SUITE='hub-contract-1';
type C={org:string;subject:string;role:string};
function fail(code:number,message:string):never{throw Object.assign(new Error(message),{statusCode:code})}
function allow(c:C,roles:string[]){if(!roles.includes(c.role))fail(403,'Role does not permit this action')}
export function registerHub(api:FastifyInstance,context:(req:any)=>C){
 async function resource(c:C,id:string,db:any=pool,lock=false){const r=(await db.query('SELECT * FROM hub_resources WHERE id=$1 AND organization_id=$2'+(lock?' FOR UPDATE':''),[uuid.parse(id),c.org])).rows[0];if(!r)fail(404,'Resource not found');return r}
 async function version(c:C,id:string,db:any=pool){const v=(await db.query('SELECT * FROM hub_versions WHERE id=$1 AND organization_id=$2',[uuid.parse(id),c.org])).rows[0];if(!v)fail(404,'Version not found');return v}
 function owner(c:C,r:any){allow(c,['maintainer']);if(r.owner!==c.subject)fail(403,'Assigned resource owner required')}
 api.get('/api/orgs/:orgId/hub/resources',async req=>{
  const c=context(req);allow(c,['staff','maintainer','approver']);
  const after=z.uuid().optional().parse((req.query as any).after);
  const rows=(await pool.query('SELECT * FROM hub_resources WHERE organization_id=$1 AND ($2::uuid IS NULL OR id>$2::uuid) ORDER BY id LIMIT 101',[c.org,after||null])).rows;
  return {items:rows.slice(0,100),nextCursor:rows.length>100?rows[99].id:null};
 });
 api.post('/api/orgs/:orgId/hub/resources',async(req,reply)=>{
  const c=context(req);allow(c,['maintainer']);
  const b=z.object({kind:z.enum(['document','tool']),name:text.max(160)}).strict().parse(req.body);
  return reply.code(201).send(await transaction(async db=>{const id=randomUUID();const r=(await db.query('INSERT INTO hub_resources(id,organization_id,kind,name,owner) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,c.org,b.kind,b.name,c.subject])).rows[0];await audit(db,c.org,c.subject,'hub.resource.created',id,{kind:b.kind});return r}));
 });
 api.get('/api/orgs/:orgId/hub/resources/:resourceId',async req=>{
  const c=context(req);allow(c,['staff','maintainer','approver']);const r=await resource(c,(req.params as any).resourceId);
  const versions=(await pool.query('SELECT * FROM hub_versions WHERE organization_id=$1 AND resource_id=$2 ORDER BY created_at DESC LIMIT 100',[c.org,r.id])).rows;
  return {...r,versions};
 });
 api.post('/api/orgs/:orgId/hub/resources/:resourceId/versions',async(req,reply)=>{
  const c=context(req);allow(c,['maintainer']);
  const b=z.object({expectedRevision:z.number().int().positive(),payload:z.unknown()}).strict().parse(req.body);
  return reply.code(201).send(await transaction(async db=>{
   const r=await resource(c,(req.params as any).resourceId,db,true);owner(c,r);
   if(r.revision!==b.expectedRevision)fail(409,'Resource changed; reload before saving');
   const payload=r.kind==='document'?documentPayload.parse(b.payload):toolPayload.parse(b.payload);
   let dependency:string|null=null;
   if('documentVersionId' in payload){
    const dv=await version(c,payload.documentVersionId,db),dr=await resource(c,dv.resource_id,db);
    if(dr.kind!=='document'||dr.active_version_id!==dv.id)fail(409,'Pin the currently published document version');
    dependency=dv.id;
   }
   const id=randomUUID(),digest=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
   const v=(await db.query('INSERT INTO hub_versions(id,organization_id,resource_id,payload,digest,created_by,dependency_version_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[id,c.org,r.id,payload,digest,c.subject,dependency])).rows[0];
   await db.query('UPDATE hub_resources SET revision=revision+1 WHERE id=$1 AND organization_id=$2',[r.id,c.org]);
   await audit(db,c.org,c.subject,'hub.version.created',id,{digest});return v;
  }));
 });
 api.post('/api/orgs/:orgId/hub/versions/:versionId/evaluate',async(req,reply)=>{
  const c=context(req),v=await version(c,(req.params as any).versionId),r=await resource(c,v.resource_id);owner(c,r);
  const results=r.kind==='document'?[{name:'Heading and guidance present',pass:documentPayload.safeParse(v.payload).success}]:[
   {name:'Approved implementation and schema',pass:toolPayload.safeParse(v.payload).success},
   {name:'Missing-information review enabled',pass:v.payload.includeGaps===true},
   {name:'Document dependency pinned',pass:!!v.dependency_version_id}
  ];
  return reply.code(201).send(await transaction(async db=>{
   const id=randomUUID(),passed=results.every(x=>x.pass);
   const e=(await db.query('INSERT INTO hub_evaluations(id,organization_id,version_id,suite,passed,results,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[id,c.org,v.id,SUITE,passed,JSON.stringify(results),c.subject])).rows[0];
   await audit(db,c.org,c.subject,'hub.version.evaluated',v.id,{evaluationId:id,passed});return e;
  }));
 });
 api.post('/api/orgs/:orgId/hub/versions/:versionId/approve',async(req,reply)=>{
  const c=context(req);allow(c,['approver']);const b=z.object({evaluationId:uuid,rationale:text.max(4000)}).strict().parse(req.body);
  return reply.code(201).send(await transaction(async db=>{
   const v=await version(c,(req.params as any).versionId,db);
   if(v.created_by===c.subject)fail(403,'Independent approval required');
   const e=(await db.query('SELECT * FROM hub_evaluations WHERE id=$1 AND version_id=$2 AND organization_id=$3',[b.evaluationId,v.id,c.org])).rows[0];
   if(!e?.passed||e.suite!==SUITE)fail(409,'Passing current evaluation for this version required');
   const id=randomUUID();const a=(await db.query('INSERT INTO hub_approvals(id,organization_id,version_id,evaluation_id,approved_by,rationale) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,c.org,v.id,e.id,c.subject,b.rationale])).rows[0];
   await audit(db,c.org,c.subject,'hub.version.approved',v.id,{approvalId:id});return a;
  }));
 });
 api.post('/api/orgs/:orgId/hub/resources/:resourceId/activate',async(req,reply)=>{
  const c=context(req);const b=z.object({versionId:uuid,expectedActiveVersionId:uuid.nullable(),reason:text.max(4000)}).strict().parse(req.body);
  return reply.code(201).send(await transaction(async db=>{
   const r=await resource(c,(req.params as any).resourceId,db,true);owner(c,r);
   if(r.active_version_id!==b.expectedActiveVersionId||r.active_version_id===b.versionId)fail(409,'Active version changed or already active');
   const v=await version(c,b.versionId,db);if(v.resource_id!==r.id)fail(400,'Version belongs to another resource');
   if(!(await db.query('SELECT 1 FROM hub_approvals a JOIN hub_evaluations e ON e.id=a.evaluation_id AND e.version_id=a.version_id WHERE a.organization_id=$1 AND a.version_id=$2 AND e.passed AND e.suite=$3',[c.org,v.id,SUITE])).rowCount)fail(409,'Approved version with current evaluation required');
   await db.query('UPDATE hub_resources SET active_version_id=$1,revision=revision+1 WHERE id=$2 AND organization_id=$3',[v.id,r.id,c.org]);
   await audit(db,c.org,c.subject,'hub.resource.activated',r.id,{versionId:v.id,previousVersionId:r.active_version_id,reason:b.reason});
   return {activeVersionId:v.id,previousVersionId:r.active_version_id};
  }));
 });
}
