import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';
import * as fs from 'fs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class CdkTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the DynamoDB table - single table design
    const table = new dynamodb.Table(this, 'ProfilesTable', {
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Don't use in production
    });
    
    // Add GSI for querying by shortId
    table.addGlobalSecondaryIndex({
      indexName: 'ShortIdIndex',
      partitionKey: {
        name: 'short_id',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Create the AppSync API
    const api = new appsync.GraphqlApi(this, 'ProfilesApi', {
      name: 'ProfilesApi',
      schema: appsync.SchemaFile.fromAsset('./schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(30))
          }
        },
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.INFO,
      },
      xrayEnabled: true, // Enable X-Ray tracing
    });

    // Create the DynamoDB data source
    const dataSource = api.addDynamoDbDataSource('DynamoDataSource', table);

    // Define resolver for getUserByShortId query using external VTL files
    dataSource.createResolver('GetUserByShortIdResolver', {
      typeName: 'Query',
      fieldName: 'getUserByShortId',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('./vtl/getUserByShortId/request.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('./vtl/getUserByShortId/response.vtl'),
    });

    // Create the Lambda function for viewProfile
    const viewProfileLambda = new NodejsFunction(this, 'ViewProfileFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/view-profile/index.ts'),
      environment: {
        TABLE_NAME: table.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1', // Connection reuse for improved performance
        POWERTOOLS_SERVICE_NAME: 'view-profile-service',
        POWERTOOLS_METRICS_NAMESPACE: 'Profiles',
        LOG_LEVEL: 'INFO',
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'true',
        POWERTOOLS_TRACER_CAPTURE_ERROR: 'true',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true'
      },
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
      bundling: {
        externalModules: ['aws-sdk'], // Do not bundle aws-sdk
        nodeModules: [
          '@aws-lambda-powertools/tracer', 
          '@aws-lambda-powertools/logger', 
          '@aws-lambda-powertools/metrics',
          'aws-xray-sdk'
        ], // Include powertools in the bundle
      }
    });

    // Grant additional permissions for CloudWatch Metrics
    viewProfileLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData'
      ],
      resources: ['*']
    }));

    // Grant the Lambda function access to DynamoDB
    table.grantReadWriteData(viewProfileLambda);
    
    // Create AppSync Lambda data source
    const lambdaDataSource = api.addLambdaDataSource(
      'ViewProfileLambdaDataSource',
      viewProfileLambda
    );
    
    // Create resolver
    lambdaDataSource.createResolver('ViewProfileResolver', {
      typeName: 'Mutation',
      fieldName: 'viewProfile',
    });
    
    // Get access logs for a profile using external VTL files
    dataSource.createResolver('GetProfileAccessesResolver', {
      typeName: 'Query',
      fieldName: 'getProfileAccesses',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('./vtl/getProfileAccesses/request.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('./vtl/getProfileAccesses/response.vtl'),
    });

    // Output API URL and key
    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: api.graphqlUrl
    });

    new cdk.CfnOutput(this, 'GraphQLApiKey', {
      value: api.apiKey || 'No API Key'
    });
    
    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName
    });

    // Add with your other outputs
    new cdk.CfnOutput(this, 'GraphQLApiLogGroup', {
      value: api.logGroup.logGroupName
    });
  }
}
