import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseSkill,validateSkillFiles,loadSkills,findSkills,getSkill} from './catalogue.mjs';
const allowedTools=['example_tool'];
const meta={schemaVersion:1,id:'sample-skill',version:'1.0.0',name:'Sample reporting',description:'Evidence-backed sample reporting workflow.',status:'approved',tools:['example_tool'],output:{kind:'facts',description:'Cited facts'},sources:[{id:'source-one',title:'Fixture one',uri:'wetland://example/source-one'}]};
const format=(m=meta,body='# Steps\nCall example_tool and cite its returned evidence.')=>'```json\n'+JSON.stringify(m,null,2)+'\n```\n\n'+body;
const file=(m=meta,name='sample.md')=>({filename:name,markdown:format(m)});
test('Approved discovery is concise, exact versions are retrievable, and drafts stay hidden',()=>{
 const list=validateSkillFiles([file(),file({...meta,version:'2.0.0'},'latest.md'),file({...meta,version:'3.0.0',status:'draft'},'draft.md')],{allowedTools});assert.equal(list.length,2);assert.equal(getSkill(list,{id:meta.id}).version,'2.0.0');assert.equal(getSkill(list,{id:meta.id,version:'1.0.0'}).version,'1.0.0');assert.throws(()=>getSkill(list,{id:meta.id,version:'3.0.0'}));
 const summaries=findSkills(list,{query:'reporting evidence'});assert.equal(summaries.length,2);assert.equal(summaries[0].instructions,undefined);assert.equal(findSkills(list,{query:'unrelated'}).length,0);assert.match(getSkill(list,{id:meta.id}).instructions,/example_tool/);
});
test('Digest binds instructions and metadata, including a same-version edit',()=>{
 const a=parseSkill(format(),{allowedTools}),b=parseSkill(format(meta,'# Changed instructions'),{allowedTools}),c=parseSkill(format({...meta,description:'Updated description'}),{allowedTools});assert.match(a.digest,/^[0-9a-f]{64}$/);assert.notEqual(a.digest,b.digest);assert.notEqual(a.digest,c.digest);const fetched=getSkill([a],{id:meta.id});fetched.tools.push('bad_tool');assert.deepEqual(a.tools,['example_tool']);
});
test('Reject unknown dependency, unknown fields, unsafe source, bad version and duplicate records',()=>{
 for(const change of [{tools:['run_shell']},{tools:['example_tool','example_tool']},{version:'01.0.0'},{version:'1.0'},{version:'1.0.0;sh'},{status:'published'},{includes:'https://outside.test/a'},{sources:[{id:'source-one',title:'Unsafe',uri:'file:///etc/passwd'}]}])assert.throws(()=>parseSkill(format({...meta,...change}),{allowedTools}));
 assert.throws(()=>validateSkillFiles([file(),file(meta,'second.md')],{allowedTools}),/Duplicate skill ID/);assert.throws(()=>validateSkillFiles([file(),file()],{allowedTools}),/Duplicate skill filename/);
 assert.throws(()=>parseSkill(format().replace('"schemaVersion": 1','"schemaVersion": 0, "schemaVersion": 1'),{allowedTools}),/metadata JSON/);
 assert.throws(()=>parseSkill(format(),{allowedTools,filename:'../outside.md'}));assert.throws(()=>parseSkill(format(meta,'x'.repeat(65537)),{allowedTools}));
});
test('Loader rejects symlinks and oversized files instead of traversing or executing them',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wetland-skills-'));try{await mkdir(join(root,'skills'));await writeFile(join(root,'skills','valid.md'),format());assert.equal((await loadSkills(root,{allowedTools})).length,1);await symlink(join(root,'skills','valid.md'),join(root,'skills','linked.md'));await assert.rejects(loadSkills(root,{allowedTools}),/Unsafe/);await rm(join(root,'skills','linked.md'));await writeFile(join(root,'skills','oversized.md'),'x'.repeat(65537));await assert.rejects(loadSkills(root,{allowedTools}),/size/);await rm(join(root,'skills','oversized.md'));await writeFile(join(root,'skills','invalid.md'),Buffer.from([0xff]));await assert.rejects(loadSkills(root,{allowedTools}));}finally{await rm(root,{recursive:true,force:true});}
});
test('Nine bundled skills reference only existing domain tools',async()=>{
 const tools=['prepare_grant_outline','analyse_programme_progress','check_release_readiness','triage_tool_maintenance','plan_staff_onboarding','prepare_communications_outline','check_developer_standards','retrieve_organisational_learning'];const examples=await loadSkills(new URL('../../services/examples-hub/',import.meta.url),{allowedTools:tools});assert.equal(examples.length,8);assert.ok(examples.every(s=>s.tools.length===1));
 const growth=await loadSkills(new URL('../../services/growth-kpi/',import.meta.url),{allowedTools:['inspect_growth_dataset','get_metric_definition','calculate_growth','generate_growth_report','explain_growth_result']});assert.equal(growth.length,1);assert.match(growth[0].instructions,/Brand/);assert.equal(growth[0].id,'growth-reporting');
});
