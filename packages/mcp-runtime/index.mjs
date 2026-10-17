export {authorizationFromEnv,createEntraAuthorizer} from './entra.mjs';
import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
export const readOnly={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
export const jsonResult=value=>({content:[{type:'text',text:JSON.stringify(value,null,2)}],structuredContent:value});
export function validateManifest(m){
 if(m.schemaVersion!==1||!/^[-a-z0-9]{3,64}$/.test(m.id)||!/^\d+\.\d+\.\d+$/.test(m.version)||!['knowledge','reporting'].includes(m.type))throw Error('Invalid MCP manifest');
 for(const k of ['name','description','owner'])if(typeof m[k]!=='string'||!m[k].trim()||m[k].length>2000)throw Error('Invalid manifest '+k);
 if(!['public-reference','synthetic','private'].includes(m.dataClassification))throw Error('Explicit data classification required');
 return m;
}
export async function readPackage(root){
 const dir=root instanceof URL?fileURLToPath(root):path.resolve(root);
 const manifest=validateManifest(JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8')));
 const config=JSON.parse(await readFile(path.join(dir,'config.json'),'utf8'));
 const guidance=await readFile(path.join(dir,'knowledge/guidance.md'),'utf8');
 const digest=createHash('sha256').update(JSON.stringify({manifest,config,guidance})).digest('hex');
 return {manifest,config,guidance,digest};
}
export function registerPackageResources(server,pkg){
 for(const [name,value,mime] of [['manifest',JSON.stringify(pkg.manifest,null,2),'application/json'],['configuration',JSON.stringify(pkg.config,null,2),'application/json'],['guidance',pkg.guidance,'text/markdown']]){
  const uri=`wetland://${pkg.manifest.id}/${name}`;
  server.registerResource(name,uri,{mimeType:mime,description:`Released ${name}; package digest ${pkg.digest}`},async()=>({contents:[{uri,mimeType:mime,text:value}]}));
 }
}
export function registerReadOnlyTool(server,name,definition,handler,{exposeErrors=false}={}){
 server.registerTool(name,{...definition,annotations:readOnly},async input=>{
  try{return jsonResult(await handler(input));}catch(error){const id=randomUUID();console.error(JSON.stringify({event:'tool.failed',tool:name,id}));return {isError:true,content:[{type:'text',text:exposeErrors?error.message:`Tool failed. Reference ${id}`} ]};}
 });
}
export async function startStdio(createServer,Transport){const server=await createServer();await server.connect(new Transport());return server;}
export function createMcpHandler({createServer,Transport,publicBaseUrl,authorize,dataClassification='private'}){
 const origin=new URL(publicBaseUrl).origin;
 if(dataClassification==='private'&&!authorize)throw Error('Private HTTP services require an authorization adapter');
 return async(req,res)=>{
  if(req.method!=='POST'){res.writeHead(405,{Allow:'POST'});res.end('Use MCP POST');return;}
  if(req.headers.origin&&req.headers.origin!==origin){res.writeHead(403);res.end('Origin not allowed');return;}
  let identity;
  try{identity=authorize?await authorize(req):undefined;}catch{res.writeHead(503);res.end('Authentication unavailable');return;}
  if(authorize&&!identity){res.writeHead(401,{'WWW-Authenticate':'Bearer'});res.end('Unauthorized');return;}
  // A small bounded request body prevents unbounded buffering in the SDK.
  let size=0;const chunks=[];
  try{for await(const part of req){size+=part.length;if(size>1048576){res.writeHead(413);res.end('Request too large');return;}chunks.push(part);}}catch{res.writeHead(400);res.end('Invalid body');return;}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{res.writeHead(400);res.end('Invalid JSON');return;}
  const server=await createServer({identity}),transport=new Transport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.on('close',()=>{void transport.close();void server.close();});
  try{await server.connect(transport);await transport.handleRequest(req,res,body);}catch{if(!res.headersSent){res.writeHead(500);res.end('MCP request failed');}}
 };
}
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.md':'text/markdown','.txt':'text/plain','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.zip':'application/zip','.pdf':'application/pdf'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function startHttp({handler,manifest,staticRoot,beforeRequest,healthDetails={},port=Number(process.env.PORT||8080),host='0.0.0.0'}){
 const server=http.createServer(async(req,res)=>{try{
  res.setHeader('X-Content-Type-Options','nosniff');
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(beforeRequest&&await beforeRequest(req,res,pathname))return;
  if(pathname==='/mcp')return await handler(req,res);
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  if(['/healthz','/api/health'].includes(pathname)){res.writeHead(200,{'Content-Type':'application/json'});return res.end(req.method==='HEAD'?undefined:JSON.stringify({status:'ok',name:manifest.id,version:manifest.version,mcp:'/mcp',...healthDetails}));}
  if(pathname==='/manifest.json'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(req.method==='HEAD'?undefined:JSON.stringify(manifest));}
  if(!staticRoot&&pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"});return res.end(req.method==='HEAD'?undefined:`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>${esc(manifest.name)}</title><style>body{font:18px system-ui;max-width:760px;margin:60px auto;padding:24px;color:#151435}h1{color:#006bd9}code{background:#f0f3f6;padding:6px}</style><h1>${esc(manifest.name)}</h1><p>${esc(manifest.description)}</p><p>Version ${esc(manifest.version)} · ${esc(manifest.dataClassification)}</p><h2>Connect your agent</h2><p>Streamable HTTP endpoint: <code>/mcp</code>. Use an MCP client; browser GET requests return 405.</p><p>Owner: ${esc(manifest.owner)}</p><p>This service does not offer browser editing. Start the local studio from the source checkout to edit and test a draft.</p></html>`);}
  if(!staticRoot){res.writeHead(404);return res.end();}
  const root=await realpath(staticRoot);const file=await realpath(path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname)));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}});
 server.requestTimeout=15000;server.headersTimeout=10000;server.listen(port,host);return server;
}
