# AWS Community Day App Ecosystem

This repository contains a collection of applications and infrastructure code for Mexico's AWS Community Day. We're building an integrated app ecosystem that automates badge creation, provides real-time agenda updates, enables digital networking, streamlines sponsor lead capture, and tracks session attendance—all while collecting valuable data for Community Days organizers.

## Project Overview

This project implements a user profiles management system for AWS Community Builders. It features:

- **GraphQL API**: Built with AWS AppSync.
- **Serverless Backend**: Using AWS Lambda and DynamoDB
- **Modern Frontend**: React-based UI using Cloudscape Design System
- **Observability**: Integrated with AWS X-Ray, CloudWatch Metrics, and Powertools
- **Infrastructure as Code**: Fully defined using AWS CDK with TypeScript
- **Multi-Environment Support**: Automated environment management for development, staging, and production

The system allows event organizers to:

- View and manage user profiles
- Track profile access and interactions
- Maintain profile data securely in DynamoDB
- Access the system through a modern, responsive web interface

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- Docker
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd builders_apps
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

## Development Workflow

### Branch Naming Convention

We follow a strict branch naming convention that integrates with our deployment pipeline. For detailed information, please refer to our [Branch Naming Guide](docs/branch-naming-guide.md).

Example branch names:

- `feature/#42_add-user-profile`
- `bugfix/#17_fix-authentication`
- `hotfix/#23_security-vulnerability`

### Deployment

Our deployment process is automated and environment-aware. For detailed information about deployments, please refer to our [Deployment Guide](docs/deployment-guide.md).

Quick deployment commands:

```bash
npm run deploy              # Deploy based on current branch
npm run deploy:destroy      # Destroy current environment
npm run deploy:help        # Show detailed help message
```

### Development workflow

Once you create a new branch, you can start developing your changes.

Use the deployment script to deploy your changes to a development environment specifically created for your branch.

```bash
npm run deploy
```

This deployment script will create a new environment in AWS, deploy the necessary resources, and make the new environment available at a URL, as well as configuring your local frontend to point to the new environment.

A `.env` file will be generated in the frontend directory with the correct environment variables for your new environment.

## Available Commands

### Development

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npm run test` - Run unit tests
- `npm run lint` - Run code linting

### Deployment Commands

- `npm run deploy` - Deploy based on current branch
- `npm run deploy:destroy` - Destroy current environment
- `npm run deploy:help` - Show deployment help message

## Project Structure

```plaintext
.
├── bin/                    # CDK app entry point
├── lib/                    # CDK stack definitions
├── test/                   # Test files
├── docs/                   # Documentation
├── scripts/                # Deployment and utility scripts
├── frontend/               # React frontend
├── generated/              # Generated GraphQL code
├── lambda/                 # Lambda functions
├── vtl/                    # VTL templates for AppSync resolvers
├── schema.graphql          # GraphQL schema
└── cdk.json                # CDK configuration
```

## Contributing

1. Create a new branch following our [branch naming convention](docs/branch-naming-guide.md)
2. Make your changes
3. Submit a pull request
4. Ensure CI checks pass
5. Get approval from maintainers

## Environment Management

The project supports multiple environments:

- Production (`main` branch)
- Staging (`staging` branch)
- Development (feature branches)

Each environment is isolated and managed through our deployment pipeline.

## Support

For issues and questions:

1. Check existing documentation in the `docs/` directory
2. Create an issue in the repository
3. Contact the maintainers

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.
