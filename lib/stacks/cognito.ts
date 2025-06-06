import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { getAuthUrls } from '../../utils/cognito';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { truncateLambdaName } from '../../utils/lambda';
import * as path from 'path';

export interface CognitoStackProps {
  environmentName: string;
  appDomain: string;
  authDomain: string;
  certificate: ICertificate;
  hostedZone: route53.IHostedZone;
  groups?: string[];
  defineAuthChallengeFunction?: lambda.IFunction;
  createAuthChallengeFunction?: lambda.IFunction;
  verifyAuthChallengeFunction?: lambda.IFunction;
  table: cdk.aws_dynamodb.ITable;
  kmsKey?: cdk.aws_kms.IKey; // Optional KMS key for encryption
}

export class CognitoStack extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly authenticatedRole: iam.Role;
  public readonly unauthenticatedRole: iam.Role;

  public readonly defineAuthChallengeFunction: NodejsFunction;
  public readonly createAuthChallengeFunction: NodejsFunction;
  public readonly verifyAuthChallengeFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id);

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

    // Create the Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `profiles-user-pool-${props.environmentName}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        country: new cognito.StringAttribute({ mutable: true }),
        city: new cognito.StringAttribute({ mutable: true }),
        company: new cognito.StringAttribute({ mutable: true }),
        awsCategory: new cognito.StringAttribute({ mutable: true }),
        joinDate: new cognito.StringAttribute({ mutable: true }),
        bio: new cognito.StringAttribute({ mutable: true, maxLen: 2048 }),
        twitterHandle: new cognito.StringAttribute({ mutable: true }),
        linkedInUrl: new cognito.StringAttribute({ mutable: true }),
        githubHandle: new cognito.StringAttribute({ mutable: true }),
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      removalPolicy: this.getRemovalPolicy(props.environmentName),
      // Configure Lambda triggers for custom auth challenge
      lambdaTriggers: {
        defineAuthChallenge: this.defineAuthChallengeFunction,
        createAuthChallenge: this.createAuthChallengeFunction,
        verifyAuthChallengeResponse: this.verifyAuthChallengeFunction,
      },
    });

    const callbackUrls = getAuthUrls(props.environmentName, props.appDomain, 'callback');
    const logoutUrls = getAuthUrls(props.environmentName, props.appDomain, 'logout');

    // Create a client for the user pool
    this.userPoolClient = this.userPool.addClient('app-client', {
      userPoolClientName: `profiles-client-${props.environmentName}`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
        adminUserPassword: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.COGNITO_ADMIN,
          cognito.OAuthScope.PHONE,
        ],
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.days(1),
      idTokenValidity: cdk.Duration.days(1),
      enableTokenRevocation: true,
    });

    // Create a managed login branding for the user pool
    new cognito.CfnManagedLoginBranding(this, 'ManagedLoginBranding', {
      userPoolId: this.userPool.userPoolId,
      clientId: this.userPoolClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });

    // Create an identity pool linked to the user pool
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `profiles_identity_pool_${props.environmentName}`,
      allowUnauthenticatedIdentities: true, // Allow unauthenticated identities for public resources
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // Create roles for authenticated and unauthenticated users
    this.authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: 'Role for authenticated users',
    });

    this.unauthenticatedRole = new iam.Role(this, 'UnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: 'Role for unauthenticated users',
    });

    // Attach the roles to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: this.authenticatedRole.roleArn,
        unauthenticated: this.unauthenticatedRole.roleArn,
      },
    });

    // Create groups in the user pool if provided
    if (props.groups) {
      for (const group of props.groups) {
        this.userPool.addGroup(group, {
          groupName: group,
        });
      }
    }

    // Output important values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID for authentication',
      exportName: `${props.environmentName}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID for authentication',
      exportName: `${props.environmentName}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID for authorization',
      exportName: `${props.environmentName}-IdentityPoolId`,
    });
  }

  private getRemovalPolicy(environmentName: string): cdk.RemovalPolicy {
    // For production, retain the user pool to prevent accidental deletion
    return environmentName === 'production' || environmentName === 'staging'
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;
  }

  private getLogLevel(environmentName: string): string {
    // Different log levels based on environment
    if (environmentName === 'production') return 'WARN';
    if (environmentName === 'staging') return 'INFO';
    return 'DEBUG'; // Development/PR environments
  }
}
