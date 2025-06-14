#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { TvDisplayStack } from '../lib/tv-display-stack';
import { CsatQrDisplayStack } from '../lib/csat-qr-display-stack';
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
  'arn:aws:acm:us-east-1:662722197286:certificate/052de1f6-775c-4f54-86dd-d7775bd45cd7';
const hostedZoneId = 'Z07406072VIH8HAEJ7AJX';
const hostedZoneName = 'console.awscommunity.mx';
const eventbriteApiKeySecretArn =
  'arn:aws:secretsmanager:us-east-1:662722197286:secret:eventbrite/api_key-U2D38z';
const algoliaAppIdSecretArn =
  'arn:aws:secretsmanager:us-east-1:662722197286:secret:algolia/app_id-kesk9o';
const algoliaApiKeySecretArn =
  'arn:aws:secretsmanager:us-east-1:662722197286:secret:algolia/api_key-4ccgmn';

const frontendDomain =
  environmentName == 'production'
    ? `mx-central-1.${hostedZoneName}`
    : `mx-central-1-${environmentName}.${hostedZoneName}`;

const tvDisplayDomain =
  environmentName === 'production'
    ? `tv.${hostedZoneName}`
    : `tv-${environmentName}.${hostedZoneName}`;

const csatQrDisplayDomain =
  environmentName === 'production'
    ? `csat.${hostedZoneName}`
    : `csat-${environmentName}.${hostedZoneName}`;

const backendDomain =
  environmentName === 'production'
    ? `api.${hostedZoneName}`
    : `api-${environmentName}.${hostedZoneName}`;

const { authDomain } = generateAuthDomain(environmentName, hostedZoneName);

const authApiDomain =
  environmentName === 'production'
    ? `auth-api.${hostedZoneName}`
    : `auth-api-${environmentName}.${hostedZoneName}`;

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
  authApiDomain: authApiDomain,
  webhookDomain: webhookDomain,
  eventbriteApiKeySecretArn: eventbriteApiKeySecretArn,
  algoliaApiKeySecretArn: algoliaApiKeySecretArn,
  algoliaAppIdSecretArn: algoliaAppIdSecretArn,
  frontendDomain: frontendDomain,
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
  hostedZoneId: hostedZoneId,
  hostedZoneName: hostedZoneName,
  domainName: frontendDomain,
});

// Only create TV display stack if dist folder exists (i.e., when deploying TV)
const tvDisplayDistPath = './tv-display/dist';
if (require('fs').existsSync(tvDisplayDistPath)) {
  const tvDisplayStack = new TvDisplayStack(app, `ProfilesStackTvDisplay-${environmentName}`, {
    apiUrl: backendStack.apiUrl,
    apiKey: backendStack.apiKey,
    environment: environmentName,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'us-east-1',
    },
    certificateArn: certificateArn,
    hostedZoneId: hostedZoneId,
    hostedZoneName: hostedZoneName,
    domainName: tvDisplayDomain,
  });
}

// Only create CSAT QR display stack if dist folder exists (i.e., when deploying CSAT)
const csatQrDisplayDistPath = './csat-qr-display/dist';
if (require('fs').existsSync(csatQrDisplayDistPath)) {
  const csatQrDisplayStack = new CsatQrDisplayStack(app, `ProfilesStackCsatQrDisplay-${environmentName}`, {
    apiUrl: backendStack.apiUrl,
    apiKey: backendStack.apiKey,
    environment: environmentName,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'us-east-1',
    },
    certificateArn: certificateArn,
    hostedZoneId: hostedZoneId,
    hostedZoneName: hostedZoneName,
    domainName: csatQrDisplayDomain,
  });
}
