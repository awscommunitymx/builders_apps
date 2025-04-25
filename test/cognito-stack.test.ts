import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { CognitoStack } from '../lib/stacks/cognito';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

class TestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
}

describe('CognitoStack', () => {
  describe('Removal Policy', () => {
    it('should use RETAIN for production environment', () => {
      // ARRANGE
      const app = new cdk.App();
      const stack = new TestStack(app, 'TestStack');

      // Create mock certificate
      const certificate = certificatemanager.Certificate.fromCertificateArn(
        stack,
        'Certificate',
        'arn:aws:acm:us-east-1:123456789012:certificate/mock-certificate'
      );

      // Create mock hosted zone
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(stack, 'HostedZone', {
        hostedZoneId: 'Z1234567890',
        zoneName: 'example.com',
      });

      // ACT
      new CognitoStack(stack, 'CognitoStack', {
        environmentName: 'production',
        appDomain: 'app.example.com',
        authDomain: 'auth.example.com',
        certificate,
        hostedZone,
      });

      // ASSERT
      const template = Template.fromStack(stack);
      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    it('should use DESTROY for non-production environments', () => {
      // ARRANGE
      const app = new cdk.App();
      const stack = new TestStack(app, 'TestStack');

      // Create mock certificate
      const certificate = certificatemanager.Certificate.fromCertificateArn(
        stack,
        'Certificate',
        'arn:aws:acm:us-east-1:123456789012:certificate/mock-certificate'
      );

      // Create mock hosted zone
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(stack, 'HostedZone', {
        hostedZoneId: 'Z1234567890',
        zoneName: 'example.com',
      });

      // Test with 'dev' environment
      new CognitoStack(stack, 'CognitoStack', {
        environmentName: 'dev',
        appDomain: 'dev.example.com',
        authDomain: 'auth-dev.example.com',
        certificate,
        hostedZone,
      });

      // ASSERT
      const template = Template.fromStack(stack);
      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });

    it('should use DESTROY for staging environment', () => {
      // ARRANGE
      const app = new cdk.App();
      const stack = new TestStack(app, 'TestStack');

      // Create mock certificate
      const certificate = certificatemanager.Certificate.fromCertificateArn(
        stack,
        'Certificate',
        'arn:aws:acm:us-east-1:123456789012:certificate/mock-certificate'
      );

      // Create mock hosted zone
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(stack, 'HostedZone', {
        hostedZoneId: 'Z1234567890',
        zoneName: 'example.com',
      });

      // Test with 'staging' environment
      new CognitoStack(stack, 'CognitoStack', {
        environmentName: 'staging',
        appDomain: 'staging.example.com',
        authDomain: 'auth-staging.example.com',
        certificate,
        hostedZone,
      });

      // ASSERT
      const template = Template.fromStack(stack);
      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });
  });
});
