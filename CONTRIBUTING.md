# Contributing Guide

Welcome to the project! This guide will help you understand how to contribute effectively to our codebase. We appreciate your interest in making our project better and look forward to your contributions.

## Table of Contents

- Getting Started
- Development Environment Setup
- Contribution Workflow
- Branch Naming Convention
- Code Style
- Testing
- Deployment
- Pull Request Process
- Additional Resources

## Getting Started

Before you begin contributing, please ensure you:

1. Have a GitHub account
2. Have read our Branch Naming Guide
3. Have read our Deployment Guide for understanding how our environments work
4. Are familiar with AWS CDK, TypeScript, and GraphQL

## Development Environment Setup

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- AWS CLI configured with appropriate credentials
- Git

### Initial Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/builders_apps.git
   cd builders_apps
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure AWS SSO (if using the devcontainer setup):

   ```bash
   ./.devcontainer/configure-aws-sso.sh
   ```

4. Set up your development environment variables (as needed for local development)

### Using Development Container

We provide a devcontainer configuration for consistent development environments:

1. Install VS Code and the Remote Containers extension
2. Open the project folder in VS Code
3. When prompted, click "Reopen in Container"
4. The container will build and set up all necessary tools

## Branch Naming Convention

We follow a strict branch naming convention that integrates with our deployment pipeline. Please refer to our detailed [Branch naming guide](docs/branch-naming-guide.md) for the complete specifications.

In summary, all branches should follow this format:

```
<type>/<issue-number>_<short-description>
```

For example:

```
feature/#42_add-user-authentication
bugfix/#17_fix-login-error
```

This naming convention is critical as it determines the deployment environment and helps with traceability of changes.

## Code Style

We use ESLint and Prettier to maintain consistent code style across the project:

1. **TypeScript**: Follow TypeScript best practices with strict type checking.
2. **Formatting**: Use Prettier for code formatting.

   ```bash
   npm run format
   ```

3. **Linting**: Ensure your code passes all ESLint rules.

   ```bash
   npm run lint
   ```

Our VS Code settings already include configurations for these tools, so if you're using VS Code, formatting should happen automatically on save.

## Deployment

Our project uses AWS CDK for infrastructure deployment. The `deploy.sh` script handles deploying to different environments based on branch names.

Please refer to our detailed [Deployment Guide](docs/deployment-guide.md) for the complete specifications.

Key points:

- Development environments are automatically created based on branch names
- Production deployments require explicit approval
- Always test in a development environment before merging to main branches

Example deployment command:

```bash
./deploy.sh
```

## Pull Request Process

1. **Create a Pull Request**: From your branch to the appropriate target branch (usually `develop`).

2. **PR Description**: Include a clear description of the changes, reference the issue number, and explain how to test the changes.

3. **Code Review**: Address all feedback from code reviews promptly.

4. **Continuous Integration**: Ensure all CI checks pass.

5. **Approval**: PRs require at least one approval from a team member.

6. **Merge**: Once approved and all checks pass, your PR can be merged.

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [GraphQL Documentation](https://graphql.org/learn/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [AWS AppSync Documentation](https://docs.aws.amazon.com/appsync/latest/devguide/welcome.html)
