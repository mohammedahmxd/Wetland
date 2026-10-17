import {createHash} from 'node:crypto';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {readPackage,registerPackageResources,registerReadOnlyTool} from '@wetland/mcp-runtime';
import {loadDataset,growthReport} from './model.mjs';
import {loadSkills,findSkills,getSkill} from '@wetland/mcp-skills';
import {createGrowthWorkflow} from './workflow.mjs';
export const root=new URL('./',import.meta.url);
export const allowedSkillTools=['inspect_growth_dataset','get_metric_definition','calculate_growth','generate_growth_report','explain_growth_result'];
export function validateDraft(p){
 z.object({reportTitle:z.string().min(1).max(120).regex(/^[^\r\n]+$/),defaultTarget:z.number().int().positive().max(10000000),definitionVersion:z.literal('growth-first-receipt-v1')}).strict().parse(p.config);
 if(p.manifest.dataClassification!=='synthetic')throw Error('This capability only serves synthetic data');
 if(!p.guidance.trim()||p.guidance.length>30000)throw Error('Guidance must contain 1–30000 characters');return p;
}
export async function calculateGrowth(input){
 const pkg=validateDraft(await readPackage(root));
 const r=growthReport(await loadDataset(),{...input,target:input.target??pkg.config.defaultTarget});
 const {markdown,...calculation}=r;
 return {...calculation,title:pkg.config.reportTitle,packageVersion:pkg.manifest.version,packageDigest:pkg.digest};
}
export async function createServer({reportGenerator,identity,workflowSigningSecret}={}){
 const pkg=validateDraft(await readPackage(root)),server=new McpServer({name:pkg.manifest.id,version:pkg.manifest.version});registerPackageResources(server,pkg);
 const schema={start:z.string(),end:z.string(),target:z.number().int().positive().optional(),comparisonStart:z.string().optional(),comparisonEnd:z.string().optional()};
 const run=calculateGrowth;
 const generate=reportGenerator||((await import('./reports.mjs')).generateReport);
 const tool=(name,description,inputSchema,handler)=>registerReadOnlyTool(server,name,{description,inputSchema},handler,{exposeErrors:true});
 tool('inspect_growth_dataset','Inspect the fixed synthetic export and complete-history assertion.',{},async()=> (await loadDataset()).manifest);
 tool('get_metric_definition','Read executable counting policy and configuration; guidance edits do not change calculations.',{},async()=>{const r=await run({start:'2026-07-01',end:'2026-09-30'});return {version:r.definitionVersion,definition:r.definition,configuration:pkg.config,packageDigest:pkg.digest};});
 tool('calculate_growth','Return structured Growth figures and evidence only, without generating a document. Available when Brand is unavailable.',schema,run);
 tool('generate_growth_report','REQUIRED for finished reports: fetches Brand MCP guidance, embeds approved reference assets and fonts, renders and validates PDF/HTML. Fails if Brand is unavailable or changed. Return the generated links; do not substitute an independently formatted report.',schema,generate);
 tool('explain_growth_result','Return reconciliation and synthetic donor cohort for the requested report; no live donor data.',schema,async input=>{const r=await run(input);return {actual:r.actual,definition:r.definition,quality:r.quality,cohort:r.cohort,sourceHashes:r.sourceHashes,packageDigest:pkg.digest};});
 const allowedTools=['inspect_growth_dataset','get_metric_definition','calculate_growth','generate_growth_report','explain_growth_result','find_skills','get_skill','start_workflow','get_workflow_step','advance_workflow'];
 const skills=await loadSkills(root,{allowedTools}),skill=getSkill(skills,{id:'growth-reporting'});
 const dataset=await loadDataset();
 const binding={packageDigest:pkg.digest,datasetDigest:createHash('sha256').update(JSON.stringify(dataset.manifest)).digest('hex')};
 const workflow=createGrowthWorkflow({skill,calculate:run,generate,identity,secret:workflowSigningSecret,binding});
 tool('find_skills','Find repository-reviewed skills for this Growth service.',{query:z.string().max(200).optional()},async input=>({skills:findSkills(skills,input)}));
 tool('get_skill','Read a reviewed skill and its version, source and instructions.',{id:z.string(),version:z.string().optional()},async input=>getSkill(skills,input));
 tool('start_workflow','Start the guided Growth workflow. Returns missing inputs before calculation. Synthetic, read-only and replayable.',{start:z.string().optional(),end:z.string().optional(),target:z.number().int().positive().max(10000000).optional()},async input=>workflow.start(input));
 tool('get_workflow_step','Inspect the next server-controlled workflow step. Requires the signed token issued to this caller.',{token:z.string().max(50000)},async({token})=>workflow.get(token));
 tool('advance_workflow','Run the next server-controlled step. No client evidence or approvals are accepted. Report links appear only after Brand and artifact checks.',{token:z.string().max(50000)},async({token})=>workflow.advance(token));
 return server;
}
