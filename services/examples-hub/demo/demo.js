import {scenarios} from './scenarios.js';
const $=id=>document.getElementById(id);
let nextId=0,protocol='2025-03-26',busy=false,skills=[],loadedSkill=null,receipt=null;
for(const [i,s]of scenarios.entries()){const option=document.createElement('option');option.value=i;option.textContent=s.name;$('scenario').append(option);}
function selected(){return scenarios[Number($('scenario').value)];}
function clearResult(){$('results').hidden=true;$('result').textContent='';$('sources').replaceChildren();}
function controls(){
 for(const id of ['run','copy','find-skills','scenario'])$(id).disabled=busy;
 $('skill-choice').disabled=busy||!skills.length;
 $('load-skill').disabled=busy||!skills.length;
 $('start-workflow').disabled=busy||!loadedSkill;
 $('advance-workflow').disabled=busy||!receipt||receipt.status!=='active';
}
function resetWorkflow(){receipt=null;for(const item of $('workflow-progress').children)item.classList.remove('done');$('advance-workflow').textContent='4. Check evidence';}
function resetSkills(){skills=[];loadedSkill=null;resetWorkflow();$('skill-content').hidden=true;$('skill-markdown').textContent='';$('skill-version').textContent='';const option=document.createElement('option');option.textContent='Discover skills first';$('skill-choice').replaceChildren(option);}
function update(){const s=selected();resetSkills();clearResult();$('prompt').textContent=s.prompt;$('inputs').textContent=JSON.stringify({name:s.tool,arguments:s.args},null,2);$('endpoint').textContent=location.origin+'/mcp/'+s.scope;$('status').textContent='Ready to run '+s.name+'.';$('workflow-status').textContent='Discover the playbook for '+s.name+'.';controls();}
const requestedScope=new URLSearchParams(location.search).get('capability'),initialIndex=scenarios.findIndex(s=>s.scope===requestedScope);if(initialIndex>=0)$('scenario').value=String(initialIndex);
$('scenario').addEventListener('change',update);update();
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(selected().prompt);$('status').textContent='Prompt copied. Use it after your approved agent is connected.';}catch{$('status').textContent='Select and copy the prompt above; clipboard access is unavailable.';}});
async function rpc(method,params,notification=false){
 const response=await fetch('/mcp/'+selected().scope,{method:'POST',signal:AbortSignal.timeout(90000),headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':protocol},body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id:++nextId}),method,params})});
 if(!response.ok)throw Error('MCP returned HTTP '+response.status);if(notification)return;
 const message=await response.json();if(message.error)throw Error(message.error.message);return message.result;
}
async function connect(){const init=await rpc('initialize',{protocolVersion:protocol,capabilities:{},clientInfo:{name:'wetland-examples-presenter',version:'0.2.0'}});protocol=init.protocolVersion;await rpc('notifications/initialized',{},true);}
async function callTool(name,args){const result=await rpc('tools/call',{name,arguments:args});if(result.isError)throw Error(result.content?.[0]?.text||'Tool failed');return result.structuredContent||JSON.parse(result.content[0].text);}
function renderResult(data){
 const {sources=[],...value}=data;$('result').textContent=JSON.stringify(value,null,2);$('sources').replaceChildren();
 for(const source of sources){const div=document.createElement('div');div.className='source';const title=document.createElement('strong'),text=document.createElement('p'),uri=document.createElement('code');title.textContent=source.id+' · '+source.title;text.textContent=source.text;uri.textContent=source.uri;div.append(title,text,uri);$('sources').append(div);}
 $('results').hidden=false;
}
async function action(message,fn){
 if(busy)return;busy=true;controls();clearResult();$('status').textContent=message;$('workflow-status').textContent=message;
 try{await connect();await fn();}catch(error){clearResult();resetWorkflow();$('status').textContent=error.message;$('workflow-status').textContent=error.message+' Restart the guided example to retry.';}finally{busy=false;controls();}
}
function workflowState(state){
 if(!['active','completed'].includes(state.status)||typeof state.token!=='string'||!Array.isArray(state.completedSteps))throw Error('Invalid workflow response');
 receipt={token:state.token,status:state.status}; // Keep signed receipts only in memory; never render or persist them.
 const progress=$('workflow-progress').children;
 progress[0].classList.add('done');progress[1].classList.toggle('done',state.completedSteps.includes('check-evidence'));progress[2].classList.toggle('done',state.status==='completed');
 $('advance-workflow').textContent=state.status==='completed'?'Workflow complete':state.step==='return-advice'?'4. Retrieve checked advice':'4. Check evidence';
 const message=state.status==='completed'?'Workflow complete. Inspect the cited synthetic advice below.':state.step==='return-advice'?'Server evidence checked. Retrieve the advice to complete this example.':'Inputs validated. Continue to check source evidence on the server.';
 $('workflow-status').textContent=message;$('status').textContent=message;
}
$('demo-form').addEventListener('submit',e=>{e.preventDefault();resetWorkflow();action('Calling '+selected().tool+'…',async()=>{renderResult(await callTool(selected().tool,selected().args));$('status').textContent='Real MCP call complete. Synthetic evidence only; inspect the sources and limitations.';$('workflow-status').textContent='Direct example complete. Discover a playbook to try the guided path.';});});
$('find-skills').addEventListener('click',()=>{resetSkills();action('Discovering approved playbooks…',async()=>{const found=await callTool('find_skills',{query:''});if(!Array.isArray(found.skills))throw Error('Invalid skill catalogue');skills=found.skills;if(!skills.length)throw Error('No approved playbooks are available for this capability');$('skill-choice').replaceChildren();for(const s of skills){const option=document.createElement('option');option.value=s.id;option.textContent=s.name+' · '+s.version;$('skill-choice').append(option);}$('workflow-status').textContent='Choose a playbook and read its instructions.';$('status').textContent=skills.length+' approved playbook(s) found.';});});
$('skill-choice').addEventListener('change',()=>{loadedSkill=null;resetWorkflow();clearResult();$('skill-content').hidden=true;$('workflow-status').textContent='Read the selected playbook before starting.';controls();});
$('load-skill').addEventListener('click',()=>{loadedSkill=null;resetWorkflow();$('skill-content').hidden=true;action('Loading versioned Markdown instructions…',async()=>{const skill=await callTool('get_skill',{id:$('skill-choice').value});if(!skill.id||typeof skill.markdown!=='string')throw Error('Invalid playbook response');loadedSkill={id:skill.id,version:skill.version};$('skill-version').textContent=skill.name+' · version '+skill.version;$('skill-markdown').textContent=skill.markdown;$('skill-content').hidden=false;$('workflow-status').textContent='Playbook loaded. Start with the synthetic inputs shown above.';$('status').textContent='Instructions loaded as text; permissions remain enforced by the service.';});});
$('start-workflow').addEventListener('click',()=>{resetWorkflow();action('Validating the example inputs…',async()=>{const result=await callTool('start_workflow',{skillId:loadedSkill.id,inputsJson:JSON.stringify(selected().args)});if(result.status==='needs-input')throw Error('The playbook needs different inputs: '+result.issues.map(x=>x.path.join('.')+' '+x.message).join('; '));workflowState(result);});});
$('advance-workflow').addEventListener('click',()=>action('Executing the next server-checked step…',async()=>{
 const args={skillId:loadedSkill.id,token:receipt.token};await callTool('get_workflow_step',args);
 const next=await callTool('advance_workflow',args);workflowState(next);if(next.status==='completed')renderResult(next.result);
}));
