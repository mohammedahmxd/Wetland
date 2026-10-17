import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {readPackage,registerPackageResources,registerReadOnlyTool} from '@wetland/mcp-runtime';
export function validateDraft(p){z.object({heading:z.string().min(1).max(120)}).strict().parse(p.config);if(!p.guidance.trim()||p.guidance.length>30000)throw Error('Guidance required (max 30000 characters)');return p;}
export async function createServer(){const p=validateDraft(await readPackage(new URL('./',import.meta.url))),s=new McpServer({name:p.manifest.id,version:p.manifest.version});registerPackageResources(s,p);registerReadOnlyTool(s,'get_guidance',{description:'Read this package’s reviewed guidance.',inputSchema:{}},async()=>({heading:p.config.heading,guidance:p.guidance,packageDigest:p.digest}));return s;}
