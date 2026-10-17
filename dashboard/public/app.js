import {ensureMembers,currentMember,selectMember,roleLabel} from './members.js';
import {createRoleManager} from './roles.js';
import {enhanceDropdowns} from './dropdowns.js';
import {createStudio} from './hub-studio.js';
import {bindDashboardAuth, signOutSession} from './auth.js';
import{ROLES,STAGES,uid,initialState,record,requireRole,createRequest,transition,submitProject,claimTask,submitTask,acceptTask,publishUpdate,rollback,reportIssue,SOURCE_DOCS,compose,evaluations}from'./model.js';
const KEY='wetland-demo-v1';let storageError=false;let s;
try{s=JSON.parse(localStorage.getItem(KEY));if(s?.schema!==1)s=initialState()}catch{s=initialState();storageError=true}
if(s.role==='staff'||s.role==='reviewer')s.role='admin';
ensureMembers(s);
let sidebarCollapsed=false;try{sidebarCollapsed=localStorage.getItem('wetland-sidebar-collapsed')==='true';}catch{}
let route='overview',selected='',query='',filter='All',selectedSources=['A','B','C'],draft=null,editing=false,changeQuery='',sessionEmail='',admitted=false;
const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',file:'M14 2H5v20h14V7z M14 2v5h5 M8 12h8 M8 16h8',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',shield:'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7z M8 12l3 3 5-6',tool:'m14 6 4 4 M6 14l-3 3a3 3 0 0 0 4 4l3-3 M8 16l8-8 M14 3a6 6 0 0 0-7 8l6 6a6 6 0 0 0 8-7l-4 4-7-7Z',box:'m12 2 9 5v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10',activity:'M3 12h4l3-8 4 16 3-8h4',arrow:'M4 12h16 M14 6l6 6-6 6',plus:'M12 5v14 M5 12h14',check:'m5 12 4 4L19 6',clock:'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',menu:'M3 6h18 M3 12h18 M3 18h18',search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',heart:'M20 4c-3-3-7-1-8 2-1-3-5-5-8-2-6 6 8 16 8 16S26 10 20 4',code:'m8 5-7 7 7 7 M16 5l7 7-7 7 M14 3l-4 18'};
const icon=n=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(icons[n]||icons.box)+'"/></svg>';
const badge=t=>'<span class="badge '+esc(t)+'">'+esc(t)+'</span>';
const btn=(text,action,extra='',cls='')=>'<button type="button" class="btn '+cls+'" data-action="'+action+'" '+extra+'>'+text+'</button>';
const link=(text,r,id='',cls='btn secondary')=>'<a class="'+cls+'" href="#'+r+(id?'/'+encodeURIComponent(id):'')+'">'+text+'</a>';
const project=id=>s.projects.find(p=>p.id===id);
const tasksFor=id=>s.tasks.filter(t=>t.toolId===id);
const nameFor=id=>project(id)?.title||'Platform';
const nowLabel=at=>new Date(at).toLocaleString('en-CA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
function save(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{storageError=true;toast('Browser storage unavailable. Export your session before leaving.')} }
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),5000)}
function modal(title,body){$('#modal').innerHTML='<div class="modal-head"><h2 id="dialog-title">'+title+'</h2><button class="close" data-action="close" aria-label="Close dialog">×</button></div><div class="modal-body"><p id="dialog-error" class="dialog-feedback" role="alert" tabindex="-1" hidden></p>'+body+'</div>';$('#modal').setAttribute('aria-labelledby','dialog-title');enhanceDropdowns($('#modal'));$('#modal').showModal();$('#modal').scrollTop=0}
function reportError(message){if($('#modal').open){const error=$('#dialog-error');if(error){error.textContent=message;error.hidden=false;error.focus();return;}}toast(message);}
function close(){$('#modal').close()}
function roleHint(role){return'<div class="notice blue">This action belongs to the <strong>'+role+'</strong> role. Use the demo role switcher above to continue.</div>'}
function pageHead(title,sub,action='',eye='YOUR WORKSPACE'){return'<div class="page-head"><div><p class="eyebrow">'+eye+'</p><h1>'+title+'</h1><p class="subtitle">'+sub+'</p></div>'+action+'</div>'}
function empty(title,body){return'<div class="empty"><h3>'+title+'</h3><p>'+body+'</p></div>'}
function timeline(events,limit=6){return'<ul class="timeline">'+events.slice(0,limit).map(e=>'<li>'+esc(e.message)+'<small>'+esc(e.actor)+' · '+nowLabel(e.at)+(e.kind==='Seeded demo'?' · Seeded example':'')+'</small></li>').join('')+'</ul>'}
function shell(content){let nav=[['overview','Hub overview','home'],['library','Resource library','grid'],['requests','Requests & roadmap','file'],['community','Contributors','users'],['changelog','Change log','activity']];if(s.role==='admin')nav.push(['roles','Roles','shield']);else nav=nav.filter(([id])=>['library','community','changelog'].includes(id)).map(item=>item[0]==='community'?['community','My work','users']:item);
const active=['run','stewardship'].includes(route)?'tools':route==='project'?'requests':route==='review'?'governance':route==='document'?'documents':route;
$('#app').innerHTML='<aside class="sidebar" id="workspace-sidebar"><div class="brand"><img src="assets/wateraid-logo.png" alt="WaterAid brand reference"><span class="project">WETLAND</span><small>MCP hub & resource library</small></div><div class="nav-label">WORK TOGETHER</div><nav aria-label="Main navigation">'+nav.map(([r,l,i])=>'<a class="nav-item '+(r===active?'active':'')+'" href="#'+r+'" '+(r===active?'aria-current="page"':'')+' aria-label="'+esc(l)+'" title="'+esc(l)+'">'+icon(i)+'<span class="nav-item-label">'+l+'</span>'+(r==='governance'?'<span class="nav-count">'+(s.projects.filter(p=>['Review','Pilot'].includes(p.status)||p.candidate).length+s.tasks.filter(t=>t.status==='Review').length)+'</span>':'')+'</a>').join('')+'</nav><div class="side-bottom"><button class="sidebar-toggle" data-action="toggle-sidebar" aria-controls="workspace-sidebar" aria-label="Collapse sidebar" title="Collapse sidebar" aria-expanded="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button></div></aside><div class="shell"><header class="topbar"><button class="mobile-menu" data-action="menu" aria-label="Toggle navigation" aria-controls="workspace-sidebar" aria-expanded="false">'+icon('arrow')+'</button><div class="breadcrumb">Wetland <span style="padding:0 8px">/</span><b>'+esc(nav.find(x=>x[0]===active)?.[1]||'Workspace')+'</b></div><div class="top-actions"><span class="demo-pill">SYNTHETIC DATA · DEMO</span><span class="signed-in">'+esc(sessionEmail)+'</span><button class="btn secondary small" type="button" data-action="sign-out">Sign out</button><label for="role" class="sr-only" style="margin:0;font-size:10px">View as</label><select id="role" class="role-select" aria-label="Demo user">'+s.members.map(m=>'<option value="'+esc(m.id)+'" '+(s.activeMemberId===m.id?'selected':'')+'>'+esc(m.name)+' · '+roleLabel(m.role)+'</option>').join('')+'</select><span class="avatar">'+esc(currentMember(s).name.split(' ').map(n=>n[0]).join(''))+'</span></div></header><main id="main" tabindex="-1">'+(storageError?'<div class="notice warning">Storage is unavailable. Changes last only for this visit; export your session to retain them.</div>':'')+content+'<footer class="bottom-note"><span>Hub sandbox v0.3 · Synthetic data · Browser-local editing</span><a href="https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/" target="_blank" rel="noopener noreferrer">Brand reference ↗</a></footer></main></div>';enhanceDropdowns($('#app'));syncSidebar();}
function syncSidebar(){
const sidebar=$('.sidebar');if(!sidebar)return;
$('#app').classList.toggle('sidebar-collapsed',sidebarCollapsed);
const mobile=matchMedia('(max-width:760px)').matches,expanded=mobile?sidebar.classList.contains('open'):!sidebarCollapsed;
sidebar.inert=mobile&&!expanded;
const button=$('.sidebar-toggle');
if(button){const label=expanded?(mobile?'Close sidebar':'Collapse sidebar'):'Expand sidebar';button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',label);button.title=label;}
const menu=$('.mobile-menu');if(menu)menu.setAttribute('aria-expanded',String(mobile&&expanded));
}
window.addEventListener('resize',()=>{if($('.sidebar'))syncSidebar();});
function closeMobileSidebar(){if(!matchMedia('(max-width:760px)').matches||!$('.sidebar')?.classList.contains('open'))return;$('.sidebar').classList.remove('open');syncSidebar();$('.mobile-menu').focus();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').open&&$('.sidebar')?.classList.contains('open')){e.preventDefault();closeMobileSidebar();}});
document.addEventListener('click',e=>{if(!e.target.closest('.sidebar,.mobile-menu'))closeMobileSidebar();});
function requests(){return pageHead('From a need to a useful tool.','Keep the problem, the people, and the acceptance criteria together.',s.role==='admin'?btn(icon('plus')+' New request','request','','lime'):'','REQUESTS & ROADMAP')+'<div class="board">'+[['Requested','Scoped'],['Building','Review'],['Pilot','Live','Retired']].map((st,i)=>'<section class="column"><h3>'+['01 · Shape the need','02 · Build & review','03 · Put it to work'][i]+'<span>'+s.projects.filter(p=>st.includes(p.status)).length+'</span></h3>'+s.projects.filter(p=>st.includes(p.status)).map(p=>'<article class="card"><div class="card-top">'+badge(p.status)+'<span class="cap-label">'+esc(p.category)+'</span></div><h3>'+esc(p.title)+'</h3><p>'+esc(p.problem)+'</p><small class="split-note">Sponsor · '+esc(p.sponsor)+'</small><div>'+btn('Open challenge →','project-details','data-id="'+p.id+'"','quiet')+'</div></article>').join('')+'</section>').join('')+'</div>'}
function projectActions(p){let b='';
if(p.status==='Requested')b=s.role==='admin'?btn('Approve scope','transition','data-id="'+p.id+'" data-next="Scoped"'):roleHint('Admin');
if(p.status==='Scoped')b=['admin','contributor'].includes(s.role)?btn('Claim challenge','transition','data-id="'+p.id+'" data-next="Building"'):roleHint('Contributor');
if(p.status==='Building'&&s.role!=='admin'&&p.assigneeId&&p.assigneeId!==s.activeMemberId)return '<p class="split-note">Assigned to '+esc(p.assignee||'another member')+'.</p>';
if(p.status==='Building')b=['admin','contributor'].includes(s.role)?btn('Submit for review','submit-project','data-id="'+p.id+'"'):roleHint('Contributor');
if(['Review','Pilot'].includes(p.status)||p.candidate){
if(s.role!=='admin')return '<p class="split-note">Awaiting Admin review. Follow progress on the roadmap.</p>';
const target=p.candidate||p;
b='<section class="project-review"><h3>'+(p.candidate?'Review release v'+esc(target.version):'Review readiness')+'</h3><p class="split-note">These local checks validate the demonstration record. Review implementation evidence before approving.</p>'+(p.candidate?'<h4>Submitted change</h4><p>'+esc(target.notes)+'</p>':'')+btn('Run evaluation checks','evaluate','data-id="'+p.id+'"','secondary')+(target.evals?'<ul class="checklist">'+target.evals.map(x=>'<li><span>'+ (x.pass?'Pass':'Fail')+' · '+esc(x.name)+'<small class="split-note">'+esc(x.detail)+'</small></span></li>').join('')+'</ul>':'')+'<div class="checklist">'+[['scope','Scope and acceptance criteria reviewed'],['data','Data access and privacy reviewed'],['owner','Maintainer and backup confirmed'],['quality','Quality and implementation evidence reviewed']].map(([key,label])=>'<label class="review-check"><input type="checkbox" data-review-check="'+key+'" data-id="'+p.id+'" '+(target.checks?.[key]?'checked':'')+'>'+label+'</label>').join('')+'</div><div class="actions">'+(p.candidate?btn('Publish update','publish-update','data-id="'+p.id+'"'):btn(p.status==='Review'?'Approve for pilot':'Approve for live','transition','data-id="'+p.id+'" data-next="'+(p.status==='Review'?'Pilot':'Live')+'"'))+(!p.candidate?btn('Request changes','transition','data-id="'+p.id+'" data-next="Building"','secondary'):'')+'</div></section>';
}
if(['Live','Retired'].includes(p.status)&&!p.candidate)b=link('Browse related capabilities →','library')+(p.status==='Live'&&s.role==='admin'?btn('Report an issue','issue','data-id="'+p.id+'"','secondary'):'');
return b}
function community(){
if(s.role==='contributor')return contributorHome();
const projects=s.projects.filter(p=>['Scoped','Building','Review','Pilot'].includes(p.status));
return pageHead('Contributions','Review submitted work, help with a task or move a challenge forward.','','TEAM WORK')+'<div class="section-title"><h2>Challenges</h2></div><div class="grid two">'+(projects.length?projects.map(p=>'<article class="card"><div class="card-top">'+badge(p.status)+'</div><h3>'+esc(p.title)+'</h3><p>'+esc(p.description)+'</p>'+btn('Open work','project-details','data-id="'+p.id+'"','secondary')+'</article>').join(''):empty('No active challenges','New requests will appear here once scoped.'))+'</div><div class="section-title"><h2>Tasks</h2></div><div class="grid two">'+(s.tasks.length?s.tasks.map(taskCard).join(''):empty('No tasks yet','Reported issues and contributions will appear here.'))+'</div>';
}

function contributorHome(){
const member=currentMember(s),mine=t=>t.assigneeId===member.id||(!t.assigneeId&&t.assignee===member.name);
const myTasks=s.tasks.filter(mine),myProjects=s.projects.filter(p=>mine(p)&&['Building','Review','Pilot'].includes(p.status)),availableProjects=s.projects.filter(p=>p.status==='Scoped'),availableTasks=s.tasks.filter(t=>t.status==='Open');
const projectCard=p=>'<article class="card"><div class="card-top">'+badge(p.status)+'</div><h3>'+esc(p.title)+'</h3><p>'+esc(p.description)+'</p>'+btn('Open work','project-details','data-id="'+p.id+'"','secondary')+'</article>';
const onboarding=s.onboarded?'':'<div class="contributor-start"><div><h2>Start contributing</h2><p>Review the short agreement, then choose a task below.</p></div>'+btn('Get started','onboard','','lime')+'</div>';
return pageHead('My work','Pick a task, share your progress and send it for review.','','CONTRIBUTOR')+onboarding+'<div class="section-title"><h2>Your work</h2></div><div class="grid two">'+(myTasks.length||myProjects.length?myProjects.map(projectCard).join('')+myTasks.map(taskCard).join(''):empty('Nothing assigned yet','Choose an available task to get started.'))+'</div><div class="section-title"><h2>Available work</h2></div><div class="grid two">'+(availableProjects.length||availableTasks.length?availableProjects.map(projectCard).join('')+availableTasks.map(taskCard).join(''):empty('No available work','You are all caught up. Check back for new tasks.'))+'</div>';
}
function taskCard(t){return '<article class="card"><div class="card-top">'+badge(t.status)+'</div><h3>'+esc(t.title)+'</h3><p>'+esc(t.description)+'</p><div class="card-footer"><small>'+(t.assignee?'Assigned to '+esc(t.assignee):'Available to claim')+'</small>'+btn('Open task','task','data-id="'+t.id+'"','secondary')+'</div></article>';}

function changeRows(){
const term=changeQuery.trim().toLowerCase();
const events=[...s.events].sort((a,b)=>new Date(b.at)-new Date(a.at)).filter(e=>[e.message,e.actor,e.kind,e.actorRole?roleLabel(e.actorRole):''].join(' ').toLowerCase().includes(term));
return events.length?events.map(e=>'<tr><td>'+esc(e.message)+'</td><td>'+esc(e.actor)+(e.actorRole?'<small class="log-actor-role">'+roleLabel(e.actorRole)+'</small>':'')+'</td><td><time datetime="'+esc(e.at)+'">'+esc(nowLabel(e.at))+'</time></td><td>'+esc(e.kind)+'</td></tr>').join(''):'<tr><td colspan="4" class="log-empty">'+(changeQuery?'No changes match your search.':'No changes yet.')+'</td></tr>';
}
function activity(){return pageHead('Change log','See what changed, who changed it and when.',s.role==='admin'?btn(icon('download')+' Export session','export-session','','secondary'):'','CHANGE LOG')+'<div class="change-search"><label for="change-search">Search changes</label><input id="change-search" type="search" placeholder="Search by action, person or role" value="'+esc(changeQuery)+'"></div><div class="table-wrap"><table><thead><tr><th scope="col">Action</th><th scope="col">Changed by</th><th scope="col">Time</th><th scope="col">Type</th></tr></thead><tbody id="change-rows">'+changeRows()+'</tbody></table></div><p class="split-note">Changes are saved in this browser.</p>'}
function allowedRoutes(){return s.role==='admin'?['overview','library','requests','community','changelog','roles']:['library','community','changelog'];}
function render(){if(!allowedRoutes().includes(route)){route=s.role==='admin'?'overview':'library';history.replaceState(null,'','#'+route);}const routes={requests,community,changelog:activity,roles:()=>roleManager.render()};shell(studio.render(route,selected)??(routes[route]||requests)())}
function navigate(){const parts=location.hash.slice(1).split('/');let requested=parts[0]||'overview';if(requested==='activity')requested='changelog';route=allowedRoutes().includes(requested)?requested:s.role==='admin'?'overview':'library';selected='';if(location.hash!=='#'+route)history.replaceState(null,'','#'+route);query='';filter='All';render();window.scrollTo(0,0)}
function projectModal(id){const p=project(id);if(!p)return;modal(esc(p.title),'<div class="tag-row">'+badge(p.status)+'<span class="tag">'+esc(p.category)+'</span></div><h3>The need</h3><p>'+esc(p.problem)+'</p><h3>What success looks like</h3><p>'+esc(p.success)+'</p><dl class="detail-list"><div><dt>Sponsor</dt><dd>'+esc(p.sponsor)+'</dd></div><div><dt>Maintainer</dt><dd>'+esc(p.maintainer)+'</dd></div><div><dt>Data</dt><dd>'+esc(p.data)+'</dd></div></dl>'+(p.submission?'<h3>Contributor evidence</h3><p>'+esc(p.submission)+'</p>':'')+'<div class="actions">'+projectActions(p)+'</div>')}
function formField(label,name,type='text',value='',required=true){return'<div class="field"><label for="f-'+name+'">'+label+'</label>'+(type==='textarea'?'<textarea id="f-'+name+'" name="'+name+'" rows="4" '+(required?'required':'')+' maxlength="4000">'+esc(value)+'</textarea>':'<input id="f-'+name+'" name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+(required?'required':'')+' maxlength="250">')+'</div>'}
function requestModal(){if(s.role!=='admin')return modal('Request a tool',roleHint('Admin'));modal('What could work better?','<p class="subtitle" style="margin-bottom:22px">Describe the work first. The community can help shape the solution.</p><form data-form="request">'+formField('Tool or task name','title')+formField('What takes time or causes difficulty?','problem','textarea')+formField('How will you know it works?','success','textarea')+'<div class="field"><label for="category">Work area</label><select name="category" id="category"><option>Operations</option><option>Reporting</option><option>Knowledge</option><option>Communications</option></select></div><div class="notice">Use synthetic examples only. Admin sponsor: Maya Chen. Initial review owner: Sam Patel.</div><button class="btn" type="submit">Submit request →</button></form>')}
function taskModal(t){if(!t)return;let act='';
if(t.status==='Triage')act=s.role==='admin'?'<form data-form="triage" data-id="'+t.id+'">'+formField('Sanitized reproduction for contributors','description','textarea',t.description)+'<p class="split-note">Review for sensitive information before opening the task.</p><button class="btn" type="submit">Approve & open to contributors</button></form>':roleHint('Admin');
if(t.status==='Open')act=['admin','contributor'].includes(s.role)?btn('Claim this task','claim-task','data-id="'+t.id+'"'):roleHint('Contributor');
if(t.status==='In progress')act=['admin','contributor'].includes(s.role)?'<form data-form="submit-task" data-id="'+t.id+'">'+formField('What changed and what evidence supports it?','notes','textarea')+'<p class="split-note">This demo records evidence text. It does not run or merge external code.</p><button class="btn" type="submit">Submit contribution</button></form>':roleHint('Contributor');
if(t.status==='Review')act=s.role==='admin'?'<div class="actions">'+btn(t.kind==='Bug fix'?'Accept & create release candidate':'Accept contribution','accept-task','data-id="'+t.id+'"')+btn('Request changes','task-changes','data-id="'+t.id+'"','secondary')+'</div>':roleHint('Admin');
if(t.status==='Release pending')act='<p class="split-note">Release progress is tracked on the requests and roadmap board.</p>';
if(s.role!=='admin'&&t.assigneeId&&t.assigneeId!==s.activeMemberId)act='<p class="split-note">Assigned to '+esc(t.assignee||'another member')+'.</p>';
modal(esc(t.title),'<div class="tag-row">'+badge(t.status)+'<span class="tag">'+esc(t.kind)+'</span></div><p>'+esc(t.description)+'</p>'+(t.submission?'<div class="source"><h3>Submitted evidence</h3><p>'+esc(t.submission)+'</p></div>':'')+act)}
function issueModal(id){if(s.role!=='admin')return modal('Report an issue',roleHint('Admin'));let ps=s.projects.filter(p=>['Live','Pilot'].includes(p.status));if(!ps.length)return modal('No active tools','<p>Issues can be reported against live or pilot tools.</p>');modal('Help make the tool better.','<form data-form="issue"><div class="field"><label for="issue-tool">Tool</label><select name="toolId" id="issue-tool">'+ps.map(p=>'<option value="'+p.id+'" '+(id===p.id?'selected':'')+'>'+esc(p.title)+' · v'+esc(p.version)+'</option>').join('')+'</select></div>'+formField('What went wrong?','title')+formField('What did you expect? How can we reproduce it?','description','textarea')+'<div class="notice">Use synthetic details. A maintainer reviews and sanitizes this report before contributors can claim it.</div><button class="btn" type="submit">Send to maintenance triage</button></form>')}
function download(name,text,type='text/plain'){const u=URL.createObjectURL(new Blob([text],{type}));let a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function updateDraft(){if(!draft)return;let i=s.runs.findIndex(r=>r.id===draft.id);if(i>=0)s.runs[i]=structuredClone(draft);save()}
document.addEventListener('click',e=>{let b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;if(a.startsWith('hub-'))return;
try{
if(a==='sign-out'){signOutSession();return}
if(a==='menu'){$('.sidebar').classList.toggle('open');syncSidebar();return}
if(a==='toggle-sidebar'){if(matchMedia('(max-width:760px)').matches){$('.sidebar').classList.remove('open');syncSidebar();$('.mobile-menu').focus();}else{sidebarCollapsed=!sidebarCollapsed;try{localStorage.setItem('wetland-sidebar-collapsed',String(sidebarCollapsed));}catch{}syncSidebar();}return}
if(a==='close'){close();return}
if(a==='request'){requestModal();return}
if(a==='project-details'){projectModal(id);return}
if(a==='filter'){filter=b.dataset.value;render();return}
if(a==='onboard'){if(!['admin','contributor'].includes(s.role)){modal('Contributor onboarding',roleHint('Contributor'));return}modal('A good contribution starts here.','<form data-form="onboard"><p>Work with the community using shared components, clear evidence, and synthetic examples.</p><ul class="checklist">'+['I will use synthetic or explicitly approved public data.','I will document changes, tests, and limitations.','I understand that maintainers review every release.','I understand that this onboarding grants no production access.'].map((t,i)=>'<li><input required type="checkbox" id="agree-'+i+'"><label for="agree-'+i+'">'+t+'</label></li>').join('')+'</ul><button type="submit" class="btn">Complete onboarding</button></form>');return}
if(a==='transition'){transition(s,id,b.dataset.next);close();toast('Project moved to '+b.dataset.next)}
if(a==='submit-project'){requireRole(s,['contributor']);modal('Submit implementation evidence','<form data-form="project-submit" data-id="'+id+'">'+formField('Describe the implementation, tests, and known limits','notes','textarea')+'<div class="notice">This creates a review record. It does not execute, verify, or deploy external code.</div><button class="btn" type="submit">Submit for review</button></form>');return}
if(a==='task'){taskModal(s.tasks.find(t=>t.id===id));return}
if(a==='claim-task'){claimTask(s,id);close();toast('Task claimed')}
if(a==='accept-task'){acceptTask(s,id);close();toast('Contribution accepted')}
if(a==='task-changes'){requireRole(s,['admin']);const t=s.tasks.find(t=>t.id===id);if(t.status!=='Review')throw Error('Task is not awaiting review.');t.status='In progress';record(s,'Requested changes: '+t.title,t.toolId);close();toast('Returned to contributor')}
if(a==='issue'){issueModal(id||selected);return}
if(a==='evaluate'){requireRole(s,['admin']);const p=project(id),target=p.candidate||p;target.evals=evaluations(p);record(s,'Ran '+target.evals.length+' local evaluation checks for '+p.title,p.id);save();render();projectModal(id);toast('Evaluation results updated');return}
if(a==='publish-update'){publishUpdate(s,id);close();toast('Update released; previous version retained')}
if(a==='rollback'){modal('Roll back this release','<form data-form="rollback" data-id="'+id+'">'+formField('Reason for rollback','reason','textarea')+'<button class="btn" type="submit">Confirm rollback</button></form>');return}
if(a==='ownership'){requireRole(s,['admin']);let p=project(id);modal('Assign lasting ownership','<form data-form="ownership" data-id="'+id+'">'+formField('Staff sponsor','sponsor','text',p.sponsor)+formField('Technical maintainer','maintainer','text',p.maintainer)+formField('Backup maintainer','backup','text',p.backup)+formField('Next review date','reviewDate','date',p.reviewDate)+'<button class="btn" type="submit">Save ownership</button></form>');return}
if(a==='retire'){requireRole(s,['admin']);modal('Retire '+esc(nameFor(id)),'<p>This removes the tool from active use. Its records and release history remain available.</p>'+btn('Confirm retirement','confirm-retire','data-id="'+id+'"','danger'));return}
if(a==='confirm-retire'){transition(s,id,'Retired');close();toast('Tool retired')}
if(a==='generate'){requireRole(s,['admin']);let p=project(id);if(!['Live','Pilot'].includes(p.status))throw Error('This tool is not available.');const result=compose(SOURCE_DOCS.filter(d=>selectedSources.includes(d.id)));draft={...result,id:uid(),toolId:p.id,title:'Riverbend programme update',version:p.version,at:new Date().toISOString(),status:'Draft',edited:false};s.runs.unshift(structuredClone(draft));record(s,'Created a source-linked draft with '+selectedSources.length+' sources',p.id);editing=false;toast('Draft created. Review the sources and date conflict.')}
if(a==='source'){let d=SOURCE_DOCS.find(x=>x.id===id);modal('Source ['+d.id+'] · '+d.title,'<span class="badge">Synthetic source</span><p class="split-note">'+d.date+'</p><p>'+esc(d.text)+'</p>');return}
if(a==='edit-draft'){editing=true;render();return}
if(a==='save-draft'){draft.text=$('#draft-text').value;draft.edited=true;draft.status='Draft';editing=false;updateDraft();toast('Edits saved; review status reset')}
if(a==='export-draft'){if(editing)throw Error('Save your edits before exporting.');download('riverbend-update.txt',draft.text+'\n\nOutput status: '+draft.status+'\nTool version: '+draft.version);return}
if(a==='review-draft'){requireRole(s,['admin']);if(editing)throw Error('Save your edits before recording review.');modal('Record your review','<form data-form="draft-review"><ul class="checklist"><li><input type="checkbox" id="review-agree" required><label for="review-agree">I have checked the source references and understand that any flagged date conflict still needs resolution before use.</label></li></ul><button class="btn" type="submit">Mark reviewed</button></form>');return}
if(a==='open-run'){draft=structuredClone(s.runs.find(r=>r.id===id));editing=false;location.hash='run/'+draft.toolId;render();return}
if(a==='brief'){let p=project(id);download('wetland-project-brief.json',JSON.stringify({project:p,tasks:tasksFor(id),scope:'Synthetic-data prototype; repository integration not connected'},null,2),'application/json');return}
if(a==='export-session'){requireRole(s,['admin']);download('wetland-session.json',JSON.stringify(s,null,2),'application/json');return}
if(a==='reset'){modal('Reset this demonstration?','<p>This clears local requests, drafts, tasks, and activity. Export your session first if you want to keep a copy.</p><div class="actions">'+btn('Export session','export-session','','secondary')+btn('Reset local demo','confirm-reset','','danger')+'</div>');return}
if(a==='confirm-reset'){s=initialState();ensureMembers(s);draft=null;editing=false;close();save();location.hash='overview';render();toast('Demo restored');return}
save();render();
}catch(err){reportError(err.message)}});
document.addEventListener('submit',e=>{let f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();let v=Object.fromEntries(new FormData(f)),id=f.dataset.id;
try{switch(f.dataset.form){
case'request':{let p=createRequest(s,v);close();save();location.hash='requests';render();toast('Request created');return}
case'onboard':requireRole(s,['contributor']);s.onboarded=true;if(currentMember(s))currentMember(s).onboarded=true;record(s,'Completed contributor onboarding','community');toast('Ready to contribute');break;
case'project-submit':submitProject(s,id,v.notes);toast('Submitted for review');break;
case'issue':reportIssue(s,v.toolId,v.title,v.description);toast('Issue sent to triage');break;
case'triage':{requireRole(s,['admin']);let t=s.tasks.find(x=>x.id===id);if(t.status!=='Triage')throw Error('Task already triaged.');if(!v.description.trim())throw Error('Provide a sanitized reproduction.');t.description=v.description.trim();t.status='Open';record(s,'Opened sanitized maintenance task: '+t.title,t.toolId);toast('Task opened to contributors');break}
case'submit-task':submitTask(s,id,v.notes);toast('Contribution submitted');break;
case'rollback':rollback(s,id,v.reason);toast('Previous version restored');break;
case'ownership':{requireRole(s,['admin']);if(Object.values(v).some(x=>!x.trim()))throw Error('Complete all ownership fields.');Object.assign(project(id),v);record(s,'Updated ownership for '+nameFor(id),id);toast('Ownership updated');break}
case'draft-review':requireRole(s,['admin']);draft.status='Reviewed';updateDraft();record(s,'Recorded human review of a programme update',draft.toolId);toast('Human review recorded');break;
}close();save();render()}catch(err){reportError(err.message)}});
document.addEventListener('change',e=>{
try{
if(e.target.id==='role'){selectMember(s,e.target.value);close();save();render();toast('Viewing as '+currentMember(s).name)}
if(e.target.id==='status-filter'){filter=e.target.value;render()}
if(e.target.dataset.source){const id=e.target.dataset.source;selectedSources=e.target.checked?[...new Set([...selectedSources,id])]:selectedSources.filter(x=>x!==id)}
if(e.target.dataset.reviewCheck){requireRole(s,['admin']);const p=project(e.target.dataset.id);let c=p.candidate||p;c.checks=c.checks||{};c.checks[e.target.dataset.reviewCheck]=e.target.checked;save()}
}catch(err){reportError(err.message);render()}});
document.addEventListener('input',e=>{if(e.target.id==='change-search'){changeQuery=e.target.value;$('#change-rows').innerHTML=changeRows();}if(e.target.id==='search'){let pos=e.target.selectionStart;query=e.target.value;render();$('#search').focus();$('#search').setSelectionRange(pos,pos)}});
document.addEventListener('click',e=>{if(e.target.closest('a.skip')){e.preventDefault();$('#main').focus();$('#main').scrollIntoView();return;}if(e.target.closest('a[href^="#"]')&&$('#modal').open)close()});
const roleManager=createRoleManager({state:()=>s,esc,btn,modal,close,toast,save,render,pageHead,reportError});
const studio=createStudio({state:()=>s,esc,btn,link,badge,pageHead,modal,close,toast,save,record,download,render});
window.addEventListener('hashchange',()=>{if(admitted)navigate()});
bindDashboardAuth({
  onAdmit(user){admitted=true;sessionEmail=user.email;navigate()},
  onReject(){admitted=false;sessionEmail=''}
});
