import {mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url));
const [type,name]=process.argv.slice(2);
if(!['knowledge','reporting'].includes(type)||!/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(name||'')||name.length>50)throw Error('Usage: node scripts/create-mcp.mjs knowledge|reporting unique-name');
const dest=path.join(repo,'services',name);await mkdir(dest); // Refuse to overwrite any existing service.
try{await cp(path.join(repo,'templates',type+'-mcp'),dest,{recursive:true});
 for(const file of ['manifest.json','package.json']){const p=path.join(dest,file),value=JSON.parse(await readFile(p,'utf8'));if(file==='manifest.json'){value.id=name;value.name=name;value.owner='Assign a maintainer';}else value.name='wetland-'+name;await writeFile(p,JSON.stringify(value,null,2)+'\n');}
 await writeFile(path.join(dest,'Dockerfile'),`FROM node:22-alpine\nWORKDIR /app/services/${name}\nCOPY packages/mcp-runtime /app/packages/mcp-runtime\nRUN cd /app/packages/mcp-runtime && npm ci --omit=dev --ignore-scripts\nCOPY services/${name}/package*.json ./\nRUN npm ci --omit=dev --ignore-scripts\nCOPY services/${name}/ ./\nUSER node\nENV PORT=8080\nEXPOSE 8080\nCMD ["node","server.mjs","--http"]\n`);
 console.log(`Created services/${name}. Next: cd services/${name} && npm install --ignore-scripts && npm test && npm run studio`);
}catch(error){await rm(dest,{recursive:true,force:true});throw error;}
