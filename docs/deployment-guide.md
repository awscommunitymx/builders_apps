# Deployment Script Documentation

## Overview

The deploy.sh script is a critical part of our deployment workflow, automating the process of deploying AWS CDK stacks to different environments. It provides a standardized approach to deployments across development, staging, and production environments, with intelligent environment detection based on Git branch names.

## Features

- **Automatic Environment Detection**: Determines the deployment environment from Git branch names
- **Environment Segregation**: Maintains separation between development, staging, and production
- **Branch-Based PR Environments**: Creates isolated environments for feature branches
- **Production Safeguards**: Prevents accidental production deployments
- **Standardized Deployments**: Ensures consistent deployment practices across the team
- **Stack Lifecycle Management**: Supports both deployment and destruction of stacks

## Usage

### Basic Usage

```bash
./deploy.sh
```

When run without arguments, the script will detect the environment from your current Git branch and deploy accordingly.

### Command-line Arguments

```bash
./deploy.sh [options]
```

| Option            | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| `--env`, `-e`     | Explicitly specify environment name (staging, prod, custom) |
| `--region`, `-r`  | Specify AWS region (default: us-east-1)                     |
| `--destroy`, `-d` | Destroy stack instead of deploying                          |
| `--allow-prod`    | Required flag to allow production deployments               |

### Examples

#### Deploy to current branch's environment

```bash
./deploy.sh
```

#### Deploy to staging explicitly

```bash
./deploy.sh --env staging
```

#### Deploy to production (with safety flag)

```bash
./deploy.sh --env prod --allow-prod
```

#### Deploy to a custom environment

```bash
./deploy.sh --env custom-env
```

#### Destroy a feature branch environment

```bash
./deploy.sh --env pr-feature-123 --destroy
```

#### Deploy to a specific region

```bash
./deploy.sh --region eu-west-1
```

## Environment Detection Logic

The script uses the following rules to determine the deployment environment from Git branch names:

| Branch Pattern                      | Environment                  |
| ----------------------------------- | ---------------------------- |
| `main`, `master`                    | `prod`                       |
| `staging`, `develop`                | `staging`                    |
| `feature/*`, `bugfix/*`, `hotfix/*` | `pr-{sanitized-branch-name}` |
| Other branches                      | `pr-{sanitized-branch-name}` |

### Branch Name Sanitization

The script sanitizes branch names for use as environment names by:

1. Converting to lowercase
2. Replacing special characters with dashes
3. Prefixing with `pr-`

Examples:

- `feature/#42_add-auth` → `pr-feature-42-add-auth`
- `bugfix/ISSUE-123_fix-login` → `pr-bugfix-issue-123-fix-login`

## Stack Naming Convention

The script deploys to stacks with the naming pattern:

```
ProfilesStack-{environment}
```

For example:

- `ProfilesStack-prod`
- `ProfilesStack-staging`
- `ProfilesStack-pr-feature-42-add-auth`

## How It Works

1. **Environment Detection**:

   - If `--env` is provided, use that value
   - Otherwise, determine environment from Git branch name

2. **Safety Checks**:

   - For production deployments, verify the `--allow-prod` flag is present
   - Validate that the environment name is valid

3. **Deployment Process**:
   - Set context values for the CDK deployment
   - Synthesize the CloudFormation template
   - Deploy using CDK with the appropriate environment variables
   - Output confirmation message upon completion

## Production Safeguards

To prevent accidental deployments to production:

1. Production deployments require the explicit `--allow-prod` flag
2. The script will abort with an error if attempting to deploy to production without this flag
3. Environment is clearly displayed in console output before deployment begins

## Integration with CI/CD

This script is designed to work within automated CI/CD pipelines:

1. **GitHub Actions**: Used in our workflows to automate deployments
2. **PR Previews**: Creates temporary environments for pull requests
3. **Branch Deployments**: Automatically maps Git branches to environments

## Troubleshooting

### Common Issues

1. **Permission Errors**:

   - Ensure the script has execute permissions: `chmod +x deploy.sh`
   - Verify AWS credentials are properly configured

2. **Environment Detection Failure**:

   - If not in a Git repository, provide explicit environment: `--env dev`
   - Check that your branch name follows naming conventions

3. **Deployment Failures**:
   - Check CloudFormation logs in AWS Console
   - Verify AWS credentials have sufficient permissions

### Getting Help

For further assistance with deployment issues:

- Check AWS CloudFormation logs
- Review CDK documentation
- Contact the DevOps team

## Best Practices

1. **Local Testing**: Always test deployments locally before pushing to shared branches
2. **Clean Up**: Destroy PR environments when no longer needed
3. **Use Feature Branches**: Follow branch naming conventions for consistent environments
4. **Monitor Deployments**: Watch for errors during the deployment process
5. **Review Changes**: Use `cdk diff` to verify changes before deployment
