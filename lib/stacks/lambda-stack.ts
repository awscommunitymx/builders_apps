import { Construct } from 'constructs';
import { StackProps, Stack, Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';

interface LambdaStackProps extends StackProps {
  environmentName: string;
  dynamoTable: ITable;
}

export class LambdaStack extends Construct {
  public readonly getUserByShortIdFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id);

    // Create Lambda function for getting user by short ID
    const getUserByShortIdFunction = new NodejsFunction(this, 'GetUserByShortIdFunction', {
      functionName: `get-user-by-short-id-${props.environmentName}`,
      runtime: Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../../lambda/get-user-by-short-id/index.ts'),
      description: 'Gets user information by short ID',
      timeout: Duration.seconds(29),
      memorySize: 256,
      environment: {
        TABLE_NAME: props.dynamoTable.tableName,
      },
      bundling: {
        externalModules: ['aws-sdk'],
        nodeModules: [
          '@aws-lambda-powertools/tracer',
          '@aws-lambda-powertools/logger',
          '@aws-lambda-powertools/metrics',
        ],
      },
    });

    // Grant DynamoDB read access
    props.dynamoTable.grantReadData(getUserByShortIdFunction);

    // Export the function
    this.getUserByShortIdFunction = getUserByShortIdFunction;
  }
}
