import {scenarios} from './example-scenarios.js';

export const BRAND_ENDPOINT = 'https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/mcp';

const growthOrigin = 'https://wetland-growth-kpi-demo-462504004653.northamerica-northeast2.run.app';
const examplesOrigin = 'https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app';
export const GROWTH_ENDPOINT = growthOrigin+'/mcp';
// Defaults are upgraded conservatively by resource-migration.js; local edits survive.
export const CATALOGUE_VERSION = 6;

export const departments = [
  {id:'live', number:'01', title:'Ready to use', description:'Try a working demonstration or connect a resource to your approved AI assistant.'},
  {id:'examples', number:'02', title:'Demonstration examples', description:'Examples showing what future MCPs could do. They run on fictional data and illustrative guidance.'}
];

const workflowMethods = ['find_skills','get_skill','start_workflow','get_workflow_step','advance_workflow'];

// What each demonstration MCP supplies and what an agent could do with it, keyed by example scope.
const exampleDescriptions = {
  grants:'Compare a fictional grant call with a sample project brief, identify missing evidence and prepare a cited outline for human eligibility review.',
  'programme-reporting':'Calculate fictional site connection progress against targets and return cited draft material with gaps and limitations.',
  governance:'Check declared release evidence against an illustrative checklist and identify remaining review steps. Does not grant approval.',
  maintenance:'Prioritise issues in a fictional maintenance log and propose tests and review steps without changing tools.',
  onboarding:'Prepare an illustrative onboarding checklist for staff, contributors or reviewers. Does not grant accounts or access.',
  communications:'Prepare a cited communications outline from fictional programme figures, with unsupported claims and human review requirements.',
  'developer-standards':'Compare a self-declared checklist with illustrative developer standards and identify missing checks. Does not inspect a repository.',
  learning:'Retrieve fictional retrospective lessons and suggested next steps for reporting, maintenance or onboarding.'
};

export const resources = [
  {
    id:'branding', department:'live', title:'Branding',
    description:'Gives your assistant the shared brand system: colour tokens, typography, reference logos and assets, and guidance for documents and interfaces.',
    methods:['get_brand_system','list_assets','get_asset','get_ui_guidance','get_document_guidance'],
    prompt:'Retrieve the document guidance and reference brand assets for a quarterly fundraising report. Summarise the typography, colours and logo requirements and cite the guidance used.',
    owner:'Wetland brand reference project', data:'Public reference material only. Independent research kit; not official WaterAid brand approval.',
    status:'Available', endpoint:BRAND_ENDPOINT, referenceUrl:'https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/#agents', transport:'Streamable HTTP', authentication:'No authentication required.', permissions:'Read-only public reference. No authentication required.',
    setup:'Add this Streamable HTTP URL once in your approved assistant’s MCP connection settings, or ask its administrator to connect it. Then use the example prompt with the connected tools. This reference service does not provide access to donor or programme records.'
  },
  {
    id:'growth-reporting', department:'live', title:'Growth Report',
    description:'Counts synthetic first-time donors for a period, compares the result with a target and generates a branded PDF or HTML report with its definition and evidence.',
    methods:['verify_excel_demo_input','inspect_growth_dataset','get_metric_definition','calculate_growth','generate_growth_report','explain_growth_result',...workflowMethods],
    prompt:'Find and read the growth-reporting skill. Generate a branded Growth report for 1 July–30 September 2026 against a target of 150 new donors. Use first-ever received qualifying donations, include the definition and evidence, and return the generated PDF and HTML links. Clearly label the data as synthetic.',
    owner:'Wetland Growth demo project', data:'Fixed synthetic donor dataset. No live supporter or CRM records.', synthetic:true,
    status:'Available', endpoint:GROWTH_ENDPOINT, demoUrl:growthOrigin+'/', referenceUrl:growthOrigin+'/excel.html', skillIds:['growth-reporting'],
    transport:'Streamable HTTP', authentication:'No authentication required for this public synthetic demo.',
    permissions:'Synthetic reporting only. Generates demo documents; does not change donor records.',
    setup:'Connect this Streamable HTTP URL once in your approved assistant, then use the example prompt. Discover and read the growth-reporting skill with find_skills and get_skill; start_workflow begins guided reporting. Finished reports require the Branding MCP for rendering and validation. Calculations remain available independently. The Excel demo matches only the supplied synthetic workbook; it does not ingest arbitrary spreadsheets.'
  },
  ...scenarios.map(s=>({
    id:'example-'+s.scope, department:'examples', title:s.name,
    description:exampleDescriptions[s.scope], methods:[s.tool,...workflowMethods], prompt:s.prompt,
    owner:'Wetland synthetic examples project', data:'Invented demonstration fixtures and illustrative guidance. No live organisational records.', synthetic:true,
    status:'Available', endpoint:examplesOrigin+'/mcp/'+s.scope, demoUrl:examplesOrigin+'/?capability='+s.scope, skillIds:[s.scope],
    transport:'Streamable HTTP', authentication:'No authentication required for this public synthetic example.',
    permissions:'Advisory drafts only. No approvals, publication, account changes or live tool changes.',
    setup:'Connect this scoped Streamable HTTP URL once in your approved assistant, then use the example prompt. Discover and read the playbook with find_skills and get_skill. Use start_workflow for guided checks. This endpoint exposes only this synthetic example and its workflow tools; it does not produce finished branded documents.'
  }))
];

