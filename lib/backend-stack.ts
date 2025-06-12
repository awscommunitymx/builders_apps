import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseStack } from './stacks/database';
import { ApiStack } from './stacks/api';
import { LambdaStack } from './stacks/lambda';
import { AgendaFetcherStack } from './stacks/agenda-fetcher';
import { AuthApiStack } from './stacks/auth-api';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { CognitoStack } from './stacks/cognito';
import * as rum from 'aws-cdk-lib/aws-rum';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as kms from 'aws-cdk-lib/aws-kms';
import { UserStepFunctionStack } from './stacks/user-step-function';
import { CheckinQueues } from './stacks/checkin-queues';

export interface AppStackProps extends cdk.StackProps {
  environmentName: string;
  certificateArn: string;
  hostedZoneId: string;
  hostedZoneName: string;
  domainName: string;
  appDomain: string;
  authDomain: string;
  authApiDomain: string;
  webhookDomain: string;
  eventbriteApiKeySecretArn: string;
  algoliaApiKeySecretArn: string;
  algoliaAppIdSecretArn: string;
  frontendDomain: string;
}

export class BackendStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly apiKey: string;
  public readonly authApiUrl: string;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly identityPoolId: string;
  public readonly userCreationQueue: sqs.Queue;
  public readonly mainCheckinQueue: sqs.Queue;
  public readonly secondaryCheckinQueue: sqs.Queue;

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

    const sessionsBucket = new s3.Bucket(this, 'AgendaBucket', {
      bucketName: `${props.environmentName.toLowerCase()}-agenda-json`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,        // for dev/test
      autoDeleteObjects: true,                        // for dev/test
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Create KMS key for encryption
    const encryptionKey = new kms.Key(this, 'EncryptionKey', {
      description: `Encryption key for magic link tokens - ${props.environmentName}`,
      enableKeyRotation: true,
    });

    // Create Cognito Stack for authentication first
    const cognitoStack = new CognitoStack(this, 'CognitoStack', {
      environmentName: props.environmentName,
      appDomain: props.appDomain,
      authDomain: props.authDomain,
      certificate: domainCert,
      hostedZone: hostedZone,
      groups: [
        'Attendees',
        'Sponsors',
        'CheckInVolunteerMain1',
        'CheckInVolunteerMain2',
        'CheckInVolunteerMain3',
        'CheckInVolunteerMain4',
        'CheckInVolunteerSecondary',
      ],
      table: databaseStack.table,
      kmsKey: encryptionKey,
    });

    const checkinQueues = new CheckinQueues(this, 'CheckinQueues', {
      environmentName: props.environmentName,
    });

    const lambdaStack = new LambdaStack(this, 'LambdaStack', {
      environmentName: props.environmentName,
      table: databaseStack.table,
      sessionsBucket,
      userPool: cognitoStack.userPool,
      baseUrl: props.appDomain,
      sesFromAddress: 'noreply@awscommunity.mx',
      kmsKey: encryptionKey,
      frontendDomain: props.frontendDomain,
      labelPrinterQueue: checkinQueues.mainQueue,
      secondaryQueue: checkinQueues.secondaryQueue,
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

    new AgendaFetcherStack(this, 'AgendaFetcherStack', {
      environmentName: props.environmentName,
      table: databaseStack.table,
      graphqlApi: apiStack.api,
      sessionsBucket
    });

    // Create Authentication API Stack
    const authApiStack = new AuthApiStack(this, 'AuthApiStack', {
      shortIdAuthFunction: lambdaStack.shortIdAuthFunction,
      sessionPostFunction: lambdaStack.sessionPostFunction,
      sessionDeleteFunction: lambdaStack.sessionDeleteFunction,
      sessionListFunction: lambdaStack.sessionListFunction,
      getUserByShortIdFunction: lambdaStack.getUserByShortIdFunction,
      userTable: databaseStack.table,
      userPool: cognitoStack.userPool,
      certificate: domainCert,
      hostedZone: hostedZone,
      domainName: props.authApiDomain,
      frontendDomain: props.frontendDomain,
    });

    this.authApiUrl =
      props.authApiDomain && domainCert && hostedZone
        ? `https://${props.authApiDomain}`
        : authApiStack.api.url;


    // Add permissions for authenticated users to access API operations
    cognitoStack.authenticatedRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['appsync:GraphQL'],
        resources: [`${apiStack.api.arn}/types/Query/*`, `${apiStack.api.arn}/types/Mutation/*`, `${apiStack.api.arn}/types/Subscription/*`],
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

    new UserStepFunctionStack(this, 'UserStepFunctionStack', {
      environmentName: props.environmentName,
      userPool: cognitoStack.userPool,
      dynamoTable: databaseStack.table,
      webhookDomain: props.webhookDomain,
      hostedZone: hostedZone,
      certificate: domainCert,
      eventbriteApiKeySecretArn: props.eventbriteApiKeySecretArn,
      algoliaApiKeySecretArn: props.algoliaApiKeySecretArn,
      algoliaAppIdSecretArn: props.algoliaAppIdSecretArn,
      twilioMessageSender: lambdaStack.twilioMessageSender,
    });

    this.mainCheckinQueue = checkinQueues.mainQueue;
    this.secondaryCheckinQueue = checkinQueues.secondaryQueue;

    // Expose API URL and Key
    this.apiUrl = apiStack.api.graphqlUrl;
    this.apiKey = apiStack.api.apiKey || '';
    // this.authApiUrl = authApiStack.api.url;

    // Expose Cognito information
    this.userPoolId = cognitoStack.userPool.userPoolId;
    this.userPoolClientId = cognitoStack.userPoolClient.userPoolClientId;
    this.identityPoolId = cognitoStack.identityPool.ref;

    // Output values
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'GraphQL API URL',
    });

    new cdk.CfnOutput(this, 'AuthApiUrl', {
      value: this.authApiUrl,
      description: 'Authentication REST API URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClientId,
      description: 'Cognito User Pool Client ID',
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

    new cdk.CfnOutput(this, 'MainCheckinQueueUrl', {
      value: this.mainCheckinQueue.queueUrl,
      description: 'URL of the Main Check-in FIFO Queue',
    });

    new cdk.CfnOutput(this, 'SecondaryCheckinQueueUrl', {
      value: this.secondaryCheckinQueue.queueUrl,
      description: 'URL of the Secondary Check-in FIFO Queue',
    });
  }
}
