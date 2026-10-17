import test from 'node:test';import assert from 'node:assert/strict';
import {validateDraft,createServer} from './capability.mjs';import {readPackage} from '@wetland/mcp-runtime';
test('Guidance and configuration are present and valid',async()=>{const p=validateDraft(await readPackage(new URL('./',import.meta.url)));assert.ok(p.guidance.trim());assert.throws(()=>validateDraft({...p,config:{heading:''}}));const s=await createServer();await s.close();});

import {loadSkills,getSkill} from '@wetland/mcp-skills';
import {allowedSkillTools} from './capability.mjs';
test('Starter includes one approved skill bound to its domain tool',async()=>{const skills=await loadSkills(new URL('./',import.meta.url),{allowedTools:allowedSkillTools});assert.equal(skills.length,1);assert.deepEqual(skills[0].tools,allowedSkillTools);assert.match(getSkill(skills,{id:'use-knowledge-starter'}).instructions,/server/);const p=await readPackage(new URL('./',import.meta.url));const changed=structuredClone(p);changed.skills[0].markdown=changed.skills[0].markdown.replace('get_guidance','unknown_tool');assert.throws(()=>validateDraft(changed),/dependency/);});

import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {fileURLToPath} from 'node:url';
test('MCP client discovers and retrieves the starter skill',async()=>{const client=new Client({name:'starter-skill-test',version:'1.0.0'});try{await client.connect(new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('./server.mjs',import.meta.url))]}));const tools=(await client.listTools()).tools.map(t=>t.name);assert.ok(tools.includes('find_skills'));assert.ok(tools.includes('get_skill'));const found=await client.callTool({name:'find_skills',arguments:{query:'starter'}});assert.ok(!found.isError);const records=found.structuredContent.skills;assert.equal(records.length,1);const skill=await client.callTool({name:'get_skill',arguments:{id:records[0].id,version:records[0].version}});assert.ok(!skill.isError);assert.match(skill.structuredContent.digest,/^[0-9a-f]{64}$/);assert.ok(skill.structuredContent.instructions);}finally{await client.close();}});
