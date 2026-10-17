import {setMemberRole,roleLabel} from './members.js';

export function createRoleManager(c){
  const {esc,btn,modal,toast}=c;
  function render(){
    if(c.state().role!=='admin')return '';
    const members=c.state().members;
    return c.pageHead('Roles','Choose who can manage the workspace and who can contribute.','','WORKSPACE ACCESS')+
      '<div class="notice blue">Admins can manage all work and roles. Contributors can browse the library, edit existing MCPs and work on assigned contributions.</div><div class="member-list">'+members.map(m=>'<article class="member-row"><div class="member-identity"><span class="avatar blue">'+esc(m.name.split(' ').map(n=>n[0]).join(''))+'</span><div><h2>'+esc(m.name)+(m.id===c.state().activeMemberId?' <small>(you)</small>':'')+'</h2><span class="badge">'+roleLabel(m.role)+'</span></div></div>'+btn('Change role','hub-member-edit','data-id="'+esc(m.id)+'"','secondary')+'</article>').join('')+'</div><p class="split-note">Demo members and roles are saved in this browser. Changes appear in the Change log.</p>';
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-action="hub-member-edit"]');if(!button)return;
    if(c.state().role!=='admin'){toast('Only Admins can manage roles.');return;}
    const member=c.state().members.find(m=>m.id===button.dataset.id);if(!member)return;
    modal('Change role', '<form data-member-form data-id="'+esc(member.id)+'"><p>Choose the role for <strong>'+esc(member.name)+'</strong>.</p><div class="field"><label for="member-role">Role</label><select id="member-role" name="role"><option value="contributor" '+(member.role==='contributor'?'selected':'')+'>Contributor</option><option value="admin" '+(member.role==='admin'?'selected':'')+'>Admin</option></select></div><p class="split-note">Admin gives full workspace access. You must keep at least one Admin.</p><div class="actions"><button type="submit" class="btn">Save role</button>'+btn('Cancel','close','','secondary')+'</div></form>');
  });
  document.addEventListener('submit',e=>{
    const form=e.target.closest('[data-member-form]');if(!form)return;e.preventDefault();
    try{const changed=setMemberRole(c.state(),form.dataset.id,new FormData(form).get('role'));c.save();c.close();c.render();toast(changed?'Role updated.':'Role is unchanged.');}catch(error){c.reportError(error.message);}
  });
  return {render};
}
