#!/bin/bash

export APPNAME=lambda-flame
PROJECT=${APPNAME}
BUCKET=${PROJECT}-artifacts
REGION=ap-southeast-1
TEMPLATE_NAME=template
PROFILE=default

aws --profile "${PROFILE}" --region "${REGION}" s3 mb s3://"${BUCKET}"

sam package --profile "${PROFILE}" --region "${REGION}"  \
  --template-file ${TEMPLATE_NAME}.yaml \
  --output-template-file output.yaml \
  --s3-bucket "${BUCKET}"

## the actual deployment step
sam deploy --profile "${PROFILE}" --region "${REGION}" \
  --template-file output.yaml \
  --stack-name "${PROJECT}" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
  Environment="${ENV}" \
  Version=1.0.0

sam publish \
    --template output.yaml \
    --region "${REGION}"
