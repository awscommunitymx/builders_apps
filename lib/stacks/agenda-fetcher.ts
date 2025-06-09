import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { truncateLambdaName } from '../../utils/lambda';
import * as s3 from 'aws-cdk-lib/aws-s3'

interface AgendaFetcherProps {
  environmentName: string;
  table: dynamodb.Table;
  graphqlApi: appsync.GraphqlApi;
}

export class AgendaFetcherStack extends Construct {
  public readonly sessionsBucket: s3.Bucket;
  public readonly agendaFetcher: NodejsFunction;
  
  constructor(scope: Construct, id: string, props: AgendaFetcherProps) {
    super(scope, id);
    
    // 1) Create an S3 bucket for agenda JSON
    this.sessionsBucket = new s3.Bucket(this, 'AgendaBucket', {
      bucketName: `${props.environmentName.toLowerCase()}-agenda-json`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,        // for dev/test
      autoDeleteObjects: true,                        // for dev/test
      encryption: s3.BucketEncryption.S3_MANAGED,
    });
    
    // 2) Create the AgendaFetcher
    this.agendaFetcher = new NodejsFunction(this, 'AgendaFetcher', {
      functionName: truncateLambdaName('AgendaFetcher', props.environmentName),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/agenda-fetcher/src/index.ts'),
      environment: {
        DYNAMODB_TABLE_NAME: props.table.tableName,
        ENVIRONMENT: props.environmentName,
        S3_BUCKET: this.sessionsBucket.bucketName,
        SESSIONIZE_API_URL: 'https://sessionize.com/api/v2/bdomhdlg/view/All',
        APPSYNC_ENDPOINT: props.graphqlApi.graphqlUrl,
        APPSYNC_API_KEY: props.graphqlApi.apiKey!,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        POWERTOOLS_SERVICE_NAME: 'agenda-fetcher-service',
        POWERTOOLS_METRICS_NAMESPACE: 'AgendaFetcher',
        LOG_LEVEL: this.getLogLevel(props.environmentName),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'true',
        POWERTOOLS_TRACER_CAPTURE_ERROR: 'true',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      },
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        // Enable ESM support by setting the format to esm
        format: OutputFormat.ESM,
        // Remove aws-sdk from external modules since it's built-in for Node.js 18+
        externalModules: [],
        // Specify node modules to include in the bundle
        nodeModules: [
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger', 
          '@aws-lambda-powertools/metrics',
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/lib-dynamodb',
          '@aws-sdk/client-s3',
          '@middy/core',
          'node-fetch',
          'aws-xray-sdk',
        ],
        // Additional esbuild options for ESM
        esbuildArgs: {
          '--format': 'esm',
          '--target': 'node22',
          '--platform': 'node',
        },
      },
    });
    
    // Grant additional permissions for CloudWatch Metrics
    this.agendaFetcher.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );
    
    // Grant the Lambda function access to DynamoDB
    props.table.grantReadWriteData(this.agendaFetcher);
    
    // Grant the Lambda function access to S3
    this.sessionsBucket.grantReadWrite(this.agendaFetcher);
    
    // **Grant AppSync permissions to the Lambda function**
    this.agendaFetcher.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'appsync:GraphQL'
        ],
        resources: [
          // Allow access to all GraphQL operations on this specific API
          `${props.graphqlApi.arn}/*`,
        ],
      })
    );

    // **IMPORTANT: Add dependency to ensure API key is created before Lambda**
    this.agendaFetcher.node.addDependency(props.graphqlApi);
  }
  
  private getLogLevel(environmentName: string): string {
    // Different log levels based on environment
    if (environmentName === 'production') return 'WARN';
    if (environmentName === 'staging') return 'INFO';
    return 'DEBUG'; // Development/PR environments
  }
}
