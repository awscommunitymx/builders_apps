import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

interface LambdaStackProps {
  environmentName: string;
  table: dynamodb.Table;
}

export class LambdaStack extends Construct {
  public readonly viewProfileFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id);

    // Create the Lambda function for viewProfile
    this.viewProfileFunction = new NodejsFunction(this, 'ViewProfileFunction', {
      functionName: `ViewProfile-${props.environmentName}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/view-profile/index.ts'),
      environment: {
        TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environmentName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'view-profile-service',
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
    this.viewProfileFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Grant the Lambda function access to DynamoDB
    props.table.grantReadWriteData(this.viewProfileFunction);
  }

  private getLogLevel(environmentName: string): string {
    // Different log levels based on environment
    if (environmentName === 'prod') return 'WARN';
    if (environmentName === 'staging') return 'INFO';
    return 'DEBUG'; // Development/PR environments
  }
}
