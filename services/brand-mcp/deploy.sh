#!/bin/sh
set -eu
: "${PROJECT_ID:?Set PROJECT_ID explicitly}"
: "${REGION:?Set REGION explicitly}"
gcloud run deploy wateraid-brand-hub --project="$PROJECT_ID" --region="$REGION" --source=. --port=8080 --min-instances=0 --max-instances=3 --memory=256Mi --cpu=1
