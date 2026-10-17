# Wetland release and maintenance runbook

This repository has deployment tools, not an installed monitoring or paging service.
The manual GitHub **Check deployed demo services** workflow needs no cloud credentials.
It reports a failed run when availability, tool discovery, the synthetic calculation, or
(optional) the Brand-dependent PDF fails. No schedule, alerts, SLO or on-call routing
is configured by this change. The checks contain no real donor data.

## Current deployment boundaries

Read-only inspection on 2026-10-17 confirmed these existing services in project
`wateraid-flow`, region `northamerica-northeast2`:

| Service | Runtime identity | Revision observed |
| --- | --- | --- |
| wetland-ai-workspace | wetland-workspace@wateraid-flow.iam.gserviceaccount.com | wetland-ai-workspace-00005-b42 |
| wateraid-brand-hub | wateraid-brand-hub@wateraid-flow.iam.gserviceaccount.com | wateraid-brand-hub-00004-2wq |
| wetland-growth-kpi-demo | wetland-growth-demo@wateraid-flow.iam.gserviceaccount.com | wetland-growth-kpi-demo-00002-8wr |

These are observations, not permanent rollback targets. Always describe the service
again immediately before releasing. The dashboard is a browser-local sandbox. Growth
serves synthetic data. Neither demonstrates production membership authorization.
The existing `ci-deploy.yml` main pipeline continues to deploy only the dashboard.
Its GitHub identity is not assumed to have deployment rights to every MCP service.

## Release an existing MCP

1. Merge reviewed changes and wait for CI to pass. Record the commit SHA and build ID.
2. From the repository root, use the build-only recipe. Use an already authorized
   build identity; do not widen IAM to make this command work.

```sh
gcloud builds submit . --project=wateraid-flow --region=northamerica-northeast2 \
  --config=deploy/copilot-build.yaml \
  --service-account=projects/wateraid-flow/serviceAccounts/APPROVED_BUILD_IDENTITY \
  --substitutions=_PACKAGE=growth-kpi,_SERVICE=wetland-growth-kpi-demo
```

For Brand use `_PACKAGE=brand-mcp,_SERVICE=wateraid-brand-hub`.
For the synthetic examples service use `_PACKAGE=examples-hub,_SERVICE=wetland-examples-mcp`.
The examples release allowlist does not create the service; its first deployment
needs a separately reviewed runtime identity and explicit synthetic authentication mode.
The build tests the service/runtime and includes renderer validation dependencies.
Resolve the build's image tag to its Artifact Registry `sha256` digest. Keep that
immutable image reference in the release record; do not release a mutable `latest` tag.

3. Review the release plan. The script first describes the actual service and prints
   the previous traffic/revision and runtime identity. Save that output in the release
   record, together with the source SHA and build ID.

```sh
node deploy/release.mjs deploy wetland-growth-kpi-demo \
  northamerica-northeast2-docker.pkg.dev/wateraid-flow/web/wetland-growth-kpi-demo@sha256:IMAGE_DIGEST
```

4. Add `--apply` only when the selected image and plan are correct. This updates an
   existing service's image only. It does not modify env vars, secrets, ingress, IAM,
   runtime identity, scaling or public access. It refuses split/pinned traffic so a
   canary or an earlier rollback cannot be silently overridden. The initial bootstrap
   recipe `mcp-cloudbuild.yaml` is for a separately reviewed service configuration;
   it now updates `PUBLIC_BASE_URL` without wiping existing Entra/Brand variables.
5. Verify the deployed revision/image and run:

```sh
node deploy/check-services.mjs --reports
```

The dashboard check verifies its HTML page because `/healthz` is reserved by Cloud
Run and the dashboard has no `/api/health`. MCP checks verify JSON `/api/health`,
required tool discovery, Brand guidance retrieval and the 120-donor synthetic Q3
calculation. The examples check requires exactly eight combined tools and checks
each scoped endpoint exposes and executes only its approved tool, returns cited
synthetic evidence, and rejects direct calls to another capability.
`--reports` additionally generates a report, requires Brand evidence and
fetches a PDF. It validates content type/signature, not every visual layout rule.
The renderer's own tests remain the layout/content validation gate. These fixed
checks target public demos; they are not an authenticated production smoke suite.

