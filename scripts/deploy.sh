#!/usr/bin/env bash
set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
DEFAULT_REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Help function
show_help() {
  echo -e "${CYAN}🚀 AWS CDK Deployment Script${NC}"
  echo -e "${YELLOW}================================${NC}"
  echo -e "Deploys AWS CDK stacks to different environments with automatic environment detection from Git branches."
  echo
  echo -e "${YELLOW}📖 Usage:${NC}"
  echo -e "  ${BLUE}npm run deploy [options]${NC}"
  echo -e "  ${BLUE}bash scripts/deploy.sh [options]${NC}"
  echo
  echo -e "${YELLOW}🔧 Quick Commands:${NC}"
  echo -e "  ${BLUE}npm run deploy${NC}              # Deploy based on current branch"
  echo -e "  ${BLUE}npm run deploy:destroy${NC}      # Destroy current environment"
  echo -e "  ${BLUE}npm run deploy:help${NC}         # Show this help message"
  echo
  echo -e "${YELLOW}🔧 Options:${NC}"
  echo -e "  ${BLUE}--env, -e${NC}        Environment name (staging, prod, or branch-based)"
  echo -e "  ${BLUE}--region, -r${NC}     AWS region (default: $DEFAULT_REGION)"
  echo -e "  ${BLUE}--destroy, -d${NC}    Destroy stack instead of deploying"
  echo -e "  ${BLUE}--allow-prod${NC}     Allow deployment to production environment"
  echo -e "  ${BLUE}--help, -h${NC}       Show this help message"
  echo
  echo -e "${YELLOW}🌿 Environment Detection:${NC}"
  echo -e "The script automatically detects the environment from your Git branch:"
  echo -e "  • ${BLUE}main/master${NC} → ${GREEN}prod${NC}"
  echo -e "  • ${BLUE}staging/develop${NC} → ${GREEN}staging${NC}"
  echo -e "  • ${BLUE}feature/*${NC} → ${GREEN}dev-feature-*${NC}"
  echo -e "  • ${BLUE}bugfix/*${NC} → ${GREEN}dev-bugfix-*${NC}"
  echo -e "  • ${BLUE}hotfix/*${NC} → ${GREEN}dev-hotfix-*${NC}"
  echo -e "  • ${BLUE}other branches${NC} → ${GREEN}dev-*${NC}"
  echo
  echo -e "${YELLOW}⚡ Features:${NC}"
  echo -e "  • Automatic environment detection from Git branches"
  echo -e "  • Hotswap deployments for faster updates in development"
  echo -e "  • Sample data population for development environments"
  echo -e "  • Production deployment safeguards"
  echo -e "  • Automatic frontend configuration"
  echo
  echo -e "${YELLOW}🔒 Security:${NC}"
  echo -e "  • Production deployments require explicit --allow-prod flag"
  echo -e "  • Development environments are isolated"
  echo -e "  • API keys are managed securely"
  echo
  echo -e "${YELLOW}📝 Examples:${NC}"
  echo -e "  ${BLUE}npm run deploy${NC}              # Deploy based on current branch"
  echo -e "  ${BLUE}npm run deploy:staging${NC}      # Deploy to staging"
  echo -e "  ${BLUE}npm run deploy:prod${NC}         # Deploy to production"
  echo -e "  ${BLUE}npm run deploy:destroy${NC}      # Destroy current environment"
  echo -e "  ${BLUE}npm run deploy --region eu-west-1${NC}  # Deploy to specific region"
  echo
  echo -e "${YELLOW}⚠️  Notes:${NC}"
  echo -e "  • Development environments get sample data on first deployment"
  echo -e "  • Production uses standard deployment (no hotswap)"
  echo -e "  • Frontend configuration is automatically updated"
  exit 0
}

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
    --help|-h)
      show_help
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $1${NC}"
      echo -e "Run ${BLUE}npm run deploy:help${NC} for usage information"
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
    # For feature branches, use sanitized branch name with dev prefix
    ENV="dev-${SANITIZED_BRANCH}"
  else
    # For other branches, use sanitized branch name with dev prefix
    ENV="dev-${SANITIZED_BRANCH}"
  fi
  
  echo -e "${CYAN}🌿 Detected environment from branch: ${BLUE}$ENV${NC}"
