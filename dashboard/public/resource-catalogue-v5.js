// Frozen default records from c79c008, used only to preserve local edits during migration.
export const v5Defaults = [
  {
    "id": "branding",
    "department": "live",
    "title": "Branding",
    "description": "Gives your assistant the shared brand system: colour tokens, typography, approved logos and assets, and guidance for documents and interfaces.",
    "methods": [
      "get_brand_system",
      "list_assets",
      "get_asset",
      "get_ui_guidance",
      "get_document_guidance"
    ],
    "prompt": "Retrieve the document guidance and approved brand assets for a quarterly fundraising report. Summarise the typography, colours and logo requirements and cite the guidance used.",
    "owner": "Wetland brand reference project",
    "data": "Public reference material only. Independent research kit; not official WaterAid brand approval.",
    "status": "Available",
    "endpoint": "https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/mcp",
    "referenceUrl": "https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/#agents",
    "transport": "Streamable HTTP",
    "authentication": "No authentication required.",
    "permissions": "Read-only public reference. No authentication required.",
    "setup": "Paste the MCP URL into your prompt. This service does not provide access to donor or programme records."
  },
  {
    "id": "growth-reporting",
    "department": "live",
    "title": "Growth Report",
    "description": "Counts first-time donors for a period, compares the result with a target and generates a branded PDF or HTML report with its definition and evidence.",
    "methods": [
      "inspect_growth_dataset",
      "get_metric_definition",
      "calculate_growth",
      "generate_growth_report",
      "explain_growth_result",
      "find_skills",
      "get_skill",
      "start_workflow",
      "get_workflow_step",
      "advance_workflow"
    ],
    "prompt": "Find and read the growth-reporting skill. Generate a branded Growth report for 1 July–30 September 2026 against a target of 150 new donors. Use first-ever received qualifying donations, include the definition and evidence, and return the generated PDF and HTML links. Clearly label the data as synthetic.",
    "owner": "Wetland Growth demo project",
    "data": "Fixed synthetic donor dataset. No live supporter or CRM records.",
    "synthetic": true,
    "status": "Available",
    "endpoint": "https://wetland-growth-kpi-demo-462504004653.northamerica-northeast2.run.app/mcp",
    "demoUrl": "https://wetland-growth-kpi-demo-462504004653.northamerica-northeast2.run.app/",
    "skillIds": [
      "growth-reporting"
    ],
    "transport": "Streamable HTTP",
    "authentication": "No authentication required for this public synthetic demo.",
    "permissions": "Synthetic reporting only. Generates demo documents; does not change donor records.",
    "setup": "Paste the MCP URL into your prompt. Finished reports use the Branding MCP for their styling."
  },
  {
    "id": "example-grants",
    "department": "examples",
    "title": "Grant applications",
    "description": "Supplies funder requirements, approved programme facts, budgets and past reviewer feedback so an agent can draft proposals, identify missing evidence and check eligibility.",
    "methods": [
      "prepare_grant_outline",
      "find_skills",
      "get_skill",
      "start_workflow",
      "get_workflow_step",
      "advance_workflow"
    ],
    "prompt": "Use the example grant tool to compare the fictional Riverbend evidence with the River Fund call for GBP 42000. Show unknown requirements and a cited draft outline; do not claim eligibility.",
    "owner": "Wetland synthetic examples project",
    "data": "Invented demonstration fixtures and illustrative guidance. No live organisational records.",
    "synthetic": true,
    "status": "Available",
    "endpoint": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/mcp/grants",
    "demoUrl": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/?capability=grants",
    "skillIds": [
      "grants"
    ],
    "transport": "Streamable HTTP",
    "authentication": "No authentication required for this public synthetic example.",
    "permissions": "Advisory drafts only. No approvals, publication, account changes or live tool changes.",
    "setup": "Paste the MCP URL into your prompt. This endpoint exposes only this example and its workflow tools."
  },
  {
    "id": "example-programme-reporting",
    "department": "examples",
    "title": "Programme reporting",
    "description": "Supplies indicator definitions, reporting templates and validated results so an agent can produce consistent reports and flag conflicting figures.",
    "methods": [
      "analyse_programme_progress",
      "find_skills",
      "get_skill",
      "start_workflow",
      "get_workflow_step",
      "advance_workflow"
    ],
    "prompt": "Analyse the fictional Q3 connection progress at sites A, B and C. Show target attainment, gaps and evidence. Return draft material; a finished document requires Brand-aware rendering.",
    "owner": "Wetland synthetic examples project",
    "data": "Invented demonstration fixtures and illustrative guidance. No live organisational records.",
    "synthetic": true,
    "status": "Available",
    "endpoint": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/mcp/programme-reporting",
    "demoUrl": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/?capability=programme-reporting",
    "skillIds": [
      "programme-reporting"
    ],
    "transport": "Streamable HTTP",
    "authentication": "No authentication required for this public synthetic example.",
    "permissions": "Advisory drafts only. No approvals, publication, account changes or live tool changes.",
    "setup": "Paste the MCP URL into your prompt. This endpoint exposes only this example and its workflow tools."
  },
  {
    "id": "example-governance",
    "department": "examples",
    "title": "Governance and approvals",
    "description": "Supplies policies, decision rights and approval thresholds so an agent can identify who must approve a pilot, purchase or release.",
    "methods": [
      "check_release_readiness",
      "find_skills",
      "get_skill",
      "start_workflow",
      "get_workflow_step",
      "advance_workflow"
    ],
    "prompt": "Check release readiness using the illustrative policy: owner and tests present, independent review and private-data review missing. Show remaining gates without granting approval.",
    "owner": "Wetland synthetic examples project",
    "data": "Invented demonstration fixtures and illustrative guidance. No live organisational records.",
    "synthetic": true,
    "status": "Available",
    "endpoint": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/mcp/governance",
    "demoUrl": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/?capability=governance",
    "skillIds": [
      "governance"
    ],
    "transport": "Streamable HTTP",
    "authentication": "No authentication required for this public synthetic example.",
    "permissions": "Advisory drafts only. No approvals, publication, account changes or live tool changes.",
    "setup": "Paste the MCP URL into your prompt. This endpoint exposes only this example and its workflow tools."
  },
  {
    "id": "example-maintenance",
    "department": "examples",
    "title": "Tool maintenance",
    "description": "Supplies tool owners, versions, known issues, tests and support documentation so an agent can diagnose problems, propose fixes and prepare handovers.",
    "methods": [
      "triage_tool_maintenance",
      "find_skills",
      "get_skill",
      "start_workflow",
      "get_workflow_step",
      "advance_workflow"
    ],
    "prompt": "Triage high and medium severity items in the fictional maintenance log. Propose tests and review steps without changing live tools.",
    "owner": "Wetland synthetic examples project",
    "data": "Invented demonstration fixtures and illustrative guidance. No live organisational records.",
    "synthetic": true,
    "status": "Available",
    "endpoint": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/mcp/maintenance",
    "demoUrl": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/?capability=maintenance",
    "skillIds": [
      "maintenance"
    ],
    "transport": "Streamable HTTP",
    "authentication": "No authentication required for this public synthetic example.",
    "permissions": "Advisory drafts only. No approvals, publication, account changes or live tool changes.",
    "setup": "Paste the MCP URL into your prompt. This endpoint exposes only this example and its workflow tools."
  },
  {
    "id": "example-onboarding",
    "department": "examples",
    "title": "Staff onboarding",
    "description": "Supplies role guides, procedures, terminology and training resources so an agent can answer practical questions and create role-specific learning plans.",
    "methods": [
      "plan_staff_onboarding",
      "find_skills",
      "get_skill",
      "start_workflow",
      "get_workflow_step",
      "advance_workflow"
    ],
    "prompt": "Prepare an illustrative contributor onboarding checklist using the example guidance. Explain who grants access.",
    "owner": "Wetland synthetic examples project",
    "data": "Invented demonstration fixtures and illustrative guidance. No live organisational records.",
    "synthetic": true,
    "status": "Available",
    "endpoint": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/mcp/onboarding",
    "demoUrl": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/?capability=onboarding",
    "skillIds": [
      "onboarding"
    ],
    "transport": "Streamable HTTP",
    "authentication": "No authentication required for this public synthetic example.",
    "permissions": "Advisory drafts only. No approvals, publication, account changes or live tool changes.",
    "setup": "Paste the MCP URL into your prompt. This endpoint exposes only this example and its workflow tools."
  },
  {
    "id": "example-communications",
    "department": "examples",
    "title": "Communications",
    "description": "Supplies approved claims, messaging, terminology and English/French conventions so an agent can draft consistent updates with traceable sources.",
    "methods": [
      "prepare_communications_outline",
      "find_skills",
      "get_skill",
      "start_workflow",
      "get_workflow_step",
      "advance_workflow"
    ],
    "prompt": "Prepare a source-backed email outline about the fictional Q3 programme. Separate verified fixture facts from unsupported claims. Require review and Brand-aware rendering before publication.",
    "owner": "Wetland synthetic examples project",
    "data": "Invented demonstration fixtures and illustrative guidance. No live organisational records.",
    "synthetic": true,
    "status": "Available",
    "endpoint": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/mcp/communications",
    "demoUrl": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/?capability=communications",
    "skillIds": [
      "communications"
    ],
    "transport": "Streamable HTTP",
    "authentication": "No authentication required for this public synthetic example.",
    "permissions": "Advisory drafts only. No approvals, publication, account changes or live tool changes.",
    "setup": "Paste the MCP URL into your prompt. This endpoint exposes only this example and its workflow tools."
  },
  {
    "id": "example-developer-standards",
    "department": "examples",
    "title": "Developer standards",
    "description": "Supplies API contracts, architecture decisions, security requirements and reusable components so an agent can build features that fit the existing platform.",
    "methods": [
      "check_developer_standards",
      "find_skills",
      "get_skill",
      "start_workflow",
      "get_workflow_step",
      "advance_workflow"
    ],
    "prompt": "Compare my declared manifest, input validation and source citations against the example developer checklist. Identify gaps without claiming a repository audit.",
    "owner": "Wetland synthetic examples project",
    "data": "Invented demonstration fixtures and illustrative guidance. No live organisational records.",
    "synthetic": true,
    "status": "Available",
    "endpoint": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/mcp/developer-standards",
    "demoUrl": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/?capability=developer-standards",
    "skillIds": [
      "developer-standards"
    ],
    "transport": "Streamable HTTP",
    "authentication": "No authentication required for this public synthetic example.",
    "permissions": "Advisory drafts only. No approvals, publication, account changes or live tool changes.",
    "setup": "Paste the MCP URL into your prompt. This endpoint exposes only this example and its workflow tools."
  },
  {
    "id": "example-learning",
    "department": "examples",
    "title": "Organisational learning",
    "description": "Supplies evaluated pilots, lessons learned and retired approaches so an agent can find relevant experience before anyone proposes another tool.",
    "methods": [
      "retrieve_organisational_learning",
      "find_skills",
      "get_skill",
      "start_workflow",
      "get_workflow_step",
      "advance_workflow"
    ],
    "prompt": "Retrieve the fictional reporting pilot lesson and a reusable next-step checklist. Cite the retrospective and identify its limitations.",
    "owner": "Wetland synthetic examples project",
    "data": "Invented demonstration fixtures and illustrative guidance. No live organisational records.",
    "synthetic": true,
    "status": "Available",
    "endpoint": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/mcp/learning",
    "demoUrl": "https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app/?capability=learning",
    "skillIds": [
      "learning"
    ],
    "transport": "Streamable HTTP",
    "authentication": "No authentication required for this public synthetic example.",
    "permissions": "Advisory drafts only. No approvals, publication, account changes or live tool changes.",
    "setup": "Paste the MCP URL into your prompt. This endpoint exposes only this example and its workflow tools."
  }
];