export function matchingResources(query='', status='All', catalogue=resources, groups=departments) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return catalogue.filter(r => (status==='All' || r.status===status) && words.every(word =>
    [r.title,r.description,r.owner,r.department,r.synthetic?'synthetic':'',...(r.skillIds||[]),groups.find(d=>d.id===r.department)?.title||'',...r.methods].join(' ').toLowerCase().includes(word)));
}

export function connectionConfig(resource) {
  return resource.status==='Available' && resource.endpoint ? {mcpServers:{[resource.id]:{type:resource.transport==='SSE'?'sse':'http',url:resource.endpoint}}} : null;
}

export function seedCatalogue(){return {version:CATALOGUE_VERSION,items:structuredClone(resources),deleted:[],departments:structuredClone(departments)};}

export function catalogueDepartments(catalogue){return catalogue.departments??(catalogue.departments=structuredClone(departments));}

function renumber(groups){groups.forEach((d,index)=>{d.number=String(index+1).padStart(2,'0');});}

export function requireCatalogueAdmin(role){if(role!=='admin')throw Error('Only admins can manage MCPs and departments.');}

export function saveDepartment(catalogue,input,id,role){
  requireCatalogueAdmin(role);
  const groups=catalogueDepartments(catalogue),current=id?groups.find(d=>d.id===id):null;
  if(id&&!current)throw Error('This department no longer exists.');
  const title=String(input.title||'').trim(),description=String(input.description||'').trim();
  if(!title||title.length>100)throw Error('Enter a department name of 1–100 characters.');
  if(description.length>1000)throw Error('Keep the description under 1,000 characters.');
  if(groups.some(d=>d.id!==id&&d.title.toLowerCase()===title.toLowerCase()))throw Error('A department with this name already exists.');
  const count=groups.length+(current?0:1),position=Number(input.position??count);
  if(!Number.isInteger(position)||position<1||position>count)throw Error('Select a valid display position.');
  const result={id:current?.id||'department-'+crypto.randomUUID(),title,description};
  const next=groups.filter(d=>d.id!==id);next.splice(position-1,0,result);renumber(next);catalogue.departments=next;
  return result;
}

export function deleteDepartment(catalogue,id,role){
  requireCatalogueAdmin(role);
  const groups=catalogueDepartments(catalogue),department=groups.find(d=>d.id===id);
  if(!department)throw Error('This department no longer exists.');
  if(catalogue.items.some(r=>r.department===id))throw Error("Can't delete this department because it still contains MCPs. Delete or move its MCPs first.");
  // Deleted entries can't be restored without their department, so they go with it.
  catalogue.deleted=catalogue.deleted.filter(e=>e.resource.department!==id);
  catalogue.departments=groups.filter(d=>d.id!==id);renumber(catalogue.departments);
  return department;
}

