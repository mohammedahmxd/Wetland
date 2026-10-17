import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,cp,symlink,rm,readFile,writeFile,realpath} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {readPackage} from '../packages/mcp-runtime/index.mjs';import {draft,evaluate,apply} from './candidates.mjs';
const repo=fileURLToPath(new URL('../',import.meta.url));
for(const type of ['knowledge','reporting'])test(type+' starter: draft test, stale approval, and working-file apply',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'wetland-starter-'));
 try{await cp(path.join(repo,'templates',type+'-mcp'),root,{recursive:true});await symlink(await realpath(path.join(repo,'services/growth-kpi/node_modules')),path.join(root,'node_modules'),'dir');
 const p=await readPackage(root);const candidate={...p,manifest:{...p.manifest,version:'0.1.1'},guidance:p.guidance+'\nReviewed update.\n'};
 await draft(root,candidate,p.digest);await assert.rejects(()=>apply(root));const e=await evaluate(root);assert.ok(e.passed,e.log);
 await draft(root,{...candidate,guidance:'Changed after testing'},p.digest);await assert.rejects(()=>apply(root),/exact draft/);
 await draft(root,candidate,p.digest);await evaluate(root);
 const sourcePath=path.join(root,'capability.mjs'),source=await readFile(sourcePath,'utf8');await writeFile(sourcePath,source+'\n// changed after tests\n');await assert.rejects(()=>apply(root),/Source changed/);await writeFile(sourcePath,source);await apply(root);assert.equal((await readPackage(root)).manifest.version,'0.1.1');
 await assert.rejects(()=>draft(root,candidate,p.digest),/changed/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('Scaffold creates a root-context Dockerfile and refuses overwrite/traversal',async()=>{
 const {spawnSync}=await import('node:child_process');const name='framework-test-'+Date.now();const root=path.join(repo,'services',name);
 try{const run=(...args)=>spawnSync(process.execPath,[path.join(repo,'scripts/create-mcp.mjs'),...args],{encoding:'utf8'});
 assert.equal(run('knowledge',name).status,0);assert.equal((await readPackage(root)).manifest.id,name);assert.match(await readFile(path.join(root,'Dockerfile'),'utf8'),new RegExp('services/'+name));
 assert.notEqual(run('knowledge',name).status,0);assert.notEqual(run('knowledge','../escape').status,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
