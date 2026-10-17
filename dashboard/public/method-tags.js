export function setupMethodTags(root,initial=[]){
  const input=root.querySelector('[data-method-input]'),hidden=root.querySelector('[data-method-value]'),list=root.querySelector('[data-method-list]'),error=root.querySelector('[data-method-error]'),status=root.querySelector('[data-method-status]');
  let tags=[...new Set(initial)];
  function render(){
    list.replaceChildren();
    for(const method of tags){
      const tag=document.createElement('span');tag.className='method-tag';
      const name=document.createElement('span');name.textContent=method;
      const remove=document.createElement('button');remove.type='button';remove.className='method-tag-remove';remove.textContent='×';remove.setAttribute('aria-label','Remove '+method);
      remove.addEventListener('click',()=>{tags=tags.filter(t=>t!==method);render();status.textContent=method+' removed.';input.focus();});
      tag.append(name,remove);list.append(tag);
    }
    hidden.value=tags.join('\n');
    input.placeholder=tags.length?'Add another method…':'Type a method and press Enter…';
  }
  function clearError(){error.textContent='';input.removeAttribute('aria-invalid');}
  function commit(text=input.value){
    const additions=text.split(/[,\r\n]+/).map(t=>t.trim()).filter(Boolean);
    if(additions.some(t=>!/^[a-zA-Z0-9_.-]{1,128}$/.test(t))){error.textContent='Use letters, numbers, underscores, dots or hyphens (up to 128 characters per method).';input.setAttribute('aria-invalid','true');return false;}
    const next=[...new Set([...tags,...additions])];
    if(next.length>100){error.textContent='You can add up to 100 tool methods.';input.setAttribute('aria-invalid','true');return false;}
    tags=next;input.value='';clearError();render();
    if(additions.length)status.textContent=tags.length+' tool methods in total.';
    return true;
  }
  input.addEventListener('input',clearError);
  input.addEventListener('keydown',e=>{
    if(e.isComposing)return;
    if(e.key==='Enter'||e.key===','){e.preventDefault();e.stopPropagation();commit();}
    if(e.key==='Backspace'&&!input.value&&tags.length){const removed=tags.pop();render();status.textContent=removed+' removed.';}
  });
  input.addEventListener('paste',e=>{
    const text=e.clipboardData.getData('text');
    if(/[,\r\n]/.test(text)){e.preventDefault();const combined=input.value.slice(0,input.selectionStart)+text+input.value.slice(input.selectionEnd);if(!commit(combined))input.value=combined;}
  });
  root.addEventListener('click',e=>{if(e.target===root||e.target===list)input.focus();});
  root.closest('form').addEventListener('submit',e=>{if(!commit()){e.preventDefault();e.stopPropagation();input.focus();}});
  render();
}
