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
  id: string,
  authenticatedUserSub: string
): Promise<User | null> {
  // We no longer reference `event` here. Use passed-in params.
  logger.info('Handling viewProfile', { id });
  metrics.addMetric('ViewProfileAttempt', MetricUnit.Count, 1);

  // Query user by shortId
  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `USER#${id}`,
      ':sk': 'PROFILE',
    },
    Limit: 1,
  };

  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('QueryUserByShortId');
  try {
    const queryResult = await docClient.send(new QueryCommand(queryParams));
    if (!queryResult.Items || queryResult.Items.length === 0) {
      logger.info('User not found', { id });
      metrics.addMetric('UserNotFound', MetricUnit.Count, 1);
      throw new Error('Usuario no encontrado');
    }
    const user = queryResult.Items[0] as User;

    // Query the authenticaded user by cognito_sub in the cognito_sub-index gsi
    const queryParamsAuthUser = {
      TableName: tableName,
      IndexName: 'cognito_sub-index',
      KeyConditionExpression: 'cognito_sub = :cognito_sub',
      ExpressionAttributeValues: {
        ':cognito_sub': authenticatedUserSub,
      },
    };

    const queryResultAuthUser = await docClient.send(new QueryCommand(queryParamsAuthUser));
    if (!queryResultAuthUser.Items || queryResultAuthUser.Items.length === 0) {
      logger.info('Authenticated user not found', { authenticatedUserSub });
      metrics.addMetric('AuthenticatedUserNotFound', MetricUnit.Count, 1);
      return null;
    }
    const authenticatedUser = queryResultAuthUser.Items[0] as User;
    logger.info('Authenticated user found', { authenticatedUser });
    metrics.addMetric('AuthenticatedUserFound', MetricUnit.Count, 1);

    // record view
    const viewItem: ProfileAccess = {
      PK: `VIEWED#${id}`,
      SK: `VIEWER#${authenticatedUser.user_id}`,
      timestamp: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: tableName, Item: viewItem }));
    metrics.addMetric('ProfileViewRecorded', MetricUnit.Count, 1);
    return user;
  } finally {
    subSegment?.close();
  }
}
