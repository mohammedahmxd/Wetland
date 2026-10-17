# Wetland MCP hub

A hub for reusable tools, versioned knowledge and community stewardship. This repository contains a working dashboard sandbox and a separately deployable authenticated control-plane foundation.

## Live sandbox
https://wetland-ai-workspace-462504004653.northamerica-northeast2.run.app/

The public site uses synthetic data and browser-local state. It is not an authenticated team service and does not currently expose an MCP endpoint. Never upload private records into the sandbox.

## Start here
- **dashboard/** — resource library, document editor, tool builder, comparison bench, releases, community and maintenance.
- **services/brand-mcp/** — existing public brand reference website and read-only MCP server, with assets, document guidance and protocol tests.
- **backend/** — Node 22 / TypeScript / Fastify / PostgreSQL; OIDC verification, organization scoping, immutable versions, server evaluations, independent approvals, concurrent activation protection, audit.
- **deploy/cloudbuild.yaml** — tests, build, image push and deployment of the public dashboard.
- **docs/ARCHITECTURE.md** — boundaries, scale assumptions, next production gates.
- **docs/DEPLOYMENT.md** — GitHub-to-GCP setup and deployment/rollback.
- **docs/HUB-API.md** — versioned document/tool control-plane API.

## Run locally
Dashboard:
```sh
cd dashboard
npm test
npm start
# http://localhost:8080
```

Backend:
```sh
cd backend
npm ci
docker compose up -d --wait db
export DATABASE_URL=postgres://wetland:local-development-only@localhost:55432/wetland
export AUTH_MODE=demo DEMO_AUTH_ENABLED=true
npm run migrate
npm run seed
npm run dev
```
Use a disposable database for tests. The backend deliberately rejects demo authentication in production/Cloud Run.

## Team workflow
Create a branch, make changes and open a pull request. CI checks the brand MCP, dashboard and PostgreSQL lifecycle. After merge to main, GitHub obtains a short-lived GCP credential and Cloud Build deploys the public sandbox. No service-account JSON key is stored in GitHub.

The backend is not automatically published. It needs an approved identity provider, a private PostgreSQL instance, organization memberships, managed secrets and operational review first.

## Brand
The supplied WaterAid research hub provides the visual reference:
https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/#agents
It is an independent reference, not official endorsement. Noto Sans is bundled under its SIL OFL licence in dashboard/public/assets/OFL.txt.

The separate brand MCP endpoint is https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/mcp. Its source and local setup are in [services/brand-mcp](services/brand-mcp/README.md). The dashboard deployment workflow does not redeploy this service.
