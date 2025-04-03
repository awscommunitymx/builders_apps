#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environmentName = app.node.tryGetContext('env') || 'dev';

const tags = {
  Environment: environmentName,
  Cdk: 'True',
};

for (const [key, value] of Object.entries(tags)) {
  cdk.Tags.of(app).add(key, value);
}

const backendStack = new BackendStack(app, `ProfilesStack-${environmentName}`, {
  environmentName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  description: `Profiles API stack - ${environmentName} environment`,
});

const frontendStack = new FrontendStack(app, `ProfilesStackFrontend-${environmentName}`, {
  apiUrl: backendStack.apiUrl,
  apiKey: backendStack.apiKey,
  environment: environmentName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
});
