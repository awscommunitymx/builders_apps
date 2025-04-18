import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseStack } from './stacks/database';
import { ApiStack } from './stacks/api';
import { LambdaStack } from './stacks/lambda';
import { CognitoStack } from './stacks/cognito';

export interface AppStackProps extends cdk.StackProps {
  environmentName: string;
  appDomain?: string;
}

export class BackendStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly apiKey: string;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly userPoolDomain: string;
  public readonly identityPoolId: string;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const databaseStack = new DatabaseStack(this, 'DatabaseStack', {
      environmentName: props.environmentName,
    });

    const lambdaStack = new LambdaStack(this, 'LambdaStack', {
      environmentName: props.environmentName,
      table: databaseStack.table,
    });

    const apiStack = new ApiStack(this, 'ApiStack', {
      environmentName: props.environmentName,
      table: databaseStack.table,
      viewProfileFunction: lambdaStack.viewProfileFunction,
    });

    // Create Cognito Stack for authentication
    const cognitoStack = new CognitoStack(this, 'CognitoStack', {
      environmentName: props.environmentName,
      appDomain: props.appDomain,
    });

    // Add permissions for authenticated users to access API operations
    cognitoStack.authenticatedRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['appsync:GraphQL'],
        resources: [`${apiStack.api.arn}/types/Query/*`, `${apiStack.api.arn}/types/Mutation/*`],
      })
    );

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
  }
}
