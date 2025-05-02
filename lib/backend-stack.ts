import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseStack } from './stacks/database';
import { ApiStack } from './stacks/api';
import { LambdaStack } from './stacks/lambda';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { CognitoStack } from './stacks/cognito';
import * as rum from 'aws-cdk-lib/aws-rum';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface AppStackProps extends cdk.StackProps {
  environmentName: string;
  certificateArn: string;
  hostedZoneId: string;
  hostedZoneName: string;
  domainName: string;
  appDomain: string;
  authDomain: string;
}

export class BackendStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly apiKey: string;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly userPoolDomain: string;
  public readonly identityPoolId: string;
  public readonly userCreationQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const domainCert = certificatemanager.Certificate.fromCertificateArn(
      this,
      'domainCert',
      props.certificateArn
    );

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    });

    const databaseStack = new DatabaseStack(this, 'DatabaseStack', {
      environmentName: props.environmentName,
    });

    const lambdaStack = new LambdaStack(this, 'LambdaStack', {
      environmentName: props.environmentName,
      table: databaseStack.table,
    });

    // Create Cognito Stack for authentication
    const cognitoStack = new CognitoStack(this, 'CognitoStack', {
      environmentName: props.environmentName,
      appDomain: props.appDomain,
      authDomain: props.authDomain,
      certificate: domainCert,
      hostedZone: hostedZone,
    });

    const apiStack = new ApiStack(this, 'ApiStack', {
      environmentName: props.environmentName,
      table: databaseStack.table,
      graphQLResolver: lambdaStack.graphQLResolver,
      certificate: domainCert,
      hostedZone: hostedZone,
      domainName: props.domainName,
      userPool: cognitoStack.userPool,
    });

    // Add permissions for authenticated users to access API operations
    cognitoStack.authenticatedRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['appsync:GraphQL'],
        resources: [`${apiStack.api.arn}/types/Query/*`, `${apiStack.api.arn}/types/Mutation/*`],
      })
    );

    const rumApp = new rum.CfnAppMonitor(this, 'RumAppMonitor', {
      name: `profiles-rum-${props.environmentName}`,
      domainList: [props.appDomain, 'localhost'],
      appMonitorConfiguration: {
        allowCookies: true,
        enableXRay: true,
        sessionSampleRate: 1,
        telemetries: ['errors', 'performance', 'http'],
        guestRoleArn: cognitoStack.unauthenticatedRole.roleArn,
        identityPoolId: cognitoStack.identityPool.ref,
      },
    });

    cognitoStack.unauthenticatedRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['rum:PutRumEvents'],
        resources: [
          cdk.Arn.format({
            service: 'rum',
            resource: 'appmonitor',
            resourceName: `${rumApp.name}`,
            region: cdk.Stack.of(this).region,
            account: cdk.Stack.of(this).account,
            partition: cdk.Aws.PARTITION,
          }),
        ],
      })
    );

    this.userCreationQueue = new sqs.Queue(this, 'UserCreationQueue', {
      queueName: `user-creation-queue-${props.environmentName}`,
      visibilityTimeout: cdk.Duration.minutes(30),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'UserCreationDLQ', {
          queueName: `user-creation-dlq-${props.environmentName}`,
          visibilityTimeout: cdk.Duration.minutes(30),
          retentionPeriod: cdk.Duration.days(1),
        }),
        maxReceiveCount: 3,
      },
    });

    // Expose API URL and Key
    this.apiUrl = apiStack.api.graphqlUrl;
    this.apiKey = apiStack.api.apiKey || '';

    // Expose Cognito information
    this.userPoolId = cognitoStack.userPool.userPoolId;
    this.userPoolClientId = cognitoStack.userPoolClient.userPoolClientId;
    this.userPoolDomain = cognitoStack.userPoolDomain.domainName;
    this.identityPoolId = cognitoStack.identityPool.ref;

    // Output values
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'GraphQL API URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: this.userPoolDomain,
      description: 'Cognito User Pool Domain',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPoolId,
      description: 'Cognito Identity Pool ID',
    });

    new cdk.CfnOutput(this, 'RumAppMonitorId', {
      value: rumApp.attrId,
      description: 'CloudWatch RUM App Monitor ID',
    });

    new cdk.CfnOutput(this, 'RumAppRegion', {
      value: cdk.Stack.of(this).region,
      description: 'CloudWatch RUM App Monitor Region',
    });

    new cdk.CfnOutput(this, 'GuestRoleArn', {
      value: cognitoStack.unauthenticatedRole.roleArn,
      description: 'Cognito Guest Role ARN',
    });

    new cdk.CfnOutput(this, 'UserCreationQueueUrl', {
      value: this.userCreationQueue.queueUrl,
      description: 'URL of the User Creation SQS Queue',
    });
  }
}
