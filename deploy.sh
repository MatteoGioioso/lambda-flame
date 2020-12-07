#!/bin/bash

export PROJECT=${APPNAME}
export BUCKET=${PROJECT}-artifacts
export REGION=${REGION}
export TEMPLATE_NAME=template
export GITHUB_TOKEN=${GITHUB_TOKEN}
export ENV=${ENV}

echo environment "$ENV"
echo region "$REGION"

set -e
set -u
set -o pipefail

sam package --region "${REGION}"  \
  --template-file ${TEMPLATE_NAME}.yaml \
  --output-template-file output.yaml \
  --s3-bucket "${BUCKET}"

## the actual deployment step
sam deploy --region "${REGION}" \
  --template-file output.yaml \
  --stack-name "${PROJECT}" \
  --capabilities CAPABILITY_IAM \

node release.js
VERSION=$(cat version)
echo "next version: $VERSION"

sam publish \
    --template output.yaml \
    --region "${REGION}" \
    --semantic-version "${VERSION}"
