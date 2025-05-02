import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class ProfilesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create DynamoDB table
    const profilesTable = new dynamodb.Table(this, 'ProfilesTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda function for user profile management
    const profileLambda = new lambda.Function(this, 'ProfileHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'profileHandlers.createUserHandler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: Duration.seconds(30),
      environment: {
        TABLE_NAME: profilesTable.tableName,
      },
    });

    // Lambda function for complete profile updates
    const updateProfileLambda = new lambda.Function(this, 'UpdateProfileHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'profileHandlers.updateCompleteProfileHandler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: Duration.seconds(30),
      environment: {
        TABLE_NAME: profilesTable.tableName,
      },
    });

    // Lambda function for partial profile updates
    const updateFieldsLambda = new lambda.Function(this, 'UpdateFieldsHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'profileHandlers.updateProfileFieldsHandler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: Duration.seconds(30),
      environment: {
        TABLE_NAME: profilesTable.tableName,
      },
    });

    // Grant the Lambda functions permissions to access the DynamoDB table
    profilesTable.grantReadWriteData(profileLambda);
    profilesTable.grantReadWriteData(updateProfileLambda);
    profilesTable.grantReadWriteData(updateFieldsLambda);

    // Create API Gateway
    const api = new apigw.RestApi(this, 'ProfilesApi', {
      restApiName: 'Profiles Service',
      description: 'This service manages user profiles',
      deployOptions: {
        stageName: 'api',
      },
    });

    // Define API resources
    const profiles = api.root.addResource('profiles');
    const userProfiles = profiles.addResource('{userId}');

    // Create user profile endpoint - POST /profiles
    profiles.addMethod('POST', new apigw.LambdaIntegration(profileLambda));

    // Update complete profile endpoint - PUT /profiles
    profiles.addMethod('PUT', new apigw.LambdaIntegration(updateProfileLambda));

    // Update specific fields endpoint - PATCH /profiles/{userId}
    userProfiles.addMethod('PATCH', new apigw.LambdaIntegration(updateFieldsLambda));

    // Additional resources and permissions can be added as needed
  }
}
