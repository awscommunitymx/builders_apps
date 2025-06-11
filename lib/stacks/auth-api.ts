import { Construct } from 'constructs';
import { StackProps, Stack, Duration } from 'aws-cdk-lib';
import {
  RestApi,
  LambdaIntegration,
  Cors,
  MethodLoggingLevel,
  DomainName,
  BasePathMapping,
} from 'aws-cdk-lib/aws-apigateway';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Certificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IHostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayDomain } from 'aws-cdk-lib/aws-route53-targets';
import * as cdk from 'aws-cdk-lib';

interface AuthApiStackProps extends StackProps {
  shortIdAuthFunction: LambdaFunction;
  sessionPostFunction: LambdaFunction;
  sessionDeleteFunction: LambdaFunction;
  sessionListFunction: LambdaFunction;
  getUserByShortIdFunction: LambdaFunction;
  userTable: Table;
  userPool: UserPool;
  certificate?: ICertificate;
  hostedZone?: IHostedZone;
  domainName?: string;
  frontendDomain: string;
}

export class AuthApiStack extends Construct {
  public readonly api: RestApi;
  public readonly domainName?: DomainName;

  constructor(scope: Construct, id: string, props: AuthApiStackProps) {
    super(scope, id);

    const {
      shortIdAuthFunction,
      sessionPostFunction,
      sessionDeleteFunction,
      sessionListFunction,
      getUserByShortIdFunction,
      certificate,
      hostedZone,
      domainName,
    } = props;

    // Create REST API
    this.api = new RestApi(this, 'AuthApi', {
      restApiName: `AuthApi-${cdk.Stack.of(this).stackName}`,
      description: 'Authentication API for AWS Community Builders',
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'https://agenda.awscommunity.mx',
          `https://${props.frontendDomain}`,
          'https://galaticquiz-mx.caylent.dev',
        ],
        allowMethods: Cors.ALL_METHODS,
        allowCredentials: true,
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

    const sessionListIntegration = new LambdaIntegration(sessionListFunction, {
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

    // Add session GET endpoint (list favorite sessions)
    sessionResource.addMethod('GET', sessionListIntegration, {
      operationName: 'ListFavoriteSessions',
    });

    // Create user info endpoint
    const userResource = this.api.root.addResource('user');
    const shortIdUserResource = userResource.addResource('{shortId}');

    // Create Lambda integration for getting user by short ID
    const getUserByShortIdIntegration = new LambdaIntegration(getUserByShortIdFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      timeout: Duration.seconds(29),
    });

    // Add GET endpoint for user info by short ID
    shortIdUserResource.addMethod('GET', getUserByShortIdIntegration, {
      operationName: 'GetUserByShortId',
    });

    // Configure custom domain if provided
    if (certificate && hostedZone && domainName) {
      this.domainName = new DomainName(this, 'AuthApiDomain', {
        domainName: domainName,
        certificate: certificate,
      });

      // Create base path mapping
      new BasePathMapping(this, 'AuthApiBasePathMapping', {
        domainName: this.domainName,
        restApi: this.api,
        basePath: '',
      });

      // Create Route53 record
      new ARecord(this, 'AuthApiAliasRecord', {
        zone: hostedZone,
        recordName: domainName,
        target: RecordTarget.fromAlias(new ApiGatewayDomain(this.domainName)),
      });
    }

    new cdk.CfnOutput(this, 'AuthApiUrl', {
      value: domainName && certificate && hostedZone ? `https://${domainName}` : this.api.url,
      description: 'The URL of the Auth API',
      exportName: `${cdk.Stack.of(this).stackName}-AuthApiUrl`,
    });
  }
}
