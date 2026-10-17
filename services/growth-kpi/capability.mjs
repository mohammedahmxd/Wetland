import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {readPackage,registerPackageResources,registerReadOnlyTool} from '@wetland/mcp-runtime';
import {loadDataset,growthReport} from './model.mjs';
export const root=new URL('./',import.meta.url);
export function validateDraft(p){
 z.object({reportTitle:z.string().min(1).max(120).regex(/^[^\r\n]+$/),defaultTarget:z.number().int().positive().max(10000000),definitionVersion:z.literal('growth-first-receipt-v1')}).strict().parse(p.config);
 if(p.manifest.dataClassification!=='synthetic')throw Error('This capability only serves synthetic data');
 if(!p.guidance.trim()||p.guidance.length>30000)throw Error('Guidance must contain 1–30000 characters');return p;
}
export async function createServer(){
 const pkg=validateDraft(await readPackage(root)),server=new McpServer({name:pkg.manifest.id,version:pkg.manifest.version});registerPackageResources(server,pkg);
 const schema={start:z.string(),end:z.string(),target:z.number().int().positive().optional(),comparisonStart:z.string().optional(),comparisonEnd:z.string().optional()};
 const run=async input=>{const r=growthReport(await loadDataset(),{...input,target:input.target??pkg.config.defaultTarget});r.markdown=r.markdown.replace('# Growth KPI report','# '+pkg.config.reportTitle);return {...r,packageVersion:pkg.manifest.version,packageDigest:pkg.digest,guidance:pkg.guidance};};
 const tool=(name,description,inputSchema,handler)=>registerReadOnlyTool(server,name,{description,inputSchema},handler,{exposeErrors:true});
 tool('inspect_growth_dataset','Inspect the fixed synthetic export and complete-history assertion.',{},async()=> (await loadDataset()).manifest);
 tool('get_metric_definition','Read executable counting policy and configuration; guidance edits do not change calculations.',{},async()=>{const r=await run({start:'2026-07-01',end:'2026-09-30'});return {version:r.definitionVersion,definition:r.definition,configuration:pkg.config,packageDigest:pkg.digest};});
 tool('generate_growth_report','Calculate an auditable new-donor report. Inclusive dates; optional target defaults to approved configuration. Synthetic data only.',schema,run);
 tool('explain_growth_result','Return reconciliation and synthetic donor cohort for the requested report; no live donor data.',schema,async input=>{const r=await run(input);return {actual:r.actual,definition:r.definition,quality:r.quality,cohort:r.cohort,sourceHashes:r.sourceHashes,packageDigest:pkg.digest};});
 return server;
}
