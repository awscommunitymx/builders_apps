import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

interface ApiStackProps {
  environmentName: string;
  table: dynamodb.Table;
  viewProfileFunction: NodejsFunction;
}

export class ApiStack extends Construct {
  public readonly api: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id);

    // Create the AppSync API
    this.api = new appsync.GraphqlApi(this, 'ProfilesApi', {
      name: `ProfilesApi-${props.environmentName}`,
      definition: appsync.Definition.fromFile('./schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(
              cdk.Duration.days(
                props.environmentName === 'prod' ? 365 : 30 // Longer expiration for prod
              )
            ),
          },
        },
      },
      logConfig: {
        fieldLogLevel: this.getFieldLogLevel(props.environmentName),
      },
      xrayEnabled: true,
    });

    // Create data sources
    const dynamoDataSource = this.api.addDynamoDbDataSource('DynamoDataSource', props.table);
    const lambdaDataSource = this.api.addLambdaDataSource(
      'ViewProfileLambdaDataSource',
      props.viewProfileFunction
    );

    // Add the resolvers
    this.createResolvers(dynamoDataSource, lambdaDataSource);

    // Create outputs
    this.createOutputs(props.environmentName);
  }

  private getFieldLogLevel(environmentName: string): appsync.FieldLogLevel {
    if (environmentName === 'prod') return appsync.FieldLogLevel.ERROR;
    if (environmentName === 'staging') return appsync.FieldLogLevel.INFO;
    return appsync.FieldLogLevel.ALL; // Development/PR environments
  }

  private createResolvers(
    dynamoDataSource: appsync.DynamoDbDataSource,
    lambdaDataSource: appsync.LambdaDataSource
  ): void {
    // Define resolver for getUserByShortId
    dynamoDataSource.createResolver('GetUserByShortIdResolver', {
      typeName: 'Query',
      fieldName: 'getUserByShortId',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        './vtl/getUserByShortId/request.vtl'
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        './vtl/getUserByShortId/response.vtl'
      ),
    });

    // Create resolver for viewProfile
    lambdaDataSource.createResolver('ViewProfileResolver', {
      typeName: 'Mutation',
      fieldName: 'viewProfile',
    });

    // Get access logs resolver
    dynamoDataSource.createResolver('GetProfileAccessesResolver', {
      typeName: 'Query',
      fieldName: 'getProfileAccesses',
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        './vtl/getProfileAccesses/request.vtl'
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        './vtl/getProfileAccesses/response.vtl'
      ),
    });
  }

  private createOutputs(environmentName: string): void {
    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: this.api.graphqlUrl,
      exportName: `${environmentName}-GraphQLApiUrl`,
    });

    new cdk.CfnOutput(this, 'GraphQLApiKey', {
      value: this.api.apiKey || 'No API Key',
      exportName: `${environmentName}-GraphQLApiKey`,
    });

    new cdk.CfnOutput(this, 'GraphQLApiLogGroup', {
      value: this.api.logGroup.logGroupName,
      exportName: `${environmentName}-GraphQLApiLogGroup`,
    });
  }
}
