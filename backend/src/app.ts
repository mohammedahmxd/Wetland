import { registerHub } from './hub.js';
import Fastify from 'fastify';
import { randomUUID, createHash } from 'node:crypto';
import { z, ZodError } from 'zod';
import { pool, transaction, audit } from './db.js';
import { createVerifier } from './auth.js';
import { reportConfiguration, reportInput, report, evaluate, SUITE } from './report.js';

const uuid = z.uuid();
const text = z.string().trim().min(1).max(4000);
type Context = { org:string; subject:string; role:string };
function fail(statusCode:number,message:string): never { throw Object.assign(new Error(message),{statusCode}); }
function allow(ctx:Context,roles:string[]) { if(!roles.includes(ctx.role)) fail(403,'Role does not permit this action'); }
export function createApp() {
  const verify = createVerifier();
  const app = Fastify({logger:false,bodyLimit:2*1024*1024});
  app.setErrorHandler((error,req,reply)=>{
    if(error instanceof ZodError) return reply.code(400).send({error:'Invalid input',issues:error.issues.map(i=>({path:i.path,message:i.message}))});
    const e=error as Error & {statusCode?:number;code?:string};
    if(e.code==='23505') return reply.code(409).send({error:'Record already exists'});
    const code=e.statusCode&&e.statusCode>=400&&e.statusCode<500?e.statusCode:500;
    if(code===500) console.error('Request failed',req.id,e.code||e.name);
    return reply.code(code).send({error:code===500?'Internal server error':e.message});
  });
  app.get('/healthz',async()=>({status:'ok'}));
  app.get('/readyz',async()=>{await pool.query('SELECT 1');return {status:'ready'};});
  app.register(async api=>{
    api.decorateRequest('identity',null);
    api.addHook('preHandler',async req=>{
      let identity; try {identity=await verify(req.headers.authorization);} catch {fail(401,'Valid bearer token required');}
      const org=uuid.parse((req.params as {orgId:string}).orgId);
      const result=await pool.query('SELECT role FROM members WHERE organization_id=$1 AND subject=$2',[org,identity.subject]);
      if(!result.rowCount) fail(403,'Organisation membership required');
      (req as any).identity={org,subject:identity.subject,role:result.rows[0].role};
    });
    const context=(req:any):Context=>req.identity;
    registerHub(api,context);
    api.get('/api/orgs/:orgId/me',async req=>context(req));
    api.get('/api/orgs/:orgId/requests',async req=>{
      const c=context(req);allow(c,['staff','maintainer','approver']);
      return (await pool.query('SELECT * FROM requests WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100',[c.org])).rows;
    });
    api.post('/api/orgs/:orgId/requests',async(req,reply)=>{
      const c=context(req);allow(c,['staff','maintainer']);
      const body=z.object({title:text.max(160),problem:text,acceptanceCriteria:text}).strict().parse(req.body);
      return reply.code(201).send(await transaction(async db=>{
        const id=randomUUID();const result=await db.query('INSERT INTO requests(id,organization_id,title,problem,acceptance_criteria,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,c.org,body.title,body.problem,body.acceptanceCriteria,c.subject]);
        await audit(db,c.org,c.subject,'request.created',id);return result.rows[0];
      }));
    });
    api.get('/api/orgs/:orgId/tools',async req=>(await pool.query('SELECT * FROM tools WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100',[context(req).org])).rows);
    api.post('/api/orgs/:orgId/tools',async(req,reply)=>{
      const c=context(req);allow(c,['maintainer']);
      const b=z.object({requestId:uuid,name:text.max(160),sponsor:text.max(200),maintainer:text.max(200),backupMaintainer:text.max(200),reviewDate:z.iso.date()}).strict().parse(req.body);
      if(b.maintainer===b.backupMaintainer) fail(400,'Backup must be a different maintainer');
      return reply.code(201).send(await transaction(async db=>{
        if(!(await db.query('SELECT 1 FROM requests WHERE id=$1 AND organization_id=$2',[b.requestId,c.org])).rowCount) fail(404,'Request not found');
        for(const [subject,roles] of [[b.sponsor,['staff','maintainer','approver']],[b.maintainer,['maintainer']],[b.backupMaintainer,['maintainer']]] as [string,string[]][]) {
          const member=(await db.query('SELECT role FROM members WHERE organization_id=$1 AND subject=$2',[c.org,subject])).rows[0];
          if(!member||!roles.includes(member.role)) fail(400,'Owner must be an organisation member with the required role');
        }
        if(c.subject!==b.maintainer&&c.subject!==b.backupMaintainer) fail(403,'Creating maintainer must own or back up the tool');
        const id=randomUUID();const result=await db.query('INSERT INTO tools(id,organization_id,request_id,name,sponsor,maintainer,backup_maintainer,review_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[id,c.org,b.requestId,b.name,b.sponsor,b.maintainer,b.backupMaintainer,b.reviewDate]);
        await audit(db,c.org,c.subject,'tool.created',id);return result.rows[0];
      }));
    });
    async function tool(c:Context,id:string,db:Pick<typeof pool,'query'>=pool,lock=false) {
      const row=(await db.query(`SELECT * FROM tools WHERE id=$1 AND organization_id=$2${lock?' FOR UPDATE':''}`,[uuid.parse(id),c.org])).rows[0];
      if(!row) fail(404,'Tool not found');return row;
    }
    function owns(c:Context,t:any) {allow(c,['maintainer']);if(c.subject!==t.maintainer&&c.subject!==t.backup_maintainer) fail(403,'Assigned maintainer required');}
    async function version(c:Context,id:string,db:Pick<typeof pool,'query'>=pool) {
      const row=(await db.query('SELECT * FROM versions WHERE id=$1 AND organization_id=$2',[uuid.parse(id),c.org])).rows[0];if(!row) fail(404,'Version not found');return row;
    }
    api.get('/api/orgs/:orgId/tools/:toolId',async req=>{
      const c=context(req), id=(req.params as any).toolId, t=await tool(c,id);
      const versions=(await pool.query('SELECT * FROM versions WHERE tool_id=$1 AND organization_id=$2 ORDER BY created_at DESC LIMIT 100',[id,c.org])).rows;
      const deployments=(await pool.query('SELECT * FROM deployments WHERE tool_id=$1 AND organization_id=$2 ORDER BY created_at DESC LIMIT 100',[id,c.org])).rows;
      return {...t,versions,deployments};
    });
    api.post('/api/orgs/:orgId/tools/:toolId/versions',async(req,reply)=>{
      const c=context(req);allow(c,['contributor','maintainer']);
      const id=(req.params as any).toolId;await tool(c,id);
      const b=z.object({implementation:z.literal('kijana-report-v1'),releaseLabel:text.max(100),configuration:reportConfiguration}).strict().parse(req.body);
      const digest=createHash('sha256').update(JSON.stringify(b)).digest('hex');
      return reply.code(201).send(await transaction(async db=>{
        const versionId=randomUUID();const result=await db.query('INSERT INTO versions(id,tool_id,organization_id,implementation,configuration,digest,created_by,release_label) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[versionId,id,c.org,b.implementation,b.configuration,digest,c.subject,b.releaseLabel]);
        await audit(db,c.org,c.subject,'version.created',versionId,{digest});return result.rows[0];
      }));
    });
    api.post('/api/orgs/:orgId/versions/:versionId/evaluate',async(req,reply)=>{
      const c=context(req),v=await version(c,(req.params as any).versionId);owns(c,await tool(c,v.tool_id));
      // Runs only our bundled implementation and suite, never contributor-provided code.
      const result=evaluate(reportConfiguration.parse(v.configuration));
      return reply.code(201).send(await transaction(async db=>{
        const id=randomUUID();const saved=await db.query('INSERT INTO evaluations(id,version_id,organization_id,suite_version,passed,results,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[id,v.id,c.org,result.suite,result.passed,JSON.stringify(result.results),c.subject]);
        await audit(db,c.org,c.subject,'version.evaluated',v.id,{evaluationId:id,passed:result.passed});return saved.rows[0];
      }));
    });
    api.get('/api/orgs/:orgId/versions/:versionId/evaluations',async req=>{
      const c=context(req),v=await version(c,(req.params as any).versionId);
      return (await pool.query('SELECT * FROM evaluations WHERE version_id=$1 AND organization_id=$2 ORDER BY created_at DESC LIMIT 100',[v.id,c.org])).rows;
    });
    api.post('/api/orgs/:orgId/versions/:versionId/approve',async(req,reply)=>{
      const c=context(req);allow(c,['approver']);
      const b=z.object({evaluationId:uuid,rationale:text}).strict().parse(req.body);
      return reply.code(201).send(await transaction(async db=>{
        const v=await version(c,(req.params as any).versionId,db);
        if(v.created_by===c.subject) fail(403,'A different person must approve the candidate');
        const e=(await db.query('SELECT * FROM evaluations WHERE id=$1 AND version_id=$2 AND organization_id=$3',[b.evaluationId,v.id,c.org])).rows[0];
        if(!e||!e.passed||e.suite_version!==SUITE) fail(409,'Passing current evaluation required');
        const id=randomUUID();const result=await db.query('INSERT INTO approvals(id,version_id,organization_id,evaluation_id,approved_by,rationale) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,v.id,c.org,e.id,c.subject,b.rationale]);
        await audit(db,c.org,c.subject,'version.approved',v.id,{approvalId:id});return result.rows[0];
      }));
    });
    api.post('/api/orgs/:orgId/tools/:toolId/activate',async(req,reply)=>{
      const c=context(req);const b=z.object({versionId:uuid,expectedActiveVersionId:uuid.nullable(),reason:text}).strict().parse(req.body);
      return reply.code(201).send(await transaction(async db=>{
        const t=await tool(c,(req.params as any).toolId,db,true);owns(c,t);
        if(t.active_version_id!==b.expectedActiveVersionId) fail(409,'Active version changed; refresh before activating');
        if(t.active_version_id===b.versionId) fail(409,'Version already active');
        const v=await version(c,b.versionId,db);if(v.tool_id!==t.id) fail(400,'Version belongs to another tool');
        const approval=await db.query('SELECT 1 FROM approvals a JOIN evaluations e ON e.id=a.evaluation_id WHERE a.version_id=$1 AND a.organization_id=$2 AND e.passed AND e.suite_version=$3',[v.id,c.org,SUITE]);
        if(!approval.rowCount) fail(409,'Approved version with current evaluation required');
        const id=randomUUID();await db.query('INSERT INTO deployments(id,tool_id,organization_id,version_id,previous_version_id,activated_by,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,t.id,c.org,v.id,t.active_version_id,c.subject,b.reason]);
        await db.query('UPDATE tools SET active_version_id=$1 WHERE id=$2 AND organization_id=$3',[v.id,t.id,c.org]);
        await audit(db,c.org,c.subject,'tool.activated',t.id,{versionId:v.id,previousVersionId:t.active_version_id});
        return {deploymentId:id,activeVersionId:v.id,previousVersionId:t.active_version_id};
      }));
    });
    api.post('/api/orgs/:orgId/tools/:toolId/run',async req=>{
      const c=context(req);allow(c,['staff','maintainer','approver']);const input=reportInput.parse(req.body);
      return transaction(async db=>{
        const t=await tool(c,(req.params as any).toolId,db);if(!t.active_version_id) fail(409,'No approved active version');
        const v=await version(c,t.active_version_id,db);
        const output=report(input,reportConfiguration.parse(v.configuration));
        await audit(db,c.org,c.subject,'tool.executed',t.id,{versionId:v.id,pointCount:output.denominator});
        return {...output,versionId:v.id,digest:v.digest};
      });
    });
    api.get('/api/orgs/:orgId/audit',async req=>{
      const c=context(req);allow(c,['maintainer','approver']);
      const after=z.coerce.number().int().nonnegative().default(0).parse((req.query as any).after);
      return (await pool.query('SELECT * FROM audit_events WHERE organization_id=$1 AND id>$2 ORDER BY id LIMIT 100',[c.org,after])).rows;
    });
  });
  return app;
}
