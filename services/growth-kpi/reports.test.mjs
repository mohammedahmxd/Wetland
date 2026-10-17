import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {once} from 'node:events';import http from 'node:http';
import {loadBrand} from '@wetland/mcp-reporting/brand';
import {renderBrandedReport} from '@wetland/mcp-reporting';
import {calculateGrowth,createServer} from './capability.mjs';
import {reportRoutes,buildReport} from './reports.mjs';
const args={start:'2026-07-01',end:'2026-09-30',target:150};
const dist=new URL('../../services/brand-mcp/dist/',import.meta.resolve('@wetland/mcp-reporting'));
const json=async path=>JSON.parse(await readFile(new URL(path,dist),'utf8'));
async function fixture(){
 const calls=[],tokens=await json('v1/tokens.json'),profile=await json('v1/document-profile.json'),assets=await json('v1/assets.json'),instructions=await readFile(new URL('documents/agent-document-instructions.txt',dist),'utf8');
 const fetchImpl=async(url,options)=>{
  const u=new URL(url);
  if(options.method==='POST'){
   const body=JSON.parse(options.body);calls.push(body);
   if(body.method==='notifications/initialized')return new Response(null,{status:202});
   let result;
   if(body.method==='initialize')result={protocolVersion:'2025-03-26',serverInfo:{version:'0.3.0'}};
   else {const name=body.params.name;const content=name==='get_brand_system'||name==='get_ui_guidance'?{tokens}:name==='get_document_guidance'?{tokens,profile,instructions}:name==='list_assets'?{assets}:{asset:assets.find(a=>a.id===body.params.arguments.id)};result={structuredContent:content};}
   return Response.json({jsonrpc:'2.0',id:body.id,result});
  }
  return new Response(await readFile(new URL(u.pathname.slice(1),dist)));
 };
 return {calls,fetchImpl};
}
test('Brand protocol requests only guidance/assets; reports never send donor inputs',async()=>{
 const f=await fixture();const brand=await loadBrand({endpoint:'https://brand.example/mcp',fetchImpl:f.fetchImpl});
 assert.equal(brand.guidance.profile.version,'0.3.0');assert.match(brand.evidence.snapshotDigest,/^[a-f0-9]{64}$/);
 assert.deepEqual(f.calls.filter(c=>c.method==='tools/call').map(c=>c.params.name),['get_brand_system','get_ui_guidance','get_document_guidance','list_assets','get_asset']);
 for(const c of f.calls.filter(c=>c.method==='tools/call'))assert.deepEqual(c.params.arguments,c.params.name==='get_asset'?{id:'white-logo'}:{});
 await assert.rejects(loadBrand({endpoint:'http://metadata.google.internal/mcp'}),/Invalid/);
});
test('Brand failure blocks documents while calculations remain available',async()=>{
 const report=await calculateGrowth(args);assert.equal(report.actual,120);assert.equal(report.markdown,undefined);
 await assert.rejects(renderBrandedReport(report,{brandLoader:async()=>{throw Error('Brand unavailable');}}),/Brand unavailable/);
 const f=await fixture(),brand=await loadBrand({endpoint:'https://brand.example/mcp',fetchImpl:f.fetchImpl});brand.guidance.instructions+='\nChanged instructions';
 await assert.rejects(renderBrandedReport(report,{brandLoader:async()=>brand}),/review required/);
});
test('Artifact routes enforce auth before rendering and reject stale hashes',async()=>{
 let renders=0;const artifact={artifactId:'a'.repeat(64),pdf:Buffer.from('%PDF-test'),html:Buffer.from('<p>test</p>')};
 const route=reportRoutes(async req=>req.headers.authorization==='Bearer allowed',{builder:async()=>{renders++;return {artifact};}});
 const server=http.createServer(async(req,res)=>{if(!await route(req,res,new URL(req.url,'http://localhost').pathname)){res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port+'/reports/growth.pdf?start=2026-07-01&end=2026-09-30&artifact=';
 try{assert.equal((await fetch(base+'a'.repeat(64))).status,401);assert.equal(renders,0);
 assert.equal((await fetch(base+'b'.repeat(64),{headers:{Authorization:'Bearer allowed'}})).status,409);
 const good=await fetch(base+'a'.repeat(64),{headers:{Authorization:'Bearer allowed'}});assert.equal(good.status,200);assert.equal(good.headers.get('content-type'),'application/pdf');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('Renderer embeds fonts/logo, validates PDF and produces reproducible artifacts',{skip:process.env.REPORT_RENDER_TESTS!=='true'},async()=>{
 const f=await fixture(),brand=await loadBrand({endpoint:'https://brand.example/mcp',fetchImpl:f.fetchImpl});
 const a=await buildReport(args,{brandLoader:async()=>brand}),b=await buildReport(args,{brandLoader:async()=>brand});
 assert.equal(a.artifact.artifactId,b.artifact.artifactId);assert.equal(a.artifact.evidence.checks.embeddedFontCount,3);assert.equal(a.artifact.evidence.checks.rendered,true);assert.ok(a.artifact.pdf.subarray(0,5).equals(Buffer.from('%PDF-')));assert.match(a.artifact.html.toString(),/data:image\/png;base64/);
});
