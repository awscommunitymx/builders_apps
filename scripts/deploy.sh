#!/usr/bin/env bash
set -e

# Needed for AWS CDK
mkdir -p frontend/dist

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
  echo -e "  ${BLUE}--env, -e${NC}        Environment name (staging, production, or branch-based)"
  echo -e "  ${BLUE}--region, -r${NC}     AWS region (default: $DEFAULT_REGION)"
  echo -e "  ${BLUE}--destroy, -d${NC}    Destroy stack instead of deploying"
  echo -e "  ${BLUE}--allow-prod${NC}     Allow deployment to production environment"
  echo -e "  ${BLUE}--deploy-frontend${NC} Also build and deploy frontend (default: false)"
  echo -e "  ${BLUE}--deploy-tv${NC}       Also build and deploy TV display (default: false)"
  echo -e "  ${BLUE}--deploy-csat${NC}     Also build and deploy CSAT QR display (default: false)"
  echo -e "  ${BLUE}--force-populate${NC} Force population of DynamoDB and creation of Cognito user"
  echo -e "  ${BLUE}--help, -h${NC}       Show this help message"
  echo
  echo -e "${YELLOW}🌿 Environment Detection:${NC}"
  echo -e "The script automatically detects the environment from your Git branch:"
  echo -e "  • ${BLUE}main/master${NC} → ${GREEN}production${NC}"
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
    --allow-prod)
      ALLOW_PROD=true
      shift
      ;;
    --deploy-frontend)
      DEPLOY_FRONTEND=true
      shift
      ;;
    --deploy-tv)
      DEPLOY_TV=true
      shift
      ;;
    --deploy-csat)
      DEPLOY_CSAT=true
      shift
      ;;
    --force-populate)
      FORCE_POPULATE=true
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
    ENV="production"
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
if [ "$ENV" = "production" ] && [ -z "$ALLOW_PROD" ]; then
  echo -e "${RED}❌ Error: Production deployment requires --allow-prod flag${NC}"
  exit 1
fi

# Show help if no environment is specified
if [ -z "$ENV" ]; then
  echo -e "${YELLOW}📖 Usage: ./deploy.sh [options]${NC}"
  echo -e "${YELLOW}Options:${NC}"
  echo -e "  ${BLUE}--env, -e${NC}        Environment name (staging, production, or branch-based)"
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

# Deploy or destroy based on flag
if [ "$DESTROY" == "true" ]; then
  echo -e "${RED}🗑️  Destroying stack for environment: ${BLUE}$ENV${NC} in region: ${BLUE}$REGION${NC}"
  npx cdk destroy --force ${CONTEXT_VALUES[*]} --all
else
  echo -e "${CYAN}🚀 Deploying stack for environment: ${BLUE}$ENV${NC} in region: ${BLUE}$REGION${NC}"
  
  # Check if this is a first-time deployment by looking for the stack
  if ! aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" &>/dev/null; then
    echo -e "${YELLOW}✨ First-time deployment detected for environment: ${BLUE}$ENV${NC}"
    FIRST_TIME=true
  fi
  
  # Use hotswap for non-prod environments, but only for updates
  if [ "$ENV" != "production" ] && [ "$ENV" != "staging" ] && [ "$FIRST_TIME" != true ]; then
    echo -e "${CYAN}⚡ Using hotswap deployment for faster updates...${NC}"
    DEPLOY_FLAGS="--hotswap-fallback --method=direct"
  else
    if [ "$ENV" = "production" ]; then
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
  USERPOOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?ExportName=='${ENV}-UserPoolClientId'].OutputValue" --output text)
  RUM_MONITOR_ID=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?OutputKey=='RumAppMonitorId'].OutputValue" --output text)
  RUM_APP_REGION=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?OutputKey=='RumAppRegion'].OutputValue" --output text)
  IDENTITY_POOL_ID=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?OutputKey=='IdentityPoolId'].OutputValue" --output text)
  GUEST_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?OutputKey=='GuestRoleArn'].OutputValue" --output text)
  USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
  USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
  AUTH_API_URL=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?OutputKey=='AuthApiUrl'].OutputValue" --output text)
  
  # Get Algolia keys from Secrets Manager
  ALGOLIA_APP_ID=$(aws secretsmanager get-secret-value --secret-id algolia/app_id --query SecretString --output text)
  ALGOLIA_SEARCH_KEY=$(aws secretsmanager get-secret-value --secret-id algolia/api_key --query SecretString --output text)
  
  # Create .env file in the frontend directory
  cat > frontend/.env << EOL
VITE_GRAPHQL_API_URL=${API_URL}
VITE_COGNITO_USER_POOL_CLIENT_ID=${USERPOOL_CLIENT_ID}
VITE_RUM_APP_MONITOR_ID=${RUM_MONITOR_ID}
VITE_RUM_APP_REGION=${RUM_APP_REGION}
VITE_IDENTITY_POOL_ID=${IDENTITY_POOL_ID}
VITE_GUEST_ROLE_ARN=${GUEST_ROLE_ARN}
VITE_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
VITE_USER_POOL_ID=${USER_POOL_ID}
VITE_AUTH_API_URL=${AUTH_API_URL}
VITE_ALGOLIA_APP_ID=${ALGOLIA_APP_ID}
VITE_ALGOLIA_SEARCH_KEY=${ALGOLIA_SEARCH_KEY}
VITE_ALGOLIA_INDEX_NAME=${ENV}_attendees
EOL
  
  echo -e "${GREEN}✅ Created frontend/.env file with API configuration${NC}"
  
  # Create .env file in the tv-display directory for TV UI
  # For AppSync realtime URL, convert the GraphQL URL to realtime format
  REALTIME_URL=$(echo "$API_URL" | sed 's|https://|wss://|' | sed 's|\.appsync-api\.|.appsync-realtime-api.|' | sed 's|/graphql|/graphql|')
  
  cat > tv-display/.env << EOL
