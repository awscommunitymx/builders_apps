import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { AppSyncIdentityCognito } from 'aws-lambda';

const SERVICE_NAME = 'get-my-favorite-sessions-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function getMyFavoriteSessions(
  identity: AppSyncIdentityCognito
): Promise<string[]> {
  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('GetMyFavoriteSessions');
  subSegment?.addAnnotation('cognitoSub', identity.sub);

  try {
    // Query user's favorite sessions with pattern: PK=USER#{user_id}, SK=FAV#{sessionId}
    const queryParams = {
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${identity.sub}`,
        ':skPrefix': 'FAV#',
      },
      ProjectionExpression: 'sessionId',
    };

    const result = await docClient.send(new QueryCommand(queryParams));

    // Extract session IDs from the result
    const sessionIds: string[] = (result.Items || []).map((item: any) => item.sessionId);

    logger.info('Retrieved user favorite sessions', {
      user_id: identity.sub,
      sessionCount: sessionIds.length,
    });

    metrics.addMetric('FavoriteSessionsRetrieved', MetricUnit.Count, 1);
    metrics.addMetric('SessionCount', MetricUnit.Count, sessionIds.length);

    subSegment?.close();

    return sessionIds;
  } catch (error: any) {
    subSegment?.close(error);

    logger.error('Error retrieving favorite sessions', {
      user_id: identity.sub,
      error: error.message,
    });

    metrics.addMetric('FavoriteSessionsRetrieveError', MetricUnit.Count, 1);
    throw error;
  }
}
