import {readFile,writeFile,mkdir,cp,symlink,mkdtemp,rm,realpath,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readPackage,validateManifest} from '../packages/mcp-runtime/index.mjs';
const signature=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function sourceDigest(root){
 const hashes=[];async function visit(dir,prefix=''){
  for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   if(['node_modules','.mcp','.git'].includes(entry.name))continue;
   const name=prefix+entry.name,p=path.join(dir,entry.name);
   if(entry.isSymbolicLink())throw Error('Source symlinks require developer review');
   if(entry.isDirectory())await visit(p,name+'/');else hashes.push([name,createHash('sha256').update(await readFile(p)).digest('hex')]);
  }
 }
 await visit(root);await visit(fileURLToPath(new URL('../packages/mcp-runtime/',import.meta.url)),'runtime/');return signature(hashes);
}
export async function validate(root,value){
 validateManifest(value.manifest);const current=await readPackage(root);
 for(const key of ['id','type','dataClassification'])if(current.manifest[key]!==value.manifest[key])throw Error(key+' requires developer review');
 const {validateDraft}=await import(pathToFileURL(path.join(root,'capability.mjs')));validateDraft(value);return value;
}
export async function draft(root,value,expectedDigest){
 const current=await readPackage(root);if(current.digest!==expectedDigest)throw Error('Published files changed; reload');
 await validate(root,value);const candidate={manifest:value.manifest,config:value.config,guidance:value.guidance,baseDigest:expectedDigest,sourceDigest:await sourceDigest(root)};
 await mkdir(path.join(root,'.mcp'),{recursive:true});await writeFile(path.join(root,'.mcp/draft.json'),JSON.stringify(candidate,null,2));return {digest:signature(candidate)};
}
export async function evaluate(root){
 const raw=await readFile(path.join(root,'.mcp/draft.json'),'utf8'),candidate=JSON.parse(raw);await validate(root,candidate);
 if(await sourceDigest(root)!==candidate.sourceDigest)throw Error('Source changed; save and retest');
 const temp=await mkdtemp(path.join(os.tmpdir(),'wetland-candidate-'));
 try{
  await cp(root,temp,{recursive:true,filter:src=>!['node_modules','.mcp','.git'].includes(path.basename(src))});
  await symlink(await realpath(path.join(root,'node_modules')),path.join(temp,'node_modules'),'dir');
  await writePackage(temp,candidate);
  const output=await new Promise(resolve=>{const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['test'],{cwd:temp,env:process.env,stdio:['ignore','pipe','pipe']});let log='';let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},60000);const append=b=>{log=(log+b.toString()).slice(-24000);};child.stdout.on('data',append);child.stderr.on('data',append);child.on('error',e=>{clearTimeout(timer);resolve({passed:false,log:e.message});});child.on('close',code=>{clearTimeout(timer);resolve({passed:code===0&&!timedOut,log});});});
  const result={digest:signature(candidate),...output};await writeFile(path.join(root,'.mcp/evaluation.json'),JSON.stringify(result));return result;
 }finally{await rm(temp,{recursive:true,force:true});}
}
async function writePackage(root,p){await writeFile(path.join(root,'manifest.json'),JSON.stringify(p.manifest,null,2)+'\n');await writeFile(path.join(root,'config.json'),JSON.stringify(p.config,null,2)+'\n');await writeFile(path.join(root,'knowledge/guidance.md'),p.guidance);}
export async function apply(root){
 const candidate=JSON.parse(await readFile(path.join(root,'.mcp/draft.json'),'utf8')),e=JSON.parse(await readFile(path.join(root,'.mcp/evaluation.json'),'utf8'));
 if(!e.passed||e.digest!==signature(candidate))throw Error('Passing tests for this exact draft required');
 if(await sourceDigest(root)!==candidate.sourceDigest)throw Error('Source changed; save and retest');
 const current=await readPackage(root);
 if(current.digest!==candidate.baseDigest)throw Error('Working files changed; reload and retest');
 const next=candidate.manifest.version.split('.').map(Number),old=current.manifest.version.split('.').map(Number);
 const index=next.findIndex((n,i)=>n!==old[i]);if(index<0||next[index]<=old[index])throw Error('Increment the release version before applying');
 await validate(root,candidate);await writePackage(root,candidate);return {applied:true,message:'Applied to working files. Review the git diff and open a pull request; nothing is deployed.'};
}
