import {startHttp,readPackage} from '@wetland/mcp-runtime';
import {handleMcp} from './mcp.mjs';
import {fileURLToPath} from 'node:url';
const pkg=await readPackage(new URL('./',import.meta.url));
const server=startHttp({handler:handleMcp,manifest:pkg.manifest,staticRoot:fileURLToPath(new URL('./dist',import.meta.url))});
server.on('listening',()=>console.log('Brand hub listening'));
