import {canonicalizeExcelRows} from './excel-normalize.js';
// CSV/workbook cells remain in this page. Only a verified fixture fingerprint leaves it.
export function parseCsv(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>2_000_000)throw Error('Use the supplied demo CSV (maximum 2 MB).');
 const records=[];let row=[],value='',quoted=false,closed=false;const s=text.replace(/^\uFEFF/,'');
 for(let i=0;i<s.length;i++){const c=s[i];if(quoted){if(c==='"'){if(s[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;continue;}
  if(c==='"'){if(value||closed)throw Error('Invalid CSV quoting');quoted=true;}else if(c===','||c==='\r'||c==='\n'){row.push(value);value='';closed=false;if(c!==','){records.push(row);row=[];if(c==='\r'&&s[i+1]==='\n')i++;}}else{if(closed)throw Error('Unexpected CSV text after quote');value+=c;}}
 if(quoted)throw Error('Unclosed CSV quote');if(value||row.length||closed){row.push(value);records.push(row);}
 if(records.length<2)throw Error('CSV needs a header and data rows.');return {headers:records[0],rows:records.slice(1)};
}
export function safeCell(value){const text=String(value??'');return /^[=+\-@]/.test(text)?"'"+text:text;}
export function reportRows(report,verification,skill){return [
 ['Wetland Growth summary','Synthetic demonstration — not WaterAid results'],
 ['Output type','Neutral extraction of the validated branded report'],
 ['Period',report.start+' to '+report.end],['First-time donors',report.actual],['Target',report.target],['Target achieved',report.attainmentPercent+'%'],['Gap to target',report.gapToTarget],['Definition',report.definition],['Skill',skill.id+' v'+skill.version],['Source fingerprint',verification.digest],['Source rows',verification.rowCount],['Brand snapshot',report.brand.snapshotDigest],['Artifact ID',report.artifactId],['Branded PDF',report.downloads.pdf],['Branded HTML',report.downloads.html],['Notice','Copilot-style demonstration, not Microsoft Copilot. No organisational approvals granted.']
 ].map(row=>row.map(safeCell));}
export async function runExcelWorkflow(call,{fingerprint,inputs,onStep=()=>{}}){
 const verification=await call('verify_excel_demo_input',fingerprint);
 if((verification.matched!==true&&verification.verified!==true)||verification.digest!==fingerprint.digest||verification.rowCount!==fingerprint.rowCount)throw Error('Server did not match the selected synthetic fixture.');
 onStep(0,true);onStep(1);
 const found=await call('find_skills',{query:'Growth'});
 if(!found.skills?.some(s=>s.id==='growth-reporting'))throw Error('Approved Growth skill is unavailable.');
 const skill=await call('get_skill',{id:'growth-reporting'});
 let state=await call('start_workflow',inputs);
 if(state.status!=='active'||state.step!=='calculate')throw Error('Workflow needs valid reporting inputs.');
 const sameSkill=()=>{if(state.skill?.id!==skill.id||state.skill?.version!==skill.version||state.skill?.digest!==skill.digest)throw Error('Reviewed skill changed during the request. Start again.');};
 sameSkill();onStep(1,true);
 const nextSteps=['brand_validation','release',null];
 for(let index=2;index<=4;index++){onStep(index);state=await call('advance_workflow',{token:state.token});sameSkill();if(state.step!==nextSteps[index-2])throw Error('Unexpected workflow stage; report not released.');onStep(index,true);}
 const report=state.result;
 if(state.status!=='completed'||report?.synthetic!==true||report.start!==inputs.start||report.end!==inputs.end||report.target!==inputs.target||!Number.isInteger(report.actual)||report.brand?.checks?.rendered!==true||!report.downloads)throw Error('Workflow did not release the requested validated report.');
 return {report,skill,verification};
}
function init(){
 const $=id=>document.getElementById(id);let excelReady=false,source=null,report=null,skill=null,verification=null,busy=false,id=0,protocol='2025-03-26';
 const log=[];
 function note(message){$('status').textContent=message;}
 function setBusy(value){busy=value;for(const control of document.querySelectorAll('button,input'))control.disabled=value;$('read-sheet').disabled=value||!excelReady;$('run').disabled=value||!source;$('write-sheet').disabled=value||!report||!excelReady;}
 function resetResult(){report=null;skill=null;verification=null;log.length=0;$('result').hidden=true;$('evidence').textContent='No MCP calls made yet.';for(const li of $('steps').children)li.className='';}
 function step(index,done=false){$('steps').children[index].className=done?'done':'running';}
 async function rpc(method,params){const response=await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':protocol},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params})});if(!response.ok)throw Error('MCP request failed (HTTP '+response.status+').');const message=await response.json();if(message.error)throw Error(message.error.message);return message.result;}
 async function call(name,args){const result=await rpc('tools/call',{name,arguments:args});if(result.isError)throw Error(result.content?.[0]?.text||'MCP tool failed');const value=result.structuredContent||JSON.parse(result.content[0].text);log.push({tool:name,result:{...value,token:value.token?'[signed token omitted]':undefined}});$('evidence').textContent=JSON.stringify(log,null,2);return value;}
 async function readSheet(){return Excel.run(async context=>{const sheet=context.workbook.worksheets.getActiveWorksheet();sheet.load('id,name');const range=sheet.getUsedRange(true);range.load('rowCount,columnCount');await context.sync();if(range.rowCount<2||range.rowCount>10000||range.columnCount>40)throw Error('Activate the supplied synthetic data sheet (2–10,000 rows, at most 40 columns).');range.load('values');await context.sync();return {headers:range.values[0],rows:range.values.slice(1),sheetId:sheet.id,label:sheet.name,kind:'excel'};});}
 async function knownFixture(input){const normalized=await canonicalizeExcelRows(input.headers,input.rows);const response=await fetch('/excel-demo-data.json',{cache:'no-store'});if(!response.ok)throw Error('Demo verification metadata is unavailable');const expected=await response.json();if(normalized.digest!==expected.digest||normalized.rowCount!==expected.rowCount)throw Error('This is not the unchanged supplied synthetic dataset. Nothing from these cells was sent to the MCP.');return {digest:normalized.digest,rowCount:normalized.rowCount};}
 async function loadSource(get){resetResult();source=null;setBusy(true);try{const input=await get();const fingerprint=await knownFixture(input);source={...input,fingerprint};$('source-status').textContent='Loaded '+input.label+' · '+fingerprint.rowCount+' verified synthetic rows. Cells remain local.';note('Source matched locally. Run the guided request.');}catch(error){$('source-status').textContent=error.message;note('Source rejected. No report generated.');}finally{setBusy(false);}}
 $('read-sheet').onclick=()=>loadSource(readSheet);
 $('read-csv').onclick=()=>loadSource(async()=>{const file=$('csv-file').files[0];if(!file||!file.name.toLowerCase().endsWith('.csv')||file.size>2_000_000)throw Error('Select the supplied synthetic CSV (maximum 2 MB).');return {...parseCsv(await file.text()),label:file.name,kind:'browser'};});
 $('csv-file').onchange=()=>{source=null;resetResult();setBusy(false);$('source-status').textContent='New file selected. Read it locally before running.';};
 $('run').onclick=async()=>{if(!source||busy)return;resetResult();setBusy(true);try{
  const args={start:$('start').value,end:$('end').value,target:Number($('target').value)};if(!args.start||!args.end||!Number.isInteger(args.target)||args.target<=0||args.target>10000000)throw Error('Supply start, end and a positive whole-number target.');
  step(0);note('Checking the exact synthetic source…');if(source.kind==='excel'){const fresh=await readSheet();if(fresh.sheetId!==source.sheetId)throw Error('The active worksheet changed. Read the source sheet again.');source={...fresh,fingerprint:await knownFixture(fresh)};}else source.fingerprint=await knownFixture(source);
  const init=await rpc('initialize',{protocolVersion:protocol,capabilities:{},clientInfo:{name:'wetland-excel-demo',version:'1.0.0'}});protocol=init.protocolVersion;
  await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':protocol},body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});
  const completed=await runExcelWorkflow(call,{fingerprint:source.fingerprint,inputs:args,onStep:(index,done)=>{step(index,done);if(!done)note(['Checking source…','Finding the approved skill…','Calculating Growth…','Retrieving Brand and validating documents…','Revalidating and releasing the report…'][index]);}});
  ({report,skill,verification}=completed);
  for(const format of ['pdf','html']){const url=new URL(report.downloads[format]);if(url.origin!==location.origin||url.pathname!=='/reports/growth.'+format)throw Error('Unexpected report download destination');$(format).href=url.href;}
  $('metrics').textContent=report.actual+' new donors · '+report.attainmentPercent+'% of target · gap '+report.gapToTarget;$('skill').textContent='Reviewed skill '+skill.id+' v'+skill.version+' · Brand profile '+report.brand.profileVersion;$('result').hidden=false;$('write-sheet').hidden=!excelReady||source.kind!=='excel';note('Finished. Brand-validated PDF and HTML are ready.');
 }catch(error){report=null;$('result').hidden=true;note('Stopped: '+error.message);}finally{setBusy(false);}};
 $('write-sheet').onclick=async()=>{if(!report||!excelReady||source?.kind!=='excel'||busy)return;setBusy(true);try{const name=await Excel.run(async context=>{const sheets=context.workbook.worksheets;sheets.load('items/name');await context.sync();const existing=new Set(sheets.items.map(s=>s.name.toLowerCase()));let name;do{name='Growth '+new Date().toISOString().slice(5,16).replace(/[-T:]/g,'')+' '+crypto.randomUUID().slice(0,6);}while(existing.has(name.toLowerCase()));const sheet=sheets.add(name);const rows=reportRows(report,verification,skill),range=sheet.getRangeByIndexes(0,0,rows.length,2);range.numberFormat=rows.map(()=>['@','@']);range.values=rows;range.format.wrapText=true;sheet.getRange('A:A').format.columnWidth=150;sheet.getRange('B:B').format.columnWidth=360;sheet.getRange('A1:B1').format.font.bold=true;sheet.getRange('A1:B1').format.fill.color='#E8ECEF';range.format.autofitRows();sheet.activate();await context.sync();return name;});note('Added '+name+'. Original data sheet unchanged. Save as .xlsx to retain all sheets.');}catch(error){note('Could not add the summary: '+error.message);}finally{setBusy(false);}};
 if(globalThis.Office?.onReady)Office.onReady(info=>{if(info.host===Office.HostType.Excel&&Office.context.requirements.isSetSupported('ExcelApi','1.7')){excelReady=true;$('host').textContent='Excel task pane · no worksheet is read until you click Read active Excel worksheet.';$('browser-input').hidden=true;setBusy(false);}}).catch(()=>{});
}
if(typeof document!=='undefined')init();
