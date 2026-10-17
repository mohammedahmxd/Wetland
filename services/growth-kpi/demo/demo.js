let nextId=0,protocol='2025-03-26',downloads=null;
const $=id=>document.getElementById(id);
$('endpoint').textContent=location.origin+'/mcp';
async function rpc(method,params){
 const response=await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':protocol},body:JSON.stringify({jsonrpc:'2.0',id:++nextId,method,params})});
 if(!response.ok)throw Error(`MCP returned HTTP ${response.status}. Check the service configuration.`);
 const message=await response.json();if(message.error)throw Error(message.error.message);return message.result;
}
$('report-form').addEventListener('submit',async event=>{
 event.preventDefault();$('run').disabled=true;$('download').hidden=true;$('download-html').hidden=true;downloads=null;$('metrics').replaceChildren();$('report').textContent='';$('evidence').textContent='';$('status').textContent='Connecting to the MCP and calculating…';
 try{
 const init=await rpc('initialize',{protocolVersion:protocol,capabilities:{},clientInfo:{name:'wetland-presenter',version:'1.0.0'}});protocol=init.protocolVersion;
 await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':protocol},body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});
 const form=new FormData(event.target),args={start:form.get('start'),end:form.get('end'),target:Number(form.get('target'))};
 const result=await rpc('tools/call',{name:'generate_growth_report',arguments:args});if(result.isError)throw Error(result.content?.[0]?.text||'Report failed');
 const report=result.structuredContent||JSON.parse(result.content[0].text);
 for(const [value,label] of [[report.actual,'New donors'],[report.attainmentPercent+'%','Of target'],[report.gapToTarget,'Gap to target']]){const tile=document.createElement('div');tile.className='metric';const number=document.createElement('strong'),caption=document.createElement('span');number.textContent=value;caption.textContent=label;tile.append(number,caption);$('metrics').append(tile);}
 downloads=report.downloads;$('report').textContent='Brand profile '+report.brand.profileVersion+' · '+report.brand.status+'\n\nBrand snapshot: '+report.brand.snapshotDigest+'\n\nPDF checks: '+JSON.stringify(report.brand.checks,null,2);$('evidence').textContent=JSON.stringify({request:{method:'tools/call',name:'generate_growth_report',arguments:args},result:report},null,2);$('download').hidden=false;$('download-html').hidden=false;$('status').textContent='Calculated, branded through the Brand MCP, and validated. Download the finished report below.';
 }catch(error){$('status').textContent=error.message;}finally{$('run').disabled=false;}
});
for(const [id,format] of [['download','pdf'],['download-html','html']])$(id).addEventListener('click',()=>{if(downloads)location.href=downloads[format];});

let workflowToken=null,workflowDownloads=null;
async function callTool(name,args={}){const result=await rpc('tools/call',{name,arguments:args});if(result.isError)throw Error(result.content?.[0]?.text||'Workflow step failed');return result.structuredContent||JSON.parse(result.content[0].text);}
function showWorkflow(state){
 workflowToken=state.token||null;
 $('workflow-output').textContent=JSON.stringify({...state,token:state.token?'[signed continuation token retained by this presenter]':undefined},null,2);
 $('workflow-status').textContent='Skill '+state.skill.id+' v'+state.skill.version+' · '+state.status+' · '+(state.step||'All checks complete');
 $('workflow-advance').hidden=state.status!=='active';
 $('workflow-advance').textContent='Run '+(state.step||'next step').replaceAll('_',' ');
 if(state.status==='completed'&&state.result?.downloads){workflowDownloads=state.result.downloads;$('workflow-pdf').hidden=false;$('workflow-html').hidden=false;}
}
$('workflow-start').addEventListener('click',async()=>{
 $('workflow-start').disabled=true;$('workflow-advance').hidden=true;$('workflow-pdf').hidden=true;$('workflow-html').hidden=true;workflowToken=null;workflowDownloads=null;
 try{
  const init=await rpc('initialize',{protocolVersion:protocol,capabilities:{},clientInfo:{name:'wetland-guided-presenter',version:'1.0.0'}});protocol=init.protocolVersion;
  await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':protocol},body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});
  const found=await callTool('find_skills',{query:'Growth'});if(!found.skills?.length)throw Error('No approved Growth skill available');
  const skill=await callTool('get_skill',{id:'growth-reporting'});
  const form=new FormData($('report-form')),args={};for(const key of ['start','end','target']){const value=form.get(key);if(value)args[key]=key==='target'?Number(value):value;}
  const state=await callTool('start_workflow',args);showWorkflow(state);
  $('workflow-status').textContent+=' · '+skill.name;
 }catch(error){$('workflow-status').textContent=error.message;}finally{$('workflow-start').disabled=false;}
});
$('workflow-advance').addEventListener('click',async()=>{
 if(!workflowToken)return;$('workflow-advance').disabled=true;$('workflow-start').disabled=true;
 try{await callTool('get_workflow_step',{token:workflowToken});showWorkflow(await callTool('advance_workflow',{token:workflowToken}));}
 catch(error){$('workflow-status').textContent='Step blocked: '+error.message+' No new report links released.';}
 finally{$('workflow-advance').disabled=false;$('workflow-start').disabled=false;}
});
for(const [id,format] of [['workflow-pdf','pdf'],['workflow-html','html']])$(id).addEventListener('click',()=>{if(workflowDownloads)location.href=workflowDownloads[format];});
