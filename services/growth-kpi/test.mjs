import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {loadDataset,growthReport,calculate,parseCSV} from './model.mjs';
const args={start:'2026-07-01',end:'2026-09-30',target:150};
test('Known cohort, target, comparison and distinction from CRM creation',async()=>{
 const d=await loadDataset(),r=growthReport(d,{...args,comparisonStart:'2026-04-01',comparisonEnd:'2026-06-30'});
 assert.equal(r.actual,120);assert.equal(r.newCrmRecords,130);assert.equal(r.attainmentPercent,80);assert.equal(r.gapToTarget,30);assert.equal(r.comparison.actual,90);assert.equal(r.comparison.changePercent,33.33);
 assert.equal(r.quality.mergedAliases,1);assert.ok(r.cohort.some(x=>x.constituentSystemId==='344')); // Existing prospect converted.
 assert.ok(!r.cohort.some(x=>['1','901','461','480','490','500'].includes(x.constituentSystemId)));
 assert.equal(Object.values(r.monthly).reduce((a,b)=>a+b),120);
 const july1=calculate(d,{...args,start:'2026-07-01',end:'2026-07-01'});assert.equal(july1.actual,2);
 const oct=calculate(d,{...args,start:'2026-10-01',end:'2026-10-17'});assert.equal(oct.actual,1);
});
test('Posting, splits, soft credits and repeated donations cannot inflate acquisition',async()=>{
 const d=await loadDataset();for(const g of d.tables['gifts.csv'])g['Post status']='Do not post';
 d.tables['gift_splits.csv'].push(...structuredClone(d.tables['gift_splits.csv']));d.tables['soft_credits.csv'].push(...structuredClone(d.tables['soft_credits.csv']));
 assert.equal(calculate(d,args).actual,120);
 d.tables['gifts.csv'].push({...d.tables['gifts.csv'][0]});assert.equal(calculate(d,args).quality.exactDuplicatesIgnored,1);
 d.tables['gifts.csv'].at(-1).Amount='999.00';assert.throws(()=>calculate(d,args),/Conflicting duplicate/);
});
test('Refund cutoff, partial refunds and pending outcomes',async()=>{
 const d=await loadDataset();const receipt=d.tables['payment_events.csv'].find(e=>e.Outcome==='Received'&&d.tables['gifts.csv'].some(g=>g['System record ID']===e['Gift System record ID']&&g['Constituent System record ID']==='341'));
 const second=d.tables['gifts.csv'].filter(g=>g['Constituent System record ID']==='341').at(-1);
 d.tables['payment_events.csv'].find(e=>e['Gift System record ID']===second['System record ID']).Outcome='Pending';
 const refund={'Event ID':'test-refund','Gift System record ID':receipt['Gift System record ID'],'Event date':'2026-09-30',Outcome:'Refunded',Amount:'50.00'};
 d.tables['payment_events.csv'].push(refund);assert.equal(calculate(d,args).actual,119);
 refund.Amount='10.00';assert.equal(calculate(d,args).actual,120);
 refund.Amount='50.00';refund['Event date']='2026-10-01';assert.equal(calculate(d,args).actual,120);
});
test('Fail closed on incomplete history, bad dates, unknown donors and merge cycles',async()=>{
 const d=await loadDataset();d.manifest.complete_lifetime_history=false;assert.throws(()=>calculate(d,args),/lifetime/);d.manifest.complete_lifetime_history=true;
 assert.throws(()=>calculate(d,{...args,start:'2026-02-30'}),/valid/);assert.throws(()=>calculate(d,{...args,target:0}),/positive/);
 assert.throws(()=>calculate(d,{...args,end:'2027-01-01'}),/coverage/);
 d.tables['constituent_merges.csv'].push({'Alias System record ID':'1','Canonical System record ID':'901'});assert.throws(()=>calculate(d,args),/cycle/);d.tables['constituent_merges.csv'].pop();
 d.tables['gifts.csv'][0]['Constituent System record ID']='unknown';assert.throws(()=>calculate(d,args),/Unknown gift donor/);
});
test('CSV supports BOM, CRLF, commas, quotes and multiline values',()=>{
 assert.deepEqual(parseCSV('\uFEFFID,Name\r\n001,"Example, ""Test""\nName"\r\n'),[{ID:'001',Name:'Example, "Test"\nName'}]);
 assert.throws(()=>parseCSV('ID,Name\n1'),/width/);assert.throws(()=>parseCSV('ID,Name\n1,"test'),/Unclosed/);
});
test('Real MCP client can discover tools and request a report',async()=>{
 const client=new Client({name:'growth-test',version:'1.0.0'});const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('./server.mjs',import.meta.url))]});
 try{await client.connect(transport);assert.equal((await client.listTools()).tools.length,2);
 const out=await client.callTool({name:'generate_growth_report',arguments:args});assert.ok(!out.isError);assert.equal(JSON.parse(out.content[0].text).actual,120);
 const bad=await client.callTool({name:'generate_growth_report',arguments:{...args,start:'invalid'}});assert.ok(bad.isError);
 }finally{await client.close();}
});

test('Export foreign keys, commitment links and allocation totals reconcile',async()=>{
 const d=await loadDataset(),gifts=new Map(d.tables['gifts.csv'].map(g=>[g['System record ID'],g]));
 const totals=new Map();for(const s of d.tables['gift_splits.csv']){assert.ok(gifts.has(s['Gift System record ID']));totals.set(s['Gift System record ID'],(totals.get(s['Gift System record ID'])||0)+Math.round(Number(s['Split amount'])*100));}
 for(const [id,g] of gifts){assert.equal(totals.get(id),Math.round(Number(g.Amount)*100));const parent=g['Applied to gift System record ID'];if(parent){assert.ok(gifts.has(parent));assert.equal(gifts.get(parent)['Constituent System record ID'],g['Constituent System record ID']);}}
});
