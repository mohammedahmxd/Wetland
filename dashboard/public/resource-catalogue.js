export const BRAND_ENDPOINT = 'https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/mcp';

export const GROWTH_ENDPOINT = 'https://wetland-growth-kpi-demo-462504004653.northamerica-northeast2.run.app/mcp';
// Bump when the seed list changes so browsers holding an older saved library pick up the new one.
export const CATALOGUE_VERSION = 4;

export const departments = [
  {id:'live', number:'01', title:'Ready to use', description:'Working MCPs you can use in your AI assistant today.'},
  {id:'examples', number:'02', title:'Demonstration examples', description:'Placeholders showing what future MCPs could do. They are not connected to a service yet.'}
];

const example = (id, title, description, methods, prompt, data) => ({
  id, department:'examples', title, description, methods, prompt, data,
  owner:'Demonstration placeholder', status:'Planned', endpoint:null, permissions:'Proposed read-only access. No service is connected.',
  setup:'This is a demonstration placeholder. An owner, approved data sources, access controls and a deployed MCP are needed before connection.'
});

export const resources = [
  {
    id:'branding', department:'live', title:'Branding',
    description:'Gives your assistant the shared brand system: colour tokens, typography, approved logos and assets, and guidance for documents and interfaces.',
    methods:['get_brand_system','list_assets','get_asset','get_ui_guidance','get_document_guidance'],
    prompt:'Retrieve the document guidance and approved brand assets for a quarterly fundraising report. Summarise the typography, colours and logo requirements and cite the guidance used.',
    owner:'Wetland brand reference project', data:'Public reference material only. Independent research kit; not official WaterAid brand approval.',
    status:'Available', endpoint:BRAND_ENDPOINT, referenceUrl:'https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/#agents', transport:'Streamable HTTP', authentication:'No authentication required.', permissions:'Read-only public reference. No authentication required.',
    setup:'Paste the MCP URL into your prompt. This service does not provide access to donor or programme records.'
  },
  {
    id:'growth-report', department:'live', title:'Growth Report',
    description:'Counts first-time donors for a period, compares the result with a target and generates a branded PDF or HTML report with its definition and evidence. Uses synthetic data.',
    methods:['get_metric_definition','inspect_growth_dataset','calculate_growth','explain_growth_result','generate_growth_report'],
    prompt:'Generate a branded Growth report for 1 July–30 September 2026 against a target of 150 new donors. Use first-ever received qualifying donations, include the definition and evidence, and provide the PDF and HTML report links.',
    owner:'Wetland growth reporting project', data:'Synthetic donor records only. Returns totals and trends, never names or contact details.',
    status:'Available', endpoint:GROWTH_ENDPOINT, referenceUrl:'https://wetland-growth-kpi-demo-462504004653.northamerica-northeast2.run.app/', transport:'Streamable HTTP', authentication:'No authentication required.', permissions:'Read-only access to a synthetic dataset. No authentication required.',
    setup:'Paste the MCP URL into your prompt. Reports use the Branding MCP for their styling.'
  },
  example('grant-applications','Grant applications',
    'Supplies funder requirements, approved programme facts, budgets and past reviewer feedback so an agent can draft proposals, identify missing evidence and check eligibility.',
    ['get_funder_requirements','find_programme_facts','get_reviewer_feedback','check_eligibility'],
    'Draft a proposal outline for this funder using approved programme facts and budgets. Check eligibility against the funder requirements, list any missing evidence and note past reviewer feedback that applies.',
    'Funder requirements, approved programme facts, budgets and past reviewer feedback.'),
  example('programme-reporting','Programme reporting',
    'Supplies indicator definitions, reporting templates and validated results so an agent can produce consistent reports and flag conflicting figures.',
    ['get_indicator_definition','get_reporting_template','get_validated_results'],
    'Produce a programme report for this period using the standard template and validated results. Use the agreed indicator definitions and flag any figures that conflict.',
    'Indicator definitions, reporting templates and validated results.'),
  example('governance-approvals','Governance and approvals',
    'Supplies policies, decision rights and approval thresholds so an agent can identify who must approve a pilot, purchase or release.',
    ['find_policy','get_decision_rights','get_approval_threshold'],
    'Who needs to approve this pilot? Check the relevant policy, decision rights and approval thresholds, and list the approvers in order with the policy each one comes from.',
    'Policies, decision rights and approval thresholds.'),
  example('tool-maintenance','Tool maintenance',
    'Supplies tool owners, versions, known issues, tests and support documentation so an agent can diagnose problems, propose fixes and prepare handovers.',
    ['get_tool_owner','list_known_issues','get_test_results','get_support_docs'],
    'This tool is returning an error. Check its version, known issues and test results, suggest a likely cause and a fix, and tell me who owns it.',
    'Tool owners, versions, known issues, tests and support documentation.'),
  example('staff-onboarding','Staff onboarding',
    'Supplies role guides, procedures, terminology and training resources so an agent can answer practical questions and create role-specific learning plans.',
    ['get_role_guide','find_procedure','define_term','list_training'],
    'I am starting as a Supporter Care Officer. Create a two-week learning plan from my role guide and training resources, and explain the terms I will hear most often.',
    'Role guides, procedures, terminology and training resources.'),
  example('communications','Communications',
    'Supplies approved claims, messaging, terminology and English/French conventions so an agent can draft consistent updates with traceable sources.',
    ['find_approved_claims','get_messaging','get_terminology','get_language_conventions'],
    'Draft a short supporter update in English and French about our clean water work. Use only approved claims and messaging, and cite the source of each claim.',
    'Approved claims, messaging, terminology and English/French conventions.'),
  example('developer-standards','Developer standards',
    'Supplies API contracts, architecture decisions, security requirements and reusable components so an agent can build features that fit the existing platform.',
    ['get_api_contract','find_architecture_decision','get_security_requirements','list_components'],
    'I need to add a donation export feature. Which API contracts, architecture decisions, security requirements and reusable components apply?',
    'API contracts, architecture decisions, security requirements and reusable components.'),
  example('organisational-learning','Organisational learning',
    'Supplies evaluated pilots, lessons learned and retired approaches so an agent can find relevant experience before anyone proposes another tool.',
    ['find_evaluated_pilots','get_lessons_learned','list_retired_approaches'],
    'Before I propose a chatbot for supporter questions, have we tried anything similar? Summarise relevant pilots, lessons learned and retired approaches.',
    'Evaluated pilots, lessons learned and retired approaches.')
];

export function matchingResources(query='', status='All', catalogue=resources, groups=departments) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return catalogue.filter(r => (status==='All' || r.status===status) && words.every(word =>
    [r.title,r.description,r.owner,r.department,groups.find(d=>d.id===r.department)?.title||'',...r.methods].join(' ').toLowerCase().includes(word)));
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
  const entries=[...catalogue.items,...catalogue.deleted.map(e=>e.resource)].filter(r=>r.department===id);
  if(entries.length)throw Error("Can't delete this department because it contains MCPs, including any deleted entries. Only empty departments can be deleted.");
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
