let nextId=0,protocol='2025-03-26',markdown='';
const $=id=>document.getElementById(id);
$('endpoint').textContent=location.origin+'/mcp';
async function rpc(method,params){
 const response=await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':protocol},body:JSON.stringify({jsonrpc:'2.0',id:++nextId,method,params})});
 if(!response.ok)throw Error(`MCP returned HTTP ${response.status}. Check the service configuration.`);
 const message=await response.json();if(message.error)throw Error(message.error.message);return message.result;
}
$('report-form').addEventListener('submit',async event=>{
 event.preventDefault();$('run').disabled=true;$('download').hidden=true;$('metrics').replaceChildren();$('report').textContent='';$('evidence').textContent='';$('status').textContent='Connecting to the MCP and calculating…';
 try{
 const init=await rpc('initialize',{protocolVersion:protocol,capabilities:{},clientInfo:{name:'wetland-presenter',version:'1.0.0'}});protocol=init.protocolVersion;
 await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':protocol},body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});
 const form=new FormData(event.target),args={start:form.get('start'),end:form.get('end'),target:Number(form.get('target'))};
 const result=await rpc('tools/call',{name:'generate_growth_report',arguments:args});if(result.isError)throw Error(result.content?.[0]?.text||'Report failed');
 const report=result.structuredContent||JSON.parse(result.content[0].text);
 for(const [value,label] of [[report.actual,'New donors'],[report.attainmentPercent+'%','Of target'],[report.gapToTarget,'Gap to target']]){const tile=document.createElement('div');tile.className='metric';const number=document.createElement('strong'),caption=document.createElement('span');number.textContent=value;caption.textContent=label;tile.append(number,caption);$('metrics').append(tile);}
 markdown=report.markdown;$('report').textContent=markdown;$('evidence').textContent=JSON.stringify({request:{method:'tools/call',name:'generate_growth_report',arguments:args},result:report},null,2);$('download').hidden=false;$('status').textContent='Calculated from the synthetic export through the live MCP endpoint.';
 }catch(error){$('status').textContent=error.message;}finally{$('run').disabled=false;}
});
$('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown'})),a=document.createElement('a');a.href=url;a.download='growth-report-synthetic.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