VITE_GRAPHQL_API_URL=${API_URL}
VITE_GRAPHQL_API_KEY=${API_KEY}
VITE_GRAPHQL_REALTIME_URL=${REALTIME_URL}
EOL
  
  echo -e "${GREEN}✅ Created tv-display/.env file with GraphQL configuration${NC}"
  
  # Get the frontend URL for CSAT QR codes
  FRONTEND_URL=$(aws cloudformation describe-stacks --stack-name "ProfilesStackFrontend-${ENV}" --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text 2>/dev/null || echo "")
  
  # Create .env file in the csat-qr-display directory
  cat > csat-qr-display/.env << EOL
VITE_FRONTEND_URL=${FRONTEND_URL}
VITE_GRAPHQL_API_URL=${API_URL}
VITE_GRAPHQL_API_KEY=${API_KEY}
VITE_GRAPHQL_REALTIME_URL=${REALTIME_URL}
VITE_ENVIRONMENT=${ENV}
EOL
  
  echo -e "${GREEN}✅ Created csat-qr-display/.env file with frontend URL configuration${NC}"
  
  if [ "$DEPLOY_FRONTEND" = true ]; then
    echo -e "${CYAN}📦 Building and deploying frontend...${NC}"
    npm run frontend:build
    npx cdk deploy --require-approval never ${CONTEXT_VALUES[*]} "ProfilesStackFrontend-${ENV}"
    echo -e "${GREEN}✅ Frontend deployment completed${NC}"
  fi

  if [ "$DEPLOY_TV" = true ]; then
    echo -e "${CYAN}📺 Building TV display...${NC}"
    cd tv-display
    npm run build
    cd ..
    echo -e "${CYAN}📺 Deploying TV display...${NC}"
    npx cdk deploy --require-approval never ${CONTEXT_VALUES[*]} "ProfilesStackTvDisplay-${ENV}"
    echo -e "${GREEN}✅ TV display deployment completed${NC}"
  fi

  if [ "$DEPLOY_CSAT" = true ]; then
    echo -e "${CYAN}📊 Building CSAT QR display...${NC}"
    cd csat-qr-display
    npm install
    npm run build
    cd ..
    echo -e "${CYAN}📊 Deploying CSAT QR display...${NC}"
    npx cdk deploy --require-approval never ${CONTEXT_VALUES[*]} "ProfilesStackCsatQrDisplay-${ENV}"
    echo -e "${GREEN}✅ CSAT QR display deployment completed${NC}"
  fi

  if [[ "$ENV" =~ ^dev- ]] && { [ "$FIRST_TIME" = true ] || [ "$FORCE_POPULATE" = true ]; }; then
    # Populate DynamoDB with sample data for development environments
    echo -e "${CYAN}📊 Populating DynamoDB with sample data for development environment...${NC}"
    TABLE_NAME=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?ExportName=='${ENV}-ProfilesTableName'].OutputValue" --output text)
    npm run populate-dynamodb -- --table=${TABLE_NAME}
    echo -e "${GREEN}✅ DynamoDB population completed${NC}"

    # Create a sample user in Cognito for development environments
    echo -e "${CYAN}👤 Creating sample user in Cognito for development environment...${NC}"
    USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?ExportName=='${ENV}-UserPoolId'].OutputValue" --output text)
    USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?ExportName=='${ENV}-UserPoolClientId'].OutputValue" --output text)
    USER_POOL_DOMAIN=$(aws cloudformation describe-stacks --stack-name "ProfilesStack-${ENV}" --query "Stacks[0].Outputs[?ExportName=='${ENV}-UserPoolDomain'].OutputValue" --output text)
    SAMPLE_USER_EMAIL="test@app.awscommunity.mx" 
    SAMPLE_USER_PASSWORD="Test1234!"
    aws cognito-idp admin-create-user \
      --user-pool-id "${USER_POOL_ID}" \
      --username "${SAMPLE_USER_EMAIL}" \
      --temporary-password "${SAMPLE_USER_PASSWORD}" \
      --user-attributes Name=email,Value="${SAMPLE_USER_EMAIL}" Name=email_verified,Value=true \
      --message-action SUPPRESS >/dev/null 2>&1
    aws cognito-idp admin-set-user-password \
      --user-pool-id "${USER_POOL_ID}" \
      --username "${SAMPLE_USER_EMAIL}" \
      --password "${SAMPLE_USER_PASSWORD}" \
      --permanent
    echo -e "${GREEN}✅ Sample user created in Cognito${NC}"
    echo -e "${YELLOW}🔑 Sample user credentials: ${BLUE}${SAMPLE_USER_EMAIL}:${SAMPLE_USER_PASSWORD}${NC}"
  fi
fi

echo -e "${GREEN}🎉 Operation completed successfully!${NC}"