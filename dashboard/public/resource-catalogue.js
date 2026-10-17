import {scenarios} from './example-scenarios.js';

export const BRAND_ENDPOINT = 'https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/mcp';

export const departments = [
  {id:'fundraising', number:'01', title:'Fundraising & donor relations', description:'Better stewardship, stronger proposals and clearer evidence of impact.'},
  {id:'it', number:'02', title:'IT, infrastructure & systems', description:'Practical support for the people keeping systems and data working.'},
  {id:'support', number:'03', title:'Supporter care & community', description:'Useful answers, thoughtful communication and a human handoff when it matters.'},
  {id:'brand', number:'04', title:'Brand, communications & media', description:'One consistent voice and visual language, with evidence close at hand.'}
];

const concept = (id, department, title, description, methods, prompt, owner, data) => ({
  id, department, title, description, methods, prompt, owner, data,
  status:'Planned', endpoint:null, permissions:'Proposed read-only access. No service is connected.',
  setup:'This is a capability concept. An owner, approved data sources, access controls and a deployed MCP are needed before connection.'
});

export const resources = [
  concept('donor-crm','fundraising','Donor CRM & stewardship',
    'Bring together giving history and stewardship tasks so staff can prepare relevant donor conversations.',
    ['get_giving_summary','list_stewardship_tasks'],
    'Using approved supporter records, prepare a donor conversation brief. Cite the source of each fact, respect communication preferences and leave relationship decisions to the fundraising team.',
    'Fundraising & Partnerships','Confidential supporter data; exclude restricted relationship notes unless specifically approved.'),
  concept('gift-matching','fundraising','Campaign & gift matching',
    'Check a campaign’s matching conditions and help staff explain eligibility, limits and deadlines accurately.',
    ['get_match_conditions','check_gift_eligibility'],
    'Review this campaign’s approved matching terms. Explain the ratio, cap, eligible gifts and closing date. Flag missing terms; do not promise a match without evidence.',
    'Fundraising & Partnerships','Approved campaign terms and synthetic gift examples.'),
  concept('grant-impact','fundraising','Grants & impact reporting',
    'Find funder requirements, assemble source-linked updates and flag figures that need a staff decision.',
    ['get_reporting_requirements','find_impact_evidence'],
    'Draft a funder update using approved programme evidence. Cite each claim, identify conflicting indicators and missing data, and list the checks a staff reviewer must complete.',
    'International Programmes','Confidential reports; country-team permission required for programme data.'),
  concept('access-directory','it','Access & systems directory',
    'Find the right system owner and approved access-request process without exposing credentials.',
    ['find_system_owner','get_access_process'],
    'Find the owner and approved process for requesting access to this system. Link the relevant policy. Do not grant access, expose secrets or infer permissions.',
    'IT & Operations','Internal system inventory and access guidance; no credentials.'),
  concept('service-health','it','Service health & operations',
    'Help IT teams interpret approved service-health summaries and identify what needs investigation.',
    ['get_service_summary','find_known_issue'],
    'Summarise the approved service-health report with its timestamp and scope. Separate confirmed failures from hypotheses, and suggest the relevant investigation runbook.',
    'IT & Operations','Sanitised operational summaries; exclude secrets and personal information.'),
  concept('runbooks','it','IT helpdesk & runbooks',
    'Retrieve reviewed troubleshooting steps and route unresolved questions to the responsible person.',
    ['search_runbooks','get_escalation_route'],
    'Find a reviewed runbook for this IT issue. Cite the version, explain safe troubleshooting steps and indicate when to escalate. Do not change system settings.',
    'IT & Operations','Internal runbooks and approved support routes.'),
  concept('supporter-faq','support','Supporter questions & enquiries',
    'Help staff answer routine donation and receipt questions while recognising sensitive conversations.',
    ['search_supporter_faq','suggest_enquiry_route'],
    'Draft a reply using the approved supporter FAQ. Cite the guidance, avoid requesting payment details, and route complaints, bereavement and legacy conversations to a person.',
    'Supporter Care & Data','Reviewed FAQs; personal enquiries require an approved environment.'),
  concept('community-feedback','support','Feedback & shared learning',
    'Surface themes in anonymised feedback so teams can listen, learn and improve their service.',
    ['get_feedback_themes','find_service_gaps'],
    'Summarise themes in this anonymised feedback. Include the period and sample size, preserve minority concerns and avoid identifying individuals or claiming representative results.',
    'Supporter Care & Data','Aggregated or anonymised feedback only.'),
  concept('translation','support','English & French drafting',
    'Prepare a first translation against reviewed terminology for a bilingual colleague to adapt and approve.',
    ['get_approved_terms','draft_translation'],
    'Prepare a Canadian French draft using the approved English source and terminology. Preserve figures and meaning, flag ambiguous phrases and require bilingual review before publication.',
    'Communications & Brand','Approved source copy and bilingual terminology; sensitivity follows the source.'),
  {
    id:'brand-system', department:'brand', title:'WaterAid brand reference',
    description:'Read the shared visual reference: colour tokens, typography, original assets and document guidance.',
    methods:['get_brand_system','list_assets','get_asset','get_ui_guidance','get_document_guidance'],
    prompt:'Read get_brand_system and get_ui_guidance before designing. Choose original artwork with list_assets and get_asset. For a PDF, read get_document_guidance. Use the exact colour tokens and Noto Sans; preserve logo proportions. Label proposed or fictional content and check the finished layout.',
    owner:'Wetland brand reference project', data:'Public reference material only. Independent research kit; not official WaterAid brand approval.',
    status:'Available', endpoint:BRAND_ENDPOINT, referenceUrl:'https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/#agents',transport:'Streamable HTTP',authentication:'No authentication required.',permissions:'Read-only public reference. No authentication required.',
    setup:'Add this URL as a remote MCP server using Streamable HTTP in a compatible agent. Discover its tools, then use the example prompt. Client setup varies; this service does not provide access to donor or programme records.'
  },
  concept('media-rights','brand','Media assets & usage rights',
    'Help teams locate approved media and check consent, credits and permitted usage before publishing.',
    ['find_approved_assets','get_usage_conditions'],
    'Find an approved asset for this communication. Return its source, credit, consent scope and usage restrictions. Flag missing permissions and do not treat an available file as permission to publish.',
    'Communications & Brand','Approved asset metadata and usage conditions; no participant-level consent records.'),
  concept('editorial','brand','Editorial voice & press',
    'Retrieve reviewed messaging and prepare clear first drafts that keep evidence and approval requirements visible.',
    ['get_reviewed_messaging','find_public_sources'],
    'Draft this communication from reviewed messaging and public evidence. Cite factual claims, preserve approved quotations and mark the output as a draft for Communications review.',
    'Communications & Brand','Reviewed public messaging, source references and editorial guidance.')
];

