import test from 'node:test';import assert from 'node:assert/strict';
import {createGrowthWorkflow,workflowSecret} from './workflow.mjs';
import {calculateGrowth,createServer} from './capability.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const args={start:'2026-07-01',end:'2026-09-30',target:150};
const secret='test-workflow-secret-with-at-least-32-bytes';
const skill={id:'growth-reporting',version:'1.0.0',digest:'a'.repeat(64)};
const baseUrl='https://growth.example';
const options={skill,calculate:calculateGrowth,secret,baseUrl};
async function goodReport(context){const calculation=await calculateGrowth(context),artifactId='b'.repeat(64);return {...calculation,artifactId,brand:{snapshotDigest:'c'.repeat(64),pdfSha256:'d'.repeat(64),htmlSha256:'e'.repeat(64),profileVersion:'0.3.0',rendererVersion:'growth-brand-v1',checks:{pageCount:1,embeddedFontCount:3,logoEmbedded:true,boundsChecked:true,rendered:true}},downloads:Object.fromEntries(['pdf','html'].map(f=>[f,baseUrl+'/reports/growth.'+f+'?artifact='+artifactId]))};}
test('Guided workflow collects inputs, executes server stages and releases only validated reports',async()=>{
 let renders=0;const flow=createGrowthWorkflow({...options,generate:async c=>{renders++;return goodReport(c);}});
 const missing=await flow.start({});assert.equal(missing.status,'needs_input');assert.deepEqual(missing.missingInputs,['start','end','target']);assert.equal(missing.token,undefined);
 await assert.rejects(flow.start({...args,approved:true}));await assert.rejects(flow.start({...args,start:'2026-02-30'}));
 let state=await flow.start(args);assert.equal(state.step,'calculate');assert.equal(renders,0);
 state=await flow.advance(state.token);assert.equal(state.result.actual,120);assert.equal(state.step,'brand_validation');assert.equal(state.result.downloads,undefined);
 state=await flow.advance(state.token);assert.equal(state.step,'release');assert.equal(state.result.downloads,undefined);assert.equal(renders,1);
 state=await flow.advance(state.token);assert.equal(state.status,'completed');assert.equal(state.result.actual,120);assert.ok(state.result.downloads.pdf);assert.equal(renders,2);
});
test('Brand failure and incomplete or changed artifact evidence block release',async()=>{
 for(const generate of [async()=>{throw Error('Brand unavailable');},async c=>{const r=await goodReport(c);delete r.brand.checks;return r;},async c=>{const r=await goodReport(c);r.downloads.pdf='https://evil.example/report.pdf';return r;}]){
  const flow=createGrowthWorkflow({...options,generate});let state=await flow.start(args);state=await flow.advance(state.token);await assert.rejects(flow.advance(state.token));
 }
 let calls=0;const flow=createGrowthWorkflow({...options,generate:async c=>{const r=await goodReport(c);if(++calls>1)r.brand.snapshotDigest='f'.repeat(64);return r;}});let state=await flow.start(args);state=await flow.advance(state.token);state=await flow.advance(state.token);await assert.rejects(flow.advance(state.token),/changed/);
});
test('Tokens reject tampering and another authenticated subject',async()=>{
 const identity={tenantId:'tenant',subject:'user-one'},flow=createGrowthWorkflow({...options,identity,generate:goodReport}),other=createGrowthWorkflow({...options,identity:{...identity,subject:'user-two'},generate:goodReport});
 const state=await flow.start(args);await assert.rejects(other.advance(state.token));await assert.rejects(flow.advance(state.token.slice(0,-8)+'forgedxx'));
 assert.throws(()=>workflowSecret({http:true,env:{}}),/MCP_WORKFLOW_SECRET/);assert.equal(workflowSecret({http:true,env:{MCP_WORKFLOW_SECRET:secret}}),secret);
});
test('MCP exposes reviewed skill discovery and workflow with original tools',async()=>{
 const server=await createServer({reportGenerator:goodReport,workflowSigningSecret:secret});const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();const client=new Client({name:'workflow-test',version:'1'});
 try{await server.connect(serverTransport);await client.connect(clientTransport);const list=(await client.listTools()).tools.map(t=>t.name);assert.equal(list.length,10);assert.ok(list.includes('generate_growth_report'));
 const call=async(name,input)=>{const r=await client.callTool({name,arguments:input});assert.ok(!r.isError,r.content?.[0]?.text);return r.structuredContent||JSON.parse(r.content[0].text);};
 const found=await call('find_skills',{query:'Growth'});assert.equal(found.skills[0].id,'growth-reporting');const read=await call('get_skill',{id:'growth-reporting'});assert.equal(read.version,'1.0.0');assert.ok(read.instructions);
 const state=await call('start_workflow',{});assert.equal(state.status,'needs_input');
 }finally{await client.close();await server.close();}
});
