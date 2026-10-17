# Copilot + GCP deployment handoff

## What is implemented

Brand and Growth expose stateless MCP Streamable HTTP at `/mcp`. Copilot Studio can use the manual OAuth connector flow. `packages/mcp-runtime/entra.mjs` validates single-tenant Entra v2 delegated access tokens: RS256 signature, issuer, API audience, expiry, not-before, tenant, object ID, scope and explicitly allowed client IDs. Application-only tokens are rejected. The verified identity is passed to `createServer({identity})` for future dataset-level policy.

The Growth package remains **synthetic-only**. Its presenter calls the real MCP endpoint, has no language model, and is not a Microsoft UI. Do not represent a presenter success as a completed Copilot integration. Live Microsoft tenant end-to-end testing remains a deployment acceptance step.

## Local demo

From repository root, with Node 22 or newer:

```sh
npm ci --ignore-scripts --prefix packages/mcp-runtime
npm ci --ignore-scripts --prefix services/growth-kpi
cd services/growth-kpi
PUBLIC_BASE_URL=http://localhost:8080 MCP_AUTH_MODE=none MCP_DEMO_UI=true npm run start:http
```

Open `http://localhost:8080`. Generate Q3 2026 against 150. Expect **120 donors, 80%, gap 30**. Inspect the actual JSON-RPC request, returned cohort and source hashes. Try Q2 (90 donors) and invalid/out-of-coverage dates. The public demo contains only the fixed synthetic dataset. No upload or CRM credentials are accepted.

## Build on GCP

From repo root; set these shell variables to approved project resources:

```sh
gcloud builds submit . --project="$PROJECT_ID" --region="$REGION" \
  --config=deploy/copilot-build.yaml \
  --service-account="projects/$PROJECT_ID/serviceAccounts/$BUILD_SA" \
  --substitutions="_PACKAGE=growth-kpi,_SERVICE=$SERVICE,_REGION=$REGION"
```

The output image is `$REGION-docker.pkg.dev/$PROJECT_ID/web/$SERVICE:BUILD_ID`. This recipe only builds/tests/pushes. It does not grant IAM roles or change an existing deployment. The build identity needs Artifact Registry write and logs permissions. Use a separate runtime service account; the synthetic service needs no project roles.

Public synthetic presenter deployment:

```sh
gcloud run deploy "$SERVICE" --project="$PROJECT_ID" --region="$REGION" \
  --image="$IMAGE" --service-account="$RUNTIME_SA" \
  --set-env-vars="PUBLIC_BASE_URL=$SERVICE_URL,MCP_AUTH_MODE=none,MCP_DEMO_UI=true" \
  --no-invoker-iam-check --min-instances=0 --max-instances=2 --memory=256Mi --port=8080
```

Use a separate demo service; never apply public demo settings to a private data service. Configure project budget alerts and monitoring according to local operating policy. After deploy, run `node services/growth-kpi/smoke.mjs "$SERVICE_URL/mcp"` from the repository root.

## Microsoft administrator setup

1. Register a single-tenant **API** app in Entra. Set `api.requestedAccessTokenVersion` to `2`. Expose an admin-consent delegated scope, e.g. `api://API_CLIENT_UUID/Reports.Read`.
2. Register a separate **connector client** app. Grant that API's delegated permission and administrator consent. Apply organization-approved user/group assignment and Conditional Access. The service is one permission boundary: every approved caller can access this service's dataset. For mixed-access datasets implement server-side membership checks using the verified tenant/object ID before connecting real data.
3. In Copilot Studio create the WaterAid agent. Tools → Add tool → New tool → Model Context Protocol. Enter the HTTPS `/mcp` endpoint. Select OAuth 2.0 → Manual.
4. Client ID: connector client UUID. Client secret: create/store directly in Microsoft's connector configuration, never in Git, browser demo code, or Cloud Run. Authorization URL: `https://login.microsoftonline.com/TENANT_UUID/oauth2/v2.0/authorize`. Token and refresh URL: `https://login.microsoftonline.com/TENANT_UUID/oauth2/v2.0/token`. Scope: `api://API_CLIENT_UUID/Reports.Read offline_access`.
5. Copy the callback URL displayed by the wizard into the connector client's registered Web redirect URIs. Create a per-user connection and add the tool to the agent. Verify execution uses the end user's connection, not a broadly privileged shared owner connection.
6. Approve the connector under the environment's Power Platform data policies. Publish the approved agent to the staff's permitted Microsoft channel. Licensing/capacity and Copilot Studio author permissions must be confirmed by their administrator.

For Brand use a separate `Brand.Read` scope or explicitly approve a shared permission boundary. Brand's existing Firebase implementation is preserved: do not set `AUTH_PROFILE` / `AUTH_EMAIL_DOMAINS` when selecting Entra. Configuring both modes fails startup. Public Brand assets remain public regardless of MCP authentication; this configuration is not for private documents.

