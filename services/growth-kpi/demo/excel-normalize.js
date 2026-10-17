// Shared browser/Node code. Cells stay on the device; only digest + rowCount are
// submitted to the fixed synthetic demo. This is not a general CRM import parser.
export const EXCEL_DEMO_HEADERS=Object.freeze(['System record ID','Gift ID','Constituent System record ID','Gift date','Gift type','Amount','Currency','Post status','Post date','Payment method','Applied to gift System record ID']);
export const EXCEL_DEMO_CANONICAL_VERSION='wetland-synthetic-gifts-cells-v1';
const TYPES=Object.freeze(['id','gift-id','id','date','gift-type','money','currency','post-status','optional-date','payment-method','optional-id']);
const choices={
 'gift-type':new Set(['Cash','Recurring Gift','Recurring Gift Pay-Cash','Pledge','Pay-Cash']),
 currency:new Set(['CAD']),
 'post-status':new Set(['Not posted','Posted']),
 'payment-method':new Set(['Credit card','Direct debit','Cheque'])
};
function invalid(message){throw Error('Synthetic Excel demo: '+message);}
function isoDay(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)invalid('dates must be valid ISO YYYY-MM-DD values or Excel date serials');
 return value;
}
function dateCell(value,dateSystem){
 if(typeof value==='string'){
  // OOXML date cells may be returned as UTC-midnight ISO timestamps.
  if(/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(value))value=value.slice(0,10);
  return isoDay(value);
 }
 if(!Number.isSafeInteger(value)||value<0||value>2958465)invalid('date serial must be a whole day in range');
 // Excel 1900 serial60 represents a nonexistent1900-02-29. Reject it rather
 // than silently mapping two distinct cells onto the same date.
 if(dateSystem==='1900'&&value===60)invalid('Excel serial60 is not a real date');
 const base=dateSystem==='1904'?Date.UTC(1904,0,1):Date.UTC(1899,11,31);
 const offset=dateSystem==='1900'&&value>60?value-1:value;
 const date=new Date(base+offset*86400000).toISOString().slice(0,10);
 return isoDay(date);
}
function idCell(value){
 if(typeof value==='number'){if(!Number.isSafeInteger(value)||value<=0)invalid('record IDs must be positive safe integers');return String(value);}
 if(!/^[1-9]\d{0,14}$/.test(value)||!Number.isSafeInteger(Number(value)))invalid('record IDs must be positive integer cells');return value;
}
function moneyCell(value){
 if(typeof value==='number'){
  if(!Number.isFinite(value)||value<0)invalid('amount must be a nonnegative finite number');
  const cents=Math.round(value*100);
  if(!Number.isSafeInteger(cents)||cents/100!==value)invalid('amount must contain at most two decimal places');
  return String(cents);
 }
 if(!/^\d{1,13}(?:\.\d{1,2})?$/.test(value))invalid('amount must be a plain decimal monetary cell');
 const [whole,fraction='']=value.split('.'),cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(cents>BigInt(Number.MAX_SAFE_INTEGER))invalid('amount is out of range');return cents.toString();
}
function normalize(value,type,dateSystem){
 if(value===null)value='';
 if(!['string','number'].includes(typeof value)||typeof value==='string'&&(value.length>100||value.includes('\0')))invalid('unsupported or oversized cell value');
 if(type.startsWith('optional-')){if(value==='')return '';type=type.slice(9);}
 if(value==='')invalid('required cell is empty');
 if(type==='id')return idCell(value);
 if(type==='date')return dateCell(value,dateSystem);
 if(type==='money')return moneyCell(value);
 if(type==='gift-id'){if(typeof value!=='string'||!/^G[1-9]\d{0,14}$/.test(value))invalid('gift IDs must use the synthetic G-number format');return value;}
 if(!choices[type]?.has(value))invalid('cell is outside the fixed synthetic vocabulary');return value;
}
export async function canonicalizeExcelRows(headers,rows,{dateSystem='1900'}={}){
 if(!['1900','1904'].includes(dateSystem))invalid('unknown Excel date system');
 if(!Array.isArray(headers)||headers.length!==EXCEL_DEMO_HEADERS.length||headers.some((h,i)=>h!==EXCEL_DEMO_HEADERS[i]))invalid('use exactly the supplied gift-export headers in their original order');
 if(!Array.isArray(rows)||!rows.length||rows.length>2000)invalid('expected a bounded nonempty synthetic gift table');
 const seen=new Set(),normalized=rows.map(row=>{
  if(!Array.isArray(row)||row.length!==headers.length)invalid('row width differs from the supplied headers');
  const cells=row.map((v,i)=>normalize(v,TYPES[i],dateSystem));
  if(seen.has(cells[0]))invalid('duplicate gift record ID');seen.add(cells[0]);return cells;
 });
 normalized.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 const bytes=new TextEncoder().encode(JSON.stringify([EXCEL_DEMO_CANONICAL_VERSION,EXCEL_DEMO_HEADERS,TYPES,normalized]));
 if(!globalThis.crypto?.subtle)invalid('secure browser hashing is unavailable; use HTTPS or localhost');
 const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 return {digest:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),rowCount:normalized.length};
}
export function parseExcelDemoCSV(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>2000000)invalid('CSV exceeds the demo size limit');
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const source=text.replace(/^\uFEFF/,'');
 for(let i=0;i<source.length;i++){
  const ch=source[i];
  if(quoted){if(ch==='"'){if(source[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=ch;continue;}
  if(ch==='"'){if(cell||closed)invalid('invalid CSV quote');quoted=true;}
  else if(ch===','||ch==='\r'||ch==='\n'){row.push(cell);cell='';closed=false;if(ch!==','){if(ch==='\r'&&source[i+1]==='\n')i++;rows.push(row);row=[];if(rows.length>2001)invalid('too many CSV rows');}}
  else{if(closed)invalid('unexpected text after CSV quote');cell+=ch;}
 }
 if(quoted)invalid('unclosed CSV quote');if(cell||row.length||closed){row.push(cell);rows.push(row);}
 const headers=rows.shift();if(!headers)invalid('missing CSV headers');return {headers,rows};
}