function webUrl(value,label){
  if(!value?.trim())return null;
  let url;try{url=new URL(value.trim());}catch{throw Error(label+' must be a valid URL.');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error(label+' must use HTTP or HTTPS without embedded credentials.');
  return value.trim();
}

export function saveResource(catalogue,input,id,role){
  if(role!=='admin'&&!(role==='contributor'&&id&&catalogue.items.some(r=>r.id===id)))throw Error('Only admins can add MCPs; admins and contributors can edit existing MCPs.');
  const current=id?catalogue.items.find(r=>r.id===id):null;
  if(id&&!current)throw Error('This MCP no longer exists. Reopen the library.');
  const result={id:current?.id||crypto.randomUUID()};
  for(const key of ['title','description','owner','data','permissions','setup','prompt']){
    const value=String(input[key]??'').trim();
    if(!value)throw Error('Complete the '+({data:'data scope',setup:'connection instructions',prompt:'example prompt',owner:'owner'}[key]||key)+' field.');
    if(value.length>(['title','owner'].includes(key)?200:12000))throw Error('The '+key+' field is too long.');
    result[key]=value;
  }
  if(!catalogueDepartments(catalogue).some(d=>d.id===input.department))throw Error('Select a department.');
  if(!['Available','Planned'].includes(input.status))throw Error('Select a valid availability.');
  result.department=input.department;result.status=input.status;
  result.endpoint=webUrl(input.endpoint,'MCP');
  result.referenceUrl=webUrl(input.referenceUrl,'Reference link');
  result.demoUrl=webUrl(input.demoUrl??current?.demoUrl,'Demo link');
  const skillInput=input.skillIds??current?.skillIds??[];
  result.skillIds=[...new Set((Array.isArray(skillInput)?skillInput:String(skillInput).split(/[\n,]/)).map(x=>String(x).trim()).filter(Boolean))];
  if(result.skillIds.length>50||result.skillIds.some(id=>!/^[a-z][a-z0-9-]{2,63}$/.test(id)))throw Error('Use skill IDs of 3–64 lowercase letters, numbers or hyphens.');
  result.synthetic=input.synthetic===undefined?!!current?.synthetic:input.synthetic===true||input.synthetic==='true';
  if(result.status==='Available'&&!result.endpoint)throw Error('An available MCP needs an MCP URL.');
  result.transport=input.transport||'Streamable HTTP';
  if(!['Streamable HTTP','SSE'].includes(result.transport))throw Error('Select a supported transport.');
  result.authentication=String(input.authentication||'Not specified').trim();
  if(result.authentication.length>1000)throw Error('Authentication notes are too long.');
  result.methods=Array.isArray(input.methods)?input.methods:String(input.methods||'').split(/[\n,]/);
  result.methods=[...new Set(result.methods.map(m=>String(m).trim()).filter(Boolean))];
  if(!result.methods.length||result.methods.length>100||result.methods.some(m=>!/^[a-zA-Z0-9_.-]{1,128}$/.test(m)))throw Error('Add up to 100 method names using letters, numbers, underscores, dots or hyphens.');
  if(current)catalogue.items[catalogue.items.indexOf(current)]=result;else catalogue.items.push(result);
  return result;
}

export function deleteResource(catalogue,id,role){
  requireCatalogueAdmin(role);
  const index=catalogue.items.findIndex(r=>r.id===id);
  if(index<0)throw Error('This MCP has already been deleted.');
  const [resource]=catalogue.items.splice(index,1);
  catalogue.deleted.unshift({resource,deletedAt:new Date().toISOString()});
  return resource;
}

export function restoreResource(catalogue,id,role){
  requireCatalogueAdmin(role);
  const index=catalogue.deleted.findIndex(r=>r.resource.id===id);
  if(index<0)throw Error('This MCP is no longer in deleted entries.');
  if(catalogue.items.some(r=>r.id===id))throw Error('An MCP with this ID already exists.');
  const [entry]=catalogue.deleted.splice(index,1);catalogue.items.push(entry.resource);return entry.resource;
}
