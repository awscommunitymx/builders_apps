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
  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('QueryUserByCognitoSub');
  subSegment?.addAnnotation('cognitoSub', authenticatedUser.sub);

  try {
    // Query user profile
    const userQueryParams = {
      TableName: tableName,
      IndexName: 'cognito_sub-index',
      KeyConditionExpression: 'cognito_sub = :cognito_sub',
      ExpressionAttributeValues: {
        ':cognito_sub': authenticatedUser.sub,
      },
      Limit: 1,
    };

    const userQueryResult = await docClient.send(new QueryCommand(userQueryParams));
    subSegment?.close();

    if (!userQueryResult.Items || userQueryResult.Items.length === 0) {
      logger.info('User not found', { cognito_sub: authenticatedUser.sub });
      metrics.addMetric('UserNotFound', 'Count', 1);
      return null;
    }

    const user = userQueryResult.Items[0] as User & { sponsorIds?: string[] };
    const sponsor_visits = user.sponsorIds || [];

    logger.info('User query result', { userQueryResult: userQueryResult.Items[0] });

    logger.info('User found with sponsor visits', {
      cognito_sub: authenticatedUser.sub,
    });

    return {
      ...user,
      sponsor_visits,
    };
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
