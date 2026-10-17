import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {createWorkflowEngine} from '@wetland/mcp-skills/workflow';
import {day} from './model.mjs';
const localSecret=randomBytes(32).toString('hex');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const hex=/^[a-f0-9]{64}$/;
const contextSchema=z.object({start:z.string(),end:z.string(),target:z.number().int().positive().max(10000000)}).strict();
export function workflowSubject(identity){
 if(!identity)return 'synthetic-demo';
 if(typeof identity.tenantId!=='string'||typeof identity.subject!=='string')throw Error('Workflow identity is incomplete');
 return identity.tenantId+':'+identity.subject;
}
export function workflowSecret({http=false,env=process.env}={}){
 const secret=env.MCP_WORKFLOW_SECRET;
 if(secret&&Buffer.byteLength(secret)>=32)return secret;
 if(http||secret)throw Error('MCP_WORKFLOW_SECRET must contain at least 32 bytes for HTTP workflows');
 return localSecret;
}
function validateArtifact(report,calculation,baseUrl){
 if(report.synthetic!==true||report.start!==calculation.start||report.end!==calculation.end||report.target!==calculation.target||report.actual!==calculation.actual||report.packageDigest!==calculation.packageDigest)throw Error('Report differs from the verified calculation');
 const brand=report.brand,checks=brand?.checks;
 if(!hex.test(report.artifactId||'')||!hex.test(brand?.snapshotDigest||'')||!hex.test(brand?.pdfSha256||'')||!hex.test(brand?.htmlSha256||'')||!brand.profileVersion||!brand.rendererVersion||checks?.pageCount!==1||!Number.isInteger(checks.embeddedFontCount)||checks.embeddedFontCount<3||checks.logoEmbedded!==true||checks.boundsChecked!==true||checks.rendered!==true)throw Error('Required Brand and artifact validation evidence is missing');
 if(!baseUrl)throw Error('PUBLIC_BASE_URL is required for report release');
 for(const format of ['pdf','html']){
  const url=new URL(report.downloads?.[format]);
  if(url.origin!==new URL(baseUrl).origin||url.pathname!==`/reports/growth.${format}`||url.searchParams.get('artifact')!==report.artifactId||url.username||url.password)throw Error('Report link is outside this service or artifact');
 }
 return {artifactId:report.artifactId,brandDigest:brand.snapshotDigest,pdfSha256:brand.pdfSha256,htmlSha256:brand.htmlSha256};
}
export function createGrowthWorkflow({skill,calculate,generate,identity,secret=workflowSecret(),baseUrl=process.env.PUBLIC_BASE_URL,binding={}}){
 const subject=workflowSubject(identity);
 const engine=createWorkflowEngine({secret,binding,skill:{id:skill.id,version:skill.version,digest:skill.digest},validateContext:async raw=>{const c=contextSchema.parse(raw);day(c.start);day(c.end);if(c.start>c.end)throw Error('Start must precede end');return c;},steps:[
  {id:'calculate',run:async({context})=>{const r=await calculate(context);return {evidence:{digest:hash(r)},result:{actual:r.actual,target:r.target,attainmentPercent:r.attainmentPercent,gapToTarget:r.gapToTarget,definition:r.definition}};},validateEvidence:async p=>hex.test(p?.digest||'')},
  {id:'brand_validation',run:async({context,evidence})=>{const r=await calculate(context);if(hash(r)!==evidence.calculate.digest)throw Error('Calculation changed; restart the workflow');const report=await generate(context);return {evidence:validateArtifact(report,r,baseUrl),result:{message:'Brand-dependent PDF and HTML passed validation. Advance to revalidate and release the links.',brandProfile:report.brand.profileVersion,checks:report.brand.checks}};},validateEvidence:async p=>['artifactId','brandDigest','pdfSha256','htmlSha256'].every(k=>hex.test(p?.[k]||''))},
  {id:'release',run:async({context,evidence})=>{const r=await calculate(context);if(hash(r)!==evidence.calculate.digest)throw Error('Calculation changed; restart the workflow');const report=await generate(context),proof=validateArtifact(report,r,baseUrl);if(hash(proof)!==hash(evidence.brand_validation))throw Error('Brand or artifact changed; restart the workflow');return {evidence:proof,result:report};},validateEvidence:async(p,{evidence})=>hash(p)===hash(evidence.brand_validation)}
 ]});
 const withSkill=r=>({...r,skill:{id:skill.id,version:skill.version,digest:skill.digest},replayPolicy:'Read-only synthetic workflow: a valid token may be replayed until expiry. It does not grant approval or mutate organisational records.'});
 return {
  async start(input){const allowed=z.object({start:z.string().optional(),end:z.string().optional(),target:z.number().int().positive().max(10000000).optional()}).strict().parse(input);const missing=['start','end','target'].filter(k=>allowed[k]===undefined||allowed[k]==='');if(missing.length)return withSkill({status:'needs_input',step:'collect_inputs',missingInputs:missing,message:'Supply start and end in YYYY-MM-DD and a positive integer target, then call start_workflow again.'});return withSkill(await engine.start({subject,context:allowed}));},
  async get(token){return withSkill(await engine.getStep({subject,token}));},
  async advance(token){return withSkill(await engine.advance({subject,token}));}
 };
}
