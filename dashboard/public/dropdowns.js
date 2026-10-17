// Use the same accessible native select treatment in pages and dialogs.
export function enhanceDropdowns(root){
  root.querySelectorAll('select').forEach(select=>{
    if(select.parentElement.classList.contains('resource-select-wrap'))return;
    const wrapper=document.createElement('div');
    wrapper.className='resource-select-wrap';
    select.before(wrapper);wrapper.append(select);
  });
}