## Roll back

Use the previous **ready** revision from the release record, not an assumed latest
revision. The tool confirms that the revision belongs to the selected service.

```sh
node deploy/release.mjs rollback wetland-growth-kpi-demo PREVIOUS_READY_REVISION
# Review the plan; repeat with --apply to route 100% of traffic to that revision.
```

Run the smoke checks again. A rollback pins traffic to that revision. Before a later
release, review and explicitly decide the traffic plan; the deployment script refuses
pinned traffic rather than silently switching it. Never use rollback to restore a
revision with revoked credentials or a known data-access defect.

## Maintenance workflow

- Reproduce an incident with the manual check; capture failing service, commit,
  revision and timestamp without donor records or tokens.
- Review Cloud Run application logs and the dependency. A healthy Growth process
  does not imply Brand guidance/assets are available: use the report check.
- Brand guidance or asset changes intentionally invalidate generated report links.
  Generate a new report; do not disable provenance validation to hide a failure.
- Upgrade lockfiles through a reviewed PR. Run the existing runtime, service,
  report-rendering and lifecycle tests; build and check the resulting image before release.
- Retain known-good image digests/revisions until the agreed rollback window expires.
  Artifact Registry cleanup and Cloud Logging retention must be configured by the
  project owner to the team's agreed retention policy; this repository does not set one.
- Production needs an agreed availability target, monitoring/paging destinations,
  incident owner and restoration exercise. Do not describe those as installed today.

## Deploying the shared backend (not yet provisioned)

`backend/Dockerfile` already compiles TypeScript and contains migrations; the
runtime is non-root and omits dev dependencies. Build using
`deploy/backend-build.yaml` after the backend PostgreSQL CI tests pass. The same
immutable image must be used for the migration job and service. The production
migration command is **`node dist/migrate.js`** (not `npm run migrate`, which uses
`tsx` from dev dependencies). Migrations use a transaction and an advisory lock.

Before provisioning, confirm a real OIDC issuer/audience/JWKS configuration,
organization membership bootstrap, database region/connectivity, backups/PITR and
retention, runtime identities, and the frontend integration. The backend rejects
local demonstration authentication in Cloud Run. Do not bypass that check.

Suggested deployment sequence, with all placeholders resolved and reviewed:

1. Create the approved PostgreSQL database and least-privilege runtime and migration
   database users. Put their connection strings in separate Secret Manager secrets.
   Grant each Cloud Run identity access only to its own secret. Never commit URLs
   containing credentials or pass them in command-line `--set-env-vars`.
2. Configure the reviewed network path to PostgreSQL (for example Cloud SQL's
   supported socket/network connection). Verify both the service and job can use it.
   A database hostname alone does not establish network access. Set connection budget
   for the backend's pool of five connections per instance and the chosen max instances.
3. Create a Cloud Run migration job using the backend image digest, migration identity,
   secret-injected `DATABASE_URL`, command `node`, args `dist/migrate.js`, one task and
   no automatic retries. Execute it with `gcloud run jobs execute JOB --wait` and
   require success before deploying the application. Take/verify a recoverable backup
   before a destructive schema change. Do not automatically run the development seed.
4. Deploy a separate backend service with the same image digest, runtime identity,
   `deploy/backend.env.example.yaml` filled with non-secret values, secret-injected
   `DATABASE_URL`, and the reviewed ingress/auth settings. No command here enables
   public access or changes organization policies.
5. Bootstrap approved real identity subjects and memberships through a reviewed,
   audited procedure. Verify outsider rejection, role separation, immutable versions,
   independent approval and persistence across restarts using the actual identity.
6. Wire the dashboard only after acceptance checks pass. The currently deployed
   dashboard must not be described as using this backend until verified.

App rollback does not undo database migrations. Prefer backward-compatible additive
migrations, roll back app code first if compatible, and use a reviewed forward repair
or tested database restoration procedure for schema/data incidents. No database,
backup policy, real user membership or Microsoft tenant integration is provisioned
by this operations change.

The examples smoke target is `https://wetland-examples-mcp-462504004653.northamerica-northeast2.run.app`. It will fail until that service is deployed; adding a target is not proof of deployment.
