import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface DatabaseStackProps {
  environmentName: string;
}

export class DatabaseStack extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id);

    // Create the DynamoDB table with environment-specific naming
    this.table = new dynamodb.Table(this, 'ProfilesTable', {
      tableName: `Profiles-${props.environmentName}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: this.getRemovalPolicy(props.environmentName),
    });

    // Add GSI for querying by shortId
    this.table.addGlobalSecondaryIndex({
      indexName: 'ShortIdIndex',
      partitionKey: {
        name: 'short_id',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Export the table name
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      exportName: `${props.environmentName}-ProfilesTableName`,
    });
  }

  private getRemovalPolicy(environmentName: string): cdk.RemovalPolicy {
    // For production, retain the table to prevent accidental deletion
    return environmentName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
  }
}
