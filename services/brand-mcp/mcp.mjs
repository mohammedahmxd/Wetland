import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {z} from 'zod';
export const publicBase = new URL(process.env.PUBLIC_BASE_URL || 'https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app');
if(!['http:','https:'].includes(publicBase.protocol)) throw new Error('PUBLIC_BASE_URL must be HTTP(S)');
const root=path.resolve('dist');
const read = file=>readFile(path.join(root,file),'utf8');
const absolute = value=>new URL(value,publicBase).href;
function resolveLinks(value,key='') {
 if(Array.isArray(value))return value.map(v=>resolveLinks(v,key));
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolveLinks(v,k)]));
 if(typeof value==='string' && /^(url|uri|href|localSvg|recommendedPng|downloadUrl|sourceUrl|previewUrl|licenseUrl|referenceUrl|starterUrl|instructionsUrl)$/i.test(key))return absolute(value);
 return value;
}
const json=async file=>resolveLinks(JSON.parse(await read(file)));
const response=data=>({content:[{type:'text',text:JSON.stringify(data,null,2)}],structuredContent:data});
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
export function createBrandServer(){
 const server=new McpServer({name:'wateraid-brand-hub',version:'0.3.0'});
 server.registerTool('get_brand_system',{description:'Read the current brand tokens, evidence status and source brief. Use before ALL WaterAid-reference work, including PDFs and documents. For PDFs also call get_document_guidance.',inputSchema:{},annotations},async()=>response({tokens:await json('v1/tokens.json'),brief:await read('brand-brief.md'),baseUrl:publicBase.href}));
 server.registerTool('list_assets',{description:'List available brand artwork, original sources, local SVGs, PNG sizes and provenance hashes. Optional query filters the catalogue.',inputSchema:{query:z.string().max(200).optional()},annotations},async({query})=>{const assets=await json('v1/assets.json');return response({assets:query?assets.filter(a=>JSON.stringify(a).toLowerCase().includes(query.toLowerCase())):assets});});
 server.registerTool('get_asset',{description:'Get one asset by exact catalogue ID, including absolute SVG/PNG URLs and source provenance. Does not fetch arbitrary files.',inputSchema:{id:z.string().min(1).max(100)},annotations},async({id})=>{const asset=(await json('v1/assets.json')).find(a=>a.id===id);return asset?response({asset}):{isError:true,content:[{type:'text',text:'Unknown asset ID. Use list_assets to discover available assets.'}]};});
 server.registerTool('get_ui_guidance',{description:'Read the current UI and presentation brand brief with tokens and official source links. Guidance includes evidence labels and asset usage limits.',inputSchema:{},annotations},async()=>response({guidance:await read('brand-brief.md'),tokens:await json('v1/tokens.json'),sources:await json('v1/sources.json')}));
 server.registerTool('get_document_guidance',{description:'REQUIRED before generating any PDF, report, one-pager or document. Returns the default layout, reference PDF, reusable generator, asset embedding rules and export validation checklist.',inputSchema:{},annotations},async()=>response({profile:await json('v1/document-profile.json'),instructions:await read('documents/agent-document-instructions.txt'),tokens:await json('v1/tokens.json'),assets:await json('v1/assets.json')}));
 for(const [name,file,mime] of [['brand-tokens','v1/tokens.json','application/json'],['brand-assets','v1/assets.json','application/json'],['brand-brief','brand-brief.md','text/markdown'],['document-profile','v1/document-profile.json','application/json']]){
  const uri=absolute(file);server.registerResource(name,uri,{description:`Current ${name}, read-only`,mimeType:mime},async()=>({contents:[{uri,mimeType:mime,text:mime==='application/json'?JSON.stringify(await json(file),null,2):await read(file)}]}));
 }
 return server;
}
export async function handleMcp(req,res){
 if(req.method!=='POST'){res.writeHead(405,{'Allow':'POST','Content-Type':'application/json'});return res.end(JSON.stringify({jsonrpc:'2.0',error:{code:-32000,message:'Use POST for this stateless MCP endpoint.'},id:null}));}
 const origin=req.headers.origin;
 if(origin && origin!==publicBase.origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)){res.writeHead(403);return res.end('Origin not allowed');}
 const server=createBrandServer();const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
 res.on('close',()=>{void transport.close();void server.close();});
 try{await server.connect(transport);await transport.handleRequest(req,res);}catch{if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({jsonrpc:'2.0',error:{code:-32603,message:'Unable to read brand resources.'},id:null}));}}
}
