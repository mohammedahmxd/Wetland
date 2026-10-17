import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCsv,safeCell,reportRows} from './demo/excel.js';
import {canonicalizeExcelRows} from './demo/excel-normalize.js';
test('Pane parses the actual supplied CSV and hashes the full fixture',async()=>{const parsed=parseCsv(await readFile(new URL('./data/gifts.csv',import.meta.url),'utf8')),result=await canonicalizeExcelRows(parsed.headers,parsed.rows);assert.equal(result.rowCount,1083);assert.match(result.digest,/^[a-f0-9]{64}$/);const changed=structuredClone(parsed);changed.rows[0][4]='0.00';await assert.rejects(async()=>{const r=await canonicalizeExcelRows(changed.headers,changed.rows);assert.equal(r.digest,result.digest);});});
test('CSV parser handles quoted cells and rejects malformed quotes',()=>{assert.deepEqual(parseCsv('\uFEFFid,note\r\n1,"comma, quote ""yes"""\r\n'),{headers:['id','note'],rows:[['1','comma, quote "yes"']]});assert.throws(()=>parseCsv('a,b\n1,"bad'),/Unclosed/);});
test('Worksheet output is a neutral report extraction and escapes formula-looking strings',()=>{assert.equal(safeCell('=WEBSERVICE("https://example.com")'),'\'=WEBSERVICE("https://example.com")');const r={start:'2026-07-01',end:'2026-09-30',actual:120,target:150,attainmentPercent:80,gapToTarget:30,definition:'=unsafe',brand:{snapshotDigest:'digest'},artifactId:'artifact',downloads:{pdf:'https://growth.example/report.pdf',html:'https://growth.example/report.html'}};const rows=reportRows(r,{digest:'input',rowCount:1083},{id:'growth-reporting',version:'1.0.0'});assert.ok(rows.some(row=>row[1]==="'=unsafe"));assert.ok(rows.some(row=>row[1].includes('Neutral extraction')));assert.ok(rows.every(row=>row.length===2));});

test('Pane drives real skill and workflow MCP tools to a validated report with matching schema',async()=>{
 const {runExcelWorkflow}=await import('./demo/excel.js');const {createServer,calculateGrowth}=await import('./capability.mjs');const {getExcelDemoData}=await import('./excel-data.mjs');
 const {Client}=await import('@modelcontextprotocol/sdk/client/index.js');const {InMemoryTransport}=await import('@modelcontextprotocol/sdk/inMemory.js');
 const before=process.env.PUBLIC_BASE_URL;process.env.PUBLIC_BASE_URL='https://growth.example';
 let server,client;
 try{
  const generator=async context=>{const r=await calculateGrowth(context),artifactId='b'.repeat(64);return {...r,artifactId,brand:{snapshotDigest:'c'.repeat(64),pdfSha256:'d'.repeat(64),htmlSha256:'e'.repeat(64),profileVersion:'0.3.0',rendererVersion:'growth-brand-v1',checks:{pageCount:1,embeddedFontCount:3,logoEmbedded:true,boundsChecked:true,rendered:true}},downloads:{pdf:'https://growth.example/reports/growth.pdf?artifact='+artifactId,html:'https://growth.example/reports/growth.html?artifact='+artifactId}};};
  server=await createServer({reportGenerator:generator,workflowSigningSecret:'integration-test-secret-at-least-32-bytes'});client=new Client({name:'excel-pane-contract',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(b);await client.connect(a);
  const calls=[];const call=async(name,args)=>{calls.push({name,args});const r=await client.callTool({name,arguments:args});if(r.isError)throw Error(r.content[0].text);return r.structuredContent||JSON.parse(r.content[0].text);};
  const fixture=await getExcelDemoData(),fingerprint={digest:fixture.digest,rowCount:fixture.rowCount};const result=await runExcelWorkflow(call,{fingerprint,inputs:{start:'2026-07-01',end:'2026-09-30',target:150}});
  assert.equal(result.report.actual,120);assert.equal(result.report.attainmentPercent,80);assert.equal(result.skill.id,'growth-reporting');assert.equal(result.verification.matched,true);assert.ok(result.report.downloads.pdf);
  assert.deepEqual(calls.map(c=>c.name),['verify_excel_demo_input','find_skills','get_skill','start_workflow','advance_workflow','advance_workflow','advance_workflow']);assert.deepEqual(Object.keys(calls[0].args).sort(),['digest','rowCount']);
 }finally{await client?.close();await server?.close();if(before===undefined)delete process.env.PUBLIC_BASE_URL;else process.env.PUBLIC_BASE_URL=before;}
});
test('Pane stops if the retrieved skill and workflow binding differ',async()=>{
 const {runExcelWorkflow}=await import('./demo/excel.js');let advances=0;const fingerprint={digest:'a'.repeat(64),rowCount:1083};
 const call=async name=>{if(name==='verify_excel_demo_input')return {matched:true,...fingerprint};if(name==='find_skills')return {skills:[{id:'growth-reporting'}]};if(name==='get_skill')return {id:'growth-reporting',version:'1.0.0',digest:'b'.repeat(64)};if(name==='start_workflow')return {status:'active',step:'calculate',skill:{id:'growth-reporting',version:'1.0.1',digest:'c'.repeat(64)}};advances++;};
 await assert.rejects(runExcelWorkflow(call,{fingerprint,inputs:{start:'2026-07-01',end:'2026-09-30',target:150}}),/skill changed/);assert.equal(advances,0);
});
