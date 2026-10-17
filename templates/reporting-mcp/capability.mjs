import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {readFile} from 'node:fs/promises';
import {readPackage,registerPackageResources,registerReadOnlyTool} from '@wetland/mcp-runtime';
export function validateDraft(p){z.object({heading:z.string().min(1).max(120),target:z.number().int().positive()}).strict().parse(p.config);if(!p.guidance.trim()||p.guidance.length>30000)throw Error('Guidance required (max 30000 characters)');return p;}
export function calculate(records,target){const ids=new Set();for(const r of records){if(!r.id||!['complete','pending'].includes(r.status))throw Error('Invalid record');if(r.status==='complete')ids.add(r.id);}return {actual:ids.size,target,attainmentPercent:100*ids.size/target};}
export async function createServer(){const p=validateDraft(await readPackage(new URL('./',import.meta.url))),s=new McpServer({name:p.manifest.id,version:p.manifest.version});registerPackageResources(s,p);registerReadOnlyTool(s,'generate_report',{description:'Count completed sample records against a target. Replace with a tested domain calculation.',inputSchema:{target:z.number().int().positive().optional()}},async input=>({heading:p.config.heading,...calculate(JSON.parse(await readFile(new URL('./sample.json',import.meta.url),'utf8')),input.target??p.config.target),synthetic:true,packageDigest:p.digest}));return s;}
