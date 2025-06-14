import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { AppSyncIdentityCognito } from 'aws-lambda';

const SERVICE_NAME = 'add-favorite-session-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function addFavoriteSession(
  identity: AppSyncIdentityCognito,
  sessionId: string
): Promise<boolean> {
  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('AddFavoriteSession');
  subSegment?.addAnnotation('cognitoSub', identity.sub);
  subSegment?.addAnnotation('sessionId', sessionId);

  try {
    // Store favorite session with pattern: PK=USER#{user_id}, SK=FAV#{sessionId}
    // We use cognito_sub as user_id for authenticated users
    const item = {
      PK: `USER#${identity.sub}`,
      SK: `FAV#${sessionId}`,
      user_id: identity.sub,
      sessionId,
      createdAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        // Use condition to avoid overwriting existing favorites
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );

    logger.info('Favorite session added successfully', {
      user_id: identity.sub,
      sessionId,
    });

    metrics.addMetric('FavoriteSessionAdded', MetricUnit.Count, 1);
    subSegment?.close();

    return true;
  } catch (error: any) {
    subSegment?.close(error);
    
    // If the item already exists, that's OK - return true
    if (error.name === 'ConditionalCheckFailedException') {
      logger.info('Session is already in favorites', {
        user_id: identity.sub,
        sessionId,
      });
      return true;
    }

    logger.error('Error adding favorite session', {
      user_id: identity.sub,
      sessionId,
      error: error.message,
    });
    
    metrics.addMetric('FavoriteSessionAddError', MetricUnit.Count, 1);
    throw error;
  }
}
