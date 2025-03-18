# Deployment Script Documentation

## Overview

The deployment script (`scripts/deploy.sh`) is a critical part of our deployment workflow, automating the process of deploying AWS CDK stacks to different environments. It provides a standardized approach to deployments across development, staging, and production environments, with intelligent environment detection based on Git branch names.

## Features

- **Automatic Environment Detection**: Determines the deployment environment from Git branch names
- **Environment Segregation**: Maintains separation between development, staging, and production
- **Branch-Based Development Environments**: Creates isolated environments for feature branches
- **Production Safeguards**: Prevents accidental production deployments
- **Standardized Deployments**: Ensures consistent deployment practices across the team
- **Stack Lifecycle Management**: Supports both deployment and destruction of stacks

## Usage

### Basic Usage

```bash
npm run deploy
```

When run without arguments, the script will detect the environment from your current Git branch and deploy accordingly.

### Quick Commands

```bash
npm run deploy              # Deploy based on current branch
npm run deploy:destroy      # Destroy current environment
npm run deploy:help        # Show detailed help message
```

### Command-line Arguments

```bash
npm run deploy [options]
```

| Option            | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| `--env`, `-e`     | Explicitly specify environment name (staging, prod, custom) |
| `--region`, `-r`  | Specify AWS region (default: us-east-1)                     |
| `--destroy`, `-d` | Destroy stack instead of deploying                          |
| `--allow-prod`    | Required flag to allow production deployments               |
| `--help`, `-h`    | Show detailed help message                                  |

### Examples

#### Deploy to current branch's environment

```bash
npm run deploy
```

#### Deploy to staging explicitly

```bash
npm run deploy -- --env staging
```

#### Deploy to production (with safety flag)

```bash
npm run deploy -- --env prod --allow-prod
```

#### Deploy to a custom environment

```bash
npm run deploy -- --env custom-env
```

#### Destroy a development environment

```bash
npm run deploy:destroy
```

#### Deploy to a specific region

```bash
npm run deploy -- --region eu-west-1
```

#### Get help

```bash
npm run deploy:help
```

## Environment Detection Logic

The script uses the following rules to determine the deployment environment from Git branch names:

| Branch Pattern                      | Environment                   |
| ----------------------------------- | ----------------------------- |
| `main`, `master`                    | `prod`                        |
| `staging`, `develop`                | `staging`                     |
| `feature/*`, `bugfix/*`, `hotfix/*` | `dev-{sanitized-branch-name}` |
| Other branches                      | `dev-{sanitized-branch-name}` |

### Branch Name Sanitization

The script sanitizes branch names for use as environment names by:

1. Converting to lowercase
2. Replacing special characters with dashes
3. Prefixing with `dev-`

Examples:

- `feature/#42_add-auth` → `dev-feature-42-add-auth`
- `bugfix/ISSUE-123_fix-login` → `dev-bugfix-issue-123-fix-login`

## Stack Naming Convention

The script deploys to stacks with the naming pattern:

```
ProfilesStack-{environment}
```

For example:

- `ProfilesStack-prod`
- `ProfilesStack-staging`
- `ProfilesStack-dev-feature-42-add-auth`

## How It Works

1. **Environment Detection**:

   - If `--env` is provided, use that value
   - Otherwise, determine environment from Git branch name

2. **Safety Checks**:

   - For production deployments, verify the `--allow-prod` flag is present
   - Validate that the environment name is valid

3. **Deployment Process**:
   - Set context values for the CDK deployment
   - Deploy using CDK with the appropriate environment variables
   - For first-time deployments, use standard deployment
   - For subsequent updates in development, use hotswap for faster iterations
   - Production always uses standard deployment
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

   - Ensure AWS credentials are properly configured
   - Verify AWS CLI is installed and configured

2. **Environment Detection Failure**:

   - If not in a Git repository, provide explicit environment: `--env dev`
   - Check that your branch name follows naming conventions

3. **Deployment Failures**:
   - Check CloudFormation logs in AWS Console
   - Verify AWS credentials have sufficient permissions

### Getting Help

For further assistance with deployment issues:

- Run `npm run deploy:help` for detailed usage information
- Check AWS CloudFormation logs
- Review CDK documentation
- Contact the DevOps team

## Best Practices

1. **Local Testing**: Always test deployments locally before pushing to shared branches
2. **Clean Up**: Destroy development environments when no longer needed
3. **Use Feature Branches**: Follow branch naming conventions for consistent environments
4. **Monitor Deployments**: Watch for errors during the deployment process
5. **Review Changes**: Use `cdk diff` to verify changes before deployment
