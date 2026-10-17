# Wetland MCP framework

## What is implemented

A shared, dependency-injected Node runtime in `packages/mcp-runtime`, two executable starters, migrated Brand and Growth services, and a local browser authoring studio. The dashboard's **Build an MCP** page explains how to create and edit a source-backed package. Existing browser-local document/tool editing remains a separate sandbox.

Every capability has:

- `manifest.json`: versioned identity, owner, purpose, type and data classification.
- `config.json`: capability-validated parameters; not executable code.
- `knowledge/guidance.md`: editable language/instructions.
- `capability.mjs`: schemas, validation, tool registrations and calculation logic.
- `server.mjs`: small stdio/HTTP adapter using the shared runtime.
- `test.mjs` (or Brand's `mcp.test.mjs`): known results and boundaries.

The runtime supplies manifest validation, read-only tool wrappers, resources, structured failure references without logging inputs, stdio startup, stateless Streamable HTTP, health/manifest pages and bounded HTTP requests. Private HTTP packages require an authorization callback. This callback is an integration point, not an implemented identity provider; it must verify tokens and authorize tenant/source access. The runtime cannot validate the trustworthiness of arbitrary callback code. Use separate service identities and tenant-scoped data access. Do not mark private data synthetic/public to bypass this gate.

## Create a capability

From the repository root, using Node 22:

```sh
node scripts/create-mcp.mjs knowledge programme-guidance
# or: node scripts/create-mcp.mjs reporting programme-kpis
cd services/programme-guidance
npm install --ignore-scripts
npm test
npm run studio
```

The scaffold refuses path traversal and existing names. Assign a maintainer, replace example guidance and add meaningful domain tests. Commit the generated lockfile. Add the service's install/test steps to CI before release. The reporting starter uses small completion examples; Growth remains the full fundraising reference implementation. SDK dependencies are pinned; runtime is a local file package, so keep the monorepo layout.

## Edit an existing capability

```sh
cd services/growth-kpi
npm ci --ignore-scripts
npm run studio
```

Open the URL printed in the terminal. The editor is loopback-only, uses an ephemeral bearer token supplied in the URL fragment, checks browser origin and refuses Cloud Run/production startup. It is a developer workstation tool, not a multiuser hosted editor.

1. Edit metadata, validated JSON configuration and guidance. Protected package ID/type/data-classification changes require code review.
2. Save a draft. The baseline package digest must still match.
3. Run candidate tests. The studio copies the service to a temporary directory, writes only those three candidate files there and runs the service's existing `npm test`. Dependencies are shared read-only by convention through a symlink. This is isolation for avoiding accidental file edits, **not a security sandbox for untrusted code**. Only run code you trust locally. Contributor code belongs in a hardened CI runner with no production credentials.
4. Increment the semantic release version, save and test again if needed.
5. Apply the exact passing draft. Changed drafts invalidate tests; changed working files require reload. Changes to service files or the shared runtime also invalidate the candidate evaluation. Apply changes Git working files only, never commits, pushes or deploys them.
6. Review the diff, open a PR, require independent approval and passing CI, then deploy the approved commit. Branch protection is an administrator configuration and is not established by this code.

Draft/evaluation files under `.mcp/` are ignored by Git, Docker and Cloud Build. The local test marker is convenience metadata, not a cryptographically trusted production approval. GitHub checks and human review remain the release boundary. Revert commits to restore earlier content, then rerun tests and redeploy the approved version. No generated code or arbitrary tool code can be edited through this form.

## Growth editing contract

Editable: report title, default donor target, owner/description/version and editorial guidance. The calculation definition version is fixed by the capability validator. Definition, receipt eligibility, identity rules and data-field mapping changes require developer changes and new tests. Field mapping UI and arbitrary CRM upload are not implemented.

`generate_growth_report` returns dataset hashes, calculation-definition version, package version and a digest of manifest/configuration/guidance. The digest does not cover source code; the deployed image digest and Git commit identify implementation. Guidance is returned as reference content and must not be treated as permission or executable instructions. Generated Markdown changes the heading only; the core numerical report remains controlled by code.

## Brand compatibility

Existing five tool names and four resource URIs remain available. Three additional package resources expose manifest, configuration and editorial guidance. Existing assets and document downloads remain unchanged. The current live Brand service is not automatically replaced by merging this change; deployment is separate.

## Transport and deployment

Growth and starters support `npm start` (stdio) and `npm run start:http`. Brand remains HTTP. Set `PUBLIC_BASE_URL` to the exact HTTPS service origin for browser-origin checks and generated Brand URLs. Endpoint `/mcp` accepts MCP POST; GET returns 405. `/api/health` is the Cloud Run health URL.

Docker build contexts are now the **repository root**:

```sh
docker build -f services/growth-kpi/Dockerfile -t wetland-growth .
docker build -f services/brand-mcp/Dockerfile -t wetland-brand .
```

`deploy/mcp-cloudbuild.yaml` installs/tests a selected service, tests the runtime, builds/pushes a versioned image and deploys it using explicitly supplied build/runtime identities and base URL. No credential keys are included. It does not change IAM/public access. Provision a service and grant narrowly scoped deployment/image permissions separately; dashboard deployment permissions do not automatically authorize brand or Growth deployments. `services/brand-mcp/deploy.sh` calls this root-context build. The scaffold creates a matching root-context Dockerfile; generate and commit its lockfile before building.

For an authorized, already provisioned service:

```sh
gcloud builds submit . --project=YOUR_PROJECT --region=YOUR_REGION \
  --config=deploy/mcp-cloudbuild.yaml \
  --substitutions=_PACKAGE=growth-kpi,_SERVICE=YOUR_SERVICE,_REGION=YOUR_REGION,_BUILD_SA=BUILD_EMAIL,_RUNTIME_SA=RUNTIME_EMAIL,_PUBLIC_BASE_URL=https://YOUR_SERVICE_URL
```

## Shared dashboard boundary

This change does not expose authoring writes on the public dashboard or deploy the existing authenticated backend. Its organization-scoped immutable resource/version API remains the foundation for a future hosted editor. Connecting it to package builds requires configured identity, a private database, repository authorization, a build worker, and a signed release/evaluation record tied to the exact commit/image. Those integrations are deliberately not represented by sandbox role switches or local test markers. Until configured, the real collaborative path is GitHub branches, CI and review.

## Microsoft Copilot deployment

Install runtime dependencies first: `npm ci --ignore-scripts --prefix packages/mcp-runtime`. See [Copilot + GCP](COPILOT-GCP.md) for Entra delegated-token validation, demo mode and deployment. Starter HTTP servers use the same optional Entra adapter.
