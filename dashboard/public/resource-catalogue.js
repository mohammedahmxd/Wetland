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
  setup:'This is a capability concept. An owner, approved data sources, access controls and a deployed MCP endpoint are needed before connection.'
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
    status:'Available', endpoint:BRAND_ENDPOINT, permissions:'Read-only public reference. No authentication required.',
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

export function matchingResources(query='', status='All') {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return resources.filter(r => (status==='All' || r.status===status) && words.every(word =>
    [r.title,r.description,r.owner,r.department,departments.find(d=>d.id===r.department).title,...r.methods].join(' ').toLowerCase().includes(word)));
}

export function connectionConfig(resource) {
  return resource.endpoint ? {mcpServers:{[resource.id]:{type:'http',url:resource.endpoint}}} : null;
}
