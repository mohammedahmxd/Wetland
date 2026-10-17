import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,cp,writeFile,rm,symlink} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {validateExport,writeImport} from './import-export.mjs';import {calculate,parseCSV} from './model.mjs';
const sourceDir=fileURLToPath(new URL('./data/',import.meta.url));
const config=JSON.parse(await readFile(new URL('./import-mapping.example.json',import.meta.url),'utf8'));
const args={start:'2026-07-01',end:'2026-09-30',target:150};
test('Mapping preserves receipt-based Growth and strips unneeded personal columns',async()=>{
 const result=await validateExport({sourceDir,config});assert.equal(calculate(result.data,args).actual,120);
 assert.deepEqual(Object.keys(result.data.tables['constituents.csv'][0]),['System record ID','Date added']);assert.equal(result.summary.syntheticDeclared,true);
 const temp=await mkdtemp(path.join(os.tmpdir(),'wetland-import-'));try{const output=path.join(temp,'staged');await writeImport(result,output);await assert.rejects(writeImport(result,output),/exist/i);assert.equal(parseCSV(await readFile(path.join(output,'gifts.csv'),'utf8')).length,1083);}finally{await rm(temp,{recursive:true,force:true});}
});
test('Reject missing receipt ledger, unknown mappings, missing attestation and path escape',async()=>{
 for(const mutate of [c=>delete c.tables['payment_events.csv'],c=>delete c.historyAttestation,c=>c.completeLifetimeHistory=false,c=>c.tables['gifts.csv'].source='../gifts.csv',c=>c.tables['constituents.csv'].columns['System record ID']='Unknown']){
  const c=structuredClone(config);mutate(c);await assert.rejects(validateExport({sourceDir,config:c}));
 }
 const temp=await mkdtemp(path.join(os.tmpdir(),'wetland-import-link-'));try{await cp(sourceDir,temp,{recursive:true});await rm(path.join(temp,'gifts.csv'));await symlink(path.join(sourceDir,'gifts.csv'),path.join(temp,'gifts.csv'));await assert.rejects(validateExport({sourceDir:temp,config}),/escapes/);}finally{await rm(temp,{recursive:true,force:true});}
});
test('Real data classification stays private and date coverage cannot hide missing history',async()=>{
 const c={...config,synthetic:false};const r=await validateExport({sourceDir,config:c});assert.equal(r.summary.classification,'private');assert.equal(r.data.manifest.synthetic,false);
 await assert.rejects(validateExport({sourceDir,config:{...config,historyStart:'2026-01-01'}}),/outside/);
});
test('Explicit source header mapping works without assuming one CRM export layout',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'wetland-import-map-'));try{
  await cp(sourceDir,temp,{recursive:true});const file=path.join(temp,'constituents.csv');await writeFile(file,(await readFile(file,'utf8')).replace('System record ID','Constituent System Key'));
  const c=structuredClone(config);c.tables['constituents.csv'].columns['System record ID']='Constituent System Key';const r=await validateExport({sourceDir:temp,config:c});assert.equal(calculate(r.data,args).actual,120);
 }finally{await rm(temp,{recursive:true,force:true});}
});
