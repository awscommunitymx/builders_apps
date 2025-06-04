import { Construct } from 'constructs';
import { StackProps, Stack, Duration } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration, Cors, MethodLoggingLevel } from 'aws-cdk-lib/aws-apigateway';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { UserPool } from 'aws-cdk-lib/aws-cognito';

interface AuthApiStackProps extends StackProps {
  shortIdAuthFunction: LambdaFunction;
  userTable: Table;
  userPool: UserPool;
}

export class AuthApiStack extends Stack {
  public readonly api: RestApi;

  constructor(scope: Construct, id: string, props: AuthApiStackProps) {
    super(scope, id, props);

    const { shortIdAuthFunction } = props;

    // Create REST API
    this.api = new RestApi(this, 'AuthApi', {
      restApiName: 'Auth API',
      description: 'Authentication API for AWS Community Builders',
      deployOptions: {
        stageName: 'prod',
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Create Lambda integration
    const shortIdAuthIntegration = new LambdaIntegration(shortIdAuthFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      timeout: Duration.seconds(29),
    });

    // Create auth resource and method
    const authResource = this.api.root.addResource('auth');
    const shortIdResource = authResource.addResource('short-id');

    shortIdResource.addMethod('POST', shortIdAuthIntegration, {
      operationName: 'AuthenticateWithShortId',
    });

    // Add CORS to all methods
    // shortIdResource.addCorsPreflight({
    //   allowOrigins: Cors.ALL_ORIGINS,
    //   allowMethods: ['POST', 'OPTIONS'],
    //   allowHeaders: [
    //     'Content-Type',
    //     'X-Amz-Date',
    //     'Authorization',
    //     'X-Api-Key',
    //     'X-Amz-Security-Token',
    //   ],
    // });
  }
}
