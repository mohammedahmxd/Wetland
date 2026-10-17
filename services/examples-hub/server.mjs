import {fileURLToPath} from 'node:url';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {startStdio,startHttp,authorizationFromEnv,createMcpHandler,readPackage} from '@wetland/mcp-runtime';
import {createServer,root,validateDraft,scopes} from './capability.mjs';
if(process.argv.includes('--http')){
 const pkg=validateDraft(await readPackage(root));
 // Public synthetic mode requires an explicit opt-in; accidental configuration never opens HTTP tools.
 if(!process.env.MCP_AUTH_MODE)throw Error('Set MCP_AUTH_MODE=none explicitly for synthetic demos, or entra for private access');
 if(process.env.MCP_DEMO_UI==='true'&&process.env.MCP_AUTH_MODE!=='none')throw Error('Public presenter requires explicit synthetic mode none');
 const authorize=authorizationFromEnv();
 const handlerFor=scope=>createMcpHandler({authorize,createServer:options=>createServer({...options,scope}),Transport:StreamableHTTPServerTransport,publicBaseUrl:process.env.PUBLIC_BASE_URL||`http://localhost:${process.env.PORT||8080}`,dataClassification:pkg.manifest.dataClassification});
 const scopedHandlers=Object.fromEntries(Object.keys(scopes).map(scope=>['/mcp/'+scope,handlerFor(scope)]));
 startHttp({beforeRequest:async(req,res,pathname)=>{if(!pathname.startsWith('/mcp/'))return false;const handler=scopedHandlers[pathname];if(!handler){res.writeHead(404);res.end('Unknown capability');return true;}await handler(req,res);return true;},staticRoot:process.env.MCP_DEMO_UI==='true'?fileURLToPath(new URL('./demo',import.meta.url)):undefined,manifest:pkg.manifest,handler:handlerFor()});
}else await startStdio(createServer,StdioServerTransport);
