# Wetland delivery backlog

Status: 17 October 2026. This separates working demonstration capabilities from production rollout gates. Passing repository tests does not establish Microsoft tenant acceptance or permission to use real donor data.

## Implemented

- Public Brand reference MCP and fixed synthetic Growth demonstration on GCP.
- Receipt-based Growth calculation, source evidence and mandatory Brand dependency for PDF/HTML reports. Calculation remains available independently when Brand fails.
- Shared MCP runtime, starter templates and local draft/test/apply authoring workflow.
- Entra token validation adapter and Copilot Studio deployment instructions; separate local Firebase demo sign-in.
- Catalogue and presenter walkthrough with live demo links, example prompts and explicit pending Copilot setup.
- Offline CRM export mapping, validation, normalization and operator-attested history metadata. This does not ingest data into the deployed service.
- Local Deck MCP and refreshed marketplace presentation. Deck MCP is not a hosted service.
- Build/test recipes, configuration-preserving release/rollback helper and on-demand public-service checks. These tools do not establish continuous monitoring.

## Current delivery work

- Complete integration review, CI and release verification of the combined changes.
- Eight scoped synthetic MCP examples are deployed and verified. They are not live CRM/programme integrations.

## Skill delivery

- Markdown skill catalogue, local upload/edit/test/apply authoring, scoped retrieval tools and signed server-checked read-only workflows implemented. Growth enforces Brand-dependent report validation before workflow link release. See [skill delivery](SKILL-DELIVERY.md).
- Microsoft-host behavior still requires tenant acceptance. Durable write/approval workflows and shared web-based publishing are not implemented.
- Automatic GitHub deployment currently needs staging-bucket permission repair: [issue14](https://github.com/mohammedahmxd/Wetland/issues/14). Direct deployment through the existing authorized build account works.

## External setup and remaining engineering

| Priority | Gate | Required completion evidence |
| --- | --- | --- |
| 1 | Microsoft tenant setup | Approved Copilot Studio environment, Entra API/client registrations, scope consent, user/group assignment and published agent. End-to-end discovery, report invocation and denied-user tests in that tenant. |
| 1 | Authenticated report delivery | Approved connector/action or browser sign-in flow delivers protected PDF/HTML into an authorized Microsoft location. A bearer-protected download URL alone is not a working browser attachment. |
| 2 | Shared platform backend | Provision managed PostgreSQL and runtime identity, apply schema and organization memberships, implement dashboard API/login wiring and verify authorization end to end. The backend foundation exists; shared dashboard editing is not implemented/deployed. |
| 2 | Approved real CRM integration | Obtain approved export/source mapping and historical-completeness evidence; implement authorized storage, dataset membership and reporting integration. Real CRM data is not connected to the live demo. |
| 2 | Protected Brand dependency | Supply reviewed service authentication when Brand requires it. Growth does not forward the user's bearer token or donor data to Brand. |
| 2 | Durable report archive | Configure governed object storage, ownership checks, retention/deletion policy and recovery tests. Current report links regenerate and may become stale when dependencies change. |
| 2 | Operations ownership | Choose alert destinations and owners; configure monitoring, budget alerts, dependency-change response and recovery exercises. On-demand checks exist; long-term monitoring and alert delivery are not configured. |

## Acceptance boundary

The demonstration can show real MCP calls, synthetic calculations, a required Brand dependency and generated artifacts. It must not be presented as completed WaterAid tenant integration, a deployed multi-user editing platform, or a production donor-data system. These gates remain open until their evidence is recorded.
