import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {handleMcp} from './mcp.mjs';
import {loadMcpAuth} from './mcp-auth.mjs';
const root=path.resolve('dist');
const mcpAuth=loadMcpAuth(process.env);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.zip':'application/zip','.pdf':'application/pdf'};
http.createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(mcpAuth){const handled=await mcpAuth.handle(req,res,pathname);if(handled)return;}
 if(pathname==='/mcp'){if(mcpAuth && !(await mcpAuth.allow(req,res)))return;return await handleMcp(req,res);}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
 if(['/healthz','/api/health'].includes(pathname)){const payload={status:'ok',mcp:'/mcp'};if(mcpAuth)payload.auth={mode:'firebase',profile:mcpAuth.profile,emailDomains:mcpAuth.domains};res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(req.method==='HEAD'?'':JSON.stringify(payload));}
 const requested=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!requested.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 const file=await realpath(requested);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'public, max-age=300'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log(`Brand hub listening on ${process.env.PORT||8080}`));
