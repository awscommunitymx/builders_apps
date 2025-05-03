import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { ProfileAccess, User } from '@awscommunity/generated-ts';

const SERVICE_NAME = 'view-profile-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function handleViewProfile(
  shortId: string,
  pin: number,
  viewerId: string
): Promise<User | null> {
  // We no longer reference `event` here. Use passed-in params.
  logger.info('Handling viewProfile', { shortId, viewerId });
  metrics.addMetric('ViewProfileAttempt', MetricUnit.Count, 1);

  // Query user by shortId
  const queryParams = {
    TableName: tableName,
    IndexName: 'ShortIdIndex',
    KeyConditionExpression: 'short_id = :shortId',
    ExpressionAttributeValues: { ':shortId': shortId },
    Limit: 1,
  };

  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('QueryUserByShortId');
  try {
    const queryResult = await docClient.send(new QueryCommand(queryParams));
    if (!queryResult.Items || queryResult.Items.length === 0) {
      logger.info('User not found', { shortId });
      metrics.addMetric('UserNotFound', MetricUnit.Count, 1);
      return null;
    }
    const user = queryResult.Items[0] as User;
    if (user.pin !== pin) {
      logger.warn('Incorrect PIN', { shortId, userId: user.user_id });
      metrics.addMetric('IncorrectPin', MetricUnit.Count, 1);
      throw new Error('Incorrect PIN');
    }

    // record view
    const viewItem: ProfileAccess = {
      PK: `VIEW#${viewerId}`,
      SK: `PROFILE#${user.user_id}`,
      timestamp: new Date().toISOString(),
      viewer_id: viewerId,
      viewed_id: user.user_id,
    };
    await docClient.send(new PutCommand({ TableName: tableName, Item: viewItem }));
    metrics.addMetric('ProfileViewRecorded', MetricUnit.Count, 1);
    return user;
  } finally {
    subSegment?.close();
  }
}
