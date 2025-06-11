import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { User } from '@awscommunity/generated-ts';
import { AppSyncIdentityCognito } from 'aws-lambda';

const SERVICE_NAME = 'get-my-profile-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function getMyProfile(
  authenticatedUser: AppSyncIdentityCognito
): Promise<User | null> {
  const queryParams = {
    TableName: tableName,
    IndexName: 'cognito_sub-index',
    KeyConditionExpression: 'cognito_sub = :cognito_sub',
    ExpressionAttributeValues: {
      ':cognito_sub': authenticatedUser.sub,
    },
    Limit: 1,
  };

  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('QueryUserByCognitoSub');
  subSegment?.addAnnotation('cognitoSub', authenticatedUser.sub);

  try {
    const queryResult = await docClient.send(new QueryCommand(queryParams));
    subSegment?.close();

    if (!queryResult.Items || queryResult.Items.length === 0) {
      logger.info('User not found', { cognito_sub: authenticatedUser.sub });
      metrics.addMetric('UserNotFound', 'Count', 1);
      return null;
    }

    logger.info('User found', { cognito_sub: authenticatedUser.sub });
    return queryResult.Items[0] as User;
  } catch (error) {
    subSegment?.close();
    logger.error('Error querying user', {
      cognito_sub: authenticatedUser.sub,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    metrics.addMetric('QueryError', 'Count', 1);
    throw error;
  }
}
