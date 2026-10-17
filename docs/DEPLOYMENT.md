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

## Source bucket permission repair

GitHub Actions run [39072148111](https://github.com/mohammedahmxd/Wetland/actions/runs/39072148111) passed verification and authenticated successfully, then failed before build submission because `wateraid-flow_cloudbuild` was inaccessible. The generic error suggested `serviceusage.services.use`, but the deployment identity already had `roles/serviceusage.serviceUsageConsumer`. Its bucket-level `roles/storage.objectUser` binding permits source-object uploads but does not include `storage.buckets.get`, which the source-staging bucket check needs.

An administrator can add the missing bucket-metadata access on this bucket only. This command preserves existing IAM bindings:

```sh
gcloud storage buckets add-iam-policy-binding gs://wateraid-flow_cloudbuild \
  --member=serviceAccount:wetland-github-deploy@wateraid-flow.iam.gserviceaccount.com \
  --role=roles/storage.legacyBucketReader \
  --account=stephen@blacktydemusic.com
```

Keep the existing `roles/storage.objectUser` binding. Do not grant project-wide Storage Admin or broaden GitHub's workload-identity trust to repair this error. The submitter must also retain `roles/cloudbuild.builds.editor` and `roles/serviceusage.serviceUsageConsumer` on the project, plus `roles/iam.serviceAccountUser` on `wateraid-build@wateraid-flow.iam.gserviceaccount.com`.

Verify the bucket binding without deploying:

```sh
gcloud storage buckets get-iam-policy gs://wateraid-flow_cloudbuild \
  --account=stephen@blacktydemusic.com
gcloud iam service-accounts get-iam-policy \
  wateraid-build@wateraid-flow.iam.gserviceaccount.com \
  --project=wateraid-flow --account=stephen@blacktydemusic.com
```

IAM inspection verifies the grants, not a successful end-to-end deployment. Re-running the failed main workflow deploys its original commit; do that only when that revision is intended for release. Otherwise, verify the next reviewed main release through its Actions run and resulting Cloud Build/Cloud Run revision. A manual submission under an administrator's credentials does not prove GitHub's deployment identity works.

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
