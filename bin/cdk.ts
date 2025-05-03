#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { generateAuthDomain } from '../utils/cognito';

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
const prodApexCertificateArn =
  'arn:aws:acm:us-east-1:662722197286:certificate/1f086f3c-c4cd-42f4-819d-97f9f5f3324e';
const hostedZoneId = 'Z04372592S8OKUNJDGG8O';
const hostedZoneName = 'app.awscommunity.mx';
const eventbriteApiKeySecretArn =
  'arn:aws:secretsmanager:us-east-1:662722197286:secret:eventbrite/api_key-U2D38z';

const frontendDomain =
  environmentName == 'production' ? hostedZoneName : `${environmentName}.${hostedZoneName}`;

const backendDomain =
  environmentName === 'production'
    ? `api.${hostedZoneName}`
    : `api-${environmentName}.${hostedZoneName}`;

const { authDomain } = generateAuthDomain(environmentName, hostedZoneName);

const webhookDomain =
  environmentName === 'production'
    ? `webhook.${hostedZoneName}`
    : `webhook-${environmentName}.${hostedZoneName}`;

const backendStack = new BackendStack(app, `ProfilesStack-${environmentName}`, {
  environmentName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  description: `Profiles API stack - ${environmentName} environment`,
  certificateArn: certificateArn,
  hostedZoneId: hostedZoneId,
  hostedZoneName: hostedZoneName,
  domainName: backendDomain,
  appDomain: frontendDomain,
  authDomain: authDomain,
  webhookDomain: webhookDomain,
  eventbriteApiKeySecretArn: eventbriteApiKeySecretArn,
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
  prodApexCertificateArn: environmentName === 'production' ? prodApexCertificateArn : undefined,
  hostedZoneId: hostedZoneId,
  hostedZoneName: hostedZoneName,
  domainName: frontendDomain,
});
