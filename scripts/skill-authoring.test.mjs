import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readPackage} from '../packages/mcp-runtime/index.mjs';
import {loadSkills,parseSkill} from '../packages/mcp-skills/catalogue.mjs';
import {draft,evaluate,apply} from './candidates.mjs';
const catalogueUrl=new URL('../packages/mcp-skills/catalogue.mjs',import.meta.url).href;
const allowedTools=['fixture_tool'];
function markdown({tools=allowedTools,body='Call fixture_tool, inspect its evidence, and stop on failure.'}={}){
 const metadata={schemaVersion:1,id:'draft-authoring',version:'1.0.0',name:'Draft authoring',description:'Exercise uploaded draft instructions.',status:'draft',tools,output:{kind:'facts',description:'Cited fixture facts'},sources:[{id:'fixture-source',title:'Fictional source',uri:'wetland://fixture/source'}]};
 // CRLF models a Windows-authored upload; exact bytes must survive authoring/apply.
 return ('```json\n'+JSON.stringify(metadata,null,2)+'\n```\n\n# Instructions\n\n'+body+'\n').replaceAll('\n','\r\n');
}
async function fixture(run){
 const root=await mkdtemp(join(tmpdir(),'wetland-skill-authoring-'));
 try{
  await Promise.all(['knowledge','skills','node_modules'].map(dir=>mkdir(join(root,dir))));
  await writeFile(join(root,'manifest.json'),JSON.stringify({schemaVersion:1,id:'authoring-fixture',name:'Authoring fixture',description:'Synthetic candidate test fixture',owner:'Test',version:'0.1.0',type:'knowledge',dataClassification:'synthetic'}));
  await writeFile(join(root,'config.json'),'{}');await writeFile(join(root,'knowledge/guidance.md'),'Synthetic fixture guidance.');
  await writeFile(join(root,'package.json'),JSON.stringify({type:'module',scripts:{test:'node --test test.mjs'}}));
  await writeFile(join(root,'capability.mjs'),`export const allowedSkillTools=['fixture_tool'];export function validateDraft(p){if(p.manifest.dataClassification!=='synthetic')throw Error('Synthetic only');return p;}`);
  await writeFile(join(root,'test.mjs'),`import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{loadSkills,parseSkill}from ${JSON.stringify(catalogueUrl)};test('candidate copy contains exact uploaded draft but does not serve it',async()=>{const text=await readFile(new URL('./skills/draft-authoring.md',import.meta.url),'utf8');const parsed=parseSkill(text,{allowedTools:['fixture_tool'],filename:'draft-authoring.md'});assert.equal(parsed.status,'draft');assert.ok(text.includes('\\r\\n'));assert.equal((await loadSkills(new URL('./',import.meta.url),{allowedTools:['fixture_tool']})).length,0);});`);
  await run(root);
 }finally{await rm(root,{recursive:true,force:true});}
}
test('Candidate evaluation runs uploaded draft in a temp npm test and apply preserves exact bytes without serving it',async()=>fixture(async root=>{
 const before=await readPackage(root);assert.deepEqual(before.skills,[]);
 const upload=markdown();const candidate={...before,manifest:{...before.manifest,version:'0.1.1'},skills:[{filename:'draft-authoring.md',markdown:upload}]};
 await draft(root,candidate,before.digest);const evaluation=await evaluate(root);assert.equal(evaluation.passed,true,evaluation.log);assert.match(evaluation.log,/candidate copy contains exact uploaded draft/);
 // Successful evaluation alone has not modified the source files.
 await assert.rejects(readFile(join(root,'skills/draft-authoring.md')),{code:'ENOENT'});
 await apply(root);assert.equal(await readFile(join(root,'skills/draft-authoring.md'),'utf8'),upload);
 const after=await readPackage(root);assert.notEqual(after.digest,before.digest);assert.equal(after.skills[0].markdown,upload);assert.equal(after.manifest.version,'0.1.1');assert.deepEqual(await loadSkills(root,{allowedTools}),[]);
}));
test('Changing uploaded instructions after evaluation invalidates the exact candidate approval',async()=>fixture(async root=>{
 const before=await readPackage(root);const candidate={...before,manifest:{...before.manifest,version:'0.1.1'},skills:[{filename:'draft-authoring.md',markdown:markdown()}]};
 await draft(root,candidate,before.digest);const evaluation=await evaluate(root);assert.ok(evaluation.passed,evaluation.log);
 const changed={...candidate,skills:[{filename:'draft-authoring.md',markdown:markdown({body:'Changed instructions require a new evaluation.'})}]};
 const saved=await draft(root,changed,before.digest);assert.notEqual(saved.digest,evaluation.digest);await assert.rejects(apply(root),/exact draft/);
 const parsedOriginal=parseSkill(candidate.skills[0].markdown,{allowedTools}),parsedChanged=parseSkill(changed.skills[0].markdown,{allowedTools});assert.notEqual(parsedOriginal.digest,parsedChanged.digest);
}));
test('Candidate rejects absent tool dependencies and filenames that the package reader cannot safely load',async()=>fixture(async root=>{
 const before=await readPackage(root);const candidate={...before,manifest:{...before.manifest,version:'0.1.1'},skills:[{filename:'draft-authoring.md',markdown:markdown({tools:['unknown_tool']})}]};
 await assert.rejects(draft(root,candidate,before.digest),/dependency/);
 for(const filename of ['../escape.md','UPPER.md','with_underscore.md','two..dots.md'])await assert.rejects(draft(root,{...candidate,skills:[{filename,markdown:markdown()}]},before.digest),/filename/);
 await assert.rejects(draft(root,{...candidate,skills:Array.from({length:51},(_,i)=>({filename:'draft-'+i+'.md',markdown:markdown()}))},before.digest),/Too many/);
 // An empty skill directory remains represented, allowing an explicit clear operation.
 assert.deepEqual((await readPackage(root)).skills,[]);
}));
test('Approved instruction edits require a higher skill version, not the same or a lower version',async()=>fixture(async root=>{
 const approved=(version,body)=>markdown({body}).replace('"status": "draft"','"status": "approved"').replace('"version": "1.0.0"','"version": "'+version+'"');
 await writeFile(join(root,'skills/draft-authoring.md'),approved('1.0.0','Original approved instructions.'));
 await writeFile(join(root,'test.mjs'),`import test from 'node:test';import assert from 'node:assert/strict';import {loadSkills} from ${JSON.stringify(catalogueUrl)};test('approved candidate remains valid',async()=>{assert.equal((await loadSkills(new URL('./',import.meta.url),{allowedTools:['fixture_tool']})).length,1);});`);
 const before=await readPackage(root);
 for(const version of ['1.0.0','0.9.0','1.0.1']){const candidate={...before,manifest:{...before.manifest,version:'0.1.1'},skills:[{filename:'draft-authoring.md',markdown:approved(version,'Revised approved instructions.')} ]};await draft(root,candidate,before.digest);const result=await evaluate(root);assert.ok(result.passed,result.log);if(version==='1.0.1')await apply(root);else await assert.rejects(apply(root),/Increment the changed approved skill version/);}
 assert.equal((await loadSkills(root,{allowedTools}))[0].version,'1.0.1');
}));