fi

# Check for production deployment flag
if [ "$ENV" = "prod" ] && [ -z "$ALLOW_PROD" ]; then
  echo -e "${RED}❌ Error: Production deployment requires --allow-prod flag${NC}"
  exit 1
fi

# Show help if no environment is specified
if [ -z "$ENV" ]; then
  echo -e "${YELLOW}📖 Usage: ./deploy.sh [options]${NC}"
  echo -e "${YELLOW}Options:${NC}"
  echo -e "  ${BLUE}--env, -e${NC}        Environment name (staging, prod, or branch-based)"
  echo -e "  ${BLUE}--region, -r${NC}     AWS region (default: $DEFAULT_REGION)"
  echo -e "  ${BLUE}--destroy, -d${NC}    Destroy stack instead of deploying"
  echo -e "  ${BLUE}--allow-prod${NC}     Allow deployment to production environment"
  exit 1
fi
REGION=${REGION:-$DEFAULT_REGION}

# Set CDK context values
CONTEXT_VALUES=(
  "--context env=${ENV}"
  "--context region=${REGION}"
)

# Prepare for deployment
# echo -e "${CYAN}🔨 Synthesizing stack for environment: ${BLUE}$ENV${NC} in region: ${BLUE}$REGION${NC}"
# npx cdk synth --quiet ${CONTEXT_VALUES[*]}

# Deploy or destroy based on flag
if [ "$DESTROY" == "true" ]; then
  echo -e "${RED}🗑️  Destroying stack for environment: ${BLUE}$ENV${NC} in region: ${BLUE}$REGION${NC}"
  npx cdk destroy --force ${CONTEXT_VALUES[*]} "ProfilesStack-${ENV}"
else
  echo -e "${CYAN}🚀 Deploying stack for environment: ${BLUE}$ENV${NC} in region: ${BLUE}$REGION${NC}"
  
  # Check if this is a first-time deployment by looking for the stack
  if ! aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" &>/dev/null; then
    echo -e "${YELLOW}✨ First-time deployment detected for environment: ${BLUE}$ENV${NC}"
    FIRST_TIME=true
  fi
  
  # Use hotswap for non-prod environments, but only for updates
  if [ "$ENV" != "prod" ] && [ "$FIRST_TIME" != true ]; then
    echo -e "${CYAN}⚡ Using hotswap deployment for faster updates...${NC}"
    DEPLOY_FLAGS="--hotswap-fallback --method=direct"
  else
    if [ "$ENV" = "prod" ]; then
      echo -e "${YELLOW}🛡️  Using standard deployment for production...${NC}"
    else
      echo -e "${YELLOW}🛡️  Using standard deployment for first-time deployment...${NC}"
    fi
    DEPLOY_FLAGS=""
  fi
  
  npx cdk deploy ${DEPLOY_FLAGS} --require-approval never ${CONTEXT_VALUES[*]} "ProfilesStack-${ENV}"
  
  # Get the API URL and key from CloudFormation exports
  API_URL=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?ExportName=='${ENV}-GraphQLApiUrl'].OutputValue" --output text)
  API_KEY=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?ExportName=='${ENV}-GraphQLApiKey'].OutputValue" --output text)
  
  # Create .env file in the frontend directory
  cat > frontend/.env << EOL
VITE_GRAPHQL_API_URL=${API_URL}
VITE_GRAPHQL_API_KEY=${API_KEY}
EOL
  
  echo -e "${GREEN}✅ Created frontend/.env file with API configuration${NC}"

  # Populate DynamoDB with sample data for development environments on first deployment
  if [[ "$ENV" =~ ^dev- ]] && [ "$FIRST_TIME" = true ]; then
    echo -e "${CYAN}📊 Populating DynamoDB with sample data for development environment...${NC}"
    TABLE_NAME=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?ExportName=='${ENV}-ProfilesTableName'].OutputValue" --output text)
    npm run populate-dynamodb -- --table=${TABLE_NAME}
    echo -e "${GREEN}✅ DynamoDB population completed${NC}"
  fi
fi

echo -e "${GREEN}🎉 Operation completed successfully!${NC}"