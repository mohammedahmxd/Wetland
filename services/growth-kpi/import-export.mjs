// Offline operator tool. Never wired to the public MCP or presenter.
import {readFile,writeFile,mkdir,realpath,stat,rm} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {z} from 'zod';import {parseCSV,calculate,day} from './model.mjs';
export const columns={
 'constituents.csv':['System record ID','Date added'],
 'gifts.csv':['System record ID','Constituent System record ID','Gift date','Gift type','Amount','Currency'],
 'payment_events.csv':['Event ID','Gift System record ID','Event date','Outcome','Amount'],
 'constituent_merges.csv':['Alias System record ID','Canonical System record ID']
};
const file=z.string().regex(/^[a-zA-Z0-9_-]+\.csv$/);
const mapping=z.object({source:file,columns:z.record(z.string(),z.string().min(1))}).strict();
const configSchema=z.object({schemaVersion:z.literal(1),datasetId:z.string().regex(/^[a-zA-Z0-9_-]{3,80}$/),synthetic:z.boolean(),currency:z.string().regex(/^[A-Z]{3}$/),historyStart:z.string(),exportedAt:z.string(),completeLifetimeHistory:z.literal(true),historyAttestation:z.object({verifiedBy:z.string().min(3).max(200),evidenceReference:z.string().min(8).max(1000)}).strict(),tables:z.object({'constituents.csv':mapping,'gifts.csv':mapping,'payment_events.csv':mapping,'constituent_merges.csv':mapping}).strict()}).strict();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const encode=rows=>rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
export async function validateExport({sourceDir,config}){
 const c=configSchema.parse(config);day(c.historyStart);day(c.exportedAt);if(c.historyStart>c.exportedAt)throw Error('Invalid coverage interval');
 const root=await realpath(sourceDir),tables={},files={},sourceHashes={},csvs={};
 for(const [name,required] of Object.entries(columns)){
  const m=c.tables[name];if(Object.keys(m.columns).sort().join('|')!==[...required].sort().join('|'))throw Error('Explicit mapping required for exactly the minimal '+name+' columns');
  const filename=await realpath(path.join(root,m.source));if(!filename.startsWith(root+path.sep))throw Error('Source escapes selected export directory');
  if((await stat(filename)).size>25*1024*1024)throw Error('CSV exceeds 25 MiB offline import limit');
  const bytes=await readFile(filename),parsed=parseCSV(bytes.toString('utf8'),{withHeaders:true});
  if(parsed.rows.length>100000)throw Error('CSV exceeds 100,000-row offline import limit');
  if(new Set(Object.values(m.columns)).size!==required.length)throw Error('Source column cannot supply multiple meanings');
  for(const key of required)if(!parsed.headers.includes(m.columns[key]))throw Error('Missing mapped column in '+name+': '+key);
  tables[name]=parsed.rows.map(row=>Object.fromEntries(required.map(key=>[key,row[m.columns[key]].trim()])));
  csvs[name]=encode([required,...tables[name].map(row=>required.map(key=>row[key]))]);files[name]={rows:tables[name].length,sha256:sha(csvs[name])};sourceHashes[m.source]=sha(bytes);
 }
 if(!tables['constituents.csv'].length||!tables['gifts.csv'].length||!tables['payment_events.csv'].length)throw Error('Constituents, gifts and receipt events must be supplied');
 // Completeness is an explicit human assertion. It cannot be inferred from a CSV.
 for(const event of tables['payment_events.csv'])if(day(event['Event date'])<c.historyStart||event['Event date']>c.exportedAt)throw Error('Receipt event outside declared history coverage');
 for(const gift of tables['gifts.csv'])if(day(gift['Gift date'])<c.historyStart||gift['Gift date']>c.exportedAt)throw Error('Gift outside declared history coverage');
 for(const donor of tables['constituents.csv'])if(day(donor['Date added'])>c.exportedAt)throw Error('Constituent created after export cutoff');
 const manifest={dataset_id:c.datasetId,synthetic:c.synthetic,currency:c.currency,history_start:c.historyStart,exported_at:c.exportedAt,complete_lifetime_history:true,history_note:'Operator-attested completeness; not independently verified by this importer.',history_attestation:c.historyAttestation,import_schema_version:1,source_hashes:sourceHashes,files};
 const data={manifest,tables};const validation=calculate(data,{start:c.historyStart,end:c.exportedAt,target:1});
 // Validate all event boundaries, so later receipts cannot mask an impossible earlier refund.
 const balances=new Map(),seenEvents=new Set();
 for(const e of [...tables['payment_events.csv']].sort((a,b)=>a['Event date'].localeCompare(b['Event date'])||(a.Outcome==='Received'?-1:1))){
  if(seenEvents.has(e['Event ID']))continue;seenEvents.add(e['Event ID']);
  const id=e['Gift System record ID'],n=Math.round(Number(e.Amount)*100);if(e.Outcome==='Received')balances.set(id,(balances.get(id)||0)+n);if(e.Outcome==='Refunded'){const remaining=(balances.get(id)||0)-n;if(remaining<0)throw Error('Refund predates sufficient receipts');balances.set(id,remaining);}
 }
 return {data,csvs,summary:{dataset:c.datasetId,classification:c.synthetic?'synthetic':'private',files:Object.fromEntries(Object.entries(files).map(([name,meta])=>[name,meta.rows])),canonicalLifetimeDonors:validation.actual,completeHistory:'operator-attested',syntheticDeclared:c.synthetic,notes:['No deployed data changed.','Names, email addresses and unneeded CRM columns are omitted.','Real data still requires approved storage, authorization and reporting integration.']}};
}
export async function writeImport(result,destination){
 // A fresh directory is required. No overwrite, deployment or replacement of bundled demo data.
 await mkdir(destination,{mode:0o700});
 try{for(const [name,csv] of Object.entries(result.csvs))await writeFile(path.join(destination,name),csv,{mode:0o600,flag:'wx'});await writeFile(path.join(destination,'manifest.json'),JSON.stringify(result.data.manifest,null,2)+'\n',{mode:0o600,flag:'wx'});}catch(error){await rm(destination,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [sourceDir,configPath,destination,...extra]=process.argv.slice(2);
 if(!sourceDir||!configPath||extra.length)throw Error('Usage: node import-export.mjs SOURCE_DIR MAPPING_JSON [NEW_OUTPUT_DIR]');
 try{const result=await validateExport({sourceDir,config:JSON.parse(await readFile(configPath,'utf8'))});if(destination)await writeImport(result,destination);console.log(JSON.stringify(result.summary,null,2));}catch(error){console.error('Import rejected: '+(error instanceof z.ZodError?'Invalid mapping or missing coverage attestation':error.message));process.exitCode=1;}
}