## Deploy with Entra

Copy `deploy/entra.env.example.yaml` to a local configuration file; fill in the non-secret tenant ID, API app client ID, connector client ID, scope and service URL. Keep presenter disabled. Use the same built image:

```sh
gcloud run deploy "$SERVICE" --project="$PROJECT_ID" --region="$REGION" \
  --image="$IMAGE" --service-account="$RUNTIME_SA" \
  --env-vars-file=PATH_TO_FILLED_ENTRA_CONFIG \
  --no-invoker-iam-check --min-instances=0 --max-instances=2 --memory=256Mi --port=8080
```

This ingress setting permits Microsoft to reach the HTTPS application; **the application still requires a verified Entra token on every MCP request**. Google Cloud Run IAM tokens and Microsoft API tokens are distinct. An organization that requires IAM-private ingress must supply an approved gateway/federation design instead. Health/manifest routes are public and must contain no sensitive data. The runtime has no client secret; it verifies Microsoft signing keys remotely with caching.

Unknown auth modes and incomplete Entra configuration fail startup. A package classified `private` cannot start HTTP without an authorization adapter. Development stdio remains a local trusted process and is not a production access boundary.

## Agent instructions and acceptance

Tell the agent: use `get_metric_definition` before reporting Growth; call `generate_growth_report` with inclusive start/end dates and target; report returned values without recalculating donor counts; disclose synthetic data, coverage, definition version and package digest. Use Brand's `get_document_guidance` before formatting a report. Distinguish first donation from CRM record creation. Ask for missing dates; report tool errors rather than inventing results.

Before real rollout: verify authenticated MCP discovery and Q3 results in Copilot Studio; reject unsigned/wrong audience/expired/wrong tenant/wrong scope/disallowed client tokens; test an unassigned user; check that shared connections cannot bypass user authorization; test rollback to the previous image. Before real donor data: implement approved import mappings, complete-history checks, dataset-level authorization and operational retention/audit controls. No real CRM integration or production data approval is included in this demo.

Sources: [Microsoft MCP setup](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent), [Entra access tokens](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens), [Cloud Run authentication](https://docs.cloud.google.com/run/docs/authenticating/overview).

## Required Brand dependency for report generation

`calculate_growth` returns figures and evidence only. `generate_growth_report` now invokes the configured Brand MCP itself, using only fixed read-only guidance/asset requests. No donor data or Copilot bearer token is sent to Brand. The shared `packages/mcp-reporting` renderer embeds the original logo and Noto Sans fonts, applies the returned palette, and emits self-contained HTML and a one-page PDF. The renderer only accepts the reviewed document profile/instruction hashes in `contract.json`; new instructions require review, not silent interpretation of arbitrary guidance.

Set `BRAND_MCP_URL` to the approved HTTPS `/mcp` endpoint. The current demo uses the public reference Brand service. This implementation does not automatically authenticate to a protected Brand server; supply a reviewed service-auth adapter before using a protected Brand dependency. Never forward the staff user's Growth token to Brand.

The finished tool result contains `downloads.pdf`, `downloads.html`, Brand provenance, source hashes and render checks. Download routes use the same Entra authorization as MCP when enabled. They regenerate the artifact and compare its exact digest, returning 409 if data, package, renderer or Brand changed. This is stateless and requires no instance-local file store. Files are temporary during rendering and deleted afterward. Changing renderer/library versions can invalidate existing links; generate a fresh report after rollout. For long-lived archival reports, add governed object storage and retention policy.

The public demo downloads require no sign-in because only bundled synthetic data is available. In protected deployment the download links require a bearer token and will not open anonymously in an ordinary browser. The tenant integration must fetch them through an authenticated connector/action and deliver files into an approved SharePoint/OneDrive location, or implement a Microsoft browser sign-in download route. Do not promise native Copilot attachment delivery before this tenant-specific acceptance test. Numeric answers and links are already available through the MCP tool.

Deploy the Growth image with Python ReportLab, pypdf, Pillow and Poppler (included in its Dockerfile), at least 512 MiB RAM, a 120-second request timeout and concurrency 2. Rendering checks run for every export: page count, text presence, embedded logo/fonts, layout bounds and a successful raster render. Human visual inspection of the template was performed during development; automated checks do not replace review of future template changes.

Updated Copilot agent instruction: For finished reports always call `generate_growth_report` and return its generated PDF/HTML links. Do not format a replacement document yourself. If Brand fails, explain that document generation is unavailable; offer `calculate_growth` only as unformatted figures. A staff agent can still write independently outside this workflow; the service enforces the requirement for documents it generates, not all content an external agent might create.
