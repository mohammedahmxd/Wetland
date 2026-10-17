import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {startStdio,startHttp,createMcpHandler,readPackage} from '@wetland/mcp-runtime';
import {createServer,root,validateDraft} from './capability.mjs';
if(process.argv.includes('--http')){
 const pkg=validateDraft(await readPackage(root));const url=process.env.PUBLIC_BASE_URL||`http://localhost:${process.env.PORT||8080}`;
 startHttp({manifest:pkg.manifest,handler:createMcpHandler({createServer,Transport:StreamableHTTPServerTransport,publicBaseUrl:url,dataClassification:pkg.manifest.dataClassification})});
}else await startStdio(createServer,StdioServerTransport);
