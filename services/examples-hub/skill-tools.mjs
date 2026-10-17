import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {registerReadOnlyTool} from '@wetland/mcp-runtime';
import {loadSkills,findSkills,getSkill} from '@wetland/mcp-skills/catalogue';
import {createWorkflowEngine} from '@wetland/mcp-skills/workflow';
const localSecret=randomBytes(32).toString('hex');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const skillToolNames=['find_skills','get_skill','start_workflow','get_workflow_step','advance_workflow'];
export async function registerExampleSkills(server,{root,pkg,scope,identity,secret,definitions,evaluateTool}){
 const allTools=Object.keys(definitions);
 const all=await loadSkills(root,{allowedTools:allTools});
 const skills=scope?all.filter(s=>s.tools.every(t=>t===scope)):all;
 const subject=identity?`${identity.tenantId||'local'}:${identity.subject}`:'anonymous-synthetic';
 const signingSecret=secret||process.env.MCP_WORKFLOW_SECRET||localSecret;
 const tool=(name,description,inputSchema,handler)=>registerReadOnlyTool(server,name,{description,inputSchema},handler,{exposeErrors:true});
 const skillFor=id=>getSkill(skills,{id});
 const engineFor=id=>{const skill=skillFor(id);if(skill.tools.length!==1)throw Error('Example workflow requires one reviewed tool');const name=skill.tools[0];
  const run=context=>evaluateTool(name,context,pkg);
  return createWorkflowEngine({secret:signingSecret,skill:{id:skill.id,version:skill.version,digest:skill.digest},binding:{packageDigest:pkg.digest},validateContext:raw=>definitions[name].schema.parse(raw),steps:[
   {id:'check-evidence',run:async({context})=>{const result=run(context);return {evidence:{digest:hash(result)},result:{message:'Source-backed synthetic result checked. Continue to retrieve it.',sourceIds:result.sources.map(s=>s.id),classification:'synthetic'}};},validateEvidence:async(proof,{context})=>proof.digest===hash(run(context))},
   {id:'return-advice',run:async({context})=>{const result=run(context);return {evidence:{digest:hash(result)},result};},validateEvidence:async(proof,{context})=>proof.digest===hash(run(context))}
  ]});};
 tool('find_skills','Find approved Markdown playbooks for this connected capability. Call this before choosing a guided workflow.',{query:z.string().max(500).default('')},a=>({skills:findSkills(skills,a)}));
 tool('get_skill','Retrieve versioned Markdown instructions, required tools and expected output. Instructions do not grant permissions.',{id:z.string().max(100),version:z.string().max(30).optional()},a=>getSkill(skills,a));
 tool('start_workflow','Start a signed synthetic advisory workflow using JSON inputs for its required tool. No approvals or account changes occur.',{skillId:z.string().max(100),inputsJson:z.string().max(16000).default('{}')},async a=>{const skill=skillFor(a.skillId);const inputs=JSON.parse(a.inputsJson);const parsed=definitions[skill.tools[0]].schema.safeParse(inputs);if(!parsed.success)return {status:'needs-input',skillId:skill.id,issues:parsed.error.issues.map(i=>({path:i.path,message:i.message}))};return {...await engineFor(skill.id).start({subject,context:inputs}),skill:{id:skill.id,version:skill.version,digest:skill.digest}};});
 for(const [name,method]of [['get_workflow_step','getStep'],['advance_workflow','advance']])tool(name,name==='advance_workflow'?'Execute the next server-checked step. Only this service calculates evidence; caller assertions cannot approve anything.':'Inspect the next step of an unchanged, unexpired workflow.',{skillId:z.string().max(100),token:z.string().max(65536)},async a=>engineFor(a.skillId)[method]({subject,token:a.token}));
}
