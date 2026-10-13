#!/usr/bin/env bash
set -e

STACK_NAME="${1:-book-library-core-dev}"
ENVIRONMENT="${2:-dev}"
REGION="${AWS_REGION:-us-east-1}"

echo "=========================================================="
echo "  🚀 Iniciando Deploy: Digital Book Library Core Infra"
echo "  Stack:       $STACK_NAME"
echo "  Ambiente:    $ENVIRONMENT"
echo "  Região:      $REGION"
echo "=========================================================="

# Validar template antes do deploy
echo "Validando template core-infra.yaml..."
aws cloudformation validate-template \
  --template-body file://infra/core-infra.yaml \
  --region "$REGION" > /dev/null

echo "Executando deploy da Stack CloudFormation..."
aws cloudformation deploy \
  --template-file infra/core-infra.yaml \
  --stack-name "$STACK_NAME" \
  --parameter-overrides Environment="$ENVIRONMENT" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region "$REGION"

echo ""
echo "=========================================================="
echo "  ✅ Deploy da Infraestrutura concluído com sucesso!"
echo "=========================================================="
echo "Recursos criados:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
  --output table
