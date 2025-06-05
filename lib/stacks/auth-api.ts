import { Construct } from 'constructs';
import { StackProps, Stack, Duration } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration, Cors, MethodLoggingLevel } from 'aws-cdk-lib/aws-apigateway';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';

interface AuthApiStackProps extends StackProps {
  shortIdAuthFunction: LambdaFunction;
  sessionPostFunction: LambdaFunction;
  sessionDeleteFunction: LambdaFunction;
  userTable: Table;
  userPool: UserPool;
}

export class AuthApiStack extends Construct {
  public readonly api: RestApi;

  constructor(scope: Construct, id: string, props: AuthApiStackProps) {
    super(scope, id);

    const { shortIdAuthFunction, sessionPostFunction, sessionDeleteFunction } = props;

    // Create REST API
    this.api = new RestApi(this, 'AuthApi', {
      restApiName: 'Auth API',
      description: 'Authentication API for AWS Community Builders',
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'Cookie',
        ],
      },
    });

    // Create Lambda integration
    const shortIdAuthIntegration = new LambdaIntegration(shortIdAuthFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      timeout: Duration.seconds(29),
    });

    // Create auth resource and method
    const authResource = this.api.root.addResource('auth');
    const shortIdResource = authResource.addResource('short-id');

    shortIdResource.addMethod('POST', shortIdAuthIntegration, {
      operationName: 'AuthenticateWithShortId',
    });

    // Create session management endpoints
    const sessionResource = this.api.root.addResource('session');

    // Create Lambda integrations for session management
    const sessionPostIntegration = new LambdaIntegration(sessionPostFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      timeout: Duration.seconds(29),
    });

    const sessionDeleteIntegration = new LambdaIntegration(sessionDeleteFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      timeout: Duration.seconds(29),
    });

    // Add session POST endpoint
    sessionResource.addMethod('POST', sessionPostIntegration, {
      operationName: 'CreateSession',
    });

    // Add session DELETE endpoint
    sessionResource.addMethod('DELETE', sessionDeleteIntegration, {
      operationName: 'DeleteSession',
    });

    new cdk.CfnOutput(this, 'AuthApiUrl', {
      value: this.api.url,
      description: 'The URL of the Auth API',
      exportName: `${cdk.Stack.of(this).stackName}-AuthApiUrl`,
    });
  }
}
