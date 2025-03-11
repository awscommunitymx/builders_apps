#!/bin/bash

set -e

SSO_START_URL="https://awscommunitymx.awsapps.com/start/#"
SSO_REGION="us-east-1"
SSO_ACCOUNT_ID="869935068073"
SSO_ROLE_NAME="DeveloperAccess"
DEFAULT_REGION="us-east-1"

npm i -g aws-cdk
npm install
mkdir -p ~/.aws

update_aws_config() {
    cat > ~/.aws/config << EOF
[default]
region = ${DEFAULT_REGION}
sso_session = AWS-SSO

[profile sso-role]
sso_session = AWS-SSO
sso_account_id = ${SSO_ACCOUNT_ID}
sso_role_name = ${SSO_ROLE_NAME}
region = ${DEFAULT_REGION}

[sso-session AWS-SSO]
sso_start_url = ${SSO_START_URL}
sso_region = ${SSO_REGION}
sso_registration_scopes = sso:account:access
EOF
    
    echo "AWS config file has been updated!"
}

update_aws_config

update_shell_profile() {
    local shell_profile="$1"
    
    if ! grep -q "AWS CLI SSO configuration" "$shell_profile" 2>/dev/null; then
        cat >> "$shell_profile" << EOF

# AWS CLI SSO configuration
export AWS_PROFILE=sso-role

# Helper function to login to AWS SSO
aws_sso_login() {
    echo "Logging in to AWS SSO..."
    aws sso login
}

# Add alias for quick login
alias awslogin='aws_sso_login'
EOF
    fi
}

for profile_path in ~/.bashrc ~/.zshrc; do
    if [ -f "$profile_path" ]; then
        update_shell_profile "$profile_path"
        echo "Updated $profile_path with AWS SSO configuration"
    fi
done

echo -e "\n\033[1;32mAWS SSO Configuration Complete!\033[0m"
echo -e "\nTo use AWS SSO:"
echo "1. Run 'aws sso login' or 'awslogin' to authenticate"
echo "2. Your default profile is now set to use SSO"
echo "3. You can run AWS CLI commands without specifying a profile"
echo -e "\nExample: aws sts get-caller-identity\n"

read -p "Do you want to login to AWS SSO now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    aws sso login
fi