import {departments, matchingResources, connectionConfig,seedCatalogue,saveResource,deleteResource,restoreResource} from './resource-catalogue.js';

export function createResourceLibrary(c) {
  const {esc,btn,link,modal,toast} = c;
  let query='', status='All',managing=false;
  const catalogue=()=>c.state().resourceCatalogue??(c.state().resourceCatalogue=seedCatalogue());
  const resources=()=>catalogue().items;
  const available=r=>r.status==='Available'&&!!r.endpoint;
  const action = (label, type, id, cls='secondary') => btn(label,'hub-library-'+type,'data-id="'+esc(id)+'"',cls);
  const statusLabel = r => '<span class="resource-status '+(available(r)?'available':'planned')+'"><span aria-hidden="true"></span>'+esc(r.status)+'</span>';

  function card(r) {
    return `<article class="resource-card" data-resource-id="${esc(r.id)}">
      <div class="resource-card-top"><span class="resource-kind">${available(r)?'MCP RESOURCE':'CAPABILITY CONCEPT'}</span>${statusLabel(r)}</div>
      <h3>${esc(r.title)}</h3><p>${esc(r.description)}</p>
      <div class="resource-endpoint"><span>${available(r)?esc(r.transport||'Streamable HTTP'):'Connection pending'}</span>${r.endpoint?'<code>'+esc(r.endpoint)+'</code>':'<small>Endpoint not provisioned</small>'}</div>
      ${action('View details & agent prompt <span aria-hidden="true">↗</span>','details',r.id,'resource-open')}
      <div class="resource-methods" aria-label="${available(r)?'Available tools':'Proposed tools'}">${r.methods.slice(0,2).map(m=>'<code>'+esc(m)+'</code>').join('')}${r.methods.length>2?'<span>+'+(r.methods.length-2)+' tools</span>':''}</div>
      ${managing?'<div class="resource-manage-actions">'+action('Edit MCP','edit',r.id)+action('Delete','delete',r.id,'danger')+'</div>':''}
    </article>`;
  }

  function results() {
    const matches=matchingResources(query,status,resources());
    if(!resources().length)return {count:0,html:'<div class="resource-empty"><h2>Your MCP library is empty.</h2><p>Add a resource to get started, or restore one from Deleted entries.</p>'+action('Add MCP','add','','lime')+'</div>'};
    return {count:matches.length, html:departments.map(d=>{
      const list=matches.filter(r=>r.department===d.id);
      return !list.length?'':`<section class="resource-department" id="library-${d.id}" aria-labelledby="library-title-${d.id}">
        <div class="resource-section-head"><div><span class="resource-number">${d.number}</span><h2 id="library-title-${d.id}">${d.title}</h2></div><p>${d.description}</p></div>
        <div class="resource-grid">${list.map(card).join('')}</div></section>`;
    }).join('') || '<div class="resource-empty"><h2>No resources match.</h2><p>Try a department, a tool name or a broader search.</p>'+action('Clear filters','reset','','secondary')+'</div>'};
  }

  function render() {
    const result=results();
    return `<div class="resource-library">
      <div class="resource-management-bar"><span>Library changes are saved in this browser.</span><div>${action(managing?'Done managing':'Manage MCPs','manage','','secondary')}${action('Add MCP','add','','lime')}</div></div>
      ${managing?'<div class="resource-manage-note"><span>Edit each MCP’s details, methods, connection settings and agent prompt.</span>'+action('Deleted entries ('+catalogue().deleted.length+')','trash','','secondary')+'</div>':''}
      <header class="resource-intro"><p class="eyebrow">RESOURCE LIBRARY / MCP DIRECTORY</p><h1>Shared tools.<br><span>Greater possibilities.</span></h1>
        <p class="resource-lead">Find the right knowledge for your next task. Explore resources by department, understand what each one does, and bring it to your approved AI agent.</p>
        <div class="resource-intro-links"><a href="#library" data-library-scroll="library-directory">Explore the directory <span aria-hidden="true">↓</span></a><a href="#library" data-library-scroll="library-guide">How to connect an agent <span aria-hidden="true">↗</span></a></div>
      </header>
      <nav class="resource-jumps" aria-label="Jump to department"><span>JUMP TO</span>${departments.map(d=>'<a href="#library" data-library-scroll="library-'+d.id+'">'+d.number+' '+esc(d.title.split(' & ')[0])+'</a>').join('')}</nav>
      <section id="library-directory" aria-label="Resource directory"><div class="resource-toolbar"><div class="resource-search"><label class="sr-only" for="library-search">Search resources</label><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" id="library-search" placeholder="Search tools, departments or capabilities…" value="${esc(query)}"></div><label class="sr-only" for="library-status">Availability</label><select id="library-status">${['All','Available','Planned'].map(x=>'<option value="'+x+'" '+(status===x?'selected':'')+'>'+(x==='All'?'All resources':x)+'</option>').join('')}</select><span id="library-count" role="status" aria-live="polite">${result.count} resource${result.count===1?'':'s'}</span></div>
      <p class="resource-scope" id="library-scope">${scopeSummary()}</p>
      <div id="library-results">${result.html}</div></section>
      <section class="resource-guide" id="library-guide" aria-labelledby="library-guide-title"><p class="eyebrow">BRING YOUR OWN APPROVED AGENT</p><h2 id="library-guide-title">From discovery to your first prompt.</h2><p>Model Context Protocol (MCP) lets a compatible AI agent discover tools and retrieve information from a connected service.</p>
        <div class="resource-guide-grid"><div><span class="resource-step">01 / CHOOSE</span><h3>Find a useful resource.</h3><p>Open its details to check availability, data access and purpose. Only available services have a connection URL.</p></div><div><span class="resource-step">02 / CONNECT</span><h3>Add the MCP server.</h3><p>In your agent’s MCP settings, add the endpoint as a remote Streamable HTTP server. Follow your client’s setup instructions.</p></div><div><span class="resource-step">03 / ASK & REVIEW</span><h3>Start with a clear prompt.</h3><p>Copy the resource’s example, adapt it to your task and review the answer against its sources before using it.</p></div></div>
        <div class="resource-prompt-panel"><div><span class="resource-step">A SHARED STARTING POINT</span><h3>Keep people and evidence in the loop.</h3></div>${action('Copy starter prompt','starter','','secondary')}<p id="library-starter">Use only connected, approved tools and permitted data for this task. Cite sources and versions, flag uncertainty or missing information, and prepare a draft for human review. Do not make decisions about people or take external action without authorisation.</p></div>
      </section>
      <details class="resource-workspace"><summary>Workspace tools & knowledge <span>Browser-local sandbox</span></summary><p>Explore and edit the reporting definitions and guidance maintained in this demo.</p><div class="actions">${link('Open tool builder','builder')}${link('Browse live documents','documents')}${btn('New tool','hub-new-tool','','lime')}</div>${c.hub().tools.map(t=>'<div class="resource-local-tool"><div><strong>'+esc(t.name)+'</strong><p>'+esc(t.description)+'</p><small>Owner: '+esc(t.owner)+' · '+(t.published?'Published definition v'+t.publishedVersion:'Draft definition')+' · No MCP runtime connected</small></div>'+link('Inspect & test →','bench',t.id,'text-link')+'</div>').join('')}</details>
      <p class="resource-footnote">Independent Wetland prototype. Departmental concepts are illustrative, not live WaterAid systems. Availability describes connection readiness, not a real-time health check.</p>
    </div>`;
  }

  function updateResults() {
    const target=document.querySelector('#library-results');
    if(!target)return;
    const result=results();target.innerHTML=result.html;
    document.querySelector('#library-count').textContent=result.count+' resource'+(result.count===1?'':'s');
    document.querySelector('#library-scope').innerHTML=scopeSummary();
  }

  function scopeSummary(){const all=resources(),count=all.filter(available).length;return '<span class="resource-live-dot" aria-hidden="true"></span>'+count+' available · '+(all.length-count)+' planned · '+all.length+' total';}

  function labelledModal(title,body){modal(title,body);const dialog=document.querySelector('#modal');dialog.querySelector('h2').id='library-dialog-title';dialog.setAttribute('aria-labelledby','library-dialog-title');dialog.scrollTop=0;}

  function edit(id){
    const r=resources().find(x=>x.id===id)||{department:'fundraising',status:'Planned',methods:[],transport:'Streamable HTTP'};
    const field=(name,label,{area=false,optional=false,hint=''}={})=>'<div class="field '+(area?'full':'')+'"><label for="mcp-'+name+'">'+label+(optional?' <span class="field-note">Optional</span>':'')+'</label>'+(hint?'<p class="resource-field-hint">'+hint+'</p>':'')+(area?'<textarea id="mcp-'+name+'" name="'+name+'" rows="3" maxlength="12000" '+(optional?'':'required')+'>'+esc(r[name]||'')+'</textarea>':'<input id="mcp-'+name+'" name="'+name+'" maxlength="'+(name==='endpoint'||name==='referenceUrl'?'2000':'200')+'" '+(optional?'':'required')+' value="'+esc(r[name]||'')+'">')+'</div>';
    const select=(name,label,options)=>'<div class="field"><label for="mcp-'+name+'">'+label+'</label><select id="mcp-'+name+'" name="'+name+'">'+options.map(([v,t])=>'<option value="'+v+'" '+(r[name]===v?'selected':'')+'>'+t+'</option>').join('')+'</select></div>';
    labelledModal(id?'Edit MCP':'Add an MCP',`<form class="resource-editor" data-library-form="save" data-id="${esc(id||'')}">
      <p>Edit the library entry here. Connection settings describe the service; saving does not deploy or modify an MCP server.</p>
      <p class="resource-form-error" role="alert" hidden></p><div class="resource-editor-grid">
      ${field('title','Name')}${select('department','Department',departments.map(d=>[d.id,d.title]))}
      ${field('description','Description',{area:true})}${field('owner','Owner / maintainer')}${select('status','Availability',[['Planned','Planned'],['Available','Available']])}
      <h3 class="full">Connection settings</h3>${field('endpoint','Endpoint URL',{optional:true,hint:'Required for Available entries. HTTP or HTTPS; do not include passwords or tokens.'})}${select('transport','Transport',[['Streamable HTTP','Streamable HTTP'],['SSE','SSE']])}
      ${field('authentication','Authentication instructions',{area:true,optional:true,hint:'Describe the authentication process. Do not store credentials here.'})}${field('referenceUrl','Reference / documentation URL',{optional:true})}
      ${field('permissions','Permissions & access scope',{area:true})}${field('data','Data scope',{area:true})}${field('setup','Connection instructions',{area:true})}
      <h3 class="full">Tools & agent guidance</h3><div class="field full"><label for="mcp-methods">Tool methods</label><p class="resource-field-hint">One method name per line, or separate names with commas.</p><textarea id="mcp-methods" name="methods" rows="4" required maxlength="14000">${esc(r.methods.join('\n'))}</textarea></div>
      ${field('prompt','Example agent prompt',{area:true})}</div>
      <div class="resource-form-actions"><button class="btn lime" type="submit">${id?'Save changes':'Add MCP'}</button>${action('Cancel','cancel','','secondary')}</div></form>`);
  }

  function confirmDelete(id){const r=resources().find(x=>x.id===id);if(!r)return;labelledModal('Delete MCP?',`<p>Remove <strong>${esc(r.title)}</strong> from this library? You can restore it from Deleted entries. The MCP server itself will not be changed.</p><div class="resource-form-actions">${action('Delete from library','confirm-delete',id,'danger')}${action('Cancel','cancel','','secondary')}</div>`);}

  function trash(){labelledModal('Deleted MCPs',catalogue().deleted.length?'<p>Restore an entry with all its saved details.</p>'+catalogue().deleted.map(({resource:r})=>'<div class="resource-trash-row"><strong>'+esc(r.title)+'</strong>'+action('Restore','restore',r.id)+'</div>').join(''):'<p>No deleted MCPs.</p>');}

  function changed(message,id){c.record(c.state(),message,id);c.save();c.close();c.render();toast(message);}

  function details(id) {
    const r=resources().find(x=>x.id===id);if(!r)return;
    const config=connectionConfig(r);
    labelledModal(esc(r.title),`<div class="resource-detail"><div class="resource-detail-meta">${statusLabel(r)}<span>${esc(departments.find(d=>d.id===r.department).title)}</span></div>
      <div class="resource-manage-actions">${action('Edit MCP','edit',r.id)}${action('Delete','delete',r.id,'danger')}</div>
      <p>${esc(r.description)}</p><dl><div><dt>Owner / maintainer</dt><dd>${esc(r.owner)}</dd></div><div><dt>Access & scope</dt><dd>${esc(r.permissions)}</dd></div><div><dt>Data</dt><dd>${esc(r.data)}</dd></div><div><dt>Transport</dt><dd>${esc(r.transport||'Streamable HTTP')}</dd></div><div><dt>Authentication</dt><dd>${esc(r.authentication||'Not specified')}</dd></div></dl>
      <h3>Connection</h3>${r.endpoint?'<div class="resource-code">'+esc(r.endpoint)+'</div><div class="actions">'+(available(r)?action('Copy endpoint','endpoint',r.id):'<p>Connection pending; this entry is marked Planned.</p>')+'</div>':'<div class="resource-pending">Endpoint not provisioned. This concept cannot be connected yet.</div>'}${r.referenceUrl?'<a class="btn secondary" href="'+esc(r.referenceUrl)+'" target="_blank" rel="noopener noreferrer">View reference / documentation ↗</a>':''}<p>${esc(r.setup)}</p>
      <div class="resource-detail-heading"><h3>Example agent prompt</h3>${action('Copy prompt','prompt',r.id)}</div><div class="resource-code prompt-example">${esc(r.prompt)}</div>
      ${config?'<details class="resource-config"><summary>Example remote MCP configuration</summary><p>For clients that support this configuration shape. Check your agent’s documentation; setup is client-specific.</p><pre class="resource-code">'+esc(JSON.stringify(config,null,2))+'</pre>'+action('Copy configuration','config',r.id)+'</details>':''}
      <section class="resource-detail-methods">
      <h3>${available(r)?'Exposed tools':'Proposed tool methods'}</h3><div class="resource-methods">${r.methods.map(m=>'<code>'+esc(m)+'</code>').join('')}</div>
      </section>
      </div>`);
  }

  async function copy(value,label) {
    try {await navigator.clipboard.writeText(value);toast(label+' copied.');}
    catch {modal('Copy '+esc(label.toLowerCase()),'<p>Clipboard access is unavailable. Select and copy the text below.</p><textarea class="resource-copy-fallback" aria-label="Text to copy" readonly>'+esc(value)+'</textarea>');const field=document.querySelector('.resource-copy-fallback');field.focus();field.select();}
  }

  document.addEventListener('input',e=>{if(e.target.id==='library-search'){query=e.target.value;updateResults();}});
  document.addEventListener('change',e=>{if(e.target.id==='library-status'){status=e.target.value;updateResults();}});
  document.addEventListener('submit',e=>{
    const form=e.target.closest('[data-library-form="save"]');if(!form)return;e.preventDefault();
    try{const saved=saveResource(catalogue(),Object.fromEntries(new FormData(form)),form.dataset.id||undefined);query='';status='All';changed(form.dataset.id?'MCP updated.':'MCP added.',saved.id);}
    catch(error){const message=form.querySelector('.resource-form-error');message.textContent=error.message;message.hidden=false;message.setAttribute('tabindex','-1');message.focus();}
  });
  document.addEventListener('click',e=>{
    const jump=e.target.closest('[data-library-scroll]');
    if(jump){e.preventDefault();let target=document.getElementById(jump.dataset.libraryScroll);if(!target){query='';status='All';document.querySelector('#library-search').value='';document.querySelector('#library-status').value='All';updateResults();target=document.getElementById(jump.dataset.libraryScroll);}if(target){target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}return;}
    const b=e.target.closest('[data-action^="hub-library-"]');if(!b)return;
    const type=b.dataset.action.replace('hub-library-',''),r=resources().find(x=>x.id===b.dataset.id);
    if(type==='manage'){managing=!managing;c.render();}
    if(type==='add')edit();
    if(type==='edit'&&r)edit(r.id);
    if(type==='delete'&&r)confirmDelete(r.id);
    if(type==='cancel')c.close();
    if(type==='trash')trash();
    if(type==='confirm-delete'){try{const deleted=deleteResource(catalogue(),b.dataset.id);changed('Deleted '+deleted.title+'. Restore it from Deleted entries.',deleted.id);}catch(error){toast(error.message);}}
    if(type==='restore'){try{const restored=restoreResource(catalogue(),b.dataset.id);changed('Restored '+restored.title+'.',restored.id);}catch(error){toast(error.message);}}
    if(type==='details')details(b.dataset.id);
    if(type==='reset'){query='';status='All';document.querySelector('#library-search').value='';document.querySelector('#library-status').value='All';updateResults();document.querySelector('#library-search').focus();}
    if(type==='starter')copy(document.querySelector('#library-starter').textContent,'Starter prompt');
    if(type==='prompt'&&r)copy(r.prompt,'Prompt');
    if(type==='endpoint'&&r&&available(r))copy(r.endpoint,'Endpoint');
    if(type==='config'&&r&&available(r))copy(JSON.stringify(connectionConfig(r),null,2),'Configuration');
  });
  return {render};
}
