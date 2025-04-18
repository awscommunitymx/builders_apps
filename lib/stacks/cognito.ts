import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CognitoStackProps {
  environmentName: string;
  appDomain?: string;
}

export class CognitoStack extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly authenticatedRole: iam.Role;
  public readonly unauthenticatedRole: iam.Role;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id);

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
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Consider RETAIN for production
    });

    // Create a domain for the user pool
    // Create domain prefix without forbidden words, lowercase alphanumeric only
    const sanitizedEnv = props.environmentName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const domainPrefix = `profiles-${sanitizedEnv}`;

    // Ensure the prefix doesn't contain "cognito" (AWS restriction)
    const finalDomainPrefix = domainPrefix.includes('cognito')
      ? domainPrefix.replace('cognito', 'profiles')
      : domainPrefix;

    this.userPoolDomain = this.userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: finalDomainPrefix,
      },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });

    // Define callback URLs based on environment
    const callbackUrls = props.appDomain
      ? [`https://${props.appDomain}/auth/callback`]
      : ['http://localhost:5173/auth/callback'];

    const logoutUrls = props.appDomain
      ? [`https://${props.appDomain}/auth/logout`]
      : ['http://localhost:5173/auth/logout'];

    // Create a client for the user pool
    this.userPoolClient = this.userPool.addClient('app-client', {
      userPoolClientName: `profiles-client-${props.environmentName}`,
      generateSecret: false, // Set to true for backend applications
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

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: `${this.userPoolDomain.domainName}.auth.${cdk.Stack.of(this).region}.amazoncognito.com`,
      description: 'Cognito User Pool Domain for hosted UI',
      exportName: `${props.environmentName}-UserPoolDomain`,
    });
  }
}