const workflowMethods = ['find_skills','get_skill','start_workflow','get_workflow_step','advance_workflow'];
const growthOrigin = 'https://wetland-growth-kpi-demo-462504004653.northamerica-northeast2.run.app';
const examplesOrigin = 'https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app';
const exampleDepartments = {grants:'fundraising','programme-reporting':'fundraising',governance:'it',maintenance:'it',onboarding:'it',communications:'brand','developer-standards':'it',learning:'support'};

// Add working demonstrations alongside the team's planned capabilities; never replace them.
export const integratedResources = [
  {
    id:'growth-reporting', department:'fundraising', title:'Growth reporting',
    description:'Count first-time donors against a target and generate evidence-backed PDF and HTML reports using the shared Brand service.',
    methods:['inspect_growth_dataset','get_metric_definition','calculate_growth','generate_growth_report','explain_growth_result',...workflowMethods],
    prompt:'Find and read the growth-reporting skill. Generate a branded Growth report for 1 July–30 September 2026 against a target of 150 new donors. Use first-ever received qualifying donations, include the definition and evidence, and return the generated PDF and HTML links. Clearly label the data as synthetic.',
    owner:'Wetland Growth demo project', data:'Fixed synthetic donor dataset. No live supporter or CRM records.', synthetic:true,
    status:'Available', endpoint:growthOrigin+'/mcp', demoUrl:growthOrigin+'/', skillIds:['growth-reporting'],
    transport:'Streamable HTTP', authentication:'No authentication required for this public synthetic demo.',
    permissions:'Synthetic reporting only. Generates demo documents; does not change donor records.',
    setup:'Connect this Streamable HTTP endpoint in a compatible agent. Discover tools and read the growth-reporting skill with find_skills and get_skill. Use start_workflow for guided reporting. Finished reports require the Brand MCP; calculations remain available independently. Microsoft agent setup requires your tenant administrator.'
  },
  ...scenarios.map(s=>({
    id:'example-'+s.scope, department:exampleDepartments[s.scope], title:s.name+' · example',
    description:s.prompt, methods:[s.tool,...workflowMethods], prompt:s.prompt,
    owner:'Wetland synthetic examples project', data:'Invented demonstration fixtures and illustrative guidance. No live organisational records.', synthetic:true,
    status:'Available', endpoint:examplesOrigin+'/mcp/'+s.scope, demoUrl:examplesOrigin+'/?capability='+s.scope, skillIds:[s.scope],
    transport:'Streamable HTTP', authentication:'No authentication required for this public synthetic example.',
    permissions:'Advisory drafts only. No approvals, publication, account changes or live tool changes.',
    setup:'Connect this scoped Streamable HTTP endpoint in a compatible agent. Use find_skills and get_skill to read the '+s.scope+' playbook, then start_workflow for guided checks. This endpoint exposes only this capability and its workflow tools. Finished-document integration is separate; Microsoft agent setup requires your tenant administrator.'
  }))
];
resources.push(...integratedResources);

export function matchingResources(query='', status='All', catalogue=resources, groups=departments) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return catalogue.filter(r => (status==='All' || r.status===status) && words.every(word =>
    [r.title,r.description,r.owner,r.department,r.synthetic?'synthetic':'',...(r.skillIds||[]),groups.find(d=>d.id===r.department)?.title||'',...r.methods].join(' ').toLowerCase().includes(word)));
}

export function connectionConfig(resource) {
  return resource.status==='Available' && resource.endpoint ? {mcpServers:{[resource.id]:{type:resource.transport==='SSE'?'sse':'http',url:resource.endpoint}}} : null;
}

export function seedCatalogue(){return {items:structuredClone(resources),deleted:[],departments:structuredClone(departments)};}

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
