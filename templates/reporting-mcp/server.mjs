import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {startStdio,startHttp,authorizationFromEnv,createMcpHandler,readPackage} from '@wetland/mcp-runtime';
import {createServer,validateDraft} from './capability.mjs';
const pkg=validateDraft(await readPackage(new URL('./',import.meta.url)));
if(process.argv.includes('--http'))startHttp({manifest:pkg.manifest,handler:createMcpHandler({authorize:authorizationFromEnv(),createServer,Transport:StreamableHTTPServerTransport,publicBaseUrl:process.env.PUBLIC_BASE_URL||'http://localhost:8080',dataClassification:pkg.manifest.dataClassification})});
else await startStdio(createServer,StdioServerTransport);
