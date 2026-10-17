# Deployment

## Current target
- GCP project: wateraid-flow (462504004653)
- Region: northamerica-northeast2
- Public dashboard service: wetland-ai-workspace
- Image repository: northamerica-northeast2-docker.pkg.dev/wateraid-flow/web
- Runtime identity: wetland-workspace@wateraid-flow.iam.gserviceaccount.com (no project roles added)
- Build identity: wateraid-build@wateraid-flow.iam.gserviceaccount.com

## Keyless GitHub trust
Pool: wetland-github; provider: wetland-repo.
Only repository ID 1423378932, owner ID 141581805, and refs/heads/main satisfy the provider condition.
GitHub impersonates wetland-github-deploy@wateraid-flow.iam.gserviceaccount.com.
That identity can submit builds, write staging objects, and act as the designated build identity. The builder can update the existing workspace service and act as its runtime identity. No service-account key is required.

Only trusted maintainers should merge changes to main: this branch can submit deployments. Protect main with required review and CI in repository settings. Repository admin approval is needed to establish protection; do not assume this file enforces it.

## Workflow
Pull requests run frontend domain tests, TypeScript compilation and integration tests against disposable PostgreSQL.
A main-branch push runs those checks and then submits deploy/cloudbuild.yaml. A workflow_dispatch on main uses the same process. Build IDs produce unique image tags. The pipeline preserves the existing public access setting and never exposes the backend.

Manual deploy from repository root:
```sh
gcloud builds submit . --project=wateraid-flow --region=northamerica-northeast2 --config=deploy/cloudbuild.yaml
```

## Rollback
List service revisions and choose the last known working one:
```sh
gcloud run revisions list --service=wetland-ai-workspace --project=wateraid-flow --region=northamerica-northeast2
gcloud run services update-traffic wetland-ai-workspace --to-revisions=VERIFIED_REVISION=100 --project=wateraid-flow --region=northamerica-northeast2
```
Record the chosen revision and reason. Existing browser-local user records are not rolled back by a service rollback.

## Backend
Do not deploy with AUTH_MODE=demo. Configure DATABASE_URL through a managed secret and OIDC_ISSUER/OIDC_AUDIENCE/OIDC_JWKS_URL for the selected provider. Use a private database connection and separate migration job, then provision organization membership with verified identity subjects. The backend image fails closed without required authentication configuration.

## Verification status
Local browser checks and frontend/backend tests are recorded in the pull request. Cloud Build can be verified independently by manual submission. GitHub OIDC execution must be verified after the workflow reaches main; trust configuration alone does not prove an Actions deployment.
