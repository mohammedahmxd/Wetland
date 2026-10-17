# WaterAid Flow backend — first working slice

Local development foundation for Wetland. Node 22, TypeScript, Fastify and PostgreSQL. No cloud database or public API has been deployed by this change.

## What works

Staff requests → named tool stewardship → immutable candidates → server-run evaluations → independent approval → activation and rollback. Organisation membership is checked on every API request; resource lookups are scoped to that organisation. Contributors cannot read private staff requests or execute tools. Only the assigned maintainer or backup can evaluate and activate. Approval requires a passing current suite for the exact candidate. Transactional audit records accompany successful writes. Concurrent activations use row locking and an expected-active-version check.

The bundled `kijana-report-v1` implementation calculates indicators from submitted synthetic records. It normalises status labels, uses the latest observation on or before a cutoff, flags conflicting latest statuses and unknown IDs, and retains missing points in the denominator. It returns a draft; release approval does not approve an individual report. No LLM is called and no arbitrary contributor code is executed.

## Run locally

From `backend/`, using Node 22 and Docker:

```sh
npm ci
docker compose up -d --wait db
export DATABASE_URL=postgres://wetland:local-development-only@localhost:55432/wetland
export AUTH_MODE=demo DEMO_AUTH_ENABLED=true
npm run migrate
npm run seed
PORT=8081 npm run dev
```

Local demo binds to loopback only. Use bearer values `demo-staff`, `demo-contributor`, `demo-maintainer`, `demo-backup`, or `demo-approver`. They are deliberately public development identities, not production credentials. The demo organization is `00000000-0000-4000-8000-000000000001`. Demo authentication refuses to start under `NODE_ENV=production`, Cloud Run or AWS execution environments. Seeding is explicitly development-only.

```sh
DATABASE_URL=postgres://wetland:local-development-only@localhost:55432/wetland npm test
npm run build
```

Tests use unique organizations in the specified database, leave their audit records in place, and verify authentication, isolation, roles, failed evaluations, mismatched evidence, immutable records, concurrent activation, rollback and metric handling. Use a disposable local database. Stop it with `docker compose stop` when finished.

## Frontend contract

All routes below start with `/api/orgs/{orgId}` and require `Authorization: Bearer <token>`. JSON requests use `Content-Type: application/json`. UUIDs and ISO dates are validated. Collections return arrays capped at 100; audit uses `?after=<last-event-id>` for forward pagination. Current responses use database snake_case for persisted records and camelCase for computed reporting/activation output.

| Method and route | Caller | Body or result |
| --- | --- | --- |
| GET `/me` | Member | Organization, subject, role |
| POST `/requests` | Staff / maintainer | `title`, `problem`, `acceptanceCriteria` |
| GET `/requests` | Staff / maintainer / approver | Staff request list |
| POST `/tools` | Maintainer | `requestId`, `name`, `sponsor`, `maintainer`, `backupMaintainer`, `reviewDate` |
| GET `/tools` | Member | Tool list |
| GET `/tools/{id}` | Member | Tool, versions, deployment history |
| POST `/tools/{id}/versions` | Contributor / maintainer | `implementation: "kijana-report-v1"`, `releaseLabel`, `configuration: {includePartialAsFunctional: false}` |
| POST `/versions/{id}/evaluate` | Assigned maintainer / backup | Runs bundled suite; no submitted score accepted |
| GET `/versions/{id}/evaluations` | Member | Evaluation results |
| POST `/versions/{id}/approve` | Approver | `evaluationId`, `rationale` |
| POST `/tools/{id}/activate` | Assigned maintainer / backup | `versionId`, `expectedActiveVersionId` (null initially), `reason` |
| POST `/tools/{id}/run` | Staff / maintainer / approver | `cutoff`, `points`, `visits` |
| GET `/audit?after=0` | Maintainer / approver | Audit history |

Owner fields are identity-provider subject IDs, not free-form display names. All must be organization members; maintainer and backup must be different people with maintainer roles. Membership administration is not exposed in this first slice.

Example report body:

```json
{"cutoff":"2026-06-30","points":["point-a","point-b"],"visits":[{"pointId":"point-a","date":"2026-06-01","status":"Functional"},{"pointId":"point-b","date":"2026-06-01","status":"Partially functional"}]}
```

Expected fully functional indicator: 50%. The deliberately bad configuration `includePartialAsFunctional: true` fails the evaluation and cannot be approved. A new release label creates a new candidate; it must earn its own evaluation and approval. Rollback uses the activation endpoint to select an older approved version, retaining history.

Errors: 400 invalid input, 401 invalid authentication, 403 membership/role restriction, 404 scoped resource missing, 409 unmet lifecycle prerequisite or stale activation, 500 generic server error. Client input is never used as SQL structure.

## Deploy after the hackathon

The Dockerfile builds a non-root production container for Cloud Run or ECS. Configure `DATABASE_URL`, `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL` through managed secrets/configuration. The provider must issue an API access token matching the configured issuer and audience. RS256/ES256 signatures, expiry and subject are verified. Roles come from database memberships, not caller-supplied headers or arbitrary token roles.

Run compiled migrations as a separate controlled job: `node dist/migrate.js`. Configure organization/member records using the approved identity subjects. Do not run the demo seed in production. Use a private PostgreSQL connection and separate migration/runtime database identities. Never disable TLS verification to connect to a hosted database. API origins should be same-origin through the frontend proxy; cross-origin CORS is not enabled by default.

Hosting target already created: GCP project `wateraid-flow`, Toronto `northamerica-northeast2`. The brand reference hub is independent of this API.

## Deliberate boundaries and next increments

This is a tested prototype, not a production-readiness claim. Audit immutability is enforced by triggers but is not tamper-proof against database administrators. Isolation is enforced in application queries; add PostgreSQL row-level security as defence in depth before multi-organisation production use. The demo uses the database owner; production must use least-privilege runtime grants. Approval is organization-level; risk-tier-specific approval policies are still to be implemented.

The implementation ID must change whenever reporting code changes. The current digest covers the implementation ID, release label and configuration; it does not yet attest to a container image or Git commit. Bind future releases to immutable image digests and signed GitHub checks before accepting externally developed tools. The bundled four-check evaluator is a small demonstration and does not establish full programme accuracy.

Next: GitHub App/webhook signature verification and deduplication; durable jobs with retries; immutable release/image manifests; issue triage and incident controls; review/retirement scheduling; real OIDC and membership provisioning; backups/restore, budgets, rate limits and monitoring; source-linked AI drafts with model/prompt provenance. No real donor or participant data, case-pack PDFs, organiser guide, secrets or copyrighted font binaries are bundled.
