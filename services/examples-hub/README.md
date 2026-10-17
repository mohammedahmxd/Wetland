# Eight reusable MCP capability examples

One deployable service, eight scoped MCP endpoints, and a combined `/mcp` endpoint. Each scoped endpoint advertises only its own tool and relevant source resources. All fixture records and illustrative policies are fictional, not WaterAid's real policies or achievements. No LLM, external data connector, approval action or mutation is used.

| Capability | Endpoint suffix | Tool |
|---|---|---|
| Grant applications | `/mcp/grants` | `prepare_grant_outline` |
| Programme reporting | `/mcp/programme-reporting` | `analyse_programme_progress` |
| Governance and approvals | `/mcp/governance` | `check_release_readiness` |
| Tool maintenance | `/mcp/maintenance` | `triage_tool_maintenance` |
| Staff onboarding | `/mcp/onboarding` | `plan_staff_onboarding` |
| Communications | `/mcp/communications` | `prepare_communications_outline` |
| Developer standards | `/mcp/developer-standards` | `check_developer_standards` |
| Organisational learning | `/mcp/learning` | `retrieve_organisational_learning` |

## Run and demonstrate

From repository root:

```sh
npm ci --ignore-scripts --prefix packages/mcp-runtime
npm ci --ignore-scripts --prefix services/examples-hub
npm test --prefix services/examples-hub
cd services/examples-hub
MCP_AUTH_MODE=none MCP_DEMO_UI=true npm run start:http
```

Open `http://localhost:8080/`. Select any capability and run its preset through the real scoped MCP endpoint. Inspect cited evidence and copy the example prompt for an already-connected approved agent. Pasting a URL in a Copilot message does not connect MCP tools. The presenter does not implement Microsoft sign-in.

`npm start` serves the combined catalogue over stdio. `npm run studio` opens the shared local package editor for source/configuration drafts; fixture edits require passing contract tests and Git review. Curated source strings and structured programme/maintenance records in `config.json` must stay consistent; changing calculation/eligibility semantics requires a developer change. Package digest covers manifest, configuration and guidance.

## Deploy

Build from repository root:

```sh
docker build -f services/examples-hub/Dockerfile -t wetland-examples .
```

Configure `PUBLIC_BASE_URL` to the actual Cloud Run origin. Set `MCP_AUTH_MODE=none` and `MCP_DEMO_UI=true` explicitly for a public synthetic presenter. Missing auth mode or incomplete Entra settings fail startup. For private access set `MCP_AUTH_MODE=entra`, omit `MCP_DEMO_UI`, and configure the shared adapter's `ENTRA_TENANT_ID`, `ENTRA_API_CLIENT_ID`, `ENTRA_REQUIRED_SCOPE` and `ENTRA_ALLOWED_CLIENT_IDS`. Every combined/scoped route uses the same authorizer. Public deployment is a separate IAM/ingress decision; the image does not change it.

## Boundaries and adaptation

- Grants report unknown/missing evidence and a budget check against a fictional call; they do not determine actual eligibility.
- Programme arithmetic counts **connections**, not people or health outcomes. Full fixture: 90/120, 75%, gap 30.
- Governance is based on user-declared evidence; even all checks passing means **ready for human review**, never approval granted.
- Maintenance returns a prioritized queue; onboarding grants no access; developer standards is a self-assessment, not a repository audit.
- Communications and programme tools return unbranded facts/outlines only. Finished documents must use the required Brand-aware report pipeline. This service does not generate approved report files or bypass Brand.
- Learning is a fictional retrospective, not measured organisational performance.
- Replace fixtures with authoritative sources and permissions before real use. The shared service is one authorization boundary; independently protected datasets require per-dataset authorization or separate services, not simply different URL paths.

Contract tests cover all eight scenarios, invalid/duplicate inputs, citations, stdio/HTTP clients, scoped tool isolation and fail-closed startup.
