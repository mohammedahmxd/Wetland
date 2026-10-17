# Wetland presenter walkthrough

Open the dashboard’s `#walkthrough` route for the five-minute tour and `#catalogue` for live services. These cards are separate from browser-local tool definitions.

1. **Discover:** show Brand and Growth as live capabilities. Each card has a human demo URL, an MCP endpoint for IT and an example prompt for an already-connected agent.
2. **Run Growth:** open https://wetland-growth-kpi-demo-462504004653.northamerica-northeast2.run.app/ and request 1 July–30 September 2026 with target 150. Expected synthetic result: **120 new donors, 80% attainment, gap 30**. New donor means first-ever received qualifying donation, not CRM creation date.
3. **Inspect output:** download PDF and HTML; show the definition, data coverage, dataset evidence and Brand provenance. Growth calls Brand to retrieve guidance/assets and validates reports before release. Missing or changed required guidance blocks report generation; separate calculations remain available.
4. **Explain adoption:** copy a catalogue prompt. A raw URL in a Copilot message does not install MCP tools. IT first connects the services in Copilot Studio, configures identity and data policies, and publishes an approved agent. Growth’s server-side Brand dependency does not require staff to add a second connection for reporting.
5. **Show maintenance:** package edits → candidate tests → reviewed GitHub change → deployment. The local package studio edits actual source files; the public dashboard’s editor demonstrates the governance journey using browser-local records.

## Honest demo boundaries

- Brand: https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/ ; MCP: append `mcp`.
- Growth: URL above; MCP: append `mcp`.
- Neither public presenter is Microsoft Copilot. The “Open in Copilot” action is disabled until an actual published agent is integrated; never substitute the service endpoint for that agent link.
- Microsoft tenant sign-in/acceptance, protected report delivery, CRM imports and dataset permissions, shared team editing and operational readiness remain deployment work. See [Copilot setup](COPILOT-GCP.md).
- Deck MCP is a separate local capability unless independently deployed and verified. Do not describe Brand as the only live MCP: Growth is also live.
