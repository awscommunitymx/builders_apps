#!/usr/bin/env bash
set -e

# Default values
DEFAULT_REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env|-e)
      ENV="$2"
      shift 2
      ;;
    --region|-r)
      REGION="$2"
      shift 2
      ;;
    --destroy|-d)
      DESTROY=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# If no environment specified, detect from git branch
if [ -z "$ENV" ]; then
  BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
  
  # Sanitize branch name for use as environment name
  # Convert to lowercase, replace special chars with dashes
  SANITIZED_BRANCH=$(echo "$BRANCH_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')
  
  # Handle special branch names
  if [ "$BRANCH_NAME" = "main" ] || [ "$BRANCH_NAME" = "master" ]; then
    ENV="prod"
  elif [ "$BRANCH_NAME" = "staging" ] || [ "$BRANCH_NAME" = "develop" ]; then
    ENV="staging"
  elif [[ "$BRANCH_NAME" =~ ^(feature|bugfix|hotfix)/ ]]; then
    # For feature branches, use sanitized branch name
    ENV="pr-${SANITIZED_BRANCH}"
  else
    # For other branches, use sanitized branch name
    ENV="pr-${SANITIZED_BRANCH}"
  fi
  
  echo "Detected environment from branch: $ENV"
fi

# Use provided region or default
REGION=${REGION:-$DEFAULT_REGION}

# Set CDK context values
CONTEXT_VALUES=(
  "--context env=${ENV}"
  "--context region=${REGION}"
)

# Prepare for deployment
echo "Synthesizing stack for environment: $ENV in region: $REGION"
npx cdk synth ${CONTEXT_VALUES[*]}

# Deploy or destroy based on flag
if [ "$DESTROY" == "true" ]; then
  echo "Destroying stack for environment: $ENV in region: $REGION"
  npx cdk destroy --force ${CONTEXT_VALUES[*]} "ProfilesStack-${ENV}"
else
  echo "Deploying stack for environment: $ENV in region: $REGION"
  npx cdk deploy --require-approval never ${CONTEXT_VALUES[*]} "ProfilesStack-${ENV}"
fi

echo "Operation completed successfully!"