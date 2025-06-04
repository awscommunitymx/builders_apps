import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as path from 'path';
import * as lambdaUrl from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ses from 'aws-cdk-lib/aws-ses';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { truncateLambdaName } from '../../utils/lambda';

const TWILIO_MESSAGING_SERVICE_SID = 'MGdfbfa02e47fe0e9a0eb32e5a59b48c90';
const TWILIO_CONTENT_SID = 'HX04e190778b8ae34d3bfea52d2aea1d0a';

interface LambdaStackProps {
  environmentName: string;
  table: dynamodb.Table;
  userPool?: cognito.UserPool;
  baseUrl?: string;
  sesFromAddress?: string;
  kmsKey?: kms.Key;
}

export class LambdaStack extends Construct {
  public readonly graphQLResolver: NodejsFunction;
  public readonly eventbriteWebhookHandler: NodejsFunction;
  public readonly twilioMessageSender: PythonFunction;
  public readonly shortIdAuthFunction: NodejsFunction;
  public readonly defineAuthChallengeFunction: NodejsFunction;
  public readonly createAuthChallengeFunction: NodejsFunction;
  public readonly verifyAuthChallengeFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id);

    // Create the Lambda function for graphql resolver
    this.graphQLResolver = new NodejsFunction(this, 'GraphQLResolver', {
      functionName: truncateLambdaName('GraphQLResolver', props.environmentName),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/graphql-resolver/index.ts'),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environmentName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'graphql-resolver',
        POWERTOOLS_METRICS_NAMESPACE: 'Profiles',
        LOG_LEVEL: this.getLogLevel(props.environmentName),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'true',
        POWERTOOLS_TRACER_CAPTURE_ERROR: 'true',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      },
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: [
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/metrics',
          'aws-xray-sdk',
        ],
      },
    });

    // Grant additional permissions for CloudWatch Metrics
    this.graphQLResolver.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Grant the Lambda function access to DynamoDB
    props.table.grantReadWriteData(this.graphQLResolver);

    // Create the Lambda function for eventbriteWebhookHandler
    this.eventbriteWebhookHandler = new NodejsFunction(this, 'EventbriteWebhookHandler', {
      functionName: truncateLambdaName('EventbriteWebhook', props.environmentName),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/eventbrite-webhook/src/handler.ts'),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environmentName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'eventbrite-webhook-service',
        POWERTOOLS_METRICS_NAMESPACE: 'EventbriteWebhook',
        LOG_LEVEL: this.getLogLevel(props.environmentName),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'true',
        POWERTOOLS_TRACER_CAPTURE_ERROR: 'true',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      },
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: [
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/metrics',
          '@aws-sdk/client-secrets-manager',
          '@aws-sdk/client-sqs',
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/lib-dynamodb',
          '@middy/core',
          'axios',
          'crypto',
          'aws-xray-sdk',
        ],
      },
    });

    // Grant additional permissions for CloudWatch Metrics
    this.eventbriteWebhookHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Grant the Lambda function access to DynamoDB
    props.table.grantReadWriteData(this.eventbriteWebhookHandler);

    // Add Function URL

    this.eventbriteWebhookHandler.addFunctionUrl({
      authType: lambdaUrl.FunctionUrlAuthType.NONE,
    });

    // Create the Python Lambda function for Twilio message sender
    this.twilioMessageSender = new PythonFunction(this, 'TwilioMessageSender', {
      functionName: truncateLambdaName('TwilioMessageSender', props.environmentName),
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_handler',
      entry: path.join(__dirname, '../../lambda/twilio-message-sender'),
      environment: {
        S3_BUCKET_NAME: 'qrcodes-cdmx25-us-east-1',
        TWILIO_SECRET_NAME: `twilio-credentials`,
        TWILIO_MESSAGING_SERVICE_SID: TWILIO_MESSAGING_SERVICE_SID,
        TWILIO_CONTENT_SID: TWILIO_CONTENT_SID,
        ENVIRONMENT: props.environmentName,
        WELCOME_MESSAGE_TABLE_NAME: 'welcome_message',
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      bundling: {
        assetExcludes: ['.git', '.gitignore', '__pycache__', '*.pyc'],
      },
    });

    // Grant S3 permissions to Twilio Lambda for the existing bucket
    this.twilioMessageSender.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
        resources: ['arn:aws:s3:::qrcodes-cdmx25-us-east-1/*'],
      })
    );

    // Grant Secrets Manager permissions
    this.twilioMessageSender.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:twilio-credentials*`,
        ],
      })
    );

    // Grant DynamoDB permissions for the welcome_message table (managed outside CDK)
    this.twilioMessageSender.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [
          `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/welcome_message`,
          `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/welcome_message/*`,
        ],
      })
    );

    // Add Function URL for Twilio Lambda
    this.twilioMessageSender.addFunctionUrl({
      authType: lambdaUrl.FunctionUrlAuthType.NONE,
    });

    // Create the Lambda function for short_id authentication
    this.shortIdAuthFunction = new NodejsFunction(this, 'ShortIdAuthFunction', {
      functionName: truncateLambdaName('ShortIdAuth', props.environmentName),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/magic-link/shortIdAuth.ts'),
      environment: {
        TABLE_NAME: props.table.tableName,
        USER_POOL_ID: props.userPool?.userPoolId || '',
        BASE_URL: props.baseUrl || '',
        SES_FROM_ADDRESS: props.sesFromAddress || '',
        TWILIO_SECRET_NAME: 'twilio-credentials',
        TWILIO_MESSAGING_SERVICE_SID: TWILIO_MESSAGING_SERVICE_SID,
        KMS_KEY_ID: props.kmsKey?.keyId || '',
        ENVIRONMENT: props.environmentName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'short-id-auth',
        POWERTOOLS_METRICS_NAMESPACE: 'Authentication',
        LOG_LEVEL: this.getLogLevel(props.environmentName),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'true',
        POWERTOOLS_TRACER_CAPTURE_ERROR: 'true',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      },
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: [
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/metrics',
          'twilio',
        ],
      },
    });

    // Grant additional permissions for CloudWatch Metrics
    this.shortIdAuthFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Grant the Lambda function access to DynamoDB
    props.table.grantReadData(this.shortIdAuthFunction);
    props.table.grantWriteData(this.shortIdAuthFunction);

    // Grant Cognito permissions for updating user attributes
    if (props.userPool) {
      this.shortIdAuthFunction.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['cognito-idp:AdminUpdateUserAttributes', 'cognito-idp:AdminGetUser'],
          resources: [props.userPool.userPoolArn],
        })
      );
    }

    // Grant SES permissions for sending emails
    this.shortIdAuthFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail', 'sesv2:SendEmail'],
        resources: ['*'],
      })
    );

    // Grant Secrets Manager permissions for Twilio credentials
    this.shortIdAuthFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [`arn:aws:secretsmanager:*:*:secret:twilio-credentials*`],
      })
    );

    // Grant KMS permissions for encryption/decryption
    if (props.kmsKey) {
      props.kmsKey.grantEncryptDecrypt(this.shortIdAuthFunction);
    }

    // Create Cognito custom auth challenge Lambda functions
    this.defineAuthChallengeFunction = new NodejsFunction(this, 'DefineAuthChallengeFunction', {
      functionName: truncateLambdaName('DefineAuthChallenge', props.environmentName),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/auth-challenge/defineAuthChallenge.ts'),
      environment: {
        ENVIRONMENT: props.environmentName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'define-auth-challenge',
        POWERTOOLS_METRICS_NAMESPACE: 'Authentication',
        LOG_LEVEL: this.getLogLevel(props.environmentName),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'true',
        POWERTOOLS_TRACER_CAPTURE_ERROR: 'true',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      },
      timeout: cdk.Duration.seconds(10),
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: [
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/metrics',
        ],
      },
    });

    this.createAuthChallengeFunction = new NodejsFunction(this, 'CreateAuthChallengeFunction', {
      functionName: truncateLambdaName('CreateAuthChallenge', props.environmentName),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/auth-challenge/createAuthChallenge.ts'),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environmentName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'create-auth-challenge',
        POWERTOOLS_METRICS_NAMESPACE: 'Authentication',
        LOG_LEVEL: this.getLogLevel(props.environmentName),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'true',
        POWERTOOLS_TRACER_CAPTURE_ERROR: 'true',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      },
      timeout: cdk.Duration.seconds(10),
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: [
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/metrics',
        ],
      },
    });

    this.verifyAuthChallengeFunction = new NodejsFunction(this, 'VerifyAuthChallengeFunction', {
      functionName: truncateLambdaName('VerifyAuthChallenge', props.environmentName),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/auth-challenge/verifyAuthChallenge.ts'),
      environment: {
        KMS_KEY_ID: props.kmsKey?.keyId || '',
        ENVIRONMENT: props.environmentName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'verify-auth-challenge',
        POWERTOOLS_METRICS_NAMESPACE: 'Authentication',
        LOG_LEVEL: this.getLogLevel(props.environmentName),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'true',
        POWERTOOLS_TRACER_CAPTURE_ERROR: 'true',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      },
      timeout: cdk.Duration.seconds(10),
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: [
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/metrics',
        ],
      },
    });

    // Grant permissions for the Cognito auth challenge functions
    props.table.grantReadData(this.createAuthChallengeFunction);

    if (props.kmsKey) {
      props.kmsKey.grantDecrypt(this.verifyAuthChallengeFunction);
    }

    // Grant CloudWatch permissions for all auth challenge functions
    [
      this.defineAuthChallengeFunction,
      this.createAuthChallengeFunction,
      this.verifyAuthChallengeFunction,
    ].forEach((func) => {
      func.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['cloudwatch:PutMetricData'],
          resources: ['*'],
        })
      );
    });
  }

  private getLogLevel(environmentName: string): string {
    // Different log levels based on environment
    if (environmentName === 'production') return 'WARN';
    if (environmentName === 'staging') return 'INFO';
    return 'DEBUG'; // Development/PR environments
  }
}
