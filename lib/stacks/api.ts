import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

interface ApiStackProps {
  environmentName: string;
  table: dynamodb.Table;
  graphQLResolver: NodejsFunction;
  userPool: IUserPool;
  certificate: certificatemanager.ICertificate;
  hostedZone: route53.IHostedZone;
  domainName: string;
}

export class ApiStack extends Construct {
  public readonly api: appsync.GraphqlApi;
  public readonly domainName: string;
  
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id);
    
    this.domainName = props.domainName;
    
    // Create the AppSync API with BOTH User Pool AND API Key authentication
    this.api = new appsync.GraphqlApi(this, 'ProfilesApi', {
      name: `ProfilesApi-${props.environmentName}`,
      definition: appsync.Definition.fromFile('./schema.graphql'),
      domainName: {
        domainName: props.domainName,
        certificate: props.certificate,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: { userPool: props.userPool },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: cdk.Expiration.after(cdk.Duration.days(365)), // 1 year expiration
              description: 'API Key for Lambda function access',
            },
          },
        ],
      },
      logConfig: {
        fieldLogLevel: this.getFieldLogLevel(props.environmentName),
      },
      xrayEnabled: true,
    });
    
    new route53.CnameRecord(this, `CnameApiRecord`, {
      recordName: props.domainName,
      zone: props.hostedZone,
      domainName: this.api.appSyncDomainName,
    });
    
    // Create data sources
    const dynamoDataSource = this.api.addDynamoDbDataSource('DynamoDataSource', props.table);
    const lambdaDataSource = this.api.addLambdaDataSource(
      'GraphQLResolverDataSource',
      props.graphQLResolver
    );
    
    // Add the resolvers
    this.createResolvers(dynamoDataSource, lambdaDataSource);
    
    // Create outputs
    this.createOutputs(props.environmentName);
  }
  
  private getFieldLogLevel(environmentName: string): appsync.FieldLogLevel {
    if (environmentName === 'production') return appsync.FieldLogLevel.ERROR;
    if (environmentName === 'staging') return appsync.FieldLogLevel.INFO;
    return appsync.FieldLogLevel.ALL; // Development/PR environments
  }
  
  private createResolvers(
    dynamoDataSource: appsync.DynamoDbDataSource,
    lambdaDataSource: appsync.LambdaDataSource
  ): void {
    // Create resolver for getMyProfile
    lambdaDataSource.createResolver('GraphQLResolverGetMyProfile', {
      typeName: 'Query',
      fieldName: 'getMyProfile',
    });
    
    // Create resolver for viewProfile
    lambdaDataSource.createResolver('GraphQLResolverViewProfile', {
      typeName: 'Mutation',
      fieldName: 'viewProfile',
    });

    lambdaDataSource.createResolver('GraphQLResolverGetAgenda', {
      typeName: 'Query',
      fieldName: 'getAgenda',
    });

    lambdaDataSource.createResolver('GraphQLResolverGetAgendaHash', {
      typeName: 'Query',
      fieldName: 'getAgendaHash',
    });

    lambdaDataSource.createResolver('GraphQLResolverGetRoomAgendaHash', {
      typeName: 'Query',
      fieldName: 'getRoomAgendaHash',
    });

    lambdaDataSource.createResolver('GraphQLResolverGetRoomAgenda', {
      typeName: 'Query',
      fieldName: 'getRoomAgenda',
    });
    
    lambdaDataSource.createResolver('GraphQLResolverUpdateUser', {
      typeName: 'Mutation',
      fieldName: 'updateUser',
    });
    
    lambdaDataSource.createResolver('GraphQLResolverUpdateAgenda', {
      typeName: 'Mutation',
      fieldName: 'updateAgenda',
    });

    lambdaDataSource.createResolver('GraphQLResolverRegisterSponsorVisit', {
      typeName: 'Mutation',
      fieldName: 'registerSponsorVisit',
    });

    lambdaDataSource.createResolver('GraphQLResolverGetSponsorVisit', {
      typeName: 'Query',
      fieldName: 'getSponsorVisit',
    });

    lambdaDataSource.createResolver('GraphQLResolverGetSponsorDashboard', {
      typeName: 'Query',
      fieldName: 'getSponsorDashboard',
    });

    lambdaDataSource.createResolver('GraphQLResolverCheckInAttendee', {
      typeName: 'Mutation',
      fieldName: 'checkInAttendee',
    });

    lambdaDataSource.createResolver('GraphQLResolverUpdateRoomAgenda', {
      typeName: 'Mutation',
      fieldName: 'updateRoomAgenda',
    });
  }
  
  private createOutputs(environmentName: string): void {
    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: `https://${this.domainName}/graphql`,
      exportName: `${environmentName}-GraphQLApiUrl`,
    });
    
    // NOW this will actually output a real API key
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
