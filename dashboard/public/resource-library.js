import {catalogueDepartments,saveDepartment,deleteDepartment, matchingResources, connectionConfig,seedCatalogue,saveResource,deleteResource,restoreResource} from './resource-catalogue.js';
import {setupMethodTags} from './method-tags.js';

export function createResourceLibrary(c) {
  const {esc,btn,link,modal,toast} = c;
  let query='', status='All',managing=false,managerSearch='',managerTab='active';
  const catalogue=()=>c.state().resourceCatalogue??(c.state().resourceCatalogue=seedCatalogue());
  const resources=()=>catalogue().items;
  const departments=()=>catalogueDepartments(catalogue());
  const canManage=()=>c.state().role==='admin';
  const canEdit=()=>canManage()||c.state().role==='contributor';
  const available=r=>r.status==='Available'&&!!r.endpoint;
  const action = (label, type, id, cls='secondary') => btn(label,'hub-library-'+type,'data-id="'+esc(id)+'"',cls);
  const statusLabel = r => '<span class="resource-status '+(available(r)?'available':'planned')+'"><span aria-hidden="true"></span>'+esc(r.status)+'</span>';
  const actionIcon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(name==='edit'?'m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5':'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7')+'"/></svg>';
  const actionMenu=r=>!canEdit()?'':'<details class="resource-action-menu"><summary aria-label="Actions for '+esc(r.title)+'"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></summary><div class="resource-action-popover">'+action(actionIcon('edit')+'Edit MCP','edit',r.id,'resource-menu-item')+(canManage()?action(actionIcon('delete')+'Delete MCP','delete',r.id,'resource-menu-item resource-menu-delete'):'')+'</div></details>';

  function card(r) {
    return `<article class="resource-card" data-resource-id="${esc(r.id)}" tabindex="0" aria-label="Open details for ${esc(r.title)}">
      <div class="resource-card-top"><span class="resource-kind">${available(r)?'MCP RESOURCE':'CAPABILITY CONCEPT'}</span><div class="resource-card-tools">${statusLabel(r)}${actionMenu(r)}</div></div>
      <h3>${esc(r.title)}</h3><p>${esc(r.description)}</p>
      <div class="resource-endpoint"><span>${available(r)?esc(r.transport||'Streamable HTTP'):'Connection pending'}</span>${r.endpoint?'<code>'+esc(r.endpoint)+'</code>':'<small>Endpoint not provisioned</small>'}</div>
      <div class="resource-methods" aria-label="${available(r)?'Available tools':'Proposed tools'}">${r.methods.slice(0,2).map(m=>'<code>'+esc(m)+'</code>').join('')}${r.methods.length>2?'<span>+'+(r.methods.length-2)+' tools</span>':''}</div>
    </article>`;
  }

  function results() {
    const matches=matchingResources(query,status,resources(),departments());
    if(!departments().length)return {count:0,html:'<div class="resource-empty"><h2>Create your first department.</h2><p>Departments organise the MCPs in your library.</p>'+(canManage()?action('Add department','department-add','','lime'):'')+'</div>'};
    return {count:matches.length, html:departments().map(d=>{
      const list=matches.filter(r=>r.department===d.id);
      return !list.length&&(query.trim()||status!=='All')?'':`<section class="resource-department" id="library-${d.id}" aria-labelledby="library-title-${d.id}">
        <div class="resource-section-head"><div><span class="resource-number">${d.number}</span><h2 id="library-title-${d.id}">${esc(d.title)}</h2></div><p>${esc(d.description)}</p></div>
        <div class="resource-grid">${list.length?list.map(card).join(''):'<div class="resource-empty-department"><p>No MCPs in this department yet.</p>'+(canManage()?action('Add MCP','add',d.id,'secondary'):'')+'</div>'}</div></section>`;
    }).join('') || '<div class="resource-empty"><h2>No resources match.</h2><p>Try a department, a tool name or a broader search.</p>'+action('Clear filters','reset','','secondary')+'</div>'};
  }

  function render() {
    const result=results();
    return `<div class="resource-library">
      <div class="resource-management-bar"><span>Library changes are saved in this browser.</span><div>${canManage()?action('Manage library','manage','','secondary')+action('Add MCP','add','','lime'):'<span class="resource-readonly">'+(canEdit()?'Contributors can edit MCPs':'Read-only · Admins manage this library')+'</span>'}</div></div>
      <header class="resource-intro"><p class="eyebrow">RESOURCE LIBRARY / MCP DIRECTORY</p><h1>Shared tools.<br><span>Greater possibilities.</span></h1>
        <p class="resource-lead">Find the right knowledge for your next task. Explore resources by department, understand what each one does, and bring it to your approved AI agent.</p>
        <div class="resource-intro-links"><a href="#library" data-library-scroll="library-directory">Explore the directory <span aria-hidden="true">↓</span></a><a href="#library" data-library-scroll="library-guide">How to connect an agent <span aria-hidden="true">↗</span></a></div>
      </header>
      <nav class="resource-jumps" aria-label="Jump to department"><span>JUMP TO</span>${departments().map(d=>'<a href="#library" data-library-scroll="library-'+d.id+'">'+d.number+' '+esc(d.title.split(' & ')[0])+'</a>').join('')}</nav>
      <section id="library-directory" aria-label="Resource directory"><div class="resource-toolbar"><div class="resource-search"><label class="sr-only" for="library-search">Search resources</label><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" id="library-search" placeholder="Search tools, departments or capabilities…" value="${esc(query)}"></div><label class="sr-only" for="library-status">Availability</label><div class="resource-select-wrap resource-filter-select"><select id="library-status">${['All','Available','Planned'].map(x=>'<option value="'+x+'" '+(status===x?'selected':'')+'>'+(x==='All'?'All resources':x)+'</option>').join('')}</select></div><span id="library-count" role="status" aria-live="polite">${result.count} resource${result.count===1?'':'s'}</span></div>
      <p class="resource-scope" id="library-scope">${scopeSummary()}</p>
      <div id="library-results">${result.html}</div></section>
      <section class="resource-guide" id="library-guide" aria-labelledby="library-guide-title"><p class="eyebrow">BRING YOUR OWN APPROVED AGENT</p><h2 id="library-guide-title">From discovery to your first prompt.</h2><p>Model Context Protocol (MCP) lets a compatible AI agent discover tools and retrieve information from a connected service.</p>
        <div class="resource-guide-grid"><div><span class="resource-step">01 / CHOOSE</span><h3>Find a useful resource.</h3><p>Open its details to check availability, data access and purpose. Only available services have a connection URL.</p></div><div><span class="resource-step">02 / CONNECT</span><h3>Add the MCP server.</h3><p>In your agent’s MCP settings, add the endpoint as a remote Streamable HTTP server. Follow your client’s setup instructions.</p></div><div><span class="resource-step">03 / ASK & REVIEW</span><h3>Start with a clear prompt.</h3><p>Copy the resource’s example, adapt it to your task and review the answer against its sources before using it.</p></div></div>
        <div class="resource-prompt-panel"><div><span class="resource-step">A SHARED STARTING POINT</span><h3>Keep people and evidence in the loop.</h3></div>${action('Copy starter prompt','starter','','secondary')}<p id="library-starter">Use only connected, approved tools and permitted data for this task. Cite sources and versions, flag uncertainty or missing information, and prepare a draft for human review. Do not make decisions about people or take external action without authorisation.</p></div>
      </section>
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

  function managerRows(){
    if(managerTab==='departments')return departmentRows();
    const list=managerTab==='active'?resources():catalogue().deleted.map(entry=>entry.resource);
    const matches=list.filter(r=>(r.title+' '+r.owner+' '+departments().find(d=>d.id===r.department).title).toLowerCase().includes(managerSearch.toLowerCase().trim()));
    return matches.length?matches.map(r=>'<div class="resource-manager-row"><div><strong>'+esc(r.title)+'</strong><small>'+esc(departments().find(d=>d.id===r.department).title)+' · '+esc(r.status)+'</small></div><div class="resource-manager-row-actions">'+(managerTab==='active'?action(actionIcon('edit')+'Edit','edit',r.id,'secondary')+action(actionIcon('delete')+'Delete','delete',r.id,'resource-trash-button'):action('Restore','restore',r.id,'secondary'))+'</div></div>').join(''):'<p class="resource-manager-empty">'+(managerSearch?'No MCPs match your search.':managerTab==='deleted'?'No deleted MCPs.':'No MCPs in the library yet.')+'</p>';
  }

  function manage(){
    managing=true;
    labelledModal('Manage library','<div class="resource-manager"><p>Manage MCP entries and the departments that organise them. Changes are saved in this browser.</p><div class="resource-manager-toolbar"><div class="resource-manager-tabs" aria-label="Library entries">'+btn('MCPs ('+resources().length+')','hub-library-manager-active','aria-pressed="'+(managerTab==='active')+'"','secondary')+btn('Departments ('+departments().length+')','hub-library-manager-departments','aria-pressed="'+(managerTab==='departments')+'"','secondary')+btn('Deleted ('+catalogue().deleted.length+')','hub-library-manager-deleted','aria-pressed="'+(managerTab==='deleted')+'"','secondary')+'</div>'+action(managerTab==='departments'?'Add department':'Add MCP',managerTab==='departments'?'department-add':'add','','lime')+'</div><label class="sr-only" for="manager-search">Search library</label><input type="search" id="manager-search" placeholder="'+(managerTab==='departments'?'Search departments…':'Search by name, department or owner…')+'" aria-label="Search library" value="'+esc(managerSearch)+'"><div id="manager-list">'+managerRows()+'</div><div class="resource-form-actions">'+action('Done','manager-done','','secondary')+'</div></div>');
  }

  function departmentRows(){
    const matches=departments().filter(d=>(d.title+' '+d.description).toLowerCase().includes(managerSearch.toLowerCase().trim()));
    return matches.length?matches.map(d=>'<div class="resource-manager-row"><div><strong><span class="resource-number">'+d.number+'</span> '+esc(d.title)+'</strong><small>'+esc(d.description||'No description')+'</small><small>'+resources().filter(r=>r.department===d.id).length+' MCPs</small></div><div class="resource-manager-row-actions">'+action(actionIcon('edit')+'Edit','department-edit',d.id,'secondary')+action(actionIcon('delete')+'Delete','department-delete',d.id,'resource-trash-button')+'</div></div>').join(''):'<p class="resource-manager-empty">'+(managerSearch?'No departments match your search.':'No departments yet. Add one to organise your MCPs.')+'</p>';
  }

  function editDepartment(id){
    managing=true;managerTab='departments';
    const groups=departments(),current=groups.find(d=>d.id===id),position=current?groups.indexOf(current)+1:groups.length+1;
    labelledModal(current?'Edit department':'Add department',`<form class="resource-editor" data-library-form="department" data-id="${esc(id||'')}"><p>Update the name and description shown in the library. Display position controls the section order and numbering.</p><p class="resource-form-error" role="alert" hidden></p><div class="resource-editor-grid"><div class="field full"><label for="department-title">Department name</label><input id="department-title" name="title" required maxlength="100" value="${esc(current?.title||'')}"></div><div class="field full"><label for="department-description">Description <span class="field-note">Optional</span></label><textarea id="department-description" name="description" rows="3" maxlength="1000">${esc(current?.description||'')}</textarea></div><div class="field full"><label for="department-position">Display position</label><div class="resource-select-wrap"><select id="department-position" name="position">${Array.from({length:groups.length+(current?0:1)},(_,i)=>'<option value="'+(i+1)+'" '+(i+1===position?'selected':'')+'>'+String(i+1).padStart(2,'0')+(groups[i]?' · '+esc(groups[i].title):' · Last')+'</option>').join('')}</select></div></div></div><div class="resource-form-actions"><button class="btn lime" type="submit">${current?'Save department':'Add department'}</button>${action('Cancel','cancel','','secondary')}</div></form>`);
  }

  function confirmDeleteDepartment(id){
    const d=departments().find(x=>x.id===id);if(!d)return;
    managing=true;managerTab='departments';
    const entries=[...resources(),...catalogue().deleted.map(e=>e.resource)].filter(r=>r.department===id),targets=departments().filter(x=>x.id!==id);
    labelledModal('Delete department?',`<form class="resource-editor" data-library-form="department-delete" data-id="${esc(id)}"><p>Delete <strong>${esc(d.title)}</strong> from the library? ${entries.length?entries.length+' MCP entries, including any deleted entries, must be moved to another department.':'This department has no MCP entries.'}</p><p class="resource-form-error" role="alert" hidden></p>${entries.length?(targets.length?'<div class="resource-editor-grid"><div class="field full"><label for="department-destination">Move MCPs to</label><div class="resource-select-wrap"><select id="department-destination" name="destination" required><option value="">Choose a department</option>'+targets.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.title)+'</option>').join('')+'</select></div></div></div>':'<p>Create another department before deleting this one so its MCPs have somewhere to go.</p>'):''}<div class="resource-form-actions"><button class="btn danger" type="submit" ${entries.length&&!targets.length?'disabled':''}>Delete department</button>${action('Cancel','cancel','','secondary')}</div></form>`);
  }

  function edit(id,departmentId){
    if(!departments().length){managing=true;managerTab='departments';editDepartment();return;}
    const r=resources().find(x=>x.id===id)||{department:departmentId||departments()[0]?.id||'',status:'Planned',methods:[],transport:'Streamable HTTP'};
    const field=(name,label,{area=false,optional=false,hint=''}={})=>'<div class="field '+(area?'full':'')+'"><label for="mcp-'+name+'">'+label+(optional?' <span class="field-note">Optional</span>':'')+'</label>'+(area?'<textarea id="mcp-'+name+'" name="'+name+'" rows="3" maxlength="12000" '+(optional?'':'required')+'>'+esc(r[name]||'')+'</textarea>':'<input id="mcp-'+name+'" name="'+name+'" maxlength="'+(name==='endpoint'||name==='referenceUrl'?'2000':'200')+'" '+(optional?'':'required')+' value="'+esc(r[name]||'')+'">')+(hint?'<p class="resource-field-hint">'+hint+'</p>':'')+'</div>';
    const select=(name,label,options)=>'<div class="field"><label for="mcp-'+name+'">'+label+'</label><div class="resource-select-wrap"><select id="mcp-'+name+'" name="'+name+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'" '+(r[name]===v?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></div></div>';
    labelledModal(id?'Edit MCP':'Add an MCP',`<form class="resource-editor" data-library-form="save" data-id="${esc(id||'')}">
      <p>Edit the library entry here. Connection settings describe the service; saving does not deploy or modify an MCP server.</p>
      <p class="resource-form-error" role="alert" hidden></p><div class="resource-editor-grid">
      ${field('title','Name')}${select('department','Department',departments().map(d=>[d.id,d.title]))}
      ${field('description','Description',{area:true})}${field('owner','Owner / maintainer')}${select('status','Availability',[['Planned','Planned'],['Available','Available']])}
      <h3 class="full">Connection settings</h3>${field('endpoint','Endpoint URL',{optional:true,hint:'Required for Available entries. HTTP or HTTPS; do not include passwords or tokens.'})}${select('transport','Transport',[['Streamable HTTP','Streamable HTTP'],['SSE','SSE']])}
      ${field('authentication','Authentication instructions',{area:true,optional:true,hint:'Describe the authentication process. Do not store credentials here.'})}${field('referenceUrl','Reference / documentation URL',{optional:true})}
      ${field('permissions','Permissions & access scope',{area:true})}${field('data','Data scope',{area:true})}${field('setup','Connection instructions',{area:true})}
      <h3 class="full">Tools & agent guidance</h3><div class="field full"><label for="mcp-methods">Tool methods</label><p class="resource-field-hint" id="method-tags-help">Press Enter or comma to add a tag. Use × to remove one.</p><div class="method-tag-field" data-method-tags><div class="method-tag-list" data-method-list role="group" aria-label="Tool method tags"></div><input id="mcp-methods" data-method-input type="text" autocomplete="off" spellcheck="false" aria-describedby="method-tags-help method-tags-error"><input type="hidden" name="methods" data-method-value><p id="method-tags-error" data-method-error role="alert"></p><span class="sr-only" data-method-status role="status" aria-live="polite"></span></div></div>
      ${field('prompt','Example agent prompt',{area:true})}</div>
      <div class="resource-form-actions"><button class="btn lime" type="submit">${id?'Save changes':'Add MCP'}</button>${action('Cancel','cancel','','secondary')}</div></form>`);
    setupMethodTags(document.querySelector('[data-method-tags]'),r.methods);
  }

  function confirmDelete(id){const r=resources().find(x=>x.id===id);if(!r)return;labelledModal('Delete MCP?',`<p>Remove <strong>${esc(r.title)}</strong> from this library? You can restore it from Deleted entries. The MCP server itself will not be changed.</p><div class="resource-form-actions">${action('Delete from library','confirm-delete',id,'danger')}${action('Cancel','cancel','','secondary')}</div>`);}

  function trash(){labelledModal('Deleted MCPs',catalogue().deleted.length?'<p>Restore an entry with all its saved details.</p>'+catalogue().deleted.map(({resource:r})=>'<div class="resource-trash-row"><strong>'+esc(r.title)+'</strong>'+action('Restore','restore',r.id)+'</div>').join(''):'<p>No deleted MCPs.</p>');}

  function changed(message,id){const reopen=managing;c.record(c.state(),message,id);c.save();c.close();c.render();if(reopen)manage();toast(message);}

  function details(id) {
    const r=resources().find(x=>x.id===id);if(!r)return;
    const config=connectionConfig(r);
    labelledModal(esc(r.title),`<div class="resource-detail"><div class="resource-detail-meta">${statusLabel(r)}<span>${esc(departments().find(d=>d.id===r.department).title)}</span></div>
      <p>${esc(r.description)}</p><dl><div><dt>Owner / maintainer</dt><dd>${esc(r.owner)}</dd></div><div><dt>Access & scope</dt><dd>${esc(r.permissions)}</dd></div><div><dt>Data</dt><dd>${esc(r.data)}</dd></div><div><dt>Transport</dt><dd>${esc(r.transport||'Streamable HTTP')}</dd></div><div><dt>Authentication</dt><dd>${esc(r.authentication||'Not specified')}</dd></div></dl>
      <h3>Connection</h3>${r.endpoint?'<div class="resource-code">'+esc(r.endpoint)+'</div><div class="actions">'+(available(r)?action('Copy endpoint','endpoint',r.id):'<p>Connection pending; this entry is marked Planned.</p>')+'</div>':'<div class="resource-pending">Endpoint not provisioned. This concept cannot be connected yet.</div>'}${r.referenceUrl?'<a class="btn secondary" href="'+esc(r.referenceUrl)+'" target="_blank" rel="noopener noreferrer">View reference / documentation ↗</a>':''}<p>${esc(r.setup)}</p>
      <div class="resource-detail-heading"><h3>Example agent prompt</h3>${action('Copy prompt','prompt',r.id)}</div><div class="resource-code prompt-example">${esc(r.prompt)}</div>
      ${config?'<details class="resource-config"><summary>Example remote MCP configuration</summary><p>For clients that support this configuration shape. Check your agent’s documentation; setup is client-specific.</p><pre class="resource-code">'+esc(JSON.stringify(config,null,2))+'</pre>'+action('Copy configuration','config',r.id)+'</details>':''}
      <section class="resource-detail-methods">
      <h3>${available(r)?'Exposed tools':'Proposed tool methods'}</h3><div class="resource-methods">${r.methods.map(m=>'<code>'+esc(m)+'</code>').join('')}</div>
      </section>
      </div>`);
    document.querySelector('#modal .modal-head .close').insertAdjacentHTML('beforebegin',actionMenu(r));
  }

  async function copy(value,label) {
    try {await navigator.clipboard.writeText(value);toast(label+' copied.');}
    catch {modal('Copy '+esc(label.toLowerCase()),'<p>Clipboard access is unavailable. Select and copy the text below.</p><textarea class="resource-copy-fallback" aria-label="Text to copy" readonly>'+esc(value)+'</textarea>');const field=document.querySelector('.resource-copy-fallback');field.focus();field.select();}
  }

  const editingForm=()=>document.querySelector('#modal form[data-library-form="save"],#modal form[data-library-form="department"]');
  function confirmAction({title,message,confirmLabel,onConfirm,destructive=false}){
    if(document.querySelector('.library-confirm-dialog'))return;
    const dialog=document.createElement('dialog');dialog.className='library-confirm-dialog';dialog.setAttribute('role','alertdialog');dialog.setAttribute('aria-labelledby','library-confirm-title');dialog.setAttribute('aria-describedby','library-confirm-message');
    dialog.innerHTML='<div class="library-confirm-content"><span class="eyebrow">'+(destructive?'DISCARD EDITS':'CONFIRM CHANGES')+'</span><h2 id="library-confirm-title">'+esc(title)+'</h2><p id="library-confirm-message">'+esc(message)+'</p><div class="library-confirm-actions"><button class="btn secondary" type="button" data-confirm="no">Keep editing</button><button class="btn '+(destructive?'danger':'lime')+'" type="button" data-confirm="yes">'+esc(confirmLabel)+'</button></div></div>';
    document.body.append(dialog);
    function dismiss(){dialog.close();dialog.remove();}
    dialog.addEventListener('click',e=>{const button=e.target.closest('[data-confirm]');if(!button)return;e.stopPropagation();const yes=button.dataset.confirm==='yes';dismiss();if(yes)onConfirm();});
    dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
    dialog.showModal();dialog.querySelector('[data-confirm="no"]').focus();
  }
  function cancelEditor(){
    if(!editingForm()){if(managing)manage();else c.close();return;}
    confirmAction({title:'Discard your changes?',message:'Are you sure you want to cancel? Your unsaved edits will be discarded.',confirmLabel:'Discard changes',destructive:true,onConfirm:()=>{if(managing)manage();else c.close();}});
  }

  document.addEventListener('input',e=>{if(e.target.id==='library-search'){query=e.target.value;updateResults();}if(e.target.id==='manager-search'){managerSearch=e.target.value;document.querySelector('#manager-list').innerHTML=managerRows();}});
  document.addEventListener('change',e=>{if(e.target.id==='role'){managing=false;document.querySelector('.library-confirm-dialog')?.remove();c.close();}if(e.target.id==='library-status'){status=e.target.value;updateResults();}});
  document.querySelector('#modal').addEventListener('cancel',e=>{if(editingForm()){e.preventDefault();cancelEditor();}else managing=false;});
  document.addEventListener('click',e=>{if(e.target.closest('#modal .close')&&editingForm()){e.preventDefault();e.stopImmediatePropagation();cancelEditor();}},true);
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const menu=document.querySelector('.resource-action-menu[open]');if(menu){e.preventDefault();e.stopPropagation();menu.open=false;menu.querySelector('summary').focus();}},true);
  document.addEventListener('submit',e=>{
    const form=e.target.closest('[data-library-form]');if(!form)return;e.preventDefault();if(!canManage()&&!(canEdit()&&form.dataset.libraryForm==='save'&&form.dataset.id)){toast('Only admins can manage the library. Contributors can edit existing MCPs.');return;}
    const input=Object.fromEntries(new FormData(form));
    function showError(error){const message=form.querySelector('.resource-form-error');message.textContent=error.message;message.hidden=false;message.setAttribute('tabindex','-1');message.focus();}
    function persist(){try{
      if(form.dataset.libraryForm==='department'){const saved=saveDepartment(catalogue(),input,form.dataset.id||undefined,c.state().role);managerSearch='';query='';status='All';changed((form.dataset.id?'Updated department: ':'Added department: ')+saved.title,saved.id);return;}
      if(form.dataset.libraryForm==='department-delete'){const removed=deleteDepartment(catalogue(),form.dataset.id,input.destination,c.state().role);managerSearch='';changed('Deleted department: '+removed.title,removed.id);return;}
      const saved=saveResource(catalogue(),input,form.dataset.id||undefined,c.state().role);query='';status='All';changed(form.dataset.id?'MCP updated.':'MCP added.',saved.id);
    }catch(error){showError(error);}}
    if(form.dataset.libraryForm==='department-delete'){persist();return;}
    try{const preview=structuredClone(catalogue());if(form.dataset.libraryForm==='department')saveDepartment(preview,input,form.dataset.id||undefined,c.state().role);else saveResource(preview,input,form.dataset.id||undefined,c.state().role);}catch(error){showError(error);return;}
    confirmAction({title:form.dataset.id?'Save your changes?':'Add this entry?',message:'Are you sure? This will save your '+(form.dataset.libraryForm==='department'?'department':'MCP')+' details to this browser’s library.',confirmLabel:form.dataset.id?'Save changes':'Add entry',onConfirm:persist});
  });
  document.addEventListener('keydown',e=>{
    if(e.target.matches('.resource-card[data-resource-id]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();details(e.target.dataset.resourceId);}
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('#modal .close'))managing=false;
    const activeMenu=e.target.closest('.resource-action-menu');
    document.querySelectorAll('.resource-action-menu[open]').forEach(menu=>{if(menu!==activeMenu||e.target.closest('[data-action]'))menu.open=false;});
    const jump=e.target.closest('[data-library-scroll]');
    if(jump){e.preventDefault();let target=document.getElementById(jump.dataset.libraryScroll);if(!target){query='';status='All';document.querySelector('#library-search').value='';document.querySelector('#library-status').value='All';updateResults();target=document.getElementById(jump.dataset.libraryScroll);}if(target){target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}return;}
    const card=e.target.closest('.resource-card[data-resource-id]');
    if(card&&!e.target.closest('button,a,summary,.resource-action-menu,input,select,textarea')&&!window.getSelection()?.toString()){details(card.dataset.resourceId);return;}
    const b=e.target.closest('[data-action^="hub-library-"]');if(!b)return;
    const type=b.dataset.action.replace('hub-library-',''),r=resources().find(x=>x.id===b.dataset.id);
    if(['manage','manager-active','manager-deleted','manager-departments','department-add','department-edit','department-delete','add','delete','confirm-delete','restore','trash'].includes(type)&&!canManage()){toast('Only admins can manage MCPs and departments.');return;}
    if(type==='manage'){managerSearch='';managerTab='active';manage();}
    if(['manager-active','manager-deleted','manager-departments'].includes(type)){managerTab=type.replace('manager-','');managerSearch='';manage();}
    if(type==='department-add')editDepartment();
    if(type==='department-edit')editDepartment(b.dataset.id);
    if(type==='department-delete')confirmDeleteDepartment(b.dataset.id);
    if(type==='manager-done'){managing=false;c.close();}
    if(type==='add')edit(undefined,b.dataset.id);
    if(type==='edit'&&r){if(!canEdit()){toast('Only admins and contributors can edit MCPs.');return;}edit(r.id);}
    if(type==='delete'&&r)confirmDelete(r.id);
    if(type==='cancel')cancelEditor();
    if(type==='trash')trash();
    if(type==='confirm-delete'){try{const deleted=deleteResource(catalogue(),b.dataset.id,c.state().role);changed('Deleted '+deleted.title+'. Restore it from Deleted entries.',deleted.id);}catch(error){toast(error.message);}}
    if(type==='restore'){try{const restored=restoreResource(catalogue(),b.dataset.id,c.state().role);changed('Restored '+restored.title+'.',restored.id);}catch(error){toast(error.message);}}
    if(type==='details')details(b.dataset.id);
    if(type==='reset'){query='';status='All';document.querySelector('#library-search').value='';document.querySelector('#library-status').value='All';updateResults();document.querySelector('#library-search').focus();}
    if(type==='starter')copy(document.querySelector('#library-starter').textContent,'Starter prompt');
    if(type==='prompt'&&r)copy(r.prompt,'Prompt');
    if(type==='endpoint'&&r&&available(r))copy(r.endpoint,'Endpoint');
    if(type==='config'&&r&&available(r))copy(JSON.stringify(connectionConfig(r),null,2),'Configuration');
  });
  return {render};
}
