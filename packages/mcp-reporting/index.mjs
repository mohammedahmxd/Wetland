import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
import {loadBrand,digest} from './brand.mjs';
const exec=promisify(execFile);export const rendererVersion='growth-brand-v1';let active=0;
export async function renderBrandedReport(report,{brandLoader=loadBrand}={}){
 if(active>=2)throw Error('Report renderer is busy; retry shortly');active++;
 let temp;
 try{
  const brand=await brandLoader();
  if(brand.guidance.profile.version!=='0.3.0')throw Error('Brand profile needs renderer review');
  const supported=JSON.parse(await readFile(new URL('./contract.json',import.meta.url),'utf8'));
  if(digest(brand.guidance.instructions)!==supported.instructionsDigest||digest(JSON.stringify(brand.guidance.profile.requirements))!==supported.requirementsDigest)throw Error('Brand instructions changed; renderer review required');
  temp=await mkdtemp(path.join(os.tmpdir(),'wetland-report-'));
  for(const [name,bytes] of [['logo.png',brand.png],['regular.ttf',brand.regular],['bold.ttf',brand.bold],['black.ttf',brand.black],['license.txt',brand.license]])await writeFile(path.join(temp,name),bytes);
  const input={report,brand:brand.evidence,colors:Object.fromEntries(Object.entries(brand.guidance.tokens.colors).map(([key,value])=>[key,value.value])),rendererVersion};
  await writeFile(path.join(temp,'input.json'),JSON.stringify(input));
  try{await exec(process.env.REPORT_PYTHON||'python3',[fileURLToPath(new URL('./render.py',import.meta.url)),temp],{timeout:30000,maxBuffer:100000});}catch(error){console.error(JSON.stringify({event:'report.render.failed',reason:error.code||'validation'}));throw Error('Report rendering or validation failed; no document was released');}
  const pdf=await readFile(path.join(temp,'report.pdf')),html=await readFile(path.join(temp,'report.html')),checks=JSON.parse(await readFile(path.join(temp,'checks.json'),'utf8'));
  const evidence={...brand.evidence,rendererVersion,pdfSha256:digest(pdf),htmlSha256:digest(html),checks};
  return {pdf,html,evidence,artifactId:digest(JSON.stringify({report,brand:evidence}))};
 }finally{active--;if(temp)await rm(temp,{recursive:true,force:true});}
}
