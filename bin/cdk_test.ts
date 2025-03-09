#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environmentName = app.node.tryGetContext('env') || 'dev';

// Create the stack with environment-specific name
new AppStack(app, `ProfilesStack-${environmentName}`, {
  environmentName,
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: 'us-east-1'
  },
  description: `Profiles API stack - ${environmentName} environment`
});