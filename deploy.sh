#!/bin/bash

PROJECT=${APPNAME}
BUCKET=${PROJECT}-artifacts
REGION=${REGION}
TEMPLATE_NAME=template

aws --region "${REGION}" s3 mb s3://"${BUCKET}"

sam package --region "${REGION}"  \
  --template-file ${TEMPLATE_NAME}.yaml \
  --output-template-file output.yaml \
  --s3-bucket "${BUCKET}"

## the actual deployment step
sam deploy --region "${REGION}" \
  --template-file output.yaml \
  --stack-name "${PROJECT}" \
  --capabilities CAPABILITY_IAM \

VERSION=$(node release.js)

sam publish \
    --template output.yaml \
    --region "${REGION}" \
    --semantic-version "${VERSION}"
