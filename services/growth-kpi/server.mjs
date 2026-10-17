import {fileURLToPath} from 'node:url';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {startStdio,startHttp,authorizationFromEnv,createMcpHandler,readPackage} from '@wetland/mcp-runtime';
import {createServer,root,validateDraft} from './capability.mjs';
if(process.argv.includes('--http')){
 const pkg=validateDraft(await readPackage(root));const url=process.env.PUBLIC_BASE_URL||`http://localhost:${process.env.PORT||8080}`;
 if(process.env.MCP_DEMO_UI==='true'&&process.env.MCP_AUTH_MODE&&process.env.MCP_AUTH_MODE!=='none')throw Error('Public presenter requires demo authentication mode none');
 startHttp({staticRoot:process.env.MCP_DEMO_UI==='true'?fileURLToPath(new URL('./demo',import.meta.url)):undefined,manifest:pkg.manifest,handler:createMcpHandler({authorize:authorizationFromEnv(),createServer,Transport:StreamableHTTPServerTransport,publicBaseUrl:url,dataClassification:pkg.manifest.dataClassification})});
}else await startStdio(createServer,StdioServerTransport);
