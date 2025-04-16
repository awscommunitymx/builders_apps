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

const certificateArn =
  'arn:aws:acm:us-east-1:662722197286:certificate/ac873602-b70d-45c6-abe2-1b1357499c31';

const hostedZoneId = 'Z04372592S8OKUNJDGG8O';

const hostedZoneName = 'app.awscommunity.mx';

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
  certificateArn: certificateArn,
  hostedZoneName: hostedZoneName,
  hostedZoneId: hostedZoneId,
});
