import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {readPackage,startHttp,createMcpHandler} from '@wetland/mcp-runtime';
import {root,validateDraft,evaluateTool,createServer,definitions} from './capability.mjs';
import {scenarios} from './demo/scenarios.js';
const p=validateDraft(await readPackage(root));
for(const s of scenarios)test(s.name+' produces cited synthetic output',()=>{const r=evaluateTool(s.tool,s.args,p);assert.equal(r.classification,'synthetic');assert.equal(r.packageDigest,p.digest);assert.ok(r.sources.length);for(const source of r.sources){assert.ok(source.text);assert.ok(source.uri.endsWith(source.id));}assert.ok(r.notice.includes('not WaterAid'));});
test('Grant uncertainty, programme arithmetic and approval boundaries',()=>{
 const g=evaluateTool(scenarios[0].tool,scenarios[0].args,p);assert.equal(g.eligibility,'not-determined');assert.equal(g.requirements.at(-1).status,'unknown-missing-evidence');
 const missing=evaluateTool(scenarios[0].tool,{evidenceIds:[],requestedAmountGbp:60000},p);assert.ok(missing.requirements.every(x=>x.status==='unknown-missing-evidence'));assert.equal(missing.budgetCheck,'exceeds-fictional-call-limit');
 const r=evaluateTool(scenarios[1].tool,scenarios[1].args,p);assert.equal(r.actual,90);assert.equal(r.target,120);assert.equal(r.attainmentPercent,75);assert.equal(r.gap,30);assert.match(r.finalDocument,/Brand/);
 const approval=evaluateTool(scenarios[2].tool,{ownerNamed:true,testsPassed:true,independentReview:true,dataClassification:'synthetic',dataAccessReviewed:false},p);assert.equal(approval.status,'ready-for-human-review');assert.equal(approval.approvalGranted,false);
 assert.equal(evaluateTool(scenarios[3].tool,{minimumSeverity:'high'},p).queue.length,1);
 assert.equal(evaluateTool(scenarios[6].tool,{completedChecks:[]},p).missing.length,6);
});
test('Invalid and duplicate inputs cannot inflate or invent evidence',()=>{
 assert.throws(()=>evaluateTool('analyse_programme_progress',{siteIds:['A','A']},p),/Duplicate/);assert.throws(()=>evaluateTool('analyse_programme_progress',{siteIds:['unknown']},p),/Unknown/);
 assert.throws(()=>evaluateTool('prepare_grant_outline',{evidenceIds:['imaginary'],requestedAmountGbp:42000},p));
 assert.throws(()=>evaluateTool('check_developer_standards',{completedChecks:['manifest','manifest']},p),/Duplicate/);
 assert.throws(()=>evaluateTool('plan_staff_onboarding',{role:'administrator'},p));
 assert.throws(()=>evaluateTool('plan_staff_onboarding',{role:'staff',grantAccess:true},p));
 const bad=structuredClone(p);bad.config.programme.push({...bad.config.programme[0]});assert.throws(()=>validateDraft(bad),/Duplicate/);
 const privateP=structuredClone(p);privateP.manifest.dataClassification='private';assert.throws(()=>validateDraft(privateP),/Synthetic/);
});
test('Stdio discovers all eight tools and twelve resources and calls every preset',async()=>{
 const client=new Client({name:'example-contract',version:'1.0.0'});try{await client.connect(new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('./server.mjs',import.meta.url))]}));const listed=await client.listTools();assert.deepEqual(listed.tools.map(x=>x.name).sort(),Object.keys(definitions).sort());assert.ok(listed.tools.every(t=>t.annotations.readOnlyHint));assert.equal((await client.listResources()).resources.length,12);
 for(const s of scenarios){const r=await client.callTool({name:s.tool,arguments:s.args});assert.ok(!r.isError,s.tool);assert.equal(r.structuredContent.classification,'synthetic');}
 const invalid=await client.callTool({name:'plan_staff_onboarding',arguments:{role:'root'}});assert.ok(invalid.isError);
 }finally{await client.close();}
});
test('HTTP MCP supports the same presets and blocks missing authorization',async()=>{
 const handler=createMcpHandler({createServer,Transport:StreamableHTTPServerTransport,publicBaseUrl:'http://localhost',dataClassification:'synthetic',authorize:async req=>req.headers.authorization==='Bearer test-only'?{subject:'fixture'}:false});
 const server=startHttp({manifest:p.manifest,handler,host:'127.0.0.1',port:0});await once(server,'listening');const url=new URL('http://127.0.0.1:'+server.address().port+'/mcp'),client=new Client({name:'http-example-contract',version:'1.0.0'});
 try{const denied=await fetch(url,{method:'POST',body:'{}'});assert.equal(denied.status,401);await client.connect(new StreamableHTTPClientTransport(url,{requestInit:{headers:{Authorization:'Bearer test-only'}}}));for(const s of scenarios){const out=await client.callTool({name:s.tool,arguments:s.args});assert.ok(!out.isError,s.tool);}}
 finally{await client.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('HTTP startup fails closed without explicit mode or with incomplete Entra settings',()=>{
 for(const mode of ['', 'entra']){const env={...process.env,MCP_AUTH_MODE:mode,ENTRA_TENANT_ID:'',ENTRA_API_CLIENT_ID:''};const r=spawnSync(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url)),'--http'],{env,encoding:'utf8',timeout:5000});assert.notEqual(r.status,0);assert.match(r.stderr,mode?/Entra requires/:/Set MCP_AUTH_MODE/);}
});
test('Each scoped endpoint exposes only its tool and relevant source resources',async()=>{
 for(const s of scenarios){const client=new Client({name:'scoped-test',version:'1.0.0'});const server=startHttp({manifest:p.manifest,host:'127.0.0.1',port:0,handler:createMcpHandler({createServer:()=>createServer({scope:s.scope}),Transport:StreamableHTTPServerTransport,publicBaseUrl:'http://localhost',dataClassification:'synthetic'})});await once(server,'listening');try{await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:'+server.address().port+'/mcp')));assert.deepEqual((await client.listTools()).tools.map(x=>x.name),[s.tool]);const out=await client.callTool({name:s.tool,arguments:s.args});assert.ok(!out.isError);const available=(await client.listResources()).resources.map(x=>x.uri);for(const source of out.structuredContent.sources)assert.ok(available.includes(source.uri));const other=scenarios.find(x=>x.tool!==s.tool);const unavailable=await client.callTool({name:other.tool,arguments:other.args});assert.ok(unavailable.isError);}finally{await client.close();server.closeAllConnections();await new Promise(r=>server.close(r));}}
});
test('Edited structured facts drive grant checks, communications and cited sources together',()=>{
 const candidate=structuredClone(p);candidate.config.grant.maximumRequestGbp=30000;candidate.config.programme[0].actual=45;candidate.config.programme[0].target=60;validateDraft(candidate);
 const grant=evaluateTool('prepare_grant_outline',{evidenceIds:['project-brief'],requestedAmountGbp:42000},candidate);assert.equal(grant.budgetCheck,'exceeds-fictional-call-limit');assert.equal(grant.maximumRequestGbp,30000);assert.match(grant.sources.find(x=>x.id==='grant-call').text,/GBP 30000/);assert.doesNotMatch(grant.sources.find(x=>x.id==='grant-call').text,/50000/);
 const communications=evaluateTool('prepare_communications_outline',{channel:'email'},candidate);assert.match(communications.facts[0].claim,/95 connections against a target of 130/);for(const source of communications.sources){assert.match(source.text,/95/);assert.match(source.text,/130/);}
 const programme=evaluateTool('analyse_programme_progress',{siteIds:['A','B','C']},candidate);assert.equal(programme.actual,95);assert.equal(programme.target,130);assert.match(programme.sources[0].text,/Total 95 connections against target 130/);
 candidate.config.sources.find(x=>x.id==='communications-brief').text='Stale 90/120 prose';assert.throws(()=>validateDraft(candidate),/Derived source text/);
});
