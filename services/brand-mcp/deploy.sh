#!/bin/sh
set -eu
: "${PROJECT_ID:?Set PROJECT_ID}"
: "${REGION:?Set REGION}"
: "${BUILD_SA:?Set separately authorized build service account email}"
: "${RUNTIME_SA:?Set brand runtime service account email}"
: "${PUBLIC_BASE_URL:?Set the existing brand service URL}"
cd "$(dirname "$0")/../.."
gcloud builds submit . --project="$PROJECT_ID" --region="$REGION" --config=deploy/mcp-cloudbuild.yaml --substitutions="_PACKAGE=brand-mcp,_SERVICE=wateraid-brand-hub,_REGION=$REGION,_BUILD_SA=$BUILD_SA,_RUNTIME_SA=$RUNTIME_SA,_PUBLIC_BASE_URL=$PUBLIC_BASE_URL"
