import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL('./data/',import.meta.url);
export function parseCSV(text,{withHeaders=false}={}){
 const rows=[];let row=[],value='',quoted=false,closed=false;
 for(let i=0,s=text.replace(/^\uFEFF/,'');i<s.length;i++){
  const c=s[i];
  if(quoted){if(c==='"'){if(s[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;continue;}
  if(c==='"'){if(value||closed)throw Error('Invalid CSV quote');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){row.push(value);value='';closed=false;if(c!==','){if(c==='\r'&&s[i+1]==='\n')i++;rows.push(row);row=[];}}
  else {if(closed)throw Error('Unexpected text after CSV quote');value+=c;}
 }
 if(quoted)throw Error('Unclosed CSV quote');if(value||row.length||closed){row.push(value);rows.push(row);}
 const h=rows.shift();if(!h||new Set(h).size!==h.length)throw Error('Missing or duplicate headers');
 const records=rows.map(r=>{if(r.length!==h.length)throw Error('CSV row width mismatch');return Object.fromEntries(h.map((k,i)=>[k,r[i]]));});
 return withHeaders?{headers:h,rows:records}:records;
}
export function day(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('Use a valid YYYY-MM-DD date');return s;}
function cents(s){if(!/^\d+\.\d{2}$/.test(s))throw Error('Invalid monetary amount');const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n))throw Error('Amount out of range');return n;}
export async function loadDataset(){
 const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8')),tables={};
 for(const [name,meta] of Object.entries(manifest.files)){
  if(!/^[a-z_]+\.csv$/.test(name))throw Error('Invalid filename');const bytes=await readFile(new URL(name,base));
  if(createHash('sha256').update(bytes).digest('hex')!==meta.sha256)throw Error('Dataset hash mismatch');
  tables[name]=parseCSV(bytes.toString('utf8'));if(tables[name].length!==meta.rows)throw Error('Row count mismatch');
 }return {manifest,tables};
}
function unique(rows,key){const records=new Map();let duplicates=0;for(const r of rows){if(!r[key])throw Error('Missing '+key);const old=records.get(r[key]);if(old){if(JSON.stringify(old)!==JSON.stringify(r))throw Error('Conflicting duplicate '+key);duplicates++;}else records.set(r[key],r);}return {records,duplicates};}
const TYPES=new Set(['Cash','Pay-Cash','MG Pay-Cash','Recurring Gift Pay-Cash']);
export function calculate(data,{start,end,target}){
 day(start);day(end);if(start>end)throw Error('Start must precede end');if(!Number.isInteger(target)||target<=0)throw Error('Target must be a positive integer');
 const {manifest:m,tables:t}=data;if(!m.complete_lifetime_history)throw Error('Cannot claim first-ever donors without complete lifetime history');
 if(start<m.history_start||end>m.exported_at)throw Error('Period outside verified coverage');
 const donors=unique(t['constituents.csv'],'System record ID'),gifts=unique(t['gifts.csv'],'System record ID'),events=unique(t['payment_events.csv'],'Event ID'),aliases=new Map();
 for(const x of t['constituent_merges.csv']){const a=x['Alias System record ID'],b=x['Canonical System record ID'];if(aliases.has(a)&&aliases.get(a)!==b)throw Error('Conflicting merge');if(!donors.records.has(a)||!donors.records.has(b))throw Error('Unknown merged constituent');aliases.set(a,b);}
 const canonical=id=>{const seen=new Set();while(aliases.has(id)){if(seen.has(id))throw Error('Merge cycle');seen.add(id);id=aliases.get(id);}return id;};for(const id of donors.records.keys())canonical(id);
 const ledger=new Map();for(const e of events.records.values()){
  day(e['Event date']);if(!gifts.records.has(e['Gift System record ID']))throw Error('Unknown payment gift');if(!['Received','Refunded','Declined','Pending','Voided'].includes(e.Outcome))throw Error('Unknown payment outcome');
  const n=cents(e.Amount);if(e['Event date']>end)continue;const id=e['Gift System record ID'],v=ledger.get(id)||{received:0,refunded:0,first:null,voided:false};
  if(e.Outcome==='Received'){v.received+=n;if(n>0&&(!v.first||e['Event date']<v.first))v.first=e['Event date'];}if(e.Outcome==='Refunded')v.refunded+=n;if(e.Outcome==='Voided')v.voided=true;ledger.set(id,v);
 }
 const first=new Map();let excluded=0;for(const [id,g] of gifts.records){
  day(g['Gift date']);cents(g.Amount);if(g.Currency!==m.currency)throw Error('Mixed or missing currency');if(!donors.records.has(g['Constituent System record ID']))throw Error('Unknown gift donor');
  const donor=canonical(g['Constituent System record ID']),v=ledger.get(id);if(v&&v.refunded>v.received)throw Error('Refund exceeds receipts');
  if(!TYPES.has(g['Gift type'])||!v||v.voided||v.received<=v.refunded||!v.first){excluded++;continue;}if(!first.has(donor)||v.first<first.get(donor))first.set(donor,v.first);
 }
 const cohort=[...first].filter(([,date])=>date>=start&&date<=end).map(([id,date])=>({constituentSystemId:id,firstReceivedDate:date})).sort((a,b)=>a.firstReceivedDate.localeCompare(b.firstReceivedDate)||a.constituentSystemId.localeCompare(b.constituentSystemId));
 const months={};for(const d of cohort)months[d.firstReceivedDate.slice(0,7)]=(months[d.firstReceivedDate.slice(0,7)]||0)+1;
 const newRecords=[...donors.records].filter(([id,r])=>!aliases.has(id)&&day(r['Date added'])>=start&&r['Date added']<=end).length;
 return {metric:'Growth: first-time donors',definitionVersion:'growth-first-receipt-v1',synthetic:m.synthetic,dataset:m.dataset_id,start,end,asOf:end,actual:cohort.length,target,attainmentPercent:Math.round(cohort.length/target*10000)/100,gapToTarget:Math.max(0,target-cohort.length),status:cohort.length>=target?'Target met':'Below target',monthly:months,newCrmRecords:newRecords,cohort,quality:{completeLifetimeHistory:true,mergedAliases:aliases.size,exactDuplicatesIgnored:donors.duplicates+gifts.duplicates+events.duplicates,nonqualifyingGiftRecords:excluded},definition:'Unique canonical direct donors (individuals and organizations) whose earliest positive received donation retained after refunds/voids as of period end falls within the inclusive period. Pledges, recurring commitments, failed/pending payments, fully refunded gifts, noncash gifts and soft credits do not qualify. Posting status does not determine receipt.',sourceHashes:m.files};
}
export function growthReport(data,input){
 const r=calculate(data,input);if(Boolean(input.comparisonStart)!==Boolean(input.comparisonEnd))throw Error('Supply both comparison dates');
 if(input.comparisonStart){if(input.comparisonEnd>=input.start)throw Error('Comparison must end before report period');const p=calculate(data,{start:input.comparisonStart,end:input.comparisonEnd,target:input.target});r.comparison={start:p.start,end:p.end,actual:p.actual,change:r.actual-p.actual,changePercent:p.actual?Math.round((r.actual-p.actual)/p.actual*10000)/100:null};}
 r.markdown=`# Growth KPI report\n\n**Synthetic demonstration — not WaterAid results.**\n\nPeriod: ${r.start} to ${r.end} (inclusive).\n\n| Measure | Result |\n|---|---:|\n| First-time donors | ${r.actual} |\n| Demo target | ${r.target} |\n| Target achieved | ${r.attainmentPercent}% |\n| Donors still needed | ${r.gapToTarget} |\n| Status | ${r.status} |\n${r.comparison?`| Previous period new donors | ${r.comparison.actual} |\n| Change vs previous period | ${r.comparison.changePercent===null?'N/A (zero baseline)':r.comparison.changePercent+'%'} |\n`:''}\n${r.definition}\n\nCRM records created in this period: ${r.newCrmRecords} (separate measure). Known merged aliases: ${r.quality.mergedAliases}. Complete synthetic lifetime history is verified against the manifest. Receipt date drives this KPI. Later refunds may change a restated result.\n\nDefinition: ${r.definitionVersion}. Dataset: ${r.dataset}. Target is a demo planning input, not a revenue goal.\n`;return r;
}
