import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { AppSyncIdentityCognito } from 'aws-lambda';

const SERVICE_NAME = 'remove-favorite-session-service';

const tracer = new Tracer({ serviceName: SERVICE_NAME });
const logger = new Logger({ serviceName: SERVICE_NAME });
const metrics = new Metrics({ namespace: 'Profiles', serviceName: SERVICE_NAME });

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

export default async function removeFavoriteSession(
  identity: AppSyncIdentityCognito,
  sessionId: string
): Promise<boolean> {
  const segment = tracer.getSegment();
  const subSegment = segment?.addNewSubsegment('RemoveFavoriteSession');
  subSegment?.addAnnotation('cognitoSub', identity.sub);
  subSegment?.addAnnotation('sessionId', sessionId);

  try {
    // Delete favorite session with pattern: PK=USER#{user_id}, SK=FAV#{sessionId}
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${identity.sub}`,
          SK: `FAV#${sessionId}`,
        },
      })
    );

    logger.info('Favorite session removed successfully', {
      user_id: identity.sub,
      sessionId,
    });

    metrics.addMetric('FavoriteSessionRemoved', MetricUnit.Count, 1);
    subSegment?.close();

    return true;
  } catch (error: any) {
    subSegment?.close(error);
    
    logger.error('Error removing favorite session', {
      user_id: identity.sub,
      sessionId,
      error: error.message,
    });
    
    metrics.addMetric('FavoriteSessionRemoveError', MetricUnit.Count, 1);
    throw error;
  }
}
