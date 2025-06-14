import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { User } from '@awscommunity/generated-ts';

const SERVICE_NAME = 'get-session-favorite-users-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function getSessionFavoriteUsers(sessionId: string): Promise<User[]> {
  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('GetSessionFavoriteUsers');
  subSegment?.addAnnotation('sessionId', sessionId);

  try {
    // Temporarily use the old sk-index while we transition to the new GSI
    // Query with SK = FAV#{sessionId} using the sk-index GSI
    const queryParams = {
      TableName: tableName,
      IndexName: 'sk-index',
      KeyConditionExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':sk': `FAV#${sessionId}`,
      },
      ProjectionExpression: 'user_id',
    };

    const queryResult = await docClient.send(new QueryCommand(queryParams));
    const userIds = (queryResult.Items || []).map((item: any) => item.user_id);

    if (userIds.length === 0) {
      logger.info('No users found with this session as favorite', { sessionId });
      return [];
    }

    // Now get the user profiles for these user IDs
    // We'll use the cognito_sub-index to get user profiles
    const users: User[] = [];

    for (const userId of userIds) {
      try {
        const userQueryParams = {
          TableName: tableName,
          IndexName: 'cognito_sub-index',
          KeyConditionExpression: 'cognito_sub = :cognito_sub',
          ExpressionAttributeValues: {
            ':cognito_sub': userId,
          },
          Limit: 1,
        };

        const userResult = await docClient.send(new QueryCommand(userQueryParams));

        if (userResult.Items && userResult.Items.length > 0) {
          users.push(userResult.Items[0] as User);
        }
      } catch (error) {
        logger.warn('Failed to retrieve user profile', { userId, error });
        // Continue with other users
      }
    }

    logger.info('Retrieved users who favorited session', {
      sessionId,
      userCount: users.length,
    });

    metrics.addMetric('SessionFavoriteUsersRetrieved', MetricUnit.Count, 1);
    metrics.addMetric('UserCount', MetricUnit.Count, users.length);

    subSegment?.close();

    return users;
  } catch (error: any) {
    subSegment?.close(error);

    logger.error('Error retrieving session favorite users', {
      sessionId,
      error: error.message,
    });

    metrics.addMetric('SessionFavoriteUsersRetrieveError', MetricUnit.Count, 1);
    throw error;
  }
}
